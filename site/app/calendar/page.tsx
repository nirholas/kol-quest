import { getData } from "@/lib/data";
import CalendarGrid from "./CalendarGrid";

export const metadata = {
  title: "PnL Calendar | KolQuest",
  description: "PnL calendar view for all tracked Solana KOL wallets",
};

export default async function CalendarPage() {
  const data = await getData();
  return <CalendarGrid data={data} />;
}
