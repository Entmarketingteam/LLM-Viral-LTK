# Build Complete Dashboard and Site

## Overview

Transform the existing Next.js app into a full-featured creative intelligence dashboard with multiple pages, advanced filtering, data visualization, search, and comparison tools.

## Architecture

The dashboard will have:
- **Main Layout**: Sidebar navigation + header with user profile
- **Overview Dashboard**: Key metrics, top performers, trends
- **Creative Explorer**: Grid view with advanced filters
- **Creative Detail**: Individual creative deep-dive (enhance existing component)
- **Analytics**: Charts, trends, insights
- **Search/Discovery**: Text search + vector similarity search
- **Comparison Tool**: Side-by-side creative comparison

## Implementation Plan

### Phase 1: Foundation & UI Components

**1.1 Install Dependencies**
- Add `recharts` for data visualization
- Add `lucide-react` for icons
- Add `date-fns` for date formatting
- Add `clsx` for className utilities (if not already in utils)

**1.2 Create Base UI Components** (`components/ui/`)
- `button.tsx` - Button variants (primary, secondary, outline, ghost)
- `input.tsx` - Text input with variants
- `select.tsx` - Dropdown select
- `badge.tsx` - Badge/tag component
- `tabs.tsx` - Tab navigation
- `dialog.tsx` - Modal dialogs
- `skeleton.tsx` - Loading skeletons
- `chart.tsx` - Wrapper for recharts

**1.3 Create Layout Components** (`components/layout/`)
- `Sidebar.tsx` - Main navigation sidebar
- `Header.tsx` - Top header with user menu
- `DashboardLayout.tsx` - Wrapper layout for dashboard pages

**1.4 Update Root Layout** (`app/layout.tsx`)
- Integrate Clerk UserButton
- Add DashboardLayout wrapper

### Phase 2: Dashboard Pages

**2.1 Overview Dashboard** (`app/dashboard/page.tsx`)
- Key metrics cards (total creatives, avg engagement, top performers)
- Top creatives preview (using existing `TopCreatives` component)
- Recent trends chart (engagement over time)
- Quick filters (niche, platform, date range)
- Stats by platform/niche breakdown

**2.2 Creative Explorer** (`app/explorer/page.tsx`)
- Grid view of creatives (enhance `TopCreatives` component)
- Advanced filter panel:
  - Niche dropdown
  - Platform multi-select
  - Source type (paid/organic/ugc)
  - Date range picker
  - Performance filters (engagement rate, ROAS thresholds)
  - Sort options
- Pagination or infinite scroll
- Quick view modal

**2.3 Creative Detail Page** (`app/creatives/[id]/page.tsx`)
- Use existing `CreativeDetail` component
- Add similar creatives section (using `/api/v1/creatives/[id]/similar`)
- Add metrics timeline chart
- Add export/share functionality

**2.4 Analytics Page** (`app/analytics/page.tsx`)
- Engagement trends over time (line chart)
- Performance by niche (bar chart)
- Platform comparison (multi-line chart)
- Top performers table
- Virality score distribution (histogram)
- Hook type analysis (pie chart)

**2.5 Search/Discovery Page** (`app/search/page.tsx`)
- Text search input
- Vector similarity search (upload image or select creative)
- Search results grid
- Filter by similarity threshold
- "Find similar" button on creative cards

**2.6 Comparison Tool** (`app/compare/page.tsx`)
- Multi-select creative picker
- Side-by-side comparison view:
  - Metrics comparison table
  - Visual features comparison
  - LLM annotations comparison
  - Similarity score
- Export comparison report

### Phase 3: API Enhancements

**3.1 Dashboard Stats API** (`app/api/v1/dashboard/stats/route.ts`)
- Aggregate metrics (total creatives, avg engagement, etc.)
- Trends data (daily/weekly aggregations)
- Platform/niche breakdowns

**3.2 Analytics API** (`app/api/v1/analytics/trends/route.ts`)
- Time-series data for charts
- Grouped aggregations (by niche, platform, etc.)

**3.3 Search API** (`app/api/v1/search/route.ts`)
- Text search (caption, hashtags)
- Vector similarity search integration
- Combined search results

### Phase 4: Enhanced Components

