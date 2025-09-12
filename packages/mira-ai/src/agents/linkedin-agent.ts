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
import { createDataPointsSchema, DataPoint, CustomDataPoint } from '../types/company.js';
import { createLinkedInPrompt, LINKEDIN_AGENT_INSTRUCTIONS } from '../constants/prompts.js';
import { SPECIAL_DATA_POINTS, isSpecialDataPoint } from '../constants/special-data-points.js';
import type { LinkedInEmployee, LinkedInPost } from '../types/linkedin.js';

/** Input expected by the LinkedIn Agent */
export interface LinkedInAgentInput {
  linkedInUrl: string;
  needs: string[];
  dataPoints: CustomDataPoint[];
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
    const { linkedInUrl, needs, dataPoints } = input;

    if (!linkedInUrl || !Array.isArray(needs) || !Array.isArray(dataPoints)) {
      return { success: false, extracted: {}, error: 'Invalid input: linkedInUrl, needs, and dataPoints are required' };
    }

    // Validate that all requested data points are provided in the dataPoints array
    const availableDataPointNames = dataPoints.map((dp) => dp.name);
    const missingDataPoints = needs.filter((need) => !availableDataPointNames.includes(need));
    if (missingDataPoints.length > 0) {
      return {
        success: false,
        extracted: {},
        error: `Missing data point definitions: ${missingDataPoints.join(', ')}`,
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

    // Step 2: Pre-extract special data points from scraper data
    const extracted: Record<string, DataPoint | null> = {};
    const requestedDataPoints = needs as string[];

    // Handle special data points that come directly from scraper
    for (const dataPointName of requestedDataPoints) {
      if (isSpecialDataPoint(dataPointName)) {
        console.info(`[LinkedInAgent] Processing special data point: ${dataPointName}`);

        if (dataPointName === SPECIAL_DATA_POINTS.LINKEDIN_EMPLOYEES) {
          const employees: LinkedInEmployee[] = Array.isArray(linkedInData.LINKEDIN_EMPLOYEES)
            ? linkedInData.LINKEDIN_EMPLOYEES
            : [];
          extracted[SPECIAL_DATA_POINTS.LINKEDIN_EMPLOYEES] =
            employees.length > 0
              ? {
                  content: JSON.stringify(employees),
                  confidenceScore: 5,
                  source: linkedInUrl,
                }
              : null;
          console.info(
            `[LinkedInAgent] ${SPECIAL_DATA_POINTS.LINKEDIN_EMPLOYEES}: extracted ${employees.length} employees`
          );
        }

        if (dataPointName === SPECIAL_DATA_POINTS.LINKEDIN_POSTS) {
          const posts: LinkedInPost[] = Array.isArray(linkedInData.LINKEDIN_POSTS) ? linkedInData.LINKEDIN_POSTS : [];
          extracted[SPECIAL_DATA_POINTS.LINKEDIN_POSTS] =
            posts.length > 0
              ? {
                  content: JSON.stringify(posts),
                  confidenceScore: 5,
                  source: linkedInUrl,
                }
              : null;
          console.info(`[LinkedInAgent] ${SPECIAL_DATA_POINTS.LINKEDIN_POSTS}: extracted ${posts.length} posts`);
        }
      }
    }

    // Step 3: Run LLM analysis for non-special data points
    const llmDataPoints = requestedDataPoints.filter((key) => !isSpecialDataPoint(key));

    if (llmDataPoints.length > 0) {
      const descriptions = dataPoints
        .filter((dp) => llmDataPoints.includes(dp.name))
        .map((dp) => `- ${dp.name}: ${dp.description}`)
        .join('\n');

      const prompt = createLinkedInPrompt(descriptions, linkedInUrl, linkedInData);
      const agent = createLinkedInAgent(llmDataPoints);

      console.info(
        `[LinkedInAgent] Running LLM analysis for ${llmDataPoints.length} data points: ${llmDataPoints.join(', ')}`
      );
      const response = await run(agent, prompt);

      // The schema returns { content, confidenceScore } or null per key.
      type LLMDataPointMap = Record<string, { content: string; confidenceScore: number } | null>;
      const llmOutput = (response?.finalOutput as unknown as LLMDataPointMap) || {};

      // Merge LLM results with special data points
      for (const key of llmDataPoints) {
        const val = llmOutput[key];
        extracted[key] = val && typeof val.content === 'string' ? { ...val, source: linkedInUrl } : null;
      }
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
