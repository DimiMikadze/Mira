// Browser-safe exports - types and constants only (no Node.js dependencies)

// Export all types
export type { EnrichedCompany, DataPoint, EnrichmentSources, EnrichmentConfig } from './types/company.js';

export type { CompanyAnalysis, CompanyAnalysisWithCriteria } from './types/company-analysis.js';

export type { LinkedInCompanyData, LinkedInEmployee, LinkedInPost } from './types/linkedin.js';

export type { ScrapingResult, ScrapeResponse } from './types/scraper.js';

export type { AgentResult, DiscoveryOutput } from './types/agent.js';

// Export useful constants (these have no Node.js dependencies)
export { PROGRESS_EVENTS } from './constants/progress.js';
export type { ProgressEventType } from './constants/progress.js';

// Export special data points constants
export { SPECIAL_DATA_POINTS, isSpecialDataPoint } from './constants/special-data-points.js';
export type { SpecialDataPoint } from './constants/special-data-points.js';

// Export data point constants for reference
