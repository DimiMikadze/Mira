/**
 * LinkedIn Agent Test
 *
 * Tests the main functionality of the LinkedIn agent with real LinkedIn URL.
 */
import { jest } from '@jest/globals';
import { runLinkedInAgent } from '../../src/agents/linkedin-agent';
import type { CustomDataPoint } from '../../src/types/company';
import { SPECIAL_DATA_POINTS } from '../../src/constants/special-data-points';

const TEST_LINKEDIN_URL = 'https://linkedin.com/company/github';

// Sample data points configuration for testing
const TEST_DATA_POINTS: CustomDataPoint[] = [
  { name: 'name', description: 'Company name' },
  { name: 'industry', description: 'Industry or sector' },
  { name: 'headquarters', description: 'Company headquarters location' },
  { name: 'companySize', description: 'Number of employees' },
  { name: SPECIAL_DATA_POINTS.LINKEDIN_EMPLOYEES, description: 'Employee information extracted from LinkedIn' },
  { name: SPECIAL_DATA_POINTS.LINKEDIN_POSTS, description: 'LinkedIn posts extracted from company page' },
];

jest.setTimeout(60000);

it('should extract company data points from LinkedIn using LLM analysis', async () => {
  // Test agent with real LinkedIn URL
  const result = await runLinkedInAgent({
    linkedInUrl: TEST_LINKEDIN_URL,
    needs: [
      'name',
      'industry',
      'headquarters',
      'companySize',
      SPECIAL_DATA_POINTS.LINKEDIN_EMPLOYEES,
      SPECIAL_DATA_POINTS.LINKEDIN_POSTS,
    ],
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

  // Test special data points specifically
  const linkedinEmployees = result.extracted[SPECIAL_DATA_POINTS.LINKEDIN_EMPLOYEES];
  const linkedinPosts = result.extracted[SPECIAL_DATA_POINTS.LINKEDIN_POSTS];

  if (linkedinEmployees) {
    expect(linkedinEmployees.confidenceScore).toBe(5); // Should have max confidence from scraper
    expect(() => JSON.parse(linkedinEmployees.content)).not.toThrow(); // Should be valid JSON
    const employees = JSON.parse(linkedinEmployees.content);
    expect(Array.isArray(employees)).toBe(true);
    console.info(`📋 Found ${employees.length} LinkedIn employees`);
  }

  if (linkedinPosts) {
    expect(linkedinPosts.confidenceScore).toBe(5); // Should have max confidence from scraper
    expect(() => JSON.parse(linkedinPosts.content)).not.toThrow(); // Should be valid JSON
    const posts = JSON.parse(linkedinPosts.content);
    expect(Array.isArray(posts)).toBe(true);
    console.info(`📰 Found ${posts.length} LinkedIn posts`);

    // Validate post structure
    posts.forEach((post: any) => {
      expect(post).toHaveProperty('timeAgo');
      expect(post).toHaveProperty('text');
    });
  }

  console.info(
    `✅ LinkedIn agent extracted ${Object.keys(result.extracted).filter((k) => result.extracted[k]).length} data points`
  );
});
