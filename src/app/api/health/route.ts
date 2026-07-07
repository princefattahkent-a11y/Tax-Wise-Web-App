import { NextResponse } from "next/server";

/**
 * GET /api/health
 *
 * Railway uses this endpoint as its health check.
 * Returns 200 when the server is ready to serve traffic.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV ?? "unknown",
    },
    { status: 200 }
  );
}
