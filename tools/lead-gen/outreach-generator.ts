// ============================================================
// Lead Gen Automation — Cold Outreach Message Generator
// ============================================================
// Generates personalized outreach messages across Instagram DM,
// Email, and LinkedIn for each prospect. Creates 3 variants
// per channel (warm/direct, data-driven, soft invite) plus
// follow-ups and hook menus.
// ============================================================

import {
  ProspectData,
  OutreachMessage,
  OutreachOutput,
  GrowthLane,
} from './types';
import { determineGrowthLane } from './proposal-brain';

// ── Public API ───────────────────────────────────────────────

export function generateOutreach(prospect: ProspectData): OutreachOutput {
  const lane = determineGrowthLane(prospect);
  const messages: OutreachMessage[] = [
    // Instagram DMs
    ...generateInstagramDMs(prospect, lane),
    // Emails
    ...generateEmails(prospect, lane),
    // LinkedIn
    ...generateLinkedIn(prospect, lane),
  ];

  const hookMenu = generateHookMenu(prospect, lane);
  const subjectLines = generateSubjectLines(prospect, lane);

  return { prospect, messages, hookMenu, subjectLines };
}

// ── Instagram DMs ───────────────────────────────────────────

function generateInstagramDMs(p: ProspectData, lane: GrowthLane): OutreachMessage[] {
  const firstName = p.name.split(' ')[0];
  const cat = p.category.toLowerCase();

  return [
    {
      channel: 'instagram-dm',
      variant: 'warm-direct',
      body: `Hey ${firstName}! 👋

I was looking through your ${ltkOrContent(p)} and love how consistently you're sharing ${categoryContent(cat)}.

A lot of creators we work with in the ${cat} space are doing the same thing but hit a ceiling with the backend work — linking products, building boards, captions, collections.

We run the affiliate monetization backend for creators so they can focus on filming while we handle all the linking, boards, and brand outreach.

Would it be helpful if I sent over a quick monetization audit showing some opportunities we see for your storefront?`,
      followUp48h: `Hey ${firstName} — just bumping this up! Happy to send a quick 1-page audit of opportunities for your ${ltkOrContent(p)}. No strings attached, just thought it'd be valuable. 🙌`,
      followUp7d: `Hey ${firstName}! Last follow up from me — we just helped a ${cat} creator increase their LTK revenue by 3x in 60 days by optimizing their backend system. If you're ever curious about something similar, I'm here. Either way, love your content!`,
    },
    {
      channel: 'instagram-dm',
      variant: 'data-driven',
      body: `Hey ${firstName}!

I research ${cat} creators on LTK and your content stood out.

Quick context: we help creators turn their existing audience into a structured affiliate revenue engine. A few things I noticed looking at your storefront:

${getDataObservations(p)}

We typically help creators like you add $2K-$8K/month in affiliate revenue just by optimizing the backend system.

Would a quick audit be useful? I can send a one-pager.`,
      followUp48h: `Hey ${firstName} — wanted to follow up on my note. I put together a quick overview of monetization opportunities for ${cat} creators with your audience size. Happy to share if you're interested!`,
      followUp7d: `Hey ${firstName} — one last bump from me. We're running a free monetization audit for ${cat} creators this month. If you ever want to see what your affiliate revenue potential looks like, just let me know. No pressure at all!`,
    },
    {
      channel: 'instagram-dm',
      variant: 'soft-invite',
      body: `Hey ${firstName}! Love your ${categoryContent(cat)} content. 🔥

Random question — do you currently have help managing your LTK boards and product linking, or do you handle all of that yourself?

I work with ${cat} creators on the monetization side and was just curious how you've set things up.`,
      followUp48h: `Hey ${firstName} — just curious if you saw my message! No pitch, genuinely curious how you're handling the affiliate backend side of things. Always interested in learning how other ${cat} creators run their systems.`,
      followUp7d: `Hey ${firstName} — I'll leave you be after this! Just wanted to say we released a free guide on optimizing LTK storefronts for ${cat} creators. Happy to send the link if you're ever curious. Keep up the great content!`,
    },
  ];
}

// ── Emails ───────────────────────────────────────────────────

