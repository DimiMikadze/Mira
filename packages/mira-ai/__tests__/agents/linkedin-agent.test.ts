/**
 * LinkedIn Agent Test
 *
 * Tests the main functionality of the LinkedIn agent with real LinkedIn URL.
 */
import { jest } from '@jest/globals';
import { runLinkedInAgent } from '../../src/agents/linkedin-agent';
import type { CustomDataPoint } from '../../src/types/company';

const TEST_LINKEDIN_URL = 'https://linkedin.com/company/github';

// Sample data points configuration for testing
const TEST_DATA_POINTS: CustomDataPoint[] = [
  { name: 'name', description: 'Company name' },
  { name: 'industry', description: 'Industry or sector' },
  { name: 'headquarters', description: 'Company headquarters location' },
  { name: 'companySize', description: 'Number of employees' },
  { name: 'employees', description: 'Employee information' },
];

jest.setTimeout(60000);

it('should extract company data points from LinkedIn using LLM analysis', async () => {
  // Test agent with real LinkedIn URL
  const result = await runLinkedInAgent({
    linkedInUrl: TEST_LINKEDIN_URL,
    needs: ['name', 'industry', 'headquarters', 'companySize', 'employees'],
    dataPoints: TEST_DATA_POINTS,
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
