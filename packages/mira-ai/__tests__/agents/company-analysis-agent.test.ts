/**
 * Company Analysis Agent Test
 *
 * Tests the main functionality of the Company Analysis agent with sample enriched company data.
 */
import { jest } from '@jest/globals';
import { runCompanyAnalysisAgent, type CompanyAnalysisAgentInput } from '../../src/agents/company-analysis-agent';
import type { EnrichedCompany } from '../../src/types/company';

// Sample enriched company data for testing
const TEST_ENRICHED_COMPANY: EnrichedCompany = {
  name: {
    content: 'Github',
    confidenceScore: 5,
    source: 'https://www.github.com',
  },
  industry: {
    content: 'AI-powered Developer Platform',
    confidenceScore: 5,
    source: 'https://www.github.com',
  },
  overview: {
    content:
      "GitHub is the world's most widely adopted AI-powered developer platform, enabling developers to build and ship software collaboratively and securely.",
    confidenceScore: 5,
    source: 'https://www.github.com',
  },
  headquarters: {
    content: 'San Francisco, CA',
    confidenceScore: 4,
    source: 'https://www.github.com/about',
  },
};

const TEST_COMPANY_CRITERIA = 'B2B SaaS companies with 500+ employees looking for data analytics solutions';

const TEST_INPUT: CompanyAnalysisAgentInput = {
  companyCriteria: TEST_COMPANY_CRITERIA,
  enrichedCompany: TEST_ENRICHED_COMPANY,
};

jest.setTimeout(60000);

it('should analyze company data and provide actionable insights with company criteria matching', async () => {
  // Test agent with sample enriched company data and company criteria
  const result = await runCompanyAnalysisAgent(TEST_INPUT);

  console.info('🔍 Agent result:', { success: result.success, error: result.error });

  if (!result.success) {
    console.error('❌ Agent failed with error:', result.error);
  }

  expect(result.success).toBe(true);
  expect(result.extracted).toBeDefined();

  if (result.extracted) {
    // Test required fields for analysis with criteria
    expect(result.extracted.executiveSummary).toBeDefined();
    expect(typeof result.extracted.executiveSummary).toBe('string');

    // Test criteria-specific fields
    if ('FitScore' in result.extracted) {
      expect(result.extracted.FitScore).toBeDefined();
      expect(typeof result.extracted.FitScore).toBe('number');
      expect(result.extracted.FitScore).toBeGreaterThanOrEqual(0);
      expect(result.extracted.FitScore).toBeLessThanOrEqual(10);
    }

    if ('FitReasoning' in result.extracted) {
      expect(result.extracted.FitReasoning).toBeDefined();
      expect(typeof result.extracted.FitReasoning).toBe('string');
    }
  }

  console.info(
    `✅ Company Analysis agent generated analysis with ${
      result.extracted ? Object.keys(result.extracted).length : 0
    } insights`
  );
});
