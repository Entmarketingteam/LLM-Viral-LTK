"use client";

import { useState } from "react";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RotateCcw, SlidersHorizontal } from "lucide-react";

export const NICHES = [
  { value: "beauty", label: "Beauty" },
  { value: "fashion", label: "Fashion" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "fitness", label: "Fitness" },
  { value: "home", label: "Home" },
  { value: "food", label: "Food" },
  { value: "travel", label: "Travel" },
  { value: "tech", label: "Tech" },
] as const;

export const INTERVALS = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
] as const;

export const SORT_OPTIONS = [
  { value: "engagement_rate", label: "Engagement" },
  { value: "impressions", label: "Impressions" },
  { value: "roas", label: "ROAS" },
  { value: "virality_score", label: "Virality" },
] as const;

export const PLATFORMS = [
  { value: "", label: "All platforms" },
  { value: "ltk", label: "LTK" },
  { value: "meta_ads", label: "Meta Ads" },
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
] as const;

export const SOURCE_TYPES = [
  { value: "", label: "All sources" },
  { value: "paid", label: "Paid" },
  { value: "organic", label: "Organic" },
  { value: "ugc", label: "UGC" },
] as const;

export type ExplorerFilters = {
  niche: string;
  intervalDays: number;
  platform: string;
  sourceType: string;
  sortBy: string;
};

const DEFAULT_FILTERS: ExplorerFilters = {
  niche: "beauty",
  intervalDays: 30,
  platform: "",
  sourceType: "",
  sortBy: "engagement_rate",
};

interface FilterPanelProps {
  /** Current filter values */
  filters: ExplorerFilters;
  /** Called when any filter changes */
  onChange: (updates: Partial<ExplorerFilters>) => void;
  /** Show interval + sort (Explorer). If false, only niche/platform/source (e.g. Search) */
  showIntervalAndSort?: boolean;
  /** Show a "Clear filters" button that resets to defaults */
  showClear?: boolean;
  className?: string;
}

export function FilterPanel({
  filters,
  onChange,
  showIntervalAndSort = true,
  showClear = true,
  className,
}: FilterPanelProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleClear = () => {
    onChange({
      niche: DEFAULT_FILTERS.niche,
      intervalDays: DEFAULT_FILTERS.intervalDays,
      platform: DEFAULT_FILTERS.platform,
      sourceType: DEFAULT_FILTERS.sourceType,
      sortBy: DEFAULT_FILTERS.sortBy,
    });
  };

  const isDefault =
    filters.niche === DEFAULT_FILTERS.niche &&
    filters.intervalDays === DEFAULT_FILTERS.intervalDays &&
    filters.platform === DEFAULT_FILTERS.platform &&
    filters.sourceType === DEFAULT_FILTERS.sourceType &&
    filters.sortBy === DEFAULT_FILTERS.sortBy;

  return (
    <div className={className}>
      <Button
        variant="outline"
        size="sm"
        className="lg:hidden mb-2"
        onClick={() => setMobileOpen((o) => !o)}
        aria-expanded={mobileOpen}
        aria-controls="filter-panel-content"
        id="filter-panel-toggle"
      >
        <SlidersHorizontal className="h-4 w-4 mr-2" aria-hidden />
        {mobileOpen ? "Hide filters" : "Filters"}
      </Button>
      <div
        id="filter-panel-content"
        role="region"
        aria-labelledby="filter-panel-toggle"
        className={`flex flex-wrap items-center gap-2 ${mobileOpen ? "block" : "hidden lg:flex"}`}
      >
        <Select
          className="w-full sm:w-[140px]"
          value={filters.niche}
          onChange={(e) => onChange({ niche: e.target.value })}
          aria-label="Niche"
        >
          {NICHES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        {showIntervalAndSort && (
          <>
            <Select
              className="w-full sm:w-[120px]"
              value={String(filters.intervalDays)}
              onChange={(e) => onChange({ intervalDays: Number(e.target.value) })}
              aria-label="Time interval"
            >
              {INTERVALS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Select
              className="w-full sm:w-[130px]"
              value={filters.sortBy}
              onChange={(e) => onChange({ sortBy: e.target.value })}
              aria-label="Sort by"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </>
        )}
        <Select
          className="w-full sm:w-[140px]"
          value={filters.platform}
          onChange={(e) => onChange({ platform: e.target.value })}
          aria-label="Platform"
        >
          {PLATFORMS.map((o) => (
            <option key={o.value || "all"} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Select
          className="w-full sm:w-[120px]"
          value={filters.sourceType}
          onChange={(e) => onChange({ sourceType: e.target.value })}
          aria-label="Source type"
        >
          {SOURCE_TYPES.map((o) => (
            <option key={o.value || "all"} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        {showClear && !isDefault && (
          <Button variant="ghost" size="sm" onClick={handleClear} className="text-gray-500" aria-label="Clear filters">
            <RotateCcw className="h-4 w-4 mr-1" aria-hidden />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
