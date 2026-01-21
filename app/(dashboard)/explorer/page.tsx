"use client";

import { TopCreatives } from "@/components/creatives/TopCreatives";
import { Select } from "@/components/ui/select";

export default function ExplorerPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Creative Explorer</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Browse and filter top creatives
          </p>
        </div>
        <div className="flex gap-2">
          <Select className="w-[140px]">
            <option value="beauty">Beauty</option>
            <option value="fashion">Fashion</option>
            <option value="lifestyle">Lifestyle</option>
            <option value="fitness">Fitness</option>
          </Select>
          <Select className="w-[120px]">
            <option value="30">30 days</option>
            <option value="7">7 days</option>
            <option value="90">90 days</option>
          </Select>
        </div>
      </div>
      <TopCreatives niche="beauty" limit={24} />
    </div>
  );
}
