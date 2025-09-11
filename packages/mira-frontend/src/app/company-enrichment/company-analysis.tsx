'use client';

import type { CompanyAnalysis as CompanyAnalysisType, CompanyAnalysisWithCriteria } from 'mira-ai/types';
import { Target, Lightbulb } from 'lucide-react';

interface CompanyAnalysisProps {
  companyAnalysis: CompanyAnalysisType | null;
}

// Type guard to check if the analysis includes criteria data
const hasCriteriaData = (analysis: CompanyAnalysisType): analysis is CompanyAnalysisWithCriteria => {
  return 'FitScore' in analysis && 'FitReasoning' in analysis;
};

/**
 * Company Analysis Component
 *
 * Displays AI-generated company analysis including criteria matching and actionable insights
 */
const CompanyAnalysis: React.FC<CompanyAnalysisProps> = ({ companyAnalysis }) => {
  // Returns color classes based on criteria match score (0-10)
  const getFitScoreColor = (score: number) => {
    if (score >= 9) return { border: 'border-green-600', text: 'text-green-700', bg: 'bg-green-100' }; // Excellent
    if (score >= 7) return { border: 'border-green-400', text: 'text-green-500', bg: 'bg-green-50' }; // Strong
    if (score >= 5) return { border: 'border-yellow-500', text: 'text-yellow-600', bg: 'bg-yellow-50' }; // Moderate
    if (score >= 3) return { border: 'border-orange-500', text: 'text-orange-600', bg: 'bg-orange-50' }; // Weak
    return { border: 'border-red-500', text: 'text-red-600', bg: 'bg-red-50' }; // Poor
  };

  return (
    <div className='space-y-8'>
      {/* criteria Match Analysis Section - Only show if criteria data is available */}
      {companyAnalysis && hasCriteriaData(companyAnalysis) && (
        <div className='border-b border-gray-200'>
          <h3 className='text-lg font-semibold mb-6 flex items-center'>
            <Target className='w-5 h-5 mr-2' />
            Fit Score
          </h3>
          <div className='pb-6 flex flex-col items-start text-left space-y-4'>
            {companyAnalysis.FitScore !== undefined &&
              (() => {
                const colors = getFitScoreColor(companyAnalysis.FitScore);
                return (
                  <div
                    className={`w-24 h-24 rounded-full border-4 ${colors.border} ${colors.bg} flex items-center justify-center`}
                  >
                    <div className={`text-3xl font-bold ${colors.text}`}>{companyAnalysis.FitScore}</div>
                  </div>
                );
              })()}
            {companyAnalysis.FitReasoning && (
              <p className='text-gray-700 text-md whitespace-pre-line '>{companyAnalysis.FitReasoning}</p>
            )}
          </div>
        </div>
      )}

      {/* Actionable Insights Section */}
      {companyAnalysis?.executiveSummary && (
        <div className='border-b border-gray-200'>
          <div className='pb-6'>
            {companyAnalysis?.executiveSummary && (
              <div className='group pb-2 pt-2 first:pt-0'>
                <h3 className='whitespace-nowrap text-md font-semibold'>Executive Summary</h3>
                <div className='flex items-start'>
                  <p className='text-gray-700 text-md'>{companyAnalysis?.executiveSummary}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyAnalysis;
