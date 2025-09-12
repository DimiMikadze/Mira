import { ScrapingBeeClient } from 'scrapingbee';
import { JSDOM, VirtualConsole } from 'jsdom';
import type { LinkedInCompanyData, LinkedInScrapingResult, LinkedInPerson } from '../types/linkedin.js';

const scrapingBeeClient = new ScrapingBeeClient(process.env.SCRAPING_BEE_API_KEY!);

/**
 * Validates if the URL is a LinkedIn company page
 */
const isValidLinkedInCompanyUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes('linkedin.com') && (url.includes('/company/') || url.includes('/school/'));
  } catch {
    return false;
  }
};

/**
 * Fetches LinkedIn company page using ScrapingBee
 */
const fetchLinkedInPage = async (url: string) => {
  const scrapingParams = {
    render_js: true,
    wait_browser: 'networkidle2' as const,
    wait: 2000,
    block_ads: true,
    block_resources: false, // Keep images for logo/photos
    timeout: 30000,
    country_code: 'us',
  };

  try {
    const response = await scrapingBeeClient.get({
      url: url,
      params: scrapingParams,
    });

    return response;
  } catch (error) {
    // Try fallback with minimal configuration
    try {
      const fallbackParams = {
        render_js: false, // Disable JS rendering
        block_ads: false,
        timeout: 15000,
      };

      const fallbackResponse = await scrapingBeeClient.get({
        url: url,
        params: fallbackParams,
      });

      return fallbackResponse;
    } catch {
      throw error; // Throw original error
    }
  }
};

/**
 * Extracts logo URL from the page using robust LinkedIn selectors
 */
const extractLogoUrl = (document: Document): string | undefined => {
  // Primary: Meta tags (most reliable)
  const metaSelectors = ['meta[property="og:image"]', 'meta[name="twitter:image"]'];

  for (const selector of metaSelectors) {
    const metaElement = document.querySelector(selector);
    if (metaElement) {
      const logoUrl = metaElement.getAttribute('content');
      if (logoUrl && logoUrl.startsWith('http')) {
        return logoUrl;
      }
    }
  }

  // Fallback: DOM selectors
  const domSelectors = ['.org-top-card-primary-content img[alt][src]', '.org-top-card-summary__logo img'];

  for (const selector of domSelectors) {
    const logoElement = document.querySelector(selector);
    if (logoElement) {
      const logoUrl = logoElement.getAttribute('src');
      if (logoUrl && logoUrl.startsWith('http')) {
        return logoUrl;
      }
    }
  }

  // Check JSON-LD structured data
  try {
    const scriptElements = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scriptElements) {
      const jsonData = JSON.parse(script.textContent || '');
      if (jsonData['@type'] === 'Organization' && jsonData.logo) {
        return jsonData.logo;
      }
    }
  } catch {
    // Ignore JSON parsing errors
  }

  return undefined;
};

/**
 * Extracts complete employee information from the main company page using robust LinkedIn selectors
 */
