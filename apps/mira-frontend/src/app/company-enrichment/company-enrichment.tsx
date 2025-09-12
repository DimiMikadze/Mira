'use client';

import React, { useState, useEffect } from 'react';
import type { EnrichedCompany, EnrichmentSources } from 'mira-ai/types';
import { SPECIAL_DATA_POINTS } from 'mira-ai/types';

import CompanyAnalysis from './company-analysis';
import CompanyDataPoints from './company-data-points';
import CompanyProgress from './company-progress';
import CompanySources from './company-sources';
import CompanySearchInput from './company-search-input';
import CompanySearchInfo from './company-search-info';
import { PROGRESS_EVENTS, type ProgressEventType } from 'mira-ai/types';

import type { CompanyAnalysis as CompanyAnalysisType } from 'mira-ai/types';
import { companyCriteriaUtils } from '@/lib/utils';
import { CircleAlert } from 'lucide-react';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { API_ENDPOINTS } from '@/lib/utils';
import { CustomDataPoint } from 'mira-ai';

/**
 * Company Enrichment UI Component
 *
 * Provides a form to input company URLs and displays comprehensive
 * enriched company data organized into logical sections.
 */
const CompanyEnrichment = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState('');
  const [progressMessage, setProgressMessage] = useState('');
  const [currentEventType, setCurrentEventType] = useState<ProgressEventType | undefined>();
  const [stepMessages, setStepMessages] = useState<Record<string, string>>({});
  const [executionTime, setExecutionTime] = useState('');
  const [sources, setSources] = useState<string[]>([]);
  const [enrichedCompany, setEnrichedCompany] = useState<EnrichedCompany | null>(null);
  const [companyAnalysis, setCompanyAnalysis] = useState<CompanyAnalysisType | null>(null);
  const [companyCriteria, setCompanyCriteria] = useState<string>('');
  const [companyCriteriaLoaded, setCompanyCriteriaLoaded] = useState(false);
  const [sourcesConfig] = useState<EnrichmentSources>({
    crawl: true,
    linkedin: true,
    google: true,
    analysis: true,
  });
  const [dataPoints] = useState<CustomDataPoint[]>([
    {
      name: 'name',
      description: 'Official company name as it appears on the website, cleaned and properly capitalized.',
    },
    {
      name: 'overview',
      description:
        'Concise company description capturing their core value proposition, main products/services, and what makes them unique (1-2 sentences). Focus on what they do and for whom, not generic statements.',
    },
    {
      name: 'industry',
      description:
        'Specific industry or sector classification (e.g., "SaaS", "Fintech", "Healthcare Technology", "E-commerce", "Cybersecurity"). Use precise terms rather than broad categories.',
    },
    {
      name: 'headquarters',
      description:
        'Primary headquarters location with city and state/country (e.g., "San Francisco, CA", "London, UK"). Only include "Remote" or "Remote-first" if the company explicitly states they are remote-based.',
    },
    {
      name: 'officeLocations',
      description:
        'Complete list of office locations, regional offices, or geographic presence mentioned (e.g., "New York, London, Singapore", "15 cities across North America"). Include remote work policies if mentioned.',
    },
    {
      name: 'marketPresence',
      description:
        'Geographic markets, regions, or countries where the company operates or serves customers (e.g., "Global", "North America and Europe", "APAC region", "50+ countries"). Focus on customer reach, not just office locations.',
    },
    {
      name: 'missionAndVision',
      description:
        'Exact mission statement, vision, or core values as stated by the company. Include their stated purpose, goals, or principles that guide their business (e.g., "To democratize access to financial services", "Innovation, integrity, customer-first").',
    },
    {
      name: 'targetCustomerSegment',
      description: 'Target audience or customer base (e.g., "Enterprise", "SMBs", "Developers")',
    },
    {
      name: 'toneOfVoice',
      description:
        'Detailed analysis of communication style and brand voice. Include specific characteristics like formality level, personality traits, language choices, and messaging approach. Example: "Professional yet approachable, uses technical language but explains complex concepts clearly, emphasizes innovation and reliability, friendly but authoritative tone"',
    },
    {
      name: 'leadership',
      description:
        'Names and titles of key executives, founders, or leadership team members mentioned (e.g., "John Smith (CEO)", "Jane Doe (CTO and Co-founder)", "Former Google VP leading Product"). Include relevant background when provided.',
    },
    {
      name: 'companySize',
      description:
        'Number of employees or company size range (e.g., "50-200 employees", "500+ team members", "1,000-5,000 employees").',
    },
    {
      name: SPECIAL_DATA_POINTS.LINKEDIN_LOGO_URL,
      description: 'Company Logo. Direct link to the company logo image extracted from LinkedIn profile.',
    },
    {
      name: SPECIAL_DATA_POINTS.LINKEDIN_EMPLOYEES,
      description:
        'LinkedIn Employees. Array of LinkedInEmployee objects with name (required), title (required), profileUrl, photoUrl, and location properties extracted from the LinkedIn company page.',
    },
    {
      name: SPECIAL_DATA_POINTS.LINKEDIN_POSTS,
      description:
        'LinkedIn Posts. Array of LinkedInPost objects with timeAgo (required) and text (required) properties extracted from the LinkedIn company page.',
    },
    { name: 'totalFunding', description: 'Total funding amount raised (e.g., "$50M", "Series B $25M")' },
    {
      name: 'recentFunding',
      description:
        'Latest funding round with amount, series stage, date, and lead investors when mentioned (e.g., "Series B $25M led by Acme Ventures in March 2024", "$5M seed round completed").',
    },
    {
      name: 'investors',
      description:
        'Names of venture capital firms, angel investors, or strategic investors mentioned (e.g., "Sequoia Capital", "Y Combinator", "Google Ventures", "Individual angel investors from Meta"). Include investment stage if specified.',
    },
    {
      name: 'newProductLaunch',
      description:
        'Recently launched products, features, or services with launch dates and key details when available (e.g., "AI Analytics Dashboard launched Q1 2025", "Mobile app beta release", "Enterprise tier announced").',
    },
    {
      name: 'partnerships',
      description:
        'Strategic partnerships, integrations, or collaborations with specific company names and partnership types (e.g., "Integration with Salesforce", "Technology partnership with AWS", "Distribution partnership with Microsoft").',
    },
    {
      name: 'newExecutiveHires',
      description:
        'Recent executive hires, appointments, or leadership changes with names, previous companies, and roles (e.g., "Former Uber VP John Smith joins as Chief Revenue Officer", "New CTO from Google").',
    },
    {
      name: 'openJobs',
      description:
        'Current job openings with specific details about which departments are actively hiring (e.g., "Engineering (5 roles), Sales (3 roles), Marketing (2 roles)"). Include job titles, experience levels, and hiring urgency when available.',
    },
    {
      name: 'acquisitions',
      description:
        'Companies acquired by this company with acquisition details, dates, and strategic rationale when mentioned (e.g., "Acquired DataCorp for $10M to expand analytics capabilities", "Strategic acquisition of AI startup").',
    },
    {
      name: 'expansionPlans',
      description:
        'Announced plans for geographic expansion, market growth, team scaling, or business development (e.g., "Expanding to European markets in 2024", "Hiring 50+ engineers", "Opening new office in Austin").',
    },
    {
      name: 'technologyStack',
      description:
        'Specific technical tools, frameworks, programming languages, or platforms the company explicitly uses or builds with (e.g., "Python", "React", "AWS", "Docker", "PostgreSQL"). Only include concrete technologies, not business concepts or methodologies.',
    },
    {
      name: 'clients',
      description:
        'Specific client names, brand names, or customer segments explicitly mentioned (e.g., "Fortune 500 companies", "Netflix", "healthcare providers", "fintech startups"). Include both named clients and described customer categories.',
    },
    {
      name: 'caseStudies',
      description:
        'Detailed case studies with specific results, metrics, or outcomes (e.g., "Increased conversion by 40% for TechCorp", "Reduced costs by $2M annually for RetailBrand"). Include client names, challenges solved, and quantifiable results when mentioned.',
    },
    {
      name: 'awardsCertifications',
      description:
        'Specific awards, certifications, industry recognition, or accolades with award names and issuing organizations (e.g., "Best SaaS Product 2024 by TechCrunch", "SOC 2 Type II certified", "Inc. 5000 fastest growing companies").',
    },
    {
      name: 'pressMediaMentions',
      description:
        'Media coverage, press mentions, or news articles with publication names and coverage topics (e.g., "Featured in TechCrunch for Series A", "Forbes article on industry innovation", "CNN interview about market trends").',
    },
    {
      name: 'customerTestimonials',
      description:
        'Direct customer quotes, testimonials, or reviews with customer names/companies and specific feedback (e.g., "Increased our efficiency by 50% - John from TechCorp", "Game-changing solution - Fortune 500 client").',
    },
    {
      name: 'upcomingEvents',
      description:
        'Scheduled conferences, webinars, trade shows, or events the company is hosting or participating in, with dates and event names (e.g., "Speaking at TechConf 2025 in May", "Hosting product webinar March 15").',
    },
    {
      name: 'recentEventParticipation',
      description:
        'Recent conferences attended, speaking engagements, or event participation with event names and roles (e.g., "Keynote at SaaS Summit 2024", "Panel discussion at TechWeek", "Booth at CES 2024").',
    },
  ]);

  // Load criteria from localStorage on mount
  useEffect(() => {
    const savedCriteria = companyCriteriaUtils.getCompanyCriteria();
    setCompanyCriteria(savedCriteria);
    setCompanyCriteriaLoaded(true);
  }, []);

  // Callback to update criteria state when it changes
  const handleCriteriaChange = () => {
    const savedCriteria = companyCriteriaUtils.getCompanyCriteria();
    setCompanyCriteria(savedCriteria);
  };

  // Handles form submission and API call for company enrichment
  const sendEnrichRequest = async (url: string) => {
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
      const currentCriteria = companyCriteriaUtils.getCompanyCriteria();

      const response = await fetch(API_ENDPOINTS.ENRICH, {
        method: 'POST',
        body: JSON.stringify({ url, companyCriteria: currentCriteria, sources: sourcesConfig, dataPoints }),
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
        companyCriteria={companyCriteria}
        companyCriteriaLoaded={companyCriteriaLoaded}
        onCompanyCriteriaChange={handleCriteriaChange}
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
        {!isLoading && !enrichedCompany && companyCriteriaLoaded && (
          <CompanySearchInfo companyCriteria={companyCriteria} />
        )}

        {/* Progress component */}
        {isLoading && (
          <CompanyProgress
            progressMessage={progressMessage}
            currentEventType={currentEventType}
            stepMessages={stepMessages}
            sources={sourcesConfig}
            companyCriteria={companyCriteria}
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
