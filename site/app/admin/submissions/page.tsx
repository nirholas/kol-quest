"use client";

import { useEffect, useState } from "react";

type PendingSubmission = {
  id: string;
  walletAddress: string;
  chain: string;
  label: string;
  notes: string | null;
  twitter: string | null;
  telegram: string | null;
  createdAt: string;
};

export default function AdminSubmissionsPage() {
  const [items, setItems] = useState<PendingSubmission[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/submissions/pending", { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error || "Failed to load pending submissions");
      setLoading(false);
      return;
    }
    setItems(json.submissions || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function approve(id: string) {
    const res = await fetch(`/api/submissions/${id}/approve`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error || "Approve failed");
      return;
    }
    setItems((prev) => prev.filter((x) => x.id !== id));
    setMessage("Submission approved");
  }

  async function reject(id: string) {
    const res = await fetch(`/api/submissions/${id}/reject`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error || "Reject failed");
      return;
    }
    setItems((prev) => prev.filter((x) => x.id !== id));
    setMessage("Submission rejected");
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-12 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Admin Moderation</h1>
        <p className="text-zinc-500 text-sm mt-1">Approve pending wallet submissions.</p>
      </div>

      <section className="rounded-2xl border border-border bg-bg-card shadow-card overflow-hidden">
        {loading ? (
          <div className="p-5 text-zinc-500 text-sm">Loading pending submissions...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-zinc-500 bg-black/30">
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4">Label</th>
                  <th className="text-left py-3 px-4">Wallet</th>
                  <th className="text-left py-3 px-4">Chain</th>
                  <th className="text-left py-3 px-4">Notes</th>
                  <th className="text-left py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-bg-hover/40">
                    <td className="py-3 px-4 text-zinc-200">{s.label}</td>
                    <td className="py-3 px-4 text-zinc-400 font-mono">{s.walletAddress}</td>
                    <td className="py-3 px-4 text-zinc-400 uppercase">{s.chain}</td>
                    <td className="py-3 px-4 text-zinc-500">{s.notes || "-"}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => approve(s.id)}
                          className="px-3 py-1.5 rounded-lg bg-white text-black text-xs font-medium"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => reject(s.id)}
                          className="px-3 py-1.5 rounded-lg border border-red-500/50 text-red-400 text-xs font-medium hover:bg-red-500/10"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 && <div className="p-5 text-zinc-500 text-sm">No pending submissions.</div>}
          </div>
        )}
      </section>

      {message && <p className="text-sm text-zinc-400">{message}</p>}
    </main>
  );
}
