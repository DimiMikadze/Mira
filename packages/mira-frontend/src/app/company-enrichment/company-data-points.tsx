'use client';

import type { EnrichedCompany, DataPoint, LinkedInPerson } from 'mira-ai/types';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Link, Building2, MapPin, DollarSign, Rocket, Package, Award, Crown, Briefcase, Calendar } from 'lucide-react';

interface CompanyDataPointsProps {
  enrichedCompany: EnrichedCompany;
}

/**
 * Company Data Points Component
 *
 * Displays extracted company information organized into categorized sections
 */
const CompanyDataPoints: React.FC<CompanyDataPointsProps> = ({ enrichedCompany }) => {
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
  const renderDataPoints = ({
    name,
    dataPoint,
    isLogo = false,
    isEmployees = false,
  }: {
    name: string;
    dataPoint: DataPoint;
    isLogo?: boolean;
    isEmployees?: boolean;
  }) => {
    const confidenceColors = getConfidenceColor(Number(dataPoint.confidenceScore));

    const renderContent = () => {
      if (isLogo) {
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataPoint.content} width={100} alt='Company Logo' className='mt-2 border' />
        );
      }

      if (isEmployees) {
        let employees: LinkedInPerson[] = [];
        try {
          employees = JSON.parse(dataPoint.content) as LinkedInPerson[];
        } catch {
          employees = [];
        }

        const validEmployees = Array.isArray(employees) ? employees.filter((e) => e?.name && e?.photoUrl) : [];

        if (validEmployees.length === 0) {
          return null; // 🚨 return null here
        }

        return (
          <div className='flex flex-col gap-4 w-full'>
            {validEmployees.map((employee, idx) => {
              const key = employee.profileUrl || employee.name || String(idx);
              return (
                <div className='flex items-center' key={key}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={employee.photoUrl as string}
                    width={60}
                    alt={`${employee.name} photo`}
                    className='mt-2 rounded-full'
                  />
                  <div className='ml-3'>
                    {employee.profileUrl ? (
                      <a
                        href={employee.profileUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='hover:underline hover:decoration-black'
                      >
                        <p className='text-md'>{employee.name}</p>
                      </a>
                    ) : (
                      <p className='text-md'>{employee.name}</p>
                    )}
                    <p className='text-gray-700 text-md'>{employee.title}</p>
                  </div>
                </div>
              );
            })}
          </div>
        );
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

  return (
    <div className='space-y-8'>
      {/* Basic company information section */}
      {(enrichedCompany.name ||
        enrichedCompany.industry ||
        enrichedCompany.overview ||
        enrichedCompany.missionAndVision ||
        enrichedCompany.toneOfVoice ||
        enrichedCompany.companySize ||
        enrichedCompany.logoUrl ||
        enrichedCompany.employees) && (
        <div className='border-b border-gray-200'>
          <h3 className='text-lg font-semibold mb-6 flex items-center'>
            <Building2 className='w-5 h-5 mr-2' />
            Company Overview
          </h3>
          <div className='pb-6'>
            {enrichedCompany.name && renderDataPoints({ name: 'Name', dataPoint: enrichedCompany.name })}

            {enrichedCompany.industry && renderDataPoints({ name: 'Industry', dataPoint: enrichedCompany.industry })}

            {enrichedCompany.companySize &&
              renderDataPoints({ name: 'Company Size', dataPoint: enrichedCompany.companySize })}

            {enrichedCompany.overview && renderDataPoints({ name: 'Overview', dataPoint: enrichedCompany.overview })}

            {enrichedCompany.missionAndVision &&
              renderDataPoints({ name: 'Mission Statement / Vision', dataPoint: enrichedCompany.missionAndVision })}

            {enrichedCompany.toneOfVoice &&
              renderDataPoints({ name: 'Tone / Writing Style', dataPoint: enrichedCompany.toneOfVoice })}

            {enrichedCompany.logoUrl &&
              renderDataPoints({ name: 'Company Logo', dataPoint: enrichedCompany.logoUrl, isLogo: true })}

            {enrichedCompany.employees &&
              renderDataPoints({ name: 'Employees', dataPoint: enrichedCompany.employees, isEmployees: true })}
          </div>
        </div>
      )}

      {/* Geographic presence and office locations */}
      {(enrichedCompany.headquarters || enrichedCompany.officeLocations || enrichedCompany.marketPresence) && (
        <div className='border-b border-gray-200'>
          <h3 className='text-lg font-semibold mb-6 flex items-center'>
            <MapPin className='w-5 h-5 mr-2' />
            Locations and Operations
          </h3>
          <div className='pb-6'>
            {enrichedCompany.headquarters &&
              renderDataPoints({ name: 'Main Location', dataPoint: enrichedCompany.headquarters })}

            {enrichedCompany.officeLocations &&
              renderDataPoints({ name: 'Office Locations', dataPoint: enrichedCompany.officeLocations })}

            {enrichedCompany.marketPresence &&
              renderDataPoints({ name: 'Presence in regions', dataPoint: enrichedCompany.marketPresence })}
          </div>
        </div>
      )}

      {/* Funding and investment information */}
      {(enrichedCompany.totalFunding || enrichedCompany.recentFunding || enrichedCompany.investors) && (
        <div className='border-b border-gray-200'>
          <h3 className='text-lg font-semibold mb-6 flex items-center'>
            <DollarSign className='w-5 h-5 mr-2' />
            Financials
          </h3>
          <div className='pb-6'>
            {enrichedCompany.totalFunding &&
              renderDataPoints({ name: 'Total Funding', dataPoint: enrichedCompany.totalFunding })}

            {enrichedCompany.recentFunding &&
              renderDataPoints({ name: 'Recent Funding', dataPoint: enrichedCompany.recentFunding })}

            {enrichedCompany.investors && renderDataPoints({ name: 'Investors', dataPoint: enrichedCompany.investors })}
          </div>
        </div>
      )}

      {/* Expansion plans and technology stack */}
      {(enrichedCompany.acquisitions || enrichedCompany.expansionPlans || enrichedCompany.technologyStack) && (
        <div className='border-b border-gray-200'>
          <h3 className='text-lg font-semibold mb-6 flex items-center'>
            <Rocket className='w-5 h-5 mr-2' />
            Growth & Business Development
          </h3>
          <div className='pb-6'>
            {enrichedCompany.acquisitions &&
              renderDataPoints({ name: 'Acquisitions', dataPoint: enrichedCompany.acquisitions })}

            {enrichedCompany.expansionPlans &&
              renderDataPoints({ name: 'Expansion Plans', dataPoint: enrichedCompany.expansionPlans })}

            {enrichedCompany.technologyStack &&
              renderDataPoints({ name: 'Technology Stack', dataPoint: enrichedCompany.technologyStack })}
          </div>
        </div>
      )}

      {/* Product offerings and customer information */}
      {(enrichedCompany.newProductLaunch ||
        enrichedCompany.targetCustomerSegment ||
        enrichedCompany.clients ||
        enrichedCompany.caseStudies ||
        enrichedCompany.customerTestimonials) && (
        <div className='border-b border-gray-200'>
          <h3 className='text-lg font-semibold mb-6 flex items-center'>
            <Package className='w-5 h-5 mr-2' />
            Products and Customers
          </h3>
          <div className='pb-6'>
            {enrichedCompany.newProductLaunch &&
              renderDataPoints({ name: 'New Product(s) Launch', dataPoint: enrichedCompany.newProductLaunch })}

            {enrichedCompany.targetCustomerSegment &&
              renderDataPoints({ name: 'Target Customers', dataPoint: enrichedCompany.targetCustomerSegment })}

            {enrichedCompany.clients && renderDataPoints({ name: 'Clients', dataPoint: enrichedCompany.clients })}

            {enrichedCompany.caseStudies &&
              renderDataPoints({ name: 'Case Studies', dataPoint: enrichedCompany.caseStudies })}

            {enrichedCompany.customerTestimonials &&
              renderDataPoints({ name: 'Customer Testimonials', dataPoint: enrichedCompany.customerTestimonials })}
          </div>
        </div>
      )}

      {/* External relationships and achievements */}
      {(enrichedCompany.partnerships || enrichedCompany.pressMediaMentions || enrichedCompany.awardsCertifications) && (
        <div className='border-b border-gray-200'>
          <h3 className='text-lg font-semibold mb-6 flex items-center'>
            <Award className='w-5 h-5 mr-2' />
            Partnerships and Recognition
          </h3>
          <div className='pb-6'>
            {enrichedCompany.partnerships &&
              renderDataPoints({ name: 'Partnerships', dataPoint: enrichedCompany.partnerships })}

            {enrichedCompany.pressMediaMentions &&
              renderDataPoints({ name: 'Press / Media Mentions', dataPoint: enrichedCompany.pressMediaMentions })}

            {enrichedCompany.awardsCertifications &&
              renderDataPoints({ name: 'Awards / Certifications', dataPoint: enrichedCompany.awardsCertifications })}
          </div>
        </div>
      )}

      {/* Company leadership and hiring information */}
      {(enrichedCompany.leadership || enrichedCompany.newExecutiveHires) && (
        <div className='border-b border-gray-200'>
          <h3 className='text-lg font-semibold mb-6 flex items-center'>
            <Crown className='w-5 h-5 mr-2' />
            Leadership and Team
          </h3>
          <div className='pb-6'>
            {enrichedCompany.leadership &&
              renderDataPoints({ name: 'Founders / Key People', dataPoint: enrichedCompany.leadership })}

            {enrichedCompany.newExecutiveHires &&
              renderDataPoints({ name: 'New Executive Hires', dataPoint: enrichedCompany.newExecutiveHires })}
          </div>
        </div>
      )}

      {/* Open positions and hiring */}
      {enrichedCompany.openJobs && (
        <div className='border-b border-gray-200'>
          <h3 className='text-lg font-semibold mb-6 flex items-center'>
            <Briefcase className='w-5 h-5 mr-2' />
            Careers
          </h3>
          <div className='pb-6'>
            {enrichedCompany.openJobs && renderDataPoints({ name: 'Open Jobs', dataPoint: enrichedCompany.openJobs })}
          </div>
        </div>
      )}

      {/* Conference participation and events */}
      {(enrichedCompany.upcomingEvents || enrichedCompany.recentEventParticipation) && (
        <div>
          <h3 className='text-lg font-semibold mb-6 flex items-center'>
            <Calendar className='w-5 h-5 mr-2' />
            Events
          </h3>
          <div className='pb-6'>
            {enrichedCompany.upcomingEvents &&
              renderDataPoints({ name: 'Upcoming Events', dataPoint: enrichedCompany.upcomingEvents })}

            {enrichedCompany.recentEventParticipation &&
              renderDataPoints({
                name: 'Recent Event Participation',
                dataPoint: enrichedCompany.recentEventParticipation,
              })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyDataPoints;
