import { getExecutionTime } from '../utils.js';
import type { EnrichedCompany, EnrichmentConfig } from '../types/company.js';
import type { CompanyAnalysis } from '../types/company-analysis.js';
import { createProgressReporter, countMeaningfulDataPoints, type ProgressCallback } from './progress-manager.js';
import { mergeDataPoints, countExtractedDataPoints } from './data-merger.js';
import { createSourcesManager, extractInternalPageUrls } from './sources-manager.js';
import { shouldTerminateEarly, getCompletionStats } from './early-termination.js';
import {
  runDiscoveryStep,
  runInternalPagesStep,
  runLinkedInEnrichmentStep,
  runGoogleSearchEnrichmentStep,
  runCompanyAnalysisStep,
  findLinkedInCompanyUrl,
  extractDomain,
} from './agent-coordinator.js';

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
 * API configuration for mira core
 */
export interface MiraConfig {
  apiKeys: {
    openaiApiKey: string;
    scrapingBeeApiKey: string;
  };
}

/**
 * Enrichment options
 */
export interface MiraEnrichmentOptions {
  companyCriteria?: string;
  onProgress?: ProgressCallback;
  enrichmentConfig?: EnrichmentConfig;
  minimumConfidenceThreshold?: number;
}

/**
 * Helper function to count meaningful data points in enriched company data
 */
