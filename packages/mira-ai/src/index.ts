// Main orchestrator function - SERVER ONLY
export { researchCompany } from './orchestrator/index.js';

// Export server-specific types (those needed when calling researchCompany)
export type {
  EnrichmentResult,
  EnrichmentError,
  ProgressCallback,
  MiraConfig,
  MiraEnrichmentOptions,
} from './orchestrator/index.js';

// Re-export all browser-safe types and constants from types
// This allows server-side code to import everything from 'mira'
export * from './types/index.js';
export * from './types.js';
