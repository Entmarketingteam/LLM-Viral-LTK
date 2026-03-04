import { NextRequest, NextResponse } from 'next/server';
import {
  importFromGoogleSheets,
  listSheetTabs,
  extractSheetId,
} from '@/tools/lead-gen/sheets-importer';
import { batchScoreCreators } from '@/tools/lead-gen/signal-scorer';

/**
 * POST /api/v1/lead-gen/import-sheet
 *
 * Import prospects from a Google Sheet.
 * Body: { sheetUrl: string, tab?: string, generate?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sheetUrl, sheetId: rawSheetId, tab, generate } = body as {
      sheetUrl?: string;
      sheetId?: string;
      tab?: string;
      generate?: boolean;
    };

    const input = sheetUrl || rawSheetId;
    if (!input) {
      return NextResponse.json(
        { error: 'Provide either sheetUrl or sheetId' },
        { status: 400 },
      );
    }

    const spreadsheetId = extractSheetId(input);

    // Get tabs
    let tabs: string[] = [];
    try {
      tabs = await listSheetTabs(spreadsheetId);
    } catch (err) {
      return NextResponse.json(
        {
          error: 'Cannot access spreadsheet. Make sure it is shared with your service account email.',
          detail: err instanceof Error ? err.message : 'Auth error',
        },
        { status: 403 },
      );
    }

    // Import data
    const result = await importFromGoogleSheets({
      spreadsheetId,
      sheetName: tab,
      skipEmptyNames: true,
    });

    // Optional: score all imported prospects
    let scoring;
    if (generate && result.prospects.length > 0) {
      const scored = batchScoreCreators(result.prospects);
      scoring = {
        tiers: {
          hot: scored.filter((s) => s.tier === 'hot').length,
          warm: scored.filter((s) => s.tier === 'warm').length,
          cold: scored.filter((s) => s.tier === 'cold').length,
          nurture: scored.filter((s) => s.tier === 'nurture').length,
        },
        creators: scored.map((s) => ({
          name: s.prospect.name,
          category: s.prospect.category,
          username: s.prospect.username,
          percentage: s.percentage,
          tier: s.tier,
          lane: s.recommendedLane,
          outreachPriority: s.outreachPriority,
          nextSteps: s.nextSteps.slice(0, 2),
        })),
      };
    }

    return NextResponse.json({
      success: true,
      spreadsheetTitle: result.spreadsheetTitle,
      tabs,
      columnMapping: result.mappedFields,
      unmappedColumns: result.unmappedColumns,
      totalRows: result.totalRows,
      importedRows: result.importedRows,
      skippedRows: result.skippedRows,
      prospects: result.prospects,
      scoring,
    });
  } catch (error) {
    console.error('Sheet import error:', error);
    return NextResponse.json(
      { error: 'Import failed', detail: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
