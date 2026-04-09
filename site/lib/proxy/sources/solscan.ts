import { ProxyConfig } from '../handler';
import { CACHE_CONFIGS } from '../cache';

export const solscanConfig: ProxyConfig = {
  baseUrl: 'https://pro-api.solscan.io/v2.0',
  rateLimit: { limit: 60, windowMs: 60000 },
  cache: CACHE_CONFIGS.frequent,
};
