/**
 * Outreach-specific progress events for the frontend
 * These are separate from mira-ai's PROGRESS_EVENTS
 */
export const OUTREACH_EVENTS = {
  OUTREACH_STARTED: 'outreach_started',
  OUTREACH_COMPLETED: 'outreach_completed',
  OUTREACH_ERROR: 'outreach_error',
} as const;

export type OutreachEventType = (typeof OUTREACH_EVENTS)[keyof typeof OUTREACH_EVENTS];


