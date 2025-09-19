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

export const WorkspaceFormSchema = z.object({
  name: z.string().min(1, 'Workspace name is required'),
  sources: SourcesSchema,
  analysis: AnalysisSchema,
  dataPoints: z.array(DataPointSchema).min(1, 'Add at least one data point.'),
});

export type WorkspaceFormValues = z.infer<typeof WorkspaceFormSchema>;
