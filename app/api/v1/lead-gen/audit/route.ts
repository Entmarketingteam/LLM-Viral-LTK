import { NextRequest, NextResponse } from 'next/server';
import { generateAudit } from '@/tools/lead-gen/audit-generator';
import { ProspectData, GeneratorConfig, DEFAULT_CONFIG } from '@/tools/lead-gen/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prospect, config } = body as {
      prospect: ProspectData;
      config?: Partial<GeneratorConfig>;
    };

    if (!prospect || !prospect.name || !prospect.category) {
      return NextResponse.json(
        { error: 'Missing required fields: prospect.name, prospect.category' },
        { status: 400 },
      );
    }

    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    const result = generateAudit(prospect, mergedConfig);

    return NextResponse.json({
      success: true,
      currentRevenueSources: result.currentRevenueSources,
      gaps: result.gaps,
      opportunities: result.opportunities,
      projectedUplift: result.projectedUplift,
      html: result.html,
    });
  } catch (error) {
    console.error('Audit generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate audit' },
      { status: 500 },
    );
  }
}
