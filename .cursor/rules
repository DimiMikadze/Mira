# Mira - AI Company Research System (Monorepo)

Agentic AI system that automates company research with configurable data points and intelligent source selection. Features modular orchestration, smart early termination, and confidence-based data merging.

**Key Features:**

- Configurable data points with custom descriptions for precise extraction
- Intelligent source selection (website crawling, LinkedIn, Google Search - landing page always analyzed)
- Separate analysis configuration (executive summary, company criteria fit scoring)
- Smart early termination when confidence thresholds are met
- Modular orchestrator with separated concerns (context, flow, termination, results)
- Real-time progress tracking with structured events
- Workspace management with user authentication and data persistence

**MONOREPO STRUCTURE**:

- `packages/mira-ai/` - Core TypeScript library (framework-agnostic npm package)
- `apps/mira-frontend/` - Complete Next.js 15 application with Supabase integration

## Code Style & Naming

### File Naming

- Use kebab-case for files: `company-analysis.ts`, `data-merger.ts`
- Use PascalCase for components: `CompanyProgress.tsx`
- Use descriptive names that explain purpose: `linkedin-company-scraper.ts`

### Variable & Function Naming

- Use camelCase: `researchCompany`, `progressCallback`
- Be descriptive: `scrapingBeeClient` not `client`
- Prefer verb-noun for functions: `createProgressReporter`, `mergeDataPoints`
- Use meaningful constants: `PROGRESS_EVENTS`, `DATA_POINT_TYPES`

### Code Quality

- Use TypeScript strictly with proper type definitions
- Prefer const over let, avoid var completely
- Keep functions small and focused on single responsibility
- Add JSDoc comments for public APIs and complex logic
- Use meaningful variable names that describe business purpose

## Monorepo Guidelines

- Import between packages using package names: `import { researchCompany } from 'mira-ai'`
- Never use relative paths between packages: `../../../mira/src/types`
- Keep shared types in appropriate package domains
- Use npm workspaces for dependency management
- Each package has specific .cursor/rules for detailed guidelines

## Git Conventions

- Conventional commits: `feat(core): add linkedin scraping`, `fix(frontend): progress bar styling`
- One logical change per commit with clear scope
- Use descriptive messages that explain business impact
- Reference issues/PRs when applicable
