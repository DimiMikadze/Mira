import { createProgressReporter, type ProgressCallback } from './progress-manager.js';
import { createSourcesManager } from './sources-manager.js';
import { MINIMUM_CONFIDENCE_THRESHOLD, LIMIT_INTERNAL_PAGES, LIMIT_GOOGLE_QUERIES } from '../constants/index.js';
import type { EnrichmentConfig, CustomDataPoint, Analysis } from '../types/company.js';

/**
 * Configuration context for the enrichment process
 */
export interface EnrichmentContext {
  url: string;
  linkedinUrl?: string;
  startTime: number;
  minimumConfidenceThreshold: number;
  maxInternalPages: number;
  maxGoogleQueries: number;
  dataPoints: CustomDataPoint[];
  sourcesConfig: {
    crawl: boolean;
    google: boolean;
    linkedin: boolean;
  };
  analysisConfig?: Analysis;
  progressReporter: ReturnType<typeof createProgressReporter>;
  sourcesManager: ReturnType<typeof createSourcesManager>;
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
  onProgress?: ProgressCallback;
  enrichmentConfig?: EnrichmentConfig;
  minimumConfidenceThreshold?: number;
  maxInternalPages?: number;
  maxGoogleQueries?: number;
  linkedinUrl?: string;
}

/**
 * Validates API keys and throws errors if missing
 */
const validateApiKeys = (config: MiraConfig): void => {
  if (!config.apiKeys.openaiApiKey) {
    throw new Error('OpenAI API key is required');
  }
  if (!config.apiKeys.scrapingBeeApiKey) {
    throw new Error('ScrapingBee API key is required');
  }
};

/**
 * Sets up environment variables for the enrichment run
 */
const setupEnvironment = (config: MiraConfig): void => {
  process.env.OPENAI_API_KEY = config.apiKeys.openaiApiKey;
  process.env.SCRAPING_BEE_API_KEY = config.apiKeys.scrapingBeeApiKey;
};

/**
 * Creates sources configuration from enrichment config
 */
const createSourcesConfig = (enrichmentConfig?: EnrichmentConfig) => ({
  crawl: enrichmentConfig?.sources?.crawl ?? false,
  google: enrichmentConfig?.sources?.google ?? false,
  linkedin: enrichmentConfig?.sources?.linkedin ?? false,
});

/**
 * Initializes the enrichment context with all necessary configuration and managers
 */
export const initializeEnrichmentContext = (
  url: string,
  config: MiraConfig,
  options?: MiraEnrichmentOptions
): EnrichmentContext => {
  // Validate and setup
  validateApiKeys(config);
  setupEnvironment(config);

  const {
    onProgress,
    enrichmentConfig,
    minimumConfidenceThreshold = MINIMUM_CONFIDENCE_THRESHOLD,
    maxInternalPages = LIMIT_INTERNAL_PAGES,
    maxGoogleQueries = LIMIT_GOOGLE_QUERIES,
    linkedinUrl,
  } = options || {};

  const sourcesConfig = createSourcesConfig(enrichmentConfig);
  const analysisConfig = enrichmentConfig?.analysis;
  const progressReporter = createProgressReporter(onProgress, sourcesConfig);
  const sourcesManager = createSourcesManager();
  const dataPoints = enrichmentConfig?.dataPoints || [];

  return {
    url,
    linkedinUrl,
    startTime: Date.now(),
    minimumConfidenceThreshold,
    maxInternalPages,
    maxGoogleQueries,
    dataPoints,
    sourcesConfig,
    analysisConfig,
    progressReporter,
    sourcesManager,
  };
};
