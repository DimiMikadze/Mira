/**
 * Internal Pages Agent Test
 *
 * Tests the main functionality of the Internal Pages agent with sample discovery output.
 */
import { jest } from '@jest/globals';
import { runInternalPagesAgent } from '../../src/agents/internal-pages-agent';
import type { DiscoveryOutput } from '../../src/types/agent';
import type { CustomDataPoint } from '../../src/types/company';

// Sample discovery output with real internal pages to test with
const TEST_DISCOVERY_OUTPUT: DiscoveryOutput = {
  dataPoints: {
    name: {
      content: 'Github',
      confidenceScore: 5,
      source: 'https://www.github.com',
    },
  },
  internalPages: {
    about: 'https://github.com/about',
  },
};

// Sample data points configuration for testing
const TEST_DATA_POINTS: CustomDataPoint[] = [
  { name: 'name', description: 'Company name' },
  { name: 'description', description: 'Company description' },
  { name: 'industry', description: 'Industry or sector' },
  { name: 'headquarters', description: 'Company headquarters location' },
  { name: 'foundedYear', description: 'Year the company was founded' },
];

jest.setTimeout(60000);

it('should extract additional data points from internal pages', async () => {
  // Test agent with sample discovery output and data points
  const result = await runInternalPagesAgent(TEST_DISCOVERY_OUTPUT, TEST_DATA_POINTS);

  console.info('🔍 Agent result:', { success: result.success, error: result.error });

  if (!result.success) {
    console.error('❌ Agent failed with error:', result.error);
  }

  expect(result.success).toBe(true);

  if (!result.success) return;

  expect(result.dataPoints).toBeDefined();

  // Test data points structure
  if (result.dataPoints) {
    Object.entries(result.dataPoints).forEach(([, dataPoint]) => {
      if (dataPoint) {
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

  // Should have at least the original data points
  const originalDataPointsCount = Object.keys(TEST_DISCOVERY_OUTPUT.dataPoints).length;
  const finalDataPointsCount = result.dataPoints ? Object.keys(result.dataPoints).length : 0;
  expect(finalDataPointsCount).toBeGreaterThanOrEqual(originalDataPointsCount);

  console.info(
    `✅ Internal Pages agent processed ${
      Object.keys(TEST_DISCOVERY_OUTPUT.internalPages).length
    } internal pages and returned ${finalDataPointsCount} data points`
  );
});
