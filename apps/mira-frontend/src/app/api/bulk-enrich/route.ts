import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import Papa from 'papaparse';
import { researchCompany, generateOutreach, type CustomDataPoint, type OutreachConfig } from 'mira-ai';
import PQueue from 'p-queue';
import type { Database } from '@/constants/database.types';

interface BulkEnrichRequest {
  workspaceId: string;
  csvMapping: {
    domain: string | null;
    companyLinkedInURL: string | null;
  };
  csvFileUrl: string; // URL of uploaded file in storage
  rowCount: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: BulkEnrichRequest = await request.json();
    const { workspaceId, csvMapping, csvFileUrl, rowCount } = body;

    const supabase = await createSupabaseServerClient();

    // Get workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('Workspace')
      .select('*')
      .eq('id', workspaceId)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Update workspace with CSV info and reset status
    await supabase
      .from('Workspace')
      .update({
        csv_mapping: csvMapping,
        csv_file_url: csvFileUrl,
        csv_row_count: rowCount,
        run_status: 'idle',
        run_started_at: null,
        run_finished_at: null,
        run_error: null,
        generated_csv_file_url: null,
      })
      .eq('id', workspaceId);

    // Process companies and wait for completion
    const updatedWorkspace = await processCompanies(workspaceId, csvFileUrl, workspace);

    return NextResponse.json({
      success: true,
      message: 'Bulk enrichment completed',
      totalCompanies: rowCount,
      workspace: updatedWorkspace,
    });
  } catch (error) {
    console.error('Bulk enrichment error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process bulk enrichment' },
      { status: 500 }
    );
  }
}

