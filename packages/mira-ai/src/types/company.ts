import { z } from 'zod';

// Base type for each data point
export interface DataPoint {
  content: string;
  confidenceScore: number; // 1-5 (full range now supported)
  source: string;
}

// Zod schema for DataPoint
export const DataPointSchema = z.object({
  content: z.string(),
  confidenceScore: z.number().min(1).max(5),
  source: z.string(),
});

// Social media links structure
export interface SocialMediaLinks {
  linkedin?: DataPoint;
  twitter?: DataPoint;
  youtube?: DataPoint;
  facebook?: DataPoint;
  instagram?: DataPoint;
}

// Zod schema for SocialMediaLinks
export const SocialMediaLinksSchema = z
  .object({
    linkedin: z.string().optional(),
    twitter: z.string().optional(),
    youtube: z.string().optional(),
    facebook: z.string().optional(),
    instagram: z.string().optional(),
  })
  .optional();

export interface EnrichedCompany {
  [key: string]: DataPoint;
}

export const EnrichedCompanySchema = z.record(z.string(), DataPointSchema);

// Simplified schema for LLM output - content and confidence only
export const LLMDataPointSchema = z.object({
  content: z.string(),
  confidenceScore: z.number().min(1).max(5),
});

// Schema for internal page URLs from LLM - flexible to allow only found pages
export const InternalPagesSchema = z
  .object({})
  .catchall(z.string())
  .describe('Internal page URLs found in the provided links, keyed by page type');

// Schema for Google search queries from LLM - flexible to allow any data point
export const GoogleQueriesSchema = z
  .object({})
  .catchall(z.array(z.string()))
  .describe('Google search queries keyed by data point name');

// Combined schema for discovery pages and queries agent
export const DiscoveryPagesAndQueriesSchema = z.object({
  internalPages: InternalPagesSchema,
  googleQueries: GoogleQueriesSchema.nullable(),
});

// Helper function to create data points schema from mapping and descriptions
export const createDataPointsSchema = (dataPointKeys: string[]) => {
  const schemaObject: Record<string, z.ZodSchema> = {};

  dataPointKeys.forEach((key) => {
    // OpenAI API requires all fields to be required, so we use nullable instead of optional
    schemaObject[key] = LLMDataPointSchema.nullable();
  });

  return z.object(schemaObject);
};

// Helper function to create data points schema where each value includes source
export const createDataPointsWithSourceSchema = (dataPointKeys: string[]) => {
  const schemaObject: Record<string, z.ZodSchema> = {};

  dataPointKeys.forEach((key) => {
    // OpenAI API requires all fields to be required, so we use nullable instead of optional
    schemaObject[key] = DataPointSchema.nullable();
  });

  return z.object(schemaObject);
};

// Dynamic function to create landing page data point extraction schema
export const createLandingPageDataPointsSchema = (dataPointKeys: string[]) => {
  return z.object({
    dataPoints: createDataPointsSchema(dataPointKeys),
    internalPages: InternalPagesSchema,
  });
};

// Type inference from schema
export type InternalPages = z.infer<typeof InternalPagesSchema>;

export interface CustomDataPoint {
  name: string;
  description: string;
}

export interface EnrichmentSources {
  crawl: boolean;
  google: boolean;
  linkedin: boolean;
}

export interface EnrichmentConfig {
  dataPoints: CustomDataPoint[];
  sources: EnrichmentSources;
}
