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

  // Test LinkedIn posts extraction
  if (data.LINKEDIN_POSTS) {
    expect(Array.isArray(data.LINKEDIN_POSTS)).toBe(true);
    console.info(`📰 Scraper found ${data.LINKEDIN_POSTS.length} LinkedIn posts`);

    // Validate post structure
    data.LINKEDIN_POSTS.forEach((post, index) => {
      expect(post).toHaveProperty('timeAgo');
      expect(post).toHaveProperty('text');
      expect(typeof post.timeAgo === 'string' || post.timeAgo === null).toBe(true);
      expect(typeof post.text === 'string' || post.text === null).toBe(true);

      if (index < 3) {
        // Log first few posts for debugging
        console.info(`  Post ${index + 1}: ${post.timeAgo} - ${post.text?.substring(0, 100)}...`);
      }
    });
  } else {
    console.info('📰 No LinkedIn posts found by scraper');
  }

  // Test LinkedIn employees extraction
  if (data.LINKEDIN_EMPLOYEES) {
    expect(Array.isArray(data.LINKEDIN_EMPLOYEES)).toBe(true);
    console.info(`👥 Scraper found ${data.LINKEDIN_EMPLOYEES.length} LinkedIn employees`);

    // Validate employee structure
    data.LINKEDIN_EMPLOYEES.forEach((employee, index) => {
      expect(employee).toHaveProperty('name');
      expect(employee).toHaveProperty('title');
      expect(typeof employee.name).toBe('string');
      expect(typeof employee.title).toBe('string');

      if (index < 3) {
        // Log first few employees for debugging
        console.info(`  Employee ${index + 1}: ${employee.name} - ${employee.title}`);
      }
    });
  } else {
    console.info('👥 No LinkedIn employees found by scraper');
  }

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
