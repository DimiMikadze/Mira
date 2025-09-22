'use client';

import React, { useState, useEffect } from 'react';
import type { EnrichedCompany } from 'mira-ai/types';

import CompanyAnalysis from './company-analysis';
import CompanyDataPoints from './company-data-points';
import CompanyProgress from './company-progress';
import CompanySources from './company-sources';
import CompanySearchInput from './company-search-input';
import CompanySearchInfo from './company-search-info';
import CompanyBulkResult from './company-bulk-result';
import CompanyBulkProgress from './company-bulk-progress';
import { PROGRESS_EVENTS, type ProgressEventType } from 'mira-ai/types';

import type { CompanyAnalysis as CompanyAnalysisType } from 'mira-ai/types';
import { CircleAlert } from 'lucide-react';
import { Alert, AlertTitle } from '@/components/ui/alert';
import {
  API_ENDPOINTS,
  workspaceToEnrichmentSources,
  workspaceToAnalysis,
  workspaceToOutreach,
  storage,
} from '@/lib/utils';
import { type OutreachResult } from 'mira-ai';
import CompanyOutreach from './company-outreach';
import { WorkspaceRow } from '@/lib/supabase/orm';
import { User } from '@supabase/supabase-js';
import { uploadUserCSVFile } from '@/lib/supabase/file';
import Papa from 'papaparse';

type EnrichmentMode = 'single' | 'bulk' | 'idle';

/**
 * Company Enrichment UI Component
 *
 * Provides a form to input company URLs and displays comprehensive
 * enriched company data organized into logical sections.
 */
interface CompanyEnrichmentProps {
  workspaces: WorkspaceRow[];
  authUser: User;
}

