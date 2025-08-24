/**
 * Scraper Service Test
 *
 * Real integration test with actual website scraping.
 */

import { scrape } from '../../src/services/scraper';
import { writeFileSync } from 'fs';
import { jest } from '@jest/globals';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEST_URL = 'https://www.github.com';

// Increase timeout for real network requests
jest.setTimeout(60000);

it('should scrape website and extract structured content', async () => {
  const result = await scrape({
    url: TEST_URL,
    extractLinks: true,
    extractMetaTitle: true,
    includeFinalURL: true,
  });

  // Should return valid response
  expect(result).toBeDefined();
  expect(result).not.toBeNull();

  if (!result) {
    console.error('Scraping failed - no result returned');
    return;
  }

  // Test core response structure
  if (typeof result === 'string') {
    // Simple text content
    expect(result.length).toBeGreaterThan(100);
  } else {
    // Structured result - test what we know exists
    expect(result.content).toBeDefined();
    expect(typeof result.content).toBe('string');
    expect(result.content.length).toBeGreaterThan(100);

    // Test properties that might exist based on our request
    if ('links' in result) {
      expect(Array.isArray(result.links)).toBe(true);
    }

    if ('socialMediaLinks' in result) {
      expect(Array.isArray(result.socialMediaLinks)).toBe(true);
    }

    if ('finalURL' in result) {
      expect(typeof result.finalURL).toBe('string');
    }

    if ('metaTitle' in result) {
      expect(typeof result.metaTitle).toBe('string');
    }
  }

  // Save result for agent test
  const fixturePath = join(__dirname, '../fixtures/scraper-result.json');
  writeFileSync(
    fixturePath,
    JSON.stringify(
      {
        url: TEST_URL,
        result: result,
      },
      null,
      2
    )
  );

  console.log(`✅ Scraper test passed. Result saved to: ${fixturePath}`);
});
