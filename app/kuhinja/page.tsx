import type { Metadata } from "next";
import { PRIVATE_PAGE } from "@/lib/site";
import { AppHeader } from "@/components/AppHeader";
import { requireRole } from "@/lib/auth";
import { getKitchenSummary } from "@/lib/orders";
import { KitchenLive } from "./KitchenLive";

export const metadata: Metadata = { title: "Kuhinja", robots: PRIVATE_PAGE };

export default async function KitchenPage() {
  const user = await requireRole("KUHINJA", "ADMIN");
  const summary = await getKitchenSummary();
  return (
    <>
      <AppHeader user={user} />
      <KitchenLive initial={summary} />
    </>
  );
}