const CompanyEnrichment = ({ workspaces, authUser }: CompanyEnrichmentProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState('');
  const [progressMessage, setProgressMessage] = useState('');
  const [currentEventType, setCurrentEventType] = useState<ProgressEventType | undefined>();
  const [stepMessages, setStepMessages] = useState<Record<string, string>>({});
  const [executionTime, setExecutionTime] = useState('');
  const [sources, setSources] = useState<string[]>([]);
  const [enrichedCompany, setEnrichedCompany] = useState<EnrichedCompany | null>(null);
  const [companyAnalysis, setCompanyAnalysis] = useState<CompanyAnalysisType | null>(null);
  const [outreachResult, setOutreachResult] = useState<OutreachResult | null>(null);

  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceRow | null>(null);

  // Load workspace from localStorage on component mount
  useEffect(() => {
    const savedWorkspaceId = storage.get('selectedWorkspace');

    if (savedWorkspaceId && workspaces.length > 0) {
      const savedWorkspace = workspaces.find((w) => w.id === savedWorkspaceId);
      if (savedWorkspace && !currentWorkspace) {
        setCurrentWorkspace(savedWorkspace);
      }
    }
  }, [workspaces, currentWorkspace]);

  // Save workspace to localStorage when it changes
  useEffect(() => {
    if (currentWorkspace) {
      storage.set('selectedWorkspace', currentWorkspace.id);
    }
  }, [currentWorkspace]);
  const [enrichmentMode, setEnrichmentMode] = useState<EnrichmentMode>('idle');
  const [totalCompanies, setTotalCompanies] = useState<number>(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>('0:00');
  const [csvResults, setCsvResults] = useState<Record<string, string>[] | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState<string>('');

  // Load CSV results when workspace changes
  useEffect(() => {
    const loadCsvResults = async () => {
      if (!currentWorkspace?.generated_csv_file_url) {
        setCsvResults(null);
        setCsvError('');
        return;
      }

      setCsvLoading(true);
      setCsvError('');

      try {
        const response = await fetch(currentWorkspace.generated_csv_file_url);
        if (!response.ok) {
          throw new Error('Failed to fetch CSV results');
        }

        const csvText = await response.text();

        // Parse CSV using Papa Parse
        const parseResult = await new Promise<Papa.ParseResult<Record<string, string>>>((resolve, reject) => {
          Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              if (results.errors.length > 0) {
                reject(new Error(`CSV parsing errors: ${results.errors.map((e) => e.message).join(', ')}`));
                return;
              }
              resolve(results as Papa.ParseResult<Record<string, string>>);
            },
            error: (error: Error) => {
              reject(new Error(`Failed to parse CSV: ${error.message}`));
            },
          });
        });

        setCsvResults(parseResult.data);
      } catch (error) {
        console.error('Error loading CSV results:', error);
        setCsvError(error instanceof Error ? error.message : 'Failed to load CSV results');
        setCsvResults(null);
      } finally {
        setCsvLoading(false);
      }
    };

    loadCsvResults();
  }, [currentWorkspace?.generated_csv_file_url]);

  // Handles form submission and API call for company enrichment
  const sendEnrichRequest = async (url: string) => {
    if (!currentWorkspace) {
      setApiErrorMessage('Please select a workspace first');
      return;
    }

    // Clear state and set initial progress for single enrichment
    setEnrichmentMode('single');
    setApiErrorMessage('');
    setProgressMessage('Starting enrichment...');
    setCurrentEventType(PROGRESS_EVENTS.CONNECTED);
    setStepMessages({});
    setExecutionTime('');
    setEnrichedCompany(null);
    setCompanyAnalysis(null);
    setOutreachResult(null);
    setCsvResults(null);
    setCsvError('');
    setIsLoading(true);
    setSources([]);

    // Use Server-Sent Events for progress updates
    try {
      const response = await fetch(API_ENDPOINTS.ENRICH, {
        method: 'POST',
        body: JSON.stringify({
          url,
          sources: workspaceToEnrichmentSources(currentWorkspace),
          analysis: workspaceToAnalysis(currentWorkspace),
          outreach: workspaceToOutreach(currentWorkspace),
          dataPoints: currentWorkspace.datapoints,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to start enrichment');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.slice(6));

                // Handle dynamic messages from orchestrator
                if (event.message) {
                  setProgressMessage(event.message);

                  // Store message for the current step so it persists when step completes
                  if (event.type && Object.values(PROGRESS_EVENTS).includes(event.type)) {
                    setStepMessages((prev) => ({
                      ...prev,
                      [event.type]: event.message,
                    }));
                  }
                }

                // Track progress stage (including outreach events)
                const isProgressEvent = Object.values(PROGRESS_EVENTS).includes(event.type);
                if (event.type && isProgressEvent) {
                  setCurrentEventType(event.type as ProgressEventType);
                }

                if (event.type === PROGRESS_EVENTS.ENRICHMENT_COMPLETED && event.data) {
                  // Final result received
                  setEnrichedCompany(event.data.enrichedCompany);
                  setCompanyAnalysis(event.data.companyAnalysis || null);
                  setOutreachResult(event.data.outreach || null);
                  setExecutionTime(event.data.executionTime);
                  setSources(event.data.sources);
                  setIsLoading(false);
                  setProgressMessage('');
                  setCurrentEventType(undefined);
                }

                if (event.type === PROGRESS_EVENTS.ERROR) {
                  setApiErrorMessage(event.message || 'Failed to enrich the company');
                  setIsLoading(false);
                  setProgressMessage('');
                  setCurrentEventType(undefined);
                  setStepMessages({});
                  setEnrichmentMode('idle');
                }
              } catch (error) {
                console.error('[SSE] Error parsing event:', error);
                console.error('[SSE] Problematic line:', line);
                // Try to continue processing other events
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to enrich the company', error);
      setApiErrorMessage('Failed to enrich the company');
      setIsLoading(false);
      setProgressMessage('');
      setCurrentEventType(undefined);
      setStepMessages({});
      setEnrichmentMode('idle');
    }
  };

  // Handles bulk processing of companies from CSV file
  const handleBulkProcess = async (
    file: File,
    mapping: { domain: string | null; companyLinkedInURL: string | null }
  ) => {
    if (!currentWorkspace) {
      setApiErrorMessage('Please select a workspace first');
      return;
    }

    setEnrichmentMode('bulk');
    setIsLoading(true);
    setApiErrorMessage('');
    setStartTime(Date.now()); // Start timer when processing begins
    // Clear results
    setEnrichedCompany(null);
    setCompanyAnalysis(null);
    setOutreachResult(null);
    setCsvResults(null);
    setCsvError('');

    try {
      // Parse CSV to validate and count rows
      const fileContent = await file.text();
      const parseResult = await new Promise<Papa.ParseResult<Record<string, string>>>((resolve, reject) => {
        Papa.parse(fileContent, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors.length > 0) {
              reject(new Error(`CSV parsing errors: ${results.errors.map((e) => e.message).join(', ')}`));
              return;
            }
            resolve(results as Papa.ParseResult<Record<string, string>>);
          },
          error: (error: Error) => {
            reject(new Error(`Failed to parse CSV: ${error.message}`));
          },
        });
      });

      // Validate CSV has required columns
      const headers = parseResult.meta.fields || [];
      if (!headers.includes(mapping.domain!)) {
        throw new Error(`Domain field "${mapping.domain}" not found in CSV headers`);
      }

      const rowCount = parseResult.data.length;

      // Set total companies immediately so the progress display shows the correct count
      setTotalCompanies(rowCount);

      // Upload CSV file directly to storage
      const fileUrl = await uploadUserCSVFile(file, authUser.id);

      // Start bulk enrichment processing
      const response = await fetch('/api/bulk-enrich', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspaceId: currentWorkspace.id,
          csvMapping: mapping,
          csvFileUrl: fileUrl,
          rowCount,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to start bulk enrichment');
      }

      console.log('Bulk enrichment completed:', result);

      // Store total companies
      setTotalCompanies(result.totalCompanies || rowCount);

      // Update workspace with completed results
      if (result.workspace) {
        setCurrentWorkspace(result.workspace);
      }

      // Enrichment is done, show results
      handleBulkComplete();
    } catch (error) {
      console.error('Bulk processing error:', error);
      setApiErrorMessage(error instanceof Error ? error.message : 'Failed to start bulk processing');
      setEnrichmentMode('idle');
      setIsLoading(false);
    }
  };

  // Update elapsed time every second when processing
  useEffect(() => {
    if (startTime && isLoading) {
      const timer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        setElapsedTime(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [startTime, isLoading]);

  // Helper functions for handling bulk progress events
  const handleBulkComplete = () => {
    console.log('Bulk enrichment completed');
    setIsLoading(false);
    setEnrichmentMode('idle');
    setStartTime(null);
    // CSV results will be loaded automatically when workspace updates
  };

  // Determine if we should show progress
  const isShowingProgress = isLoading;

  return (
    <div>
      {/* Company Search Input */}
      <CompanySearchInput
        onSubmit={sendEnrichRequest}
        onBulkProcess={handleBulkProcess}
        isLoading={isLoading}
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        authUser={authUser}
        setCurrentWorkspace={setCurrentWorkspace}
      />

      <div className='mx-auto max-w-4xl px-4'>
        {/* API Error message */}
        {apiErrorMessage && (
          <Alert variant='destructive' className='border-0 mt-8 flex justify-center'>
            <CircleAlert />
            <AlertTitle>{apiErrorMessage}</AlertTitle>
          </Alert>
        )}
        {/* Welcome content - only show when not loading, no enriched data, and no CSV results */}
        {!isShowingProgress && !enrichedCompany && !csvResults && <CompanySearchInfo workspaces={workspaces} />}

        {/* Progress components - conditional based on enrichment mode */}
        {isShowingProgress && currentWorkspace && (
          <>
            {enrichmentMode === 'single' && (
              <CompanyProgress
                progressMessage={progressMessage}
                currentEventType={currentEventType}
                stepMessages={stepMessages}
                sources={workspaceToEnrichmentSources(currentWorkspace)}
                analysis={workspaceToAnalysis(currentWorkspace)}
                outreach={workspaceToOutreach(currentWorkspace)}
              />
            )}
            {enrichmentMode === 'bulk' && (
              <CompanyBulkProgress totalCompanies={totalCompanies} elapsedTime={elapsedTime} />
            )}
          </>
        )}

        {/* Company Bulk Results - show when workspace has results and not loading */}
        {currentWorkspace && !isShowingProgress && !enrichedCompany && (
          <CompanyBulkResult
            csvResults={csvResults}
            csvLoading={csvLoading}
            csvError={csvError}
            workspaceName={currentWorkspace.name}
            csvUrl={currentWorkspace.generated_csv_file_url || undefined}
          />
        )}

        {enrichedCompany && (
          <div className='space-y-8 mt-8 mb-24'>
            {/* Company sources (execution time, sources, social media) */}
            <CompanySources executionTime={executionTime} sources={sources} enrichedCompany={enrichedCompany} />

            {/* Company and criteria analysis */}
            {companyAnalysis && <CompanyAnalysis companyAnalysis={companyAnalysis} />}

            {/* Company Data Points */}
            {enrichedCompany && <CompanyDataPoints enrichedCompany={enrichedCompany} />}

            {/* Outreach Results */}
            {outreachResult && <CompanyOutreach outreach={outreachResult} />}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyEnrichment;
