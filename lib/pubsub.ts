import { PubSub } from '@google-cloud/pubsub';

const pubsub = new PubSub({
  projectId: process.env.GOOGLE_PROJECT_ID,
});

export const ANALYSIS_TOPIC_NAME = 'creative-analysis-queue';

/**
 * Publish creative to analysis queue
 */
export async function publishCreativeForAnalysis(
  creativeId: string,
  forceRecompute: boolean = false
): Promise<string | null> {
  try {
    const topic = pubsub.topic(ANALYSIS_TOPIC_NAME);
    
    // Check if topic exists, create if not (in production, create via Terraform/scripts)
    const [exists] = await topic.exists();
    if (!exists) {
      console.log(`⚠️  Topic ${ANALYSIS_TOPIC_NAME} does not exist. Create it first with setup-pubsub.sh`);
      return null;
    }
    
    // Publish message
    const messageId = await topic.publishMessage({
      json: {
        creative_id: creativeId,
        force_recompute: forceRecompute,
      },
    });
    
    console.log(`✅ Published to Pub/Sub: ${messageId} for creative ${creativeId}`);
    return messageId;
  } catch (error) {
    console.error('Error publishing to Pub/Sub:', error);
    // Don't throw - ingestion should succeed even if queueing fails
    return null;
  }
}
