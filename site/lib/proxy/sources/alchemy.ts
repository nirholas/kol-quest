import { CACHE_TTL } from "../types";

const ALCHEMY_CHAIN_MAPPING: Record<string, { envKey: string; rpcBase: string }> = {
  eth: { envKey: "ALCHEMY_ETH_KEY", rpcBase: "eth-mainnet" },
  base: { envKey: "ALCHEMY_BASE_KEY", rpcBase: "base-mainnet" },
  arbitrum: { envKey: "ALCHEMY_ARB_KEY", rpcBase: "arb-mainnet" },
  polygon: { envKey: "ALCHEMY_POLYGON_KEY", rpcBase: "polygon-mainnet" },
  optimism: { envKey: "ALCHEMY_OPT_KEY", rpcBase: "opt-mainnet" },
};

export class AlchemyProxy {
  private getChainConfig(chain: string) {
    const config = ALCHEMY_CHAIN_MAPPING[chain];
    if (!config) {
      throw new Error(`Unsupported chain for Alchemy: ${chain}`);
    }
    
    const apiKey = process.env[config.envKey];
    if (!apiKey) {
      throw new Error(`${config.envKey} is not configured`);
    }

    return { apiKey, rpcBase: config.rpcBase };
  }

  private async jsonRpc(chain: string, method: string, params: any[]) {
    const { apiKey, rpcBase } = this.getChainConfig(chain);
    const url = `https://${rpcBase}.g.alchemy.com/v2/${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params,
      }),
      next: { revalidate: CACHE_TTL.walletBalances },
    });

    if (!response.ok) {
      throw new Error(`Alchemy API error (${response.status})`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`Alchemy JSON-RPC error: ${data.error.message}`);
    }

    return data.result;
  }

  private async fetchNftApi(chain: string, endpoint: string, queryParams: Record<string, string> = {}) {
    const { apiKey, rpcBase } = this.getChainConfig(chain);
    const url = new URL(`https://${rpcBase}.g.alchemy.com/nft/v3/${apiKey}${endpoint}`);
    
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString(), {
      headers: { "Accept": "application/json" },
      next: { revalidate: CACHE_TTL.nfts },
    });

    if (!response.ok) {
      throw new Error(`Alchemy NFT API error (${response.status})`);
    }

    return response.json();
  }

  async getWalletBalances(address: string, chain: string) {
    return this.jsonRpc(chain, "alchemy_getTokenBalances", [address, "erc20"]);
  }

  async getWalletTransfers(address: string, chain: string) {
    return this.jsonRpc(chain, "alchemy_getAssetTransfers", [{
      fromBlock: "0x0",
      toBlock: "latest",
      fromAddress: address,
      category: ["external", "internal", "erc20", "erc721", "erc1155"],
      maxCount: "0x32",
      withMetadata: true,
      order: "desc"
    }]);
  }

  async getWalletNfts(address: string, chain: string) {
    return this.fetchNftApi(chain, "/getNFTsForOwner", { owner: address, pageSize: "20" });
  }

  async getTokenMetadata(address: string, chain: string) {
    return this.jsonRpc(chain, "alchemy_getTokenMetadata", [address]);
  }
}

export const alchemyProxy = new AlchemyProxy();
