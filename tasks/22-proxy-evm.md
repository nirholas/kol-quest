# Task: EVM API Proxy Routes

## Context
Implement proxy routes for EVM data sources: Moralis, DeBank, Alchemy, Etherscan V2, Covalent.

## Requirements

### 1. Moralis Proxy

**Routes:**
```
GET /api/proxy/evm/moralis/wallet/[address]/tokens?chain=eth
GET /api/proxy/evm/moralis/wallet/[address]/net-worth?chain=eth
GET /api/proxy/evm/moralis/wallet/[address]/history?chain=eth
GET /api/proxy/evm/moralis/wallet/[address]/nfts?chain=eth
GET /api/proxy/evm/moralis/wallet/[address]/defi?chain=eth
GET /api/proxy/evm/moralis/token/[address]/price?chain=eth
GET /api/proxy/evm/moralis/token/[address]/holders?chain=eth
GET /api/proxy/evm/moralis/market/top-tokens
GET /api/proxy/evm/moralis/market/trending
GET /api/proxy/evm/moralis/whales?chain=eth
```

**Chain Parameter:**
`eth`, `bsc`, `polygon`, `arbitrum`, `optimism`, `base`, `avalanche`

### 2. DeBank Proxy

**Routes:**
```
GET /api/proxy/evm/debank/wallet/[address]/balance
GET /api/proxy/evm/debank/wallet/[address]/tokens
GET /api/proxy/evm/debank/wallet/[address]/protocols
GET /api/proxy/evm/debank/wallet/[address]/history
GET /api/proxy/evm/debank/wallet/[address]/nfts
GET /api/proxy/evm/debank/chains
GET /api/proxy/evm/debank/protocols
```

**Note:** DeBank returns ALL chains in one call - very efficient.

### 3. Alchemy Proxy

**Routes:**
```
GET /api/proxy/evm/alchemy/wallet/[address]/balances?chain=eth
GET /api/proxy/evm/alchemy/wallet/[address]/transfers?chain=eth
GET /api/proxy/evm/alchemy/wallet/[address]/nfts?chain=eth
GET /api/proxy/evm/alchemy/token/[address]/metadata?chain=eth
```

**Chain-specific API keys:**
```typescript
const ALCHEMY_KEYS = {
  eth: process.env.ALCHEMY_ETH_KEY,
  base: process.env.ALCHEMY_BASE_KEY,
  arbitrum: process.env.ALCHEMY_ARB_KEY,
  polygon: process.env.ALCHEMY_POLYGON_KEY,
  optimism: process.env.ALCHEMY_OPT_KEY,
};
```

### 4. Etherscan V2 Proxy

**Routes:**
```
GET /api/proxy/evm/etherscan/account/[address]/balance?chainid=1
GET /api/proxy/evm/etherscan/account/[address]/transactions?chainid=1
GET /api/proxy/evm/etherscan/account/[address]/tokentx?chainid=1
GET /api/proxy/evm/etherscan/account/[address]/nfttx?chainid=1
GET /api/proxy/evm/etherscan/contract/[address]/abi?chainid=1
GET /api/proxy/evm/etherscan/gas?chainid=1
GET /api/proxy/evm/etherscan/stats?chainid=1
```

**Chain IDs:**
```typescript
const CHAIN_IDS = {
  ethereum: 1,
  bsc: 56,
  polygon: 137,
  arbitrum: 42161,
  optimism: 10,
  base: 8453,
  avalanche: 43114,
  fantom: 250,
};
```

### 5. Covalent Proxy

**Routes:**
```
GET /api/proxy/evm/covalent/wallet/[address]/balances?chain=eth
GET /api/proxy/evm/covalent/wallet/[address]/transactions?chain=eth
GET /api/proxy/evm/covalent/wallet/[address]/portfolio?chain=eth
GET /api/proxy/evm/covalent/token/[address]/holders?chain=eth
GET /api/proxy/evm/covalent/chains
GET /api/proxy/evm/covalent/chains/status
```

