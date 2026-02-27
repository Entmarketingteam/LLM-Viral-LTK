# Current status (as of last check)

One-page snapshot of what works **right now** in this repo and what doesn’t.

---

## What works without any extra setup

| Thing | How to see it |
|-------|----------------|
| **App UI** | `npm run dev` → http://localhost:3000. Sign in with Clerk (needs keys in `.env`). |
| **Overview / Explorer** | 3 demo creatives when BigQuery isn’t available. Click through to detail (mock_demo_1, 2, 3). |
| **Analytics charts** | `/analytics` — placeholder charts (engagement trend, by niche). |
| **Dashboard stats** | Overview cards show 0 / — when no BigQuery; numbers when BQ is wired. |
| **Analysis worker** | `https://analysis-worker-428005848575.us-central1.run.app/health` → 200. |

---

## What’s missing or broken in this environment

| Thing | Why |
|-------|-----|
| **Real creatives in the app** | `GOOGLE_PROJECT_ID`, `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY` in `.env` are still placeholders. BigQuery calls fail → app falls back to 3 mock creatives. |
| **Vercel / live URL** | Docs mention project `creatormetrics` and env set in Vercel. No URL stored in this repo; check the Vercel dashboard. |

---

## If you had GCP working before

You probably set it up in:

- **Vercel** (project `creatormetrics`) — env vars there are separate from this repo.
- **Another machine or Codespace** — `.env` here is local and wasn’t copied over.

To use real data **in this environment**, put the real values into `.env`:

```bash
GOOGLE_PROJECT_ID=bolt-ltk-app
GOOGLE_CLIENT_EMAIL=vercel-sa@bolt-ltk-app.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

(Get `GOOGLE_PRIVATE_KEY` from a new JSON key for that service account in GCP, or from Vercel if it’s still visible.)

---

## Commands that work

```bash
npm run dev          # Run app (Clerk + GCP in .env; GCP can be placeholders → mocks)
npm run build        # Build passes
npm run mock:generate   # Writes data/mock/*.json (for test-api, not the live UI)
npm run test:api     # Needs data/mock (run mock:generate first) and a running dev server
```

---

## One thing to do next

- **“I want to see the app working”**  
  Run `npm run dev`, sign in, open **Overview** or **Explorer**. You’ll see 3 demo creatives and can open their detail pages. No GCP needed.

- **“I want real data here”**  
  Add real `GOOGLE_*` values to `.env` (see above) and restart `npm run dev`. Overview/Explorer will use BigQuery when it succeeds.

- **“I want to see what’s on Vercel”**  
  Open the Vercel project (`creatormetrics` or the one linked to this repo), check the deployment URL and env vars. If GCP is set there, the deployed app can use real data even if this `.env` doesn’t.
