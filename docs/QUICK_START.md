# Quick Start Guide

## 🎯 What's Built (Without GCP)

### ✅ Checkpoint 1: V2 API Foundation
- All API routes (Ingestion, Data, Vector)
- BigQuery schema SQL
- Pinecone client
- TypeScript types with Zod validation

### ✅ Checkpoint 2: Testing & Development Tools
- Mock data generator
- API test script
- Frontend React components
- Analysis worker skeleton

---

## 🚀 Quick Commands

### Generate Mock Data
```bash
npm run mock:generate
# Creates data/mock/*.json files
```

### Test APIs (requires dev server)
```bash
npm run dev          # Start server
npm run test:api     # Test all endpoints
```

### Setup BigQuery Schema (when GCP is ready)
```bash
npm run db:setup-v2
npm run db:setup-v2:test  # With test data
npm run db:verify
```

---

## 📦 Checkpoint System

### View Checkpoints
```bash
git log --oneline --grep="CHECKPOINT"
git tag -l
```

### Revert to Checkpoint
```bash
# See available checkpoints
git tag

# Revert to checkpoint 1
git reset --hard checkpoint-1

# Revert to checkpoint 2
git reset --hard checkpoint-2
```

### Current Checkpoints
- **checkpoint-1**: V2 API Foundation (d33df04)
- **checkpoint-2**: Testing & Worker Skeleton (e02da5c)

---

## 🔧 Next Steps (When GCP is Ready)

1. **Set environment variables** (see `env.example`)
2. **Run BigQuery schema**: `npm run db:setup-v2`
3. **Set up Pinecone index** at [pinecone.io](https://app.pinecone.io)
4. **Test with real data**: Use ingestion APIs
5. **Deploy analysis worker**: See `workers/analysis/README.md`

---

## 📚 Documentation

- **API Routes**: See `app/api/v1/` directory
- **Types**: See `types/api.ts`
- **Worker**: See `workers/analysis/README.md`
- **Checkpoints**: See `CHECKPOINTS.md`
