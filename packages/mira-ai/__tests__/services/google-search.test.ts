/**
 * Google Search Service Test
 *
 * Real integration test with actual Google Search API.
 */

import { searchGoogle } from '../../src/services/google-search';
import { writeFileSync } from 'fs';
import { jest } from '@jest/globals';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEST_QUERY = 'Github company information';

// Increase timeout for real network requests
jest.setTimeout(60000);

it('should perform Google search and return structured results', async () => {
  const result = await searchGoogle(TEST_QUERY);

  // Should return valid response
  expect(result).toBeDefined();
  expect(result).not.toBeNull();

  if (!result) {
    console.error('Google search failed - no results returned');
    return;
  }

  // Test core response structure
  expect(result.organic_results).toBeDefined();
  expect(Array.isArray(result.organic_results)).toBe(true);
  expect(result.organic_results.length).toBeGreaterThan(0);

  // Test meta data
  expect(result.meta_data).toBeDefined();
  expect(result.meta_data.number_of_results).toBeGreaterThan(0);
  expect(result.meta_data.number_of_organic_results).toBeGreaterThan(0);

  // Test individual result structure
  const firstResult = result.organic_results[0];
  expect(firstResult.url).toBeDefined();
  expect(typeof firstResult.url).toBe('string');
  expect(firstResult.title).toBeDefined();
  expect(typeof firstResult.title).toBe('string');
  expect(firstResult.domain).toBeDefined();
  expect(typeof firstResult.domain).toBe('string');
  expect(firstResult.position).toBeDefined();
  expect(typeof firstResult.position).toBe('number');

  // Save result for agent test
  const fixturePath = join(__dirname, '../fixtures/google-search-result.json');
  writeFileSync(
    fixturePath,
    JSON.stringify(
      {
        query: TEST_QUERY,
        results: result,
      },
      null,
      2
    )
  );

  console.log(`✅ Google search test passed. Result saved to: ${fixturePath}`);
});