**Chain Names:**
`eth-mainnet`, `bsc-mainnet`, `matic-mainnet`, `arbitrum-mainnet`, etc.

### 6. Unified EVM Wallet Endpoint

```typescript
// GET /api/proxy/evm/wallet/[address]?chains=eth,bsc,polygon

interface UnifiedEvmWallet {
  address: string;
  chains: string[];
  
  // Aggregated from all sources
  totalBalance: number;
  
  balanceByChain: {
    [chain: string]: {
      native: { balance: string; usd: number };
      tokens: TokenBalance[];
      nfts: number;
      defi: { protocols: number; totalValue: number };
    };
  };
  
  // From DeBank (best for cross-chain)
  defiPositions: DefiPosition[];
  
  // From Moralis
  netWorth: number;
  profitability: { realized: number; unrealized: number };
  
  // Metadata
  sources: {
    moralis: boolean;
    debank: boolean;
    alchemy: boolean;
    etherscan: boolean;
    covalent: boolean;
  };
}
```

### 7. Caching Rules

| Endpoint Type | TTL | Stale |
|--------------|-----|-------|
| Token price | 30s | 2m |
| Wallet balances | 2m | 10m |
| DeFi positions | 5m | 30m |
| NFTs | 10m | 1h |
| Transactions | 1m | 5m |
| Gas prices | 15s | 1m |
| Chain info | 1h | 24h |

## Files to Create

```
site/app/api/proxy/evm/
├── moralis/
│   ├── wallet/[address]/tokens/route.ts
│   ├── wallet/[address]/net-worth/route.ts
│   ├── wallet/[address]/history/route.ts
│   ├── wallet/[address]/nfts/route.ts
│   ├── wallet/[address]/defi/route.ts
│   ├── token/[address]/price/route.ts
│   ├── market/top-tokens/route.ts
│   └── whales/route.ts
├── debank/
│   ├── wallet/[address]/balance/route.ts
│   ├── wallet/[address]/tokens/route.ts
│   ├── wallet/[address]/protocols/route.ts
│   ├── chains/route.ts
│   └── protocols/route.ts
├── alchemy/
│   ├── wallet/[address]/balances/route.ts
│   ├── wallet/[address]/transfers/route.ts
│   └── wallet/[address]/nfts/route.ts
├── etherscan/
│   ├── account/[address]/balance/route.ts
│   ├── account/[address]/transactions/route.ts
│   ├── account/[address]/tokentx/route.ts
│   └── gas/route.ts
├── covalent/
│   ├── wallet/[address]/balances/route.ts
│   ├── wallet/[address]/transactions/route.ts
│   ├── token/[address]/holders/route.ts
│   └── chains/route.ts
└── wallet/[address]/route.ts  # Unified endpoint

site/lib/proxy/sources/
├── moralis.ts
├── debank.ts
├── alchemy.ts
├── etherscan.ts
└── covalent.ts
```

## Example Usage

```bash
# Get wallet balances from Moralis
curl "https://kolquest.com/api/proxy/evm/moralis/wallet/0x123/tokens?chain=eth" \
  -H "X-API-Key: your-key"

# Get DeFi positions from DeBank (ALL chains)
curl "https://kolquest.com/api/proxy/evm/debank/wallet/0x123/protocols" \
  -H "X-API-Key: your-key"

# Get unified wallet data
curl "https://kolquest.com/api/proxy/evm/wallet/0x123?chains=eth,bsc,polygon" \
  -H "X-API-Key: your-key"
```

## Acceptance Criteria
- [ ] All Moralis endpoints proxied
- [ ] All DeBank endpoints proxied  
- [ ] All Alchemy endpoints proxied
- [ ] All Etherscan V2 endpoints proxied
- [ ] All Covalent endpoints proxied
- [ ] Unified wallet endpoint aggregates all sources
- [ ] Chain parameter works correctly
- [ ] Caching reduces upstream calls
- [ ] Rate limiting per user
