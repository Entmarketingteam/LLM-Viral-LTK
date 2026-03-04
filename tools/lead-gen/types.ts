// ============================================================
// Lead Gen Automation — Type Definitions
// ============================================================

/** Prospect data from spreadsheet row */
export interface ProspectData {
  name: string;
  username?: string;
  category: string;
  platforms: PlatformPresence[];
  audienceDemo?: string;
  ltkStatus: LTKStatus;
  amazonStatus: AmazonStatus;
  contentStyleStrengths?: string[];
  painPoints?: string[];
  currentBrandPartners?: string[];
  desiredMonthlyIncome?: number;
  timing?: string;
  priorityScore?: number;
  verified?: boolean;
  instagramUrl?: string;
  ltkUrl?: string;
  amazonStorefrontUrl?: string;
  mediaKitUrl?: string;
  youtubeUrl?: string;
  tiktokUrl?: string;
  email?: string;
  notes?: string;
}

export interface PlatformPresence {
  platform: 'instagram' | 'tiktok' | 'youtube' | 'pinterest' | 'ltk' | 'amazon' | 'blog';
  url?: string;
  followers?: number;
}

export interface LTKStatus {
  active: boolean;
  estimatedGMV?: number;
  estimatedEarnings?: number;
  boardCount?: number;
  postFrequency?: string;
}

export interface AmazonStatus {
  hasStorefront: boolean;
  hasAssociates: boolean;
  hasCreatorConnections?: boolean;
  storefrontUrl?: string;
}

/** Sales call transcript or chat excerpts */
export interface CallTranscript {
  raw: string;
  keyExcerpts?: string[];
  painPointsIdentified?: string[];
  goalsIdentified?: string[];
  budgetMentioned?: string;
  timelineMentioned?: string;
}

/** Growth lane determined by the Proposal Brain */
export type GrowthLane =
  | 'ltk-first'
  | 'amazon-affiliate-plus'
  | 'amazon-scr'
  | 'hybrid'
  | 'brand-partnerships';

/** Pricing tier definition */
export interface PricingTier {
  name: string;
  price: string;
  description: string;
  deliverables: string[];
  highlighted?: boolean;
}

/** Outreach message variant */
export interface OutreachMessage {
  channel: 'instagram-dm' | 'email' | 'linkedin';
  variant: 'warm-direct' | 'data-driven' | 'soft-invite';
  subject?: string;
  body: string;
  followUp48h?: string;
  followUp7d?: string;
}

/** Full proposal output */
export interface ProposalOutput {
  html: string;
  growthLane: GrowthLane;
  executiveSummary: string;
  goals: string[];
  pricingTiers: PricingTier[];
  deliverables: string[];
  timeline: TimelinePhase[];
  brandTargets: BrandTarget[];
}

export interface TimelinePhase {
  phase: string;
  duration: string;
  deliverables: string[];
}

export interface BrandTarget {
  name: string;
  reason: string;
  pitchAngle?: string;
}

/** Monetization audit output */
export interface AuditOutput {
  html: string;
  currentRevenueSources: string[];
  gaps: AuditGap[];
  opportunities: AuditOpportunity[];
  projectedUplift: string;
}

export interface AuditGap {
  area: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export interface AuditOpportunity {
  title: string;
  description: string;
  estimatedImpact: string;
  effort: 'low' | 'medium' | 'high';
}

/** Pitch deck output */
export interface PitchDeckOutput {
  html: string;
  creatorName: string;
  brandTargets: BrandTarget[];
  pitchAngles: PitchAngle[];
  contentConcepts: ContentConcept[];
}

export interface PitchAngle {
  title: string;
  hook: string;
  value: string;
}

export interface ContentConcept {
  title: string;
  format: string;
  description: string;
  deliverables: string[];
}

/** Outreach generator output */
export interface OutreachOutput {
  prospect: ProspectData;
  messages: OutreachMessage[];
  hookMenu: string[];
  subjectLines: string[];
}

/** Configuration for generator behavior */
export interface GeneratorConfig {
  agencyName: string;
  agencyTagline?: string;
  accentColor?: string;
  darkTheme?: boolean;
  includeSignOff?: boolean;
  contactEmail?: string;
  contactPhone?: string;
  websiteUrl?: string;
}

export const DEFAULT_CONFIG: GeneratorConfig = {
  agencyName: 'Creative Pulse Agency',
  agencyTagline: 'Affiliate Monetization Operations for Creators',
  accentColor: '#4F9CF7',
  darkTheme: true,
  includeSignOff: true,
};
