import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { FirebaseService } from '../firebase/firebase.service';
import { RedisService } from '../redis/redis.service';

export type AISuggestionType =
  | 'EXERCISE_AUTOFILL'
  | 'EXERCISE_RECOMMENDATIONS'
  | 'PRESCRIPTION';

interface CacheRecord {
  type: AISuggestionType;
  inputHash: string;
  input: unknown;
  output: unknown;
  model: string;
  orgId: string;
  coachId: string;
  tokensIn?: number;
  tokensOut?: number;
  adopted: boolean;
  createdAt: string;
}

const CACHE_TTL_DAYS = 30;
const RATE_LIMIT_PER_MIN = 30;
const RATE_LIMIT_PER_DAY = 500;

/**
 * Persists AI suggestions to Firestore and provides idempotent reads
 * by canonical input hash, plus per-coach rate limiting in Redis.
 */
@Injectable()
export class AICacheService {
  private readonly logger = new Logger(AICacheService.name);

  constructor(
    private firebase: FirebaseService,
    private redis: RedisService,
  ) {}

  /** Stable SHA-256 of canonical JSON. */
  hashInput(input: unknown): string {
    const canonical = canonicalize(input);
    return createHash('sha256').update(canonical).digest('hex');
  }

  /** Look for an existing suggestion within TTL. Returns parsed output or null. */
  async getCached<T = unknown>(
    orgId: string,
    type: AISuggestionType,
    inputHash: string,
  ): Promise<T | null> {
    try {
      const cutoff = new Date(Date.now() - CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const snap = await this.aiSuggestions(orgId)
        .where('type', '==', type)
        .where('inputHash', '==', inputHash)
        .where('createdAt', '>=', cutoff)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
      if (snap.empty) return null;
      const data = snap.docs[0].data() as CacheRecord;
      return data.output as T;
    } catch (err) {
      this.logger.warn(`Cache lookup failed: ${(err as Error).message}`);
      return null;
    }
  }

  async store(record: Omit<CacheRecord, 'adopted' | 'createdAt'>): Promise<string> {
    const id = this.firebase.generateId();
    const data: CacheRecord = {
      ...record,
      adopted: false,
      createdAt: new Date().toISOString(),
    };
    try {
      await this.aiSuggestions(record.orgId).doc(id).set(data);
    } catch (err) {
      this.logger.warn(`Failed to persist AI suggestion: ${(err as Error).message}`);
    }
    return id;
  }

  async markAdopted(orgId: string, suggestionId: string): Promise<void> {
    try {
      await this.aiSuggestions(orgId).doc(suggestionId).update({ adopted: true });
    } catch (err) {
      this.logger.warn(`Failed to mark suggestion adopted: ${(err as Error).message}`);
    }
  }

  /**
   * Increment request counters and return whether the coach is within limits.
   * Falls open (allows) if Redis is unavailable so AI features still work.
   */
  async checkRateLimit(coachId: string): Promise<{ allowed: boolean; reason?: string }> {
    const minuteKey = `ai:rl:min:${coachId}:${Math.floor(Date.now() / 60_000)}`;
    const dayKey = `ai:rl:day:${coachId}:${new Date().toISOString().slice(0, 10)}`;
    try {
      const [minCount, dayCount] = await Promise.all([
        this.redis.incr(minuteKey),
        this.redis.incr(dayKey),
      ]);
      if (minCount === 1) await this.redis.expire(minuteKey, 70);
      if (dayCount === 1) await this.redis.expire(dayKey, 60 * 60 * 26);
      if (minCount > RATE_LIMIT_PER_MIN) {
        return { allowed: false, reason: 'minute' };
      }
      if (dayCount > RATE_LIMIT_PER_DAY) {
        return { allowed: false, reason: 'day' };
      }
      return { allowed: true };
    } catch {
      // Redis down — fail open
      return { allowed: true };
    }
  }

  private aiSuggestions(orgId: string) {
    return this.firebase.db.collection('organizations').doc(orgId).collection('aiSuggestions');
  }
}

/** Stable JSON.stringify with sorted keys so hash is canonical. */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalize).join(',') + ']';
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return (
    '{' +
    keys
      .map((k) => JSON.stringify(k) + ':' + canonicalize(obj[k]))
      .join(',') +
    '}'
  );
}
