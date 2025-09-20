import { PROGRESS_EVENTS } from '../constants/progress.js';
import type { DataPoint, EnrichmentSources } from '../types/company.js';

/**
 * Progress callback type - includes dynamic messages
 */
export type ProgressCallback = (type: string, message?: string) => void;

/**
 * Creates a progress reporter with the given callback and source configuration
 */
export const createProgressReporter = (onProgress?: ProgressCallback, sources?: EnrichmentSources) => ({
  /**
   * Report discovery started
   */
  reportDiscoveryStarted: () => {
    onProgress?.(
      PROGRESS_EVENTS.DISCOVERY_STARTED,
      'Extracting data from the main website, discovering internal pages, and finding social media links.'
    );
  },

  /**
   * Report discovery completion with dynamic stats
   */
  reportDiscoveryCompleted: (dataPointsCount: number, internalPagesCount: number, socialLinksCount: number) => {
    let message = `Extracted ${dataPointsCount} data points. Found ${internalPagesCount} internal pages`;
    if (socialLinksCount > 0) {
      message += ` and ${socialLinksCount} social media links`;
    }
    message += '.';

    onProgress?.(PROGRESS_EVENTS.DISCOVERY_STARTED, message);
  },

  /**
   * Report internal pages started
   */
  reportInternalPagesStarted: (internalPagesCount: number) => {
    if (!sources?.crawl) {
      onProgress?.(PROGRESS_EVENTS.INTERNAL_PAGES_STARTED, 'Internal pages crawling disabled - skipping');
      return;
    }

    const message =
      internalPagesCount > 0
        ? `Extracting detailed information from ${internalPagesCount} internal pages`
        : `No internal pages found, skipping detailed extraction`;

    onProgress?.(PROGRESS_EVENTS.INTERNAL_PAGES_STARTED, message);
  },

  /**
   * Report internal pages completion
   */
  reportInternalPagesCompleted: (dataPointsCount: number, internalPagesCount: number) => {
    if (!sources?.crawl) return;

    const message =
      internalPagesCount > 0 ? `Extracted ${dataPointsCount} data points.` : `Skipped - no internal pages to process.`;

    onProgress?.(PROGRESS_EVENTS.INTERNAL_PAGES_STARTED, message);
  },

  /**
   * Report LinkedIn analysis started
   */
  reportLinkedInStarted: () => {
    if (!sources?.linkedin) {
      onProgress?.(PROGRESS_EVENTS.LINKEDIN_STARTED, 'LinkedIn analysis disabled - skipping');
      return;
    }
    onProgress?.(PROGRESS_EVENTS.LINKEDIN_STARTED, `Analyzing LinkedIn company profile...`);
  },

  /**
   * Report LinkedIn completion with data count
   */
  reportLinkedInCompleted: (dataPointsCount: number) => {
    if (!sources?.linkedin) return;
    onProgress?.(PROGRESS_EVENTS.LINKEDIN_STARTED, `Extracted ${dataPointsCount} data points from LinkedIn.`);
  },

  /**
   * Report LinkedIn URL found but no data needed
   */
  reportLinkedInNoDataNeeded: () => {
    if (!sources?.linkedin) return;
    onProgress?.(PROGRESS_EVENTS.LINKEDIN_STARTED, `LinkedIn URL found but no additional data needed.`);
  },

  /**
   * Report LinkedIn failed or not found
   */
  reportLinkedInFailed: (reason: string) => {
    if (!sources?.linkedin) return;
    onProgress?.(PROGRESS_EVENTS.LINKEDIN_STARTED, reason);
  },

  /**
   * Report LinkedIn URL not found
   */
  reportLinkedInNotFound: () => {
    if (!sources?.linkedin) return;
    onProgress?.(
      PROGRESS_EVENTS.LINKEDIN_STARTED,
      `Could not identify LinkedIn company URL - skipping LinkedIn analysis.`
    );
  },

  /**
   * Report Google search started
   */
  reportGoogleSearchStarted: () => {
    if (!sources?.google) {
      onProgress?.(PROGRESS_EVENTS.GOOGLE_SEARCH_STARTED, 'Google search disabled - skipping');
      return;
    }
    onProgress?.(PROGRESS_EVENTS.GOOGLE_SEARCH_STARTED, `Searching Google for more data points...`);
  },

  /**
   * Report Google search completion
   */
  reportGoogleSearchCompleted: (finalDataPointsCount: number) => {
    if (!sources?.google) return;
    onProgress?.(PROGRESS_EVENTS.GOOGLE_SEARCH_STARTED, `Extracted ${finalDataPointsCount} data points.`);
  },

  /**
   * Report company analysis started
   */
  reportCompanyAnalysisStarted: (hasCriteria: boolean) => {
    const message = hasCriteria
      ? `Analyzing company fit against your Company Criteria...`
      : `Generating executive summary...`;

    onProgress?.(PROGRESS_EVENTS.COMPANY_ANALYSIS_STARTED, message);
  },

  /**
   * Report company analysis is skipped
   */
  reportCompanyAnalysisSkipped: () => {
    onProgress?.(PROGRESS_EVENTS.COMPANY_ANALYSIS_STARTED, 'Company analysis disabled - skipping');
  },

  /**
   * Report company analysis completion
   */
  reportCompanyAnalysisCompleted: () => {
    onProgress?.(PROGRESS_EVENTS.COMPANY_ANALYSIS_STARTED, `Analysis complete.`);
  },

  /**
   * Report outreach generation started
   */
  reportOutreachStarted: () => {
    onProgress?.(PROGRESS_EVENTS.OUTREACH_STARTED, 'Generating personalized outreach messages...');
  },

  /**
   * Report outreach generation completed
   */
  reportOutreachCompleted: () => {
    onProgress?.(PROGRESS_EVENTS.OUTREACH_COMPLETED, 'Outreach messages generated successfully');
  },

  /**
   * Report outreach generation error
   */
  reportOutreachError: (error?: string) => {
    const message = error || 'Failed to generate outreach messages';
    onProgress?.(PROGRESS_EVENTS.OUTREACH_ERROR, message);
  },

  /**
   * Report final enrichment completion
   */
  reportEnrichmentCompleted: (dataPointsFound: number, totalSources: number, socialLinksFound: number) => {
    let message = `Completed! Found ${dataPointsFound} data points from ${totalSources} sources`;
    if (socialLinksFound > 0) {
      message += ` and ${socialLinksFound} social media links`;
    }
    message += '.';

    onProgress?.(PROGRESS_EVENTS.ENRICHMENT_COMPLETED, message);
  },

  /**
   * Report early termination when all data points have high confidence
   */
  reportEarlyTermination: (completedDataPoints: number, totalDataPoints: number, averageConfidence: number) => {
    const message = `Early completion! All ${completedDataPoints}/${totalDataPoints} data points achieved high confidence (avg: ${averageConfidence.toFixed(
      1
    )}/5). Skipping remaining enrichment steps.`;
    onProgress?.(PROGRESS_EVENTS.ENRICHMENT_COMPLETED, message);
  },
});

/**
 * Utility function to count meaningful data points
 */
export const countMeaningfulDataPoints = (dataPoints: Record<string, DataPoint | undefined>): number => {
  return Object.keys(dataPoints).filter((key) => {
    const dataPoint = dataPoints[key];
    return dataPoint && dataPoint.content?.trim();
  }).length;
};
