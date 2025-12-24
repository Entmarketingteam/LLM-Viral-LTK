import { auth } from "@clerk/nextjs";

export function requireUser() {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");
  return userId;
}