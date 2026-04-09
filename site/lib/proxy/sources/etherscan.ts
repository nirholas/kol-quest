import { CACHE_TTL } from "../types";

const BASE_URL = "https://api.etherscan.io/v2/api";

export class EtherscanProxy {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ETHERSCAN_API_KEY || "";
  }

  private async fetch(chainid: string | number, module: string, action: string, params: Record<string, string> = {}) {
    if (!this.apiKey) {
      throw new Error("ETHERSCAN_API_KEY is not configured");
    }

    const url = new URL(BASE_URL);
    url.searchParams.append("chainid", String(chainid));
    url.searchParams.append("module", module);
    url.searchParams.append("action", action);
    url.searchParams.append("apikey", this.apiKey);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value);
      }
    });

    const response = await fetch(url.toString(), {
      next: { revalidate: CACHE_TTL.transactions },
    });

    if (!response.ok) {
      throw new Error(`Etherscan API error (${response.status})`);
    }

    const data = await response.json();
    if (data.status === "0" && data.message !== "No transactions found") {
      throw new Error(`Etherscan error: ${data.result}`);
    }

    return data;
  }

  async getAccountBalance(address: string, chainid: string | number) {
    return this.fetch(chainid, "account", "balance", { address, tag: "latest" });
  }

  async getAccountTransactions(address: string, chainid: string | number) {
    return this.fetch(chainid, "account", "txlist", { 
      address, 
      startblock: "0", 
      endblock: "99999999", 
      page: "1", 
      offset: "50", 
      sort: "desc" 
    });
  }

  async getAccountTokenTx(address: string, chainid: string | number) {
    return this.fetch(chainid, "account", "tokentx", { 
      address, 
      page: "1", 
      offset: "50", 
      sort: "desc" 
    });
  }

  async getAccountNftTx(address: string, chainid: string | number) {
    return this.fetch(chainid, "account", "tokennfttx", { 
      address, 
      page: "1", 
      offset: "50", 
      sort: "desc" 
    });
  }

  async getContractAbi(address: string, chainid: string | number) {
    return this.fetch(chainid, "contract", "getabi", { address });
  }

  async getGasOracle(chainid: string | number) {
    return this.fetch(chainid, "gastracker", "gasoracle");
  }

  async getStats(chainid: string | number) {
    return this.fetch(chainid, "stats", "ethprice");
  }
}

export const etherscanProxy = new EtherscanProxy();