const countDataPointsFound = (enrichedCompany: EnrichedCompany): number => {
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
 * Helper function to create final enrichment result
 */
const createFinalResult = (
  baseDataPoints: Record<string, any>,
  sourcesManager: any,
  discoveryResult: any,
  startTime: number,
  progressReporter: any,
  companyAnalysis?: CompanyAnalysis
): EnrichmentResult => {
  const enrichedCompany: EnrichedCompany = {
    ...baseDataPoints,
    socialMediaLinks: discoveryResult.socialMediaLinks,
  };
  const sourceUrls = sourcesManager.getSources(discoveryResult.finalURL);
  const executionTime = getExecutionTime(startTime);

  const result: EnrichmentResult = {
    enrichedCompany,
    executionTime,
    sources: sourceUrls,
    companyAnalysis,
  };

  const dataPointsFound = countDataPointsFound(enrichedCompany);
  const socialLinksFound = discoveryResult.socialMediaLinks?.length || 0;

  progressReporter.reportEnrichmentCompleted(dataPointsFound, sourceUrls.length, socialLinksFound);
  return result;
};

/**
 * Check if all data points are complete and terminate early if so
 */
const tryEarlyTermination = (
  baseDataPoints: Record<string, any>,
  dataPoints: any[],
  minimumConfidenceThreshold: number,
  sourcesManager: any,
  discoveryResult: any,
  startTime: number,
  progressReporter: any,
  stepName: string
): EnrichmentResult | null => {
  if (shouldTerminateEarly(baseDataPoints, dataPoints, minimumConfidenceThreshold)) {
    const stats = getCompletionStats(baseDataPoints, dataPoints, minimumConfidenceThreshold);
    console.info(
      `[Orchestrator] Early completion after ${stepName}: All ${stats.completed}/${
        stats.total
      } data points achieved high confidence (avg: ${stats.averageConfidence.toFixed(1)})`
    );
    progressReporter.reportEarlyTermination?.(stats.completed, stats.total, stats.averageConfidence);

    return createFinalResult(baseDataPoints, sourcesManager, discoveryResult, startTime, progressReporter);
  }
  return null;
};

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
  // Validate API keys
  if (!config.apiKeys.openaiApiKey) {
    throw new Error('OpenAI API key is required');
  }
  if (!config.apiKeys.scrapingBeeApiKey) {
    throw new Error('ScrapingBee API key is required');
  }

  // Set API keys in environment for this enrichment run
  process.env.OPENAI_API_KEY = config.apiKeys.openaiApiKey;
  process.env.SCRAPING_BEE_API_KEY = config.apiKeys.scrapingBeeApiKey;

  const startTime = Date.now();
  const { companyCriteria, onProgress, enrichmentConfig, minimumConfidenceThreshold = 4 } = options || {};
  const sourcesConfig = {
    crawl: enrichmentConfig?.sources?.crawl ?? false,
    google: enrichmentConfig?.sources?.google ?? false,
    linkedin: enrichmentConfig?.sources?.linkedin ?? false,
  };
  const progressReporter = createProgressReporter(onProgress, sourcesConfig);
  const sourcesManager = createSourcesManager();

  // Get data points from config (with fallback to empty array for now)
  const dataPoints = enrichmentConfig?.dataPoints || [];

  // Step 1: Discovery Agent
  progressReporter.reportDiscoveryStarted();
  const discoveryResult = await runDiscoveryStep(url, dataPoints, sourcesConfig.google);

  const discoveryDataPointsCount = countMeaningfulDataPoints(discoveryResult.dataPoints);
  const internalPagesCount = Object.keys(discoveryResult.internalPages).length;
  const socialLinksCount = discoveryResult.socialMediaLinks.length;

  progressReporter.reportDiscoveryCompleted(discoveryDataPointsCount, internalPagesCount, socialLinksCount);

  // Check if we already have all data points from just the landing page
  const discoveryCompletion = tryEarlyTermination(
    discoveryResult.dataPoints,
    dataPoints,
    minimumConfidenceThreshold,
    sourcesManager,
    discoveryResult,
    startTime,
    progressReporter,
    'discovery'
  );
  if (discoveryCompletion) return discoveryCompletion;

  // Step 2: Internal Pages Agent (if enabled)
  let internalPagesDataPoints = {};
  let internalPagesDataPointsCount = 0;

  // Extract internal page URLs (for source counting) regardless of crawl setting
  const internalPageUrls = extractInternalPageUrls(discoveryResult.internalPages);

  if (sourcesConfig.crawl) {
    progressReporter.reportInternalPagesStarted(internalPagesCount);
    internalPagesDataPoints = await runInternalPagesStep(discoveryResult, dataPoints);
    internalPagesDataPointsCount = countMeaningfulDataPoints(internalPagesDataPoints);

    // Add internal page URLs to sources
    sourcesManager.addSources(internalPageUrls);
  } else {
    // Internal pages crawling is disabled
    progressReporter.reportInternalPagesStarted(0); // This will show "Internal pages crawling disabled - skipping"
  }

  // Merge discovery and internal pages data
  let baseDataPoints = mergeDataPoints(discoveryResult.dataPoints, internalPagesDataPoints);

  // Check if we have all data points after internal pages
  const internalPagesCompletion = tryEarlyTermination(
    baseDataPoints,
    dataPoints,
    minimumConfidenceThreshold,
    sourcesManager,
    discoveryResult,
    startTime,
    progressReporter,
    'internal pages'
  );
  if (internalPagesCompletion) return internalPagesCompletion;

  // Step 3: LinkedIn Agent (if enabled and available)
  if (sourcesConfig.linkedin) {
    const linkedInUrl = findLinkedInCompanyUrl(discoveryResult.socialMediaLinks);

    if (linkedInUrl) {
      try {
        progressReporter.reportLinkedInStarted();
        const linkedInResult = await runLinkedInEnrichmentStep({
          linkedInUrl,
          baseDataPoints,
          dataPoints,
        });

        if (Object.keys(linkedInResult.extracted).length > 0) {
          baseDataPoints = mergeDataPoints(baseDataPoints, linkedInResult.extracted);
          const linkedInDataPointsCount = countExtractedDataPoints(linkedInResult.extracted);
          progressReporter.reportLinkedInCompleted(linkedInDataPointsCount);
          sourcesManager.addSourcesFromSet(linkedInResult.sourcesUsed);
        } else {
          progressReporter.reportLinkedInNoDataNeeded();
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'LinkedIn analysis failed';
        console.error('[Orchestrator] LinkedIn analysis failed:', errorMessage);
        progressReporter.reportLinkedInFailed(`LinkedIn analysis failed - continuing with other sources.`);
      }
    } else {
      progressReporter.reportLinkedInNotFound();
    }
  } else {
    // LinkedIn is disabled
    progressReporter.reportLinkedInStarted(); // This will show "LinkedIn analysis disabled - skipping"
  }

  // Report internal pages completion (needs to happen after LinkedIn)
  progressReporter.reportInternalPagesCompleted(internalPagesDataPointsCount, internalPagesCount);

  // Check if we have all data points after LinkedIn
  const linkedInCompletion = tryEarlyTermination(
    baseDataPoints,
    dataPoints,
    minimumConfidenceThreshold,
    sourcesManager,
    discoveryResult,
    startTime,
    progressReporter,
    'LinkedIn analysis'
  );
  if (linkedInCompletion) return linkedInCompletion;

  // Step 4: Google Search Agent (if enabled and for missing data points)
  if (sourcesConfig.google) {
    const domain = extractDomain(discoveryResult.finalURL);
    const companyName = baseDataPoints.name?.content?.trim() || domain || url;

    try {
      progressReporter.reportGoogleSearchStarted();
      const googleResult = await runGoogleSearchEnrichmentStep({
        companyName,
        domain,
        baseDataPoints,
        dataPoints,
        googleQueries: discoveryResult.googleQueries || {},
      });

      if (Object.keys(googleResult.extracted).length > 0) {
        baseDataPoints = mergeDataPoints(baseDataPoints, googleResult.extracted);
        sourcesManager.addSourcesFromSet(googleResult.sourcesUsed);
      }
    } catch (error) {
      console.warn('[Orchestrator] Google Search failed:', error);
    }
  } else {
    // Google search is disabled
    progressReporter.reportGoogleSearchStarted(); // This will show "Google search disabled - skipping"
  }

  // Report Google search completion
  const finalDataPointsCount = countMeaningfulDataPoints(baseDataPoints);
  progressReporter.reportGoogleSearchCompleted(finalDataPointsCount);

  // Step 5: Company Analysis Agent
  const hasCriteria = companyCriteria && companyCriteria.trim().length > 0;
  progressReporter.reportCompanyAnalysisStarted(hasCriteria as boolean);

  const enrichedCompany: EnrichedCompany = { ...baseDataPoints };
  const companyAnalysis = await runCompanyAnalysisStep({ companyCriteria, enrichedCompany });
  if (companyAnalysis) {
    progressReporter.reportCompanyAnalysisCompleted();
  }

  // Step 6: Final result compilation
  const result = createFinalResult(
    baseDataPoints,
    sourcesManager,
    discoveryResult,
    startTime,
    progressReporter,
    companyAnalysis
  );

  console.info(
    `[Orchestrator] sources assembled: internal=${internalPageUrls.length} + finalURL=1 + external=${
      result.sources.length - internalPageUrls.length - 1
    } → total=${result.sources.length}`
  );

  return result;
};

// Re-export types for convenience
export type { ProgressCallback };
export { shouldTerminateEarly, getCompletionStats } from './early-termination.js';
