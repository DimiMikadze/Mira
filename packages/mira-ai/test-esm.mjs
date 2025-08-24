// Test the ESM package locally
import { researchCompany } from './dist/index.js';

const config = {
  apiKeys: {
    openaiApiKey: 'test-key',
    scrapingBeeApiKey: 'test-key',
  },
};

console.log('✅ ESM Import successful!');
console.log('researchCompany function:', typeof researchCompany);
console.log('Function details:', researchCompany.toString().substring(0, 100) + '...');
