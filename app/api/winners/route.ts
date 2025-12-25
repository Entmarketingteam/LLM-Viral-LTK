import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bq";
import { requireUser, getAuthErrorResponse } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    requireUser();
  } catch {
    return getAuthErrorResponse();
  }

  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { error: "Date parameter is required" },
        { status: 400 }
      );
    }

    const projectId = process.env.GOOGLE_PROJECT_ID || "bolt-ltk-app";
    const query = `
      SELECT *
      FROM \`${projectId}.creator_pulse.gold_viral_posts\`
      WHERE post_date = @date
      ORDER BY score DESC
      LIMIT 50
    `;

    const [rows] = await bigquery.query({
      query,
      params: { date },
    });

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching winners:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}