**4.1 Enhanced TopCreatives** (`components/creatives/TopCreatives.tsx`)
- Add click handler to navigate to detail page
- Add "Find Similar" button
- Add comparison checkbox
- Improve loading states

**4.2 MetricsChart** (`components/analytics/MetricsChart.tsx`)
- Reusable chart component for time-series data
- Configurable metrics (engagement, impressions, ROAS)

**4.3 FilterPanel** (`components/filters/FilterPanel.tsx`)
- Reusable filter component
- URL state management for filters
- Clear/reset functionality

**4.4 CreativeCard** (`components/creatives/CreativeCard.tsx`)
- Standalone card component
- Hover effects
- Quick actions (view, compare, find similar)

### Phase 5: Styling & UX

**5.1 Update Global Styles** (`app/globals.css`)
- Add custom CSS variables for theme
- Add smooth scrolling
- Add loading animations

**5.2 Tailwind Config** (`tailwind.config.ts`)
- Add custom colors for brand
- Add custom spacing/typography
- Add animation utilities

**5.3 Responsive Design**
- Mobile-first approach
- Responsive grid layouts
- Mobile navigation menu

## File Structure

```
app/
├── layout.tsx (updated)
├── page.tsx (redirect to /dashboard)
├── dashboard/
│   └── page.tsx (overview)
├── explorer/
│   └── page.tsx (creative browser)
├── creatives/
│   └── [id]/
│       └── page.tsx (detail page)
├── analytics/
│   └── page.tsx (analytics dashboard)
├── search/
│   └── page.tsx (search/discovery)
└── compare/
    └── page.tsx (comparison tool)

components/
├── ui/ (base components)
├── layout/ (Sidebar, Header, DashboardLayout)
├── creatives/ (enhanced components)
├── analytics/ (charts, metrics)
├── filters/ (FilterPanel)
└── search/ (search components)

lib/
└── hooks/ (custom React hooks for data fetching)
```

## Key Features

1. **Navigation**: Persistent sidebar with active state
2. **Authentication**: Clerk integration with user profile
3. **Data Visualization**: Charts for trends and comparisons
4. **Advanced Filtering**: Multi-criteria filtering with URL state
5. **Search**: Text + vector similarity search
6. **Comparison**: Side-by-side creative analysis
7. **Responsive**: Mobile-friendly design
8. **Performance**: Optimized data fetching with caching

## Dependencies to Add

```json
{
  "recharts": "^2.10.0",
  "lucide-react": "^0.300.0",
  "date-fns": "^2.30.0",
  "clsx": "^2.0.0"
}
```

## Implementation Order

1. Install dependencies and create base UI components
2. Build layout components (Sidebar, Header, DashboardLayout)
3. Create overview dashboard page
4. Create creative explorer page
5. Create analytics page
6. Create search page
7. Create comparison tool
8. Enhance existing components
9. Add API endpoints for dashboard stats
10. Polish styling and add animations

## Implementation Todos

- [ ] Install charting and UI dependencies (recharts, lucide-react, date-fns, clsx)
- [ ] Create base UI components (button, input, select, badge, tabs, dialog, skeleton, chart wrapper)
- [ ] Build layout components (Sidebar, Header, DashboardLayout)
- [ ] Create overview dashboard page with metrics cards and trends
- [ ] Create creative explorer page with advanced filters and grid view
- [ ] Create creative detail page route using existing CreativeDetail component
- [ ] Create analytics page with multiple charts and insights
- [ ] Create search/discovery page with text and vector search
- [ ] Create comparison tool page for side-by-side creative analysis
- [ ] Create dashboard stats API endpoint for overview metrics
- [ ] Create analytics trends API endpoint for chart data
- [ ] Enhance existing components (TopCreatives, CreativeDetail) with navigation and actions
- [ ] Update global styles, Tailwind config, and add responsive design

## Notes for Design Fine-Tuning

This plan provides the structure and functionality. For design refinement:
- Use modern UI patterns (shadcn/ui style components)
- Implement consistent spacing and typography
- Add smooth transitions and micro-interactions
- Ensure accessibility (ARIA labels, keyboard navigation)
- Consider dark mode support
- Optimize for performance (lazy loading, code splitting)
