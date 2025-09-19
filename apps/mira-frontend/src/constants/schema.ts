import { z } from 'zod';

export const DataPointSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
});

export const SourcesSchema = z
  .object({
    crawl: z.boolean().optional(),
    google: z.boolean().optional(),
    linkedin: z.boolean().optional(),
    analysis: z.boolean().optional(),
  })
  .refine((s) => Object.values(s).some(Boolean), { message: 'Select at least one source.' });

export const WorkspaceFormSchema = z.object({
  name: z.string().min(1, 'Workspace name is required'),
  company_criteria: z.string().optional(),
  sources: SourcesSchema,
  dataPoints: z.array(DataPointSchema).min(1, 'Add at least one data point.'),
});

export type WorkspaceFormValues = z.infer<typeof WorkspaceFormSchema>;
