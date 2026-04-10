"use client";

import { useState, useRef, useEffect } from "react";

type ExportFormat = "json" | "csv" | "txt" | "gmgn" | "padre" | "axiom";

interface WalletExportData {
  wallet_address: string;
  name: string;
  chain?: "sol" | "bsc" | "polygon";
}

function formatLabel(name: string, address: string): string {
  if (name && name !== address && name !== "Unknown") return name;
  return "";
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

function exportJSON(wallets: WalletExportData[]): string {
  return JSON.stringify(
    wallets.map((w) => ({
      address: w.wallet_address,
      label: w.name || undefined,
      chain: w.chain || undefined,
    })),
    null,
    2
  );
}

function exportCSV(wallets: WalletExportData[]): string {
  const rows = ["address,label,chain"];
  for (const w of wallets) {
    const label = w.name?.includes(",") ? `"${w.name}"` : w.name || "";
    rows.push(`${w.wallet_address},${label},${w.chain || ""}`);
  }
  return rows.join("\n");
}

function exportTXT(wallets: WalletExportData[]): string {
  return wallets.map((w) => w.wallet_address).join("\n");
}

// GMGN import format: JSON array of addresses
function exportGMGN(wallets: WalletExportData[]): string {
  return JSON.stringify(wallets.map((w) => w.wallet_address), null, 2);
}

// Padre format: address,label (one per line, label optional)
function exportPadre(wallets: WalletExportData[]): string {
  return wallets
    .map((w) => {
      const label = formatLabel(w.name, w.wallet_address);
      return label ? `${w.wallet_address},${label}` : w.wallet_address;
    })
    .join("\n");
}

// Axiom format: comma-separated addresses (single line)
function exportAxiom(wallets: WalletExportData[]): string {
  return wallets.map((w) => w.wallet_address).join(",");
}

const FORMAT_OPTIONS: { value: ExportFormat; label: string; desc: string; ext: string; mime: string }[] = [
  { value: "json", label: "JSON", desc: "Full data with labels", ext: "json", mime: "application/json" },
  { value: "csv", label: "CSV", desc: "Spreadsheet compatible", ext: "csv", mime: "text/csv" },
  { value: "txt", label: "TXT", desc: "Addresses only, one per line", ext: "txt", mime: "text/plain" },
  { value: "gmgn", label: "GMGN", desc: "GMGN import format", ext: "json", mime: "application/json" },
  { value: "padre", label: "Padre", desc: "Address,Label per line", ext: "csv", mime: "text/csv" },
  { value: "axiom", label: "Axiom", desc: "Comma-separated addresses", ext: "txt", mime: "text/plain" },
];

const EXPORTERS: Record<ExportFormat, (wallets: WalletExportData[]) => string> = {
  json: exportJSON,
  csv: exportCSV,
  txt: exportTXT,
  gmgn: exportGMGN,
  padre: exportPadre,
  axiom: exportAxiom,
};

export default function ExportButton({ wallets, filename = "wallets" }: { wallets: WalletExportData[]; filename?: string }) {
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
    const content = EXPORTERS[fmt](wallets);
    downloadFile(content, `${filename}.${opt.ext}`, opt.mime);
    setOpen(false);
  }

  async function handleCopy(fmt: ExportFormat) {
    const content = EXPORTERS[fmt](wallets);
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
        <div className="absolute right-0 top-full mt-2 w-72 bg-zinc-900 border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
          <div className="px-3 py-2 border-b border-border">
            <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
              Export {wallets.length} wallets
            </span>
          </div>
          {FORMAT_OPTIONS.map((fmt) => (
            <div
              key={fmt.value}
              className="flex items-center justify-between px-3 py-2.5 hover:bg-zinc-800/80 transition-colors group"
            >
              <button
                onClick={() => handleExport(fmt.value)}
                className="flex-1 text-left"
              >
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
