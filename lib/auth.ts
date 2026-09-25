import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/enums";
import { db } from "./db";
import { getSessionUserId } from "./session";

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
export type ApprovedUser = CurrentUser & { role: Role; status: "APPROVED" };

// The session cookie only carries the user id; role and approval status are
// always read from the database so admin changes take effect immediately.
export const getCurrentUser = cache(async () => {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, status: true },
  });
});

function isApproved(user: CurrentUser): user is ApprovedUser {
  return user.status === "APPROVED" && user.role !== null;
}

export function homePathFor(user: CurrentUser | null) {
  if (!user) return "/prijava";
  if (!isApproved(user)) return "/na-cekanju";
  switch (user.role) {
    case "PROFESOR":
      return "/profesor";
    case "KUHINJA":
      return "/kuhinja";
    case "ADMIN":
      return "/admin";
  }
}

/** For pages and Server Actions: redirects away unless the user has one of `roles`. */
export async function requireRole(...roles: Role[]): Promise<ApprovedUser> {
  const user = await getCurrentUser();
  // Valid cookie but no such user (e.g. deleted): clear it via /odjava.
  if (!user) redirect("/odjava");
  if (!isApproved(user)) redirect("/na-cekanju");
  if (!roles.includes(user.role)) redirect(homePathFor(user));
  return user;
}

/** For Route Handlers: returns the user, or an HTTP status to respond with. */
export async function authorizeApi(
  ...roles: Role[]
): Promise<{ user: ApprovedUser } | { status: 401 | 403 }> {
  const user = await getCurrentUser();
  if (!user) return { status: 401 };
  if (!isApproved(user) || !roles.includes(user.role)) return { status: 403 };
  return { user };
}
