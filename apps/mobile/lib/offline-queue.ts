import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import type { SubmitLogPayload } from '@/hooks/useWorkouts';

const STORAGE_KEY = '@coaching/offline-workout-queue/v1';
const MAX_ATTEMPTS = 5;

export interface QueuedWorkoutLog {
  id: string;
  instanceId: string;
  payload: SubmitLogPayload;
  createdAt: string;
  attempts: number;
  lastError?: string;
  status: 'pending' | 'failed';
}

type QueueChangeListener = (items: QueuedWorkoutLog[]) => void;
const listeners = new Set<QueueChangeListener>();

let draining = false;

async function readAll(): Promise<QueuedWorkoutLog[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedWorkoutLog[];
  } catch {
    return [];
  }
}

async function writeAll(items: QueuedWorkoutLog[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  listeners.forEach((l) => l(items));
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function enqueueWorkoutLog(
  instanceId: string,
  payload: SubmitLogPayload,
): Promise<QueuedWorkoutLog> {
  const items = await readAll();
  const entry: QueuedWorkoutLog = {
    id: makeId(),
    instanceId,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
    status: 'pending',
  };
  items.push(entry);
  await writeAll(items);
  return entry;
}

export async function listPending(): Promise<QueuedWorkoutLog[]> {
  return readAll();
}

export async function clearAll(): Promise<void> {
  await writeAll([]);
}

export async function removeFromQueue(id: string): Promise<void> {
  const items = await readAll();
  const next = items.filter((i) => i.id !== id);
  await writeAll(next);
}

export interface DrainResult {
  processed: number;
  succeeded: number;
  failed: number;
  remaining: number;
}

export async function drainQueue(): Promise<DrainResult> {
  if (draining) return { processed: 0, succeeded: 0, failed: 0, remaining: 0 };
  draining = true;

  let succeeded = 0;
  let failed = 0;
  let processed = 0;

  try {
    const items = await readAll();
    if (items.length === 0) return { processed: 0, succeeded: 0, failed: 0, remaining: 0 };

    const remaining: QueuedWorkoutLog[] = [];
    for (const item of items) {
      processed++;
      if (item.attempts >= MAX_ATTEMPTS) {
        remaining.push({ ...item, status: 'failed' });
        failed++;
        continue;
      }
      try {
        await api.post(`/workouts/instances/${item.instanceId}/log`, item.payload);
        succeeded++;
      } catch (err) {
        remaining.push({
          ...item,
          attempts: item.attempts + 1,
          lastError: (err as Error).message,
          status: item.attempts + 1 >= MAX_ATTEMPTS ? 'failed' : 'pending',
        });
        failed++;
      }
    }

    await writeAll(remaining);
    return { processed, succeeded, failed, remaining: remaining.length };
  } finally {
    draining = false;
  }
}

export function subscribeQueue(listener: QueueChangeListener): () => void {
  listeners.add(listener);
  readAll().then(listener).catch(() => {});
  return () => {
    listeners.delete(listener);
  };
}
