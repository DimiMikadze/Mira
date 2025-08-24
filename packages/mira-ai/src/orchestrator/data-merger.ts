import type { DataPoint } from '../types/company.js';

/**
 * Merges data points from different agents using confidence score-based prioritization
 */
export const mergeDataPoints = (
  existing: Record<string, DataPoint | undefined>,
  incoming: Record<string, DataPoint | undefined>
): Record<string, DataPoint> => {
  const merged = { ...existing } as Record<string, DataPoint>;

  for (const key of Object.keys(incoming)) {
    const incomingDataPoint = incoming[key];
    if (!incomingDataPoint || !incomingDataPoint.content || !incomingDataPoint.content.trim()) {
      continue;
    }

    const existingDataPoint = merged[key];

    // Merge policy: prefer higher confidenceScore; otherwise keep existing
    if (!existingDataPoint || incomingDataPoint.confidenceScore > existingDataPoint.confidenceScore) {
      merged[key] = {
        content: incomingDataPoint.content.trim(),
        confidenceScore: incomingDataPoint.confidenceScore,
        source: incomingDataPoint.source,
      };
    }
  }

  return merged;
};

/**
 * Filters data points that need improvement based on confidence threshold
 */
export const getDataPointsNeedingImprovement = (
  dataPoints: Record<string, DataPoint | undefined>,
  allowedKeys: readonly string[],
  confidenceThreshold: number = 3
): string[] => {
  return allowedKeys.filter((key) => {
    const existing = dataPoints[key as keyof typeof dataPoints] as DataPoint | undefined;
    return !existing || existing.confidenceScore <= confidenceThreshold;
  });
};

/**
 * Counts how many meaningful data points were extracted from an agent result
 */
export const countExtractedDataPoints = (extracted: Record<string, DataPoint | undefined>): number => {
  return Object.keys(extracted).filter((key) => {
    const dataPoint = extracted[key];
    return dataPoint && dataPoint.content?.trim();
  }).length;
};

/**
 * Extracts sources used from data points for tracking
 */
export const extractSourcesFromDataPoints = (dataPoints: Record<string, DataPoint | undefined>): Set<string> => {
  const sources = new Set<string>();

  Object.values(dataPoints).forEach((dataPoint) => {
    if (dataPoint?.source) {
      sources.add(dataPoint.source);
    }
  });

  return sources;
};
