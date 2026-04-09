
// Helius proxy config
import { ProxyConfig } from "../handler";
import { CACHE_CONFIGS } from "../cache";

export const heliusConfig: ProxyConfig = {
    name: 'helius',
    baseUrl: 'https://api.helius.xyz/v0',
    authHeader: 'Authorization',
    authKey: `Bearer ${process.env.HELIUS_API_KEY}`,
    rateLimit: { requests: 100, window: 60 },
    cache: CACHE_CONFIGS.frequent,
};
