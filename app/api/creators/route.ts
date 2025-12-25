import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bq";
import { requireUser, getAuthErrorResponse } from "@/lib/auth";

export async function GET() {
  try {
    requireUser();
  } catch {
    return getAuthErrorResponse();
  }

  try {
    const projectId = process.env.GOOGLE_PROJECT_ID || "bolt-ltk-app";
    const query = `
      SELECT *
      FROM \`${projectId}.creator_pulse.gold_creators\`
      ORDER BY avg_score DESC
      LIMIT 100
    `;

    const [rows] = await bigquery.query({ query });

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching creators:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}