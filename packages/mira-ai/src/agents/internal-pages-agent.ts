import { Agent, run } from '@openai/agents';
import { AGENT_CONFIGS } from '../constants/agent-config.js';
import { scrape } from '../services/scraper.js';
import { createDataPointsSchema, DataPoint, CustomDataPoint } from '../types/company.js';
import { InternalPageType, DiscoveryOutput } from '../types/agent.js';
import { createInternalPagePrompt, INTERNAL_PAGE_AGENT_INSTRUCTIONS } from '../constants/prompts.js';

/**
 * Internal Pages Agent
 *
 * Processes specific internal pages (about, careers, blog, etc.) to extract
 * detailed company information and merges it with discovery data.
 */

// Result of extracting data from a single internal page
type PageExtractionResult = {
  pageType: InternalPageType;
  sourceUrl: string;
  extracted: Record<string, DataPoint>;
};

// Creates a specialized agent for extracting data from a specific page type
const createInternalPageAgent = (pageType: InternalPageType, dataPointKeys: string[]) => {
  return new Agent({
    name: `${pageType} Page Extraction Agent`,
    model: AGENT_CONFIGS.internalPages.model,
    modelSettings: { temperature: AGENT_CONFIGS.internalPages.temperature },
    outputType: createDataPointsSchema(dataPointKeys),
    instructions: INTERNAL_PAGE_AGENT_INSTRUCTIONS,
  });
};

// Converts LLM output to DataPoint objects with source URL attribution
const toDataPoints = (
  dataPointMap: Record<string, { content: string | null; confidenceScore: number } | null>,
  sourceUrl: string
): Record<string, DataPoint> => {
  const result: Record<string, DataPoint> = {};

  for (const [key, value] of Object.entries(dataPointMap)) {
    if (value !== null && value?.content !== null && value.content.trim()) {
      result[key] = {
        content: value.content.trim(),
        confidenceScore: value.confidenceScore,
        source: sourceUrl,
      };
    }
  }

  return result;
};

// Merges data points, keeping the highest confidence scores and logging changes
const mergeDataPointsPreferHigherConfidence = (
  base: Record<string, DataPoint | undefined>,
  incoming: Record<string, DataPoint>
): Record<string, DataPoint> => {
  const merged: Record<string, DataPoint> = { ...base } as Record<string, DataPoint>;
  for (const [key, value] of Object.entries(incoming)) {
    const existing = merged[key];
    if (!existing || value.confidenceScore > existing.confidenceScore) {
      if (existing) {
        console.info(
          `[InternalPagesAgent][merge] replace "${key}" existing=${existing.confidenceScore} incoming=${value.confidenceScore}`
        );
      } else {
        console.info(`[InternalPagesAgent][merge] add "${key}" confidence=${value.confidenceScore}`);
      }
      merged[key] = value;
    }
  }
  return merged;
};

// Builds formatted descriptions for data points to guide extraction
const buildDataPointDescriptions = (dataPoints: CustomDataPoint[], keys: string[]) =>
  dataPoints
    .filter((dp) => keys.includes(dp.name))
    .map((dp) => `- ${dp.name}: ${dp.description}`)
    .join('\n');

// Scrapes and extracts data from a single internal page
const extractFromInternalPage = async (
  pageType: InternalPageType,
  pageUrl: string,
  dataPoints: CustomDataPoint[]
): Promise<PageExtractionResult | null> => {
  try {
    console.info(`[InternalPagesAgent][extract] start ${pageType} → ${pageUrl}`);
    const scraped = await scrape({
      url: pageUrl,
      excludeHeaderAndFooter: true,
    });

    // Scrape returns content string when successful
    if (typeof scraped !== 'string') return null;
    const content = scraped;
    console.info(
      `[InternalPagesAgent][extract] scraped ${pageType} (${pageUrl}) contentLen=${content.length.toLocaleString()}`
    );

    // Use all available data points for each page - let the LLM decide what's relevant
    const keys = dataPoints.map((dp) => dp.name);
    const descriptions = buildDataPointDescriptions(dataPoints, keys);
    const agent = createInternalPageAgent(pageType, keys);

    const prompt = createInternalPagePrompt(pageType, keys, descriptions, pageUrl, content);

    console.info(`[InternalPagesAgent][extract] run LLM ${pageType} keys=${keys.length}`);
    const response = await run(agent, prompt);
    if (!response?.finalOutput) return null;

    const extracted = toDataPoints(response.finalOutput, pageUrl);
    console.info(`[InternalPagesAgent][extract] done ${pageType} extracted=${Object.keys(extracted).length}`);
    return { pageType, sourceUrl: pageUrl, extracted };
  } catch (error) {
    console.error(`[InternalPagesAgent] Failed to extract for ${pageType}:`, error);
    return null;
  }
};

/**
 * Main internal pages agent orchestrator
 *
 * Processes all discovered internal pages in parallel and merges
 * the extracted data with existing discovery results.
 */
export const runInternalPagesAgent = async (input: DiscoveryOutput, dataPoints: CustomDataPoint[]) => {
  try {
    console.info('[InternalPagesAgent] begin run');
    const baseDataPoints = { ...input.dataPoints };

    // Filter valid internal page URLs for processing
    const entries = Object.entries(input.internalPages || {}) as [InternalPageType, string | null | undefined][];
    const targets = entries
      .filter(([, url]) => typeof url === 'string' && !!url)
      .map(([pageType, url]) => ({ pageType, url: url as string }));

    if (targets.length === 0) {
      console.info('[InternalPagesAgent] no targets — nothing to do');
      return { success: true, dataPoints: baseDataPoints };
    }

    console.info(
      `[InternalPagesAgent] targets ${targets.map((t) => `${t.pageType}→${t.url}`).join(', ')} | existingDPs=${
        Object.keys(baseDataPoints).length
      }`
    );

    // Process all internal pages concurrently
    const results = await Promise.all(
      targets.map(({ pageType, url }) => extractFromInternalPage(pageType, url, dataPoints))
    );

    // Merge results with discovery data, preferring higher confidence scores
    let merged = { ...baseDataPoints } as Record<string, DataPoint>;

    for (const res of results) {
      if (!res) continue;
      merged = mergeDataPointsPreferHigherConfidence(merged, res.extracted);
    }

    console.info(
      `[InternalPagesAgent] complete mergedDPs=${Object.keys(merged).length} pagesProcessed=${
        results.filter(Boolean).length
      }`
    );
    return { success: true, dataPoints: merged };
  } catch (error) {
    console.error('[runInternalPagesAgent] Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown internal-pages agent error',
    } as const;
  }
};
