'use client';

import { useState, useEffect } from 'react';
import { CreativeCard, type CreativeCardItem } from '@/components/creatives/CreativeCard';

interface CreativeWithMetrics extends CreativeCardItem {
  annotations: {
    hook_type: string | null;
    hook_strength_score: number | null;
    virality_score: number | null;
  } | null;
}

interface TopCreativesProps {
  niche?: string;
  platform?: string;
  sourceType?: 'paid' | 'organic' | 'ugc';
  intervalDays?: number;
  limit?: number;
  sortBy?: 'roas' | 'engagement_rate' | 'impressions' | 'virality_score';
}

export function TopCreatives({
  niche = 'beauty',
  platform,
  sourceType,
  intervalDays = 30,
  limit = 20,
  sortBy = 'engagement_rate',
}: TopCreativesProps) {
  const [creatives, setCreatives] = useState<CreativeWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCreatives = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          niche,
          ...(platform && { platform }),
          ...(sourceType && { source_type: sourceType }),
          interval_days: intervalDays.toString(),
          limit: limit.toString(),
          sort_by: sortBy,
        });

        const response = await fetch(`/api/v1/creatives/top?${params}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }

        const data = await response.json();
        setCreatives(data.items || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchCreatives();
  }, [niche, platform, sourceType, intervalDays, limit, sortBy]);

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-sm text-gray-500">Loading top creatives...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-sm text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (creatives.length === 0) {
    return (
      <div className="p-4">
        <div className="text-sm text-gray-500">No creatives found</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Top Creatives</h2>
        <div className="text-sm text-gray-500">
          {creatives.length} results
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {creatives.map((creative) => (
          <CreativeCard key={creative.creative_id} creative={creative} showActions />
        ))}
      </div>
    </div>
  );
}
