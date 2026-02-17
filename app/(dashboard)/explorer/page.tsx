"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { TopCreatives } from "@/components/creatives/TopCreatives";
import { FilterPanel, type ExplorerFilters } from "@/components/filters/FilterPanel";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 24;

const DEFAULT_NICHE = "beauty";
const DEFAULT_INTERVAL = 30;
const DEFAULT_SORT: "engagement_rate" | "impressions" | "roas" | "virality_score" = "engagement_rate";

function parseLimit(s: string | null): number {
  const n = parseInt(s ?? "", 10);
  return Number.isFinite(n) && n >= PAGE_SIZE ? n : PAGE_SIZE;
}

function parseInterval(s: string | null): number {
  const n = parseInt(s ?? "", 10);
  return n === 7 || n === 30 || n === 90 ? n : DEFAULT_INTERVAL;
}

export default function ExplorerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFiltersState] = useState<ExplorerFilters>({
    niche: DEFAULT_NICHE,
    intervalDays: DEFAULT_INTERVAL,
    platform: "",
    sourceType: "",
    sortBy: DEFAULT_SORT,
  });
  const [limit, setLimitState] = useState(PAGE_SIZE);

  useEffect(() => {
    const nicheParam = searchParams.get("niche") ?? DEFAULT_NICHE;
    const intervalParam = searchParams.get("interval_days");
    const platformParam = searchParams.get("platform") ?? "";
    const sourceParam = searchParams.get("source_type") ?? "";
    const sortParam = (searchParams.get("sort_by") ?? DEFAULT_SORT) as ExplorerFilters["sortBy"];
    const limitParam = searchParams.get("limit");

    setFiltersState({
      niche: nicheParam,
      intervalDays: parseInterval(intervalParam),
      platform: platformParam,
      sourceType: sourceParam,
      sortBy: sortParam,
    });
    setLimitState(parseLimit(limitParam));
  }, [searchParams]);

  const updateUrl = useCallback(
    (updates: Partial<ExplorerFilters> & { limit?: number }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (updates.niche != null) params.set("niche", updates.niche);
      if (updates.intervalDays != null) params.set("interval_days", String(updates.intervalDays));
      if (updates.platform != null) params.set("platform", updates.platform);
      if (updates.sourceType != null) params.set("source_type", updates.sourceType);
      if (updates.sortBy != null) params.set("sort_by", updates.sortBy);
      if (updates.limit != null) params.set("limit", String(updates.limit));
      router.replace(`/explorer?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const handleFilterChange = useCallback(
    (updates: Partial<ExplorerFilters>) => {
      setFiltersState((prev) => ({ ...prev, ...updates }));
      if (Object.keys(updates).some((k) => k !== "sortBy")) {
        setLimitState(PAGE_SIZE);
        updateUrl({ ...updates, limit: PAGE_SIZE });
      } else {
        updateUrl(updates);
      }
    },
    [updateUrl]
  );

  const setLimit = (v: number) => {
    setLimitState(v);
    updateUrl({ limit: v });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Creative Explorer</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Browse and filter top creatives
          </p>
        </div>
        <FilterPanel
          filters={filters}
          onChange={handleFilterChange}
          showIntervalAndSort
          showClear
        />
      </div>
      <TopCreatives
        niche={filters.niche}
        platform={filters.platform || undefined}
        sourceType={(filters.sourceType || undefined) as "paid" | "organic" | "ugc" | undefined}
        intervalDays={filters.intervalDays}
        limit={limit}
        sortBy={filters.sortBy as "engagement_rate" | "impressions" | "roas" | "virality_score"}
      />
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={() => setLimit(limit + PAGE_SIZE)}
        >
          Load more
        </Button>
      </div>
    </div>
  );
}
