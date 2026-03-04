// ============================================================
// Lead Gen Automation — Visual Pitch Deck Generator
// ============================================================
// Generates a pitch deck with REAL screenshots, actual IG data,
// and actionable advice. This is the "overview of what we can
// do for them" that gets sent after cold outreach.
//
// Includes:
// - Creator's actual screenshots (LTK, IG, Amazon)
// - Real engagement stats from Meta Graph API
// - Actionable advice with specific observations
// - Revenue opportunity analysis
// - "Before/After" positioning
// - Service overview with clear next steps
// ============================================================

import * as fs from 'fs';
import * as path from 'path';
import { ProspectData, GeneratorConfig, DEFAULT_CONFIG } from './types';
import { CreatorResearchPackage, ActionableAdvice } from './creator-research-engine';

// ── Public API ───────────────────────────────────────────────

export function generateVisualPitchDeck(
  research: CreatorResearchPackage,
  config: GeneratorConfig = DEFAULT_CONFIG,
): string {
  return renderVisualPitchHTML(research, config);
}

// ── HTML Rendering ───────────────────────────────────────────

function renderVisualPitchHTML(
  r: CreatorResearchPackage,
  c: GeneratorConfig,
): string {
  const p = r.prospect;
  const ig = r.instagram;
  const screenshots = r.screenshotBase64Map || {};
  const accent = c.accentColor || '#4F9CF7';
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const totalFollowers = p.platforms.reduce((sum, pl) => sum + (pl.followers || 0), 0);
  const highImpactAdvice = r.actionableAdvice.filter((a) => a.impact === 'high');
  const quickWins = r.actionableAdvice.filter((a) => a.effort === 'quick-win');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Growth Opportunity — ${esc(p.name)} | ${esc(c.agencyName)}</title>
<style>
  :root {
    --accent: ${accent};
    --accent-dim: ${accent}22;
    --bg: #0b0d11;
    --surface: #141720;
    --surface2: #1a1e2a;
    --border: #252a38;
    --text: #dfe2ec;
    --text-muted: #7d829a;
    --text-bright: #ffffff;
    --green: #34d399;
    --yellow: #fbbf24;
    --red: #f87171;
    --blue: ${accent};
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; background: var(--bg); color: var(--text); line-height: 1.7; -webkit-font-smoothing: antialiased; }

  .slide {
    max-width: 1000px;
    margin: 0 auto;
    padding: 80px 60px;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    border-bottom: 1px solid var(--border);
  }
  .slide:last-child { border-bottom: none; }

  /* ── Cover Slide ── */
  .cover { text-align: center; }
  .cover .badge { font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: var(--accent); margin-bottom: 16px; }
  .cover h1 { font-size: 38px; font-weight: 700; color: var(--text-bright); margin-bottom: 10px; }
  .cover .sub { font-size: 17px; color: var(--text-muted); max-width: 600px; margin: 0 auto 20px; }
  .cover .date { font-size: 12px; color: var(--text-muted); }
  .cover .tier-row { display: flex; gap: 12px; justify-content: center; margin-top: 20px; }
  .cover .tier-pill { padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
  .tier-hot { background: #ef444422; color: #f87171; border: 1px solid #ef444444; }
  .tier-warm { background: #f59e0b22; color: #fbbf24; border: 1px solid #f59e0b44; }
  .tier-cold { background: #3b82f622; color: #60a5fa; border: 1px solid #3b82f644; }

  /* ── Section ── */
  .section-label { font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: var(--accent); margin-bottom: 8px; }
  .slide h2 { font-size: 26px; font-weight: 600; color: var(--text-bright); margin-bottom: 20px; }
  .slide p { margin-bottom: 14px; font-size: 15px; }

  /* ── Stats Grid ── */
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin: 24px 0; }
  .stat { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 20px; text-align: center; }
  .stat .val { font-size: 28px; font-weight: 700; color: var(--accent); }
  .stat .lbl { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }

  /* ── Screenshot Gallery ── */
  .screenshot-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 24px 0; }
  .screenshot-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
  .screenshot-card img { width: 100%; height: auto; display: block; }
  .screenshot-card .label { padding: 12px 16px; font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }
  .screenshot-single { max-width: 700px; margin: 20px auto; }
  .screenshot-single img { width: 100%; border-radius: 10px; border: 1px solid var(--border); }

  /* ── Advice Cards ── */
  .advice-grid { display: grid; gap: 16px; margin: 20px 0; }
  .advice-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 24px; display: flex; gap: 16px; }
  .advice-indicator { width: 4px; border-radius: 2px; flex-shrink: 0; }
  .impact-high { background: var(--red); }
  .impact-medium { background: var(--yellow); }
  .impact-low { background: var(--green); }
  .advice-content h3 { font-size: 16px; color: var(--text-bright); margin-bottom: 6px; }
  .advice-content .obs { font-size: 13px; color: var(--text-muted); margin-bottom: 8px; font-style: italic; }
  .advice-content .rec { font-size: 14px; color: var(--text); }
  .advice-tags { display: flex; gap: 8px; margin-top: 10px; }
  .advice-tag { font-size: 10px; padding: 3px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
  .tag-quick { background: #34d39922; color: var(--green); }
  .tag-moderate { background: #fbbf2422; color: var(--yellow); }
  .tag-project { background: #f8717122; color: var(--red); }

  /* ── Opportunity Box ── */
  .opportunity-box {
    background: linear-gradient(135deg, ${accent}12, ${accent}06);
    border: 1px solid ${accent}33;
    border-radius: 14px;
    padding: 36px;
    text-align: center;
    margin: 24px 0;
  }
  .opportunity-box .label { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: var(--accent); margin-bottom: 8px; }
  .opportunity-box .value { font-size: 28px; font-weight: 700; color: var(--text-bright); }
  .opportunity-box .note { font-size: 13px; color: var(--text-muted); margin-top: 8px; }

  /* ── What We Do ── */
  .service-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0; }
  .service-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 24px; }
  .service-card h3 { font-size: 15px; color: var(--accent); margin-bottom: 8px; }
  .service-card p { font-size: 13px; color: var(--text-muted); margin-bottom: 10px; }
  .service-card ul { list-style: none; }
  .service-card li { font-size: 12px; padding: 3px 0 3px 16px; position: relative; color: var(--text); }
  .service-card li::before { content: ''; position: absolute; left: 0; top: 10px; width: 6px; height: 6px; background: var(--accent); border-radius: 50%; }

  /* ── CTA ── */
  .cta-slide { text-align: center; }
  .cta-slide h2 { font-size: 30px; margin-bottom: 12px; }
  .cta-btn {
    display: inline-block;
    padding: 16px 44px;
    background: var(--accent);
    color: #000;
    font-weight: 600;
    border-radius: 8px;
    text-decoration: none;
    font-size: 16px;
    margin-top: 20px;
  }
  .cta-sub { margin-top: 16px; font-size: 13px; color: var(--text-muted); }

  @media (max-width: 700px) {
    .slide { padding: 40px 24px; min-height: auto; }
    .cover h1 { font-size: 26px; }
    .screenshot-grid, .service-grid { grid-template-columns: 1fr; }
    .stats { grid-template-columns: repeat(2, 1fr); }
  }
</style>
</head>
<body>

<!-- ═══ COVER ═══ -->
<div class="slide cover">
  <div class="badge">${esc(c.agencyName)} — Growth Opportunity Report</div>
  <h1>What We See for ${esc(p.name)}</h1>
  <div class="sub">A personalized overview of monetization opportunities, actionable advice, and how we can help scale your affiliate and brand partnership revenue.</div>
  <div class="tier-row">
    <span class="tier-pill tier-${r.scoring.tier}">${r.scoring.tier} prospect</span>
    <span class="tier-pill" style="background: var(--surface); color: var(--accent); border: 1px solid var(--border);">${formatLane(r.strategy.growthLane)}</span>
  </div>
  <div class="date">${date}</div>
</div>

<!-- ═══ YOUR CURRENT PRESENCE ═══ -->
<div class="slide">
  <div class="section-label">Your Current Presence</div>
  <h2>Here's What We Found</h2>

  <div class="stats">
    ${ig ? `
    <div class="stat"><div class="val">${fmtNum(ig.profile.followers_count)}</div><div class="lbl">Followers</div></div>
    <div class="stat"><div class="val">${ig.engagement.avgEngagementRate}%</div><div class="lbl">Engagement Rate</div></div>
    <div class="stat"><div class="val">${fmtNum(ig.engagement.avgLikes)}</div><div class="lbl">Avg Likes</div></div>
    <div class="stat"><div class="val">${ig.engagement.postingFrequency}</div><div class="lbl">Post Frequency</div></div>
    ` : `
    <div class="stat"><div class="val">${fmtNum(totalFollowers)}</div><div class="lbl">Est. Audience</div></div>
    <div class="stat"><div class="val">${p.platforms.length}</div><div class="lbl">Platforms</div></div>
    <div class="stat"><div class="val">${p.ltkStatus.active ? 'Active' : 'Inactive'}</div><div class="lbl">LTK Status</div></div>
    <div class="stat"><div class="val">${p.amazonStatus.hasStorefront ? 'Yes' : 'No'}</div><div class="lbl">Amazon Storefront</div></div>
    `}
    ${ig ? `
    <div class="stat"><div class="val">${ig.monetization.sponsoredPostCount}</div><div class="lbl">Sponsored Posts</div></div>
    <div class="stat"><div class="val">${ig.monetization.affiliateLinkCount}</div><div class="lbl">Affiliate Mentions</div></div>
    ` : ''}
  </div>

  ${Object.keys(screenshots).length > 0 ? `
  <div class="screenshot-grid">
    ${screenshots['LTK Storefront'] ? `
    <div class="screenshot-card">
      <img src="${screenshots['LTK Storefront']}" alt="LTK Storefront" loading="lazy" />
      <div class="label">Your LTK Storefront</div>
    </div>` : ''}
    ${screenshots['Instagram Profile Grid'] ? `
    <div class="screenshot-card">
      <img src="${screenshots['Instagram Profile Grid']}" alt="Instagram Profile" loading="lazy" />
      <div class="label">Your Instagram Profile</div>
    </div>` : ''}
    ${screenshots['Amazon Storefront'] ? `
    <div class="screenshot-card">
      <img src="${screenshots['Amazon Storefront']}" alt="Amazon Storefront" loading="lazy" />
      <div class="label">Your Amazon Storefront</div>
    </div>` : ''}
  </div>` : ''}
</div>

<!-- ═══ REVENUE OPPORTUNITY ═══ -->
<div class="slide">
  <div class="section-label">Revenue Opportunity</div>
  <h2>Money You're Leaving on the Table</h2>

  <div class="opportunity-box">
    <div class="label">Estimated Additional Revenue Potential</div>
    <div class="value">${estimateRevenue(p, ig)}</div>
    <div class="note">Based on your audience size, engagement, and current monetization gaps</div>
  </div>

  <p>We analyzed your online presence across ${p.platforms.length} platform(s) and identified <strong>${highImpactAdvice.length} high-impact opportunities</strong> and <strong>${quickWins.length} quick wins</strong> that can start generating revenue immediately.</p>

  ${ig && ig.monetization.sponsoredPostCount === 0 ? `
  <p style="color: var(--yellow);">You have <strong>zero sponsored content</strong> in your recent posts — with ${fmtNum(ig.profile.followers_count)} followers, brands should be paying you for partnerships.</p>
  ` : ''}

  ${!p.amazonStatus.hasStorefront ? `
  <p style="color: var(--yellow);">No Amazon Influencer storefront detected — your audience is buying on Amazon and you're not earning commission on those purchases.</p>
  ` : ''}
</div>

<!-- ═══ ACTIONABLE ADVICE ═══ -->
<div class="slide">
  <div class="section-label">Actionable Advice</div>
  <h2>What We'd Do Differently</h2>
  <p>These are specific, actionable changes we'd implement for your business:</p>

  <div class="advice-grid">
    ${r.actionableAdvice.map((a) => renderAdviceCard(a)).join('')}
  </div>
</div>

<!-- ═══ WHAT WE DO ═══ -->
<div class="slide">
  <div class="section-label">How We Help</div>
  <h2>The Backend System We Build for You</h2>
  <p>You focus on creating content. We handle everything else:</p>

  <div class="service-grid">
    <div class="service-card">
      <h3>LTK Operations</h3>
      <p>We run your LTK storefront like a business.</p>
      <ul>
        <li>40-80 boards posted per month</li>
        <li>Product linking & caption optimization</li>
        <li>Seasonal collections & capsule planning</li>
        <li>Conversion-focused CTAs on every board</li>
      </ul>
    </div>
    <div class="service-card">
      <h3>Amazon Monetization</h3>
      <p>Turn product recs into Amazon revenue.</p>
      <ul>
        <li>Storefront setup & optimization</li>
        <li>Creator Connections campaign management</li>
        <li>Shoppable video content planning</li>
        <li>Performance tracking & reporting</li>
      </ul>
    </div>
    <div class="service-card">
      <h3>Brand Partnerships</h3>
      <p>We find and close brand deals for you.</p>
      <ul>
        <li>Brand target list (30+ brands)</li>
        <li>Custom pitch angles per brand</li>
        <li>Deal negotiation & structuring</li>
        <li>Campaign management & reporting</li>
      </ul>
    </div>
    <div class="service-card">
      <h3>Content Strategy</h3>
      <p>Data-driven creative that converts.</p>
      <ul>
        <li>Content briefs with hook-first structure</li>
        <li>Repurposing loop (1 post → 5 touchpoints)</li>
        <li>A/B testing: formats, hooks, CTAs</li>
        <li>Monthly content calendar</li>
      </ul>
    </div>
  </div>
</div>

<!-- ═══ BRAND TARGETS ═══ -->
<div class="slide">
  <div class="section-label">Brand Opportunities</div>
  <h2>Brands That Should Be on Your Radar</h2>
  <p>Based on your ${esc(p.category)} audience, these are brands we'd target in our first outreach wave:</p>

  <div style="display: flex; flex-wrap: wrap; gap: 10px; margin: 20px 0;">
    ${r.strategy.brandTargets.slice(0, 10).map((b) => `
    <div style="background: var(--surface); border: 1px solid var(--border); padding: 10px 18px; border-radius: 8px; font-size: 14px;">
      <span style="color: var(--text-bright);">${esc(b.name)}</span>
    </div>`).join('')}
  </div>

  ${r.strategy.pitchAngles.length > 0 ? `
  <div style="margin-top: 24px;">
    <h3 style="font-size: 16px; color: var(--text-bright); margin-bottom: 12px;">How We'd Pitch You</h3>
    ${r.strategy.pitchAngles.slice(0, 2).map((a) => `
    <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 20px; margin-bottom: 12px;">
      <div style="font-size: 14px; color: var(--accent); font-weight: 600; margin-bottom: 6px;">${esc(a.title)}</div>
      <div style="font-size: 13px; color: var(--text); font-style: italic; margin-bottom: 6px;">"${esc(a.hook)}"</div>
      <div style="font-size: 13px; color: var(--text-muted);">${esc(a.value)}</div>
    </div>`).join('')}
  </div>` : ''}
</div>

<!-- ═══ CTA ═══ -->
<div class="slide cta-slide">
  <h2>Ready to Scale Your Revenue?</h2>
  <p style="color: var(--text-muted); font-size: 16px; max-width: 500px; margin: 0 auto;">
    This is just the overview. On a quick call, we can walk through specific numbers and build a custom plan for your business.
  </p>
  <a class="cta-btn" href="#">Book a 15-Minute Strategy Call</a>
  <div class="cta-sub">No commitment. Just a conversation about your growth potential.</div>
  <div style="margin-top: 40px; font-size: 13px; color: var(--text-muted);">
    ${esc(c.agencyName)} &bull; ${c.contactEmail ? esc(c.contactEmail) + ' &bull; ' : ''}Affiliate Monetization Operations for Creators
  </div>
</div>

</body>
</html>`;
}

// ── Advice Card Renderer ─────────────────────────────────────

function renderAdviceCard(a: ActionableAdvice): string {
  const effortLabel: Record<string, string> = { 'quick-win': 'Quick Win', 'moderate': 'Moderate', 'project': 'Project' };
  const effortClass: Record<string, string> = { 'quick-win': 'tag-quick', 'moderate': 'tag-moderate', 'project': 'tag-project' };

  return `
  <div class="advice-card">
    <div class="advice-indicator impact-${a.impact}"></div>
    <div class="advice-content">
      <h3>${esc(a.title)}</h3>
      <div class="obs">${esc(a.observation)}</div>
      <div class="rec">${esc(a.recommendation)}</div>
      <div class="advice-tags">
        <span class="advice-tag ${effortClass[a.effort]}">${effortLabel[a.effort]}</span>
        <span class="advice-tag" style="background: var(--surface2); color: var(--text-muted);">${a.category}</span>
      </div>
    </div>
  </div>`;
}

// ── Revenue Estimation ───────────────────────────────────────

function estimateRevenue(
  p: ProspectData,
  ig?: import('./instagram-fetcher').IGCreatorResearch,
): string {
  const followers = ig?.profile.followers_count || p.platforms.reduce((s, pl) => s + (pl.followers || 0), 0);
  let low = 1500;
  let high = 4000;

  if (followers > 200000) { low = 5000; high = 15000; }
  else if (followers > 100000) { low = 3000; high = 10000; }
  else if (followers > 50000) { low = 2000; high = 7000; }
  else if (followers > 20000) { low = 1500; high = 5000; }

  if (!p.amazonStatus.hasStorefront) { low += 500; high += 2000; }
  if (!p.ltkStatus.active) { low += 500; high += 1500; }

  return `$${fmtNum(low)} – $${fmtNum(high)}/month`;
}

// ── Helpers ──────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatLane(lane: string): string {
  const labels: Record<string, string> = {
    'ltk-first': 'LTK Growth',
    'amazon-affiliate-plus': 'Amazon Affiliate+',
    'amazon-scr': 'Amazon SCR',
    'hybrid': 'Hybrid Monetization',
    'brand-partnerships': 'Brand Partnerships',
  };
  return labels[lane] || lane;
}
