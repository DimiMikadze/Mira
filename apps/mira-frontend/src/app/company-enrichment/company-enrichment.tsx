'use client';

import React, { useState } from 'react';
import type { EnrichedCompany } from 'mira-ai/types';

import CompanyAnalysis from './company-analysis';
import CompanyDataPoints from './company-data-points';
import CompanyProgress from './company-progress';
import CompanySources from './company-sources';
import CompanySearchInput from './company-search-input';
import CompanySearchInfo from './company-search-info';
import { PROGRESS_EVENTS, type ProgressEventType } from 'mira-ai/types';

import type { CompanyAnalysis as CompanyAnalysisType } from 'mira-ai/types';
import { CircleAlert } from 'lucide-react';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { API_ENDPOINTS, workspaceToEnrichmentSources, workspaceToAnalysis } from '@/lib/utils';
import { WorkspaceRow } from '@/lib/supabase/orm';
import { User } from '@supabase/supabase-js';

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

  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceRow | null>(null);

  // Handles form submission and API call for company enrichment
  const sendEnrichRequest = async (url: string) => {
    if (!currentWorkspace) {
      setApiErrorMessage('Please select a workspace first');
      return;
    }

    // Clear state and set initial progress
    setApiErrorMessage('');
    setProgressMessage('Starting enrichment...');
    setCurrentEventType(PROGRESS_EVENTS.CONNECTED);
    setStepMessages({});
    setExecutionTime('');
    setEnrichedCompany(null);
    setCompanyAnalysis(null);
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

                // Track progress stage
                if (event.type && Object.values(PROGRESS_EVENTS).includes(event.type)) {
                  setCurrentEventType(event.type as ProgressEventType);
                }

                if (event.type === PROGRESS_EVENTS.ENRICHMENT_COMPLETED && event.data) {
                  // Final result received
                  setEnrichedCompany(event.data.enrichedCompany);
                  setCompanyAnalysis(event.data.companyAnalysis || null);
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
    }
  };

  return (
    <div>
      {/* Company Search Input */}
      <CompanySearchInput
        onSubmit={sendEnrichRequest}
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
        {/* Welcome content - only show when not loading and no enriched data */}
        {!isLoading && !enrichedCompany && <CompanySearchInfo />}

        {/* Progress component */}
        {isLoading && currentWorkspace && (
          <CompanyProgress
            progressMessage={progressMessage}
            currentEventType={currentEventType}
            stepMessages={stepMessages}
            sources={workspaceToEnrichmentSources(currentWorkspace)}
            analysis={workspaceToAnalysis(currentWorkspace)}
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
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyEnrichment;
