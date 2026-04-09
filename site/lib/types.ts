export interface KolEntry {
  wallet_address: string;
  name: string;
  telegram: string | null;
  twitter: string | null;
  profit: number;
  wins: number;
  losses: number;
  timeframe: number;
}

export type SortField = "name" | "profit" | "wins" | "losses" | "winrate";
export type SortDir = "asc" | "desc";
export type Timeframe = 1 | 7 | 30;
