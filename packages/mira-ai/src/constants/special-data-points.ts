/**
 * Special data points that are extracted directly from scraped data
 * rather than processed through LLM analysis
 */
export const SPECIAL_DATA_POINTS = {
  LINKEDIN_EMPLOYEES: 'LINKEDIN_EMPLOYEES',
  LINKEDIN_POSTS: 'LINKEDIN_POSTS',
} as const;

/**
 * Type representing all special data point values
 */
export type SpecialDataPoint = (typeof SPECIAL_DATA_POINTS)[keyof typeof SPECIAL_DATA_POINTS];

/**
 * Array of all special data point values for easy iteration
 */
export const SPECIAL_DATA_POINTS_ARRAY = Object.values(SPECIAL_DATA_POINTS);

/**
 * Check if a data point name is a special data point
 */
export const isSpecialDataPoint = (dataPointName: string): dataPointName is SpecialDataPoint => {
  return SPECIAL_DATA_POINTS_ARRAY.includes(dataPointName as SpecialDataPoint);
};