function generateEmails(p: ProspectData, lane: GrowthLane): OutreachMessage[] {
  const firstName = p.name.split(' ')[0];
  const cat = p.category.toLowerCase();

  return [
    {
      channel: 'email',
      variant: 'warm-direct',
      subject: `Quick idea to scale your LTK + affiliate revenue`,
      body: `Hey ${firstName},

I came across your LTK while researching creators in the ${cat} space and saw how consistently you're sharing ${categoryContent(cat)}.

A lot of creators hit a ceiling because the backend work — linking products, building boards, captions, collections — becomes overwhelming. The content is great but the monetization system isn't structured for scale.

Our agency helps creators scale affiliate revenue by running the linking and storefront side so they can focus on content.

What we handle:
• LTK boards (40-80/month) — posting, linking, captions
• Amazon storefront optimization
• Brand outreach and deal negotiation
• Performance reporting

If helpful, I'd be happy to send over a quick monetization audit showing opportunities we see for your storefront.

Best,
[Your Name]`,
      followUp48h: `Hey ${firstName},

Just following up on my note from earlier this week. I put together a quick overview of monetization opportunities for your LTK and would love to share it.

No commitment needed — just thought it'd be valuable to see.

Best,
[Your Name]`,
      followUp7d: `Hey ${firstName},

Last follow up from me — we recently helped a ${cat} creator go from posting boards themselves to having a full affiliate backend system that generates revenue while they focus on content.

If you're ever curious about something similar, I'd love to chat. Either way, keep up the great work!

Best,
[Your Name]`,
    },
    {
      channel: 'email',
      variant: 'data-driven',
      subject: `Monetization gaps I noticed on your LTK storefront`,
      body: `Hey ${firstName},

I was researching ${cat} creators and came across your profile. After looking at your LTK and content, I noticed a few things:

${getDataObservations(p)}

We work with creators to close these gaps and typically see a 2-3x increase in affiliate revenue within 60-90 days.

Our system handles:
• LTK board creation and optimization (40-80 boards/month)
• Amazon storefront management
• Brand partnership outreach (15 targets/week)
• Weekly performance reporting

Would it be useful if I sent a one-page monetization audit for your storefront? Free, no strings.

Best,
[Your Name]`,
      followUp48h: `Hey ${firstName},

Following up on my email about the monetization opportunities I spotted on your storefront. I've put together a one-page audit — happy to send it over.

Best,
[Your Name]`,
      followUp7d: `Hey ${firstName},

One last note from me. We're offering free monetization audits for ${cat} creators this month — it takes about 10 minutes on a call and you'll walk away with a clear picture of where revenue is being left on the table.

If you're interested, just reply and I'll send the scheduling link.

Best,
[Your Name]`,
    },
    {
      channel: 'email',
      variant: 'soft-invite',
      subject: `Loved your ${cat} content — quick question`,
      body: `Hey ${firstName},

I came across your content in the ${cat} space and really enjoyed it. Your audience clearly trusts your recommendations.

I work with creators on the affiliate monetization side — specifically helping scale LTK, Amazon, and brand partnership revenue.

I'm curious: do you currently have help managing the backend of your affiliate business (linking, boards, collections, brand outreach), or do you handle everything yourself?

No pitch — genuinely curious how creators at your level are running things.

Best,
[Your Name]`,
      followUp48h: `Hey ${firstName},

Just bumping my note from earlier. Would love to hear how you're currently handling the affiliate/linking side of your business. Always learning from creators in the ${cat} space.

Best,
[Your Name]`,
      followUp7d: `Hey ${firstName},

Last follow up! We just published a free guide on scaling affiliate revenue for ${cat} creators. Happy to send the link if you'd find it valuable.

Either way, love your content. Keep it up!

Best,
[Your Name]`,
    },
  ];
}

// ── LinkedIn ─────────────────────────────────────────────────

function generateLinkedIn(p: ProspectData, lane: GrowthLane): OutreachMessage[] {
  const firstName = p.name.split(' ')[0];
  const cat = p.category.toLowerCase();

  return [
    {
      channel: 'linkedin',
      variant: 'warm-direct',
      body: `Hey ${firstName} — I came across your ${cat} content and was impressed by your audience engagement. We help creators scale their affiliate revenue (LTK + Amazon + brand deals) by running the backend operations. Would love to connect and share some ideas if you're open to it.`,
    },
    {
      channel: 'linkedin',
      variant: 'data-driven',
      body: `Hi ${firstName} — I specialize in helping ${cat} creators maximize their affiliate and brand partnership revenue. After looking at your online presence, I see a few high-impact opportunities. Would you be open to a 10-minute call to walk through them?`,
    },
    {
      channel: 'linkedin',
      variant: 'soft-invite',
      body: `Hi ${firstName}! Love your work in the ${cat} space. I work with creators on the business/monetization side and always enjoy connecting with people doing great work. Happy to be a resource if you ever have questions about scaling affiliate revenue.`,
    },
  ];
}

