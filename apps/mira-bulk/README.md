# Mira Bulk

Bulk company enrichment processor using mira-ai.

## What it does

Processes large datasets through the Mira enrichment pipeline. Reads a CSV of company websites, enriches each one using configured data points, and exports results to Supabase storage.

## Features

- **Resume capability** — Progress saved to SQLite, automatically skips already-processed companies on restart
- **Circuit breaker** — Stops after consecutive failures to avoid wasting API quota
- **Concurrent processing** — Configurable parallelism with PQueue

## Setup

1. Configure workspace in Supabase with data points and sources
2. Upload companies CSV to Supabase storage
3. Set environment variables:
   - `OPENAI_API_KEY`
   - `SCRAPING_BEE_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NODE_ENV=production` (for production DB path)

## Usage
```bash
# Local
npm run dev

# Production (Render)
npm start
```

## Output

Results exported to Supabase storage as CSV with enriched company data, FitScore, and analysis.