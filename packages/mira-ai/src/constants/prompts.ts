import { EnrichedCompany } from '../types/company.js';
import { PAGE_NAME_PATTERNS } from './data-points.js';
import type { LinkedInPerson } from '../types/linkedin.js';

/**
 * Helper function to get human-readable description for page types
 */
const getPageTypeDescription = (pageType: string): string => {
  const descriptions: Record<string, string> = {
    about: 'About/Company page',
    careers: 'Careers/Jobs page',
    blog: 'Blog/Insights page',
    news: 'News/Press page',
    clients: 'Clients/Customers page',
    caseStudies: 'Case Studies page',
    contact: 'Contact page',
  };
  return descriptions[pageType] || pageType;
};

/**
 * Reusable confidence scoring guidelines for all prompts
 */
export const CONFIDENCE_SCORING_GUIDELINES = `Confidence Scoring Guidelines:
- 5: Explicitly stated information (e.g., "About [Company Name]", "We are a FinTech company")
- 4: Clearly implied information (e.g., mentioned in multiple places, obvious from context)
- 3: Reasonably inferred information (e.g., can be deduced from product descriptions)
- 2: Weakly inferred information (e.g., suggested by context but not directly stated)
- 1: Uncertain information (e.g., very weak signals, requires significant assumption)

IMPORTANT: Use the full 1-5 confidence scale. Include data points you find evidence for, even with lower confidence scores. The confidence score will help prioritize information during data merging.`;

/**
 * Discovery data points agent instructions
 */
export const DISCOVERY_DATA_POINTS_AGENT_INSTRUCTIONS =
  'Analyze website content and extract company data points with accurate confidence scoring. Focus on content analysis only.';

/**
 * Discovery page data points extraction prompt
 */
export const createDiscoveryDataPointsPrompt = (
  dataPointDescriptions: string,
  finalURL: string,
  content: string,
  metaTitle?: string
) => {
  return `Task:
Extract specific Data Points from the Company's Website Content with high accuracy and appropriate confidence scoring.
Data Point should be explicitly mentioned in the Website Content, do not invent any information.
If the specific data point is not mentioned in the Website Content, do not include it in the output.

Output Format:
You must respond with valid JSON format including ALL requested data point fields. For data points you find, provide the object. For data points you don't find, set to null:
{
    "name" : {
        "content" : "Company Name",
        "confidenceScore" : 5
    },
    "industry" : {
        "content" : "Technology",
        "confidenceScore" : 4
    },
}

${CONFIDENCE_SCORING_GUIDELINES}

Data Points to extract:
${dataPointDescriptions}

Company Website URL: ${finalURL}
${metaTitle ? `\nWebsite Meta Title: ${metaTitle}` : ''}

Company Website Content:
${content}

CRITICAL: 
- You MUST include ALL requested data point fields in your JSON response
- If you find clear evidence for a data point, provide {"content": "...", "confidenceScore": X}
- If you don't find a data point, set it to null
- NEVER use placeholder text like "N/A", "Data not provided", "Not available", etc.
- For company name extraction: The meta title often contains the official company name and should be given high confidence when it clearly indicates the company name

Strict Rules:
- Use ONLY information clearly present in the content
- Do NOT invent or assume information not supported by the content
- Use appropriate confidence scores based on evidence strength - include data points with any level of evidence
- Focus on comprehensive extraction while maintaining accuracy`;
};

/**
 * Discovery internal links agent instructions
 */
export const DISCOVERY_INTERNAL_LINKS_AGENT_INSTRUCTIONS =
  'Extract and categorize internal page links from provided navigation links. Focus on link matching and classification only.';

/**
 * Discovery internal links extraction prompt
 */