// ── Hook Menu ────────────────────────────────────────────────

function generateHookMenu(p: ProspectData, lane: GrowthLane): string[] {
  const firstName = p.name.split(' ')[0];
  const cat = p.category.toLowerCase();

  return [
    // LTK growth hooks
    `"I was looking at your LTK storefront and noticed a few quick wins that could increase your conversion rate..."`,
    `"A lot of ${cat} creators are leaving money on the table with their LTK boards — here's why..."`,
    // Amazon hooks
    `"Have you looked into Amazon Creator Connections? It's a goldmine for ${cat} creators and most don't know about it..."`,
    `"Your content would convert incredibly well on an Amazon storefront — here's what I mean..."`,
    // Brand deal hooks
    `"I put together a list of brands that should be paying you for partnerships based on your audience..."`,
    `"The way you share ${categoryContent(cat)} — brands in this space would pay premium retainers for that."`,
    // Hybrid hooks
    `"I help ${cat} creators turn their existing content into 3 revenue streams (LTK + Amazon + brands). Quick question..."`,
    `"Most creators monetize 10-20% of their content. We build systems to capture the other 80%."`,
    // Operations hooks
    `"Do you have help managing all the linking and backend stuff, or do you handle that solo?"`,
    `"I noticed you're posting great content — but your storefront could be working 3x harder for you."`,
  ];
}

// ── Subject Lines ────────────────────────────────────────────

function generateSubjectLines(p: ProspectData, lane: GrowthLane): string[] {
  const firstName = p.name.split(' ')[0];
  const cat = p.category.toLowerCase();

  return [
    `Quick idea to scale your LTK + affiliate revenue`,
    `Monetization gaps I noticed on your storefront`,
    `${firstName} — ${cat} creators are leaving money on the table`,
    `Loved your ${cat} content — quick question`,
    `A few revenue opportunities for ${firstName}`,
    `How ${cat} creators are adding $2K-$8K/month in affiliate revenue`,
    `Quick question about your LTK + Amazon setup`,
    `${firstName} — can I send you a free monetization audit?`,
  ];
}

// ── Helpers ──────────────────────────────────────────────────

function ltkOrContent(p: ProspectData): string {
  if (p.ltkUrl) return 'LTK';
  return 'content';
}

function categoryContent(cat: string): string {
  const map: Record<string, string> = {
    fashion: 'outfits and style picks',
    beauty: 'beauty and skincare recommendations',
    home: 'home and decor finds',
    interior: 'interior design and decor picks',
    lifestyle: 'lifestyle and product recommendations',
    fitness: 'fitness gear and workout picks',
    family: 'family and parenting product picks',
    food: 'food and kitchen finds',
    travel: 'travel gear and recommendations',
  };
  for (const [key, desc] of Object.entries(map)) {
    if (cat.includes(key)) return desc;
  }
  return 'product recommendations';
}

function getDataObservations(p: ProspectData): string {
  const observations: string[] = [];

  if (p.ltkStatus.active) {
    observations.push(`• Your LTK boards are generating traffic but there's room to increase posting frequency and optimize captions for conversion`);
  } else {
    observations.push(`• You don't appear to have an active LTK storefront — this is a major missed revenue opportunity for ${p.category} creators`);
  }

  if (!p.amazonStatus.hasStorefront) {
    observations.push(`• No Amazon Influencer storefront detected — this is leaving significant money on the table`);
  } else {
    observations.push(`• Your Amazon storefront could benefit from more structured product organization and regular video content`);
  }

  const totalFollowers = p.platforms.reduce((sum, pl) => sum + (pl.followers || 0), 0);
  if (totalFollowers > 30000) {
    observations.push(`• With ~${formatFollowers(totalFollowers)} followers, you should be commanding premium brand retainers (many creators at your size don't realize this)`);
  }

  if (!p.currentBrandPartners || p.currentBrandPartners.length === 0) {
    observations.push(`• I didn't see any recent brand partnerships — there's a huge opportunity to build a pipeline here`);
  }

  return observations.join('\n');
}

function formatFollowers(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}

// ── Render Outreach as HTML ─────────────────────────────────

