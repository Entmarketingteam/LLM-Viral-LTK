// ============================================================
// Lead Gen Automation — Brand Partnership Pitch Deck Generator
// ============================================================
// Generates an HTML pitch deck used when pitching brands on
// behalf of a creator. Includes audience data, content
// capabilities, partnership options, and case study framework.
// ============================================================

import {
  ProspectData,
  PitchDeckOutput,
  BrandTarget,
  PitchAngle,
  ContentConcept,
  GeneratorConfig,
  DEFAULT_CONFIG,
} from './types';
import { getBrandTargetsForNiche } from './deliverables-library';
import { determineGrowthLane, generateStrategy } from './proposal-brain';

// ── Public API ───────────────────────────────────────────────

export function generatePitchDeck(
  prospect: ProspectData,
  targetBrand?: string,
  config: GeneratorConfig = DEFAULT_CONFIG,
): PitchDeckOutput {
  const strategy = generateStrategy(prospect);
  const brandTargets = strategy.brandTargets;
  const pitchAngles = strategy.pitchAngles;
  const contentConcepts = strategy.contentConcepts;

  const html = renderPitchDeckHTML(prospect, config, brandTargets, pitchAngles, contentConcepts, targetBrand);

  return {
    html,
    creatorName: prospect.name,
    brandTargets,
    pitchAngles,
    contentConcepts,
  };
}

// ── HTML Rendering ───────────────────────────────────────────

