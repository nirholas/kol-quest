export interface SourceConfig {
  baseUrl: string;
  headers?: Record<string, string>;
  appendKey?: { param: string; value: string };
}

export const sources: Record<string, SourceConfig> = {
  // --- Solana ---
  helius: {
    baseUrl: 'https://api.helius.xyz',
    appendKey: { param: 'api-key', value: process.env.HELIUS_API_KEY || '' }
  },
  helius_rpc: {
    baseUrl: 'https://mainnet.helius-rpc.com',
    appendKey: { param: 'api-key', value: process.env.HELIUS_API_KEY || '' }
  },
  birdeye: {
    baseUrl: 'https://public-api.birdeye.so',
    headers: {
      'X-API-KEY': process.env.BIRDEYE_API_KEY || '',
      'x-chain': 'solana',
    }
  },
  solscan: {
    baseUrl: 'https://pro-api.solscan.io/v2.0',
    headers: {
      ...(process.env.SOLSCAN_API_KEY ? { token: process.env.SOLSCAN_API_KEY } : {})
    }
  },
  jupiter: {
    baseUrl: 'https://quote-api.jup.ag/v6',
  },
  jupiter_price: {
    baseUrl: 'https://price.jup.ag/v6',
  },
  jupiter_tokens: {
    baseUrl: 'https://tokens.jup.ag',
  },

  // --- EVM ---
  moralis: {
    baseUrl: 'https://deep-index.moralis.io/api/v2.2',
    headers: {
      'X-API-Key': process.env.MORALIS_API_KEY || '',
    }
  },
  alchemy: {
    // Alchemy uses per-network URLs; callers should pass the full endpoint via params
    baseUrl: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY || ''}`,
  },
  alchemy_base: {
    baseUrl: `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY || ''}`,
  },
  alchemy_arb: {
    baseUrl: `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY || ''}`,
  },
  etherscan: {
    baseUrl: 'https://api.etherscan.io/v2/api',
    appendKey: { param: 'apikey', value: process.env.ETHERSCAN_API_KEY || '' }
  },
  covalent: {
    baseUrl: 'https://api.covalenthq.com/v1',
    headers: {
      Authorization: `Bearer ${process.env.COVALENT_API_KEY || ''}`,
    }
  },
  debank: {
    baseUrl: 'https://pro-openapi.debank.com/v1',
    headers: {
      AccessKey: process.env.DEBANK_API_KEY || '',
    }
  },

  // --- Market ---
  dexscreener: {
    baseUrl: 'https://api.dexscreener.com/latest/dex',
  },
  coingecko: {
    baseUrl: 'https://api.coingecko.com/api/v3',
    ...(process.env.COINGECKO_API_KEY
      ? { appendKey: { param: 'x_cg_demo_api_key', value: process.env.COINGECKO_API_KEY } }
      : {}),
  },
  coingecko_pro: {
    baseUrl: 'https://pro-api.coingecko.com/api/v3',
    headers: {
      'x-cg-pro-api-key': process.env.COINGECKO_PRO_API_KEY || '',
    }
  },
  geckoterminal: {
    baseUrl: 'https://api.geckoterminal.com/api/v2',
    headers: {
      Accept: 'application/json;version=20230302',
    }
  },
  gmgn: {
    baseUrl: 'https://gmgn.ai/defi/quotation',
  },

  // --- Analytics ---
  dune: {
    baseUrl: 'https://api.dune.com/api/v1',
    headers: {
      'x-dune-api-key': process.env.DUNE_API_KEY || '',
    }
  },
  flipside: {
    baseUrl: 'https://api-v2.flipsidecrypto.xyz',
    headers: {
      'x-api-key': process.env.FLIPSIDE_API_KEY || '',
    }
  },
  bitquery: {
    baseUrl: 'https://graphql.bitquery.io',
    headers: {
      'X-API-KEY': process.env.BITQUERY_API_KEY || '',
      'Content-Type': 'application/json',
    }
  },
  thegraph: {
    baseUrl: 'https://api.thegraph.com/subgraphs/name',
    headers: {
      Authorization: `Bearer ${process.env.THE_GRAPH_API_KEY || ''}`,
    }
  },
};
