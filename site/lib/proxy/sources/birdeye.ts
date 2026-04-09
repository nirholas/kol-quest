import { ProxyConfig } from '../handler';
import { CACHE_CONFIGS } from '../cache';

export const birdeyeConfig: ProxyConfig = {
  baseUrl: 'https://public-api.birdeye.so',
  rateLimit: { limit: 100, windowMs: 60000 },
  cache: CACHE_CONFIGS.frequent,
};
