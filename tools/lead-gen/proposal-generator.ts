// ============================================================
// Lead Gen Automation — HTML Proposal Generator
// ============================================================
// Generates a premium dark-theme HTML proposal from prospect
// data + optional call transcript. Outputs a single self-
// contained HTML file ready to send.
// ============================================================

import {
  ProspectData,
  CallTranscript,
  GeneratorConfig,
  PricingTier,
  TimelinePhase,
  BrandTarget,
  ProposalOutput,
  GrowthLane,
  DEFAULT_CONFIG,
} from './types';
import { getDeliverablesForLane, getBrandTargetsForNiche } from './deliverables-library';
import { determineGrowthLane } from './proposal-brain';

// ── Public API ───────────────────────────────────────────────

export function generateProposal(
  prospect: ProspectData,
  transcript?: CallTranscript,
  config: GeneratorConfig = DEFAULT_CONFIG,
): ProposalOutput {
  const lane = determineGrowthLane(prospect);
  const deliverableSet = getDeliverablesForLane(lane);
  const brandNames = getBrandTargetsForNiche(prospect.category);
  const brandTargets: BrandTarget[] = brandNames.slice(0, 10).map((name) => ({
    name,
    reason: `Strong category alignment with ${prospect.category} audience`,
  }));

  const goals = buildGoals(prospect, lane);
  const tiers = buildPricingTiers(lane, prospect.category);
  const timeline = buildTimeline(lane);
  const executiveSummary = buildExecutiveSummary(prospect, lane, transcript);
  const deliverables = deliverableSet.deliverables.map((d) => d.name);

  const html = renderProposalHTML({
    prospect,
    transcript,
    config,
    lane,
    executiveSummary,
    goals,
    tiers,
    timeline,
    deliverableSet: deliverableSet.deliverables,
    brandTargets,
  });

  return {
    html,
    growthLane: lane,
    executiveSummary,
    goals,
    pricingTiers: tiers,
    deliverables,
    timeline,
    brandTargets,
  };
}

// ── Builders ─────────────────────────────────────────────────

function buildExecutiveSummary(
  p: ProspectData,
  lane: GrowthLane,
  t?: CallTranscript,
): string {
  const laneLabel: Record<GrowthLane, string> = {
    'ltk-first': 'LTK affiliate revenue',
    'amazon-affiliate-plus': 'Amazon Creator Connections (Affiliate+)',
    'amazon-scr': 'Amazon Sponsored Content Requests',
    'hybrid': 'multi-platform monetization (LTK + Amazon + Brand Partnerships)',
    'brand-partnerships': 'brand partnership revenue',
  };

  let summary = `${p.name} is a ${p.category} creator`;
  if (p.platforms.length > 0) {
    const platNames = p.platforms.map((pl) => pl.platform).join(', ');
    summary += ` active on ${platNames}`;
  }
  summary += `. Based on our analysis, the primary growth opportunity is ${laneLabel[lane]}.`;

  if (p.painPoints && p.painPoints.length > 0) {
    summary += ` Key challenges include: ${p.painPoints.join('; ')}.`;
  }

  if (t?.painPointsIdentified && t.painPointsIdentified.length > 0) {
    summary += ` From our conversation: "${t.painPointsIdentified[0]}"`;
  }

  summary += ` Our goal is to build a structured revenue engine that turns ${p.name}'s existing audience demand into predictable, scalable income.`;

  return summary;
}

