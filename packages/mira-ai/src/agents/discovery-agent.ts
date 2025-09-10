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
  includeGoogleQueries: boolean = false
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

    // Initialize both specialized discovery agents
    const discoveryDataPointsAgent = createDiscoveryDataPointsAgent(requestedDataPoints);
    const discoveryPagesAndQueriesAgent = createDiscoveryPagesAndQueriesAgent();

    // Build prompts with scraped content for each agent
    const discoveryDataPointsPrompt = createDiscoveryDataPointsPrompt(
      dataPointDescriptions,
      finalURL,
      content,
      metaTitle
    );
    const discoveryPagesAndQueriesPrompt = createDiscoveryPagesAndQueriesPrompt(
      finalURL,
      companyName,
      domain,
      links,
      requestedDataPoints,
      includeGoogleQueries
    );

    console.info(`[DiscoveryAgent] Running parallel specialized agents...`);

    // Execute both agents concurrently for faster processing
    const [discoveryDataPointsResponse, discoveryPagesAndQueriesResponse] = await Promise.all([
      run(discoveryDataPointsAgent, discoveryDataPointsPrompt),
      run(discoveryPagesAndQueriesAgent, discoveryPagesAndQueriesPrompt),
    ]);

    // Ensure both agents returned valid outputs
    if (!discoveryDataPointsResponse?.finalOutput) {
      return { success: false, error: 'No output received from discovery data points agent' };
    }

    if (!discoveryPagesAndQueriesResponse?.finalOutput) {
      return { success: false, error: 'No output received from discovery pages and queries agent' };
    }

    const dataPoints = toDataPoints(discoveryDataPointsResponse.finalOutput, finalURL);
    const pagesAndQueries = discoveryPagesAndQueriesResponse.finalOutput;
    const internalPages = pagesAndQueries.internalPages;
    const googleQueries = pagesAndQueries.googleQueries ?? {};

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
