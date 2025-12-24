import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bq";
import { requireUser } from "@/lib/auth";

export async function GET() {
  requireUser();

  const query = `
    SELECT category, COUNT(*) AS posts
    FROM \`creator_pulse.gold_viral_posts\`
    GROUP BY category
    ORDER BY posts DESC
  `;

  const [rows] = await bigquery.query({ query });

  return NextResponse.json(rows);
}