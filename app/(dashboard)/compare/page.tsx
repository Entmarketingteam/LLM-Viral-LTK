"use client";

import { Card } from "@/components/ui/card";

export default function ComparePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Compare Creatives</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Side-by-side comparison of metrics, visuals, and LLM annotations
        </p>
      </div>
      <Card className="p-12 text-center text-gray-500">
        Creative picker and comparison view coming next.
      </Card>
    </div>
  );
}
