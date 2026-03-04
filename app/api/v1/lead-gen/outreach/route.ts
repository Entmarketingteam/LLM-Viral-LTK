import { NextRequest, NextResponse } from 'next/server';
import { generateOutreach, renderOutreachHTML } from '@/tools/lead-gen/outreach-generator';
import { ProspectData } from '@/tools/lead-gen/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prospect } = body as { prospect: ProspectData };

    if (!prospect || !prospect.name || !prospect.category) {
      return NextResponse.json(
        { error: 'Missing required fields: prospect.name, prospect.category' },
        { status: 400 },
      );
    }

    const result = generateOutreach(prospect);
    const html = renderOutreachHTML(result);

    return NextResponse.json({
      success: true,
      messages: result.messages,
      hookMenu: result.hookMenu,
      subjectLines: result.subjectLines,
      html,
    });
  } catch (error) {
    console.error('Outreach generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate outreach' },
      { status: 500 },
    );
  }
}
