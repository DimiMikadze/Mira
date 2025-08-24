# Mira

Mira is a modular Agentic AI library for company research. It provides specialized agents, services, and orchestration logic that can be used directly or integrated into other applications, such as the [demo frontend](../mira-frontend/README.md).

## How It Works

- **Agents (`src/agents/`)** Specialized modules for tasks like discovery, internal page crawling, LinkedIn lookup, Google Search, and company analysis.
- **Orchestrator (`src/orchestrator/`)** Coordinates agents, merges their outputs, manages sources, and tracks progress events.
- **Services (`src/services/`)** Wrappers for ScrapingBee (website crawling and Google Search), LinkedIn company scraper, and other helpers.
- **Types (`src/types/`)** Shared TypeScript definitions.
- **Constants (`src/constants/`)** Centralized configuration of data points and their mapping to internal pages, LinkedIn, and Google Search.
- **Entry Point (`src/index.ts`)** Provides the main `researchCompany` function to execute the full research workflow.
- **Types (`src/types.ts`)** Exposes the library's public type definitions.

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

## Testing

This package uses **Jest** with targeted scripts per agent/service.

Run a specific agent test, for example:

```bash
npm run test:discovery-agent
```

See package.json for other available test scripts for services and agents.

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
