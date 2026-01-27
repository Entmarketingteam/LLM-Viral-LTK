/**
 * LTK Auth Token Loader
 * 
 * Helper to load extracted auth tokens for use in scripts.
 */

import * as fs from 'fs';
import * as path from 'path';

interface ExtractedAuth {
  cookies: Record<string, string>;
  tokens: {
    idToken?: string;
    accessToken?: string;
    bearerToken?: string;
  };
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  extractedAt: string;
}

const AUTH_FILE = path.join(process.cwd(), '.ltk-auth.json');

/**
 * Load extracted auth data
 */
export function loadLtkAuth(): ExtractedAuth | null {
  if (!fs.existsSync(AUTH_FILE)) {
    return null;
  }

  try {
    const content = fs.readFileSync(AUTH_FILE, 'utf-8');
    return JSON.parse(content) as ExtractedAuth;
  } catch {
    return null;
  }
}

/**
 * Get auth headers for API requests
 */
export function getLtkAuthHeaders(): Record<string, string> {
  const auth = loadLtkAuth();
  const headers: Record<string, string> = {};

  if (!auth) {
    return headers;
  }

  // Prefer Bearer token
  if (auth.tokens.bearerToken) {
    headers['Authorization'] = `Bearer ${auth.tokens.bearerToken}`;
  } else if (auth.tokens.idToken) {
    headers['Authorization'] = `Bearer ${auth.tokens.idToken}`;
  }

  // Add cookies
  const cookieStrings = Object.entries(auth.cookies).map(([name, value]) => `${name}=${value}`);
  if (cookieStrings.length > 0) {
    headers['Cookie'] = cookieStrings.join('; ');
  }

  return headers;
}

/**
 * Get cookies array for Puppeteer
 */
export function getLtkCookies(): Array<{ name: string; value: string; domain: string }> {
  const auth = loadLtkAuth();
  if (!auth) {
    return [];
  }

  return Object.entries(auth.cookies).map(([name, value]) => ({
    name,
    value,
    domain: '.shopltk.com', // Default domain
  }));
}

/**
 * Check if auth is available
 */
export function hasLtkAuth(): boolean {
  return loadLtkAuth() !== null;
}
