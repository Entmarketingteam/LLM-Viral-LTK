// ============================================================
// Lead Gen Automation — Creator Monetization Audit Generator
// ============================================================
// Generates a one-page HTML monetization audit for a creator.
// Designed as a free lead magnet — send this to prospects to
// demonstrate value before they sign up.
// ============================================================

import {
  ProspectData,
  AuditOutput,
  AuditGap,
  AuditOpportunity,
  GeneratorConfig,
  DEFAULT_CONFIG,
} from './types';
import { determineGrowthLane } from './proposal-brain';
import { calculateCreatorScore, CREATOR_SCORING_SIGNALS } from './deliverables-library';

// ── Public API ───────────────────────────────────────────────

export function generateAudit(
  prospect: ProspectData,
  config: GeneratorConfig = DEFAULT_CONFIG,
): AuditOutput {
  const lane = determineGrowthLane(prospect);
  const gaps = identifyGaps(prospect);
  const opportunities = identifyOpportunities(prospect, lane);
  const currentRevenueSources = identifyCurrentRevenue(prospect);
  const projectedUplift = estimateUplift(prospect, gaps);

  const html = renderAuditHTML(prospect, config, gaps, opportunities, currentRevenueSources, projectedUplift);

  return { html, currentRevenueSources, gaps, opportunities, projectedUplift };
}

// ── Gap Identification ──────────────────────────────────────

function identifyGaps(p: ProspectData): AuditGap[] {
  const gaps: AuditGap[] = [];

  if (!p.ltkStatus.active) {
    gaps.push({
      area: 'LTK',
      description: 'No active LTK storefront detected. This is one of the highest-converting affiliate platforms for fashion/lifestyle creators.',
      severity: 'high',
    });
  } else {
    if (!p.ltkStatus.boardCount || p.ltkStatus.boardCount < 20) {
      gaps.push({
        area: 'LTK Post Frequency',
        description: `Current LTK posting frequency appears low (${p.ltkStatus.boardCount || 'unknown'} boards). Top earners post 40-80 boards per month.`,
        severity: 'medium',
      });
    }
  }

  if (!p.amazonStatus.hasStorefront) {
    gaps.push({
      area: 'Amazon Storefront',
      description: 'No Amazon Influencer storefront found. Amazon product recommendations could be driving significant passive revenue.',
      severity: 'high',
    });
  }

  if (!p.amazonStatus.hasCreatorConnections) {
    gaps.push({
      area: 'Amazon Creator Connections',
      description: 'Not enrolled in Creator Connections — missing bonus commission campaigns on qualifying products.',
      severity: 'medium',
    });
  }

  if (!p.currentBrandPartners || p.currentBrandPartners.length < 3) {
    gaps.push({
      area: 'Brand Partnerships',
      description: 'Limited or no visible brand partnerships. With your audience size and niche, brands should be paying premium retainers.',
      severity: 'high',
    });
  }

  const totalFollowers = p.platforms.reduce((sum, pl) => sum + (pl.followers || 0), 0);
  if (p.platforms.length < 3 && totalFollowers > 10000) {
    gaps.push({
      area: 'Multi-Platform Presence',
      description: 'Content is concentrated on 1-2 platforms. Expanding to additional platforms would multiply affiliate reach.',
      severity: 'low',
    });
  }

  if (!p.contentStyleStrengths?.some((s) => s.toLowerCase().includes('video'))) {
    gaps.push({
      area: 'Video Content',
      description: 'Limited video content detected. Video (Reels, TikTok, Shorts) drives 3-5x more affiliate conversions than static posts.',
      severity: 'medium',
    });
  }

  return gaps;
}

// ── Opportunity Identification ──────────────────────────────

