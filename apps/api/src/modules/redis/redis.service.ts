import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  private available = false;

  constructor(private configService: ConfigService) {
    super(configService.get<string>('REDIS_URL') || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: () => null, // don't keep reconnecting if unreachable
    });

    // Swallow error events so we don't flood logs when Redis is not running
    // locally. We log once.
    this.on('error', () => {
      if (this.available) {
        this.available = false;
        console.warn('Redis connection lost — running without cache');
      }
    });

    this.connect()
      .then(() => {
        this.available = true;
      })
      .catch(() => {
        console.warn('Redis not available — running without cache');
      });
  }

  async onModuleDestroy() {
    try {
      await this.quit();
    } catch {
      // ignore — connection may already be closed
    }
  }
}
