"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CreativeCard, type CreativeCardItem } from "@/components/creatives/CreativeCard";
import { FilterPanel, type ExplorerFilters } from "@/components/filters/FilterPanel";
import { Search as SearchIcon, Sparkles } from "lucide-react";

const SEARCH_DEFAULT_FILTERS: ExplorerFilters = {
  niche: "beauty",
  intervalDays: 30,
  platform: "",
  sourceType: "",
  sortBy: "engagement_rate",
};

interface SimilarResult {
  creative_id: string;
  similarity_score: number;
  platform: string;
  niche: string;
  thumbnail_uri: string | null;
  hook_type: string | null;
  performance_bucket: string | null;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<CreativeCardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [filters, setFilters] = useState<ExplorerFilters>(SEARCH_DEFAULT_FILTERS);

  const [similarId, setSimilarId] = useState("");
  const [similarSeed, setSimilarSeed] = useState<string | null>(null);
  const [similarList, setSimilarList] = useState<SimilarResult[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarError, setSimilarError] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setSearched(true);
    const params = new URLSearchParams({ q, limit: "24" });
    if (filters.niche) params.set("niche", filters.niche);
    if (filters.platform) params.set("platform", filters.platform);
    if (filters.sourceType) params.set("source_type", filters.sourceType);
    fetch(`/api/v1/search?${params}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  const handleFindSimilar = (e: React.FormEvent) => {
    e.preventDefault();
    const id = similarId.trim();
    if (!id) return;
    setSimilarLoading(true);
    setSimilarError(null);
    setSimilarSeed(id);
    setSimilarList([]);
    fetch(`/api/v1/creatives/${encodeURIComponent(id)}/similar?top_k=12`)
      .then((r) => {
        if (!r.ok) return r.json().then((d) => Promise.reject(new Error(d.message || ` ${r.status}`)));
        return r.json();
      })
      .then((d) => setSimilarList(d.similar || []))
      .catch((err) => {
        setSimilarError(err instanceof Error ? err.message : "Failed to load similar creatives.");
        setSimilarList([]);
      })
      .finally(() => setSimilarLoading(false));
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Search & Discovery</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Text search by caption or hashtags, or find creatives similar to one you know (vector search).
        </p>
      </div>

      {/* Text search */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Text search</h2>
        <FilterPanel
          filters={filters}
          onChange={(updates) => setFilters((prev) => ({ ...prev, ...updates }))}
          showIntervalAndSort={false}
          showClear
        />
        <form onSubmit={handleSearch} className="flex gap-2 max-w-xl mt-3">
          <Input
            placeholder="Search creatives, captions, hashtags…"
            className="flex-1"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button type="submit" disabled={loading}>
            <SearchIcon className="h-4 w-4 mr-2" />
            {loading ? "Searching…" : "Search"}
          </Button>
        </form>
      </Card>

      {loading && <div className="text-sm text-gray-500">Loading results…</div>}

      {!loading && searched && items.length === 0 && (
        <Card className="p-12 text-center text-gray-500">
          No creatives found. Try a different search term or check back when more data is ingested.
        </Card>
      )}

      {!loading && items.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Results</h2>
            <span className="text-sm text-gray-500">{items.length} creatives</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((creative) => (
              <CreativeCard
                key={creative.creative_id}
                creative={creative}
                showCaption
                showActions
              />
            ))}
          </div>
        </div>
      )}

      {/* Vector similarity: Find similar to creative */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          Find similar (vector search)
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          Enter a creative ID (e.g. from Explorer or a detail page) to find visually/semantically similar creatives.
        </p>
        <form onSubmit={handleFindSimilar} className="flex gap-2 max-w-xl mb-4">
          <Input
            placeholder="Creative ID (e.g. mock_demo_1)"
            className="flex-1"
            value={similarId}
            onChange={(e) => setSimilarId(e.target.value)}
          />
          <Button type="submit" variant="secondary" disabled={similarLoading}>
            {similarLoading ? "Finding…" : "Find similar"}
          </Button>
        </form>
        {similarError && (
          <p className="text-sm text-amber-600 mb-3">{similarError}</p>
        )}
        {similarSeed && !similarLoading && similarList.length === 0 && !similarError && (
          <p className="text-sm text-gray-500">No similar creatives returned. The creative may not have embeddings yet.</p>
        )}
        {similarList.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Similar to <code className="bg-gray-100 px-1 rounded">{similarSeed}</code> ({similarList.length} results)
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {similarList.map((s) => (
                <Link key={s.creative_id} href={`/creatives/${s.creative_id}`}>
                  <Card className="p-3 hover:border-blue-300 transition-all overflow-hidden">
                    {s.thumbnail_uri && (
                      <div className="aspect-video rounded overflow-hidden bg-gray-100 mb-2">
                        <img
                          src={s.thumbnail_uri}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      </div>
                    )}
                    <p className="text-xs font-medium text-gray-900 truncate" title={s.creative_id}>{s.creative_id}</p>
                    <p className="text-xs text-gray-500">{s.niche} · {s.platform}</p>
                    <p className="text-xs text-blue-600 mt-1">{(s.similarity_score * 100).toFixed(0)}% similar</p>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
