"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, ArrowRight, Loader2 } from "lucide-react";

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
    spend: number | null;
    conversions: number;
    revenue: number | null;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    engagement_rate: number | null;
    roas: number | null;
    ctr: number | null;
  };
  vision_features: {
    num_shots: number | null;
    product_on_screen_ratio: number | null;
    scene_tags: string[];
    style_tags: string[];
    object_tags?: string[];
  } | null;
  annotations: {
    hook_type: string | null;
    hook_text: string | null;
    hook_strength_score: number | null;
    cta_type: string | null;
    cta_clarity_score: number | null;
    sentiment_overall: string | null;
    pacing_style: string | null;
    virality_score: number | null;
    virality_factors?: string[];
  } | null;
}

export default function ComparePage() {
  const searchParams = useSearchParams();
  const [idA, setIdA] = useState("");
  const [idB, setIdB] = useState("");
  const [dataA, setDataA] = useState<CreativeDetailData | null>(null);
  const [dataB, setDataB] = useState<CreativeDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const a = searchParams.get("a") ?? "";
    const b = searchParams.get("b") ?? "";
    if (a) setIdA(a);
    if (b) setIdB(b);
  }, [searchParams]);

  const fetchCompare = async () => {
    const a = idA.trim();
    const b = idB.trim();
    if (!a || !b) {
      setError("Enter both creative IDs.");
      return;
    }
    setLoading(true);
    setError(null);
    setDataA(null);
    setDataB(null);
    try {
      const [resA, resB] = await Promise.all([
        fetch(`/api/v1/creatives/${encodeURIComponent(a)}`),
        fetch(`/api/v1/creatives/${encodeURIComponent(b)}`),
      ]);
      if (!resA.ok) throw new Error(`Creative A: ${resA.status}`);
      if (!resB.ok) throw new Error(`Creative B: ${resB.status}`);
      const [jsonA, jsonB] = await Promise.all([resA.json(), resB.json()]);
      setDataA(jsonA);
      setDataB(jsonB);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch creatives.");
    } finally {
      setLoading(false);
    }
  };

  const exportComparison = () => {
    if (!dataA || !dataB) return;
    const lines: string[] = [
      "Creative comparison",
      "==================",
      "",
      `A: ${dataA.creative.creative_id} | ${dataA.creative.platform} | ${dataA.creative.niche}`,
      `B: ${dataB.creative.creative_id} | ${dataB.creative.platform} | ${dataB.creative.niche}`,
      "",
      "Metrics",
      "-------",
      `Impressions:    A ${dataA.metrics.impressions.toLocaleString()}  |  B ${dataB.metrics.impressions.toLocaleString()}`,
      `Engagement:    A ${dataA.metrics.engagement_rate != null ? (dataA.metrics.engagement_rate * 100).toFixed(2) + "%" : "—"}  |  B ${dataB.metrics.engagement_rate != null ? (dataB.metrics.engagement_rate * 100).toFixed(2) + "%" : "—"}`,
      `ROAS:         A ${dataA.metrics.roas != null ? dataA.metrics.roas.toFixed(2) + "x" : "—"}  |  B ${dataB.metrics.roas != null ? dataB.metrics.roas.toFixed(2) + "x" : "—"}`,
      "",
      "Annotations",
      "-----------",
      `Hook:         A ${dataA.annotations?.hook_type ?? "—"}  |  B ${dataB.annotations?.hook_type ?? "—"}`,
      `Virality:     A ${dataA.annotations?.virality_score != null ? (dataA.annotations.virality_score * 100).toFixed(0) + "%" : "—"}  |  B ${dataB.annotations?.virality_score != null ? (dataB.annotations.virality_score * 100).toFixed(0) + "%" : "—"}`,
      `Pacing:       A ${dataA.annotations?.pacing_style ?? "—"}  |  B ${dataB.annotations?.pacing_style ?? "—"}`,
    ];
    const text = lines.join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Compare Creatives</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Side-by-side comparison of metrics, visuals, and LLM annotations. Paste two creative IDs from Explorer or Search.
        </p>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Creative A ID</label>
            <Input
              placeholder="e.g. mock_demo_1"
              value={idA}
              onChange={(e) => setIdA(e.target.value)}
            />
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400 shrink-0 hidden sm:block" />
          <div className="flex-1 min-w-[160px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Creative B ID</label>
            <Input
              placeholder="e.g. mock_demo_2"
              value={idB}
              onChange={(e) => setIdB(e.target.value)}
            />
          </div>
          <Button onClick={fetchCompare} disabled={loading} aria-busy={loading} aria-label="Compare selected creatives">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden /> : null}
            Compare
          </Button>
        </div>
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </Card>

      {loading && (
        <div className="text-sm text-gray-500 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading both creatives…
        </div>
      )}

      {!loading && dataA && dataB && (
        <>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={exportComparison} aria-label={copied ? "Copied to clipboard" : "Copy comparison to clipboard"}>
              <Copy className="h-4 w-4 mr-2" aria-hidden />
              {copied ? "Copied!" : "Copy comparison"}
            </Button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" role="comparison">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Creative A</h3>
                <Link href={`/creatives/${dataA.creative.creative_id}`} className="text-sm text-blue-600 hover:underline">
                  View detail
                </Link>
              </div>
              {dataA.creative.thumbnail_uri && (
                <div className="aspect-video rounded overflow-hidden bg-gray-100 mb-4">
                  <img src={dataA.creative.thumbnail_uri} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <p className="text-xs text-gray-600 mb-2">{dataA.creative.creator_username} · {dataA.creative.platform} · {dataA.creative.niche}</p>
              <table className="w-full text-sm">
                <tbody>
                  <tr><td className="text-gray-500 py-1">Impressions</td><td className="text-right">{dataA.metrics.impressions.toLocaleString()}</td></tr>
                  <tr><td className="text-gray-500 py-1">Engagement</td><td className="text-right">{dataA.metrics.engagement_rate != null ? (dataA.metrics.engagement_rate * 100).toFixed(2) + "%" : "—"}</td></tr>
                  <tr><td className="text-gray-500 py-1">ROAS</td><td className="text-right">{dataA.metrics.roas != null ? dataA.metrics.roas.toFixed(2) + "x" : "—"}</td></tr>
                  <tr><td className="text-gray-500 py-1">Hook</td><td className="text-right">{dataA.annotations?.hook_type ?? "—"}</td></tr>
                  <tr><td className="text-gray-500 py-1">Virality</td><td className="text-right">{dataA.annotations?.virality_score != null ? (dataA.annotations.virality_score * 100).toFixed(0) + "%" : "—"}</td></tr>
                  {dataA.vision_features && (
                    <tr><td className="text-gray-500 py-1">Scene tags</td><td className="text-right">{dataA.vision_features.scene_tags?.join(", ") || "—"}</td></tr>
                  )}
                </tbody>
              </table>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Creative B</h3>
                <Link href={`/creatives/${dataB.creative.creative_id}`} className="text-sm text-blue-600 hover:underline">
                  View detail
                </Link>
              </div>
              {dataB.creative.thumbnail_uri && (
                <div className="aspect-video rounded overflow-hidden bg-gray-100 mb-4">
                  <img src={dataB.creative.thumbnail_uri} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <p className="text-xs text-gray-600 mb-2">{dataB.creative.creator_username} · {dataB.creative.platform} · {dataB.creative.niche}</p>
              <table className="w-full text-sm">
                <tbody>
                  <tr><td className="text-gray-500 py-1">Impressions</td><td className="text-right">{dataB.metrics.impressions.toLocaleString()}</td></tr>
                  <tr><td className="text-gray-500 py-1">Engagement</td><td className="text-right">{dataB.metrics.engagement_rate != null ? (dataB.metrics.engagement_rate * 100).toFixed(2) + "%" : "—"}</td></tr>
                  <tr><td className="text-gray-500 py-1">ROAS</td><td className="text-right">{dataB.metrics.roas != null ? dataB.metrics.roas.toFixed(2) + "x" : "—"}</td></tr>
                  <tr><td className="text-gray-500 py-1">Hook</td><td className="text-right">{dataB.annotations?.hook_type ?? "—"}</td></tr>
                  <tr><td className="text-gray-500 py-1">Virality</td><td className="text-right">{dataB.annotations?.virality_score != null ? (dataB.annotations.virality_score * 100).toFixed(0) + "%" : "—"}</td></tr>
                  {dataB.vision_features && (
                    <tr><td className="text-gray-500 py-1">Scene tags</td><td className="text-right">{dataB.vision_features.scene_tags?.join(", ") || "—"}</td></tr>
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
