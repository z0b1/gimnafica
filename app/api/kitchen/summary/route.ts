import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/auth";
import { getKitchenSummary } from "@/lib/orders";

export async function GET() {
  const auth = await authorizeApi("KUHINJA", "ADMIN");
  if ("status" in auth) {
    return NextResponse.json({ error: "Nemate pristup." }, { status: auth.status });
  }
  return NextResponse.json(await getKitchenSummary(), {
    headers: { "Cache-Control": "no-store" },
  });
}
