// Test the ESM package locally
import { researchCompany } from './dist/index.js';

const config = {
  apiKeys: {
    openaiApiKey: 'test-key',
    scrapingBeeApiKey: 'test-key',
  },
};

console.info('✅ ESM Import successful!');
console.info('researchCompany function:', typeof researchCompany);
console.info('Function details:', researchCompany.toString().substring(0, 100) + '...');
