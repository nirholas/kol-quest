import { CACHE_TTL } from "../types";

const BASE_URL = "https://pro-openapi.debank.com/v1";

export class DeBankProxy {
  private accessKey: string;

  constructor() {
    this.accessKey = process.env.DEBANK_API_KEY || "";
  }

  private async fetch(endpoint: string, params: Record<string, string> = {}) {
    if (!this.accessKey) {
      throw new Error("DEBANK_API_KEY is not configured");
    }

    const url = new URL(`${BASE_URL}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value);
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        "AccessKey": this.accessKey,
        "Accept": "application/json",
      },
      next: { revalidate: CACHE_TTL.walletBalances },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`DeBank API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  async getWalletBalance(address: string) {
    return this.fetch(`/user/total_balance`, { id: address });
  }

  async getWalletTokens(address: string) {
    return this.fetch(`/user/all_token_list`, { id: address, is_all: "true" });
  }

  async getWalletProtocols(address: string) {
    return this.fetch(`/user/all_complex_protocol_list`, { id: address });
  }

  async getWalletHistory(address: string) {
    return this.fetch(`/user/history_list`, { id: address, page_count: "20" });
  }

  async getWalletNfts(address: string) {
    return this.fetch(`/user/nft_list`, { id: address });
  }

  async getChains() {
    return this.fetch(`/chain/list`);
  }

  async getProtocols() {
    return this.fetch(`/protocol/all_list`);
  }
}

export const debankProxy = new DeBankProxy();