export const createDiscoveryInternalLinksPrompt = (finalURL: string, links: Array<{ href: string; text: string }>) => {
  // Generate page types description from constants
  const pageTypesDescription = Object.entries(PAGE_NAME_PATTERNS)
    .filter(([pageType]) => pageType !== 'landingPage') // Skip landingPage
    .map(([pageType, patterns]) => `- ${pageType}: ${getPageTypeDescription(pageType)} (${patterns.join(', ')})`)
    .join('\n');

  return `Task:
Extract and categorize internal page links from the provided website navigation links.
You MUST ONLY use the exact URLs from the Available Website Links list below.
You are NOT allowed to construct, invent, or guess any URLs.

Output Format:
You should respond in valid JSON format:
{
    "about": "https://company.com/about",
    "careers": "https://company.com/jobs"
}

If no matching links are found, return an empty object:
{}

Page Types to Extract:
${pageTypesDescription}

Company Website URL: ${finalURL}

Available Website Links:
${links.map((link) => `- ${link.href} (text: "${link.text}")`).join('\n')}

Strict Rules:
- Use ONLY links from the Available Website Links list above
- Match based on URL path patterns AND link text from the page type descriptions
- Return full URLs (not relative paths)
- Do NOT include page types you did not find matching links for
- Do NOT invent or assume links not present in the list
- Ignore external links (different domains from ${finalURL})
- If no matches are found, return {}
- Be accurate - only include links that clearly match the patterns
- Focus on quality matches over quantity`;
};

/**
 * Internal pages data extraction prompt
 */
export const createInternalPagePrompt = (
  pageType: string,
  keys: string[],
  descriptions: string,
  pageUrl: string,
  content: string
) => {
  return `Task:
Extract the requested Data Points from the ${pageType} page content below.

Output Format:
Return a single JSON object with ALL requested data point fields: ${JSON.stringify(keys)}
For each data point you find, provide an object:
  {
    "content": string (non-empty),
    "confidenceScore": number
  }
For each data point you don't find, set to null.
Do NOT return placeholder values like "N/A", "Data not provided", "Not available", etc.
Do NOT invent information.
CRITICAL: You MUST include ALL requested fields - set unfound data points to null.

${CONFIDENCE_SCORING_GUIDELINES}

Data Points to extract:
${descriptions}

Page URL: ${pageUrl}

Page Content:
${content}

CRITICAL: If you don't find a data point, simply omit it completely from the JSON response.

Strict Rules:
- Use only the provided content.
- Be concise.
- Return valid JSON only.
- Omit any key that is not supported by the content.`.trim();
};

// Internal pages agent instructions
export const INTERNAL_PAGE_AGENT_INSTRUCTIONS =
  'Extract specific data points from the provided page content only. Return strict JSON.';

/**
 * Google Search agent instructions and prompt
 */

export interface GoogleSearchSnippet {
  title: string;
  description: string | null;
  url: string;
  domain: string;
  position: number;
}

export const GOOGLE_SEARCH_AGENT_INSTRUCTIONS =
  'Analyze Google Search snippets (title and description only) to extract requested data points. For each extracted data point, return content, confidenceScore, and the best source URL from the provided snippets. Return strict JSON. Do not invent information beyond snippets.';

export const createGoogleSearchPrompt = (
  dataPointDescriptions: string,
  companyName: string,
  companyDomain: string,
  searchResults: GoogleSearchSnippet[]
) => {
  return `Task:
Analyze Google Search results to extract the requested Data Points for ${companyName}. Use ONLY the information visible in the search results (title and description). Do not invent any information. If a data point is not supported by the snippets, set it to null.

Output Format:
Return a single JSON object including ALL requested data point fields. For each data point you find, provide:
{
  "content": string,
  "confidenceScore": number,
  "source": string (URL found in the matching snippet)
}
For each data point you don't find, set the value to null.

${CONFIDENCE_SCORING_GUIDELINES}

Evidence and Source Selection Rules:
- Prefer first-party sources (domain ends with "${companyDomain}") when present in the results.
- If no first-party source, prefer reputable news/press sources (e.g., TechCrunch, PR Newswire, Business Wire, Reuters, Bloomberg).
- Avoid using aggregators/paywalled sources (e.g., Crunchbase, Tracxn, Latka) as primary evidence from snippets.
- If multiple snippets repeat the same fact, increase confidence, but cite the single best source (first-party > reputable news).
- Prefer more recent information when dates are visible in titles/descriptions.

Data Points to extract:
${dataPointDescriptions}

Company Domain: ${companyDomain}

Available Search Results:
${searchResults
  .map(
    (r, i) =>
      `- [${i + 1}] Title: ${r.title}\n  Description: ${r.description ?? ''}\n  URL: ${r.url}\n  Domain: ${
        r.domain
      }\n  Position: ${r.position}`
  )
  .join('\n')}

Strict Rules:
- Use ONLY the information present in the provided search results (title and description).
- Do NOT browse or assume the page contents beyond the snippet.
- Do NOT invent amounts, dates, or investor names without clear snippet evidence.
- If snippets conflict, choose the most authoritative source and lower confidence accordingly.
- ALWAYS include ALL requested keys in the JSON response and set missing ones to null.
- Return VALID JSON only.`.trim();
};

