// ============================================================
// Lead Gen Automation — Auto-Reply Proposal Pipeline
// ============================================================
// When a creator replies to cold outreach, this pipeline:
// 1. Takes their profile data (from spreadsheet + any new info)
// 2. Runs the full research engine (IG API + screenshots)
// 3. Generates a visual pitch deck with real data
// 4. Generates a full proposal
// 5. Generates a personalized follow-up reply
// 6. Packages everything ready to send
//
// Usage:
//   Pipeline can be triggered via:
//   - CLI: npx tsx tools/lead-gen/auto-reply-pipeline.ts
//   - API: POST /api/v1/lead-gen/auto-reply
//   - Programmatically: import { runAutoReplyPipeline }
// ============================================================

import * as fs from 'fs';
import * as path from 'path';
import { ProspectData, GeneratorConfig, DEFAULT_CONFIG } from './types';
import { runCreatorResearch, CreatorResearchPackage } from './creator-research-engine';
import { generateVisualPitchDeck } from './visual-pitch-deck';
import { generateProposal } from './proposal-generator';
import { generateAudit } from './audit-generator';
import { generateOutreach, renderOutreachHTML } from './outreach-generator';

// ── Types ────────────────────────────────────────────────────

export interface AutoReplyInput {
  /** The prospect who replied */
  prospect: ProspectData;
  /** Their reply message (optional — used to personalize response) */
  replyMessage?: string;
  /** Channel they replied on */
  replyChannel?: 'instagram-dm' | 'email' | 'linkedin';
  /** Skip browser screenshots (faster) */
  skipScreenshots?: boolean;
  /** Skip Instagram API (if no token available) */
  skipInstagram?: boolean;
  /** Agency config */
  config?: Partial<GeneratorConfig>;
}

export interface AutoReplyOutput {
  /** The research package (IG data + screenshots + scoring) */
  research: CreatorResearchPackage;
  /** Visual pitch deck HTML — the main deliverable to send */
  pitchDeckHTML: string;
  /** Full proposal HTML — send if they ask for pricing */
  proposalHTML: string;
  /** Monetization audit HTML — lightweight lead magnet */
  auditHTML: string;
  /** Personalized reply message to send back */
  replyMessage: string;
  /** All generated file paths */
  files: Record<string, string>;
  /** Output directory */
  outputDir: string;
  /** Pipeline timing */
  timing: {
    startedAt: string;
    completedAt: string;
    durationSeconds: number;
  };
}

// ── Main Pipeline ────────────────────────────────────────────

