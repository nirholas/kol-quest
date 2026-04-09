
// Helius proxy config
import { ProxyConfig } from "../handler";
import { CACHE_CONFIGS } from "../cache";

export const heliusConfig: ProxyConfig = {
    baseUrl: 'https://api.helius.xyz/v0',
    apiKey: process.env.HELIUS_API_KEY,
    rateLimit: { limit: 100, windowMs: 60000 },
    cache: CACHE_CONFIGS.frequent,
};
