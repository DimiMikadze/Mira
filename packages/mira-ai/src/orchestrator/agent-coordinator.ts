import { runDiscoveryAgent } from '../agents/discovery-agent.js';
import { runInternalPagesAgent } from '../agents/internal-pages-agent.js';
import { runLinkedInAgent } from '../agents/linkedin-agent.js';
import { runGoogleSearchAgent } from '../agents/google-search-agent.js';
import { runCompanyAnalysisAgent } from '../agents/company-analysis-agent.js';
import type { DataPoint, EnrichedCompany, CustomDataPoint } from '../types/company.js';
import type { DiscoveryOutput } from '../types/agent.js';
import type { CompanyAnalysis } from '../types/company-analysis.js';
import { getDataPointsNeedingImprovement } from './data-merger.js';

/**
 * Discovery step result
 */
export interface DiscoveryStepResult {
  dataPoints: Record<string, DataPoint | undefined>;
  internalPages: Record<string, string | null | undefined>;
  socialMediaLinks: string[];
  finalURL: string;
  googleQueries?: Record<string, string[]>;
}

/**
 * LinkedIn enrichment options
 */
export interface LinkedInEnrichmentOptions {
  linkedInUrl: string;
  baseDataPoints: Record<string, DataPoint | undefined>;
  dataPoints: CustomDataPoint[];
  confidenceThreshold?: number;
}

/**
 * Google search enrichment options
 */
export interface GoogleSearchEnrichmentOptions {
  companyName: string;
  domain: string;
  baseDataPoints: Record<string, DataPoint | undefined>;
  dataPoints: CustomDataPoint[];
  googleQueries?: Record<string, string[]>;
  confidenceThreshold?: number;
}

/**
 * Company analysis options
 */
export interface CompanyAnalysisOptions {
  companyCriteria?: string;
  enrichedCompany: EnrichedCompany;
}

/**
 * Runs the discovery agent and returns structured results
 */
export const runDiscoveryStep = async (
  url: string,
  dataPoints: CustomDataPoint[],
  includeGoogleQueries: boolean = false
): Promise<DiscoveryStepResult> => {
  console.info(`[Orchestrator] Starting website discovery with AI agent for: ${url}`);

  const discoveryAgentResult = await runDiscoveryAgent(url, dataPoints, includeGoogleQueries);

  if (!discoveryAgentResult.success) {
    throw new Error(`Website discovery agent failed: ${discoveryAgentResult.error}`);
  }

  return {
    dataPoints: discoveryAgentResult.dataPoints ?? {},
    internalPages: discoveryAgentResult.internalPages ?? {},
    socialMediaLinks: discoveryAgentResult.socialMediaLinks || [],
    finalURL: discoveryAgentResult.finalURL!,
    googleQueries: discoveryAgentResult.googleQueries,
  };
};

/**
 * Runs the internal pages agent
 */
export const runInternalPagesStep = async (
  discoveryResult: DiscoveryStepResult,
  dataPoints: CustomDataPoint[]
): Promise<Record<string, DataPoint | undefined>> => {
  const input: DiscoveryOutput = {
    dataPoints: discoveryResult.dataPoints,
    internalPages: discoveryResult.internalPages,
  };

  const internalPagesResult = await runInternalPagesAgent(input, dataPoints);

  if (!internalPagesResult.success) {
    throw new Error(`Internal pages agent failed: ${internalPagesResult.error}`);
  }

  return internalPagesResult.dataPoints ?? {};
};

/**
 * Attempts LinkedIn enrichment if URL is available and data is needed
 */
