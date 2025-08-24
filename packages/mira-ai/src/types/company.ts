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

// Main enriched company type
export interface EnrichedCompany {
  // Basics
  name?: DataPoint;
  overview?: DataPoint;
  industry?: DataPoint;
  headquarters?: DataPoint;
  officeLocations?: DataPoint;
  marketPresence?: DataPoint;
  missionAndVision?: DataPoint;
  targetCustomerSegment?: DataPoint;
  toneOfVoice?: DataPoint;
  socialMediaLinks?: string[];
  leadership?: DataPoint;
  companySize?: DataPoint;
  logoUrl?: DataPoint;
  employees?: DataPoint;

  // Growth & Signals
  totalFunding?: DataPoint;
  recentFunding?: DataPoint;
  investors?: DataPoint;
  newProductLaunch?: DataPoint;
  partnerships?: DataPoint;
  newExecutiveHires?: DataPoint;
  openJobs?: DataPoint;
  acquisitions?: DataPoint;
  expansionPlans?: DataPoint;
  technologyStack?: DataPoint;

  // Reputation & Trust
  clients?: DataPoint;
  caseStudies?: DataPoint;
  awardsCertifications?: DataPoint;
  pressMediaMentions?: DataPoint;
  customerTestimonials?: DataPoint;

  // Activity and Events
  upcomingEvents?: DataPoint;
  recentEventParticipation?: DataPoint;
}

// Zod schema for EnrichedCompany
export const EnrichedCompanySchema = z.object({
  // Basics
  name: DataPointSchema.optional(),
  industry: DataPointSchema.optional(),
  overview: DataPointSchema.optional(),
  headquarters: DataPointSchema.optional(),
  officeLocations: DataPointSchema.optional(),
  marketPresence: DataPointSchema.optional(),
  missionAndVision: DataPointSchema.optional(),
  targetCustomerSegment: DataPointSchema.optional(),
  toneOfVoice: DataPointSchema.optional(),
  socialMediaLinks: z.array(z.string()).optional(),
  leadership: DataPointSchema.optional(),
  companySize: DataPointSchema.optional(),
  logoUrl: DataPointSchema.optional(),
  employees: DataPointSchema.optional(),

  // Growth & Signals
  totalFunding: DataPointSchema.optional(),
  recentFunding: DataPointSchema.optional(),
  investors: DataPointSchema.optional(),
  newProductLaunch: DataPointSchema.optional(),
  partnerships: DataPointSchema.optional(),
  newExecutiveHires: DataPointSchema.optional(),
  openJobs: DataPointSchema.optional(),
  acquisitions: DataPointSchema.optional(),
  expansionPlans: DataPointSchema.optional(),
  technologyStack: DataPointSchema.optional(),

  // Reputation & Trust
  clients: DataPointSchema.optional(),
  caseStudies: DataPointSchema.optional(),
  awardsCertifications: DataPointSchema.optional(),
  pressMediaMentions: DataPointSchema.optional(),
  customerTestimonials: DataPointSchema.optional(),

  // Activity and Events
  upcomingEvents: DataPointSchema.optional(),
  recentEventParticipation: DataPointSchema.optional(),
});

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
