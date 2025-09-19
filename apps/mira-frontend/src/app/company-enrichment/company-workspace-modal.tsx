'use client';

import React, { useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { WorkspaceRow } from '@/lib/supabase/orm';
import { CustomDataPoint } from 'mira-ai';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { WorkspaceFormSchema, type WorkspaceFormValues } from '@/constants/schema';
import { Json } from '@/constants/database.types';

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

import { Plus } from 'lucide-react';
import { AutosizeTextarea } from '@/components/ui/autosize-textarea';

interface CompanyWorkspaceModalProps {
  authUser: User;
  workspace?: WorkspaceRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (workspace: Partial<WorkspaceRow>) => Promise<void> | void;
}

// Helpers: map existing workspace -> form defaults
function mapWorkspaceToFormSources(workspace?: WorkspaceRow): WorkspaceFormValues['sources'] {
  return {
    crawl: workspace?.source_crawl ?? false,
    google: workspace?.source_google ?? false,
    linkedin: workspace?.source_linkedin ?? false,
  };
}

function mapWorkspaceToFormAnalysis(workspace?: WorkspaceRow): WorkspaceFormValues['analysis'] {
  return {
    executiveSummary: workspace?.analysis_executive_summary ?? false,
    companyCriteria: workspace?.analysis_company_criteria ?? '',
  };
}

// Reusable section component
const WorkspaceSection = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) => {
  return (
    <Card className='bg-gray-100 shadow-none rounded-2xl'>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className='text-sm text-muted-foreground'>{description}</p>
      </CardHeader>
      <CardContent className='space-y-4'>{children}</CardContent>
    </Card>
  );
};