/**
 * Company Analysis agent instructions and prompt
 */
export const COMPANY_ANALYSIS_AGENT_WITH_COMPANY_CRITERIA_INSTRUCTIONS =
  'Analyze the provided company criteria and enriched company data to produce comprehensive analysis including criteria fit scoring and actionable insights. Return strict JSON only.';

export const COMPANY_ANALYSIS_AGENT_WITHOUT_COMPANY_CRITERIA_INSTRUCTIONS =
  'Analyze the provided enriched company data to produce actionable business insights and executive summary. Return strict JSON only.';

export const createCompanyAnalysisPrompt = (
  companyCriteria: string | undefined,
  enrichedCompany: EnrichedCompany,
  keys: string[]
) => {
  const hasCompanyCriteria = companyCriteria && companyCriteria.trim().length > 0;

  // Base task description
  const taskDescription = hasCompanyCriteria
    ? `Using the Company Criteria and Enriched Company data, generate the following fields:`
    : `Using the Enriched Company data, generate the following fields:`;

  // Base field descriptions (common to both scenarios)
  const baseFieldDescriptions = {
    executiveSummary:
      'an actionable overview that synthesizes and summarizes all provided Enriched Company Data. It should cover all key information in the Enriched Company Data and give a clear, complete picture.',
  };

  // criteria-specific field descriptions
  const criteriaFieldDescriptions = hasCompanyCriteria
    ? {
        FitScore: 'Integer 0-10 based on the rubric below.',
        FitReasoning:
          'brief reasoning for the score grounded in the Company Criteria and evidence from the Enriched Company Data.',
      }
    : {};

  // Build field descriptions list
  const allFieldDescriptions = { ...baseFieldDescriptions, ...criteriaFieldDescriptions };
  const fieldDescriptionsList = Object.entries(allFieldDescriptions)
    .filter(([key]) => keys.includes(key))
    .map(([key, desc]) => `- ${key}: ${desc}`)
    .join('\n');

  // Build type descriptions
  const baseTypes = {
    executiveSummary: 'string',
  };

  const criteriaTypes = hasCompanyCriteria
    ? {
        FitScore: 'number (0-10)',
        FitReasoning: 'string',
      }
    : {};

  const allTypes = { ...baseTypes, ...criteriaTypes };
  const typeDescriptionsList = Object.entries(allTypes)
    .filter(([key]) => keys.includes(key))
    .map(([key, type]) => `- ${key}: ${type}`)
    .join('\n');

  // Criteria-specific sections
  const rubric = hasCompanyCriteria
    ? `
Scoring rubric (0-10):
0-2: Poor fit (industry/size/geography/needs mismatch)
3-4: Weak fit (some overlap, multiple mismatches)
5-6: Moderate fit (some overlap, some mismatches)
7-8: Strong fit (most company criteria met)
9-10: Excellent fit (near-perfect match)
`
    : '';

  const criteriaSection = hasCompanyCriteria
    ? `
Company Criteria:
${companyCriteria}
`
    : '';

  // Base rules with conditional Criteria additions
  const baseRules = [
    'Be specific; avoid generic phrasing.',
    hasCompanyCriteria
      ? 'Base all content on the Criteria and provided company data only.'
      : 'Base all content on the provided company data only.',
    hasCompanyCriteria
      ? 'If evidence is unclear, lower your score and reflect uncertainty in reasoning.'
      : 'Focus on actionable insights that could drive business development opportunities.',
  ];

  const rulesText = baseRules.join('\n- ');

  return `Task:
${taskDescription}
${fieldDescriptionsList}

Output Format:
Return a single JSON object with ALL and ONLY the following fields ${JSON.stringify(keys)}. Types:
${typeDescriptionsList}
${rubric}${criteriaSection}
Enriched Company Data (JSON):
${JSON.stringify(enrichedCompany, null, 2)}

Rules:
- ${rulesText}

CRITICAL:
- You MUST include ALL requested fields and NO extra keys in your JSON response
- Return VALID JSON only (no markdown, comments, or trailing commas)
- Do NOT invent facts beyond the provided inputs
- Keep outputs practical and usable
`;
};

