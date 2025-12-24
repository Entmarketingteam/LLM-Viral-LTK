import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bq";
import { requireUser } from "@/lib/auth";

export async function GET(req: Request) {
  requireUser();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  const query = `
    SELECT *
    FROM \`creator_pulse.gold_viral_posts\`
    WHERE post_date = @date
    ORDER BY score DESC
    LIMIT 50
  `;

  const [rows] = await bigquery.query({
    query,
    params: { date },
  });

  return NextResponse.json(rows);
}