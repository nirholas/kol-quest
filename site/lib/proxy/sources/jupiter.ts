import { ProxyConfig } from '../handler';
import { CACHE_CONFIGS } from '../cache';

export const jupiterConfig: ProxyConfig = {
  baseUrl: 'https://quote-api.jup.ag/v6',
  rateLimit: { limit: 60, windowMs: 60000 },
  cache: CACHE_CONFIGS.realtime,
};

export const jupiterPriceConfig: ProxyConfig = {
  baseUrl: 'https://price.jup.ag/v6',
  rateLimit: { limit: 120, windowMs: 60000 },
  cache: CACHE_CONFIGS.realtime,
};

export const jupiterTokensConfig: ProxyConfig = {
  baseUrl: 'https://tokens.jup.ag',
  rateLimit: { limit: 10, windowMs: 60000 },
  cache: CACHE_CONFIGS.static,
};
