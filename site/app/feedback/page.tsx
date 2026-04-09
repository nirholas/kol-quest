"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function FeedbackForm() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") === "removal_request" ? "removal_request" : "feedback";
  const initialWallet = searchParams.get("wallet") ?? "";

  const [type, setType] = useState<"feedback" | "removal_request">(initialType);
  const [message, setMessage] = useState("");
  const [walletAddress, setWalletAddress] = useState(initialWallet);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const t = searchParams.get("type");
    if (t === "removal_request") setType("removal_request");
    const w = searchParams.get("wallet");
    if (w) setWalletAddress(w);
  }, [searchParams]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        message,
        walletAddress: type === "removal_request" ? walletAddress : null,
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      setErrorMsg(json.error || "Submission failed. Please try again.");
      setStatus("error");
      return;
    }

    setStatus("success");
    setMessage("");
    if (type !== "removal_request") setWalletAddress("");
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-border bg-bg-card p-8 shadow-card space-y-4 text-center">
        <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-white">
          {type === "removal_request" ? "Removal Request Submitted" : "Feedback Received"}
        </h2>
        <p className="text-zinc-400 text-sm">
          {type === "removal_request"
            ? "Your removal request has been submitted. Our team will review it shortly."
            : "Thanks for your feedback. We read every submission."}
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="text-xs text-zinc-500 hover:text-white transition-colors underline underline-offset-2"
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-bg-card p-6 shadow-card space-y-5">
      {/* Type selector */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setType("feedback")}
          className={`flex-1 py-2 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider border transition-all duration-150 ${
            type === "feedback"
              ? "bg-white text-black border-white"
              : "bg-bg-hover border-border text-zinc-500 hover:text-white"
          }`}
        >
          General Feedback
        </button>
        <button
          type="button"
          onClick={() => setType("removal_request")}
          className={`flex-1 py-2 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider border transition-all duration-150 ${
            type === "removal_request"
              ? "bg-white text-black border-white"
              : "bg-bg-hover border-border text-zinc-500 hover:text-white"
          }`}
        >
          Request Removal
        </button>
      </div>

      {/* Wallet address field (removal_request only) */}
      {type === "removal_request" && (
        <div className="space-y-1.5">
          <label className="block text-xs text-zinc-500 font-mono uppercase tracking-wider">
            Wallet Address <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            required
            placeholder="e.g. 5xkZ...9abc"
            className="w-full bg-black/40 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 font-mono"
          />
          <p className="text-[11px] text-zinc-600">
            Enter the wallet address you want removed from KolQuest listings.
          </p>
        </div>
      )}

      {/* Message */}
      <div className="space-y-1.5">
        <label className="block text-xs text-zinc-500 font-mono uppercase tracking-wider">
          {type === "removal_request" ? "Reason for Removal" : "Your Feedback"}{" "}
          <span className="text-red-500">*</span>
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          placeholder={
            type === "removal_request"
              ? "Explain why this wallet should be removed (e.g. it's your wallet, privacy concerns, incorrect data)..."
              : "Share a bug report, suggestion, or anything else you'd like us to know..."
          }
          className="w-full bg-black/40 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
        />
        <p className="text-[11px] text-zinc-600 text-right">{message.length}/2000</p>
      </div>

      {errorMsg && (
        <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg py-2.5 text-xs font-mono font-semibold uppercase tracking-wider transition-all duration-150"
      >
        {status === "loading" ? "Submitting..." : type === "removal_request" ? "Submit Removal Request" : "Submit Feedback"}
      </button>
    </form>
  );
}

export default function FeedbackPage() {
  return (
    <main className="max-w-xl mx-auto px-6 py-14 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Feedback</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Send us general feedback or request removal of a wallet from our listings.
        </p>
      </div>
      <Suspense fallback={<div className="text-zinc-500 text-sm">Loading...</div>}>
        <FeedbackForm />
      </Suspense>
    </main>
  );
}