function buildGoals(p: ProspectData, lane: GrowthLane): string[] {
  const goals: string[] = [];

  goals.push(`Establish structured ${lane === 'ltk-first' ? 'LTK' : lane === 'hybrid' ? 'multi-platform' : 'affiliate'} monetization system within 30 days`);

  if (p.ltkStatus.active) {
    goals.push('Optimize LTK storefront and increase board posting frequency by 2x');
    goals.push('Increase LTK conversion rate through caption optimization and content briefs');
  } else {
    goals.push('Launch and activate LTK creator profile with optimized storefront');
  }

  if (p.amazonStatus.hasStorefront) {
    goals.push('Scale Amazon storefront revenue through Creator Connections campaigns');
  } else {
    goals.push('Set up Amazon Influencer storefront and begin product review content');
  }

  goals.push('Build brand partnership pipeline with 10+ targeted brands by day 60');

  if (p.desiredMonthlyIncome) {
    goals.push(`Work toward ${formatCurrency(p.desiredMonthlyIncome)}/month revenue target by day 90`);
  } else {
    goals.push('Increase total affiliate + brand revenue by 40-60% within 90 days');
  }

  return goals;
}

function buildPricingTiers(lane: GrowthLane, category: string): PricingTier[] {
  return [
    {
      name: 'Affiliate Essentials',
      price: '$999/month',
      description: 'For creators who want help keeping their storefront active and linked.',
      deliverables: [
        '40 LTK boards/month',
        'Amazon linking support',
        'Caption optimization',
        'Product research',
        'Monthly reporting snapshot',
        'Board types: best sellers, daily deals, seasonal finds, styled outfits',
      ],
    },
    {
      name: 'Affiliate Growth System',
      price: '$1,750/month',
      description: 'Everything in Essentials + full campaign management and content strategy.',
      highlighted: true,
      deliverables: [
        'Everything in Essentials',
        '60 LTK boards/month',
        'IG linking strategy + reel product linking',
        'Amazon storefront optimization',
        'Auto-link new purchases + build collections',
        'Brand outreach (15 targets/week)',
        'Content briefs (3-angle format)',
        'Weekly performance reporting',
      ],
    },
    {
      name: 'Revenue Accelerator',
      price: '$2,500/month + performance',
      description: 'Hands-free affiliate monetization system with brand deal management.',
      deliverables: [
        'Everything in Growth',
        '80+ LTK boards/month',
        'Full Amazon storefront strategy',
        'Brand deal structuring + negotiation',
        'Creative production planning',
        'Seasonal campaign planning',
        'Dedicated strategist',
        'Revenue dashboard',
        'Performance bonus alignment',
      ],
    },
  ];
}

function buildTimeline(lane: GrowthLane): TimelinePhase[] {
  return [
    {
      phase: 'Week 1-2: Foundation',
      duration: '14 days',
      deliverables: [
        'Full monetization audit',
        'Storefront optimization (LTK + Amazon)',
        'Brand target list (30+ brands)',
        'Content calendar (first month)',
        'Outreach templates customized',
      ],
    },
    {
      phase: 'Week 3-4: Launch',
      duration: '14 days',
      deliverables: [
        'Begin posting optimized boards (40-80/month pace)',
        'First brand outreach wave (15 brands)',
        'Content briefs delivered',
        'Linking system activated',
        'First weekly report',
      ],
    },
    {
      phase: 'Month 2: Growth',
      duration: '30 days',
      deliverables: [
        'Campaign management in full swing',
        'Second brand outreach wave',
        'First brand deals in negotiation',
        'Content optimization based on data',
        'Midpoint performance review',
      ],
    },
    {
      phase: 'Month 3: Scale',
      duration: '30 days',
      deliverables: [
        'Revenue targets on track',
        'Repeat brand partnerships activated',
        'Content system self-sustaining',
        'Full quarterly report + strategy refresh',
        'Expansion planning (new platforms/verticals)',
      ],
    },
  ];
}

// ── HTML Rendering ───────────────────────────────────────────

interface RenderContext {
  prospect: ProspectData;
  transcript?: CallTranscript;
  config: GeneratorConfig;
  lane: GrowthLane;
  executiveSummary: string;
  goals: string[];
  tiers: PricingTier[];
  timeline: TimelinePhase[];
  deliverableSet: Array<{ name: string; description: string; frequency?: string; examples?: string[] }>;
  brandTargets: BrandTarget[];
}