const extractEmployeeInfo = (document: Document): LinkedInPerson[] => {
  const employees: LinkedInPerson[] = [];

  // Find the employee widget section that contains employee previews
  let employeeWidget: Element | null = null;

  try {
    // Try modern :has() selector first
    employeeWidget = document.querySelector('section:has(a[href*="/in/"])');
  } catch {
    // :has() not supported, use fallback
  }

  // Fallback: find sections with employee profile links
  if (!employeeWidget) {
    const sections = document.querySelectorAll('section');
    for (const section of sections) {
      if (section.querySelector('a[href*="/in/"]')) {
        employeeWidget = section;
        break;
      }
    }
  }

  if (!employeeWidget) {
    return employees;
  }

  // Get all employee cards (profile links)
  const employeeCards = employeeWidget.querySelectorAll('a[href*="/in/"]');

  employeeCards.forEach((card) => {
    try {
      const employee: LinkedInPerson = {
        name: '',
        title: '',
      };

      // Extract profile URL
      const profileUrl = card.getAttribute('href');
      if (profileUrl) {
        employee.profileUrl = profileUrl.startsWith('http') ? profileUrl : `https://linkedin.com${profileUrl}`;
      }

      // Extract profile photo (try multiple attributes for lazy loading)
      const photoSelectors = [
        'img[alt][src]',
        'img[alt][data-delayed-url]',
        'img[alt][data-li-src]',
        'img[alt][srcset]',
      ];

      let photoUrl: string | null = null;
      for (const selector of photoSelectors) {
        const photoEl = card.querySelector(selector);
        if (photoEl) {
          photoUrl =
            photoEl.getAttribute('src') ||
            photoEl.getAttribute('data-delayed-url') ||
            photoEl.getAttribute('data-li-src') ||
            photoEl.getAttribute('srcset')?.split(/\s|,/)[0] ||
            null;

          if (photoUrl && photoUrl.startsWith('http')) {
            employee.photoUrl = photoUrl;
            break;
          }
        }
      }

      // Extract all text content and parse name/title from it
      const fullText = card.textContent?.trim() || '';

      if (fullText) {
        // LinkedIn employee cards often have format:
        // "Name\n\nTitle at Company" or "Name\nTitle at Company"
        // Sometimes with lots of whitespace: "Ed Anuff\n\n      \n          \n\n VP Data & AI..."

        // Clean up excessive whitespace first
        const cleanedText = fullText
          .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
          .trim();

        // Try to split name from title using common job title indicators
        const titleIndicators =
          /\b(VP|CEO|CTO|CFO|COO|Director|Manager|Engineer|Developer|Lead|Senior|Principal|Analyst|Specialist|Coordinator|Head|Chief|President|Founder)\b/i;
        const atPattern = / at /i;

        let namepart = '';
        let titlepart = '';

        // Look for job title indicators or "at Company"
        if (titleIndicators.test(cleanedText)) {
          const titleMatch = cleanedText.match(titleIndicators);
          if (titleMatch && titleMatch.index !== undefined) {
            // Split at the job title indicator
            namepart = cleanedText.substring(0, titleMatch.index).trim();
            titlepart = cleanedText.substring(titleMatch.index).trim();
          }
        } else if (atPattern.test(cleanedText)) {
          // Split at " at " pattern
          const atMatch = cleanedText.match(atPattern);
          if (atMatch && atMatch.index !== undefined) {
            // Find start of title (work backwards from "at")
            const beforeAt = cleanedText.substring(0, atMatch.index);
            const words = beforeAt.split(' ');
            // Assume name is first 2-3 words, rest is title
            if (words.length >= 2) {
              namepart = words.slice(0, 2).join(' ');
              titlepart = cleanedText.substring(namepart.length).trim();
            } else {
              namepart = beforeAt.trim();
              titlepart = cleanedText.substring(namepart.length).trim();
            }
          }
        } else {
          // Fallback: assume first 2 words are name, rest is title
          const words = cleanedText.split(' ');
          if (words.length >= 3) {
            namepart = words.slice(0, 2).join(' ');
            titlepart = words.slice(2).join(' ');
          } else {
            namepart = cleanedText;
            titlepart = '';
          }
        }

        employee.name = namepart || cleanedText;
        employee.title = titlepart;
      }

      // Only add employee if we have at least a name or profile URL
      if (employee.name || employee.profileUrl) {
        employees.push(employee);
      }
    } catch {
      // Ignore individual employee extraction errors
    }
  });

  return employees;
};

/**
 * Extracts structured company information using correct LinkedIn selectors
 * This data will be included in the content for LLM processing
 */
const extractStructuredCompanyInfo = (
  document: Document
): {
  name?: string;
  description?: string;
  industry?: string;
  companySize?: string;
  headquarters?: string;
  founded?: string;
  specialties?: string;
} => {
  const companyInfo: {
    name?: string;
    description?: string;
    industry?: string;
    companySize?: string;
    headquarters?: string;
    founded?: string;
    specialties?: string;
  } = {};

  // Company Name
  const nameElement = document.querySelector('h1.org-top-card-summary__title');
  if (nameElement) {
    companyInfo.name = nameElement.textContent?.trim() || '';
  }

  // About/Description
  const aboutElement = document.querySelector('section.org-about-module p');
  if (aboutElement) {
    companyInfo.description = aboutElement.textContent?.trim() || '';
  }

  // Extract key fields using dt/dd pairs
  const dtElements = document.querySelectorAll('dt');

  for (const dt of dtElements) {
    const dtText = dt.textContent?.trim() || '';
    const dd = dt.nextElementSibling;

    if (dd && dd.tagName === 'DD') {
      if (dtText.includes('Industry')) {
        companyInfo.industry = dd.textContent?.trim() || '';
      } else if (dtText.includes('Company size')) {
        companyInfo.companySize = dd.textContent?.trim() || '';
      } else if (dtText.includes('Headquarters')) {
        companyInfo.headquarters = dd.textContent?.trim() || '';
      } else if (dtText.includes('Founded')) {
        companyInfo.founded = dd.textContent?.trim() || '';
      } else if (dtText.includes('Specialties')) {
        companyInfo.specialties = dd.textContent?.trim() || '';
      }
    }
  }

  // Extract from meta tags as fallback
  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
  const ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content');

  if (ogTitle && !companyInfo.name) {
    companyInfo.name = ogTitle.replace(' | LinkedIn', '').trim();
  }

  if (ogDescription && !companyInfo.description) {
    companyInfo.description = ogDescription;
  }

  return companyInfo;
};

