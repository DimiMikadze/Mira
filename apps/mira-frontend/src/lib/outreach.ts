import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';

// Zod schemas for outreach results
export const LinkedInOutreachSchema = z.object({
  connection_note: z.string(),
  acceptance_message: z.string(),
  inmail_subject: z.string(),
  inmail_message: z.string(),
});

export const EmailOutreachSchema = z.object({
  email_subject: z.string(),
  email_message: z.string(),
  email_follow_up_message: z.string(),
});

export const OutreachResultSchema = z.object({
  linkedin: LinkedInOutreachSchema.optional(),
  email: EmailOutreachSchema.optional(),
});

export type OutreachResult = z.infer<typeof OutreachResultSchema>;

export interface OutreachConfig {
  linkedin: boolean;
  email: boolean;
  prompt: string;
}

// Import types from mira-ai
import type { EnrichedCompany, CompanyAnalysis } from 'mira-ai/types';

// Interface matching the enrichment result structure from mira-ai
export interface EnrichmentResult {
  enrichedCompany: EnrichedCompany;
  executionTime: string;
  sources: string[];
  companyAnalysis?: CompanyAnalysis;
}

/**
 * Generate personalized outreach messages using OpenAI GPT-4o with structured output
 */
export async function generateOutreach(
  enrichmentData: EnrichmentResult,
  outreachConfig: OutreachConfig
): Promise<OutreachResult> {
  const openai = new OpenAI();

  // Create dynamic schema based on what's requested
  const dynamicSchema = createDynamicSchema(outreachConfig);

  // Create prompt for the requested outreach types
  const prompt = createOutreachPrompt(enrichmentData, outreachConfig);

  console.log('prompt', prompt);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are an assistant that writes personalized outreach messages based on structured company research.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: zodResponseFormat(dynamicSchema, 'outreach_result'),
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from OpenAI');

    return JSON.parse(content);
  } catch (error) {
    console.error('Error generating outreach:', error);
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
function createOutreachPrompt(enrichmentData: EnrichmentResult, config: OutreachConfig): string {
  const outreachTypes = [];

  if (config.linkedin) {
    outreachTypes.push('LinkedIn outreach (connection note, acceptance message, and InMail with subject/message)');
  }

  if (config.email) {
    outreachTypes.push('Email outreach (initial email with subject/message and follow-up message)');
  }

  // Format company data as simple name: content pairs
  const companyData = Object.entries(enrichmentData.enrichedCompany)
    .filter(([key]) => key !== 'socialMediaLinks')
    .map(([key, value]) => `${key}: ${(value as { content?: string })?.content || value}`)
    .join('\n');

  return `Generate personalized ${outreachTypes.join(' and ')} based on the company research data below.

Company Data:
${companyData}

Requirements:
- Keep message bodies under 150 words
- For LinkedIn: connection_note under 300 chars, acceptance_message under 500 chars
- For InMail: compelling subject and detailed message under 1000 chars

Primary Instructions:
${config.prompt}
`;
}
