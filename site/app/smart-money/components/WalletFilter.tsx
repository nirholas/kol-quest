"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterGroup {
  param: string;
  title: string;
  options: FilterOption[];
}

const filterGroups: FilterGroup[] = [
  {
    param: "chain",
    title: "Chain",
    options: [
      { label: "All Chains", value: "" },
      { label: "Solana", value: "sol" },
      { label: "Ethereum", value: "eth" },
      { label: "BSC", value: "bsc" },
      { label: "Base", value: "base" },
    ],
  },
  {
    param: "type",
    title: "Action",
    options: [
      { label: "All Actions", value: "" },
      { label: "Buy", value: "buy" },
      { label: "Sell", value: "sell" },
    ],
  },
  {
    param: "minValue",
    title: "Min. Size",
    options: [
      { label: "All Sizes", value: "" },
      { label: "$1k+", value: "1000" },
      { label: "$10k+", value: "10000" },
      { label: "$100k+", value: "100000" },
    ],
  },
  {
    param: "walletCategory",
    title: "Wallet Type",
    options: [
      { label: "All Smart Money", value: "" },
      { label: "KOLs", value: "kol" },
      { label: "Whales", value: "whale" },
      { label: "Snipers", value: "sniper" },
      { label: "Fresh Wallets", value: "fresh" },
    ],
  },
];

const periodOptions: FilterOption[] = [
    { label: "Last 1 hour", value: "1h" },
    { label: "Last 24 hours", value: "24h" },
    { label: "Last 7 days", value: "7d" },
]

export default function WalletFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="bg-white dark:bg-gray-900/50 rounded-lg shadow p-4 mb-6 backdrop-blur-sm">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {filterGroups.map((group) => (
          <div key={group.param}>
            <label className="text-xs font-semibold text-gray-500">{group.title}</label>
            <Select onValueChange={(val) => setParam(group.param, val)} defaultValue={searchParams.get(group.param) || ""}>
              <SelectTrigger>
                <SelectValue placeholder={`Select ${group.title}`} />
              </SelectTrigger>
              <SelectContent>
                {group.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
        <div>
            <label className="text-xs font-semibold text-gray-500">Time Range</label>
            <Select onValueChange={(val) => setParam("period", val)} defaultValue={searchParams.get("period") || "24h"}>
                <SelectTrigger>
                    <SelectValue placeholder="Select Time Range" />
                </SelectTrigger>
                <SelectContent>
                    {periodOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </div>
    </div>
  );
}
