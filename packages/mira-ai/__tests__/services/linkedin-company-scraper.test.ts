/**
 * LinkedIn Company Scraper Test
 *
 * Real integration test with actual LinkedIn URL.
 */

import { scrapeLinkedInCompany } from '../../src/services/linkedin-company-scraper';
import { writeFileSync } from 'fs';
import { jest } from '@jest/globals';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEST_URL = 'https://linkedin.com/company/github';

// Increase timeout for real network requests
jest.setTimeout(60000);

it('should scrape LinkedIn company page and extract structured data', async () => {
  const result = await scrapeLinkedInCompany(TEST_URL);

  // Should succeed
  expect(result.success).toBe(true);
  expect(result.data).toBeDefined();

  if (!result.success || !result.data) {
    console.error('Scraping failed:', result.error);
    return;
  }

  const data = result.data;

  // Test core scraper functionality
  expect(data.content).toBeDefined();
  expect(typeof data.content).toBe('string');
  expect(data.content.length).toBeGreaterThan(100);

  // Should extract at least basic company information
  const hasBasicInfo = data.name || data.description || data.industry;
  expect(hasBasicInfo).toBeTruthy();

  // Save result for agent test
  const fixturePath = join(__dirname, '../fixtures/linkedin-scraper-result.json');
  writeFileSync(
    fixturePath,
    JSON.stringify(
      {
        url: TEST_URL,
        data: data,
      },
      null,
      2
    )
  );

  console.info(`✅ Scraper test passed. Result saved to: ${fixturePath}`);
});
