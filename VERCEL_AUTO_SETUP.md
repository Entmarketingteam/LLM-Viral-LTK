# 🚀 Automatic Vercel Setup

I've created everything you need! Here's what's ready:

## ✅ What I've Done

1. ✅ Created GCP service account: `vercel-sa@bolt-ltk-app.iam.gserviceaccount.com`
2. ✅ Granted all necessary permissions (BigQuery, Pub/Sub)
3. ✅ Generated service account key
4. ✅ Created automated setup script

## 🎯 Quick Setup (2 Options)

### Option 1: Automatic (Recommended)

1. **Get your Vercel token:**
   - Go to: https://vercel.com/account/tokens
   - Click "Create Token"
   - Copy the token

2. **Run the script:**
   ```bash
   export VERCEL_TOKEN=your-token-here
   ./scripts/auto-setup-vercel.sh
   ```

That's it! All GCP variables will be set automatically.

### Option 2: Manual (If you prefer)

1. Go to your Vercel project: https://vercel.com/ethan-atchleys-projects
2. Settings → Environment Variables
3. Add these (I've already generated them):

**GOOGLE_PROJECT_ID**
```
bolt-ltk-app
```

**GOOGLE_CLIENT_EMAIL**
```
vercel-sa@bolt-ltk-app.iam.gserviceaccount.com
```

**GOOGLE_PRIVATE_KEY**
```
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDfBhfGsIejdWmH
bsZjsYw8nPEvluEE6xS5KumRgEghlW+iglGBiZcjvheHLdelGSBQU4mYvxdn/MBl
5Q4INjGVMczHbYlFotO5mBIOAlevcLcG9pYsmMYY28i5TRcfkKvzAKTHG9BtjuFn
lWjvyA0omBLp8/l/Gb83OB1l+pI9Wn+dPJoyA3UbV/ZaRg1/zzHbd+b+PFYLSWK/
JFSWkG9bQxdSnlS+soQthFJtCb3pN7Hl3K5aruv+QIlnSXZuWSeK63rV/cMkxmps
cg1iNlSY8+OJTAKA0+fzFzSVi0VEG5RcutpFs/Bo/NSo2iLD0CrYzmLm+35v3RPp
2YNVQUsdAgMBAAECggEANpBlDMVvyfwV336opwdvSf0TvRLq5qslHNB06JY8D4ti
Dp5Xlpu1EJeXZgk/MzNchoqJpYdLELPz1nod3sBzjQ7sDPatmQ3nQwcDk83a6h9n
iBqYTzzpaneLOlq0B5L7nq5Poi8Z5VQJrbAORmvpXD8okXiRWBlSgQ4Hk0WktcGT
f8C1gInZL6DEJPypXRhO65amIH0pp3VfGAM2xcg/OKTSSJup0jX7E3k735lBeHPb
FhCy/ogb5CZhC+pkMM/2v8o9XZzJvFprWvKcG47xkrmjeJOcjeE2MqQBqzkXoZis
j4MxpmsaXClDc0xku9Ew+IbvfDtbVUUn3y1SLyD0+QKBgQDvex81kmVqjol1pOm/
EcO1IzM2wo5sX8voSSPiecDPRB8Y/j+65EDPV+x6wn4dWxsxY9iFcMFwZ9d5iWqh
F3sa/NT7ypps/Al7/Sj4spRlnPjr7WrNl+PABF6ZDy+vSIJDmO/xC+L6yWW+gKqQ
NCIVewYJwikGhsHUBeIX0mLqwwKBgQDuaFy59U05sLL7G7jfPvts0bmg4zTrao5E
DvOpDUaWp/vvjdkmUyadBYzeQ0pvxHh5Uwwoakb7WAroK5otc+xUaAJL9JYF9ZSK
uIGl0KIz7lufaKzaEjK7t4HWxXGKospss9SZj7OiIfF18cakmXwAU9pr7uhAySJy
sHDePHjUnwKBgG/neI3v+rPwJwtyJEfEZU8fQ68y+pppqT7B7qLFgfNYQa/MHruW
LTK2QyqZ95SAHhTWMzcnmTyNSYLhU5IzBrN1sZB2+/IxU708bwjHadCRqT+VkXLA
pwvy/sFG92FQ4I31ySk6BLZrpb9/IDSCJ+shsZCdyc3i6m/Iz/2RsedBAoGBAN17
LsnDTd8OfPgzpOghRsqte9ovufYKo+guS8b9glpr7O17xgSIsxKlGV1S/lAfIhz0
PhM9yHuwK1HNUApx61fu2FNgAg+/OiQ1jJxS2p2MDqplQE/HIEKsFH9GJlk5Kv0Z
g6S1j5hMGFoOJxC7Viunuv8Sj8nAEbSinfiYDVjZAoGBAIkjQQN17t2k5jMi9k+T
PMxGJGk7pYFZukO3FIhE5p+gqdNafhQ3gAUQmMG0QzeVNKnAdRYbudYq5Tk+5n0E
CcVsS6VV6NeeEQLPch8/FsHF38xfm9DXLGlj5AFpQdqeghJ3YR6rTPezIoLuOy2O
IYpuVEuxBImBrTDfGUH52Pz+
-----END PRIVATE KEY-----
```

**PINECONE_INDEX**
```
creative-embeddings
```

## ⚠️ Still Need These (Manual)

You'll need to add these yourself (they're your API keys):

- `PINECONE_API_KEY` - Your Pinecone API key
- `PINECONE_ENVIRONMENT` - Your Pinecone environment (e.g., `us-east-1`)
- `CLERK_SECRET_KEY` - Your Clerk secret key
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Your Clerk publishable key

## 🎉 After Setup

Once environment variables are set:
1. Vercel will automatically redeploy
2. Your APIs will work with BigQuery and Pub/Sub
3. Test: `https://your-project.vercel.app/api/v1/creatives/top`

---

**Want me to set them automatically?** Just provide your Vercel token and I'll run the script for you!
