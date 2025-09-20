/**
 * Progress events sent from the API during company enrichment
 */
export const PROGRESS_EVENTS = {
  CONNECTED: 'connected',
  DISCOVERY_STARTED: 'discovery_started',
  INTERNAL_PAGES_STARTED: 'internal_pages_started',
  LINKEDIN_STARTED: 'linkedin_started',
  GOOGLE_SEARCH_STARTED: 'google_search_started',
  COMPANY_ANALYSIS_STARTED: 'company_analysis_started',
  OUTREACH_STARTED: 'outreach_started',
  OUTREACH_COMPLETED: 'outreach_completed',
  OUTREACH_ERROR: 'outreach_error',
  ENRICHMENT_COMPLETED: 'enrichment_completed',
  ERROR: 'error',
} as const;

export type ProgressEventType = (typeof PROGRESS_EVENTS)[keyof typeof PROGRESS_EVENTS];
