/**
 * Discovery Agent Test
 *
 * Tests the main functionality of the Discovery agent with real website URL.
 */
import { jest } from '@jest/globals';
import { runDiscoveryAgent } from '../../src/agents/discovery-agent';

const TEST_URL = 'https://www.github.com';

jest.setTimeout(60000);

it('should extract company data points and discover internal pages from website', async () => {
  // Test agent with real website URL
  const result = await runDiscoveryAgent(TEST_URL);

  console.info('🔍 Agent result:', { success: result.success, error: result.error });

  if (!result.success) {
    console.error('❌ Agent failed with error:', result.error);
  }

  expect(result.success).toBe(true);

  if (!result.success) return;

  expect(result.dataPoints).toBeDefined();
  expect(result.internalPages).toBeDefined();
  expect(result.socialMediaLinks).toBeDefined();
  expect(result.finalURL).toBeDefined();

  // Test data points structure
  if (result.dataPoints) {
    Object.entries(result.dataPoints).forEach(([, dataPoint]) => {
      expect(dataPoint).toHaveProperty('content');
      expect(dataPoint).toHaveProperty('confidenceScore');
      expect(dataPoint).toHaveProperty('source');
      expect(typeof dataPoint.content).toBe('string');
      expect(dataPoint.confidenceScore).toBeGreaterThanOrEqual(1);
      expect(dataPoint.confidenceScore).toBeLessThanOrEqual(5);
      expect(dataPoint.source).toBe(result.finalURL);
    });
  }

  // Test internal pages structure
  if (result.internalPages) {
    expect(typeof result.internalPages).toBe('object');
  }

  // Test social media links structure
  if (result.socialMediaLinks) {
    expect(Array.isArray(result.socialMediaLinks)).toBe(true);
  }

  // Test final URL
  if (result.finalURL) {
    expect(typeof result.finalURL).toBe('string');
    expect(result.finalURL).toMatch(/^https?:\/\//);
  }

  console.info(
    `✅ Discovery agent extracted ${result.dataPoints ? Object.keys(result.dataPoints).length : 0} data points, ${
      result.internalPages ? Object.keys(result.internalPages).length : 0
    } internal pages, and ${result.socialMediaLinks ? result.socialMediaLinks.length : 0} social media links`
  );
});