/**
 * LinkedIn agent instructions and prompt
 */
export const LINKEDIN_AGENT_INSTRUCTIONS =
  'Analyze LinkedIn company page content to extract comprehensive company data points with accurate confidence scoring. Focus on extracting missing information from the raw LinkedIn content that may not have been captured by structured selectors.';

export const createLinkedInPrompt = (
  dataPointDescriptions: string,
  linkedInUrl: string,
  linkedInData: {
    name?: string;
    description?: string;
    industry?: string;
    companySize?: string;
    headquarters?: string;
    founded?: string;
    specialties?: string;
    logoUrl?: string;
    employees?: LinkedInPerson[];
    content: string;
  }
) => {
  // Only include structured data that was actually extracted
  const structuredData: string[] = [];

  if (linkedInData.name) structuredData.push(`- Company Name: ${linkedInData.name}`);
  if (linkedInData.description) structuredData.push(`- Description: ${linkedInData.description}`);
  if (linkedInData.industry) structuredData.push(`- Industry: ${linkedInData.industry}`);
  if (linkedInData.companySize) structuredData.push(`- Company Size: ${linkedInData.companySize}`);
  if (linkedInData.headquarters) structuredData.push(`- Headquarters: ${linkedInData.headquarters}`);
  if (linkedInData.founded) structuredData.push(`- Founded: ${linkedInData.founded}`);
  if (linkedInData.specialties) structuredData.push(`- Specialties: ${linkedInData.specialties}`);
  if (linkedInData.logoUrl) structuredData.push(`- Logo URL: ${linkedInData.logoUrl}`);

  const employeeCount = linkedInData.employees?.length || 0;
  const employeeInfo =
    employeeCount > 0 && linkedInData.employees
      ? `\n\nExtracted Employees (${employeeCount} found):\n${linkedInData.employees
          .map((emp) => {
            const parts = [`- Name: ${emp.name}`];
            if (emp.title) parts.push(`  Title: ${emp.title}`);
            if (emp.profileUrl) parts.push(`  LinkedIn Profile: ${emp.profileUrl}`);
            if (emp.photoUrl) parts.push(`  Photo URL: ${emp.photoUrl}`);
            return parts.join('\n');
          })
          .join('\n')}`
      : '';

  const structuredInfo =
    structuredData.length > 0
      ? `\nStructured Data Already Extracted:\n${structuredData.join('\n')}${employeeInfo}`
      : employeeInfo;

  return `Task:
Extract the requested company data points from LinkedIn company page content.

Output Format:
Return a single JSON object including ALL requested data point fields. For each data point you find, provide:
{
  "content": string,
  "confidenceScore": number
}
For each data point you don't find, set to null.

${CONFIDENCE_SCORING_GUIDELINES}

Data Points to extract:
${dataPointDescriptions}

LinkedIn URL: ${linkedInUrl}${structuredInfo}

Raw LinkedIn Content:
${linkedInData.content}

CRITICAL Rules:
- Use ALL available information (structured data + raw content + employee data)
- If data point is NOT in structured data, extract it from raw LinkedIn content
- If data point cannot be found anywhere, return null for that field
- For employees field, format as JSON array with EXACTLY this structure:
  [{"name": "string", "title": "string", "profileUrl": "string", "photoUrl": "string"}]
  Include ALL four fields for each employee: name (required), title, profileUrl, photoUrl
  If any employee field is missing (e.g., no photoUrl found), set that field to null
- ALWAYS include ALL requested fields in JSON response, set missing ones to null
- Return VALID JSON only
- Do NOT invent information not supported by the available data`;
};
