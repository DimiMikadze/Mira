import { Agent, run } from '@openai/agents';
import { AGENT_CONFIGS } from '../constants/agent-config.js';
import {
  CompanyAnalysis,
  CompanyAnalysisWithCriteriaSchema,
  CompanyAnalysisWithoutCriteriaSchema,
} from '../types/company-analysis.js';
import type { EnrichedCompany } from '../types/company.js';
import {
  COMPANY_ANALYSIS_AGENT_WITH_COMPANY_CRITERIA_INSTRUCTIONS,
  COMPANY_ANALYSIS_AGENT_WITHOUT_COMPANY_CRITERIA_INSTRUCTIONS,
  createCompanyAnalysisPrompt,
} from '../constants/prompts.js';

/**
 * Supported output keys produced by the Company Analysis Agent.
 */
export type CompanyAnalysisKey = 'executiveSummary' | 'FitScore' | 'FitReasoning';

// Keys returned when Criteria is provided
const KEYS_WITH_CRITERIA: CompanyAnalysisKey[] = ['executiveSummary', 'FitScore', 'FitReasoning'];

// Keys returned when Criteria is not provided (actionable insights only)
const KEYS_WITHOUT_CRITERIA: CompanyAnalysisKey[] = ['executiveSummary'];

/**
 * Input required to run the Company Analysis Agent.
 * - companyCriteria:  when not provided only actionable insights are generated
 * - enrichedCompany: merged enriched data ready for analysis
 */
export interface CompanyAnalysisAgentInput {
  companyCriteria?: string;
  enrichedCompany: EnrichedCompany;
}

/**
 * Output returned by the Company Analysis Agent.
 * - extracted: partial set of fields (agent may omit if unsure)
 */
export interface CompanyAnalysisAgentOutput {
  success: boolean;
  extracted?: CompanyAnalysis;
  error?: string;
}

/**
 * Creates the Company Analysis Agent for scenarios with company criteria
 */
export const createCompanyAnalysisAgentWithCriteria = () =>
  new Agent({
    name: 'Company Analysis Agent with Company Criteria',
    model: AGENT_CONFIGS.companyAnalysis.model,
    modelSettings: { temperature: AGENT_CONFIGS.companyAnalysis.temperature },
    outputType: CompanyAnalysisWithCriteriaSchema,
    instructions: COMPANY_ANALYSIS_AGENT_WITH_COMPANY_CRITERIA_INSTRUCTIONS,
  });

/**
 * Creates the Company Analysis Agent for scenarios without company criteria.
 */
export const createCompanyAnalysisAgentWithoutCriteria = () =>
  new Agent({
    name: 'Company Analysis Agent',
    model: AGENT_CONFIGS.companyAnalysis.model,
    modelSettings: { temperature: AGENT_CONFIGS.companyAnalysis.temperature },
    outputType: CompanyAnalysisWithoutCriteriaSchema,
    instructions: COMPANY_ANALYSIS_AGENT_WITHOUT_COMPANY_CRITERIA_INSTRUCTIONS,
  });

/**
 * Runs the Company Analysis Agent end-to-end for the provided criteria and enriched company data.
 * If criteria is not provided, only generates executive summary.
 */
export const runCompanyAnalysisAgent = async (
  input: CompanyAnalysisAgentInput
): Promise<CompanyAnalysisAgentOutput> => {
  try {
    const { companyCriteria, enrichedCompany } = input;

    // Select appropriate keys and agent based on whether criteria is provided
    const hasCriteria = companyCriteria && companyCriteria.trim().length > 0;
    const keys = hasCriteria ? KEYS_WITH_CRITERIA : KEYS_WITHOUT_CRITERIA;
    const agent = hasCriteria ? createCompanyAnalysisAgentWithCriteria() : createCompanyAnalysisAgentWithoutCriteria();
    const prompt = createCompanyAnalysisPrompt(companyCriteria, enrichedCompany, keys);
    const response = await run(agent, prompt);
    const finalOutput = (response?.finalOutput || {}) as CompanyAnalysis;
    return { success: true, extracted: finalOutput };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};