export const runLinkedInEnrichmentStep = async (
  options: LinkedInEnrichmentOptions
): Promise<{
  extracted: Record<string, DataPoint | undefined>;
  sourcesUsed: Set<string>;
}> => {
  const { linkedInUrl, baseDataPoints, confidenceThreshold = 3 } = options;

  // Get the data point keys we should look for from the configured data points
  const dataPointKeys = options.dataPoints.map((dp) => dp.name);
  const needs = getDataPointsNeedingImprovement(baseDataPoints, dataPointKeys, confidenceThreshold);
  const sourcesUsed = new Set<string>();

  if (needs.length === 0) {
    console.info('[Orchestrator] LinkedIn URL found but no additional data points needed');
    return { extracted: {}, sourcesUsed };
  }

  console.info(`[Orchestrator] Running LinkedIn agent for: ${needs.join(', ')}`);

  try {
    const linkedInResult = await runLinkedInAgent({
      linkedInUrl,
      needs: needs as string[],
      dataPoints: options.dataPoints,
    });

    if (linkedInResult.success && linkedInResult.extracted) {
      // Track sources used
      Object.values(linkedInResult.extracted).forEach((dataPoint) => {
        if (dataPoint?.source) {
          sourcesUsed.add(dataPoint.source);
        }
      });

      // Add LinkedIn URL to sources if we extracted any data
      const hasExtractedData = Object.values(linkedInResult.extracted).some(
        (dataPoint) => dataPoint && dataPoint.content?.trim()
      );
      if (hasExtractedData) {
        sourcesUsed.add(linkedInUrl);
      }

      console.info(`[Orchestrator] LinkedIn enrichment merged keys=${Object.keys(linkedInResult.extracted).length}`);

      // Convert null values to undefined to match our type system
      const extracted: Record<string, DataPoint | undefined> = {};
      Object.entries(linkedInResult.extracted).forEach(([key, value]) => {
        extracted[key] = value || undefined;
      });

      return { extracted, sourcesUsed };
    } else {
      console.warn('[Orchestrator] LinkedIn agent failed:', linkedInResult.error);
      throw new Error(linkedInResult.error || 'LinkedIn agent failed');
    }
  } catch (error) {
    console.warn('[Orchestrator] LinkedIn agent error:', error);
    throw error;
  }
};

/**
 * Attempts Google search enrichment for missing data points
 */
export const runGoogleSearchEnrichmentStep = async (
  options: GoogleSearchEnrichmentOptions
): Promise<{
  extracted: Record<string, DataPoint | undefined>;
  sourcesUsed: Set<string>;
}> => {
  const { companyName, domain, baseDataPoints, googleQueries = {}, confidenceThreshold = 3 } = options;

  // Get the data point keys we should look for from the configured data points
  const dataPointKeys = options.dataPoints.map((dp) => dp.name);
  const needs = getDataPointsNeedingImprovement(baseDataPoints, dataPointKeys, confidenceThreshold);
  const sourcesUsed = new Set<string>();

  if (needs.length === 0 || !domain) {
    console.info('[Orchestrator] Google search: no data points need improvement');
    return { extracted: {}, sourcesUsed };
  }

  // Skip Google search if no queries are provided
  if (Object.keys(googleQueries).length === 0) {
    console.info('[Orchestrator] No Google queries provided - skipping Google search');
    return { extracted: {}, sourcesUsed };
  }

  console.info(`[Orchestrator] Running Google Search agent for: ${needs.join(', ')}`);

  const googleResult = await runGoogleSearchAgent({
    companyName,
    domain,
    needs: needs as string[],
    dataPoints: options.dataPoints,
    googleQueries,
    baseDataPoints,
  });

  if (googleResult.success && googleResult.extracted) {
    // Track sources used
    Object.values(googleResult.extracted).forEach((dataPoint) => {
      if (dataPoint?.source) {
        sourcesUsed.add(dataPoint.source);
      }
    });

    console.info(`[Orchestrator] Google enrichment merged keys=${Object.keys(googleResult.extracted).length}`);

    // Convert null values to undefined to match our type system
    const extracted: Record<string, DataPoint | undefined> = {};
    Object.entries(googleResult.extracted).forEach(([key, value]) => {
      extracted[key] = value || undefined;
    });

    return { extracted, sourcesUsed };
  } else if (!googleResult.success) {
    console.warn('[Orchestrator] Google Search agent skipped or failed:', googleResult.error);
  }

  return { extracted: {}, sourcesUsed };
};

/**
 * Runs company analysis agent
 */
export const runCompanyAnalysisStep = async (options: CompanyAnalysisOptions): Promise<CompanyAnalysis | undefined> => {
  try {
    const result = await runCompanyAnalysisAgent(options);
    if (result.success && result.extracted) {
      return result.extracted;
    }
  } catch (error) {
    console.error('[Orchestrator] Company Analysis failed:', error);
  }
  return undefined;
};

/**
 * Finds LinkedIn company URL from social media links
 */
export const findLinkedInCompanyUrl = (socialMediaLinks: string[]): string | undefined => {
  return socialMediaLinks.find((link) => link.includes('linkedin.com/company/'));
};

/**
 * Extracts domain from final URL
 */
export const extractDomain = (finalURL: string): string => {
  return new URL(finalURL).hostname;
};
