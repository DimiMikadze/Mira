import { z } from 'zod';

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

// Type exports
export type LinkedInOutreach = z.infer<typeof LinkedInOutreachSchema>;
export type EmailOutreach = z.infer<typeof EmailOutreachSchema>;
export type OutreachResult = z.infer<typeof OutreachResultSchema>;

// Configuration interface
export interface OutreachConfig {
  linkedin: boolean;
  email: boolean;
  prompt: string;
}
