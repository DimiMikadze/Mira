import { countMeaningfulDataPoints } from './progress-manager.js';
import { mergeDataPoints, countExtractedDataPoints, getDataPointsNeedingImprovement } from './data-merger.js';
import { extractInternalPageUrls } from './sources-manager.js';
import { tryEarlyTermination } from './early-termination.js';
import { createFinalResult, type EnrichmentResult } from './result-builder.js';
import {
  runDiscoveryStep,
  runInternalPagesStep,
  runLinkedInEnrichmentStep,
  runGoogleSearchEnrichmentStep,
  runCompanyAnalysisStep,
  findLinkedInCompanyUrl,
  extractDomain,
  type DiscoveryStepResult,
} from './agent-coordinator.js';
import type { CompanyAnalysis } from '../types/company-analysis.js';
import type { EnrichmentContext } from './enrichment-context.js';
import type { DataPoint } from '../types/company.js';

/**
 * Executes the discovery step and checks for early termination
 */
export const executeDiscoveryFlow = async (
  context: EnrichmentContext
): Promise<{ discoveryResult: DiscoveryStepResult; earlyResult?: EnrichmentResult }> => {
  // Step 1: Discovery Agent
  context.progressReporter.reportDiscoveryStarted();
  const discoveryResult = await runDiscoveryStep(
    context.url,
    context.dataPoints,
    context.sourcesConfig.google,
    context.sourcesConfig.crawl,
    context.maxInternalPages,
    context.maxGoogleQueries
  );

  const discoveryDataPointsCount = countMeaningfulDataPoints(discoveryResult.dataPoints);
  const internalPagesCount = Object.keys(discoveryResult.internalPages).length;
  const socialLinksCount = discoveryResult.socialMediaLinks.length;

  context.progressReporter.reportDiscoveryCompleted(discoveryDataPointsCount, internalPagesCount, socialLinksCount);

  // Check if we already have all data points from just the landing page
  const terminationResult = await tryEarlyTermination(
    discoveryResult.dataPoints,
    context,
    discoveryResult,
    'discovery'
  );

  return {
    discoveryResult,
    earlyResult: terminationResult.finalResult,
  };
};

/**
 * Executes the internal pages step and merges results
 */
export const executeInternalPagesFlow = async (
  discoveryResult: DiscoveryStepResult,
  context: EnrichmentContext
): Promise<{ baseDataPoints: Record<string, DataPoint | undefined>; earlyResult?: EnrichmentResult }> => {
  // Step 2: Internal Pages Agent (if enabled)
  let internalPagesDataPoints = {};
  let internalPagesDataPointsCount = 0;

  // Extract internal page URLs (for source counting) regardless of crawl setting
  const internalPageUrls = extractInternalPageUrls(discoveryResult.internalPages);

  if (context.sourcesConfig.crawl) {
    const internalPagesCount = Object.keys(discoveryResult.internalPages).length;
    context.progressReporter.reportInternalPagesStarted(internalPagesCount);

    // Only process data points that need improvement (missing or low confidence)
    const dataPointsNeeded = getDataPointsNeedingImprovement(
      discoveryResult.dataPoints,
      context.dataPoints.map((dp) => dp.name),
      context.minimumConfidenceThreshold
    );
    const filteredDataPoints = context.dataPoints.filter((dp) => dataPointsNeeded.includes(dp.name));

    if (filteredDataPoints.length === 0) {
      console.info('[Orchestrator] All data points have high confidence, skipping internal pages crawling');
      internalPagesDataPoints = {};
    } else {
      console.info(
        `[Orchestrator] Processing ${filteredDataPoints.length} data points in internal pages: ${dataPointsNeeded.join(
          ', '
        )}`
      );
      internalPagesDataPoints = await runInternalPagesStep(
        discoveryResult,
        filteredDataPoints,
        context.maxInternalPages
      );
    }

    internalPagesDataPointsCount = countMeaningfulDataPoints(internalPagesDataPoints);

    // Add internal page URLs to sources
    context.sourcesManager.addSources(internalPageUrls);
  } else {
    // Internal pages crawling is disabled
    context.progressReporter.reportInternalPagesStarted(0); // This will show "Internal pages crawling disabled - skipping"
  }

  // Merge discovery and internal pages data
  const baseDataPoints = mergeDataPoints(discoveryResult.dataPoints, internalPagesDataPoints);

  // Check if we have all data points after internal pages
  const terminationResult = await tryEarlyTermination(baseDataPoints, context, discoveryResult, 'internal pages');

  // Report internal pages completion (needs to happen after LinkedIn in original code)
  // We'll move this to after LinkedIn step to maintain original behavior
  return {
    baseDataPoints,
    earlyResult: terminationResult.finalResult,
  };
};

