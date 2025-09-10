import { Agent, run } from '@openai/agents';
import { AGENT_CONFIGS } from '../constants/agent-config.js';
import { scrape } from '../services/scraper.js';
import {
  createDataPointsSchema,
  DataPoint,
  CustomDataPoint,
  DiscoveryPagesAndQueriesSchema,
} from '../types/company.js';
import {
  createDiscoveryDataPointsPrompt,
  createDiscoveryPagesAndQueriesPrompt,
  DISCOVERY_DATA_POINTS_AGENT_INSTRUCTIONS,
  DISCOVERY_PAGES_AND_QUERIES_AGENT_INSTRUCTIONS,
} from '../constants/prompts.js';
import { ScrapingResult } from '../types/scraper.js';

/**
 * Discovery Agent
 *
 * Analyzes the main landing page to extract initial company data and identify
 * internal pages for further enrichment. Uses two specialized sub-agents.
 */

// Creates an agent to extract company data points from landing page content
const createDiscoveryDataPointsAgent = (dataPoints: CustomDataPoint[]) => {
  const dataPointKeys = dataPoints.map((dp) => dp.name);
  const dataPointsSchema = createDataPointsSchema(dataPointKeys);

  return new Agent({
    name: 'Discovery Data Points Agent',
    model: AGENT_CONFIGS.discoveryDataPoints.model,
    modelSettings: { temperature: AGENT_CONFIGS.discoveryDataPoints.temperature },
    outputType: dataPointsSchema,
    instructions: DISCOVERY_DATA_POINTS_AGENT_INSTRUCTIONS,
  });
};

// Creates a combined agent to identify internal pages AND generate Google search queries
const createDiscoveryPagesAndQueriesAgent = () => {
  return new Agent({
    name: 'Discovery Pages and Queries Agent',
    model: AGENT_CONFIGS.discoveryInternalLinks.model,
    modelSettings: { temperature: AGENT_CONFIGS.discoveryInternalLinks.temperature },
    outputType: DiscoveryPagesAndQueriesSchema,
    instructions: DISCOVERY_PAGES_AND_QUERIES_AGENT_INSTRUCTIONS,
  });
};

// Converts raw LLM output to structured DataPoint objects with source attribution
const toDataPoints = (
  extractionResult: Record<string, { content: string | null; confidenceScore: number } | null>,
  sourceUrl: string
): Record<string, DataPoint> => {
  const result: Record<string, DataPoint> = {};

  Object.entries(extractionResult).forEach(([key, value]) => {
    if (value !== null && value?.content !== null && value.content.trim()) {
      result[key] = {
        content: value.content.trim(),
        confidenceScore: value.confidenceScore,
        source: sourceUrl,
      };
    }
  });

  return result;
};

/**
 * Main discovery agent orchestrator
 *
 * Scrapes the company's landing page and runs two specialized agents in parallel:
 * 1. Data extraction agent - extracts company information
 * 2. Pages and queries agent - identifies internal pages and generates Google search queries
 */
export const runDiscoveryAgent = async (
  url: string,
  requestedDataPoints: CustomDataPoint[],
  includeGoogleQueries: boolean = false,
  includeCrawl: boolean = false
) => {
  try {
    console.info(`[DiscoveryAgent] Discovering website structure and content: ${url}`);

    // Scrape the landing page for content and links
    const scrapedData = await scrape({
      url,
      extractLinks: true,
      extractMetaTitle: true,
      includeFinalURL: true,
      excludeHeaderAndFooter: false,
    });

    if (!scrapedData || typeof scrapedData === 'string') {
      return { success: false, error: 'Failed to scrape website for discovery' };
    }

    const { content, links, socialMediaLinks, metaTitle, finalURL } = scrapedData as ScrapingResult & {
      finalURL: string;
    };

    // Prepare data point descriptions for the extraction agent
    const dataPointDescriptions = requestedDataPoints.map((dp) => `- ${dp.name}: ${dp.description}`).join('\n');

    // Get company name and domain for combined agent
    const companyName = metaTitle || finalURL.split('//')[1]?.split('/')[0] || 'Unknown Company';
    const domain = finalURL.split('//')[1]?.split('/')[0] || '';

    // Initialize discovery data points agent (always runs)
    const discoveryDataPointsAgent = createDiscoveryDataPointsAgent(requestedDataPoints);

    // Build prompt for data extraction agent
    const discoveryDataPointsPrompt = createDiscoveryDataPointsPrompt(
      dataPointDescriptions,
      finalURL,
      content,
      metaTitle
    );

    console.info(`[DiscoveryAgent] Running data extraction agent...`);

    // Step 1: Always run data extraction agent first
    const discoveryDataPointsResponse = await run(discoveryDataPointsAgent, discoveryDataPointsPrompt);

    // Ensure data points agent returned valid output
    if (!discoveryDataPointsResponse?.finalOutput) {
      return { success: false, error: 'No output received from discovery data points agent' };
    }

    const dataPoints = toDataPoints(discoveryDataPointsResponse.finalOutput, finalURL);

    // Step 2: Only run pages and queries agent if crawl or Google search is enabled
    let discoveryPagesAndQueriesResponse = null;
    if (includeCrawl || includeGoogleQueries) {
      // Filter to only data points that weren't successfully extracted or have low confidence
      const minimumConfidenceThreshold = 4;
      const neededDataPoints = requestedDataPoints.filter((dp) => {
        const existing = dataPoints[dp.name];
        return !existing || existing.confidenceScore < minimumConfidenceThreshold;
      });

      if (neededDataPoints.length === 0) {
        console.info(
          `[DiscoveryAgent] All data points extracted with high confidence from landing page, skipping pages/queries generation`
        );
      } else {
        console.info(
          `[DiscoveryAgent] Generating pages/queries for ${neededDataPoints.length} data points: ${neededDataPoints
            .map((dp) => dp.name)
            .join(', ')}`
        );

        const discoveryPagesAndQueriesAgent = createDiscoveryPagesAndQueriesAgent();
        const discoveryPagesAndQueriesPrompt = createDiscoveryPagesAndQueriesPrompt(
          finalURL,
          companyName,
          domain,
          links,
          neededDataPoints, // Only pass data points that need improvement
          includeGoogleQueries,
          includeCrawl
        );
        console.log('discoveryPagesAndQueriesPrompt', discoveryPagesAndQueriesPrompt);

        discoveryPagesAndQueriesResponse = await run(discoveryPagesAndQueriesAgent, discoveryPagesAndQueriesPrompt);
      }
    }

    // Handle pages and queries response (may be null if neither crawl nor Google search enabled)
    let internalPages = {};
    let googleQueries = {};

    if (discoveryPagesAndQueriesResponse?.finalOutput) {
      const pagesAndQueries = discoveryPagesAndQueriesResponse.finalOutput;
      internalPages = pagesAndQueries.internalPages || {};
      googleQueries = pagesAndQueries.googleQueries || {};
    }

    console.info(
      `[DiscoveryAgent] Success: ${Object.keys(dataPoints).length} data points, ${
        Object.keys(internalPages).length
      } internal pages, ${Object.keys(googleQueries).length} Google query groups`
    );

    return {
      success: true,
      dataPoints,
      internalPages,
      socialMediaLinks: socialMediaLinks,
      finalURL,
      googleQueries,
    };
  } catch (error) {
    console.error('[runDiscoveryAgent] Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown agent error',
    };
  }
};
