import { NextRequest, NextResponse } from 'next/server';
import { generatePitchDeck } from '@/tools/lead-gen/pitch-deck-generator';
import { ProspectData, GeneratorConfig, DEFAULT_CONFIG } from '@/tools/lead-gen/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prospect, targetBrand, config } = body as {
      prospect: ProspectData;
      targetBrand?: string;
      config?: Partial<GeneratorConfig>;
    };

    if (!prospect || !prospect.name || !prospect.category) {
      return NextResponse.json(
        { error: 'Missing required fields: prospect.name, prospect.category' },
        { status: 400 },
      );
    }

    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    const result = generatePitchDeck(prospect, targetBrand, mergedConfig);

    return NextResponse.json({
      success: true,
      creatorName: result.creatorName,
      brandTargets: result.brandTargets,
      pitchAngles: result.pitchAngles,
      contentConcepts: result.contentConcepts,
      html: result.html,
    });
  } catch (error) {
    console.error('Pitch deck generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate pitch deck' },
      { status: 500 },
    );
  }
}
