// KolScan leaderboard entry (original format)
export interface KolEntry {
  wallet_address: string;
  name: string;
  telegram: string | null;
  twitter: string | null;
  avatar?: string | null;
  profit: number;
  wins: number;
  losses: number;
  timeframe: number;
}

// GMGN wallet entry (normalized from GMGN scrape)
export interface GmgnWallet {
  wallet_address: string;
  name: string;
  sns_id?: string | null;
  ens_name?: string | null;
  twitter_username: string | null;
  twitter_name: string | null;
  avatar: string | null;
  tags: string[];
  category: string; // smart_degen, kol, snipe_bot, etc.
  chain: "sol" | "bsc";
  realized_profit_1d: number;
  realized_profit_7d: number;
  realized_profit_30d: number;
  buy_1d: number;
  buy_7d: number;
  buy_30d: number;
  sell_1d: number;
  sell_7d: number;
  sell_30d: number;
  winrate_7d: number;
  winrate_30d: number;
  balance: number;
  last_active: number;
  follow_count: number;
  // PnL ratios (ROI)
  pnl_1d: number;
  pnl_7d: number;
  pnl_30d: number;
  // Transaction counts
  txs_1d: number;
  txs_7d: number;
  txs_30d: number;
  // Win rate 1d
  winrate_1d: number;
  // Volume
  volume_1d: number;
  volume_7d: number;
  volume_30d: number;
  // Average cost basis
  avg_cost_1d: number;
  avg_cost_7d: number;
  avg_cost_30d: number;
  // Average holding period (seconds)
  avg_holding_period_1d: number;
  avg_holding_period_7d: number;
  avg_holding_period_30d: number;
  // Net inflow/outflow
  net_inflow_1d: number;
  net_inflow_7d: number;
  net_inflow_30d: number;
  // PnL distribution (7d trade outcome buckets)
  pnl_lt_minus_dot5_num_7d: number; // trades at < -50%
  pnl_minus_dot5_0x_num_7d: number; // trades at -50% to 0x
  pnl_lt_2x_num_7d: number;         // trades at 0-2x
  pnl_2x_5x_num_7d: number;         // trades at 2-5x
  pnl_gt_5x_num_7d: number;         // trades at >5x
  // Daily profit sparkline
  daily_profit_7d: { timestamp: number; profit: number }[];
  // All-time totals (not capped to a timeframe window)
  buy_total: number;
  sell_total: number;
  txs_total: number;
  // How many GMGN users are tracking this wallet
  remark_count: number;
  // Per-chain balance breakdown
  eth_balance: number;
  sol_balance: number;
  trx_balance: number;
  monad_balance: number;
}

// Unified wallet for combined leaderboard views
export interface UnifiedWallet {
  wallet_address: string;
  name: string;
  sns_id?: string | null;
  ens_name?: string | null;
  twitter: string | null;
  chain: "sol" | "bsc";
  source: "kolscan" | "gmgn";
  category: string;
  tags: string[];
  profit_1d: number;
  profit_7d: number;
  profit_30d: number;
  buys_1d: number;
  buys_7d: number;
  buys_30d: number;
  sells_1d: number;
  sells_7d: number;
  sells_30d: number;
  winrate_1d: number;
  winrate_7d: number;
  winrate_30d: number;
  avatar: string | null;
  sparkline?: number[]; // 7-day daily profit values (GMGN wallets only)
}

// X/Twitter profile data (scraped via xactions)
export interface XProfile {
  id: string | null;
  username: string;
  name: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  avatar: string | null;
  header: string | null;
  followers: number;
  following: number;
  tweets: number;
  likes: number;
  media: number;
  verified: boolean;
  protected: boolean;
  joinDate: string | null;
  pinnedTweetId: string | null;
  scrapedAt: string;
  error?: string;
}

export type SortField = "name" | "profit" | "wins" | "losses" | "winrate";

// GMGN X Tracker account
export interface XTrackerAccount {
  handle: string;
  name: string | null;
  avatar: string | null;
  subscribers: number;
  followers: number;
  tag: string | null;
  verified: boolean;
  bio: string | null;
}

