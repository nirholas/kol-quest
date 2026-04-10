import { CACHE_TTL } from "../types";

const BASE_URL = "https://deep-index.moralis.io/api/v2.2";

export class MoralisProxy {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.MORALIS_API_KEY || "";
  }

  private async fetch(endpoint: string, params: Record<string, string> = {}) {
    if (!this.apiKey) {
      throw new Error("MORALIS_API_KEY is not configured");
    }

    const url = new URL(`${BASE_URL}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value);
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        "X-API-Key": this.apiKey,
        "Accept": "application/json",
      },
      next: { revalidate: CACHE_TTL.walletBalances },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Moralis API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  async getWalletTokens(address: string, chain: string) {
    return this.fetch(`/wallets/${address}/tokens`, { chain });
  }

  async getWalletNetWorth(address: string, chain: string) {
    return this.fetch(`/wallets/${address}/net-worth`, { chains: chain });
  }

  async getWalletHistory(address: string, chain: string) {
    return this.fetch(`/wallets/${address}/history`, { chain });
  }

  async getWalletNfts(address: string, chain: string) {
    return this.fetch(`/wallets/${address}/nfts`, { chain });
  }

  async getWalletDefi(address: string, chain: string) {
    return this.fetch(`/wallets/${address}/defi/positions`, { chain, protocol: "all" });
  }

  async getTokenPrice(address: string, chain: string) {
    return this.fetch(`/erc20/${address}/price`, { chain });
  }

  async getTokenHolders(address: string, chain: string) {
    return this.fetch(`/erc20/${address}/owners`, { chain });
  }

  async getTopTokens() {
    return this.fetch(`/market-data/erc20s/top-tokens`);
  }

  async getTrendingTokens() {
    return this.fetch(`/market-data/erc20s/trending`);
  }

  async getWhales(chain: string) {
    return this.fetch(`/discovery/whales`, { chains: chain });
  }
}

export const moralisProxy = new MoralisProxy();
