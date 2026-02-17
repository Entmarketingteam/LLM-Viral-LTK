/**
 * ShopMy API authentication (apiv3.shopmy.us)
 *
 * Session + CSRF pattern per Auth Readiness Assessment.
 * Use for programmatic access to ShopMy data endpoints (Payments, Payouts, Pins, etc.).
 *
 * @see LTK_AUTH_PLAN.md
 * @see docs/AUTH_READINESS_ASSESSMENT.md
 */

const SHOPMY_BASE = "https://apiv3.shopmy.us";
const SESSION_URL = `${SHOPMY_BASE}/api/Auth/session`;
const CSRF_COOKIE_NAME = "shopmy_csrf_token";

export interface ShopMySession {
  cookieHeader: string;
  csrfToken: string;
}

/**
 * Parse Set-Cookie headers into a Cookie header string and extract CSRF token.
 */
function parseSetCookies(setCookieHeaders: string[]): { cookieHeader: string; csrfToken: string | null } {
  const parts: string[] = [];
  let csrfToken: string | null = null;

  for (const header of setCookieHeaders) {
    const [nameValue] = header.split(";");
    const eq = nameValue.indexOf("=");
    if (eq === -1) continue;
    const name = nameValue.slice(0, eq).trim();
    const value = nameValue.slice(eq + 1).trim();
    parts.push(`${name}=${value}`);
    if (name === CSRF_COOKIE_NAME) {
      csrfToken = value;
    }
  }

  return {
    cookieHeader: parts.join("; "),
    csrfToken,
  };
}

/**
 * Obtain a ShopMy session (cookies + CSRF token) via username/password.
 * Uses SHOPMY_EMAIL and SHOPMY_PASSWORD from env.
 *
 * @returns Session with cookieHeader and csrfToken, or null if credentials missing or login fails
 */
export async function getShopMySession(): Promise<ShopMySession | null> {
  const email = process.env.SHOPMY_EMAIL;
  const password = process.env.SHOPMY_PASSWORD;

  if (!email?.trim() || !password?.trim()) {
    return null;
  }

  const setCookieHeaders: string[] = [];

  let response: Response;
  try {
    response = await fetch(SESSION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: email.trim(),
        password: password.trim(),
      }),
      redirect: "manual",
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  // Node 18+ / undici: getSetCookie() returns array of Set-Cookie header values
  const getSetCookie = (response as { getSetCookie?: () => string[] }).getSetCookie;
  if (typeof getSetCookie === "function") {
    setCookieHeaders.push(...getSetCookie());
  } else {
    const raw = response.headers.get("set-cookie");
    if (raw) setCookieHeaders.push(raw);
  }

  if (setCookieHeaders.length === 0) {
    return null;
  }

  const { cookieHeader, csrfToken } = parseSetCookies(setCookieHeaders);
  if (!cookieHeader || !csrfToken) {
    return null;
  }

  return { cookieHeader, csrfToken };
}

/**
 * Headers to use for authenticated ShopMy API requests.
 * Call getShopMySession() first; if null, credentials are missing or invalid.
 */
export function getShopMyHeaders(session: ShopMySession): Record<string, string> {
  return {
    Cookie: session.cookieHeader,
    "x-csrf-token": session.csrfToken,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/**
 * Check if ShopMy credentials are configured (does not validate them).
 */
export function hasShopMyCredentials(): boolean {
  return !!(process.env.SHOPMY_EMAIL?.trim() && process.env.SHOPMY_PASSWORD?.trim());
}
