# Mira Frontend Rules

Complete Next.js application with Supabase integration for user authentication and workspace management.

## Architecture

### Database & Authentication

- Use Supabase for authentication, user management, and workspace storage
- All workspaces are private per user (Row Level Security enabled)
- Database schema: boolean fields for sources (source_crawl, source_linkedin, source_google)
- Analysis configuration: analysis_executive_summary (boolean), analysis_company_criteria (text)

### Workspace Management

- Users create and manage multiple research configurations
- Each workspace contains: name, custom data points, source settings, analysis settings
- Workspace modal handles both creation and editing
- Form validation with Zod schemas

## Next.js

- Use App Router, not Pages Router
- Server components by default, client only when needed
- Import from 'mira-ai' for server code, 'mira-ai/types' for client
- Use proper error boundaries

## React

- Functional components only
- Use hooks properly (deps arrays, cleanup)
- Keep components focused on single responsibility
- Use React Hook Form with Zod for form management

## API Routes

- Use proper HTTP status codes
- Handle errors gracefully
- Use Server-Sent Events for progress updates
- Transform workspace data to match mira-ai library structure

## Data Flow

### Frontend → Library API Structure

```typescript
// Frontend sends to /api/enrich
{
  sources: { crawl: boolean, linkedin: boolean, google: boolean },
  analysis: { executiveSummary?: boolean, companyCriteria?: string }
}

// Library expects enrichmentConfig
{
  dataPoints: CustomDataPoint[],
  sources: EnrichmentSources,
  analysis: Analysis
}
```

## UI

- Use shadcn/ui components
- Follow existing design patterns
- Keep accessibility in mind
- Sources are optional (landing page always analyzed)
- Analysis section contains executive summary toggle and company criteria input
