import type { DataPoint, CustomDataPoint } from '../types/company.js';
import type { CompanyAnalysis } from '../types/company-analysis.js';
import { MINIMUM_CONFIDENCE_THRESHOLD } from '../constants/index.js';

/**
 * Checks if all configured data points have reached the minimum confidence threshold
 */
export const shouldTerminateEarly = (
  currentDataPoints: Record<string, DataPoint | undefined>,
  configuredDataPoints: CustomDataPoint[],
  minimumConfidenceThreshold: number = MINIMUM_CONFIDENCE_THRESHOLD
): boolean => {
  const configuredKeys = configuredDataPoints.map((dp) => dp.name);

  // Check if all configured data points exist and meet the confidence threshold
  for (const key of configuredKeys) {
    const dataPoint = currentDataPoints[key];

    // If data point doesn't exist or has low confidence, don't terminate early
    if (!dataPoint || dataPoint.confidenceScore < minimumConfidenceThreshold) {
      return false;
    }
  }

  return true;
};

/**
 * Gets statistics about current data point completion
 */
export const getCompletionStats = (
  currentDataPoints: Record<string, DataPoint | undefined>,
  configuredDataPoints: CustomDataPoint[],
  minimumConfidenceThreshold: number = MINIMUM_CONFIDENCE_THRESHOLD
): {
  total: number;
  completed: number;
  completionPercentage: number;
  averageConfidence: number;
} => {
  const configuredKeys = configuredDataPoints.map((dp) => dp.name);
  const total = configuredKeys.length;

  let completed = 0;
  let totalConfidence = 0;
  let dataPointsWithConfidence = 0;

  for (const key of configuredKeys) {
    const dataPoint = currentDataPoints[key];

    if (dataPoint) {
      dataPointsWithConfidence++;
      totalConfidence += dataPoint.confidenceScore;

      if (dataPoint.confidenceScore >= minimumConfidenceThreshold) {
        completed++;
      }
    }
  }

  const completionPercentage = total > 0 ? (completed / total) * 100 : 0;
  const averageConfidence = dataPointsWithConfidence > 0 ? totalConfidence / dataPointsWithConfidence : 0;

  return {
    total,
    completed,
    completionPercentage,
    averageConfidence,
  };
};

/**
 * Gets a list of data points that still need improvement
 */
export const getIncompleteDataPoints = (
  currentDataPoints: Record<string, DataPoint | undefined>,
  configuredDataPoints: CustomDataPoint[],
  minimumConfidenceThreshold: number = MINIMUM_CONFIDENCE_THRESHOLD
): string[] => {
  const configuredKeys = configuredDataPoints.map((dp) => dp.name);

  return configuredKeys.filter((key) => {
    const dataPoint = currentDataPoints[key];
    return !dataPoint || dataPoint.confidenceScore < minimumConfidenceThreshold;
  });
};

// Types and functions for early termination handling
export interface StepExecutionResult {
  shouldTerminate: boolean;
  finalResult?: import('./result-builder.js').EnrichmentResult;
}

/**
 * Check if all data points are complete and terminate early if so
 * Still runs company analysis before terminating
 */
export const tryEarlyTermination = async (
  baseDataPoints: Record<string, DataPoint | undefined>,
  context: import('./enrichment-context.js').EnrichmentContext,
  discoveryResult: import('./agent-coordinator.js').DiscoveryStepResult,
  stepName: string
): Promise<StepExecutionResult> => {
  // Import these here to avoid circular dependencies
  const { runCompanyAnalysisStep } = await import('./agent-coordinator.js');
  const { createFinalResult } = await import('./result-builder.js');

  if (shouldTerminateEarly(baseDataPoints, context.dataPoints, context.minimumConfidenceThreshold)) {
    const stats = getCompletionStats(baseDataPoints, context.dataPoints, context.minimumConfidenceThreshold);
    console.info(
      `[Orchestrator] Early completion after ${stepName}: All ${stats.completed}/${
        stats.total
      } data points achieved high confidence (avg: ${stats.averageConfidence.toFixed(1)})`
    );
    context.progressReporter.reportEarlyTermination?.(stats.completed, stats.total, stats.averageConfidence);

    // Run company analysis based on configuration
    let companyAnalysis: CompanyAnalysis | undefined;
    const hasCriteria = context.companyCriteria && context.companyCriteria.trim().length > 0;
    const shouldRunAnalysis = hasCriteria || context.sourcesConfig.analysis;

    if (shouldRunAnalysis) {
      context.progressReporter.reportCompanyAnalysisStarted(hasCriteria as boolean);
      const enrichedCompany = { ...baseDataPoints };
      companyAnalysis = await runCompanyAnalysisStep({
        companyCriteria: context.companyCriteria,
        enrichedCompany,
      });
      if (companyAnalysis) {
        context.progressReporter.reportCompanyAnalysisCompleted();
      }
    } else {
      context.progressReporter.reportCompanyAnalysisSkipped();
    }

    const finalResult = createFinalResult(baseDataPoints, context, discoveryResult, companyAnalysis);

    return { shouldTerminate: true, finalResult };
  }

  return { shouldTerminate: false };
};
