/**
 * Test ShopMy session auth (apiv3.shopmy.us).
 *
 * Usage:
 *   npx tsx scripts/test-shopmy-auth.ts
 *   npm run shopmy:test
 *
 * Requires SHOPMY_EMAIL and SHOPMY_PASSWORD in .env.
 * @see LTK_AUTH_PLAN.md
 */

import "dotenv/config";
import { getShopMySession, getShopMyHeaders, hasShopMyCredentials } from "../lib/shopmy-auth";

const SHOPMY_BASE = "https://apiv3.shopmy.us";

async function main() {
  console.log("ShopMy auth check\n");

  if (!hasShopMyCredentials()) {
    console.log("Missing SHOPMY_EMAIL or SHOPMY_PASSWORD in .env.");
    console.log("Add them (see env.example) and run again.");
    process.exit(1);
  }

  console.log("Logging in to apiv3.shopmy.us...");
  const session = await getShopMySession();

  if (!session) {
    console.log("Login failed. Check email/password and try again.");
    process.exit(1);
  }

  console.log("Session obtained (cookie + CSRF).");

  const email = process.env.SHOPMY_EMAIL?.trim();
  if (email) {
    const headers = getShopMyHeaders(session);
    const res = await fetch(`${SHOPMY_BASE}/api/Users/find_by_email`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      const data = (await res.json()) as unknown;
      console.log("find_by_email response:", JSON.stringify(data, null, 2));
    } else {
      console.log("find_by_email status:", res.status, await res.text());
    }
  }

  console.log("\nShopMy auth is working.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
