#!/usr/bin/env tsx
/**
 * Update Ingestion API to publish to Pub/Sub
 * 
 * This script shows how to add Pub/Sub publishing to the ingestion API
 */

import { PubSub } from '@google-cloud/pubsub';

const pubsub = new PubSub();
const TOPIC_NAME = 'creative-analysis-queue';

/**
 * Publish creative to analysis queue
 */
export async function publishCreativeForAnalysis(creativeId: string, forceRecompute: boolean = false) {
  try {
    const topic = pubsub.topic(TOPIC_NAME);
    
    // Check if topic exists, create if not
    const [exists] = await topic.exists();
    if (!exists) {
      console.log(`Creating topic: ${TOPIC_NAME}`);
      await topic.create();
    }
    
    // Publish message
    const messageId = await topic.publishMessage({
      json: {
        creative_id: creativeId,
        force_recompute: forceRecompute,
      },
    });
    
    console.log(`✅ Published message ${messageId} for creative ${creativeId}`);
    return messageId;
  } catch (error) {
    console.error('Error publishing to Pub/Sub:', error);
    throw error;
  }
}

/**
 * Example: Add this to app/api/v1/ingestion/creative/route.ts
 * 
 * After successfully inserting creative to BigQuery:
 * 
 * import { publishCreativeForAnalysis } from '@/scripts/update-ingestion-pubsub';
 * 
 * // ... after BigQuery insert ...
 * 
 * // Publish to analysis queue
 * try {
 *   await publishCreativeForAnalysis(data.creative_id);
 *   analysisQueued = true;
 * } catch (error) {
 *   console.error('Failed to queue for analysis:', error);
 *   // Don't fail the request, just log
 * }
 */
