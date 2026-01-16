/**
 * Mira Bulk Enrichment CLI
 *
 * Processes companies from a CSV file through the Mira enrichment pipeline.
 * Reads workspace configuration from Supabase and enriches each company
 * using the configured data points, sources, and analysis settings.
 */

import { getWorkspace, createSupabaseAdminClient } from './supabase.ts';
import { saveProgress, getProgress } from './db.ts';
import Papa from 'papaparse';
import { researchCompany, type CustomDataPoint, type EnrichmentResult } from 'mira-ai';
import PQueue from 'p-queue';
import fs from 'node:fs';
import path from 'node:path';

const WORKSPACE_ID = '9c782526-dd5b-40af-9ddb-d57938563c20';

// Stop processing after this many consecutive failures
const CIRCUIT_BREAKER_THRESHOLD = 5;

interface CompanyRow {
  website: string;
  linkedin?: string;
}

/**
 * Parses a CSV file containing company data.
 */
const parseCompaniesCSV = (csvPath: string): CompanyRow[] => {
  const csvText = fs.readFileSync(csvPath, 'utf-8');
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
 * Exports results to local CSV file and uploads to Supabase storage.
 */
const exportResults = async (results: Record<string, string>[], workspaceId: string): Promise<void> => {
  const validResults = results.filter(Boolean);
  if (validResults.length === 0) return;

  const resultsCsv = Papa.unparse(validResults);

  // Save locally
  const outputPath = path.join(import.meta.dirname, 'data', 'enriched-companies.csv');
  fs.writeFileSync(outputPath, resultsCsv, 'utf-8');
  console.log(`Results saved locally to ${outputPath}`);

  // Upload to Supabase storage
  const supabase = createSupabaseAdminClient();
  const fileName = `${workspaceId}/enriched-companies-${Date.now()}.csv`;
  const { error: uploadError } = await supabase.storage.from('CSV').upload(fileName, resultsCsv, {
    contentType: 'text/csv',
  });

  if (uploadError) {
    console.error(`Failed to upload to Supabase: ${uploadError.message}`);
  } else {
    const { data: publicData } = supabase.storage.from('CSV').getPublicUrl(fileName);
    console.log(`Results uploaded to Supabase: ${publicData.publicUrl}`);
  }
};

const run = async () => {
  const workspace = await getWorkspace(WORKSPACE_ID);
  console.log('Workspace loaded:', workspace.name);

  const csvPath = path.join(import.meta.dirname, 'data', 'companies.csv');
  const companies = parseCompaniesCSV(csvPath);
  const totalCompanies = companies.length;
  console.log(`Found ${totalCompanies} companies to process`);

  // Rate-limit concurrent requests to avoid API throttling
  const queue = new PQueue({ concurrency: 2 });
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

      console.log(`Processing company ${index + 1}/${totalCompanies}: ${website}`);

      try {
        const enrichmentResult = await researchCompany(website, config, {
          enrichmentConfig,
          ...(linkedin ? { linkedinUrl: linkedin } : {}),
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

        console.log(`✓ Completed ${website}`);
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

        console.error(`✗ Failed ${website}: ${errorMessage}`);

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
  await exportResults(results, WORKSPACE_ID);

  // Filter out empty slots from skipped jobs
  const processedCount = results.filter(Boolean).length;

  if (skippedCount > 0) {
    console.log(`Skipped ${skippedCount} already-processed companies.`);
  }

  if (circuitBreakerTriggered) {
    console.log(
      `Enrichment stopped early. Processed ${processedCount - skippedCount} new, ${skippedCount} skipped, ${
        totalCompanies - processedCount
      } remaining.`
    );
  } else {
    console.log(`Completed. Processed ${processedCount - skippedCount} new, ${skippedCount} skipped.`);
  }
};

try {
  await run();
} catch (err) {
  console.error('Critical crash:', err);
  process.exit(1);
}
