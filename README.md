<p align="center">
  <img src="packages/mira-frontend/public/logo.svg" alt="Mira Logo" width="300" />
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

Mira is an agentic AI library that automates company research. It gathers information from company websites, LinkedIn profiles, and Google Search. The agents discover and crawl pages, extract facts, check external sources, and assemble a structured profile with confidence scores and clear source attribution.

The core of Mira is a framework-agnostic library. It can be published as an npm package or integrated directly into your applications, pipelines, or custom workflows.

To demonstrate how it works in practice, this repository includes a Next.js frontend that consumes the core library and provides a simple interface for running research and viewing results.

## Mira in action

<p align="center">
  <img src="./Screenshot.png" alt="Mira Screenshot" width="80%" />
</p>

## Key Features

- **Multi-Agent Architecture** – Specialized agents handle company discovery, internal pages, LinkedIn, Google Search, and analysis, then merge results into one structured profile.
- **Flexible and Customizable** – Easily adapt agents, data points, and prompts to fit your workflows, pipelines, or research needs.
- **Realtime Progress Events** – Emits structured events during execution so you can track and display live progress.
- **Confidence Scoring & Source Attribution** – Each fact includes a confidence score and references its source for transparency.
- **Company Criteria Matching** – Supports custom company criteria evaluation with scoring and reasoning.
- **Service Layer for Data Gathering** – Built-in services handle scraping, Google Search, LinkedIn company data, and even cookie consent banners out of the box.
- **Built-in Orchestration** – Coordinates agents, merges results, and manages sources consistently.
- **Composable Core Library** – Framework-agnostic and publishable as an npm package, ready for Node.js/TypeScript projects.
- **Example Next.js Frontend** – Shows how to consume the library with a simple web interface and live progress updates.

## How it works

Mira only requires the company's website URL as input. From there, it defines a set of data points to collect, such as company name, industry, size, funding, and recent news. Each data point is mapped to where it is most likely found: landing page, internal pages like About or Careers, LinkedIn, or Google Search. These data points can be easily customized so the system is tailored to your specific research needs. During a run, agents collect the mapped data points and the orchestrator merges them using confidence scores and source attribution.

**Flow**

1. **Discovery agent** collects data from the landing page, extracts social profiles, and identifies relevant internal pages.
2. **Internal pages agent** scans the discovered pages and extracts mapped data points.
3. **LinkedIn agent** gathers additional company details from LinkedIn.
4. **Google Search agent** queries for missing or low-confidence items and extracts structured facts from results.
5. **Company analysis agent** synthesizes the collected facts into a structured profile and, if provided, evaluates company criteria fit score with reasoning.

**Merging and confidence**

- Every data point includes a confidence score and a reference to its source.
- When multiple sources provide the same field, higher confidence wins. Newer or more trusted sources can be favored based on the merge rules.
- Realtime progress events are emitted throughout execution so you can track or display live status.

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

### Frontend UI Demo (`packages/mira-frontend`)

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

- `packages/mira-frontend/.env.local` — used when running the demo frontend.
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

Create packages/mira-frontend/.env.local:

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

```bash
import { researchCompany } from "mira-ai";

const config = {
  apiKeys: {
    openaiApiKey: process.env.OPENAI_API_KEY!,
    scrapingBeeApiKey: process.env.SCRAPING_BEE_API_KEY!,
  },
};

const result = await researchCompany("https://company.com", config, {
  companyCriteria: "B2B SaaS Companies",
  onProgress: (event) => {
    console.log("Progress event:", event);
  },
});

console.log(result);
```

## Additional Documentation

This monorepo contains two main packages, each with its own README that provides a deeper look into architecture and usage:

- **[Mira Core Library](./packages/mira-ai/README.md)** — Node.js/TypeScript library with agents, services, and orchestration logic.
- **[Mira Frontend](./packages/mira-frontend/README.md)** — Next.js demo UI for running research and visualizing results.

## AI-Assisted Development

If you're developing with AI tools like Cursor, configuration rules are already set up in the root, library, and frontend packages to ensure consistency.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

Distributed under the MIT License. See [LICENSE](./LICENSE) for details.

## Credits

Logo and demo UI design by [salomeskv](https://www.salomeskv.com/about)
