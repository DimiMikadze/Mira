'use client';

import React from 'react';
import type { EnrichedCompany, DataPoint, LinkedInEmployee, LinkedInPost } from 'mira-ai/types';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Link } from 'lucide-react';

interface CompanyDataPointsProps {
  enrichedCompany: EnrichedCompany;
  /** Optional custom data point definitions for display formatting */
  dataPointDefinitions?: Array<{ name: string; description: string }>;
}

/**
 * Company Data Points Component
 *
 * Displays extracted company information
 */
const CompanyDataPoints: React.FC<CompanyDataPointsProps> = ({ enrichedCompany, dataPointDefinitions }) => {
  // Returns color classes based on confidence score (1-5) - same style as fit score
  const getConfidenceColor = (score: number) => {
    if (score >= 5) return { border: 'border-green-600', text: 'text-green-700', bg: 'bg-green-100' }; // Excellent
    if (score >= 4) return { border: 'border-green-400', text: 'text-green-500', bg: 'bg-green-50' }; // Strong
    if (score >= 3) return { border: 'border-yellow-500', text: 'text-yellow-600', bg: 'bg-yellow-50' }; // Moderate
    if (score >= 2) return { border: 'border-orange-500', text: 'text-orange-600', bg: 'bg-orange-50' }; // Weak
    return { border: 'border-red-500', text: 'text-red-600', bg: 'bg-red-50' }; // Poor
  };

  // Returns description for confidence score based on CONFIDENCE_SCORING_GUIDELINES
  const getConfidenceDescription = (score: number) => {
    switch (score) {
      case 5:
        return 'Explicitly stated information';
      case 4:
        return 'Clearly implied information';
      case 3:
        return 'Reasonably inferred information';
      case 2:
        return 'Weakly inferred information';
      case 1:
        return 'Uncertain information';
      default:
        return 'Unknown confidence level';
    }
  };

  // Renders individual data points with confidence scores and source links
  const renderDataPoints = ({ name, dataPoint }: { name: string; dataPoint: DataPoint }) => {
    const confidenceColors = getConfidenceColor(Number(dataPoint.confidenceScore));

    const renderContent = () => {
      // Check if content is a URL pointing to an image
      if (
        typeof dataPoint.content === 'string' &&
        (dataPoint.content.match(/\.(jpg|jpeg|png|gif|svg|webp)(\?.*)?$/i) ||
          dataPoint.content.startsWith('data:image/'))
      ) {
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataPoint.content} width={100} alt={name} className='mt-2 border' />
        );
      }

      // Check if content is structured employee/person data
      if (typeof dataPoint.content === 'string') {
        try {
          const parsed = JSON.parse(dataPoint.content);
          if (
            Array.isArray(parsed) &&
            parsed.length > 0 &&
            parsed[0]?.name &&
            (parsed[0]?.title || parsed[0]?.photoUrl || parsed[0]?.profileUrl)
          ) {
            const people = parsed as LinkedInEmployee[];
            const validPeople = people.filter((person) => person?.name);

            if (validPeople.length === 0) {
              return null;
            }

            return (
              <div className='flex flex-col gap-4 w-full'>
                {validPeople.map((person, idx) => {
                  const key = person.profileUrl || person.name || String(idx);
                  return (
                    <div className='flex items-center' key={key}>
                      {person.photoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={person.photoUrl as string}
                          width={60}
                          alt={`${person.name} photo`}
                          className='mt-2 rounded-full'
                        />
                      )}
                      <div className={person.photoUrl ? 'ml-3' : ''}>
                        {person.profileUrl ? (
                          <a
                            href={person.profileUrl}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='hover:underline hover:decoration-black'
                          >
                            <p className='text-md'>{person.name}</p>
                          </a>
                        ) : (
                          <p className='text-md'>{person.name}</p>
                        )}
                        {person.title && <p className='text-gray-700 text-md'>{person.title}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          }
        } catch {
          // Not structured data, fall through to regular text rendering
        }
      }

      // LinkedIn posts (JSON array with { timeAgo, text })
      try {
        const parsed = typeof dataPoint.content === 'string' ? JSON.parse(dataPoint.content) : null;
        if (
          Array.isArray(parsed) &&
          parsed.length > 0 &&
          parsed.every((p) => typeof p === 'object' && ('timeAgo' in p || 'text' in p))
        ) {
          const posts = (parsed as LinkedInPost[]).filter(
            (p) => p && (p.timeAgo != null || (p.text && String(p.text).trim().length > 0))
          );

          if (posts.length > 0) {
            return (
              <div className='flex flex-col gap-4 w-full'>
                {posts.map((p, i) => (
                  <div key={`${p.timeAgo ?? ''}-${i}`} className='rounded-lg border p-3 bg-white/50'>
                    <div className='mb-2'>
                      <span className='inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-gray-700'>
                        {p.timeAgo ?? '—'}
                      </span>
                    </div>
                    <p className='text-gray-800 text-sm whitespace-pre-wrap'>{p.text ?? ''}</p>
                  </div>
                ))}
              </div>
            );
          }
        }
      } catch {
        // not posts JSON; fall through
      }

      return <p className='text-gray-700 text-md'>{dataPoint.content}</p>;
    };

    const content = renderContent();

    // 🚨 if content is null, render nothing at all
    if (!content) return null;

    return (
      <div className='group pb-2 pt-2 first:pt-0 '>
        <h3 className='whitespace-nowrap text-md font-semibold'>{name}</h3>

        <div className='flex items-start'>
          {content}
          <div className='flex items-center ml-4 invisible group-hover:visible'>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className='ml-4 w-8 h-8 rounded-full border-2 border-gray-300 bg-white flex items-center justify-center hover:border-gray-400 transition-colors'>
                  <a
                    href={dataPoint.source}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='hover:underline flex items-center'
                  >
                    <Link className='w-4 h-4 text-gray-600' />
                  </a>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className='text-xs opacity-80 max-w-xs break-all'>{dataPoint.source}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`ml-2 w-8 h-8 rounded-full border-2 ${confidenceColors.border} ${confidenceColors.bg} flex items-center justify-center`}
                >
                  <div className={`text-sm ${confidenceColors.text}`}>{dataPoint.confidenceScore}</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Confidence: {dataPoint.confidenceScore}/5</p>
                <p className='text-xs opacity-80'>{getConfidenceDescription(Number(dataPoint.confidenceScore))}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    );
  };

  // Prepare data points for rendering
  const dataPoints = React.useMemo(() => {
    const dataPointsArray: Array<{ key: string; dataPoint: DataPoint; displayName: string }> = [];

    Object.entries(enrichedCompany).forEach(([key, dataPoint]) => {
      if (!dataPoint || key === 'socialMediaLinks' || key === 'googleQueries') return; // Skip empty and special fields
      if (Array.isArray(dataPoint)) return; // Skip array values (like googleQueries)

      // Find custom definition for this data point
      const customDef = dataPointDefinitions?.find((def) => def.name === key);

      // Use custom display name or format the key
      const displayName =
        customDef?.description?.split('.')[0] ||
        key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());

      dataPointsArray.push({
        key,
        dataPoint,
        displayName,
      });
    });

    return dataPointsArray;
  }, [enrichedCompany, dataPointDefinitions]);

  return (
    <div className='space-y-6'>
      {dataPoints.map(({ key, dataPoint, displayName }) => {
        return (
          <div key={key}>
            {renderDataPoints({
              name: displayName,
              dataPoint,
            })}
          </div>
        );
      })}
    </div>
  );
};

export default CompanyDataPoints;
