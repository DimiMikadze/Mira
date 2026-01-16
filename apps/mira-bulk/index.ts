/**
 * Mira Bulk Enrichment CLI
 *
 * Processes companies from a CSV file through the Mira enrichment pipeline.
 * Reads workspace configuration from Supabase and enriches each company
 * using the configured data points, sources, and analysis settings.
 */

import { getWorkspace, createSupabaseAdminClient, updateWorkspace } from './supabase.ts';
import { saveProgress, getProgress } from './db.ts';
import Papa from 'papaparse';
import { researchCompany, type CustomDataPoint, type EnrichmentResult } from 'mira-ai';
import PQueue from 'p-queue';

const WORKSPACE_ID = '9c782526-dd5b-40af-9ddb-d57938563c20';
const COMPANIES_CSV_URL = 'https://vcoabomphfvqiexopjjh.supabase.co/storage/v1/object/public/CSV/companies.csv';

// Stop processing after this many consecutive failures
const CIRCUIT_BREAKER_THRESHOLD = 5;

interface CompanyRow {
  website: string;
  linkedin?: string;
}

/**
 * Fetches and parses a CSV file from a URL.
 */
const fetchCompaniesCSV = async (csvUrl: string): Promise<CompanyRow[]> => {
  const response = await fetch(csvUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
  }

  const csvText = await response.text();
  const parseResult = Papa.parse<CompanyRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (parseResult.errors.length > 0) {
    throw new Error(`CSV parsing error: ${parseResult.errors[0].message}`);
  }

  return parseResult.data;
};

/**
 * Flattens nested enrichment result into a flat object suitable for CSV export.
 * Arrays become comma-separated, objects with 'content' property are unwrapped.
 */
const flattenEnrichmentResult = (result: EnrichmentResult, company: CompanyRow): Record<string, string> => {
  const flattenedData: Record<string, string> = {
    ...company,
    status: 'success',
  };

  if (result.enrichedCompany) {
    Object.entries(result.enrichedCompany).forEach(([key, value]) => {
      if (key === 'socialMediaLinks' && Array.isArray(value)) {
        flattenedData[key] = value.join(', ');
      } else if (value && typeof value === 'object' && 'content' in value) {
        flattenedData[key] = String((value as { content: string }).content);
      } else if (typeof value === 'string') {
        flattenedData[key] = value;
      }
    });
  }

  if (result.companyAnalysis) {
    flattenedData.executiveSummary = result.companyAnalysis.executiveSummary;
    if ('FitScore' in result.companyAnalysis && result.companyAnalysis.FitScore !== undefined) {
      flattenedData.FitScore = result.companyAnalysis.FitScore.toString();
      flattenedData.FitReasoning = result.companyAnalysis.FitReasoning || '';
    }
  }

  if (result.executionTime) {
    flattenedData.executionTime = result.executionTime.toString();
  }
  if (result.sources?.length) {
    flattenedData.sources = result.sources.join(', ');
  }

  return flattenedData;
};

/**
 * Uploads results to Supabase storage.
 * Collects all unique keys from all results to ensure consistent CSV columns.
 */
const exportResults = async (results: Record<string, string>[], workspaceId: string): Promise<void> => {
  const validResults = results.filter(Boolean);
  if (validResults.length === 0) return;

  // Collect all unique keys from all results to ensure all data points become columns
  const allKeys = new Set<string>();
  validResults.forEach((result) => {
    Object.keys(result).forEach((key) => allKeys.add(key));
  });

  const resultsCsv = Papa.unparse(validResults, { columns: Array.from(allKeys) });

  const supabase = createSupabaseAdminClient();
  const fileName = `${workspaceId}/enriched-companies-${Date.now()}.csv`;
  const { error: uploadError } = await supabase.storage.from('CSV').upload(fileName, resultsCsv, {
    contentType: 'text/csv',
  });

  if (uploadError) {
    throw new Error(`Failed to upload to Supabase: ${uploadError.message}`);
  }

  const { data: publicData } = supabase.storage.from('CSV').getPublicUrl(fileName);
  const resultsFileUrl = publicData.publicUrl;
  await updateWorkspace(workspaceId, {
    run_status: 'done',
    run_finished_at: new Date().toISOString(),
    generated_csv_file_url: resultsFileUrl,
  });
  console.log(`Results uploaded to Supabase: ${resultsFileUrl}`);
};