function renderPitchDeckHTML(
  p: ProspectData,
  c: GeneratorConfig,
  brands: BrandTarget[],
  angles: PitchAngle[],
  concepts: ContentConcept[],
  targetBrand?: string,
): string {
  const accent = c.accentColor || '#4F9CF7';
  const totalFollowers = p.platforms.reduce((sum, pl) => sum + (pl.followers || 0), 0);
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Partnership Deck — ${esc(p.name)}${targetBrand ? ` x ${esc(targetBrand)}` : ''}</title>
<style>
  :root {
    --accent: ${accent};
    --bg: #0f1117;
    --surface: #181b23;
    --surface2: #1f2330;
    --border: #2a2e3b;
    --text: #e4e6ed;
    --text-muted: #8b8fa3;
    --text-bright: #ffffff;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; background: var(--bg); color: var(--text); line-height: 1.65; }

  /* ── Slide layout ── */
  .slide {
    max-width: 960px;
    margin: 0 auto;
    padding: 80px 60px;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    border-bottom: 1px solid var(--border);
  }
  .slide:last-child { border-bottom: none; }

  /* ── Title slide ── */
  .title-slide { text-align: center; }
  .title-slide .pre { font-size: 13px; letter-spacing: 3px; text-transform: uppercase; color: var(--accent); margin-bottom: 16px; }
  .title-slide h1 { font-size: 42px; font-weight: 700; color: var(--text-bright); margin-bottom: 12px; }
  .title-slide .sub { font-size: 18px; color: var(--text-muted); margin-bottom: 24px; }
  .title-slide .meta { font-size: 13px; color: var(--text-muted); }

  /* ── Section headers ── */
  .slide-label {
    font-size: 11px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 10px;
  }
  .slide h2 { font-size: 28px; font-weight: 600; color: var(--text-bright); margin-bottom: 24px; }
  .slide p { margin-bottom: 14px; font-size: 15px; }

  /* ── Stats grid ── */
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 20px; margin: 24px 0; }
  .stat-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 24px;
    text-align: center;
  }
  .stat-card .value { font-size: 28px; font-weight: 700; color: var(--accent); margin-bottom: 4px; }
  .stat-card .label { font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }

  /* ── Platform pills ── */
  .platform-list { display: flex; flex-wrap: wrap; gap: 12px; margin: 16px 0; }
  .platform-pill {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 14px 20px;
    font-size: 14px;
  }
  .platform-pill strong { color: var(--text-bright); }
  .platform-pill span { color: var(--text-muted); margin-left: 6px; }

  /* ── Angle cards ── */
  .angle-cards { display: grid; gap: 20px; margin-top: 20px; }
  .angle-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 24px;
  }
  .angle-card h3 { font-size: 16px; color: var(--accent); margin-bottom: 8px; }
  .angle-card .hook { font-style: italic; color: var(--text); margin-bottom: 8px; }
  .angle-card .val { font-size: 13px; color: var(--text-muted); }

  /* ── Content concepts ── */
  .concept-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
  .concept-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 24px;
  }
  .concept-card h3 { font-size: 15px; color: var(--text-bright); margin-bottom: 4px; }
  .concept-card .format { font-size: 11px; color: var(--accent); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  .concept-card p { font-size: 13px; color: var(--text-muted); margin-bottom: 10px; }
  .concept-card ul { list-style: none; }
  .concept-card li { font-size: 12px; color: var(--text); padding: 3px 0 3px 14px; position: relative; }
  .concept-card li::before { content: ''; position: absolute; left: 0; top: 10px; width: 6px; height: 6px; background: var(--accent); border-radius: 50%; }

  /* ── Partnership options ── */
  .option-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 20px; }
  .option-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 24px;
  }
  .option-card h3 { font-size: 16px; color: var(--text-bright); margin-bottom: 8px; }
  .option-card .price { font-size: 20px; font-weight: 700; color: var(--accent); margin-bottom: 12px; }
  .option-card ul { list-style: none; }
  .option-card li { font-size: 13px; padding: 4px 0 4px 14px; position: relative; }
  .option-card li::before { content: ''; position: absolute; left: 0; top: 12px; width: 6px; height: 6px; background: var(--accent); border-radius: 50%; }

  /* ── CTA ── */
  .cta-slide { text-align: center; }
  .cta-slide h2 { font-size: 32px; margin-bottom: 16px; }
  .cta-slide p { font-size: 16px; color: var(--text-muted); margin-bottom: 24px; }
  .cta-btn {
    display: inline-block;
    padding: 16px 40px;
    background: var(--accent);
    color: #000;
    font-weight: 600;
    border-radius: 8px;
    text-decoration: none;
    font-size: 16px;
  }

  @media (max-width: 700px) {
    .slide { padding: 40px 24px; min-height: auto; }
    .title-slide h1 { font-size: 28px; }
    .option-grid, .concept-grid { grid-template-columns: 1fr; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
  }
</style>
</head>
<body>

  <!-- ── Title Slide ── -->
  <div class="slide title-slide">
    <div class="pre">${targetBrand ? `${esc(targetBrand)} x` : 'Partnership Opportunity with'}</div>
    <h1>${esc(p.name)}</h1>
    <div class="sub">${esc(p.category)} Creator &bull; Affiliate & Content Partner</div>
    <div class="meta">Prepared by ${esc(c.agencyName)} &bull; ${date}</div>
  </div>

  <!-- ── About / Audience ── -->
  <div class="slide">
    <div class="slide-label">About</div>
    <h2>${esc(p.name)}</h2>
    <p>${esc(p.name)} is a ${esc(p.category)} creator with a highly engaged audience that trusts their product recommendations. Their content drives real purchasing behavior — not just views.</p>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="value">${formatNumber(totalFollowers)}</div>
        <div class="label">Total Audience</div>
      </div>
      <div class="stat-card">
        <div class="value">${p.platforms.length}</div>
        <div class="label">Active Platforms</div>
      </div>
      <div class="stat-card">
        <div class="value">${esc(p.category)}</div>
        <div class="label">Primary Niche</div>
      </div>
      ${p.ltkStatus.active ? `
      <div class="stat-card">
        <div class="value">Active</div>
        <div class="label">LTK Creator</div>
      </div>` : ''}
    </div>

    <div class="platform-list">
      ${p.platforms.map((pl) => `
      <div class="platform-pill">
        <strong>${capitalize(pl.platform)}</strong>
        ${pl.followers ? `<span>${formatNumber(pl.followers)} followers</span>` : ''}
      </div>`).join('')}
    </div>
  </div>

  <!-- ── Why Partner ── -->
  <div class="slide">
    <div class="slide-label">Pitch Angles</div>
    <h2>Why Partner with ${esc(p.name)}</h2>
    <div class="angle-cards">
      ${angles.map((a) => `
      <div class="angle-card">
        <h3>${esc(a.title)}</h3>
        <div class="hook">${esc(a.hook)}</div>
        <div class="val">${esc(a.value)}</div>
      </div>`).join('')}
    </div>
  </div>

  <!-- ── Content Concepts ── -->
  <div class="slide">
    <div class="slide-label">Creative</div>
    <h2>Content Concepts</h2>
    <p>Tailored content ideas designed for ${esc(p.category)} audience conversion:</p>
    <div class="concept-grid">
      ${concepts.map((co) => `
      <div class="concept-card">
        <h3>${esc(co.title)}</h3>
        <div class="format">${esc(co.format)}</div>
        <p>${esc(co.description)}</p>
        <ul>
          ${co.deliverables.map((d) => `<li>${esc(d)}</li>`).join('\n          ')}
        </ul>
      </div>`).join('')}
    </div>
  </div>

  <!-- ── Partnership Options ── -->
  <div class="slide">
    <div class="slide-label">Partnership Options</div>
    <h2>How We Can Work Together</h2>
    <div class="option-grid">
      <div class="option-card">
        <h3>Affiliate Campaign</h3>
        <div class="price">Performance</div>
        <ul>
          <li>Commission on sales driven</li>
          <li>LTK + Amazon storefront placement</li>
          <li>3 content pieces</li>
          <li>30-day campaign window</li>
        </ul>
      </div>
      <div class="option-card">
        <h3>Content Package</h3>
        <div class="price">Flat Fee</div>
        <ul>
          <li>6 content deliverables</li>
          <li>1 Reel + 1 LTK board + 4 stories</li>
          <li>Usage rights (90 days)</li>
          <li>One round of revisions</li>
        </ul>
      </div>
      <div class="option-card">
        <h3>Hybrid Retainer</h3>
        <div class="price">Fee + Performance</div>
        <ul>
          <li>Monthly content cadence</li>
          <li>Ongoing affiliate placement</li>
          <li>Quarterly strategy alignment</li>
          <li>Priority access + whitelisting</li>
        </ul>
      </div>
    </div>
  </div>

  <!-- ── CTA Slide ── -->
  <div class="slide cta-slide">
    <h2>Let's Build Something Great</h2>
    <p>Ready to reach ${formatNumber(totalFollowers)}+ engaged ${esc(p.category)} consumers through authentic content?</p>
    <a class="cta-btn" href="#">Start the Conversation</a>
    <div style="margin-top: 30px; font-size: 13px; color: var(--text-muted);">
      ${esc(c.agencyName)} &bull; ${c.contactEmail ? esc(c.contactEmail) : 'hello@creativepulse.agency'}
    </div>
  </div>

</body>
</html>`;
}

// ── Helpers ──────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
