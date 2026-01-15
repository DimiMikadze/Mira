# Mira AI Library Rules

Framework-agnostic TypeScript library for agentic company research with modular orchestrator architecture.

## Architecture: Modular Orchestrator + Agents

### Orchestrator Modules (`src/orchestrator/`)

- **`enrichment-context.ts`** - Setup, configuration, and context management with analysis config
- **`enrichment-flow.ts`** - Step-by-step execution and coordination logic
- **`early-termination.ts`** - Smart stopping when confidence thresholds are met
- **`result-builder.ts`** - Final result compilation and formatting
- **`agent-coordinator.ts`** - Agent execution wrappers and interfaces
- **`data-merger.ts`** - Confidence-based data point merging
- **`progress-manager.ts`** - Real-time progress event generation
- **`sources-manager.ts`** - Source URL tracking and deduplication

### AI Agents (`src/agents/`)

1. **Discovery Agent** - Landing page analysis (always runs), finds internal pages and social links
2. **Internal Pages Agent** - Targeted extraction from About/Careers pages (if crawl enabled)
3. **LinkedIn Agent** - Company profile analysis (if linkedin enabled)
4. **Google Search Agent** - Targeted searches for remaining gaps (if google enabled)
5. **Company Analysis Agent** - Executive summary and/or criteria fit scoring (if analysis configured)

## Key Concepts

### API Structure

```typescript
// researchCompany parameters
researchCompany(url, config, {
  enrichmentConfig: {
    dataPoints: CustomDataPoint[],
    sources: { crawl?, linkedin?, google? }, // analysis removed from sources
    analysis?: { executiveSummary?, companyCriteria? } // separate analysis config
  }
})
```

### Core Principles

- **Configurable Data Points** - Define custom `{ name, description }` pairs for extraction
- **Intelligent Source Selection** - Enable/disable crawling, LinkedIn, Google (landing page always analyzed)
- **Separate Analysis Configuration** - Executive summary and company criteria fit scoring as optional post-processing
- **Smart Early Termination** - Auto-stop when all data points reach confidence thresholds
- **Confidence-Based Merging** - Higher confidence scores (1-5) take precedence
- **Targeted Processing** - Only process missing/low-confidence data in later steps

### Analysis Logic

- Analysis runs if: `analysis.executiveSummary` OR `analysis.companyCriteria` is provided
- Executive summary: generates summary based on found data points
- Company criteria: provides fit score (0-10) and reasoning against provided criteria

## Library Development

- Export everything through src/index.ts
- Use proper TypeScript types, avoid `any`
- Keep orchestrator modules focused on single responsibilities
- Handle errors with descriptive messages

## API Design

- Accept config objects with `enrichmentConfig: { dataPoints, sources, analysis? }`
- Return structured results with `{ enrichedCompany, companyAnalysis }`
- Use Zod schemas for validation
- Set process.env in enrichment-context.ts, not throughout the codebase
- Analysis is separate from sources: `sources: EnrichmentSources`, `analysis: Analysis`

## Testing

- Test all public functions
- Use .env.test for test API keys
- Mock external services in tests
