/**
 * LinkedIn Agent Test
 *
 * Tests the main functionality of the LinkedIn agent with real LinkedIn URL.
 */
import { jest } from '@jest/globals';
import { runLinkedInAgent } from '../../src/agents/linkedin-agent';

const TEST_LINKEDIN_URL = 'https://linkedin.com/company/github';

jest.setTimeout(60000);

it('should extract company data points from LinkedIn using LLM analysis', async () => {
  // Test agent with real LinkedIn URL
  const result = await runLinkedInAgent({
    linkedInUrl: TEST_LINKEDIN_URL,
    needs: ['name', 'industry', 'headquarters', 'companySize', 'employees'],
  });

  console.info('🔍 Agent result:', { success: result.success, error: result.error });

  if (!result.success) {
    console.error('❌ Agent failed with error:', result.error);
  }

  expect(result.success).toBe(true);
  expect(result.extracted).toBeDefined();

  Object.entries(result.extracted).forEach(([, dataPoint]) => {
    if (dataPoint !== null) {
      expect(dataPoint).toHaveProperty('content');
      expect(dataPoint).toHaveProperty('confidenceScore');
      expect(dataPoint).toHaveProperty('source');
      expect(typeof dataPoint.content).toBe('string');
      expect(dataPoint.confidenceScore).toBeGreaterThanOrEqual(1);
      expect(dataPoint.confidenceScore).toBeLessThanOrEqual(5);
      expect(dataPoint.source).toBe(TEST_LINKEDIN_URL);
    }
  });

  console.info(
    `✅ LinkedIn agent extracted ${Object.keys(result.extracted).filter((k) => result.extracted[k]).length} data points`
  );
});
