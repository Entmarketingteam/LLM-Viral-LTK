/**
 * LTK Data Types for Scraper
 * These types represent the data structures returned by LTK's internal APIs
 */

// Raw API response from LTK feed endpoints
export interface LTKFeedResponse {
  posts: LTKPost[];
  next_cursor?: string;
  has_more?: boolean;
}

// Individual post from LTK
export interface LTKPost {
  id: string;
  post_id: string;
  caption: string;
  hashtags: string[];

  // Creator info
  creator: LTKCreator;

  // Media
  hero_image: string;
  thumbnail_url: string;
  images: string[];
  video_url?: string;
  media_type: 'image' | 'video' | 'carousel';

  // Engagement
  likes_count: number;
  comments_count: number;
  saves_count: number;

  // Links
  ltk_link: string;
  product_links: LTKProductLink[];

  // Metadata
  published_at: string;
  category: string;
  tags: string[];
}

export interface LTKCreator {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  profile_url: string;
  follower_count?: number;
  verified?: boolean;
}

export interface LTKProductLink {
  id: string;
  title: string;
  brand: string;
  price?: number;
  sale_price?: number;
  url: string;
  image_url: string;
  retailer: string;
}

// Scraped data structure (what we extract and store)
export interface ScrapedPost {
  // Identifiers
  post_id: string;
  post_url: string;

  // Creator
  creator_username: string;
  creator_avatar: string;
  creator_profile_url: string;

  // Content
  caption: string;
  hashtags: string[];

  // Media URLs (direct CDN links)
  hero_image_url: string;
  thumbnail_url: string;
  all_image_urls: string[];
  video_url: string | null;

  // Product links
  product_links: ScrapedProductLink[];

  // Category/source
  category: string;
  source_page: string;

  // Timestamps
  scraped_at: string;
  published_at: string | null;
}

export interface ScrapedProductLink {
  title: string;
  brand: string;
  price: number | null;
  url: string;
  affiliate_url: string; // rstyle.me link
  image_url: string;
  retailer?: string;
}

// Detailed post data from individual post pages
export interface DetailedPost extends ScrapedPost {
  // Enhanced content
  full_caption: string;
  mention_tags: string[]; // @mentions

  // Video details
  video_duration?: number;
  video_thumbnail?: string;
  has_video: boolean;

  // Product details
  product_count: number;
  products: DetailedProduct[];

  // Engagement (if available)
  likes?: number;
  comments?: number;
  shares?: number;

  // Share links
  share_url: string;
  facebook_share_url?: string;
  pinterest_share_url?: string;
  twitter_share_url?: string;
}

export interface DetailedProduct {
  id: string;
  name: string;
  brand: string;
  retailer: string;
  price: number | null;
  sale_price: number | null;
  currency: string;
  affiliate_url: string; // rstyle.me link
  product_image_url: string;
  in_stock?: boolean;
}

// Scraper configuration
export interface ScraperConfig {
  categories: string[];
  maxPostsPerCategory: number;
  delayBetweenRequests: number; // ms
  outputPath: string;
  uploadToGCS: boolean;
}

// Category mapping for LTK
export const LTK_CATEGORIES = {
  'ltkfindsunder50': 'Finds Under $50',
  'ltkfindsunder100': 'Finds Under $100',
  'ltksalealert': 'Sale Alert',
  'ltkholiday': 'Holiday',
  'ltkfamily': 'Family',
  'ltkhome': 'Home',
  'ltkbeauty': 'Beauty',
  'ltkfit': 'Fitness',
  'ltkworkwear': 'Workwear',
  'ltktravel': 'Travel',
  'ltkwedding': 'Wedding',
  'ltkmens': 'Mens',
  'ltkkids': 'Kids',
  'ltkbaby': 'Baby',
  'ltkeurope': 'Europe',
  'ltkbrasil': 'Brasil',
} as const;

export type LTKCategorySlug = keyof typeof LTK_CATEGORIES;