export async function runAutoReplyPipeline(
  input: AutoReplyInput,
): Promise<AutoReplyOutput> {
  const startedAt = new Date();
  const config = { ...DEFAULT_CONFIG, ...input.config };
  const p = input.prospect;

  const outputDir = path.join(process.cwd(), 'output', 'auto-reply', sanitize(p.name) + '-' + Date.now());
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Auto-Reply Pipeline: ${p.name}`);
  console.log(`${'='.repeat(60)}`);

  // ── Step 1: Research ──
  console.log('\n[1/5] Running creator research...');
  const research = await runCreatorResearch(p, {
    fetchInstagram: !input.skipInstagram,
    captureScreenshots: !input.skipScreenshots,
    embedScreenshots: true,
    headless: true,
    outputDir,
  });

  // ── Step 2: Visual Pitch Deck ──
  console.log('[2/5] Generating visual pitch deck...');
  const pitchDeckHTML = generateVisualPitchDeck(research, config);
  const pitchDeckPath = path.join(outputDir, 'pitch-deck.html');
  fs.writeFileSync(pitchDeckPath, pitchDeckHTML);

  // ── Step 3: Full Proposal ──
  console.log('[3/5] Generating full proposal...');
  const proposalResult = generateProposal(research.prospect);
  const proposalPath = path.join(outputDir, 'proposal.html');
  fs.writeFileSync(proposalPath, proposalResult.html);

  // ── Step 4: Monetization Audit ──
  console.log('[4/5] Generating monetization audit...');
  const auditResult = generateAudit(research.prospect, config);
  const auditPath = path.join(outputDir, 'audit.html');
  fs.writeFileSync(auditPath, auditResult.html);

  // ── Step 5: Reply Message ──
  console.log('[5/5] Crafting reply message...');
  const replyMessage = craftReplyMessage(input, research);
  const replyPath = path.join(outputDir, 'reply-message.txt');
  fs.writeFileSync(replyPath, replyMessage);

  // ── Save metadata ──
  const completedAt = new Date();
  const files: Record<string, string> = {
    'pitch-deck': pitchDeckPath,
    'proposal': proposalPath,
    'audit': auditPath,
    'reply-message': replyPath,
  };

  const metadata = {
    prospect: p.name,
    tier: research.scoring.tier,
    score: research.scoring.percentage,
    lane: research.strategy.growthLane,
    files,
    timing: {
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationSeconds: Math.round((completedAt.getTime() - startedAt.getTime()) / 1000),
    },
  };
  fs.writeFileSync(path.join(outputDir, 'pipeline-metadata.json'), JSON.stringify(metadata, null, 2));

  console.log(`\nPipeline complete in ${metadata.timing.durationSeconds}s`);
  console.log(`Output: ${outputDir}`);
  console.log(`Score: ${research.scoring.percentage}% (${research.scoring.tier})`);
  console.log(`Lane: ${research.strategy.growthLane}`);

  return {
    research,
    pitchDeckHTML,
    proposalHTML: proposalResult.html,
    auditHTML: auditResult.html,
    replyMessage,
    files,
    outputDir,
    timing: {
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationSeconds: metadata.timing.durationSeconds,
    },
  };
}

// ── Reply Message Crafting ───────────────────────────────────

function craftReplyMessage(
  input: AutoReplyInput,
  research: CreatorResearchPackage,
): string {
  const p = input.prospect;
  const firstName = p.name.split(' ')[0];
  const ig = research.instagram;
  const scoring = research.scoring;
  const advice = research.actionableAdvice;

  const channel = input.replyChannel || 'email';
  const highImpactCount = advice.filter((a) => a.impact === 'high').length;
  const quickWinCount = advice.filter((a) => a.effort === 'quick-win').length;

  // ── DM Reply (short, conversational) ──
  if (channel === 'instagram-dm') {
    return `Hey ${firstName}! Thanks so much for getting back to me.

I actually went ahead and put together a quick overview of what I see for your business — ${highImpactCount} high-impact opportunities and ${quickWinCount} quick wins that could start making a difference pretty quickly.

${ig ? `A few things that jumped out:
- Your engagement rate is ${ig.engagement.avgEngagementRate}% which is ${ig.engagement.avgEngagementRate >= 2 ? 'solid' : 'something we can improve'}
- ${ig.monetization.sponsoredPostCount === 0 ? 'You should definitely be getting brand deals with your audience size' : `You're doing some sponsored content which is great — we can help scale that`}
- ${!p.amazonStatus.hasStorefront ? 'No Amazon storefront yet — that\'s a big revenue gap we can close' : 'Your Amazon storefront could be working harder for you'}` : ''}

I put together a personalized growth overview for you — want me to send it over? It's a one-pager showing the specific opportunities and what we'd do.

No pressure at all — happy to answer any questions either way!`;
  }

  // ── LinkedIn Reply ──
  if (channel === 'linkedin') {
    return `Hi ${firstName}, thanks for connecting!

I took a closer look at your online presence and put together a personalized growth overview for you — covering ${highImpactCount} high-impact monetization opportunities specific to your ${p.category.toLowerCase()} content.

Would you like me to send it over? It's a one-pager with specific observations and actionable recommendations. No strings attached.`;
  }

  // ── Email Reply (detailed) ──
  return `Hey ${firstName},

Thanks for getting back to me — really appreciate it.

I went ahead and did a deep dive on your online presence and put together a personalized growth overview for you. Here's a quick preview of what I found:

${ig ? `YOUR CURRENT PRESENCE:
- ${fmtNum(ig.profile.followers_count)} Instagram followers
- ${ig.engagement.avgEngagementRate}% engagement rate (${ig.engagement.avgEngagementRate >= 3 ? 'excellent' : ig.engagement.avgEngagementRate >= 2 ? 'good — room to grow' : 'below average — we can fix this'})
- ${ig.engagement.postingFrequency} posting frequency
- ${ig.monetization.sponsoredPostCount} sponsored posts detected
- ${ig.monetization.affiliateLinkCount} posts with affiliate signals

` : ''}WHAT I SEE:
${advice.slice(0, 3).map((a, i) => `${i + 1}. ${a.title}: ${a.observation}`).join('\n')}

BOTTOM LINE:
I identified ${highImpactCount} high-impact opportunities and ${quickWinCount} quick wins for your business. ${quickWinCount > 0 ? `The quick wins alone could start generating additional revenue within the first 2 weeks.` : ''}

I've attached a visual overview showing everything in detail — your current presence, the gaps I found, specific advice, and the brands that should be on your radar.

If it's helpful, I'm happy to jump on a quick 15-minute call to walk through it together.

Best,
[Your Name]
${input.config?.agencyName || DEFAULT_CONFIG.agencyName}`;
}

