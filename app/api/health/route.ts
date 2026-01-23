import { NextResponse } from "next/server";

/**
 * GET /api/health
 * Health check endpoint for monitoring/deployment verification
 */
export async function GET() {
  const hasClerk = !!(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("...")
  );

  const hasGcp =
    !!process.env.GOOGLE_PROJECT_ID &&
    !!process.env.GOOGLE_CLIENT_EMAIL &&
    !!process.env.GOOGLE_PRIVATE_KEY &&
    !process.env.GOOGLE_PROJECT_ID.includes("your-project");

  const hasPinecone = !!(
    process.env.PINECONE_API_KEY && !process.env.PINECONE_API_KEY.includes("your-")
  );

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      clerk: hasClerk ? "configured" : "not_configured",
      bigquery: hasGcp ? "configured" : "not_configured",
      pinecone: hasPinecone ? "configured" : "not_configured",
    },
    mode: hasGcp ? "production" : "demo",
  });
}
