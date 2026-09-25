import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-token";

function logout(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/prijava", request.url), 303);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

export const GET = logout;
export const POST = logout;
