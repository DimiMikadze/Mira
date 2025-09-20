import { z } from 'zod';

export const DataPointSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
});

export const SourcesSchema = z.object({
  crawl: z.boolean().optional(),
  google: z.boolean().optional(),
  linkedin: z.boolean().optional(),
});

export const AnalysisSchema = z.object({
  executiveSummary: z.boolean().optional(),
  companyCriteria: z.string().optional(),
});

export const OutreachSchema = z
  .object({
    linkedin: z.boolean().optional(),
    email: z.boolean().optional(),
    prompt: z.string().optional(),
  })
  .refine(
    (data) => {
      const hasOutreach = data.linkedin || data.email;
      return !hasOutreach || (hasOutreach && data.prompt?.trim());
    },
    {
      message: 'Outreach prompt is required when LinkedIn or email outreach is enabled',
      path: ['prompt'],
    }
  );

export const WorkspaceFormSchema = z.object({
  name: z.string().min(1, 'Workspace name is required'),
  sources: SourcesSchema,
  analysis: AnalysisSchema,
  outreach: OutreachSchema,
  dataPoints: z.array(DataPointSchema).min(1, 'Add at least one data point.'),
});

export type WorkspaceFormValues = z.infer<typeof WorkspaceFormSchema>;
