"use client";

import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SignedOut>
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 p-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">Creative Pulse</h1>
            <p className="text-gray-600">Viral LTK & creative intelligence</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            <p className="mb-4 text-gray-700">Sign in to view the dashboard</p>
            <SignInButton mode="modal">
              <button className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
                Sign in
              </button>
            </SignInButton>
          </div>
        </div>
      </SignedOut>
      <SignedIn>
        <DashboardLayout>{children}</DashboardLayout>
      </SignedIn>
    </>
  );
}