export interface XTrackerData {
  meta: {
    scrapedAt: string;
    source: string;
    totalAccounts: number;
  };
  accounts: XTrackerAccount[];
}
export type GmgnSortField = "name" | "profit_1d" | "profit_7d" | "profit_30d" | "winrate_7d" | "buys_7d" | "sells_7d";
export type SortDir = "asc" | "desc";
export type Timeframe = 1 | 7 | 30;
export type WalletSource = "kolscan" | "gmgn" | "polymarket" | "all";
export type Chain = "sol" | "bsc" | "polygon";

// ────────────────────────────────────────────────────────────
// Polymarket Types
// ────────────────────────────────────────────────────────────

// Polymarket trader/wallet from leaderboard
export interface PolymarketTrader {
  wallet_address: string;        // Polygon address
  username: string | null;       // Polymarket username
  display_name: string | null;   // Display name
  profile_image: string | null;  // Avatar URL
  bio: string | null;
  twitter_handle: string | null;
  rank: number;                  // Leaderboard rank
  
  // PnL metrics
  pnl_total: number;             // All-time PnL in USD
  pnl_7d: number;
  pnl_30d: number;
  pnl_ytd: number;
  
  // Volume metrics
  volume_total: number;          // All-time volume traded
  volume_7d: number;
  volume_30d: number;
  
  // Trading stats
  trades_count: number;          // Total number of trades
  markets_traded: number;        // Number of unique markets
  positions_count: number;       // Current open positions
  
  // Win rate
  winrate: number;               // Overall win rate (0-1)
  profit_factor: number;         // Total gains / total losses
  
  // Tracking
  followers_count: number;       // Polymarket followers
  last_trade_at: string | null;  // ISO timestamp
  created_at: string | null;     // Account creation date
  
  // Tags/categories
  tags: string[];                // e.g., "whale", "politics_expert", "sports_trader"
}

// Polymarket market/event
export interface PolymarketMarket {
  id: string;                    // Market ID
  condition_id: string;          // CLOB condition ID
  slug: string;                  // URL slug
  question: string;              // Market question
  description: string | null;
  category: string;              // politics, sports, crypto, etc.
  end_date: string | null;       // Resolution date
  
  // Outcome options
  outcomes: string[];            // e.g., ["Yes", "No"] or multiple options
  outcome_prices: number[];      // Current prices (0-1)
  
  // Volume/liquidity
  volume: number;                // Total volume traded
  liquidity: number;             // Current liquidity
  open_interest: number;         // Current open interest
  
  // Status
  active: boolean;
  closed: boolean;
  resolved: boolean;
  resolution_outcome: string | null;
  
  // Media
  image: string | null;
  icon: string | null;
}

// Polymarket position for a trader
export interface PolymarketPosition {
  trader_address: string;
  market_id: string;
  market_question: string;
  outcome: string;               // Which outcome they hold
  size: number;                  // Position size in shares
  avg_price: number;             // Average entry price
  current_price: number;         // Current price
  pnl: number;                   // Unrealized PnL
  pnl_percent: number;           // PnL %
  created_at: string;
}

// Polymarket trade
export interface PolymarketTrade {
  id: string;
  trader_address: string;
  market_id: string;
  market_question: string;
  outcome: string;
  side: "buy" | "sell";
  price: number;
  size: number;
  total: number;
  timestamp: string;
}

// Polymarket data file structure
export interface PolymarketData {
  meta: {
    scrapedAt: string;
    source: string;
    totalTraders: number;
    totalMarkets: number;
  };
  traders: PolymarketTrader[];
  markets: PolymarketMarket[];
}

// Unified wallet extended for Polymarket
export interface UnifiedWalletExtended extends UnifiedWallet {
  // Polymarket-specific fields (optional)
  polymarket_pnl?: number;
  polymarket_volume?: number;
  polymarket_rank?: number;
  polymarket_markets?: number;
}
