import type { Metadata } from "next";
import { getXTrackerAccounts, getXProfiles } from "@/lib/data";
import XTrackerClient from "./XTrackerClient";

export const metadata: Metadata = {
  title: "X Tracker",
  description:
    "Track crypto X/Twitter accounts. Browse 10,000+ influencers, KOLs, and smart money accounts tracked by GMGN.",
};

export default async function XTrackerPage() {
  const [accounts, xProfiles] = await Promise.all([
    getXTrackerAccounts(),
    getXProfiles(),
  ]);

  // Enrich accounts with X profile data where available
  const enriched = accounts.map((acc) => {
    const profile = xProfiles[acc.handle.toLowerCase()];
    if (profile && !profile.error) {
      return {
        ...acc,
        name: acc.name || profile.name,
        avatar: acc.avatar || profile.avatar,
        followers: acc.followers || profile.followers || 0,
        bio: acc.bio || profile.bio,
        verified: acc.verified || profile.verified,
      };
    }
    return acc;
  });

  return <XTrackerClient accounts={enriched} />;
}
