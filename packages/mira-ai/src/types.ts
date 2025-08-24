// Browser-safe exports - types and constants only (no Node.js dependencies)

// Export all types
export type { EnrichedCompany, DataPoint } from './types/company.js';

export type { CompanyAnalysis, CompanyAnalysisWithCriteria } from './types/company-analysis.js';

export type { LinkedInCompanyData, LinkedInPerson } from './types/linkedin.js';

export type { ScrapingResult, ScrapeResponse } from './types/scraper.js';

export type { AgentResult, DiscoveryOutput } from './types/agent.js';

// Export useful constants (these have no Node.js dependencies)
export { PROGRESS_EVENTS } from './constants/progress.js';
export type { ProgressEventType } from './constants/progress.js';

// Export data point constants for reference
export { LINKEDIN_DATA_POINTS, GOOGLE_SEARCH_DATA_POINTS } from './constants/data-points.js';
