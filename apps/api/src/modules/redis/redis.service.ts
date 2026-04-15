import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  constructor(private configService: ConfigService) {
    super(configService.get<string>('REDIS_URL') || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    this.connect().catch(() => {
      console.warn('Redis not available — running without cache');
    });
  }

  async onModuleDestroy() {
    await this.quit();
  }
}
