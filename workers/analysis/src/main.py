#!/usr/bin/env python3
"""
Analysis Worker - Main Entry Point

Processes creatives through ML pipeline:
1. Frame extraction
2. SAM2 segmentation
3. CLIP embeddings
4. Whisper ASR
5. LLM annotation
"""

import os
import json
import logging
from typing import Dict, Any
from google.cloud import pubsub_v1, bigquery, storage
from google.cloud.exceptions import NotFound

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
PROJECT_ID = os.getenv('GOOGLE_PROJECT_ID')
DATASET_ID = os.getenv('BIGQUERY_DATASET', 'creator_pulse')
GCS_BUCKET = os.getenv('GCS_BUCKET', 'ltk-trending')
SUBSCRIPTION_NAME = os.getenv('PUBSUB_SUBSCRIPTION', 'creative-analysis-queue')

# Initialize clients
bq_client = bigquery.Client(project=PROJECT_ID)
gcs_client = storage.Client(project=PROJECT_ID)
subscriber = pubsub_v1.SubscriberClient()


def fetch_creative_metadata(creative_id: str) -> Dict[str, Any]:
    """Fetch creative metadata from BigQuery"""
    query = f"""
        SELECT *
        FROM `{PROJECT_ID}.{DATASET_ID}.creatives`
        WHERE creative_id = @creative_id
    """
    
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("creative_id", "STRING", creative_id)
        ]
    )
    
    query_job = bq_client.query(query, job_config=job_config)
    results = list(query_job)
    
    if not results:
        raise ValueError(f"Creative not found: {creative_id}")
    
    return dict(results[0])


def download_media_from_gcs(storage_uri: str, local_path: str) -> str:
    """Download media file from GCS to local path"""
    # Parse GCS URI: gs://bucket/path/file.mp4
    parts = storage_uri.replace('gs://', '').split('/', 1)
    bucket_name = parts[0]
    blob_path = parts[1] if len(parts) > 1 else ''
    
    bucket = gcs_client.bucket(bucket_name)
    blob = bucket.blob(blob_path)
    
    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    blob.download_to_filename(local_path)
    
    logger.info(f"Downloaded {storage_uri} to {local_path}")
    return local_path


def extract_frames(video_path: str, output_dir: str, fps: float = 2.0) -> list[str]:
    """
    Extract frames from video using ffmpeg
    Returns list of frame file paths
    """
    import subprocess
    
    os.makedirs(output_dir, exist_ok=True)
    
    # Extract frames at specified FPS
    # Bias toward first 10 seconds
    cmd = [
        'ffmpeg', '-i', video_path,
        '-vf', f'fps={fps}',
        '-t', '10',  # First 10 seconds
        f'{output_dir}/frame_%04d.jpg'
    ]
    
    subprocess.run(cmd, check=True, capture_output=True)
    
    # Get all extracted frames
    frames = sorted([f for f in os.listdir(output_dir) if f.startswith('frame_')])
    frame_paths = [os.path.join(output_dir, f) for f in frames]
    
    logger.info(f"Extracted {len(frame_paths)} frames from {video_path}")
    return frame_paths


def run_sam2_segmentation(frame_paths: list[str]) -> Dict[str, Any]:
    """
    Run SAM2 segmentation on frames
    Detects: products, faces, text regions
    
    TODO: Implement SAM2 integration
    - Load SAM2 model
    - Process each frame
    - Track objects across frames
    - Return masks and metadata
    """
    logger.info(f"Running SAM2 segmentation on {len(frame_paths)} frames")
    
    # Placeholder - implement SAM2
    return {
        'num_shots': len(frame_paths),
        'product_masks': [],
        'face_masks': [],
        'text_regions': [],
    }


def generate_clip_embeddings(frame_paths: list[str]) -> Dict[str, Any]:
    """
    Generate CLIP embeddings for frames
    
    TODO: Implement CLIP integration
    - Load CLIP model (ViT-B/32 or ViT-L/14)
    - Process frames
    - Average embeddings for creative-level embedding
    - Return embeddings and tags
    """
    logger.info(f"Generating CLIP embeddings for {len(frame_paths)} frames")
    
    # Placeholder - implement CLIP
    embedding_dim = 512
    return {
        'creative_embedding': [0.0] * embedding_dim,  # Placeholder
        'frame_embeddings': [],
        'scene_tags': ['indoor', 'lifestyle'],
        'style_tags': ['minimal', 'bright'],
    }


def run_whisper_asr(video_path: str) -> Dict[str, Any]:
    """
    Run Whisper ASR for transcription
    
    TODO: Implement Whisper integration
    - Load Whisper model
    - Transcribe audio
    - Return segments with timestamps
    """
    logger.info(f"Running Whisper ASR on {video_path}")
    
    # Placeholder - implement Whisper
    return {
        'transcript_full': 'Sample transcript text...',
        'transcript_first_5s': 'Sample first 5 seconds...',
        'language': 'en',
        'segments': [],
    }


