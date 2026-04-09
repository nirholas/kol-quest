import type { Metadata } from "next";
import { Suspense } from "react";
import WalletFilter from "./components/WalletFilter";
import LiveFeed from "./components/LiveFeed";
import AccumulationBoard from "./components/AccumulationBoard";

export const metadata: Metadata = {
  title: "Smart Money Tracker",
  description: "Real-time activity from known smart money wallets — buys, sells, and accumulation signals.",
  openGraph: {
    title: "Smart Money Tracker | KolQuest",
    description: "Real-time activity from known smart money wallets — buys, sells, and accumulation signals.",
  },
};

export default function SmartMoneyPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Smart Money Tracker</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Real-time buys, sells, and accumulation signals from top-performing tracked wallets.
        </p>
      </div>

      <Suspense>
        <WalletFilter />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Feed — 2 cols wide */}
        <div className="lg:col-span-2 space-y-4">
          <Suspense fallback={<FeedSkeleton />}>
            <LiveFeed />
          </Suspense>
        </div>

        {/* Accumulation Board — 1 col wide */}
        <div className="space-y-4">
          <Suspense fallback={<AccumulationSkeleton />}>
            <AccumulationBoard />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-4 space-y-4 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex space-x-4">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function AccumulationSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-4 space-y-4 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
          </div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
        </div>
      ))}
    </div>
  );
}
