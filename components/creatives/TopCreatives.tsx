'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';

interface CreativeWithMetrics {
  creative_id: string;
  platform: string;
  source_type: string;
  niche: string;
  media_type: string;
  thumbnail_uri: string | null;
  creator_username: string | null;
  metrics: {
    impressions: number;
    engagement_rate: number | null;
    roas: number | null;
  };
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
}

export function TopCreatives({
  niche = 'beauty',
  platform,
  sourceType,
  intervalDays = 30,
  limit = 20,
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
  }, [niche, platform, sourceType, intervalDays, limit]);

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
          <Link key={creative.creative_id} href={`/creatives/${creative.creative_id}`}>
          <Card className="p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
            <div className="space-y-3">
              {/* Thumbnail */}
              {creative.thumbnail_uri && (
                <div className="aspect-video bg-gray-100 rounded overflow-hidden">
                  <img
                    src={creative.thumbnail_uri}
                    alt={creative.creative_id}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Info */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{creative.creator_username || 'Unknown'}</span>
                  <span className="text-gray-500">{creative.platform}</span>
                </div>

                {/* Metrics */}
                <div className="flex gap-4 text-xs text-gray-600">
                  <div>
                    <span className="font-medium">{creative.metrics.impressions.toLocaleString()}</span> impressions
                  </div>
                  {creative.metrics.engagement_rate && (
                    <div>
                      <span className="font-medium">{(creative.metrics.engagement_rate * 100).toFixed(1)}%</span> engagement
                    </div>
                  )}
                  {creative.metrics.roas && (
                    <div>
                      <span className="font-medium">{creative.metrics.roas.toFixed(2)}x</span> ROAS
                    </div>
                  )}
                </div>

                {/* Annotations */}
                {creative.annotations && (
                  <div className="pt-2 border-t space-y-1 text-xs">
                    {creative.annotations.hook_type && (
                      <div>
                        <span className="text-gray-500">Hook:</span>{' '}
                        <span className="font-medium capitalize">{creative.annotations.hook_type}</span>
                        {creative.annotations.hook_strength_score && (
                          <span className="text-gray-400 ml-1">
                            ({(creative.annotations.hook_strength_score * 100).toFixed(0)}%)
                          </span>
                        )}
                      </div>
                    )}
                    {creative.annotations.virality_score && (
                      <div>
                        <span className="text-gray-500">Virality:</span>{' '}
                        <span className="font-medium">
                          {(creative.annotations.virality_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Tags */}
                <div className="flex gap-2 flex-wrap">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                    {creative.niche}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                    {creative.source_type}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                    {creative.media_type}
                  </span>
                </div>
              </div>
            </div>
          </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