def run_llm_annotation(
    transcript: str,
    niche: str,
    vision_features: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Call LLM to generate annotations
    
    TODO: Implement LLM integration
    - Build prompt with transcript, niche, vision features
    - Call OpenAI/Anthropic API
    - Parse JSON response
    - Return structured annotations
    """
    logger.info("Running LLM annotation")
    
    # Placeholder - implement LLM
    return {
        'hook_type': 'question',
        'hook_text': 'Want to know my secret?',
        'hook_strength_score': 0.85,
        'cta_type': 'link_bio',
        'cta_clarity_score': 0.9,
        'sentiment_overall': 'positive',
        'pacing_style': 'medium',
        'virality_score': 0.72,
    }


def write_to_bigquery(creative_id: str, vision_features: Dict, annotations: Dict):
    """Write results to BigQuery"""
    # Write vision features
    vision_table = bq_client.dataset(DATASET_ID).table('creative_vision_features')
    vision_row = {
        'creative_id': creative_id,
        **vision_features,
    }
    bq_client.insert_rows_json(vision_table, [vision_row])
    
    # Write annotations
    annotations_table = bq_client.dataset(DATASET_ID).table('creative_llm_annotations')
    annotations_row = {
        'creative_id': creative_id,
        'model_name': 'gpt-4o',
        'prompt_version': 'v1.0',
        'annotation_version': 'v1.0',
        **annotations,
    }
    bq_client.insert_rows_json(annotations_table, [annotations_row])
    
    logger.info(f"Wrote results to BigQuery for {creative_id}")


def write_to_pinecone(creative_id: str, embedding: list[float], metadata: Dict):
    """Write embedding to Pinecone"""
    from pinecone import Pinecone, ServerlessSpec
    
    pc = Pinecone(api_key=os.getenv('PINECONE_API_KEY'))
    index = pc.Index(os.getenv('PINECONE_INDEX', 'creative-embeddings'))
    
    index.upsert(
        vectors=[{
            'id': creative_id,
            'values': embedding,
            'metadata': metadata,
        }],
        namespace='creatives'
    )
    
    logger.info(f"Wrote embedding to Pinecone for {creative_id}")


def process_creative(creative_id: str, force_recompute: bool = False):
    """Main processing pipeline"""
    logger.info(f"Processing creative: {creative_id}")
    
    try:
        # 1. Fetch metadata
        creative = fetch_creative_metadata(creative_id)
        storage_uri = creative['storage_uri']
        media_type = creative['media_type']
        
        # 2. Download media
        local_path = f"/tmp/{creative_id}.{storage_uri.split('.')[-1]}"
        download_media_from_gcs(storage_uri, local_path)
        
        # 3. Extract frames (if video)
        frame_paths = []
        if media_type == 'video':
            frames_dir = f"/tmp/{creative_id}_frames"
            frame_paths = extract_frames(local_path, frames_dir)
        else:
            # For images, use the image itself
            frame_paths = [local_path]
        
        # 4. Run SAM2 segmentation
        sam_results = run_sam2_segmentation(frame_paths)
        
        # 5. Generate CLIP embeddings
        clip_results = generate_clip_embeddings(frame_paths)
        
        # 6. Run Whisper ASR (if video)
        transcript = ''
        if media_type == 'video':
            asr_results = run_whisper_asr(local_path)
            transcript = asr_results['transcript_full']
        
        # 7. Run LLM annotation
        annotations = run_llm_annotation(
            transcript,
            creative['niche'],
            sam_results
        )
        
        # 8. Write to BigQuery
        vision_features = {
            **sam_results,
            'scene_tags': clip_results['scene_tags'],
            'style_tags': clip_results['style_tags'],
            'embedding_model': 'ViT-B/32',
        }
        write_to_bigquery(creative_id, vision_features, annotations)
        
        # 9. Write to Pinecone
        write_to_pinecone(
            creative_id,
            clip_results['creative_embedding'],
            {
                'platform': creative['platform'],
                'niche': creative['niche'],
                'media_type': media_type,
            }
        )
        
        # 10. Update creative status
        update_query = f"""
            UPDATE `{PROJECT_ID}.{DATASET_ID}.creatives`
            SET analysis_status = 'completed',
                analysis_completed_at = CURRENT_TIMESTAMP()
            WHERE creative_id = @creative_id
        """
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("creative_id", "STRING", creative_id)
            ]
        )
        bq_client.query(update_query, job_config=job_config)
        
        logger.info(f"✅ Successfully processed {creative_id}")
        
    except Exception as e:
        logger.error(f"❌ Error processing {creative_id}: {e}", exc_info=True)
        
        # Update status to failed
        try:
            update_query = f"""
                UPDATE `{PROJECT_ID}.{DATASET_ID}.creatives`
                SET analysis_status = 'failed'
                WHERE creative_id = @creative_id
            """
            job_config = bigquery.QueryJobConfig(
                query_parameters=[
                    bigquery.ScalarQueryParameter("creative_id", "STRING", creative_id)
                ]
            )
            bq_client.query(update_query, job_config=job_config)
        except:
            pass


def callback(message):
    """Pub/Sub message callback"""
    try:
        data = json.loads(message.data.decode('utf-8'))
        creative_id = data.get('creative_id')
        force_recompute = data.get('force_recompute', False)
        
        if not creative_id:
            logger.error("Missing creative_id in message")
            message.ack()
            return
        
        process_creative(creative_id, force_recompute)
        message.ack()
        
    except Exception as e:
        logger.error(f"Error processing message: {e}", exc_info=True)
        message.nack()


def main():
    """Main entry point"""
    logger.info("🚀 Starting Analysis Worker...")
    logger.info(f"Project: {PROJECT_ID}")
    logger.info(f"Subscription: {SUBSCRIPTION_NAME}")
    
    subscription_path = subscriber.subscription_path(PROJECT_ID, SUBSCRIPTION_NAME)
    
    # Start listening
    logger.info("Listening for messages...")
    streaming_pull_future = subscriber.subscribe(subscription_path, callback=callback)
    
    try:
        streaming_pull_future.result()
    except KeyboardInterrupt:
        streaming_pull_future.cancel()
        logger.info("Shutting down...")


if __name__ == '__main__':
    main()