/**
 * Executes the LinkedIn enrichment step
 */
export const executeLinkedInFlow = async (
  baseDataPoints: Record<string, DataPoint | undefined>,
  discoveryResult: DiscoveryStepResult,
  context: EnrichmentContext
): Promise<{ updatedDataPoints: Record<string, DataPoint | undefined>; earlyResult?: EnrichmentResult }> => {
  let updatedDataPoints = baseDataPoints;

  // Step 3: LinkedIn Agent (if enabled and available)
  if (context.sourcesConfig.linkedin) {
    const linkedInUrl = context.linkedinUrl ?? findLinkedInCompanyUrl(discoveryResult.socialMediaLinks);

    if (linkedInUrl) {
      try {
        context.progressReporter.reportLinkedInStarted();
        const linkedInResult = await runLinkedInEnrichmentStep({
          linkedInUrl,
          baseDataPoints,
          dataPoints: context.dataPoints,
        });

        if (Object.keys(linkedInResult.extracted).length > 0) {
          updatedDataPoints = mergeDataPoints(baseDataPoints, linkedInResult.extracted);
          const linkedInDataPointsCount = countExtractedDataPoints(linkedInResult.extracted);
          context.progressReporter.reportLinkedInCompleted(linkedInDataPointsCount);
          context.sourcesManager.addSourcesFromSet(linkedInResult.sourcesUsed);
        } else {
          context.progressReporter.reportLinkedInNoDataNeeded();
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'LinkedIn analysis failed';
        console.error('[Orchestrator] LinkedIn analysis failed:', errorMessage);
        context.progressReporter.reportLinkedInFailed(`LinkedIn analysis failed - continuing with other sources.`);
      }
    } else {
      context.progressReporter.reportLinkedInNotFound();
    }
  } else {
    // LinkedIn is disabled
    context.progressReporter.reportLinkedInStarted(); // This will show "LinkedIn analysis disabled - skipping"
  }

  // Check if we have all data points after LinkedIn
  const terminationResult = await tryEarlyTermination(updatedDataPoints, context, discoveryResult, 'LinkedIn analysis');

  return {
    updatedDataPoints,
    earlyResult: terminationResult.finalResult,
  };
};

/**
 * Executes the Google search enrichment step
 */
export const executeGoogleSearchFlow = async (
  baseDataPoints: Record<string, DataPoint | undefined>,
  discoveryResult: DiscoveryStepResult,
  context: EnrichmentContext
): Promise<Record<string, DataPoint | undefined>> => {
  let updatedDataPoints = baseDataPoints;

  // Step 4: Google Search Agent (if enabled and for missing data points)
  if (context.sourcesConfig.google) {
    const domain = extractDomain(discoveryResult.finalURL);
    const companyName = baseDataPoints.name?.content?.trim() || domain || context.url;

    try {
      context.progressReporter.reportGoogleSearchStarted();
      const googleResult = await runGoogleSearchEnrichmentStep({
        companyName,
        domain,
        baseDataPoints,
        dataPoints: context.dataPoints,
        googleQueries: discoveryResult.googleQueries || {},
        maxGoogleQueries: context.maxGoogleQueries,
      });

      if (Object.keys(googleResult.extracted).length > 0) {
        updatedDataPoints = mergeDataPoints(baseDataPoints, googleResult.extracted);
        context.sourcesManager.addSourcesFromSet(googleResult.sourcesUsed);
      }
    } catch (error) {
      console.warn('[Orchestrator] Google Search failed:', error);
    }
  } else {
    // Google search is disabled
    context.progressReporter.reportGoogleSearchStarted(); // This will show "Google search disabled - skipping"
  }

  // Report Google search completion
  const finalDataPointsCount = countMeaningfulDataPoints(updatedDataPoints);
  context.progressReporter.reportGoogleSearchCompleted(finalDataPointsCount);

  return updatedDataPoints;
};

/**
 * Executes the company analysis step
 */
export const executeCompanyAnalysisFlow = async (
  baseDataPoints: Record<string, DataPoint | undefined>,
  context: EnrichmentContext
): Promise<CompanyAnalysis | undefined> => {
  // Step 5: Company Analysis Agent
  const hasExecutiveSummary = context.analysisConfig?.executiveSummary;
  const hasCompanyCriteria = Boolean(
    context.analysisConfig?.companyCriteria && context.analysisConfig.companyCriteria.trim().length > 0
  );
  const shouldRunAnalysis = hasExecutiveSummary || hasCompanyCriteria;

  if (shouldRunAnalysis) {
    context.progressReporter.reportCompanyAnalysisStarted(hasCompanyCriteria);
    const enrichedCompany = { ...baseDataPoints };
    const companyAnalysis = await runCompanyAnalysisStep({
      companyCriteria: context.analysisConfig?.companyCriteria,
      enrichedCompany,
    });
    if (companyAnalysis) {
      context.progressReporter.reportCompanyAnalysisCompleted();
    }
    return companyAnalysis;
  } else {
    context.progressReporter.reportCompanyAnalysisSkipped();
    return undefined;
  }
};

/**
 * Executes the complete enrichment flow
 */
export const executeEnrichmentFlow = async (context: EnrichmentContext): Promise<EnrichmentResult> => {
  // Discovery flow
  const { discoveryResult, earlyResult: discoveryEarlyResult } = await executeDiscoveryFlow(context);
  if (discoveryEarlyResult) return discoveryEarlyResult;

  // Internal pages flow
  const { baseDataPoints: postInternalPagesData, earlyResult: internalPagesEarlyResult } =
    await executeInternalPagesFlow(discoveryResult, context);
  if (internalPagesEarlyResult) return internalPagesEarlyResult;

  // LinkedIn flow
  const { updatedDataPoints: postLinkedInData, earlyResult: linkedInEarlyResult } = await executeLinkedInFlow(
    postInternalPagesData,
    discoveryResult,
    context
  );
  if (linkedInEarlyResult) return linkedInEarlyResult;

  // Report internal pages completion (maintaining original timing)
  const internalPagesCount = Object.keys(discoveryResult.internalPages).length;
  const internalPagesDataPointsCount =
    countMeaningfulDataPoints(postInternalPagesData) - countMeaningfulDataPoints(discoveryResult.dataPoints);
  context.progressReporter.reportInternalPagesCompleted(internalPagesDataPointsCount, internalPagesCount);

  // Google search flow
  const finalDataPoints = await executeGoogleSearchFlow(postLinkedInData, discoveryResult, context);

  // Company analysis flow
  const companyAnalysis = await executeCompanyAnalysisFlow(finalDataPoints, context);

  // Step 6: Final result compilation
  const result = createFinalResult(finalDataPoints, context, discoveryResult, companyAnalysis);

  const internalPageUrls = extractInternalPageUrls(discoveryResult.internalPages);
  console.info(
    `[Orchestrator] sources assembled: internal=${internalPageUrls.length} + finalURL=1 + external=${
      result.sources.length - internalPageUrls.length - 1
    } → total=${result.sources.length}`
  );

  return result;
};
