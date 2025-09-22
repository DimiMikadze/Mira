'use client';

import React, { useState } from 'react';
import { Loader2, Download, FileText, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { EnrichedCompany, CompanyAnalysis as CompanyAnalysisType } from 'mira-ai/types';
import type { OutreachResult } from 'mira-ai';
import CompanyAnalysis from './company-analysis';
import CompanyDataPoints from './company-data-points';
import CompanyOutreach from './company-outreach';
import CompanySources from './company-sources';

interface CompanyBulkResultProps {
  csvResults: Record<string, string>[] | null;
  csvLoading: boolean;
  csvError: string;
  workspaceName: string;
  csvUrl?: string;
}

const CompanyBulkResult = ({ csvResults, csvLoading, csvError, workspaceName, csvUrl }: CompanyBulkResultProps) => {
  const [selectedCompany, setSelectedCompany] = useState<Record<string, string> | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string>('');
  const [companyDetails, setCompanyDetails] = useState<{
    enrichedCompany: EnrichedCompany | null;
    companyAnalysis: CompanyAnalysisType | null;
    outreachResult: OutreachResult | null;
    executionTime: string;
    sources: string[];
  } | null>(null);

  // Load detailed company information from CSV fields
  const loadCompanyDetails = (company: Record<string, string>) => {
    const domain = company.Domain || company.domain;
    if (!domain) {
      setDetailsError('No domain found for this company');
      return;
    }

    setDetailsLoading(true);
    setDetailsError('');
    setSelectedCompany(company);

    // Transform CSV data into component-compatible format
    setTimeout(() => {
      try {
        // Create enriched company data from CSV fields (EnrichedCompany is a record type)
        const enrichedCompany: EnrichedCompany = {};

        // Add all CSV fields as DataPoints
        Object.entries(company).forEach(([key, value]) => {
          if (value && value.trim() !== '' && key !== 'status') {
            enrichedCompany[key] = {
              content: value,
              confidenceScore: 3, // Default confidence
              source: 'bulk_csv',
            };
          }
        });

        // Add social media links if available
        const socialLinks: string[] = [];
        if (company.LinkedIn || company.linkedin) socialLinks.push(company.LinkedIn || company.linkedin);
        if (company.Twitter || company.twitter) socialLinks.push(company.Twitter || company.twitter);
        if (company.Facebook || company.facebook) socialLinks.push(company.Facebook || company.facebook);
        if (socialLinks.length > 0) {
          enrichedCompany.socialMediaLinks = socialLinks;
        }

        // Create company analysis if we have relevant data
        const companyAnalysis: CompanyAnalysisType | null =
          company.Analysis || company.analysis
            ? {
                executiveSummary: company.Analysis || company.analysis || '',
                ...(company.FitScore || company.fitScore
                  ? {
                      FitScore: parseInt(company.FitScore || company.fitScore) || 0,
                      FitReasoning: company.FitReasoning || company.fitReasoning || 'Score from bulk processing',
                    }
                  : {}),
              }
            : null;

        // Create outreach result only if we have actual data (no fallbacks at all)
        const outreachResult: OutreachResult | null = (() => {
          const result: OutreachResult = {};

          // Only add LinkedIn outreach if we have ALL required data
          if (
            company.linkedInConnectionNote &&
            company.linkedInAcceptanceMessage &&
            company.linkedInSubject &&
            company.linkedInMessage
          ) {
            result.linkedin = {
              connection_note: company.linkedInConnectionNote,
              acceptance_message: company.linkedInAcceptanceMessage,
              inmail_subject: company.linkedInSubject,
              inmail_message: company.linkedInMessage,
            };
          }

          // Only add email outreach if we have ALL required data
          if (company.emailSubject && company.emailMessage && company.emailFollowUp) {
            result.email = {
              email_subject: company.emailSubject,
              email_message: company.emailMessage,
              email_follow_up_message: company.emailFollowUp,
            };
          }

          // Return null if no complete outreach data found
          return result.linkedin || result.email ? result : null;
        })();

        setCompanyDetails({
          enrichedCompany,
          companyAnalysis,
          outreachResult,
          executionTime: company.ExecutionTime || company.executionTime || '0:00',
          sources: (company.Sources || company.sources || 'website').split(',').map((s) => s.trim()),
        });
      } catch (error) {
        console.error('Error processing company data:', error);
        setDetailsError('Failed to process company data');
      }
      setDetailsLoading(false);
    }, 100); // Minimal delay for UX
  };

  const handleBack = () => {
    setSelectedCompany(null);
    setCompanyDetails(null);
    setDetailsError('');
  };

  const handleDownload = () => {
    if (csvUrl) {
      window.open(csvUrl, '_blank');
    }
  };

  if (csvLoading) {
    return (
      <div className='mt-8'>
        <div className='flex items-center justify-center space-x-2 py-8'>
          <Loader2 className='w-5 h-5 animate-spin text-blue-500' />
          <span className='text-gray-600'>Loading bulk results...</span>
        </div>
      </div>
    );
  }

  if (csvError) {
    return (
      <div className='mt-8'>
        <Alert variant='destructive'>
          <XCircle className='h-4 w-4' />
          <AlertTitle>Failed to Load Results</AlertTitle>
          <AlertDescription>{csvError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!csvResults || csvResults.length === 0) {
    return null;
  }

  const successCount = csvResults.filter((row) => row.status === 'success').length;
  const failedCount = csvResults.filter((row) => row.status === 'failed').length;

  // Show detailed view if a company is selected
  if (selectedCompany) {
    return (
      <div className='mt-8 mb-24'>
        {/* Back Navigation */}
        <div className='mb-6'>
          <Button onClick={handleBack} variant='ghost' size='sm' className='mb-4 cursor-pointer'>
            <ArrowLeft className='w-4 h-4 mr-2' />
            Back to Results
          </Button>
          <div className='flex items-center space-x-3'>
            <FileText className='w-6 h-6 text-blue-500' />
            <div>
              <h2 className='text-xl font-semibold text-gray-900'>
                {selectedCompany.Name || selectedCompany.name || 'Company Details'}
              </h2>
              <p className='text-sm text-gray-600'>
                Domain: <span className='font-medium'>{selectedCompany.Domain || selectedCompany.domain}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {detailsLoading && (
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='w-8 h-8 animate-spin text-blue-500' />
            <span className='ml-3 text-gray-600'>Loading company details...</span>
          </div>
        )}

        {/* Error State */}
        {detailsError && (
          <Alert variant='destructive' className='mb-6'>
            <XCircle className='h-4 w-4' />
            <AlertTitle>Failed to Load Details</AlertTitle>
            <AlertDescription>{detailsError}</AlertDescription>
          </Alert>
        )}

        {/* Company Details using existing components */}
        {companyDetails && !detailsLoading && (
          <div className='space-y-8'>
            {/* Company Sources */}
            {companyDetails.enrichedCompany && (
              <CompanySources
                executionTime={companyDetails.executionTime}
                sources={companyDetails.sources}
                enrichedCompany={companyDetails.enrichedCompany}
              />
            )}

            {/* Company Analysis */}
            {companyDetails.companyAnalysis && <CompanyAnalysis companyAnalysis={companyDetails.companyAnalysis} />}

            {/* Company Data Points */}
            {companyDetails.enrichedCompany && <CompanyDataPoints enrichedCompany={companyDetails.enrichedCompany} />}

            {/* Company Outreach */}
            {companyDetails.outreachResult && <CompanyOutreach outreach={companyDetails.outreachResult} />}

            {/* Fallback: Show raw CSV data if no structured data available */}
            {!companyDetails.enrichedCompany && selectedCompany && (
              <div className='bg-white rounded-lg border overflow-hidden'>
                <div className='px-6 py-4 border-b bg-gray-50'>
                  <h3 className='text-lg font-medium text-gray-900'>Raw Data</h3>
                  <p className='text-sm text-gray-600'>Available fields from CSV</p>
                </div>
                <div className='divide-y divide-gray-200'>
                  {Object.entries(selectedCompany).map(([key, value]) => {
                    if (!value || value.trim() === '') return null;

                    return (
                      <div key={key} className='px-6 py-4'>
                        <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
                          <dt className='text-sm font-medium text-gray-900 sm:w-1/3'>
                            {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                          </dt>
                          <dd className='text-sm text-gray-700 sm:w-2/3 break-words'>{value}</dd>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Show list view
  return (
    <div className='mt-8 mb-24'>
      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <div className='flex items-center space-x-3'>
          <FileText className='w-6 h-6 text-blue-500' />
          <div>
            <p className='text-sm text-gray-600'>
              Workspace: <span className='font-medium'>{workspaceName}</span>
            </p>
          </div>
        </div>
        {csvUrl && (
          <Button onClick={handleDownload} size='sm' className='cursor-pointer'>
            <Download className='w-4 h-4 mr-2' />
            Download CSV
          </Button>
        )}
      </div>

      {/* Summary Stats */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'>
        <div className='bg-gray-50 rounded-lg p-4'>
          <div className='flex items-center space-x-2'>
            <FileText className='w-5 h-5 text-gray-500' />
            <span className='text-sm text-gray-600'>Total Companies</span>
          </div>
          <div className='text-2xl font-semibold text-gray-900 mt-1'>{csvResults.length}</div>
        </div>
        <div className='bg-green-50 rounded-lg p-4'>
          <div className='flex items-center space-x-2'>
            <CheckCircle className='w-5 h-5 text-green-500' />
            <span className='text-sm text-green-600'>Successful</span>
          </div>
          <div className='text-2xl font-semibold text-green-700 mt-1'>{successCount}</div>
        </div>
        <div className='bg-red-50 rounded-lg p-4'>
          <div className='flex items-center space-x-2'>
            <XCircle className='w-5 h-5 text-red-500' />
            <span className='text-sm text-red-600'>Failed</span>
          </div>
          <div className='text-2xl font-semibold text-red-700 mt-1'>{failedCount}</div>
        </div>
      </div>

      {/* Company List - Only Domain Names */}
      <div className='bg-white rounded-lg border overflow-hidden'>
        <div className='px-6 py-4 border-b bg-gray-50'>
          <h3 className='text-lg font-medium text-gray-900'>Companies</h3>
          <p className='text-sm text-gray-600'>Click on a domain to view detailed information</p>
        </div>
        <div className='divide-y divide-gray-200'>
          {csvResults.map((company, index) => {
            const domain = company.Domain || company.domain;
            const name = company.Name || company.name || domain;
            const status = company.status;

            return (
              <div
                key={index}
                onClick={() => loadCompanyDetails(company)}
                className='px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors'
              >
                <div className='flex items-center justify-between'>
                  <div className='flex-1'>
                    <div className='flex items-center space-x-3'>
                      <div>
                        <p className='text-sm font-medium text-gray-900'>{name}</p>
                        <p className='text-sm text-blue-600 hover:text-blue-800'>{domain}</p>
                      </div>
                    </div>
                  </div>
                  <div className='flex items-center space-x-2'>
                    {status === 'success' ? (
                      <div className='flex items-center space-x-1 text-green-700'>
                        <CheckCircle className='w-4 h-4' />
                        <span className='text-sm font-medium'>Success</span>
                      </div>
                    ) : (
                      <div className='flex items-center space-x-1 text-red-700'>
                        <XCircle className='w-4 h-4' />
                        <span className='text-sm font-medium'>Failed</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className='mt-4 text-xs text-gray-500 text-center'>
        Showing {csvResults.length} companies • Success rate:{' '}
        {csvResults.length > 0 ? Math.round((successCount / csvResults.length) * 100) : 0}%
      </div>
    </div>
  );
};

export default CompanyBulkResult;