// ── Batch Auto-Reply ─────────────────────────────────────────

export async function batchAutoReply(
  inputs: AutoReplyInput[],
): Promise<AutoReplyOutput[]> {
  const results: AutoReplyOutput[] = [];

  for (const input of inputs) {
    try {
      const result = await runAutoReplyPipeline(input);
      results.push(result);
    } catch (err) {
      console.error(`Pipeline failed for ${input.prospect.name}:`, err);
    }
  }

  return results;
}

// ── Helpers ──────────────────────────────────────────────────

function sanitize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function fmtNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}

// ── CLI ──────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.length === 0) {
    console.log(`
Auto-Reply Proposal Pipeline
==============================
When a creator replies to your outreach, run this pipeline to
auto-generate a visual pitch deck, proposal, audit, and reply
message with real data + screenshots.

Usage:
  npx tsx tools/lead-gen/auto-reply-pipeline.ts --name "Name" --username handle --category Fashion [options]
  npx tsx tools/lead-gen/auto-reply-pipeline.ts --prospect <file.json>
  npx tsx tools/lead-gen/auto-reply-pipeline.ts --demo

Options:
  --name <name>           Creator name
  --username <handle>     Instagram username
  --category <category>   Creator category
  --ltk <url>             LTK storefront URL
  --amazon <url>          Amazon storefront URL
  --reply <message>       Their reply message (for personalization)
  --channel <channel>     Reply channel: instagram-dm, email, linkedin
  --no-ig                 Skip Instagram API
  --no-screenshots        Skip browser screenshots
  --prospect <file.json>  Load prospect from JSON file
  --demo                  Run with demo data (no API/screenshots)
`);
    return;
  }

  const getArg = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx >= 0 ? args[idx + 1] : undefined;
  };

  // Demo mode
  if (args.includes('--demo')) {
    const demoProspect: ProspectData = {
      name: 'Brittany Sjogren',
      username: 'loverlygrey',
      category: 'Fashion',
      platforms: [
        { platform: 'instagram', followers: 180000 },
        { platform: 'ltk' },
      ],
      ltkStatus: { active: true, boardCount: 25 },
      amazonStatus: { hasStorefront: false, hasAssociates: false },
      contentStyleStrengths: ['outfit styling', 'try-ons', 'seasonal capsules'],
      painPoints: ['overwhelmed with linking', 'not structured for scale'],
      currentBrandPartners: ['Nordstrom', 'Abercrombie'],
      ltkUrl: 'https://www.shopltk.com/explore/loverlygrey',
    };

    await runAutoReplyPipeline({
      prospect: demoProspect,
      replyMessage: 'Hey! Yes I\'d love to hear more about what you do.',
      replyChannel: 'instagram-dm',
      skipScreenshots: true,
      skipInstagram: true,
    });
    return;
  }

  // Load from JSON file
  if (args.includes('--prospect')) {
    const filePath = getArg('--prospect');
    if (!filePath) {
      console.error('--prospect requires a file path');
      process.exit(1);
    }
    const prospect: ProspectData = JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf-8'));
    await runAutoReplyPipeline({
      prospect,
      replyMessage: getArg('--reply'),
      replyChannel: getArg('--channel') as AutoReplyInput['replyChannel'],
      skipScreenshots: args.includes('--no-screenshots'),
      skipInstagram: args.includes('--no-ig'),
    });
    return;
  }

  // Build prospect from CLI args
  const name = getArg('--name');
  if (!name) {
    console.error('--name is required');
    process.exit(1);
  }

  const prospect: ProspectData = {
    name,
    username: getArg('--username') || undefined,
    category: getArg('--category') || 'Lifestyle',
    platforms: [],
    ltkStatus: { active: !!getArg('--ltk') },
    amazonStatus: { hasStorefront: !!getArg('--amazon'), hasAssociates: false },
    ltkUrl: getArg('--ltk'),
    amazonStorefrontUrl: getArg('--amazon'),
  };

  if (prospect.username) {
    prospect.platforms.push({ platform: 'instagram' });
  }

  await runAutoReplyPipeline({
    prospect,
    replyMessage: getArg('--reply'),
    replyChannel: getArg('--channel') as AutoReplyInput['replyChannel'],
    skipScreenshots: args.includes('--no-screenshots'),
    skipInstagram: args.includes('--no-ig'),
  });
}

if (require.main === module) {
  main();
}