async function processCompanies(
  workspaceId: string,
  csvFileUrl: string,
  workspace: Database['public']['Tables']['Workspace']['Row']
): Promise<Database['public']['Tables']['Workspace']['Row']> {
  const supabase = await createSupabaseServerClient();

  try {
    // Set status to running
    await supabase
      .from('Workspace')
      .update({
        run_status: 'running',
        run_started_at: new Date().toISOString(),
      })
      .eq('id', workspaceId);

    // Download and parse CSV
    const csvResponse = await fetch(csvFileUrl);
    const csvText = await csvResponse.text();
    const parseResult = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (parseResult.errors.length > 0) {
      throw new Error(`CSV parsing error: ${parseResult.errors[0].message}`);
    }

    const companies = parseResult.data;
    const totalCompanies = companies.length;
    console.log(`Processing ${totalCompanies} companies for workspace ${workspaceId}`);

    // Create queue for rate limiting
    const queue = new PQueue({
      concurrency: 3, // Process 3 companies at once
      interval: 1000, // 1 second interval
      intervalCap: 1, // 1 job per interval
    });

    const results: Record<string, string>[] = [];

    // Build enrichment config from workspace
    const enrichmentConfig = {
      dataPoints: Array.isArray(workspace.datapoints) ? (workspace.datapoints as unknown as CustomDataPoint[]) : [],
      dataSources: {
        website: workspace.source_crawl,
        google: workspace.source_google,
        linkedin: workspace.source_linkedin,
      },
      analysis: {
        executiveSummary: workspace.analysis_executive_summary,
        companyCriteria: workspace.analysis_company_criteria || undefined,
      },
    };

    // Build outreach config
    const outreachConfig: OutreachConfig | undefined =
      workspace.outreach_email || workspace.outreach_linkedin
        ? {
            linkedin: workspace.outreach_linkedin,
            email: workspace.outreach_email,
            prompt: workspace.outreach_prompt || '',
          }
        : undefined;

    // Process each company
    const promises = companies.map((company, index) =>
      queue.add(async () => {
        try {
          const domain = company.domain || company.Domain;
          console.log(`Processing company ${index + 1}/${totalCompanies}: ${domain}`);

          console.log(`Processing company ${index + 1}/${totalCompanies}: ${domain}`);

          // Prepare API configuration
          const config = {
            apiKeys: {
              openaiApiKey: process.env.OPENAI_API_KEY!,
              scrapingBeeApiKey: process.env.SCRAPING_BEE_API_KEY!,
            },
          };

          // Get enrichment result
          const enrichmentResult = await researchCompany(domain, config, {
            enrichmentConfig,
          });

          // Generate outreach if configured
          let outreachResult = null;
          if (outreachConfig && enrichmentResult.enrichedCompany) {
            try {
              outreachResult = await generateOutreach(enrichmentResult.enrichedCompany, outreachConfig);
            } catch (outreachError) {
              console.error('Outreach generation failed:', outreachError);
            }
          }

          // Flatten enriched data for CSV storage
          const flattenedData: Record<string, string> = {
            ...company,
            status: 'success',
          };

          // Add enriched company data
          if (enrichmentResult.enrichedCompany) {
            Object.entries(enrichmentResult.enrichedCompany).forEach(([key, value]) => {
              if (key === 'socialMediaLinks' && Array.isArray(value)) {
                flattenedData[key] = value.join(', ');
              } else if (value && typeof value === 'object' && 'content' in value) {
                flattenedData[key] = value.content;
              } else if (typeof value === 'string') {
                flattenedData[key] = value;
              }
            });
          }

          // Add company analysis data
          if (enrichmentResult.companyAnalysis) {
            flattenedData.executiveSummary = enrichmentResult.companyAnalysis.executiveSummary;
            if ('FitScore' in enrichmentResult.companyAnalysis) {
              flattenedData.FitScore = enrichmentResult.companyAnalysis.FitScore.toString();
              flattenedData.FitReasoning = enrichmentResult.companyAnalysis.FitReasoning;
            }
          }

          // Add outreach data (only if generated)
          if (outreachResult) {
            if (outreachResult.linkedin) {
              if (outreachResult.linkedin.connection_note)
                flattenedData.linkedInConnectionNote = outreachResult.linkedin.connection_note;
              if (outreachResult.linkedin.acceptance_message)
                flattenedData.linkedInAcceptanceMessage = outreachResult.linkedin.acceptance_message;
              if (outreachResult.linkedin.inmail_subject)
                flattenedData.linkedInSubject = outreachResult.linkedin.inmail_subject;
              if (outreachResult.linkedin.inmail_message)
                flattenedData.linkedInMessage = outreachResult.linkedin.inmail_message;
            }
            if (outreachResult.email) {
              if (outreachResult.email.email_subject) flattenedData.emailSubject = outreachResult.email.email_subject;
              if (outreachResult.email.email_message) flattenedData.emailMessage = outreachResult.email.email_message;
              if (outreachResult.email.email_follow_up_message)
                flattenedData.emailFollowUp = outreachResult.email.email_follow_up_message;
            }
          }

          // Add execution metadata
          if (enrichmentResult.executionTime) {
            flattenedData.executionTime = enrichmentResult.executionTime;
          }
          if (enrichmentResult.sources?.length) {
            flattenedData.sources = enrichmentResult.sources.join(', ');
          }

          results[index] = flattenedData;
        } catch (error) {
          console.error(`Error processing company ${index + 1}:`, error);
          results[index] = {
            ...company,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    // Wait for all companies to be processed
    await Promise.all(promises);

    // Generate results CSV
    const resultsCsv = Papa.unparse(results);
    const csvBlob = new Blob([resultsCsv], { type: 'text/csv' });

    // Upload results to storage
    const fileName = `${workspaceId}/results-${Date.now()}.csv`;
    const { error: uploadError } = await supabase.storage.from('CSV').upload(fileName, csvBlob);

    if (uploadError) {
      throw new Error(`Failed to upload results: ${uploadError.message}`);
    }

    // Get public URL
    const { data: publicData } = supabase.storage.from('CSV').getPublicUrl(fileName);
    const resultsFileUrl = publicData.publicUrl;

    // Update workspace with completion
    const { data: updatedWorkspace } = await supabase
      .from('Workspace')
      .update({
        run_status: 'done',
        run_finished_at: new Date().toISOString(),
        generated_csv_file_url: resultsFileUrl,
      })
      .eq('id', workspaceId)
      .select()
      .single();

    console.log(`Bulk enrichment completed for workspace ${workspaceId}`);
    return updatedWorkspace!;
  } catch (error) {
    console.error('Bulk enrichment failed:', error);

    // Update workspace with error
    await supabase
      .from('Workspace')
      .update({
        run_status: 'failed',
        run_finished_at: new Date().toISOString(),
        run_error: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', workspaceId);

    throw error;
  }
}
