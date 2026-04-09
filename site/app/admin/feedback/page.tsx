"use client";

import { useEffect, useState } from "react";

type FeedbackItem = {
  id: string;
  userId: string | null;
  type: string;
  message: string;
  walletAddress: string | null;
  status: string;
  createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  open: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  resolved: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  dismissed: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20",
};

const TYPE_COLORS: Record<string, string> = {
  feedback: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  removal_request: "text-red-400 bg-red-400/10 border-red-400/20",
};

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "resolved" | "dismissed">("open");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/feedback", { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error || "Failed to load feedback");
      setLoading(false);
      return;
    }
    setItems(json.feedback || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function resolve(id: string) {
    const res = await fetch(`/api/admin/feedback/${id}/resolve`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error || "Failed to resolve");
      return;
    }
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, status: "resolved" } : x)));
    setMessage("Marked as resolved");
  }

  async function dismiss(id: string) {
    const res = await fetch(`/api/admin/feedback/${id}/dismiss`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error || "Failed to dismiss");
      return;
    }
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, status: "dismissed" } : x)));
    setMessage("Dismissed");
  }

  const filtered = filter === "all" ? items : items.filter((x) => x.status === filter);

  return (
    <main className="max-w-7xl mx-auto px-6 py-12 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Feedback & Removal Requests</h1>
          <p className="text-zinc-500 text-sm mt-1">Review user-submitted feedback and wallet removal requests.</p>
        </div>
        <div className="flex gap-2 mt-1">
          {(["open", "all", "resolved", "dismissed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider rounded border transition-all duration-150 ${
                filter === f
                  ? "bg-white text-black border-white"
                  : "bg-bg-card border-border text-zinc-500 hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <p className="text-xs text-zinc-400 bg-zinc-900 border border-border rounded-lg px-3 py-2">{message}</p>
      )}

      <section className="rounded-2xl border border-border bg-bg-card shadow-card overflow-hidden">
        {loading ? (
          <div className="p-5 text-zinc-500 text-sm">Loading feedback...</div>
        ) : filtered.length === 0 ? (
          <div className="p-5 text-zinc-600 text-sm">No feedback with status &quot;{filter}&quot;.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-zinc-500 bg-black/30">
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4">Type</th>
                  <th className="text-left py-3 px-4">Message</th>
                  <th className="text-left py-3 px-4">Wallet</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b border-border/50 last:border-0 hover:bg-black/20 transition-colors">
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded border text-[11px] font-mono uppercase tracking-wider ${TYPE_COLORS[item.type] ?? "text-zinc-400 bg-zinc-400/10 border-zinc-400/20"}`}
                      >
                        {item.type === "removal_request" ? "Removal" : "Feedback"}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <p className="text-zinc-300 text-xs line-clamp-3 whitespace-pre-wrap">{item.message}</p>
                    </td>
                    <td className="py-3 px-4">
                      {item.walletAddress ? (
                        <a
                          href={`/wallet/${item.walletAddress}`}
                          className="text-xs text-zinc-400 hover:text-white font-mono transition-colors"
                        >
                          {item.walletAddress.slice(0, 8)}...{item.walletAddress.slice(-4)}
                        </a>
                      ) : (
                        <span className="text-zinc-700 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded border text-[11px] font-mono uppercase tracking-wider ${STATUS_COLORS[item.status] ?? "text-zinc-400 bg-zinc-400/10 border-zinc-400/20"}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-600 text-xs whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      {item.status === "open" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => resolve(item.id)}
                            className="px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider bg-emerald-900/30 hover:bg-emerald-800/40 text-emerald-400 border border-emerald-800/40 rounded transition-colors"
                          >
                            Resolve
                          </button>
                          <button
                            onClick={() => dismiss(item.id)}
                            className="px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider bg-zinc-900/50 hover:bg-zinc-800/60 text-zinc-500 hover:text-zinc-300 border border-border rounded transition-colors"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
