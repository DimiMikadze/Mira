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
import { createDataPointsWithSourceSchema } from '../types/company.js';
import { DATA_POINT_DESCRIPTIONS, GOOGLE_SEARCH_DATA_POINTS } from '../constants/data-points.js';
import { AGENT_CONFIGS } from '../constants/agent-config.js';

// Allowed data point keys for Google Search enrichment
type GoogleSearchDataPointKey = (typeof GOOGLE_SEARCH_DATA_POINTS)[number];

/** Input expected by the Google Search Agent */
export interface GoogleSearchAgentInput {
  companyName: string;
  domain: string;
  needs: GoogleSearchDataPointKey[];
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
 * Build a list of queries based on requested data points.
 * Rules:
 * - If funding is needed → generic funding query with company name
 * - If press-like items are needed → third-party press/news excluding the company's domain
 * - Deduplicate and cap total queries to 2
 */
const buildQueries = (companyName: string, domain: string, needs: GoogleSearchDataPointKey[]): string[] => {
  const queries: string[] = [];

  const needsSet = new Set(needs);
  console.info(`[GoogleSearchAgent] needs=${Array.from(needsSet).join(', ')}`);
  const wantsFunding = needsSet.has('recentFunding') || needsSet.has('totalFunding');
  const pressKeys: GoogleSearchDataPointKey[] = [
    'acquisitions',
    'partnerships',
    'newExecutiveHires',
    'awardsCertifications',
    'newProductLaunch',
    'pressMediaMentions',
  ];
  const wantsPressPack = pressKeys.some((k) => needsSet.has(k));

  if (wantsFunding) queries.push(`${companyName} funding recent`);
  if (wantsPressPack) queries.push(`${companyName} (press OR news) -site:${domain}`);

  // Deduplicate and cap to 2
  const deduped = Array.from(new Set(queries));
  console.info(`[GoogleSearchAgent] queries=${JSON.stringify(deduped)}`);
  return deduped.slice(0, 2);
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
    const { companyName, domain, needs, includeRawResults = false } = input;
    if (!companyName || !Array.isArray(needs)) {
      return { success: false, queries: [], resultsByQuery: {}, error: 'invalid input' };
    }

    const queries = buildQueries(companyName, domain, needs);

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
    const descriptions = dataPointKeys.map((k) => `- ${k}: ${DATA_POINT_DESCRIPTIONS[k] ?? ''}`).join('\n');
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
