import { NextRequest, NextResponse } from 'next/server';
import { runAutoReplyPipeline, AutoReplyInput } from '@/tools/lead-gen/auto-reply-pipeline';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prospect, replyMessage, replyChannel, skipScreenshots, skipInstagram, config } = body as AutoReplyInput;

    if (!prospect || !prospect.name || !prospect.category) {
      return NextResponse.json(
        { error: 'Missing required fields: prospect.name, prospect.category' },
        { status: 400 },
      );
    }

    const result = await runAutoReplyPipeline({
      prospect,
      replyMessage,
      replyChannel,
      skipScreenshots: skipScreenshots ?? true, // Default skip in API (slow)
      skipInstagram: skipInstagram ?? false,
      config,
    });

    return NextResponse.json({
      success: true,
      scoring: {
        percentage: result.research.scoring.percentage,
        tier: result.research.scoring.tier,
        outreachPriority: result.research.scoring.outreachPriority,
        lane: result.research.strategy.growthLane,
      },
      replyMessage: result.replyMessage,
      actionableAdvice: result.research.actionableAdvice,
      pitchDeckHTML: result.pitchDeckHTML,
      proposalHTML: result.proposalHTML,
      auditHTML: result.auditHTML,
      timing: result.timing,
    });
  } catch (error) {
    console.error('Auto-reply pipeline error:', error);
    return NextResponse.json(
      { error: 'Pipeline failed', detail: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
