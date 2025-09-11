// Re-export types and functions from the new modular structure
export type { ProgressCallback } from './progress-manager.js';
export { shouldTerminateEarly, getCompletionStats } from './early-termination.js';

// Import the new modular components
import { initializeEnrichmentContext, type MiraConfig, type MiraEnrichmentOptions } from './enrichment-context.js';
import { executeEnrichmentFlow } from './enrichment-flow.js';
import type { EnrichmentResult, EnrichmentError } from './result-builder.js';

// Re-export types from modular components
export type { EnrichmentResult, EnrichmentError } from './result-builder.js';
export type { MiraConfig, MiraEnrichmentOptions } from './enrichment-context.js';

/**
 * Orchestrates the company enrichment process by coordinating multiple AI agents
 * to extract comprehensive company information from websites.
 *
 * The enrichment process follows these steps:
 * 1. Discovery Agent - Analyzes the main landing page
 * 2. Internal Pages Agent - Extracts data from internal pages
 * 3. LinkedIn Agent - Analyzes LinkedIn company profile (if available)
 * 4. Google Search Agent - Fills missing/low-confidence data points (targeted)
 * 5. Company Analysis Agent - Generates actionable insights
 * 6. Data consolidation and result compilation
 *
 * @param url - The company's website URL to analyze
 * @param config - API configuration including API keys
 * @param options - Optional enrichment options (criteria, progress callback)
 * @returns Promise containing enriched company data, execution time, and source links
 * @throws Error if any critical agent fails during the enrichment process
 */
export const researchCompany = async (
  url: string,
  config: MiraConfig,
  options?: MiraEnrichmentOptions
): Promise<EnrichmentResult> => {
  // Initialize enrichment context with all configuration and managers
  const context = initializeEnrichmentContext(url, config, options);

  // Execute the complete enrichment flow
  return executeEnrichmentFlow(context);
};