/**
 * Comprehensive text cleaning optimized for LinkedIn content
 */
const cleanLinkedInContent = (rawText: string): string => {
  return (
    rawText
      // Remove zero-width and invisible Unicode characters
      .replace(/[\u200B-\u200D\uFEFF\u2060-\u206F\u2028\u2029]/g, '')
      // Remove other problematic Unicode ranges
      .replace(/[\u00A0\u1680\u180E\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
      // Remove directional marks and other formatting characters
      .replace(/[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
      // Normalize whitespace (collapse multiple spaces, tabs, newlines)
      .replace(/\s+/g, ' ')
      // Remove LinkedIn-specific noise
      .replace(/\b(Sign in|Join now|Follow|Connect|Message|LinkedIn|Share|Like|Comment)\b/gi, '')
      // Remove navigation noise
      .replace(/\b(Home|Jobs|My Network|Messaging|Notifications|Me|Work|Try Premium)\b/gi, '')
      // Remove cookie/privacy noise
      .replace(/\b(Accept|Cookie|Privacy Policy|Terms|Service)\b/gi, '')
      // Clean up excessive punctuation
      .replace(/\.{3,}/g, '...')
      .replace(/-{3,}/g, '---')
      .trim()
  );
};

/**
 * Extracts recent company posts (timeAgo like "2w" and text content)
 */
const extractCompanyPosts = (
  document: Document,
  cleanFn: (s: string) => string
): Array<{ timeAgo: string; text: string }> => {
  const results: Array<{ timeAgo: string; text: string }> = [];

  const postItems = document.querySelectorAll(
    [
      'ul.updates__list > li',
      'li[data-test-id="main-feed-activity-card"]',
      'article[data-test-id="main-feed-activity-card"]',
    ].join(',')
  );

  postItems.forEach((post) => {
    try {
      // TimeAgo (e.g., "2w", "3d", "1mo")
      const timeEl =
        post.querySelector('div[data-test-id="main-feed-activity-card__entity-lockup"] time') ||
        post.querySelector('time');

      let rawTimeAgo = timeEl ? timeEl.textContent || '' : '';
      rawTimeAgo = rawTimeAgo
        .replace(/\s+/g, ' ') // collapse newlines/spaces
        .replace(/\bEdited\b/i, '') // drop "Edited"
        .trim();

      const timeAgo = rawTimeAgo || null;

      // Post text content
      const contentEl =
        post.querySelector('p[data-test-id="main-feed-activity-card__commentary"]') ||
        post.querySelector('div[data-test-id="main-feed-activity-card__commentary"] p') ||
        post.querySelector('[data-test-id="feed-shared-update-v2__commentary"]') ||
        post.querySelector('div.update-components-text, div.feed-shared-update-v2__description, p');

      let rawText = contentEl ? contentEl.textContent || '' : '';
      rawText = cleanFn(rawText);

      const text = rawText?.trim() || null;

      // Only push if BOTH timeAgo and text exist
      if (timeAgo && text) {
        results.push({ timeAgo, text });
      }
    } catch {
      // ignore individual post extraction errors
    }
  });

  // Deduplicate and cap to first 5 posts
  const seen = new Set<string>();
  const unique = results.filter((p) => {
    const key = `${p.timeAgo}::${p.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique.slice(0, 5);
};

/**
 * Processes HTML content to extract clean text and essential images
 */
const processLinkedInContent = (rawHtml: string): LinkedInCompanyData => {
  // Handle extremely large HTML files by truncating
  const MAX_HTML_BYTES = 2_000_000;
  let truncatedHtml = rawHtml;
  if (rawHtml.length > MAX_HTML_BYTES) {
    truncatedHtml = rawHtml.slice(0, MAX_HTML_BYTES);
  }

  // Remove unwanted elements that interfere with content extraction
  const preCleanedHtml = truncatedHtml
    // Remove scripts, styles, and other non-content
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    // Remove LinkedIn-specific navigation and ads
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    // Remove ad containers and tracking elements
    .replace(/<div[^>]*class="[^"]*ad[^"]*"[\s\S]*?<\/div>/gi, '')
    .replace(/<div[^>]*class="[^"]*banner[^"]*"[\s\S]*?<\/div>/gi, '')
    .replace(/<div[^>]*class="[^"]*cookie[^"]*"[\s\S]*?<\/div>/gi, '')
    .replace(/<div[^>]*class="[^"]*modal[^"]*"[\s\S]*?<\/div>/gi, '');

  // Parse with JSDOM
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', () => {
    // Ignore JSDOM errors
  });

  const dom = new JSDOM(preCleanedHtml, { virtualConsole });
  const { document } = dom.window;

  // Extract structured company information first
  const structuredInfo = extractStructuredCompanyInfo(document);

  // Extract logo URL
  const logoUrl = extractLogoUrl(document);

  // Extract complete employee information
  const employees = extractEmployeeInfo(document);

  // Extract company posts
  const posts = extractCompanyPosts(document, cleanLinkedInContent);

  // Remove additional elements that don't contribute to meaningful content
  const elementsToRemove = [
    'iframe',
    'embed',
    'object',
    // LinkedIn-specific elements to remove
    '[class*="nav"]',
    '[class*="menu"]',
    '[class*="popup"]',
    '[class*="modal"]',
    '[class*="banner"]',
    '[class*="cookie"]',
    '[class*="ad-"]',
    '[id*="ad-"]',
    '[class*="ads"]',
    '[id*="ads"]',
    // Social sharing widgets
    '[class*="share"]:not(a)',
    '[class*="social"]:not(a)',
    '[class*="follow"]:not(a)',
    // Button containers that are just UI
    '.artdeco-button',
    '.btn',
    'button',
  ];

  elementsToRemove.forEach((selector) => {
    try {
      document.querySelectorAll(selector).forEach((element) => element.remove());
    } catch {
      // Ignore selector errors
    }
  });

  // Extract clean text content with size limits for LLM processing
  const MAX_TEXT_CHARS = 500_000; // Increased for LLM processing

  // Prioritize main content areas
  const mainContentSelectors = ['main', '[role="main"]', '.main-content', '#main-content', 'article', '.content'];
  let mainContentElement: Element | null = null;

  for (const selector of mainContentSelectors) {
    mainContentElement = document.querySelector(selector);
    if (mainContentElement) {
      break;
    }
  }

  const contentSource = mainContentElement || document.body;
  const extractedTextContent = contentSource?.textContent || '';

  // Apply comprehensive text cleaning and enforce size limits
  const cleanedContent = cleanLinkedInContent(extractedTextContent);

  // Use cleaned content as-is (no structured data mixed in)
  const finalContent = cleanedContent.slice(0, MAX_TEXT_CHARS);

  return {
    content: finalContent,
    ...structuredInfo,
    ...(employees.length > 0 && { employees }),
    ...(logoUrl && { logoUrl }),
    ...(posts.length > 0 && { linkedinPosts: posts }),
  };
};

/**
 * Main LinkedIn company scraper function - simplified for LLM processing
 */
export const scrapeLinkedInCompany = async (url: string): Promise<LinkedInScrapingResult> => {
  try {
    // Validate URL
    if (!isValidLinkedInCompanyUrl(url)) {
      return {
        success: false,
        error: 'Invalid LinkedIn company URL provided',
      };
    }

    // Fetch page content
    const response = await fetchLinkedInPage(url);
    const textDecoder = new TextDecoder();
    const rawHtml = textDecoder.decode(response.data);

    // Check if we got a valid LinkedIn page
    const title = rawHtml.match(/<title[^>]*>(.*?)<\/title>/i)?.[1] || '';

    // Check for common LinkedIn error indicators
    if (
      title.toLowerCase().includes('page not found') ||
      title.toLowerCase().includes('404') ||
      rawHtml.includes('Page not found') ||
      rawHtml.includes('This profile is not available')
    ) {
      return {
        success: false,
        error: 'LinkedIn page not accessible - might be private or not found',
      };
    }

    // Process HTML content for LLM
    const companyData = processLinkedInContent(rawHtml);

    // Validate that we got meaningful content
    if (!companyData.content || companyData.content.length < 100) {
      return {
        success: false,
        error: 'Could not extract sufficient content from LinkedIn page',
      };
    }

    return {
      success: true,
      data: companyData,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('LinkedIn scraping failed:', errorMessage);

    return {
      success: false,
      error: `LinkedIn scraping failed: ${errorMessage}`,
    };
  }
};
