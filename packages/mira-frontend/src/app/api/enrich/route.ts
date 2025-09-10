import { NextRequest } from 'next/server';
import { researchCompany, PROGRESS_EVENTS } from 'mira-ai';

export const dynamic = 'force-dynamic';

/**
 * Company Enrichment API Endpoint
 *
 * Analyzes a company website using AI agents to extract comprehensive business information.
 * Returns Server-Sent Events with real-time progress updates during enrichment.
 */
export async function POST(request: NextRequest) {
  try {
    const { url, companyCriteria, sources } = await request.json();

    if (!url) {
      return new Response('URL is required', { status: 400 });
    }

    // Validate required environment variables early
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY environment variable is not configured');
      return new Response('OPENAI_API_KEY environment variable is not configured', { status: 500 });
    }

    if (!process.env.SCRAPING_BEE_API_KEY) {
      console.error('SCRAPING_BEE_API_KEY environment variable is not configured');
      return new Response('SCRAPING_BEE_API_KEY environment variable is not configured', { status: 500 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // Helper function to send SSE events
        const sendEvent = (type: string, message?: string, data?: unknown) => {
          const event = { type, message, data };
          const eventData = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(eventData));
        };

        try {
          // Send initial connection event
          sendEvent(PROGRESS_EVENTS.CONNECTED, 'Connecting to server...');

          // Create progress callback for orchestrator
          const onProgress = (type: string, message?: string) => {
            sendEvent(type, message);
          };

          // Prepare API configuration
          const config = {
            apiKeys: {
              openaiApiKey: process.env.OPENAI_API_KEY!,
              scrapingBeeApiKey: process.env.SCRAPING_BEE_API_KEY!,
            },
          };

          // Default enrichment configuration with all available data points
          const enrichmentConfig = {
            dataPoints: [
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
                name: 'logoUrl',
                description: 'Company logo URL extracted from LinkedIn profile. Direct link to the company logo image.',
              },
              {
                name: 'employees',
                description:
                  'Array of LinkedInPerson objects with name (required), title (required), profileUrl, photoUrl, and location properties. Extract employee information from the LinkedIn company page.',
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
            ],
            sources: {
              crawl: sources?.crawl,
              linkedin: sources?.linkedin,
              google: sources?.google,
              analysis: sources?.analysis,
            },
          };

          // Run enrichment with progress callback
          const result = await researchCompany(url, config, {
            companyCriteria,
            onProgress,
            enrichmentConfig,
          });

          // Send final result - message will come from orchestrator
          sendEvent(PROGRESS_EVENTS.ENRICHMENT_COMPLETED, undefined, result);

          controller.close();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
          sendEvent(PROGRESS_EVENTS.ERROR, errorMessage);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error in enrich API:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
