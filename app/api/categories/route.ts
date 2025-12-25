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
      SELECT category, COUNT(*) AS posts
      FROM \`${projectId}.creator_pulse.gold_viral_posts\`
      GROUP BY category
      ORDER BY posts DESC
    `;

    const [rows] = await bigquery.query({ query });

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}