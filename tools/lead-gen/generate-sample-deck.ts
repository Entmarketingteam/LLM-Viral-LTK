// Quick script to generate sample pitch decks for a "Google Sheet" creator
import * as fs from 'fs';
import * as path from 'path';
import { ProspectData } from './types';
import { generatePitchDeck } from './pitch-deck-generator';
import { generateVisualPitchDeck } from './visual-pitch-deck';
import { scoreCreator } from './signal-scorer';
import { generateStrategy } from './proposal-brain';
import { CreatorResearchPackage, ActionableAdvice } from './creator-research-engine';

// Simulated creator from the agency outreach Google Sheet
const prospect: ProspectData = {
  name: 'Brittany Sjogren',
  username: 'loverlygrey',
  category: 'Fashion',
  platforms: [
    { platform: 'instagram', followers: 180000, url: 'https://instagram.com/loverlygrey' },
    { platform: 'ltk', url: 'https://www.shopltk.com/explore/loverlygrey' },
    { platform: 'pinterest', followers: 45000 },
    { platform: 'tiktok', followers: 22000 },
  ],
  ltkStatus: { active: true, boardCount: 25, postFrequency: '5-6/week' },
  amazonStatus: { hasStorefront: false, hasAssociates: false },
  contentStyleStrengths: ['outfit styling', 'try-on hauls', 'seasonal capsules', 'daily finds'],
  painPoints: ['overwhelmed with linking', 'not structured for scale', 'no Amazon presence'],
  currentBrandPartners: ['Nordstrom', 'Abercrombie', 'Free People'],
  priorityScore: 85,
  verified: true,
  email: 'brittany@loverlygrey.com',
  ltkUrl: 'https://www.shopltk.com/explore/loverlygrey',
  instagramUrl: 'https://instagram.com/loverlygrey',
};

// Generate the standard pitch deck
const pitchDeck = generatePitchDeck(prospect);

// Build a mock research package for the visual pitch deck
const scoring = scoreCreator(prospect);
const strategy = generateStrategy(prospect);

const mockAdvice: ActionableAdvice[] = [
  {
    category: 'amazon',
    title: 'Launch Amazon Influencer Storefront',
    observation: 'You have 180K followers recommending products daily but no Amazon storefront — your audience is buying on Amazon and you\'re earning $0 from those purchases.',
    recommendation: 'Set up your Amazon Influencer storefront with 5 initial idea lists mirroring your top LTK categories. We can have this live in 48 hours and earning commissions immediately.',
    impact: 'high',
    effort: 'quick-win',
  },
  {
    category: 'ltk',
    title: 'Optimize LTK Board Structure for Discovery',
    observation: 'Your 25 boards are driving solid engagement, but the naming and organization could improve your search visibility within LTK\'s algorithm.',
    recommendation: 'Restructure boards using keyword-rich titles (e.g., "Spring Outfit Ideas Under $50" vs "Spring Vibes"). Add 3-5 product tags per post. This alone can increase LTK impressions by 30-40%.',
    impact: 'high',
    effort: 'moderate',
  },
  {
    category: 'monetization',
    title: 'Add Brand Partnership Revenue Stream',
    observation: 'With 180K engaged followers and active brand relationships (Nordstrom, Abercrombie), you\'re likely under-charging or only doing gifted collabs.',
    recommendation: 'We\'d build a media kit, set rate cards ($2,500-$4,000/post at your size), and actively pitch 15-20 brands per quarter. Creators your size typically close 2-4 paid deals/month.',
    impact: 'high',
    effort: 'project',
  },
  {
    category: 'content',
    title: 'Repurpose LTK Content to TikTok & Reels',
    observation: 'Your TikTok has 22K followers but inconsistent posting. Your LTK content (try-ons, hauls) is exactly what performs on short-form video.',
    recommendation: 'Create a 1-to-5 repurposing loop: every LTK try-on becomes a TikTok, Reel, Story, Pin, and email. This 5x\'s your content output without 5x the work.',
    impact: 'medium',
    effort: 'moderate',
  },
  {
    category: 'instagram',
    title: 'Implement Story Selling Framework',
    observation: 'Stories are the #1 driver of LTK clicks and affiliate revenue, but most creators post stories without a conversion structure.',
    recommendation: 'Use our 3-frame story selling sequence: Hook (problem/question) → Show (product in context) → Link (clear CTA with LTK link sticker). Expect 2-3x improvement in link clicks.',
    impact: 'medium',
    effort: 'quick-win',
  },
  {
    category: 'brand',
    title: 'Build Brand Target Hit List',
    observation: 'You have existing relationships with Nordstrom and Abercrombie but no systematic outreach to expand your brand roster.',
    recommendation: 'We\'d build a 30-brand target list across fashion, beauty, and lifestyle verticals with custom pitch angles for each. Priority targets: Anthropologie, Revolve, Sephora, Skims, Mejuri.',
    impact: 'medium',
    effort: 'moderate',
  },
];

const researchPackage: CreatorResearchPackage = {
  prospect,
  instagram: undefined, // No real IG data in demo
  screenshots: undefined,
  scoring,
  strategy,
  actionableAdvice: mockAdvice,
  screenshotBase64Map: {},
  researchedAt: new Date().toISOString(),
};

// Generate both decks
const outDir = path.resolve('output', 'sample-decks');
fs.mkdirSync(outDir, { recursive: true });

// 1. Standard brand partnership pitch deck
fs.writeFileSync(path.join(outDir, 'brand-pitch-deck.html'), pitchDeck.html);
console.log(`Brand Pitch Deck → ${outDir}/brand-pitch-deck.html`);

// 2. Visual growth opportunity pitch deck (what you send to creators)
const visualDeck = generateVisualPitchDeck(researchPackage);
fs.writeFileSync(path.join(outDir, 'visual-pitch-deck.html'), visualDeck);
console.log(`Visual Pitch Deck → ${outDir}/visual-pitch-deck.html`);

console.log('\nDone! Open these HTML files in your browser to preview.');
