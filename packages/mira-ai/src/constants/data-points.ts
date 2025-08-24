import { EnrichedCompany } from '../types/company.js';
import { PageType } from '../types/agent.js';

// Centralized data point descriptions for LLM
export const DATA_POINT_DESCRIPTIONS: Record<string, string> = {
  // Basics
  name: 'Official company name as it appears on the website, cleaned and properly capitalized.',
  overview:
    'Concise company description capturing their core value proposition, main products/services, and what makes them unique (1-2 sentences). Focus on what they do and for whom, not generic statements.',
  industry:
    'Specific industry or sector classification (e.g., "SaaS", "Fintech", "Healthcare Technology", "E-commerce", "Cybersecurity"). Use precise terms rather than broad categories.',
  headquarters:
    'Primary headquarters location with city and state/country (e.g., "San Francisco, CA", "London, UK"). Only include "Remote" or "Remote-first" if the company explicitly states they are remote-based.',
  officeLocations:
    'Complete list of office locations, regional offices, or geographic presence mentioned (e.g., "New York, London, Singapore", "15 cities across North America"). Include remote work policies if mentioned.',
  marketPresence:
    'Geographic markets, regions, or countries where the company operates or serves customers (e.g., "Global", "North America and Europe", "APAC region", "50+ countries"). Focus on customer reach, not just office locations.',
  missionAndVision:
    'Exact mission statement, vision, or core values as stated by the company. Include their stated purpose, goals, or principles that guide their business (e.g., "To democratize access to financial services", "Innovation, integrity, customer-first").',
  targetCustomerSegment: 'Target audience or customer base (e.g., "Enterprise", "SMBs", "Developers")',
  toneOfVoice:
    'Detailed analysis of communication style and brand voice. Include specific characteristics like formality level, personality traits, language choices, and messaging approach. Example: "Professional yet approachable, uses technical language but explains complex concepts clearly, emphasizes innovation and reliability, friendly but authoritative tone"',
  leadership:
    'Names and titles of key executives, founders, or leadership team members mentioned (e.g., "John Smith (CEO)", "Jane Doe (CTO and Co-founder)", "Former Google VP leading Product"). Include relevant background when provided.',
  companySize:
    'Number of employees or company size range (e.g., "50-200 employees", "500+ team members", "1,000-5,000 employees").',
  logoUrl: 'Company logo URL extracted from LinkedIn profile. Direct link to the company logo image.',
  employees:
    'Array of LinkedInPerson objects with name (required), title (required), profileUrl, photoUrl, and location properties. Extract employee information from the LinkedIn company page.',

  // Growth & Signals
  totalFunding: 'Total funding amount raised (e.g., "$50M", "Series B $25M")',
  recentFunding:
    'Latest funding round with amount, series stage, date, and lead investors when mentioned (e.g., "Series B $25M led by Acme Ventures in March 2024", "$5M seed round completed").',
  investors:
    'Names of venture capital firms, angel investors, or strategic investors mentioned (e.g., "Sequoia Capital", "Y Combinator", "Google Ventures", "Individual angel investors from Meta"). Include investment stage if specified.',
  newProductLaunch:
    'Recently launched products, features, or services with launch dates and key details when available (e.g., "AI Analytics Dashboard launched Q1 2025", "Mobile app beta release", "Enterprise tier announced").',
  partnerships:
    'Strategic partnerships, integrations, or collaborations with specific company names and partnership types (e.g., "Integration with Salesforce", "Technology partnership with AWS", "Distribution partnership with Microsoft").',
  newExecutiveHires:
    'Recent executive hires, appointments, or leadership changes with names, previous companies, and roles (e.g., "Former Uber VP John Smith joins as Chief Revenue Officer", "New CTO from Google").',
  openJobs:
    'Current job openings with specific details about which departments are actively hiring (e.g., "Engineering (5 roles), Sales (3 roles), Marketing (2 roles)"). Include job titles, experience levels, and hiring urgency when available.',
  acquisitions:
    'Companies acquired by this company with acquisition details, dates, and strategic rationale when mentioned (e.g., "Acquired DataCorp for $10M to expand analytics capabilities", "Strategic acquisition of AI startup").',
  expansionPlans:
    'Announced plans for geographic expansion, market growth, team scaling, or business development (e.g., "Expanding to European markets in 2024", "Hiring 50+ engineers", "Opening new office in Austin").',
  technologyStack:
    'Specific technical tools, frameworks, programming languages, or platforms the company explicitly uses or builds with (e.g., "Python", "React", "AWS", "Docker", "PostgreSQL"). Only include concrete technologies, not business concepts or methodologies.',

  // Reputation & Trust
  clients:
    'Specific client names, brand names, or customer segments explicitly mentioned (e.g., "Fortune 500 companies", "Netflix", "healthcare providers", "fintech startups"). Include both named clients and described customer categories.',
  caseStudies:
    'Detailed case studies with specific results, metrics, or outcomes (e.g., "Increased conversion by 40% for TechCorp", "Reduced costs by $2M annually for RetailBrand"). Include client names, challenges solved, and quantifiable results when mentioned.',
  awardsCertifications:
    'Specific awards, certifications, industry recognition, or accolades with award names and issuing organizations (e.g., "Best SaaS Product 2024 by TechCrunch", "SOC 2 Type II certified", "Inc. 5000 fastest growing companies").',
  pressMediaMentions:
    'Media coverage, press mentions, or news articles with publication names and coverage topics (e.g., "Featured in TechCrunch for Series A", "Forbes article on industry innovation", "CNN interview about market trends").',
  customerTestimonials:
    'Direct customer quotes, testimonials, or reviews with customer names/companies and specific feedback (e.g., "Increased our efficiency by 50% - John from TechCorp", "Game-changing solution - Fortune 500 client").',

  // Activity and Events
  upcomingEvents:
    'Scheduled conferences, webinars, trade shows, or events the company is hosting or participating in, with dates and event names (e.g., "Speaking at TechConf 2025 in May", "Hosting product webinar March 15").',
  recentEventParticipation:
    'Recent conferences attended, speaking engagements, or event participation with event names and roles (e.g., "Keynote at SaaS Summit 2024", "Panel discussion at TechWeek", "Booth at CES 2024").',
};

