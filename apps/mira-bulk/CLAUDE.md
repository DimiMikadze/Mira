## Tech Stack

- Node.js 24.5 (built-in TypeScript and .env support)
- SQLite with WAL mode
- p-queue, papaparse

## Node 24.5 Import Conventions

This project uses Node.js 24.5's native TypeScript support. Follow these conventions:

### Always include `.ts` file extensions:

```typescript
// ✅ Correct
import { enrichLead } from './llm.ts';

// ❌ Incorrect
import { enrichLead } from './llm';
```

### Use `type` keyword for type-only imports:

```typescript
// ✅ Correct
import type { Lead, EnrichedLead } from './types.ts';

// ❌ Incorrect
import { Lead, EnrichedLead } from './types.ts';
```

### Mixed imports (types + values):

```typescript
import { functionName, type TypeName } from './module.ts';
```
