/**
 * Google Search Agent Test
 *
 * Tests the main functionality of the Google Search agent with real company data.
 */
import { jest } from '@jest/globals';
import { runGoogleSearchAgent, type GoogleSearchAgentInput } from '../../src/agents/google-search-agent';
import type { CustomDataPoint, DataPoint } from '../../src/types/company';

// Sample data points configuration for testing
const TEST_DATA_POINTS: CustomDataPoint[] = [
  { name: 'totalFunding', description: 'Total funding raised by the company' },
  { name: 'recentFunding', description: 'Recent funding rounds' },
  { name: 'acquisitions', description: 'Companies acquired' },
  { name: 'partnerships', description: 'Strategic partnerships' },
  { name: 'newExecutiveHires', description: 'Recent executive hires' },
];

// Sample Google queries from discovery agent
const TEST_GOOGLE_QUERIES: Record<string, string[]> = {
  totalFunding: ['Github total funding', 'Github investment'],
  recentFunding: ['Github recent funding', 'Github Series A B C'],
  acquisitions: ['Github acquisitions', 'Github acquired companies'],
  partnerships: ['Github partnerships', 'Github collaborations'],
  newExecutiveHires: ['Github new executives', 'Github leadership changes'],
};

// Sample base data points with low confidence
const TEST_BASE_DATA_POINTS: Record<string, DataPoint | undefined> = {
  name: {
    content: 'GitHub',
    confidenceScore: 5,
    source: 'https://github.com',
  },
};

const TEST_INPUT: GoogleSearchAgentInput = {
  companyName: 'Github',
  domain: 'github.com',
  needs: ['totalFunding', 'recentFunding', 'acquisitions', 'partnerships', 'newExecutiveHires'],
  dataPoints: TEST_DATA_POINTS,
  googleQueries: TEST_GOOGLE_QUERIES,
  baseDataPoints: TEST_BASE_DATA_POINTS,
};

jest.setTimeout(60000);

it('should extract company data points from Google search using LLM analysis', async () => {
  // Test agent with real company data
  const result = await runGoogleSearchAgent(TEST_INPUT);

  console.info('🔍 Agent result:', { success: result.success, error: result.error });

  if (!result.success) {
    console.error('❌ Agent failed with error:', result.error);
  }

  expect(result.success).toBe(true);
  expect(result.extracted).toBeDefined();

  if (result.extracted) {
    Object.entries(result.extracted).forEach(([, dataPoint]) => {
      if (dataPoint !== null) {
        expect(dataPoint).toHaveProperty('content');
        expect(dataPoint).toHaveProperty('confidenceScore');
        expect(dataPoint).toHaveProperty('source');
        expect(typeof dataPoint.content).toBe('string');
        expect(dataPoint.confidenceScore).toBeGreaterThanOrEqual(1);
        expect(dataPoint.confidenceScore).toBeLessThanOrEqual(5);
        expect(typeof dataPoint.source).toBe('string');
      }
    });
  }

  console.info(
    `✅ Google Search agent extracted ${
      result.extracted ? Object.keys(result.extracted).filter((k) => result.extracted![k]).length : 0
    } data points`
  );
});
