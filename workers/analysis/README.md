# Analysis Worker

GPU-based service that processes creatives through the ML pipeline:
1. Frame extraction (ffmpeg)
2. SAM2 segmentation (product/face/text detection)
3. CLIP embeddings
4. Whisper ASR (transcription)
5. LLM annotation (hook, CTA, sentiment, etc.)

## Architecture

```
Pub/Sub Queue
    ↓
Analysis Worker (GPU)
    ↓
1. Download media from GCS
2. Extract frames (1-3 fps)
3. Run SAM2 segmentation
4. Generate CLIP embeddings
5. Run Whisper ASR
6. Call LLM for annotations
    ↓
Write to BigQuery + Pinecone
```

## Setup

### Prerequisites

- GPU instance (GCP, AWS, or local)
- Python 3.10+
- CUDA (for GPU acceleration)
- ffmpeg

### Installation

```bash
cd workers/analysis
pip install -r requirements.txt
```

### Environment Variables

```bash
# GCP
GOOGLE_PROJECT_ID=your-project
GOOGLE_CLIENT_EMAIL=...
GOOGLE_PRIVATE_KEY=...

# BigQuery
BIGQUERY_DATASET=creator_pulse

# GCS
GCS_BUCKET=ltk-trending

# Pinecone
PINECONE_API_KEY=...
PINECONE_INDEX=creative-embeddings

# LLM Provider
OPENAI_API_KEY=...  # or ANTHROPIC_API_KEY=...
```

## Usage

### Run locally

```bash
python src/main.py
```

### Run with Docker

```bash
docker build -t analysis-worker .
docker run --gpus all analysis-worker
```

### Deploy to Cloud Run (GPU)

```bash
gcloud run deploy analysis-worker \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 8Gi \
  --cpu 4 \
  --gpu 1 \
  --gpu-type nvidia-t4
```

## Message Format

Consumes messages from Pub/Sub:

```json
{
  "creative_id": "creative_123",
  "force_recompute": false
}
```

## Output

Writes to:
- **BigQuery**: `creative_vision_features`, `creative_llm_annotations`, `frame_embeddings_meta`
- **Pinecone**: Vector embeddings in `creative-embeddings` namespace
