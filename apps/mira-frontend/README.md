# Mira Frontend

The frontend is built with **Next.js 15** (App Router, TypeScript, Tailwind, shadcn/ui).  
It serves as the demo interface for the Mira Core Library.

## Structure

- **Reusable UI Components (`src/components/ui/`)** Shared UI primitives like `Button`, `Dialog`, `Alert`, `Input`, `Tooltip`, etc.
- **Page-Level Components (`src/app/company-enrichment/`)** Implements the company enrichment workflow, consuming the core library.
- **API Routes (`src/app/api/`)** Defines serverless endpoints (e.g. `enrich`) for calling the core library.
- **Global Styles (`src/app/globals.css`)** Tailwind CSS and base styling.
- **Utility Functions (`src/lib/`)** Small helpers like `utils.ts`.

## Requirements

- **Node.js v18+ (LTS recommended)**
- **Environment variables** in `.env.local`, passed through to the core library:

```bash
OPENAI_API_KEY=sk-xxxx
SCRAPING_BEE_API_KEY=xxxx
```

## Development

Run the frontend locally (from the root of the repository):

```bash
npm run dev:mira-frontend
```

## Build

Build the frontend (from the root of the repository):

```bash
npm run build:mira-frontend
```
