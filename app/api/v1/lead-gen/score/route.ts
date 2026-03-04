import { NextRequest, NextResponse } from 'next/server';
import { scoreCreator, batchScoreCreators, renderScoreCardHTML, renderBatchReportHTML } from '@/tools/lead-gen/signal-scorer';
import { ProspectData } from '@/tools/lead-gen/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prospect, prospects, manualSignals } = body as {
      prospect?: ProspectData;
      prospects?: ProspectData[];
      manualSignals?: Record<string, { score: number; notes: string }>;
    };

    // Single prospect scoring
    if (prospect) {
      if (!prospect.name || !prospect.category) {
        return NextResponse.json(
          { error: 'Missing required fields: prospect.name, prospect.category' },
          { status: 400 },
        );
      }

      const scored = scoreCreator(prospect, manualSignals);
      const html = renderScoreCardHTML(scored);

      return NextResponse.json({
        success: true,
        mode: 'single',
        score: {
          totalScore: scored.totalScore,
          maxScore: scored.maxScore,
          percentage: scored.percentage,
          tier: scored.tier,
          recommendedLane: scored.recommendedLane,
          shouldBeBrandClient: scored.shouldBeBrandClient,
          outreachPriority: scored.outreachPriority,
          categoryBreakdown: scored.categoryBreakdown,
          nextSteps: scored.nextSteps,
        },
        signalBreakdown: scored.signalBreakdown,
        html,
      });
    }

    // Batch scoring
    if (prospects && prospects.length > 0) {
      const scored = batchScoreCreators(prospects);
      const html = renderBatchReportHTML(scored);

      return NextResponse.json({
        success: true,
        mode: 'batch',
        totalCreators: scored.length,
        tiers: {
          hot: scored.filter((s) => s.tier === 'hot').length,
          warm: scored.filter((s) => s.tier === 'warm').length,
          cold: scored.filter((s) => s.tier === 'cold').length,
          nurture: scored.filter((s) => s.tier === 'nurture').length,
        },
        creators: scored.map((s) => ({
          name: s.prospect.name,
          category: s.prospect.category,
          percentage: s.percentage,
          tier: s.tier,
          recommendedLane: s.recommendedLane,
          shouldBeBrandClient: s.shouldBeBrandClient,
          outreachPriority: s.outreachPriority,
          nextSteps: s.nextSteps,
        })),
        html,
      });
    }

    return NextResponse.json(
      { error: 'Provide either "prospect" (single) or "prospects" (batch)' },
      { status: 400 },
    );
  } catch (error) {
    console.error('Scoring error:', error);
    return NextResponse.json(
      { error: 'Failed to score creator(s)' },
      { status: 500 },
    );
  }
}
