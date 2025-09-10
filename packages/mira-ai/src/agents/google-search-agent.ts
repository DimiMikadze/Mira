/**
 * Google Search Agent
 *
 * Builds targeted Google queries based on missing data points, runs Google
 * Search, aggregates result snippets, and uses an LLM to extract the requested
 * data points with confidence scoring and a source URL per data point.
 * Optionally includes raw Google responses. Source selection is performed by
 * the LLM from the provided snippets; the agent does not post-process sources.
 * Ranking and deeper page parsing are handled by downstream steps.
 */
import { searchGoogle, type GoogleSearchResponse } from '../services/google-search.js';
import { Agent, run } from '@openai/agents';
import {
  GOOGLE_SEARCH_AGENT_INSTRUCTIONS,
  createGoogleSearchPrompt,
  type GoogleSearchSnippet,
} from '../constants/prompts.js';
import { createDataPointsWithSourceSchema, CustomDataPoint, DataPoint } from '../types/company.js';
import { AGENT_CONFIGS } from '../constants/agent-config.js';

/** Input expected by the Google Search Agent */
export interface GoogleSearchAgentInput {
  companyName: string;
  domain: string;
  needs: string[];
  dataPoints: CustomDataPoint[];
  googleQueries: Record<string, string[]>; // queries per data point from discovery agent
  baseDataPoints: Record<string, DataPoint | undefined>; // existing data points to check confidence
  includeRawResults?: boolean; // when true, include raw Google responses
}

/** Output returned by the Google Search Agent */
export interface GoogleSearchAgentOutput {
  /** Whether the agent completed without an internal error */
  success: boolean;
  /** Queries that were executed (deduped and capped) */
  queries: string[];
  /** Raw ScrapingBee Google Search responses keyed by query (optional) */
  resultsByQuery?: Record<string, GoogleSearchResponse | null>;
  /** Optional LLM-evaluated data points extracted from snippets */
  extracted?: Record<string, { content: string; confidenceScore: number; source: string } | null>;
  /** Optional error message when success=false */
  error?: string;
}

/**
 * Filter and select queries based on missing or low-confidence data points.
 * Only searches for data points that are missing or have confidence score < 3.
 */
const selectQueriesToRun = (
  needs: string[],
  googleQueries: Record<string, string[]>,
  baseDataPoints: Record<string, DataPoint | undefined>
): string[] => {
  const queries: string[] = [];
  const dataPointsToSearch: string[] = [];

  // Identify data points that need improvement (missing or low confidence)
  for (const dataPointName of needs) {
    const existing = baseDataPoints[dataPointName];
    const needsImprovement = !existing || existing.confidenceScore < 3;

    if (needsImprovement) {
      dataPointsToSearch.push(dataPointName);

      // Add queries for this data point
      const dataPointQueries = googleQueries[dataPointName] || [];
      queries.push(...dataPointQueries);
    }
  }

  console.info(`[GoogleSearchAgent] dataPointsToSearch=${dataPointsToSearch.join(', ')}`);

  // Deduplicate and limit total queries (combine similar queries)
  const deduped = Array.from(new Set(queries));
  console.info(`[GoogleSearchAgent] queries=${JSON.stringify(deduped)}`);

  // Limit to reasonable number of queries (e.g., 3-4 max)
  return deduped.slice(0, 4);
};

/**
 * Runs the Google Search Agent.
 * Steps:
 * 1) Validate input and build a set of queries
 * 2) Execute each query via the Google Search service (in parallel)
 * 3) Aggregate snippets and evaluate requested data points with the LLM
 * 4) LLM selects the best source URL per data point from the snippets; agent passes it through
 * 5) Return extracted data points and, optionally, raw results keyed by query
 */
// Creates a dedicated agent for evaluating Google search snippets
export const createGoogleSearchAgent = (keys: string[]) =>
  new Agent({
    name: 'Google Search Agent',
    model: AGENT_CONFIGS.googleSearch.model,
    modelSettings: { temperature: AGENT_CONFIGS.googleSearch.temperature },
    outputType: createDataPointsWithSourceSchema(keys),
    instructions: GOOGLE_SEARCH_AGENT_INSTRUCTIONS,
  });

// Runs the Google Search Agent end-to-end
export const runGoogleSearchAgent = async (input: GoogleSearchAgentInput): Promise<GoogleSearchAgentOutput> => {
  try {
    const { companyName, domain, needs, googleQueries, baseDataPoints, includeRawResults = false } = input;
    if (!companyName || !Array.isArray(needs) || !googleQueries || !baseDataPoints) {
      return { success: false, queries: [], resultsByQuery: {}, error: 'invalid input' };
    }

    const queries = selectQueriesToRun(needs, googleQueries, baseDataPoints);

    // If no queries are needed (all data points have high confidence), skip Google search
    if (queries.length === 0) {
      console.info('[GoogleSearchAgent] No queries needed - all data points have sufficient confidence');
      return { success: true, queries: [], extracted: {} };
    }

    // Run Google searches in parallel for speed
    const searchResults = await Promise.all(queries.map((q) => searchGoogle(q)));

    // Map results back to queries and collect snippets
    const resultsByQuery: Record<string, GoogleSearchResponse | null> = {};
    const allSnippets: GoogleSearchSnippet[] = [];
    queries.forEach((q, idx) => {
      const res = searchResults[idx];
      resultsByQuery[q] = res || null;
      const snippets = (res?.organic_results || []).map((r) => ({
        title: r.title,
        description: r.description ?? null,
        url: r.url,
        domain: r.domain,
        position: r.position,
      }));
      allSnippets.push(...snippets);
    });
    console.info(`[GoogleSearchAgent] totalSnippets=${allSnippets.length}`);

    // Prepare LLM evaluation only for the requested keys
    const dataPointKeys = input.needs as string[];
    const descriptions = input.dataPoints
      .filter((dp) => dataPointKeys.includes(dp.name))
      .map((dp) => `- ${dp.name}: ${dp.description}`)
      .join('\n');
    // Prompt instructs the model to return { content, confidenceScore, source } per key
    const prompt = createGoogleSearchPrompt(descriptions, input.companyName, input.domain, allSnippets);

    const agent = createGoogleSearchAgent(dataPointKeys);
    console.info(`[GoogleSearchAgent] evaluating keys=${dataPointKeys.length}`);
    const response = await run(agent, prompt);

    // The schema returns { content, confidenceScore, source } or null per key.
    type LLMDataPointMap = Record<string, { content: string; confidenceScore: number; source: string } | null>;
    const llmOutput = (response?.finalOutput as unknown as LLMDataPointMap) || {};
    const extracted: Record<string, { content: string; confidenceScore: number; source: string } | null> = {};

    for (const key of dataPointKeys) {
      const val = llmOutput[key];
      extracted[key] = val && typeof val.content === 'string' ? val : null;
    }
    const extractedKeys = Object.keys(extracted).filter((k) => extracted[k]);
    console.info(`[GoogleSearchAgent] extracted keys=${extractedKeys.join(', ') || 'none'}`);

    return includeRawResults
      ? { success: true, queries, resultsByQuery, extracted }
      : { success: true, queries, extracted };
  } catch (error) {
    console.error('[GoogleSearchAgent] error:', error);
    return {
      success: false,
      queries: [],
      resultsByQuery: {},
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