function identifyOpportunities(p: ProspectData, lane: string): AuditOpportunity[] {
  const opps: AuditOpportunity[] = [];
  const cat = p.category.toLowerCase();

  opps.push({
    title: 'Structured Posting System',
    description: 'Implement a consistent posting cadence with optimized boards: best sellers, daily deals, seasonal finds, and styled outfits.',
    estimatedImpact: '+$1,000-3,000/month in affiliate revenue',
    effort: 'low',
  });

  if (!p.amazonStatus.hasStorefront) {
    opps.push({
      title: 'Amazon Storefront Launch',
      description: 'Set up an Amazon Influencer storefront with structured categories and begin shoppable video content.',
      estimatedImpact: '+$500-2,000/month',
      effort: 'medium',
    });
  }

  opps.push({
    title: 'Content Repurposing Pipeline',
    description: 'Transform each piece of content into 5+ affiliate touchpoints: Reel → LTK board → Amazon video → Pinterest pin → Email feature.',
    estimatedImpact: '2-3x more revenue per content piece',
    effort: 'low',
  });

  opps.push({
    title: 'Brand Partnership Pipeline',
    description: `Build a targeted list of 30+ brands in the ${p.category} space and run structured outreach campaigns.`,
    estimatedImpact: '+$2,000-5,000/month in brand deals',
    effort: 'medium',
  });

  opps.push({
    title: 'Caption & SEO Optimization',
    description: 'Rewrite captions with conversion-focused copy, relevant keywords, and clear CTAs on every board.',
    estimatedImpact: '+20-40% conversion rate uplift',
    effort: 'low',
  });

  if (lane === 'amazon-affiliate-plus' || lane === 'hybrid') {
    opps.push({
      title: 'Amazon Creator Connections Campaigns',
      description: 'Enroll in and manage Affiliate+ campaigns for bonus commission on qualifying sales.',
      estimatedImpact: '+$500-1,500/month bonus commissions',
      effort: 'low',
    });
  }

  return opps;
}

// ── Revenue Source Identification ────────────────────────────

function identifyCurrentRevenue(p: ProspectData): string[] {
  const sources: string[] = [];

  if (p.ltkStatus.active) sources.push('LTK affiliate commissions');
  if (p.amazonStatus.hasStorefront) sources.push('Amazon Influencer storefront');
  if (p.amazonStatus.hasAssociates) sources.push('Amazon Associates');
  if (p.currentBrandPartners && p.currentBrandPartners.length > 0) {
    sources.push(`Brand partnerships (${p.currentBrandPartners.length} identified)`);
  }

  const hasSponsoredContent = p.painPoints?.some((pp) =>
    pp.toLowerCase().includes('sponsored') || pp.toLowerCase().includes('ad'),
  );
  if (hasSponsoredContent) sources.push('Sponsored content');

  if (sources.length === 0) sources.push('No structured affiliate revenue detected');

  return sources;
}

// ── Uplift Estimation ───────────────────────────────────────

function estimateUplift(p: ProspectData, gaps: AuditGap[]): string {
  const totalFollowers = p.platforms.reduce((sum, pl) => sum + (pl.followers || 0), 0);
  const highSeverityGaps = gaps.filter((g) => g.severity === 'high').length;

  let lowEstimate = 1000;
  let highEstimate = 3000;

  // Adjust based on audience size
  if (totalFollowers > 100000) {
    lowEstimate = 3000;
    highEstimate = 10000;
  } else if (totalFollowers > 50000) {
    lowEstimate = 2000;
    highEstimate = 7000;
  } else if (totalFollowers > 20000) {
    lowEstimate = 1500;
    highEstimate = 5000;
  }

  // More gaps = more opportunity
  lowEstimate += highSeverityGaps * 500;
  highEstimate += highSeverityGaps * 1500;

  return `$${formatNumber(lowEstimate)}-${formatNumber(highEstimate)}/month potential additional revenue`;
}

// ── HTML Rendering ───────────────────────────────────────────

