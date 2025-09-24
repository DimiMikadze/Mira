# Mira AI Library

Mira AI is an agentic AI library that automates company data enrichment with configurable data points and intelligent source selection. It features smart early termination and can be integrated into applications, pipelines, or used with the [complete frontend application](../../apps/mira-frontend/README.md).

## Architecture

### Core Components

- **Agents (`src/agents/`)** – Specialized AI agents for discovery, internal page analysis, LinkedIn research, Google Search, and company analysis
- **Orchestrator (`src/orchestrator/`)** – Modular orchestration system with intelligent coordination, early termination, and progress tracking
  - `enrichment-context.ts` – Configuration and setup management
  - `enrichment-flow.ts` – Step-by-step orchestration logic
  - `early-termination.ts` – Smart stopping when confidence thresholds are met
  - `result-builder.ts` – Final result compilation and formatting
- **Services (`src/services/`)** – ScrapingBee integration, LinkedIn scraper, Google Search, and utility services
- **Types (`src/types/`)** – Comprehensive TypeScript definitions for all data structures
- **Constants (`src/constants/`)** – Configuration for agents, prompts, and default data point mappings

### Key Features

- **Configurable Data Points** – Define custom data points with names and descriptions
- **Intelligent Source Selection** – Enable/disable website crawling, LinkedIn, and Google Search (landing page is always analyzed)
- **Smart Early Termination** – Automatically stops when all data points reach confidence thresholds
- **Confidence-Based Merging** – Higher confidence scores take precedence when merging data
- **Real-time Progress Events** – Live updates throughout the enrichment process
- **Company Analysis** – Optional executive summary generation and company criteria fit scoring
- **Outreach Generation** – AI-powered personalized LinkedIn and email outreach based on enriched company data

### Entry Points

- **`src/index.ts`** – Main `researchCompany` function and public API
- **`src/types.ts`** – Public type definitions for external consumption

## Requirements

- **Node.js v18+ (LTS recommended)**
- **Environment variables** required for running tests, stored in `.env.test`:

```bash
OPENAI_API_KEY=sk-xxxx
SCRAPING_BEE_API_KEY=xxxx
```

## Module Format

Mira is distributed as **ESM-only** because it depends on `@openai/agents`, which is published as an ES module.
All relative imports inside the library use the `.js` extension. This is required so Node can resolve the files correctly after TypeScript compilation.

## Usage

```typescript
import { researchCompany } from 'mira-ai';

const config = {
  apiKeys: {
    openaiApiKey: process.env.OPENAI_API_KEY!,
    scrapingBeeApiKey: process.env.SCRAPING_BEE_API_KEY!,
  },
};

const result = await researchCompany('https://company.com', config, {
  enrichmentConfig: {
    dataPoints: [
      { name: 'industry', description: 'Primary business sector' },
      { name: 'employeeCount', description: 'Number of employees' },
      { name: 'funding', description: 'Latest funding round and amount' },
    ],
    // Configure which sources to use (landing page is always analyzed)
    sources: {
      crawl: true, // Enable internal pages crawling
      linkedin: true, // Enable LinkedIn analysis
      google: true, // Enable Google Search
    },
    // Configure analysis options
    analysis: {
      executiveSummary: true, // Generate executive summary
      companyCriteria: 'B2B SaaS companies with 50-200 employees', // Evaluate fit against criteria
    },
  },
  onProgress: (type, message) => {
    console.log(`${type}: ${message}`);
  },
});

console.log(result.enrichedCompany);
console.log(result.companyAnalysis);
```

### Outreach Generation

Generate personalized LinkedIn and email outreach messages based on enriched company data:

```typescript
import { generateOutreach } from 'mira-ai';

const outreachResult = await generateOutreach(
  enrichedCompany, // EnrichedCompany from enrichment result
  {
    linkedin: true, // Generate LinkedIn messages
    email: true, // Generate email messages
    prompt: 'Focus on our AI automation solutions for enterprise clients',
  },
  (type, message) => console.log(`${type}: ${message}`) // Optional progress callback
);
```

The outreach function returns structured messages:

- **LinkedIn**: connection note, acceptance message, InMail subject/message
- **Email**: subject, initial message, follow-up message

## Testing

This package uses **Jest** with targeted scripts per agent/service.

Run a specific agent test, for example:

```bash
npm run test:discovery-agent
```

See package.json for all available test scripts for services and agents.

## Build

```bash
npm run build
```

This compiles the TypeScript source into the dist/ directory.

## Publishing

To publish a new version to npm:

```bash
npm run build
npm version patch   # or minor/major
npm publish
```
