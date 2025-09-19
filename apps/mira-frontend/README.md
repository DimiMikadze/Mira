# Mira Frontend

The frontend is built with **Next.js 15** (App Router, TypeScript, Tailwind, shadcn/ui) and **Supabase** for authentication and data storage.  
It provides a complete application interface for the Mira AI Library with workspace management and user authentication.

## Features

- **User Authentication** – Secure sign-in with Supabase Auth
- **Workspace Management** – Create and manage multiple research configurations with custom data points, sources, and analysis settings
- **Real-time Progress Tracking** – Live updates during company research with step-by-step progress visualization
- **Research Results Visualization** – Comprehensive display of enriched company data, confidence scores, and analysis results

## Structure

- **Reusable UI Components (`src/components/ui/`)** Shared UI primitives like `Button`, `Dialog`, `Alert`, `Input`, `Tooltip`, etc.
- **Page-Level Components (`src/app/company-enrichment/`)** Implements the company enrichment workflow with workspace management
- **API Routes (`src/app/api/`)** Defines serverless endpoints (e.g. `enrich`) for calling the core library
- **Database Integration (`src/lib/supabase/`)** Supabase client configuration and ORM functions
- **Utility Functions (`src/lib/`)** Helpers for data transformation and workspace management

## Requirements

- **Node.js v18+ (LTS recommended)**
- **Environment variables** in `.env.local`:

```bash
# API Keys (passed through to the core library)
OPENAI_API_KEY=sk-xxxx
SCRAPING_BEE_API_KEY=xxxx

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Setup

From the root of the repository, run database migrations:

```bash
npm run db:migrate
```

Generate TypeScript types from your Supabase schema:

```bash
npm run generate-types
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

## Authentication

The frontend uses Supabase for user authentication and workspace management. Users can:

- **Sign in** with their credentials through the Supabase Auth system
- **Manage private workspaces** with their own custom data points, sources, and analysis configurations
- **Access their research history** and results
