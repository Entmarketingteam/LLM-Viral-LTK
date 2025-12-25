import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";

export function requireUser() {
  const { userId } = auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

export function getAuthErrorResponse() {
  return NextResponse.json(
    { error: "Unauthorized" },
    { status: 401 }
  );
}