export default function CompanyWorkspaceModal({ workspace, open, onOpenChange, onSave }: CompanyWorkspaceModalProps) {
  // Derive defaults from an existing workspace if present (best-effort)
  const defaultValues: WorkspaceFormValues = useMemo(() => {
    // Map WorkspaceRow properties to form values
    const inferredDataPoints: CustomDataPoint[] = workspace?.datapoints
      ? (workspace.datapoints as unknown as CustomDataPoint[])
      : [{ name: '', description: '' }];

    const inferredSources = mapWorkspaceToFormSources(workspace);
    const inferredAnalysis = mapWorkspaceToFormAnalysis(workspace);

    return {
      name: workspace?.name || '',
      sources: inferredSources,
      analysis: inferredAnalysis,
      dataPoints: inferredDataPoints.length > 0 ? inferredDataPoints : [{ name: '', description: '' }],
    };
  }, [workspace]);

  const form = useForm<WorkspaceFormValues>({
    resolver: zodResolver(WorkspaceFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  const { control, handleSubmit, formState, reset } = form;
  const { fields, append } = useFieldArray<WorkspaceFormValues>({
    control,
    name: 'dataPoints',
  });

  // Reset form when workspace changes
  React.useEffect(() => {
    reset(defaultValues);
  }, [reset, defaultValues]);

  const submitting = formState.isSubmitting;

  const onSubmit = async (values: WorkspaceFormValues) => {
    const workspaceData: Partial<WorkspaceRow> = {
      name: values.name.trim(),
      // Sources as individual boolean fields
      source_crawl: values.sources.crawl ?? false,
      source_google: values.sources.google ?? false,
      source_linkedin: values.sources.linkedin ?? false,
      // Analysis fields
      analysis_executive_summary: values.analysis.executiveSummary ?? false,
      analysis_company_criteria: values.analysis.companyCriteria?.trim() || null,
      datapoints: values.dataPoints.map((d) => ({
        name: d.name.trim(),
        description: d.description.trim(),
      })) as unknown as Json,
    };

    if (workspace?.id) {
      workspaceData.id = workspace.id;
    }

    await onSave(workspaceData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto max-w-screen-lg sm:max-w-xl lg:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{workspace ? 'Edit Workspace' : 'New Workspace'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form id='workspace-form' onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
            {/* Workspace Name */}
            <WorkspaceSection title='Workspace Name' description='Give your workspace a name to identify it easily.'>
              <FormField
                control={control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder='e.g., B2B SaaS Prospects' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </WorkspaceSection>

            {/* Data Points */}
            <WorkspaceSection
              title='Custom Data Points'
              description='Define the fields you want Mira to extract. You need at least one.'
            >
              <div className='space-y-4'>
                {fields.map((field, index) => (
                  <div key={field.id}>
                    <div className='grid grid-cols-1 sm:grid-cols-12 gap-4 items-center'>
                      {/* Name small */}
                      <div className='sm:col-span-3'>
                        <FormField
                          control={control}
                          name={`dataPoints.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input placeholder='e.g., Headcount' {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Description + Remove button in same row */}
                      <div className='sm:col-span-9'>
                        <div className='flex items-center gap-2'>
                          <FormField
                            control={control}
                            name={`dataPoints.${index}.description`}
                            render={({ field }) => (
                              <FormItem className='flex-1'>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Input placeholder='e.g., Estimated number of employees' {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                type='button'
                variant='secondary'
                size='sm'
                className='bg-white cursor-pointer mt-4 w-full'
                onClick={() => append({ name: '', description: '' })}
              >
                <Plus className='mr-2 h-4 w-4' />
              </Button>

              {/* Array-level error */}
              {formState.errors.dataPoints?.root?.message && (
                <p className='text-sm font-medium text-destructive'>
                  {formState.errors.dataPoints.root.message as string}
                </p>
              )}
            </WorkspaceSection>

            {/* Sources */}
            <WorkspaceSection
              title='Sources (optional)'
              description='Mira always scrapes the main landing page. You can enable additional sources for more comprehensive data.'
            >
              <div className='grid gap-4'>
                <FormField
                  control={control}
                  name='sources.crawl'
                  render={({ field }) => (
                    <FormItem className='flex items-center justify-between rounded-2xl border p-4 bg-white'>
                      <div>
                        <FormLabel className='text-base'>Website Crawl</FormLabel>
                        <FormDescription>Company site and internal pages.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name='sources.linkedin'
                  render={({ field }) => (
                    <FormItem className='flex items-center justify-between rounded-2xl border p-4 bg-white'>
                      <div>
                        <FormLabel className='text-base'>LinkedIn</FormLabel>
                        <FormDescription>Company profile and signals.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name='sources.google'
                  render={({ field }) => (
                    <FormItem className='flex items-center justify-between rounded-2xl border p-4 bg-white'>
                      <div>
                        <FormLabel className='text-base'>Google</FormLabel>
                        <FormDescription>Search results and news.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </WorkspaceSection>

            {/* Analysis */}
            <WorkspaceSection
              title='Analysis (optional)'
              description='Configure additional analysis options for your enrichment results.'
            >
              <div className='grid gap-4'>
                <FormField
                  control={control}
                  name='analysis.executiveSummary'
                  render={({ field }) => (
                    <FormItem className='flex items-center justify-between rounded-2xl border p-4 bg-white'>
                      <div>
                        <FormLabel className='text-base'>Executive Summary</FormLabel>
                        <FormDescription>Generate an executive summary based on the data points found.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className='rounded-2xl border bg-white'>
                  <div className='p-4'>
                    <FormField
                      control={control}
                      name='analysis.companyCriteria'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='text-base'>Company Criteria</FormLabel>
                          <FormDescription className='mb-4'>
                            Describe your ideal company profile to get a fit score and reasoning.
                          </FormDescription>
                          <FormControl>
                            <AutosizeTextarea
                              placeholder='e.g., B2B SaaS, 11–200 employees, recent funding, US/EU market…'
                              {...field}
                              className='min-h-[80px]'
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </WorkspaceSection>
          </form>
        </Form>
        <DialogFooter>
          <Button type='submit' disabled={submitting} className='cursor-pointer' size='lg' form='workspace-form'>
            {submitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
