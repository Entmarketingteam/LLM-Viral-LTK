import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bq";
import { requireUser } from "@/lib/auth";

export async function GET() {
  requireUser();

  const query = `
    SELECT *
    FROM \`creator_pulse.gold_creators\`
    ORDER BY avg_score DESC
    LIMIT 100
  `;

  const [rows] = await bigquery.query({ query });

  return NextResponse.json(rows);
}