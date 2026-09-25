import { redirect } from "next/navigation";
import { getCurrentUser, homePathFor } from "@/lib/auth";
import { getSessionUserId } from "@/lib/session";

export default async function Home() {
  const user = await getCurrentUser();
  // A valid cookie for a user that no longer exists: clear it.
  if (!user && (await getSessionUserId())) redirect("/odjava");
  redirect(homePathFor(user));
}
