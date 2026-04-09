export function timeAgo(date: string | Date | null): string {
  if (!date) return "—";
  const diff = Date.now() - new Date(date).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function shortAddr(addr: string): string {
  if (addr.startsWith("0x")) return addr.slice(0, 6) + "…" + addr.slice(-4);
  return addr.slice(0, 4) + "…" + addr.slice(-4);
}

/** Truncates an address with "..." (3-dot) separator for compact display. */
export function truncateAddr(addr: string): string {
  if (addr.startsWith("0x")) return addr.slice(0, 6) + "..." + addr.slice(-4);
  return addr.slice(0, 4) + "..." + addr.slice(-4);
}

export function formatUsd(v: number | null): string {
  if (v == null) return "—";
  if (Math.abs(v) >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(1)}k`;
  return `$${v.toFixed(2)}`;
}

/** Formats a signed profit value with +/- prefix, e.g. "+$1.2k", "-$345.00" */
export function formatProfit(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${v >= 0 ? "+" : ""}${(v / 1_000_000).toFixed(1)}M`;
  const abs = Math.abs(v);
  const str = abs >= 1_000 ? `${(abs / 1_000).toFixed(1)}k` : abs.toFixed(2);
  return `${v >= 0 ? "+" : "-"}${str}`;
}

/** Compact number formatter for follower / subscriber counts. */
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function explorerUrl(chain: string, txHash: string): string {
  if (chain === "bsc") return `https://bscscan.com/tx/${txHash}`;
  return `https://solscan.io/tx/${txHash}`;
}

export function walletHref(chain: string, addr: string): string {
  if (chain === "bsc") return `/gmgn-wallet/${addr}?chain=bsc`;
  return `/wallet/${addr}`;
}