// Common internal page name patterns for identification
export const PAGE_NAME_PATTERNS: Record<PageType, string[]> = {
  landingPage: [],
  about: ['about', 'about-us', 'company', 'who-we-are', 'our-story', 'overview'],
  careers: ['careers', 'jobs', 'join-us', 'work-with-us', 'hiring', 'we-are-hiring'],
  blog: ['blog', 'insights', 'articles', 'stories', 'resources', 'learn'],
  news: ['press', 'media', 'media-center', 'in-the-news', 'newsroom', 'news'],
  clients: ['clients', 'customers', 'our-customers', 'who-we-serve'],
  caseStudies: ['case-studies', 'success-stories', 'testimonials', 'results', 'customer-stories'],
  contact: ['contact', 'contact-us', 'get-in-touch', 'reach-us', 'connect'],
};

// Mapping of which data points to extract from which page types
export const DATA_POINT_PAGE_MAPPING: Record<PageType, (keyof EnrichedCompany)[]> = {
  landingPage: [
    'name',
    'industry',
    'totalFunding',
    'recentFunding',
    'overview',
    'targetCustomerSegment',
    'toneOfVoice',
    'technologyStack',
    'clients',
    'newProductLaunch',
    'partnerships',
    'caseStudies',
    'pressMediaMentions',
    'awardsCertifications',
    'newExecutiveHires',
    'headquarters',
    'leadership',
  ],
  about: [
    'name',
    'overview',
    'industry',
    'headquarters',
    'officeLocations',
    'marketPresence',
    'missionAndVision',
    'leadership',
    'investors',
    'totalFunding',
    'awardsCertifications',
    'targetCustomerSegment',
  ],
  careers: [
    'openJobs',
    'marketPresence',
    'expansionPlans',
    'technologyStack',
    'officeLocations',
    'newExecutiveHires',
    'leadership',
    'headquarters',
  ],
  blog: [
    'newProductLaunch',
    'partnerships',
    'recentEventParticipation',
    'expansionPlans',
    'toneOfVoice',
    'targetCustomerSegment',
    'totalFunding',
    'recentFunding',
    'acquisitions',
    'upcomingEvents',
    'investors',
  ],
  news: [
    'totalFunding',
    'recentFunding',
    'investors',
    'pressMediaMentions',
    'acquisitions',
    'newProductLaunch',
    'partnerships',
    'newExecutiveHires',
    'awardsCertifications',
    'upcomingEvents',
    'recentEventParticipation',
  ],
  clients: ['clients', 'caseStudies', 'customerTestimonials', 'targetCustomerSegment', 'industry', 'partnerships'],
  caseStudies: [
    'caseStudies',
    'customerTestimonials',
    'clients',
    'targetCustomerSegment',
    'industry',
    'technologyStack',
  ],
  contact: ['headquarters', 'officeLocations', 'name', 'marketPresence'],
};

/**
 * Data points that are good candidates to supplement via Google Search
 * when missing or low-confidence after website agents.
 */
export const GOOGLE_SEARCH_DATA_POINTS: ReadonlyArray<keyof EnrichedCompany> = [
  'recentFunding',
  'totalFunding',
  'acquisitions',
  'partnerships',
  'newExecutiveHires',
  'pressMediaMentions',
  'awardsCertifications',
  'newProductLaunch',
];

/**
 * Data points that should be extracted from LinkedIn company pages.
 * LinkedIn is particularly good for employee information, company updates,
 * funding announcements, and professional network insights.
 */
export const LINKEDIN_DATA_POINTS: ReadonlyArray<keyof EnrichedCompany> = [
  'name',
  'industry',
  'headquarters',
  'companySize',
  'logoUrl',
  'employees',
  'totalFunding',
  'recentFunding',
  'investors',
  'newProductLaunch',
  'partnerships',
  'newExecutiveHires',
  'openJobs',
  'acquisitions',
  'expansionPlans',
  'technologyStack',
  'clients',
  'caseStudies',
  'awardsCertifications',
  'pressMediaMentions',
  'targetCustomerSegment',
];