function renderProposalHTML(ctx: RenderContext): string {
  const { prospect: p, config: c, lane } = ctx;
  const accent = c.accentColor || '#4F9CF7';
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Growth Proposal — ${esc(p.name)} | ${esc(c.agencyName)}</title>
<style>
  :root {
    --accent: ${accent};
    --accent-dim: ${accent}33;
    --bg: #0f1117;
    --surface: #181b23;
    --surface2: #1f2330;
    --border: #2a2e3b;
    --text: #e4e6ed;
    --text-muted: #8b8fa3;
    --text-bright: #ffffff;
    --success: #34d399;
    --warning: #fbbf24;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.65;
    -webkit-font-smoothing: antialiased;
  }
  .container { max-width: 900px; margin: 0 auto; padding: 60px 40px; }

  /* ── Cover ── */
  .cover {
    text-align: center;
    padding: 80px 0 60px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 60px;
  }
  .cover .agency { color: var(--accent); font-size: 14px; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 12px; }
  .cover h1 { font-size: 36px; font-weight: 700; color: var(--text-bright); margin-bottom: 8px; }
  .cover .subtitle { font-size: 18px; color: var(--text-muted); }
  .cover .date { margin-top: 20px; font-size: 13px; color: var(--text-muted); }
  .cover .lane-badge {
    display: inline-block;
    margin-top: 16px;
    padding: 6px 16px;
    border: 1px solid var(--accent);
    border-radius: 20px;
    font-size: 12px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--accent);
  }

  /* ── Sections ── */
  .section { margin-bottom: 56px; }
  .section-title {
    font-size: 11px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 8px;
  }
  .section h2 {
    font-size: 24px;
    font-weight: 600;
    color: var(--text-bright);
    margin-bottom: 20px;
  }
  .section p { margin-bottom: 14px; color: var(--text); }

  /* ── Lists ── */
  ul { list-style: none; padding: 0; }
  ul li {
    position: relative;
    padding: 8px 0 8px 22px;
    color: var(--text);
  }
  ul li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 16px;
    width: 8px;
    height: 8px;
    background: var(--accent);
    border-radius: 50%;
  }

  /* ── Callout Box ── */
  .callout {
    background: var(--surface);
    border-left: 3px solid var(--accent);
    padding: 20px 24px;
    border-radius: 0 8px 8px 0;
    margin: 20px 0;
  }
  .callout.warning { border-left-color: var(--warning); }
  .callout p { margin: 0; }

  /* ── Pricing ── */
  .pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 24px; }
  .pricing-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 28px 24px;
    position: relative;
  }
  .pricing-card.highlighted {
    border-color: var(--accent);
    box-shadow: 0 0 30px var(--accent-dim);
  }
  .pricing-card .badge {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--accent);
    color: #000;
    font-size: 11px;
    font-weight: 700;
    padding: 4px 14px;
    border-radius: 20px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .pricing-card h3 { font-size: 18px; color: var(--text-bright); margin-bottom: 8px; }
  .pricing-card .price { font-size: 24px; font-weight: 700; color: var(--accent); margin-bottom: 12px; }
  .pricing-card .desc { font-size: 13px; color: var(--text-muted); margin-bottom: 16px; }
  .pricing-card ul li { font-size: 13px; padding: 5px 0 5px 18px; }
  .pricing-card ul li::before { width: 6px; height: 6px; top: 13px; }

  /* ── Timeline ── */
  .timeline { position: relative; padding-left: 28px; }
  .timeline::before {
    content: '';
    position: absolute;
    left: 6px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--border);
  }
  .timeline-item { position: relative; margin-bottom: 32px; }
  .timeline-item::before {
    content: '';
    position: absolute;
    left: -28px;
    top: 4px;
    width: 14px;
    height: 14px;
    background: var(--accent);
    border-radius: 50%;
    border: 3px solid var(--bg);
  }
  .timeline-item h3 { font-size: 16px; color: var(--text-bright); margin-bottom: 8px; }
  .timeline-item ul li { font-size: 13px; }

  /* ── Deliverables Grid ── */
  .deliverables-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 20px; }
  .deliverable-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 20px;
  }
  .deliverable-card h4 { font-size: 15px; color: var(--text-bright); margin-bottom: 6px; }
  .deliverable-card .freq { font-size: 11px; color: var(--accent); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  .deliverable-card p { font-size: 13px; color: var(--text-muted); }

  /* ── Brand Targets ── */
  .brand-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
  .brand-chip {
    background: var(--surface2);
    border: 1px solid var(--border);
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 13px;
    color: var(--text);
  }

  /* ── Sign-off ── */
  .signoff {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 40px;
    text-align: center;
    margin-top: 60px;
  }
  .signoff h2 { font-size: 22px; color: var(--text-bright); margin-bottom: 12px; }
  .signoff p { color: var(--text-muted); font-size: 14px; margin-bottom: 20px; }
  .signoff .cta {
    display: inline-block;
    padding: 14px 36px;
    background: var(--accent);
    color: #000;
    font-weight: 600;
    border-radius: 8px;
    text-decoration: none;
    font-size: 15px;
  }

  /* ── Responsive ── */
  @media (max-width: 700px) {
    .container { padding: 30px 20px; }
    .cover h1 { font-size: 26px; }
    .pricing-grid { grid-template-columns: 1fr; }
    .deliverables-grid { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>
<div class="container">

  <!-- ── Cover ── -->
  <div class="cover">
    <div class="agency">${esc(c.agencyName)}</div>
    <h1>Growth Proposal for ${esc(p.name)}</h1>
    <div class="subtitle">${esc(c.agencyTagline || 'Affiliate Monetization Operations for Creators')}</div>
    <div class="lane-badge">${formatLane(lane)}</div>
    <div class="date">Prepared ${date}</div>
  </div>

  <!-- ── Executive Summary ── -->
  <div class="section">
    <div class="section-title">Executive Summary</div>
    <h2>Where You Are & Where We're Going</h2>
    <p>${esc(ctx.executiveSummary)}</p>
    ${ctx.transcript?.keyExcerpts ? `
    <div class="callout">
      <p><em>"${esc(ctx.transcript.keyExcerpts[0])}"</em></p>
    </div>` : ''}
  </div>

  <!-- ── Goals ── -->
  <div class="section">
    <div class="section-title">Goals & Objectives</div>
    <h2>30 / 60 / 90 Day Targets</h2>
    <ul>
      ${ctx.goals.map((g) => `<li>${esc(g)}</li>`).join('\n      ')}
    </ul>
  </div>

  <!-- ── Strategy ── -->
  <div class="section">
    <div class="section-title">Strategy Overview</div>
    <h2>How We Get There</h2>
    <p>Our process follows a proven six-step framework: <strong>Research → Position → Build → Outreach → Convert → Optimize</strong>.</p>

    <div class="callout">
      <p><strong>Positioning:</strong> We audit your storefront, content, and audience to find the highest-leverage monetization gaps.</p>
    </div>
    <div class="callout">
      <p><strong>Offer Packaging:</strong> We structure your affiliate boards, collections, and brand pitches so every piece of content drives revenue.</p>
    </div>
    <div class="callout">
      <p><strong>Outreach & Conversion:</strong> We run weekly brand outreach, negotiate deals, and optimize your conversion funnel.</p>
    </div>
    <div class="callout">
      <p><strong>Operations & Reporting:</strong> We handle linking, posting, and tracking so you can focus on creating content.</p>
    </div>
  </div>

  <!-- ── Deliverables ── -->
  <div class="section">
    <div class="section-title">Deliverables</div>
    <h2>What You Receive</h2>
    <div class="deliverables-grid">
      ${ctx.deliverableSet.map((d) => `
      <div class="deliverable-card">
        <h4>${esc(d.name)}</h4>
        ${d.frequency ? `<div class="freq">${esc(d.frequency)}</div>` : ''}
        <p>${esc(d.description)}</p>
      </div>`).join('')}
    </div>
  </div>

  <!-- ── Timeline ── -->
  <div class="section">
    <div class="section-title">Timeline</div>
    <h2>90-Day Sprint Plan</h2>
    <div class="timeline">
      ${ctx.timeline.map((phase) => `
      <div class="timeline-item">
        <h3>${esc(phase.phase)}</h3>
        <ul>
          ${phase.deliverables.map((d) => `<li>${esc(d)}</li>`).join('\n          ')}
        </ul>
      </div>`).join('')}
    </div>
  </div>

  <!-- ── Pricing ── -->
  <div class="section">
    <div class="section-title">Investment</div>
    <h2>Service Packages</h2>
    <div class="pricing-grid">
      ${ctx.tiers.map((tier) => `
      <div class="pricing-card${tier.highlighted ? ' highlighted' : ''}">
        ${tier.highlighted ? '<div class="badge">Most Popular</div>' : ''}
        <h3>${esc(tier.name)}</h3>
        <div class="price">${esc(tier.price)}</div>
        <div class="desc">${esc(tier.description)}</div>
        <ul>
          ${tier.deliverables.map((d) => `<li>${esc(d)}</li>`).join('\n          ')}
        </ul>
      </div>`).join('')}
    </div>
  </div>

  <!-- ── Brand Targets ── -->
  <div class="section">
    <div class="section-title">Opportunity</div>
    <h2>Brand Targets for ${esc(p.name)}</h2>
    <p>Based on your niche (${esc(p.category)}), these are the brands we would target in our initial outreach waves:</p>
    <div class="brand-grid">
      ${ctx.brandTargets.map((b) => `<div class="brand-chip">${esc(b.name)}</div>`).join('\n      ')}
    </div>
  </div>

  <!-- ── Why Us ── -->
  <div class="section">
    <div class="section-title">Why ${esc(c.agencyName)}</div>
    <h2>The Right Fit</h2>
    <p>We combine influencer campaign strategy, affiliate conversion optimization, brand deal negotiation, and creative iteration testing into a single system.</p>
    <ul>
      <li><strong>Research → Test → Iterate:</strong> Every decision is data-backed. We track what converts and double down.</li>
      <li><strong>Creative is the growth lever:</strong> We don't just post boards — we craft content briefs, hooks, and angles designed to convert.</li>
      <li><strong>Full-stack operations:</strong> From linking products to negotiating brand deals, we handle the backend so you focus on content.</li>
      <li><strong>Category expertise:</strong> Deep understanding of ${esc(p.category)} monetization — the retailers, the seasonality, the audience behavior.</li>
    </ul>
  </div>

  <!-- ── Sign-off ── -->
  <div class="signoff">
    <h2>Ready to Scale Your Revenue?</h2>
    <p>Let's set up a 15-minute kickoff call to align on goals and get started.</p>
    <a class="cta" href="#">Schedule Kickoff Call</a>
    <div style="margin-top: 30px; color: var(--text-muted); font-size: 13px;">
      <p>${esc(c.agencyName)}${c.contactEmail ? ` &bull; ${esc(c.contactEmail)}` : ''}${c.websiteUrl ? ` &bull; ${esc(c.websiteUrl)}` : ''}</p>
    </div>
  </div>

</div>
</body>
</html>`;
}

// ── Helpers ───────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function formatLane(lane: GrowthLane): string {
  const labels: Record<GrowthLane, string> = {
    'ltk-first': 'LTK Growth',
    'amazon-affiliate-plus': 'Amazon Affiliate+',
    'amazon-scr': 'Amazon SCR',
    'hybrid': 'Hybrid Monetization',
    'brand-partnerships': 'Brand Partnerships',
  };
  return labels[lane];
}
