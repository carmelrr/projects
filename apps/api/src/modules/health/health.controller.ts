import { Controller, Get } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { RedisService } from '../redis/redis.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(
    private firebase: FirebaseService,
    private redis: RedisService,
  ) {}

  @Public()
  @Get()
  async check() {
    const checks: Record<string, string> = {};

    try {
      // Quick Firestore connectivity check
      await this.firebase.db.collection('_health').doc('ping').set({ ts: Date.now() });
      checks.firestore = 'ok';
    } catch {
      checks.firestore = 'error';
    }

    try {
      await this.redis.ping();
      checks.redis = 'ok';
    } catch {
      checks.redis = 'error';
    }

    const healthy = checks.firestore === 'ok';

    return {
      data: {
        status: healthy ? (checks.redis === 'ok' ? 'healthy' : 'degraded') : 'unhealthy',
        checks,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
