import { getExecutionTime } from '../utils.js';
import type { EnrichedCompany, DataPoint } from '../types/company.js';
import type { CompanyAnalysis } from '../types/company-analysis.js';
import type { EnrichmentContext } from './enrichment-context.js';
import type { DiscoveryStepResult } from './agent-coordinator.js';

/**
 * Result returned by the enrichment orchestrator
 */
export interface EnrichmentResult {
  enrichedCompany: EnrichedCompany;
  executionTime: string;
  sources: string[];
  companyAnalysis?: CompanyAnalysis;
}

/**
 * Error structure for enrichment failures
 */
export interface EnrichmentError {
  error: string;
  details?: string;
}

/**
 * Helper function to count meaningful data points in enriched company data
 */
export const countDataPointsFound = (enrichedCompany: EnrichedCompany): number => {
  return Object.keys(enrichedCompany)
    .filter((key) => key !== 'socialMediaLinks')
    .filter((key) => {
      const value = enrichedCompany[key as keyof typeof enrichedCompany];
      if (value && typeof value === 'object' && 'content' in value && 'confidenceScore' in value && 'source' in value) {
        return value.content?.trim();
      }
      return false;
    }).length;
};

/**
 * Creates the final enrichment result with all sources and analysis
 */
export const createFinalResult = (
  baseDataPoints: Record<string, DataPoint | undefined>,
  context: EnrichmentContext,
  discoveryResult: DiscoveryStepResult,
  companyAnalysis?: CompanyAnalysis
): EnrichmentResult => {
  const enrichedCompany: EnrichedCompany = {
    ...baseDataPoints,
    socialMediaLinks: discoveryResult.socialMediaLinks,
  };
  
  const sourceUrls = context.sourcesManager.getSources(discoveryResult.finalURL);
  const executionTime = getExecutionTime(context.startTime);

  const result: EnrichmentResult = {
    enrichedCompany,
    executionTime,
    sources: sourceUrls,
    companyAnalysis,
  };

  const dataPointsFound = countDataPointsFound(enrichedCompany);
  const socialLinksFound = discoveryResult.socialMediaLinks?.length || 0;

  context.progressReporter.reportEnrichmentCompleted(dataPointsFound, sourceUrls.length, socialLinksFound);
  
  return result;
};
