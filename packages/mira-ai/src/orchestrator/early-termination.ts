import type { DataPoint, CustomDataPoint } from '../types/company.js';

/**
 * Checks if all configured data points have reached the minimum confidence threshold
 */
export const shouldTerminateEarly = (
  currentDataPoints: Record<string, DataPoint | undefined>,
  configuredDataPoints: CustomDataPoint[],
  minimumConfidenceThreshold: number = 4
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
  minimumConfidenceThreshold: number = 4
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
  minimumConfidenceThreshold: number = 4
): string[] => {
  const configuredKeys = configuredDataPoints.map((dp) => dp.name);

  return configuredKeys.filter((key) => {
    const dataPoint = currentDataPoints[key];
    return !dataPoint || dataPoint.confidenceScore < minimumConfidenceThreshold;
  });
};
