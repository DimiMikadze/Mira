<p align="center">
  <img src="apps/mira-frontend/public/logo.svg" alt="Mira Logo" width="300" />
</p>

<p align="center">Agentic AI Library for Company Research</p>

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Build Status](https://github.com/dimimikadze/mira/actions/workflows/ci.yml/badge.svg)](https://github.com/dimimikadze/mira/actions/workflows/ci.yml)
[![NPM Version](https://img.shields.io/npm/v/mira-ai.svg)](https://www.npmjs.com/package/mira-ai)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](CONTRIBUTING.md)

</div>

<p align="center">
  <a href="https://www.youtube.com/watch?v=z8HdHOMvoNY">
    <img src="https://img.shields.io/badge/Watch%20Demo%20Video-red?style=for-the-badge&logo=youtube" />
  </a>
</p>

# About Mira

Mira is an agentic AI library that automates company research with configurable data points and intelligent source selection. It gathers information from company websites, LinkedIn profiles, and Google Search, then assembles a structured profile with confidence scores and clear source attribution.

The system features smart early termination - once all configured data points reach high confidence scores, it automatically stops processing to save time and API costs. Sources are fully configurable, allowing you to enable or disable website crawling, LinkedIn analysis, Google Search, and executive summary generation based on your needs.

The core of Mira is a framework-agnostic library that can be published as an npm package or integrated directly into your applications, pipelines, or custom workflows.

To demonstrate how it works in practice, this repository includes a Next.js frontend that consumes the core library and provides a simple interface for running research and viewing results.

## Mira in action

<p align="center">
  <img src="./Screenshot.png" alt="Mira Screenshot" width="80%" />
</p>

## Key Features

- **Configurable Data Points** – Define exactly what information to collect (company name, industry, funding, etc.) with custom descriptions for precise extraction.
- **Intelligent Source Selection** – Enable/disable website crawling, LinkedIn analysis, Google Search, and executive summary generation based on your needs.
- **Smart Early Termination** – Automatically stops processing when all data points reach high confidence scores, saving time and API costs.
- **Multi-Agent Architecture** – Specialized agents handle discovery, internal pages, LinkedIn, Google Search, and analysis, with intelligent orchestration.
- **Confidence Scoring & Source Attribution** – Each fact includes a confidence score (1-5) and references its source for transparency and trust.
- **Company Criteria Matching** – Evaluate companies against custom criteria with fit scores (0-10) and detailed reasoning.
- **Realtime Progress Events** – Emits structured events during execution so you can track and display live progress.
- **Service Layer for Data Gathering** – Built-in services handle scraping, Google Search, LinkedIn company data, and cookie consent banners.
- **Composable Core Library** – Framework-agnostic and publishable as an npm package, ready for Node.js/TypeScript projects.
- **Example Next.js Frontend** – Shows how to consume the library with a simple web interface and live progress updates.

## How it works

Mira takes a company's website URL and your configuration, then intelligently orchestrates multiple AI agents to gather comprehensive company information. You can customize exactly what data to collect and which sources to use.

**Configuration**

- **Data Points**: Define custom data points with names and descriptions (e.g., "industry": "Primary business sector or market vertical")
- **Sources**: Enable/disable website crawling, LinkedIn analysis, Google Search, and executive summary generation
- **Criteria**: Optionally provide company criteria for fit scoring and evaluation

**Intelligent Orchestration**

1. **Discovery agent** analyzes the landing page, extracts social profiles, and identifies relevant internal pages
2. **Internal pages agent** (if enabled) scans discovered pages for data points that need improvement
3. **LinkedIn agent** (if enabled) gathers additional details, but only for missing or low-confidence data points
4. **Google Search agent** (if enabled) queries for remaining gaps using targeted searches
5. **Company analysis agent** (if enabled) generates executive summary and/or evaluates company criteria fit

**Smart Early Termination**

The system continuously monitors data point confidence scores. If all configured data points reach the minimum confidence threshold, processing automatically terminates early to save time and API costs.

**Data Merging & Confidence**

- Every data point includes a confidence score (1-5) and source attribution
- When multiple sources provide the same information, higher confidence scores take precedence
- Real-time progress events are emitted throughout execution for live status tracking

## Architecture Diagram

![Mira Architecture Diagram](./Diagram.png)

## Tech Stack

### Core Library (`packages/mira-ai`)

- **Node.js** – runtime environment.
- **TypeScript** – type safety and maintainability.
- **OpenAI Agents SDK** – multi-agent orchestration and reasoning.
- **ScrapingBee** – API-based scraping, used for both website crawling and Google Search.
- **Zod** – runtime schema validation and input/output type enforcement.
- **Jest** – testing framework for validating services and agents individually.

### Frontend UI Demo (`apps/mira-frontend`)

- **Next.js** – demo interface to run research and display results.
- **TypeScript** – Consumes core library types.
- **TailwindCSS** – styling for the UI.
- **shadcn/ui** – accessible, prebuilt UI components.

## Requirements

- **Node.js** v18 or later (ensures compatibility with the OpenAI Agents SDK)
- **npm** (comes with Node.js) or **pnpm/yarn** as your package manager
- **API Keys**:
  - `OPENAI_API_KEY` — for agent orchestration
  - `SCRAPING_BEE_API_KEY` — for web scraping and Google Search

## Environment Variables

Mira requires API keys to function. Environment files are used to separate configuration for local development and testing.

- `apps/mira-frontend/.env.local` — used when running the demo frontend.
- `packages/mira-ai/.env.test` — used when running tests in the core library.

For both cases, the `.env` files should look like this:

```
OPENAI_API_KEY=sk-xxxx
SCRAPING_BEE_API_KEY=xxxx
```

## Installation & Setup

You can use Mira in two ways:

1. **Local Development** (run the demo frontend with the core library)
2. **As an npm Package** (use the core library directly in your own project)

---

### 1. Local Development

Clone the repository and install dependencies:

```bash
git clone https://github.com/dimimikadze/mira.git
cd mira
npm install
```

Create apps/mira-frontend/.env.local:

```bash
OPENAI_API_KEY=sk-xxxx
SCRAPING_BEE_API_KEY=xxxx
```

Run the demo UI:

```bash
npm run dev:mira-frontend
```

### 2. Use as an npm package (core library)

```bash
npm install mira-ai
```

```typescript
import { researchCompany } from 'mira-ai';

const config = {
  apiKeys: {
    openaiApiKey: process.env.OPENAI_API_KEY!,
    scrapingBeeApiKey: process.env.SCRAPING_BEE_API_KEY!,
  },
};

const result = await researchCompany('https://company.com', config, {
  companyCriteria: 'B2B SaaS companies with 50-200 employees',
  enrichmentConfig: {
    // Define custom data points to collect
    dataPoints: [
      { name: 'industry', description: 'Primary business sector' },
      { name: 'employeeCount', description: 'Number of employees' },
      { name: 'funding', description: 'Latest funding round and amount' },
      { name: 'recentNews', description: 'Recent company news or updates' },
    ],
    // Configure which sources to use
    sources: {
      crawl: true, // Enable internal pages crawling
      linkedin: true, // Enable LinkedIn analysis
      google: true, // Enable Google Search
      analysis: true, // Enable executive summary generation
    },
  },
  onProgress: (type, message) => {
    console.log(`${type}: ${message}`);
  },
});

console.log(result.enrichedCompany);
console.log(result.companyAnalysis);
```

### Production Security

The demo frontend includes Basic Auth protection for production deployments. Configure multiple users via environment variables:

```bash
# Basic Auth (Production Only)
BASIC_AUTH_USERS=admin:secure_password,user:another_password
NODE_ENV=production
```

- **Format**: `username1:password1,username2:password2`
- **Scope**: Only active in production (`NODE_ENV=production`)

## Additional Documentation

This monorepo contains two main packages, each with its own README that provides a deeper look into architecture and usage:

- **[Mira Core Library](./packages/mira-ai/README.md)** — Node.js/TypeScript library with agents, services, and orchestration logic.
- **[Mira Frontend](./apps/mira-frontend/README.md)** — Next.js demo UI for running research and visualizing results.

## AI-Assisted Development

If you're developing with AI tools like Cursor, configuration rules are already set up in the root, library, and frontend packages to ensure consistency.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

Distributed under the MIT License. See [LICENSE](./LICENSE) for details.

## Credits

Logo and demo UI design by [salomeskv](https://www.salomeskv.com/about)