function renderAuditHTML(
  p: ProspectData,
  c: GeneratorConfig,
  gaps: AuditGap[],
  opps: AuditOpportunity[],
  currentRevenue: string[],
  uplift: string,
): string {
  const accent = c.accentColor || '#4F9CF7';
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Monetization Audit — ${esc(p.name)} | ${esc(c.agencyName)}</title>
<style>
  :root {
    --accent: ${accent};
    --bg: #0f1117;
    --surface: #181b23;
    --border: #2a2e3b;
    --text: #e4e6ed;
    --text-muted: #8b8fa3;
    --text-bright: #ffffff;
    --red: #ef4444;
    --yellow: #fbbf24;
    --green: #34d399;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; background: var(--bg); color: var(--text); line-height: 1.65; }
  .container { max-width: 800px; margin: 0 auto; padding: 50px 40px; }

  .header { text-align: center; padding-bottom: 40px; border-bottom: 1px solid var(--border); margin-bottom: 40px; }
  .header .badge { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: var(--accent); margin-bottom: 8px; }
  .header h1 { font-size: 28px; color: var(--text-bright); margin-bottom: 6px; }
  .header .sub { color: var(--text-muted); font-size: 14px; }

  .uplift-box {
    background: linear-gradient(135deg, ${accent}15, ${accent}08);
    border: 1px solid ${accent}44;
    border-radius: 12px;
    padding: 30px;
    text-align: center;
    margin-bottom: 40px;
  }
  .uplift-box .label { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: var(--accent); margin-bottom: 8px; }
  .uplift-box .value { font-size: 24px; font-weight: 700; color: var(--text-bright); }

  .section { margin-bottom: 40px; }
  .section h2 { font-size: 18px; color: var(--text-bright); margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }

  .current-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
  .current-chip {
    background: var(--surface);
    border: 1px solid var(--border);
    padding: 8px 14px;
    border-radius: 6px;
    font-size: 13px;
  }

  .gap-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 18px;
    margin-bottom: 12px;
    display: flex;
    gap: 14px;
  }
  .severity {
    width: 10px;
    min-width: 10px;
    border-radius: 4px;
    flex-shrink: 0;
  }
  .severity-high { background: var(--red); }
  .severity-medium { background: var(--yellow); }
  .severity-low { background: var(--green); }
  .gap-content h4 { font-size: 14px; color: var(--text-bright); margin-bottom: 4px; }
  .gap-content p { font-size: 13px; color: var(--text-muted); }

  .opp-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 18px;
    margin-bottom: 12px;
  }
  .opp-card h4 { font-size: 14px; color: var(--text-bright); margin-bottom: 4px; }
  .opp-card p { font-size: 13px; color: var(--text-muted); margin-bottom: 8px; }
  .opp-meta { display: flex; gap: 12px; }
  .opp-tag {
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 4px;
    letter-spacing: 0.5px;
  }
  .opp-impact { background: #34d39922; color: var(--green); }
  .opp-effort-low { background: #34d39922; color: var(--green); }
  .opp-effort-medium { background: #fbbf2422; color: var(--yellow); }
  .opp-effort-high { background: #ef444422; color: var(--red); }

  .cta-box {
    background: var(--surface);
    border: 1px solid var(--accent);
    border-radius: 12px;
    padding: 30px;
    text-align: center;
    margin-top: 40px;
  }
  .cta-box h3 { font-size: 18px; color: var(--text-bright); margin-bottom: 8px; }
  .cta-box p { font-size: 14px; color: var(--text-muted); margin-bottom: 16px; }
  .cta-btn {
    display: inline-block;
    padding: 12px 30px;
    background: var(--accent);
    color: #000;
    font-weight: 600;
    border-radius: 6px;
    text-decoration: none;
    font-size: 14px;
  }
  .footer { text-align: center; margin-top: 40px; font-size: 12px; color: var(--text-muted); }
  @media (max-width: 600px) { .container { padding: 30px 20px; } }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="badge">${esc(c.agencyName)} &mdash; Free Monetization Audit</div>
    <h1>${esc(p.name)}</h1>
    <div class="sub">${esc(p.category)} Creator &bull; ${date}</div>
  </div>

  <div class="uplift-box">
    <div class="label">Estimated Revenue Opportunity</div>
    <div class="value">${esc(uplift)}</div>
  </div>

  <div class="section">
    <h2>Current Revenue Sources</h2>
    <div class="current-grid">
      ${currentRevenue.map((r) => `<div class="current-chip">${esc(r)}</div>`).join('\n      ')}
    </div>
  </div>

  <div class="section">
    <h2>Monetization Gaps Identified</h2>
    ${gaps.map((g) => `
    <div class="gap-card">
      <div class="severity severity-${g.severity}"></div>
      <div class="gap-content">
        <h4>${esc(g.area)}</h4>
        <p>${esc(g.description)}</p>
      </div>
    </div>`).join('')}
  </div>

  <div class="section">
    <h2>Opportunities</h2>
    ${opps.map((o) => `
    <div class="opp-card">
      <h4>${esc(o.title)}</h4>
      <p>${esc(o.description)}</p>
      <div class="opp-meta">
        <span class="opp-tag opp-impact">${esc(o.estimatedImpact)}</span>
        <span class="opp-tag opp-effort-${o.effort}">Effort: ${o.effort}</span>
      </div>
    </div>`).join('')}
  </div>

  <div class="cta-box">
    <h3>Want to Capture This Revenue?</h3>
    <p>We build the backend monetization system so you can focus on creating content.</p>
    <a class="cta-btn" href="#">Book a Free Strategy Call</a>
  </div>

  <div class="footer">
    ${esc(c.agencyName)} &bull; ${c.contactEmail ? esc(c.contactEmail) + ' &bull; ' : ''}Affiliate Monetization Operations for Creators
  </div>
</div>
</body>
</html>`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}
