import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bq";

// Test endpoint without authentication requirement
export async function GET() {
  try {
    const projectId = process.env.GOOGLE_PROJECT_ID || "bolt-ltk-app";
    
    // Simple test query to verify BigQuery connection
    const query = `
      SELECT 
        'Connection successful!' AS status,
        '${projectId}' AS project_id,
        COUNT(*) AS table_count
      FROM \`${projectId}.creator_pulse.INFORMATION_SCHEMA.TABLES\`
      WHERE table_schema = 'creator_pulse'
    `;

    const [rows] = await bigquery.query({ query });

    return NextResponse.json({
      success: true,
      message: "BigQuery connection test successful",
      data: rows,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Test endpoint error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
        details: error.errors || [],
      },
      { status: 500 }
    );
  }
}

