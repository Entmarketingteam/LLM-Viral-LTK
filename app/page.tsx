"use client";

import { useEffect, useState } from "react";
import { useAuth, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";

export default function Dashboard() {
  const { isLoaded, userId } = useAuth();
  const [winners, setWinners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !userId) {
      setLoading(false);
      return;
    }

    async function fetchWinners() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/winners?date=2025-01-01");
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        setWinners(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching winners:", err);
        setError(err instanceof Error ? err.message : "Failed to load winners");
        setWinners([]);
      } finally {
        setLoading(false);
      }
    }

    fetchWinners();
  }, [isLoaded, userId]);

  return (
    <main className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">LLM Viral LTK</h1>
      <p className="text-muted-foreground">Phase 1 – Viral Post Intelligence</p>

      <SignedOut>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 text-center">
          <p className="text-lg font-semibold text-blue-900 mb-4">
            Please sign in to view viral posts
          </p>
          <SignInButton mode="modal">
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Sign In
            </button>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        {loading && (
          <div className="text-center py-8">Loading...</div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            <p className="font-semibold">Error:</p>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {winners.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No winners found for this date.
              </div>
            ) : (
              winners.map((w, i) => (
                <div
                  key={i}
                  className="rounded-xl border bg-card p-4 shadow-sm"
                >
                  <div className="font-semibold">@{w.creator_handle}</div>
                  <div className="text-sm text-muted-foreground">{w.category}</div>
                  <div className="mt-2 text-lg font-bold">{w.score}</div>
                </div>
              ))
            )}
          </div>
        )}
      </SignedIn>
    </main>
  );
}

