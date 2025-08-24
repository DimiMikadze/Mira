/**
 * LinkedIn Agent
 *
 * Scrapes LinkedIn company pages and uses LLM analysis to extract company data points.
 * Steps:
 * 1) Scrape LinkedIn company page using the linkedin-company-scraper
 * 2) Use LLM to analyze raw LinkedIn content and extract requested data points
 * 3) Return extracted data points with confidence scores and LinkedIn URL as source
 *
 * The agent runs after internal pages and before Google search, focusing on
 * data points that are particularly well-represented on LinkedIn profiles.
 */

import { Agent, run } from '@openai/agents';
import { AGENT_CONFIGS } from '../constants/agent-config.js';
import { scrapeLinkedInCompany } from '../services/linkedin-company-scraper.js';
import { DATA_POINT_DESCRIPTIONS, LINKEDIN_DATA_POINTS } from '../constants/data-points.js';
import { createDataPointsSchema, DataPoint } from '../types/company.js';
import { createLinkedInPrompt, LINKEDIN_AGENT_INSTRUCTIONS } from '../constants/prompts.js';

// Allowed data point keys for LinkedIn enrichment
type LinkedInDataPointKey = (typeof LINKEDIN_DATA_POINTS)[number];

/** Input expected by the LinkedIn Agent */
export interface LinkedInAgentInput {
  linkedInUrl: string;
  needs: LinkedInDataPointKey[];
}

/** Output from the LinkedIn Agent */
export interface LinkedInAgentOutput {
  success: boolean;
  extracted: Record<string, DataPoint | null>;
  error?: string;
}

/**
 * Creates the LinkedIn agent for analyzing LinkedIn content
 */
export const createLinkedInAgent = (keys: string[]) =>
  new Agent({
    name: 'LinkedIn Agent',
    model: AGENT_CONFIGS.linkedin.model,
    modelSettings: { temperature: AGENT_CONFIGS.linkedin.temperature },
    outputType: createDataPointsSchema(keys),
    instructions: LINKEDIN_AGENT_INSTRUCTIONS,
  });

/**
 * Runs the LinkedIn Agent end-to-end
 */
export const runLinkedInAgent = async (input: LinkedInAgentInput): Promise<LinkedInAgentOutput> => {
  try {
    const { linkedInUrl, needs } = input;

    if (!linkedInUrl || !Array.isArray(needs)) {
      return { success: false, extracted: {}, error: 'Invalid input: linkedInUrl and needs are required' };
    }

    // Validate that requested data points are supported
    const unsupportedNeeds = needs.filter((need) => !LINKEDIN_DATA_POINTS.includes(need));
    if (unsupportedNeeds.length > 0) {
      return {
        success: false,
        extracted: {},
        error: `Unsupported data points: ${unsupportedNeeds.join(', ')}. Supported: ${LINKEDIN_DATA_POINTS.join(', ')}`,
      };
    }

    console.info(`[LinkedInAgent] Scraping LinkedIn URL: ${linkedInUrl}`);

    // Step 1: Scrape LinkedIn page
    const scraperResult = await scrapeLinkedInCompany(linkedInUrl);

    if (!scraperResult.success || !scraperResult.data) {
      return {
        success: false,
        extracted: {},
        error: `LinkedIn scraping failed: ${scraperResult.error}`,
      };
    }

    const linkedInData = scraperResult.data;
    console.info(
      `[LinkedInAgent] Scraper extracted ${Object.keys(linkedInData).length} fields, content length: ${
        linkedInData.content?.length || 0
      }`
    );

    // Step 2: Run LLM analysis on LinkedIn content
    const dataPointKeys = needs as string[];
    const descriptions = dataPointKeys.map((key) => `- ${key}: ${DATA_POINT_DESCRIPTIONS[key]}`).join('\n');

    const prompt = createLinkedInPrompt(descriptions, linkedInUrl, linkedInData);
    const agent = createLinkedInAgent(dataPointKeys);

    console.info(`[LinkedInAgent] Running LLM analysis for ${dataPointKeys.length} data points`);
    const response = await run(agent, prompt);

    // The schema returns { content, confidenceScore } or null per key.
    type LLMDataPointMap = Record<string, { content: string; confidenceScore: number } | null>;
    const llmOutput = (response?.finalOutput as unknown as LLMDataPointMap) || {};
    const extracted: Record<string, DataPoint | null> = {};

    for (const key of dataPointKeys) {
      const val = llmOutput[key];
      extracted[key] = val && typeof val.content === 'string' ? { ...val, source: linkedInUrl } : null;
    }

    const extractedKeys = Object.keys(extracted).filter((k) => extracted[k]);
    console.info(`[LinkedInAgent] extracted keys=${extractedKeys.join(', ') || 'none'}`);

    return { success: true, extracted };
  } catch (error) {
    console.error('[LinkedInAgent] error:', error);
    return {
      success: false,
      extracted: {},
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
