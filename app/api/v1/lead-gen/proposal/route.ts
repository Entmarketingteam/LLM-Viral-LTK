import { NextRequest, NextResponse } from 'next/server';
import { generateProposal } from '@/tools/lead-gen/proposal-generator';
import { ProspectData, CallTranscript, GeneratorConfig, DEFAULT_CONFIG } from '@/tools/lead-gen/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prospect, transcript, config } = body as {
      prospect: ProspectData;
      transcript?: CallTranscript;
      config?: Partial<GeneratorConfig>;
    };

    if (!prospect || !prospect.name || !prospect.category) {
      return NextResponse.json(
        { error: 'Missing required fields: prospect.name, prospect.category' },
        { status: 400 },
      );
    }

    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    const result = generateProposal(prospect, transcript, mergedConfig);

    return NextResponse.json({
      success: true,
      growthLane: result.growthLane,
      executiveSummary: result.executiveSummary,
      goals: result.goals,
      pricingTiers: result.pricingTiers,
      deliverables: result.deliverables,
      timeline: result.timeline,
      brandTargets: result.brandTargets,
      html: result.html,
    });
  } catch (error) {
    console.error('Proposal generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate proposal' },
      { status: 500 },
    );
  }
}
