"use client";

import { useEffect, useState } from "react";

export default function Dashboard() {
  const [winners, setWinners] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/winners?date=2025-01-01")
      .then(res => res.json())
      .then(setWinners);
  }, []);

  return (
    <main className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">LLM Viral LTK</h1>
      <p className="text-muted-foreground">
        Phase 1 – Viral Post Intelligence
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {winners.map((w, i) => (
          <div
            key={i}
            className="rounded-xl border bg-card p-4 shadow-sm"
          >
            <div className="font-semibold">@{w.creator_handle}</div>
            <div className="text-sm text-muted-foreground">{w.category}</div>
            <div className="mt-2 text-lg font-bold">{w.score}</div>
          </div>
        ))}
      </div>
    </main>
  );
}