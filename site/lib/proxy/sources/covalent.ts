import { CACHE_TTL } from "../types";

const BASE_URL = "https://api.covalenthq.com/v1";

export class CovalentProxy {
  private get authHeader() {
    const key = process.env.COVALENT_API_KEY || "";
    if (!key) {
      throw new Error("COVALENT_API_KEY is not configured");
    }
    const encoded = Buffer.from(`${key}:`).toString('base64');
    return { "Authorization": `Basic ${encoded}` };
  }

  private async fetch(endpoint: string, params: Record<string, string> = {}) {
    const url = new URL(`${BASE_URL}${endpoint}`);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value);
      }
    });

    const response = await fetch(url.toString(), {
      headers: this.authHeader,
      next: { revalidate: CACHE_TTL.walletBalances },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Covalent API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  async getWalletBalances(address: string, chain: string) {
    return this.fetch(`/${chain}/address/${address}/balances_v2/`, { "nft": "false", "no-nft-fetch": "true" });
  }

  async getWalletTransactions(address: string, chain: string) {
    return this.fetch(`/${chain}/address/${address}/transactions_v3/page/0/`, { "page-size": "20" });
  }

  async getWalletPortfolio(address: string, chain: string) {
    return this.fetch(`/${chain}/address/${address}/portfolio_v2/`, { "days": "30" });
  }

  async getTokenHolders(address: string, chain: string) {
    return this.fetch(`/${chain}/tokens/${address}/token_holders_v2/`, { "page-size": "100" });
  }

  async getChains() {
    return this.fetch(`/chains/`);
  }

  async getChainStatus() {
    return this.fetch(`/chains/status/`);
  }
}

export const covalentProxy = new CovalentProxy();
