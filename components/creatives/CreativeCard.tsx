"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ExternalLink, GitCompare, Eye } from "lucide-react";

export interface CreativeCardItem {
  creative_id: string;
  platform: string;
  source_type: string;
  niche: string;
  media_type: string;
  thumbnail_uri: string | null;
  creator_username: string | null;
  caption?: string | null;
  metrics: {
    impressions: number;
    engagement_rate?: number | null;
    roas?: number | null;
  };
  annotations?: {
    hook_type: string | null;
    hook_strength_score: number | null;
    virality_score: number | null;
  } | null;
}

interface CreativeCardProps {
  creative: CreativeCardItem;
  /** Show caption snippet (e.g. on Search results) */
  showCaption?: boolean;
  /** Show action links: Find similar, Compare */
  showActions?: boolean;
}

export function CreativeCard({
  creative,
  showCaption = false,
  showActions = true,
}: CreativeCardProps) {
  const eng = creative.metrics.engagement_rate;
  const roas = creative.metrics.roas;

  return (
    <Card className="p-4 hover:border-blue-300 hover:shadow-md transition-all overflow-hidden flex flex-col">
      <Link href={`/creatives/${creative.creative_id}`} className="block space-y-3 flex-1">
        {creative.thumbnail_uri && (
          <div className="aspect-video bg-gray-100 rounded overflow-hidden">
            <img
              src={creative.thumbnail_uri}
              alt={creative.creative_id}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{creative.creator_username || "Unknown"}</span>
            <span className="text-gray-500">{creative.platform}</span>
          </div>

          {showCaption && creative.caption && (
            <p className="text-xs text-gray-600 line-clamp-2">{creative.caption}</p>
          )}

          <div className="flex gap-4 text-xs text-gray-600">
            <span className="font-medium">{creative.metrics.impressions.toLocaleString()}</span>
            <span>impressions</span>
            {eng != null && (
              <span>
                <span className="font-medium">{(eng * 100).toFixed(1)}%</span> engagement
              </span>
            )}
            {roas != null && (
              <span>
                <span className="font-medium">{roas.toFixed(2)}x</span> ROAS
              </span>
            )}
          </div>

          {creative.annotations && (
            <div className="pt-2 border-t space-y-1 text-xs">
              {creative.annotations.hook_type && (
                <div>
                  <span className="text-gray-500">Hook:</span>{" "}
                  <span className="font-medium capitalize">{creative.annotations.hook_type}</span>
                  {creative.annotations.hook_strength_score != null && (
                    <span className="text-gray-400 ml-1">
                      ({(creative.annotations.hook_strength_score * 100).toFixed(0)}%)
                    </span>
                  )}
                </div>
              )}
              {creative.annotations.virality_score != null && (
                <div>
                  <span className="text-gray-500">Virality:</span>{" "}
                  <span className="font-medium">
                    {(creative.annotations.virality_score * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          )}

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
      </Link>

      {showActions && (
        <div className="pt-2 mt-2 border-t flex flex-wrap items-center gap-3 text-xs">
          <Link
            href={`/creatives/${creative.creative_id}`}
            className="text-blue-600 hover:underline flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            onClick={(e) => e.stopPropagation()}
            aria-label={`View creative ${creative.creative_id}`}
          >
            <Eye className="h-3.5 w-3.5" aria-hidden /> View
          </Link>
          <Link
            href={`/creatives/${creative.creative_id}#similar`}
            className="text-blue-600 hover:underline flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            onClick={(e) => e.stopPropagation()}
            aria-label={`Find creatives similar to ${creative.creative_id}`}
          >
            Find similar <ExternalLink className="h-3 w-3" aria-hidden />
          </Link>
          <Link
            href={`/compare?b=${encodeURIComponent(creative.creative_id)}`}
            className="text-blue-600 hover:underline flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            onClick={(e) => e.stopPropagation()}
            aria-label={`Compare with creative ${creative.creative_id}`}
          >
            <GitCompare className="h-3.5 w-3.5" aria-hidden /> Compare
          </Link>
        </div>
      )}
    </Card>
  );
}
