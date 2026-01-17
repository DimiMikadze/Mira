# Mira Bulk

Bulk enrichment processor for large company datasets. Reads companies from a CSV (via Supabase storage), enriches each using mira-ai with workspace configuration, tracks progress in SQLite for resume capability, and exports results back to Supabase. Designed to run as a long-running background worker on Render.

## Tech Stack

- Node.js 24.5 (built-in TypeScript and .env support)
- SQLite with WAL mode
- p-queue, papaparse

## Node 24.5 Import Conventions

This project uses Node.js 24.5's native TypeScript support. Follow these conventions:

### Always include `.ts` file extensions:

```typescript
// ✅ Correct
import { saveProgress } from './db.ts';

// ❌ Incorrect
import { saveProgress } from './db';
```

### Use `type` keyword for type-only imports:

```typescript
// ✅ Correct
import type { CustomDataPoint } from 'mira-ai';

// ❌ Incorrect
import { CustomDataPoint } from './mira-ai';
```

### Mixed imports (types + values):

```typescript
import { researchCompany, type CustomDataPoint } from 'mira-ai';
```
