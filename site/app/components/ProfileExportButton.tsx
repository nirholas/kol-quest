"use client";

import { useState, useRef, useEffect } from "react";

interface ProfileData {
  wallet_address: string;
  name: string;
  chain?: "sol" | "bsc";
  twitter?: string | null;
  telegram?: string | null;
  profit?: number;
  wins?: number;
  losses?: number;
  winrate?: number;
  [key: string]: unknown;
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const FORMAT_OPTIONS = [
  { value: "json", label: "JSON", desc: "Full profile data", ext: "json", mime: "application/json" },
  { value: "csv", label: "CSV", desc: "Spreadsheet compatible", ext: "csv", mime: "text/csv" },
  { value: "txt", label: "TXT", desc: "Address only", ext: "txt", mime: "text/plain" },
  { value: "gmgn", label: "GMGN", desc: "GMGN import format", ext: "json", mime: "application/json" },
  { value: "padre", label: "Padre", desc: "Address,Label format", ext: "csv", mime: "text/csv" },
  { value: "axiom", label: "Axiom", desc: "Axiom import format", ext: "txt", mime: "text/plain" },
] as const;

type ExportFormat = (typeof FORMAT_OPTIONS)[number]["value"];

function exportProfile(profile: ProfileData, fmt: ExportFormat): string {
  switch (fmt) {
    case "json":
      return JSON.stringify(
        {
          address: profile.wallet_address,
          label: profile.name || undefined,
          chain: profile.chain || undefined,
          twitter: profile.twitter || undefined,
          telegram: profile.telegram || undefined,
          profit: profile.profit,
          wins: profile.wins,
          losses: profile.losses,
          winrate: profile.winrate,
        },
        null,
        2
      );
    case "csv": {
      const headers = "address,label,chain,twitter,profit,wins,losses,winrate";
      const name = profile.name?.includes(",") ? `"${profile.name}"` : profile.name || "";
      const row = `${profile.wallet_address},${name},${profile.chain || ""},${profile.twitter || ""},${profile.profit ?? ""},${profile.wins ?? ""},${profile.losses ?? ""},${profile.winrate ?? ""}`;
      return `${headers}\n${row}`;
    }
    case "txt":
      return profile.wallet_address;
    case "gmgn":
      return JSON.stringify([profile.wallet_address]);
    case "padre": {
      const label = profile.name && profile.name !== profile.wallet_address ? profile.name : "";
      return label ? `${profile.wallet_address},${label}` : profile.wallet_address;
    }
    case "axiom":
      return profile.wallet_address;
  }
}

export default function ProfileExportButton({ profile }: { profile: ProfileData }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<ExportFormat | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleExport(fmt: ExportFormat) {
    const opt = FORMAT_OPTIONS.find((f) => f.value === fmt)!;
    const content = exportProfile(profile, fmt);
    downloadFile(content, `${profile.name || profile.wallet_address}.${opt.ext}`, opt.mime);
    setOpen(false);
  }

  async function handleCopy(fmt: ExportFormat) {
    const content = exportProfile(profile, fmt);
    await navigator.clipboard.writeText(content);
    setCopied(fmt);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 bg-bg-card border border-border rounded-xl px-3 py-1.5 text-sm text-zinc-400 hover:text-white hover:border-zinc-600 transition-all"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-zinc-900 border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
          <div className="px-3 py-2 border-b border-border">
            <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
              Export Profile
            </span>
          </div>
          {FORMAT_OPTIONS.map((fmt) => (
            <div
              key={fmt.value}
              className="flex items-center justify-between px-3 py-2.5 hover:bg-zinc-800/80 transition-colors group"
            >
              <button onClick={() => handleExport(fmt.value)} className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{fmt.label}</span>
                  <span className="text-[11px] text-zinc-600">.{fmt.ext}</span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">{fmt.desc}</p>
              </button>
              <button
                onClick={() => handleCopy(fmt.value)}
                className="ml-2 p-1.5 rounded-lg text-zinc-600 hover:text-white hover:bg-zinc-700 transition-colors opacity-0 group-hover:opacity-100"
                title="Copy to clipboard"
              >
                {copied === fmt.value ? (
                  <svg className="w-3.5 h-3.5 text-buy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
