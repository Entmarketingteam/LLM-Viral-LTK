'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';

interface CreativeDetailData {
  creative: {
    creative_id: string;
    platform: string;
    source_type: string;
    niche: string;
    media_type: string;
    thumbnail_uri: string | null;
    caption: string | null;
    creator_username: string | null;
    created_at: string;
    analysis_status: string;
  };
  metrics: {
    impressions: number;
    clicks: number;
    engagement_rate: number | null;
    roas: number | null;
  };
  vision_features: {
    num_shots: number | null;
    product_on_screen_ratio: number | null;
    scene_tags: string[];
    style_tags: string[];
  } | null;
  annotations: {
    hook_type: string | null;
    hook_text: string | null;
    hook_strength_score: number | null;
    cta_type: string | null;
    sentiment_overall: string | null;
    pacing_style: string | null;
    virality_score: number | null;
  } | null;
}

interface CreativeDetailProps {
  creativeId: string;
}

export function CreativeDetail({ creativeId }: CreativeDetailProps) {
  const [data, setData] = useState<CreativeDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/v1/creatives/${creativeId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (creativeId) {
      fetchDetail();
    }
  }, [creativeId]);

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-sm text-gray-500">Loading creative details...</div>
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

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Creative Details</h1>
        <p className="text-sm text-gray-500">{data.creative.creative_id}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Media */}
          {data.creative.thumbnail_uri && (
            <Card className="p-4">
              <div className="aspect-video bg-gray-100 rounded overflow-hidden">
                <img
                  src={data.creative.thumbnail_uri}
                  alt={data.creative.creative_id}
                  className="w-full h-full object-cover"
                />
              </div>
            </Card>
          )}

          {/* Caption */}
          {data.creative.caption && (
            <Card className="p-4">
              <h3 className="font-semibold mb-2">Caption</h3>
              <p className="text-sm">{data.creative.caption}</p>
            </Card>
          )}

          {/* Vision Features */}
          {data.vision_features && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Vision Features</h3>
              <div className="space-y-2 text-sm">
                {data.vision_features.num_shots && (
                  <div>
                    <span className="text-gray-500">Shots:</span>{' '}
                    <span className="font-medium">{data.vision_features.num_shots}</span>
                  </div>
                )}
                {data.vision_features.product_on_screen_ratio && (
                  <div>
                    <span className="text-gray-500">Product on screen:</span>{' '}
                    <span className="font-medium">
                      {(data.vision_features.product_on_screen_ratio * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
                {data.vision_features.scene_tags.length > 0 && (
                  <div>
                    <span className="text-gray-500">Scene tags:</span>{' '}
                    <div className="flex gap-2 flex-wrap mt-1">
                      {data.vision_features.scene_tags.map((tag, i) => (
                        <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {data.vision_features.style_tags.length > 0 && (
                  <div>
                    <span className="text-gray-500">Style tags:</span>{' '}
                    <div className="flex gap-2 flex-wrap mt-1">
                      {data.vision_features.style_tags.map((tag, i) => (
                        <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Metadata */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Metadata</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Platform:</span>{' '}
                <span className="font-medium">{data.creative.platform}</span>
              </div>
              <div>
                <span className="text-gray-500">Source:</span>{' '}
                <span className="font-medium capitalize">{data.creative.source_type}</span>
              </div>
              <div>
                <span className="text-gray-500">Niche:</span>{' '}
                <span className="font-medium">{data.creative.niche}</span>
              </div>
              <div>
                <span className="text-gray-500">Creator:</span>{' '}
                <span className="font-medium">{data.creative.creator_username || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>{' '}
                <span className="font-medium capitalize">{data.creative.analysis_status}</span>
              </div>
            </div>
          </Card>

          {/* Metrics */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Performance (30 days)</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Impressions:</span>{' '}
                <span className="font-medium">{data.metrics.impressions.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-500">Clicks:</span>{' '}
                <span className="font-medium">{data.metrics.clicks.toLocaleString()}</span>
              </div>
              {data.metrics.engagement_rate && (
                <div>
                  <span className="text-gray-500">Engagement:</span>{' '}
                  <span className="font-medium">
                    {(data.metrics.engagement_rate * 100).toFixed(1)}%
                  </span>
                </div>
              )}
              {data.metrics.roas && (
                <div>
                  <span className="text-gray-500">ROAS:</span>{' '}
                  <span className="font-medium">{data.metrics.roas.toFixed(2)}x</span>
                </div>
              )}
            </div>
          </Card>

          {/* Annotations */}
          {data.annotations && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3">LLM Annotations</h3>
              <div className="space-y-2 text-sm">
                {data.annotations.hook_type && (
                  <div>
                    <span className="text-gray-500">Hook:</span>{' '}
                    <span className="font-medium capitalize">{data.annotations.hook_type}</span>
                    {data.annotations.hook_strength_score && (
                      <span className="text-gray-400 ml-1">
                        ({(data.annotations.hook_strength_score * 100).toFixed(0)}%)
                      </span>
                    )}
                  </div>
                )}
                {data.annotations.hook_text && (
                  <div className="pt-1">
                    <p className="text-xs italic text-gray-600">"{data.annotations.hook_text}"</p>
                  </div>
                )}
                {data.annotations.cta_type && (
                  <div>
                    <span className="text-gray-500">CTA:</span>{' '}
                    <span className="font-medium capitalize">{data.annotations.cta_type}</span>
                  </div>
                )}
                {data.annotations.sentiment_overall && (
                  <div>
                    <span className="text-gray-500">Sentiment:</span>{' '}
                    <span className="font-medium capitalize">{data.annotations.sentiment_overall}</span>
                  </div>
                )}
                {data.annotations.pacing_style && (
                  <div>
                    <span className="text-gray-500">Pacing:</span>{' '}
                    <span className="font-medium capitalize">{data.annotations.pacing_style}</span>
                  </div>
                )}
                {data.annotations.virality_score && (
                  <div>
                    <span className="text-gray-500">Virality Score:</span>{' '}
                    <span className="font-medium">
                      {(data.annotations.virality_score * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
