import IORedis from 'ioredis';
import { redisUrlFromEnv } from './env';

/** Bot sessiyalari uchun Redis (Upstash TLS + xato loglari). */
export function createRedisClient(): IORedis {
  const url = redisUrlFromEnv();
  const redis = new IORedis(url, {
    maxRetriesPerRequest: null,
    ...(url.startsWith('rediss://') ? { tls: {} } : {}),
  });
  redis.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('[redis]', err.message);
  });
  return redis;
}
