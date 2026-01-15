import { Agent, run } from '@openai/agents';
import { z } from 'zod';
import type { ProgressCallback } from '../orchestrator/progress-manager.js';
import { OutreachConfig, OutreachResult, LinkedInOutreachSchema, EmailOutreachSchema } from '../types/outreach.js';
import { PROGRESS_EVENTS } from '../constants/progress.js';

/**
 * Generate personalized outreach messages using OpenAI GPT-4o with structured output
 */
export async function generateOutreach(
  companyInfo: string,
  outreachConfig: OutreachConfig,
  onProgress?: ProgressCallback
): Promise<OutreachResult> {
  try {
    // Report outreach started
    onProgress?.(PROGRESS_EVENTS.OUTREACH_STARTED, 'Generating personalized outreach messages...');

    // Create dynamic schema based on what's requested
    const dynamicSchema = createDynamicSchema(outreachConfig);

    // Create the outreach agent
    const agent = new Agent({
      name: 'Outreach Agent',
      model: 'gpt-4o',
      modelSettings: {
        temperature: 0.3,
        maxTokens: 2000,
      },
      outputType: dynamicSchema,
      instructions:
        'You are an assistant that writes personalized outreach messages based on structured company research.',
    });

    // Create prompt for the requested outreach types
    const prompt = createOutreachPrompt(companyInfo, outreachConfig);

    const response = await run(agent, prompt);
    const result = (response?.finalOutput || {}) as OutreachResult;

    // Report outreach completed
    onProgress?.(PROGRESS_EVENTS.OUTREACH_COMPLETED, 'Outreach messages generated successfully');

    return result;
  } catch (error) {
    console.error('Error generating outreach:', error);
    onProgress?.(PROGRESS_EVENTS.OUTREACH_ERROR, 'Failed to generate outreach messages');
    throw new Error('Failed to generate outreach messages');
  }
}

/**
 * Create dynamic Zod schema based on outreach configuration
 */
function createDynamicSchema(config: OutreachConfig) {
  const schemaObject: Record<string, z.ZodTypeAny> = {};

  if (config.linkedin) {
    schemaObject.linkedin = LinkedInOutreachSchema;
  }

  if (config.email) {
    schemaObject.email = EmailOutreachSchema;
  }

  return z.object(schemaObject);
}

/**
 * Create unified prompt based on outreach configuration
 */
function createOutreachPrompt(companyInfo: string, config: OutreachConfig): string {
  const outreachTypes = [];

  if (config.linkedin) {
    outreachTypes.push('LinkedIn outreach (connection note, acceptance message, and InMail with subject/message)');
  }

  if (config.email) {
    outreachTypes.push('Email outreach (initial email with subject/message and follow-up message)');
  }

  const companyData = companyInfo ? `Company Data: ${companyInfo}` : '';

  return `Generate personalized ${outreachTypes.join(' and ')} based on the company research data below.

Company Data:
${companyData}

Primary Instructions:
${config.prompt}
`;
}
