/**
 * Orchestrator Integration Test
 *
 * Simple, focused test of the orchestrator with real API calls.
 */
import { jest } from '@jest/globals';
import { researchCompany, type MiraConfig } from '../../src/orchestrator/index';
import type { CustomDataPoint } from '../../src/types/company';

const TEST_CONFIG: MiraConfig = {
  apiKeys: {
    openaiApiKey: process.env.OPENAI_API_KEY || 'missing-key',
    scrapingBeeApiKey: process.env.SCRAPING_BEE_API_KEY || 'missing-key',
  },
};

const TEST_URL = 'https://github.com';

const createDataPoints = (names: string[]): CustomDataPoint[] =>
  names.map((name) => ({ name, description: `Information about ${name}` }));

const countDataPoints = (enrichedCompany: any): number =>
  Object.keys(enrichedCompany).filter((k) => k !== 'socialMediaLinks').length;

describe('Orchestrator', () => {
  jest.setTimeout(30000);

  it('works end-to-end', async () => {
    if (!process.env.OPENAI_API_KEY || !process.env.SCRAPING_BEE_API_KEY) {
      console.warn('⚠️  Skipping - set API keys to test');
      return;
    }

    const result = await researchCompany(TEST_URL, TEST_CONFIG, {
      enrichmentConfig: {
        dataPoints: createDataPoints(['name']),
        sources: { crawl: false, google: false, linkedin: false },
      },
    });

    console.log(`✅ ${countDataPoints(result.enrichedCompany)} data points in ${result.executionTime}`);

    expect(result.enrichedCompany.name).toBeDefined();
    expect(result.enrichedCompany.socialMediaLinks).toBeDefined();
    expect(result.sources.length).toBeGreaterThan(0);
  });

  it('tests early termination', async () => {
    if (!process.env.OPENAI_API_KEY || !process.env.SCRAPING_BEE_API_KEY) {
      console.warn('⚠️  Skipping - set API keys to test');
      return;
    }

    const result = await researchCompany(TEST_URL, TEST_CONFIG, {
      enrichmentConfig: {
        dataPoints: createDataPoints(['name']),
        sources: { crawl: true, google: true, linkedin: true },
      },
      minimumConfidenceThreshold: 3, // Low threshold to trigger early termination
    });

    console.log(`✅ Early termination: ${result.executionTime} (should be fast if terminated early)`);

    expect(result.enrichedCompany.name).toBeDefined();
    expect(parseFloat(result.executionTime)).toBeLessThan(60); // Should complete in under 1 minute
  });
});
