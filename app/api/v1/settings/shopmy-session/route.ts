import { NextResponse } from "next/server";
import { requireUser, getAuthErrorResponse } from "@/lib/auth";
import { getShopMySession, hasShopMyCredentials } from "@/lib/shopmy-auth";

/**
 * GET /api/v1/settings/shopmy-session
 * Check if ShopMy credentials are configured and session can be obtained.
 * Does not expose credentials or tokens.
 */
export async function GET() {
  try {
    requireUser();
  } catch {
    return getAuthErrorResponse();
  }

  if (!hasShopMyCredentials()) {
    return NextResponse.json({
      ok: false,
      message: "SHOPMY_EMAIL and SHOPMY_PASSWORD are not set",
    });
  }

  const session = await getShopMySession();
  if (!session) {
    return NextResponse.json({
      ok: false,
      message: "Login failed (check email and password)",
    });
  }

  return NextResponse.json({ ok: true, message: "Session OK" });
}
