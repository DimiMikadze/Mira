import { Agent, run } from '@openai/agents';
import { AGENT_CONFIGS } from '../constants/agent-config.js';
import { scrape } from '../services/scraper.js';
import { DATA_POINT_PAGE_MAPPING, DATA_POINT_DESCRIPTIONS } from '../constants/data-points.js';
import { createDataPointsSchema, InternalPagesSchema, DataPoint } from '../types/company.js';
import {
  createDiscoveryDataPointsPrompt,
  createDiscoveryInternalLinksPrompt,
  DISCOVERY_DATA_POINTS_AGENT_INSTRUCTIONS,
  DISCOVERY_INTERNAL_LINKS_AGENT_INSTRUCTIONS,
} from '../constants/prompts.js';
import { ScrapingResult } from '../types/scraper.js';

/**
 * Discovery Agent
 *
 * Analyzes the main landing page to extract initial company data and identify
 * internal pages for further enrichment. Uses two specialized sub-agents.
 */

// Creates an agent to extract company data points from landing page content
const createDiscoveryDataPointsAgent = () => {
  const landingPageDataPoints = DATA_POINT_PAGE_MAPPING.landingPage;
  const dataPointsSchema = createDataPointsSchema(landingPageDataPoints);

  return new Agent({
    name: 'Discovery Data Points Agent',
    model: AGENT_CONFIGS.discoveryDataPoints.model,
    modelSettings: { temperature: AGENT_CONFIGS.discoveryDataPoints.temperature },
    outputType: dataPointsSchema,
    instructions: DISCOVERY_DATA_POINTS_AGENT_INSTRUCTIONS,
  });
};

// Creates an agent to identify and categorize internal page URLs
const createDiscoveryInternalLinksAgent = () => {
  return new Agent({
    name: 'Discovery Internal Links Agent',
    model: AGENT_CONFIGS.discoveryInternalLinks.model,
    modelSettings: { temperature: AGENT_CONFIGS.discoveryInternalLinks.temperature },
    outputType: InternalPagesSchema,
    instructions: DISCOVERY_INTERNAL_LINKS_AGENT_INSTRUCTIONS,
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
 * 2. Internal links agent - identifies pages for further analysis
 */
export const runDiscoveryAgent = async (url: string) => {
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
    const landingPageDataPoints = DATA_POINT_PAGE_MAPPING.landingPage;
    const dataPointDescriptions = landingPageDataPoints
      .map((key) => `- ${key}: ${DATA_POINT_DESCRIPTIONS[key]}`)
      .join('\n');

    // Initialize both specialized discovery agents
    const discoveryDataPointsAgent = createDiscoveryDataPointsAgent();
    const discoveryInternalLinksAgent = createDiscoveryInternalLinksAgent();

    // Build prompts with scraped content for each agent
    const discoveryDataPointsPrompt = createDiscoveryDataPointsPrompt(
      dataPointDescriptions,
      finalURL,
      content,
      metaTitle
    );
    const discoveryInternalLinksPrompt = createDiscoveryInternalLinksPrompt(finalURL, links);

    console.info(`[DiscoveryAgent] Running parallel specialized agents...`);

    // Execute both agents concurrently for faster processing
    const [discoveryDataPointsResponse, discoveryInternalLinksResponse] = await Promise.all([
      run(discoveryDataPointsAgent, discoveryDataPointsPrompt),
      run(discoveryInternalLinksAgent, discoveryInternalLinksPrompt),
    ]);

    // Ensure both agents returned valid outputs
    if (!discoveryDataPointsResponse?.finalOutput) {
      return { success: false, error: 'No output received from discovery data points agent' };
    }

    if (!discoveryInternalLinksResponse?.finalOutput) {
      return { success: false, error: 'No output received from discovery internal links agent' };
    }

    const dataPoints = toDataPoints(discoveryDataPointsResponse.finalOutput, finalURL);
    const internalPages = discoveryInternalLinksResponse.finalOutput;

    console.info(
      `[DiscoveryAgent] Success: ${Object.keys(dataPoints).length} data points, ${
        Object.keys(internalPages).length
      } internal pages`
    );

    return {
      success: true,
      dataPoints,
      internalPages,
      socialMediaLinks: socialMediaLinks,
      finalURL,
    };
  } catch (error) {
    console.error('[runDiscoveryAgent] Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown agent error',
    };
  }
};