const run = async () => {
  const workspace = await getWorkspace(WORKSPACE_ID);
  console.info(`==========\n Workspace loaded: ${JSON.stringify(workspace, null, 2)} \n==========`);

  const companies = await fetchCompaniesCSV(COMPANIES_CSV_URL);
  const totalCompanies = companies.length;
  console.info(`Found ${totalCompanies} companies to process`);

  const queue = new PQueue({
    concurrency: 4,
  });
  const results: Record<string, string>[] = [];

  // Circuit breaker: stops processing after consecutive failures to avoid
  // wasting API quota on systemic issues (e.g., rate limits, auth errors)
  let consecutiveFailures = 0;
  let circuitBreakerTriggered = false;
  let skippedCount = 0;

  const enrichmentConfig = {
    dataPoints: Array.isArray(workspace.datapoints) ? (workspace.datapoints as unknown as CustomDataPoint[]) : [],
    sources: {
      crawl: workspace.source_crawl,
      google: workspace.source_google,
      linkedin: workspace.source_linkedin,
    },
    analysis: {
      executiveSummary: workspace.analysis_executive_summary,
      companyCriteria: workspace.analysis_company_criteria || undefined,
    },
  };

  const config = {
    apiKeys: {
      openaiApiKey: process.env.OPENAI_API_KEY!,
      scrapingBeeApiKey: process.env.SCRAPING_BEE_API_KEY!,
    },
  };

  const promises = companies.map((company, index) =>
    queue.add(async () => {
      // Skip jobs that were queued before circuit breaker triggered
      if (circuitBreakerTriggered) return;

      const { website, linkedin } = company;

      // Skip if already processed (resume capability)
      const existingRecord = getProgress(website);
      if (existingRecord) {
        results[index] = JSON.parse(existingRecord.data);
        skippedCount++;
        console.log(`⏭ Skipped ${website} (already processed)`);
        return;
      }

      try {
        const enrichmentResult = await researchCompany(website, config, {
          enrichmentConfig,
          ...(linkedin ? { linkedinUrl: linkedin } : {}),
          maxGoogleQueries: 1,
          maxInternalPages: 5,
        });

        consecutiveFailures = 0; // Reset on success
        const flattenedData = flattenEnrichmentResult(enrichmentResult, company);
        results[index] = flattenedData;

        // Persist to SQLite for resume capability
        await saveProgress({
          domain: website,
          status: 'success',
          error: '',
          data: JSON.stringify(flattenedData),
        });

        console.info(`==========\n[${index + 1}/${totalCompanies}] ${website}\n==========`);
      } catch (error) {
        consecutiveFailures++;
        const errorMessage = error instanceof Error ? error.message : String(error);

        results[index] = { ...company, status: 'error', error: errorMessage };

        await saveProgress({
          domain: website,
          status: 'error',
          error: errorMessage,
          data: JSON.stringify(company),
        });

        console.error(`==========\n[${index + 1}/${totalCompanies}] ${website} FAILED\n==========`);

        if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
          circuitBreakerTriggered = true;
          queue.clear();
          console.error(
            `Circuit breaker triggered after ${CIRCUIT_BREAKER_THRESHOLD} consecutive failures. Stopping execution.`
          );
        }
      }
    })
  );

  await Promise.all(promises);

  console.info(`==========\n Exporting Results \n==========`);

  await exportResults(results, WORKSPACE_ID);

  console.info(`==========\n Done. \n==========`);

  // Filter out empty slots from skipped jobs
  const processedCount = results.filter(Boolean).length;

  if (skippedCount > 0) {
    console.info(`Skipped ${skippedCount} already-processed companies.`);
  }

  if (circuitBreakerTriggered) {
    console.error(
      `Enrichment stopped early. Processed ${processedCount - skippedCount} new, ${skippedCount} skipped, ${
        totalCompanies - processedCount
      } remaining.`
    );
  } else {
    console.info(`Completed. Processed ${processedCount - skippedCount} new, ${skippedCount} skipped.`);
  }
};

const startTime = performance.now();

try {
  await run();
} catch (err) {
  console.error('Critical crash:', err);
  process.exit(1);
} finally {
  const executionTimeMin = ((performance.now() - startTime) / 60000).toFixed(2);
  console.info(`==========\n Total execution time: ${executionTimeMin} \n==========`);
}
