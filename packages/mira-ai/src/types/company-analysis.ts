import { z } from 'zod';

/**
 * Base fields common to both Criteria and non-Criteria analysis
 */
const BaseCompanyAnalysisFields = {
  executiveSummary: z.string(),
};

/**
 * Company Analysis output when Company Criteria is provided.
 * Includes Criteria match scoring and reasoning.
 */
export const CompanyAnalysisWithCriteriaSchema = z.object({
  ...BaseCompanyAnalysisFields,
  FitScore: z.number().min(0).max(10),
  FitReasoning: z.string(),
});

/**
 * Company Analysis output when no Company Criteria is provided.
 * Only includes actionable insights without Criteria-specific analysis.
 */
export const CompanyAnalysisWithoutCriteriaSchema = z.object({
  ...BaseCompanyAnalysisFields,
});

/**
 * Union type for all possible company analysis outputs
 */
export const CompanyAnalysisSchema = z.union([CompanyAnalysisWithCriteriaSchema, CompanyAnalysisWithoutCriteriaSchema]);

export type CompanyAnalysisWithCriteria = z.infer<typeof CompanyAnalysisWithCriteriaSchema>;
export type CompanyAnalysisWithoutCriteria = z.infer<typeof CompanyAnalysisWithoutCriteriaSchema>;
export type CompanyAnalysis = CompanyAnalysisWithCriteria | CompanyAnalysisWithoutCriteria;