export function renderOutreachHTML(output: OutreachOutput): string {
  const p = output.prospect;
  const firstName = p.name.split(' ')[0];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Outreach Plan — ${esc(p.name)}</title>
<style>
  :root {
    --accent: #4F9CF7;
    --bg: #0f1117;
    --surface: #181b23;
    --border: #2a2e3b;
    --text: #e4e6ed;
    --text-muted: #8b8fa3;
    --text-bright: #ffffff;
    --dm: #E1306C;
    --email: #4F9CF7;
    --linkedin: #0A66C2;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; background: var(--bg); color: var(--text); line-height: 1.65; }
  .container { max-width: 900px; margin: 0 auto; padding: 60px 40px; }
  .header { text-align: center; margin-bottom: 50px; }
  .header h1 { font-size: 28px; color: var(--text-bright); margin-bottom: 6px; }
  .header p { color: var(--text-muted); }

  .channel-section { margin-bottom: 48px; }
  .channel-label {
    display: inline-block;
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    padding: 4px 12px;
    border-radius: 4px;
    font-weight: 600;
    margin-bottom: 16px;
  }
  .channel-dm { background: #E1306C22; color: var(--dm); }
  .channel-email { background: #4F9CF722; color: var(--email); }
  .channel-linkedin { background: #0A66C222; color: var(--linkedin); }

  .variant { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 24px; margin-bottom: 16px; }
  .variant h3 { font-size: 14px; color: var(--accent); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
  .variant .subject { font-size: 13px; color: var(--text-muted); margin-bottom: 10px; }
  .variant pre {
    white-space: pre-wrap;
    font-family: inherit;
    font-size: 14px;
    color: var(--text);
    background: var(--bg);
    padding: 16px;
    border-radius: 6px;
    margin-bottom: 12px;
  }
  .followup { padding: 12px; background: var(--bg); border-radius: 6px; margin-top: 10px; }
  .followup-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  .followup pre { margin: 0; padding: 0; background: transparent; }

  .hooks { margin-top: 48px; }
  .hooks h2 { font-size: 20px; color: var(--text-bright); margin-bottom: 16px; }
  .hook-item {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 14px 18px;
    margin-bottom: 10px;
    font-size: 14px;
    font-style: italic;
    color: var(--text);
  }

  .subjects { margin-top: 48px; }
  .subjects h2 { font-size: 20px; color: var(--text-bright); margin-bottom: 16px; }
  .subject-item {
    display: inline-block;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 8px 16px;
    margin: 4px;
    font-size: 13px;
  }

  @media (max-width: 700px) {
    .container { padding: 30px 20px; }
  }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>Outreach Plan: ${esc(p.name)}</h1>
    <p>${esc(p.category)} &bull; ${p.platforms.map((pl) => pl.platform).join(', ')}</p>
  </div>

  ${renderChannelSection('Instagram DM', 'dm', output.messages.filter((m) => m.channel === 'instagram-dm'))}
  ${renderChannelSection('Email', 'email', output.messages.filter((m) => m.channel === 'email'))}
  ${renderChannelSection('LinkedIn', 'linkedin', output.messages.filter((m) => m.channel === 'linkedin'))}

  <div class="hooks">
    <h2>Hook Menu — Opening Lines</h2>
    ${output.hookMenu.map((h) => `<div class="hook-item">${esc(h)}</div>`).join('\n    ')}
  </div>

  <div class="subjects">
    <h2>Email Subject Lines</h2>
    ${output.subjectLines.map((s) => `<span class="subject-item">${esc(s)}</span>`).join('\n    ')}
  </div>
</div>
</body>
</html>`;
}

function renderChannelSection(title: string, channelClass: string, messages: OutreachMessage[]): string {
  if (messages.length === 0) return '';
  const variantLabels: Record<string, string> = {
    'warm-direct': 'Version A — Warm & Direct',
    'data-driven': 'Version B — Data-Driven',
    'soft-invite': 'Version C — Soft Invite',
  };

  return `
  <div class="channel-section">
    <div class="channel-label channel-${channelClass}">${esc(title)}</div>
    ${messages.map((m) => `
    <div class="variant">
      <h3>${esc(variantLabels[m.variant] || m.variant)}</h3>
      ${m.subject ? `<div class="subject">Subject: ${esc(m.subject)}</div>` : ''}
      <pre>${esc(m.body)}</pre>
      ${m.followUp48h ? `
      <div class="followup">
        <div class="followup-label">Follow-up (48 hours)</div>
        <pre>${esc(m.followUp48h)}</pre>
      </div>` : ''}
      ${m.followUp7d ? `
      <div class="followup">
        <div class="followup-label">Follow-up (7 days)</div>
        <pre>${esc(m.followUp7d)}</pre>
      </div>` : ''}
    </div>`).join('')}
  </div>`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
