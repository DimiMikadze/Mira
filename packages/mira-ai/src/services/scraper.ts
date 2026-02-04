import { ScrapingBeeClient } from 'scrapingbee';
import { JSDOM, VirtualConsole } from 'jsdom';
import { createCookieConsentConfig, createCookieConsentScenario } from './cookie-consent.js';
import type { ScrapingResult, ScrapeResponse } from '../types/scraper.js';

/**
 * Ensures a URL has the proper scheme (http/https) prefix
 * @param url - The URL to format
 * @param scheme - The scheme to add if missing
 * @returns Properly formatted URL with scheme
 */
const ensureUrlScheme = (url: string, scheme: 'http' | 'https'): string => {
  if (/^https?:\/\//i.test(url)) return url;
  return `${scheme}://${url}`;
};

/**
 * Fetches webpage content using ScrapingBee with optimized settings
 * @param targetUrl - The URL to scrape
 * @returns ScrapingBee response with HTML content
 */
const fetchWithScrapingBee = async (targetUrl: string) => {
  const { cookies } = createCookieConsentConfig(targetUrl);
  const js_scenario = createCookieConsentScenario();
  const scrapingBeeClient = new ScrapingBeeClient(process.env.SCRAPING_BEE_API_KEY!);

  return await scrapingBeeClient.get({
    url: targetUrl,
    params: {
      block_resources: true,
      block_ads: true,
      render_js: true,
      wait_browser: 'networkidle2', // domcontentloaded, load, networkidle0, networkidle2
      wait: 2000,
      cookies, // inject consent cookies up-front
      js_scenario, // then click through banners
      timeout: 60000,
    },
  });
};

const MAX_HTML_BYTES = 3_000_000; // 3 MB - supports larger SPAs and content-heavy pages
const MAX_TEXT_CHARS = 750_000; // 750_000;

/**
 * Comprehensive text cleaning optimized for LLM processing
 * Removes invisible characters, normalizes whitespace, and cleans common web artifacts
 * @param rawText - The raw text content to clean
 * @returns Cleaned and normalized text content
 */
export const cleanTextContent = (rawText: string): string => {
  return (
    rawText
      // FIRST: Remove zero-width and invisible Unicode characters
      .replace(/[\u200B-\u200D\uFEFF\u2060-\u206F\u2028\u2029]/g, '')
      // Remove other problematic Unicode ranges
      .replace(/[\u00A0\u1680\u180E\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
      // Remove directional marks and other formatting characters
      .replace(/[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
      // Normalize whitespace (collapse multiple spaces, tabs, newlines)
      .replace(/\s+/g, ' ')
      // Remove common web artifacts
      .replace(/\s*\|\s*/g, ' | ') // Clean up pipe separators
      .replace(/\s*›\s*/g, ' › ') // Clean up breadcrumb separators
      .replace(/\s*»\s*/g, ' » ') // Clean up arrow separators
      // Remove excessive punctuation
      .replace(/\.{3,}/g, '...')
      .replace(/-{3,}/g, '---')
      // Clean up common navigation text
      .replace(/\b(Home|Navigation|Menu|Skip to content|Skip to main content)\b/gi, '')
      // Remove social media noise
      .replace(/\b(Share|Tweet|Like|Follow|Subscribe)\b/gi, '')
      // Clean up cookie/privacy noise
      .replace(/\b(Accept cookies|Privacy policy|Cookie settings)\b/gi, '')
      .trim()
  );
};

/**
 * Determines if a URL belongs to a known social media platform
 * @param url - The URL to check
 * @returns True if the URL is from a social media domain
 */
export const isSocialMediaDomain = (url: string): boolean => {
  const socialMediaDomains = ['linkedin.com', 'twitter.com', 'x.com', 'youtube.com', 'facebook.com', 'instagram.com'];

  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    return socialMediaDomains.some((domain) => {
      // Exact match or www subdomain only to avoid false positives
      return hostname === domain || hostname === `www.${domain}`;
    });
  } catch {
    return false;
  }
};

/**
 * Determines if a link should be included for data point extraction
 * Excludes navigation links, utility links, file downloads, and auth pages
 * @param linkUrl - The link URL to evaluate
 * @param linkText - The visible text of the link
 * @returns True if the link should be included for data point extraction
 */
const shouldIncludeLink = (linkUrl: string, linkText: string): boolean => {
  // Skip empty text links
  if (!linkText.trim()) return false;

  // Skip common navigation/utility links
  const skipPatterns = [
    /^(mailto:|tel:|#)/i,
    /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar)$/i,
    /\/(privacy|terms|cookie|legal|sitemap)/i,
  ];

  if (skipPatterns.some((pattern) => pattern.test(linkUrl))) return false;

  // If it's a social media link, always include it regardless of text patterns
  if (isSocialMediaDomain(linkUrl)) return true;

  // Skip links with navigation-only text
  const navTextPatterns = [
    /^(home|back|next|previous|more|continue|skip|menu|navigation|search)$/i,
    /^(login|logout|sign in|sign up|register)$/i,
    /^(share|tweet|like|follow|subscribe)$/i,
  ];

  return !navTextPatterns.some((pattern) => pattern.test(linkText.trim()));
};

/**
 * Processes raw HTML to extract clean text content and optionally links
 * @param params - Configuration object
 * @returns Cleaned text content or ScrapingResult with links
 */
const processHtmlContent = ({
  rawHtml,
  extractLinks,
  extractMetaTitle,
  sourceUrl,
  excludeHeaderAndFooter,
}: {
  rawHtml: string;
  extractLinks?: boolean;
  extractMetaTitle?: boolean;
  sourceUrl: string;
  excludeHeaderAndFooter?: boolean;
}): string | ScrapingResult => {
  if (!rawHtml || typeof rawHtml !== 'string') {
    console.error('[processHtmlContent] received invalid input HTML.');
    return '';
  }

  try {
    // Handle extremely large HTML files by truncating to prevent memory issues
    let truncatedHtml = rawHtml;
    if (rawHtml.length > MAX_HTML_BYTES) {
      console.warn(
        `[processHtmlContent] HTML too large (${rawHtml.length} chars), truncating to ${MAX_HTML_BYTES} for processing`,
      );
      truncatedHtml = rawHtml.slice(0, MAX_HTML_BYTES);
    }

    // STEP 1: Remove non-content elements that interfere with text extraction
    const preCleanedHtml = truncatedHtml
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<svg[\s\S]*?<\/svg>/gi, '');

    console.info(
      `[processHtmlContent] Pre-cleaned HTML - removed scripts, styles, comments, SVGs. Size: ${preCleanedHtml.length} chars.`,
    );

    // Configure JSDOM to suppress non-critical CSS parsing errors
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', (err: Error) => {
      if (err.message.includes('Could not parse CSS stylesheet')) {
        return; // Ignore known, non-critical CSS parsing errors
      }
      console.error(`[processHtmlContent] JSDOM error: ${err.message}`);
    });

    const dom = new JSDOM(preCleanedHtml, { virtualConsole });
    const { document } = dom.window;
    console.info('[processHtmlContent] Successfully parsed HTML with JSDOM.');

    // STEP 2: Extract meta title if requested
    let metaTitle: string | undefined;
    if (extractMetaTitle) {
      const titleElement = document.querySelector('title');
      if (titleElement && titleElement.textContent) {
        metaTitle = cleanTextContent(titleElement.textContent);
        console.info(`[processHtmlContent] Extracted meta title: "${metaTitle}"`);
      } else {
        console.info('[processHtmlContent] No meta title found in document');
      }
    }

    // STEP 3: Extract and categorize all links from the complete document
    const internalLinks: { href: string; text: string }[] = [];
    const socialMediaUrls: string[] = [];
    if (extractLinks) {
      const baseUrl = new URL(sourceUrl);

      const extractedLinks = Array.from(document.querySelectorAll('a'))
        .map((linkElement) => {
          const rawHref = linkElement.getAttribute('href');
          try {
            const absoluteUrl = rawHref ? new URL(rawHref, baseUrl).href : null;
            if (!absoluteUrl) return null;

            const linkText = cleanTextContent(linkElement.textContent || '');

            // Always include social media links, even without visible text
            if (isSocialMediaDomain(absoluteUrl)) {
              return { href: absoluteUrl, text: linkText || absoluteUrl };
            }

            // Skip links without meaningful text content
            if (!linkText) return null;

            // Filter out navigation/utility links to keep only content-relevant links
            if (!shouldIncludeLink(absoluteUrl, linkText)) return null;

            return { href: absoluteUrl, text: linkText };
          } catch {
            console.warn(`[processHtmlContent] Skipped malformed link: ${rawHref}`);
            return null;
          }
        })
        .filter((link): link is { href: string; text: string } => !!link);

      // Deduplicate and categorize links by type
      extractedLinks.forEach((link) => {
        if (isSocialMediaDomain(link.href)) {
          // Add social media URLs without duplicates
          if (!socialMediaUrls.includes(link.href)) {
            socialMediaUrls.push(link.href);
          }
        } else {
          // Add internal/external links without duplicates
          if (!internalLinks.find((existing) => existing.href === link.href)) {
            internalLinks.push(link);
          }
        }
      });

      console.info(
        `[processHtmlContent] Extracted ${internalLinks.length} internal links and ${socialMediaUrls.length} social media links from complete document.`,
      );
    }

    // STEP 3: Remove elements that don't contribute to meaningful content
    const contentFilterSelectors = [
      'script',
      'noscript',
      'iframe',
      'embed',
      'object',
      'style',
      'link[rel="stylesheet"]',
      // Common ad/tracking elements
      '[class*="ad-"]',
      '[id*="ad-"]',
      '[class*="ads"]',
      '[id*="ads"]',
      '[class*="cookie"]',
      '[id*="cookie"]',
      '[class*="popup"]',
      '[id*="popup"]',
      '[class*="modal"]',
      '[id*="modal"]',
      // Social media widgets (but preserve actual links)
      '[class*="social"]:not(a)',
      '[class*="share"]:not(a)',
      '[class*="tweet"]:not(a)',
    ];

    if (excludeHeaderAndFooter) {
      contentFilterSelectors.push('header', 'footer', 'nav', 'aside');
    }

    contentFilterSelectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => element.remove());
    });

    console.info(`[processHtmlContent] Removed non-content elements for cleaner text extraction.`);

    // STEP 4: Extract clean text content with size limits for LLM processing
    let extractedTextContent = '';

    // Prioritize main content areas over entire document
    const mainContentSelectors = ['main', '[role="main"]', '.main-content', '#main-content', 'article'];
    let mainContentElement: Element | null = null;

    for (const selector of mainContentSelectors) {
      mainContentElement = document.querySelector(selector);
      if (mainContentElement) break;
    }

    const contentSource = mainContentElement || document.body;
    extractedTextContent = contentSource?.textContent || '';

    // Apply comprehensive text cleaning and enforce size limits
    const finalContent = cleanTextContent(extractedTextContent).slice(0, MAX_TEXT_CHARS);
    console.info(
      `[processHtmlContent] Extracted and cleaned text content (${finalContent.length} chars, limited to ${MAX_TEXT_CHARS}).`,
    );

    // Return structured result based on extraction requirements
    if (extractLinks || extractMetaTitle) {
      return {
        content: finalContent,
        links: internalLinks,
        socialMediaLinks: socialMediaUrls,
        ...(metaTitle && { metaTitle }),
      };
    }

    return finalContent;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`[processHtmlContent] HTML processing failed: ${error.message}`);
    } else {
      console.error('[processHtmlContent] HTML processing failed with an unknown error', error);
    }
    return '';
  }
};

/**
 * Main scraping function that handles URL schemes and content extraction
 * @param params - Scraping configuration
 * @returns Scraped content with optional links and final URL
 */
export const scrape = async ({
  url: targetUrl,
  extractLinks,
  extractMetaTitle,
  includeFinalURL,
  excludeHeaderAndFooter,
}: {
  url: string;
  extractLinks?: boolean;
  extractMetaTitle?: boolean;
  includeFinalURL?: boolean;
  excludeHeaderAndFooter?: boolean;
}): Promise<ScrapeResponse> => {
  let finalFormattedUrl: string;

  /**
   * Attempts to fetch content using a specific URL scheme
   * @param scheme - HTTP or HTTPS protocol
   * @returns Scraped content or null if failed
   */
  const attemptFetchWithScheme = async (scheme: 'http' | 'https'): Promise<ScrapeResponse> => {
    finalFormattedUrl = ensureUrlScheme(targetUrl, scheme);
    console.info(`[scrape] Attempting to fetch: ${finalFormattedUrl}`);

    try {
      const response = await fetchWithScrapingBee(finalFormattedUrl);
      const textDecoder = new TextDecoder();
      const rawHtmlContent = textDecoder.decode(response.data);

      console.info(
        `[scrape] Successfully fetched and decoded HTML from ${finalFormattedUrl} (${rawHtmlContent.length} chars)`,
      );

      const processedResult = processHtmlContent({
        rawHtml: rawHtmlContent,
        extractLinks,
        extractMetaTitle,
        sourceUrl: finalFormattedUrl,
        excludeHeaderAndFooter,
      });

      if (!includeFinalURL) {
        console.info(`[scrape] Returning result without final URL for ${finalFormattedUrl}`);
        return processedResult;
      }

      if (typeof processedResult === 'string') {
        console.info(`[scrape] Returning text content with final URL: ${finalFormattedUrl}`);
        return { content: processedResult, finalURL: finalFormattedUrl };
      }

      console.info(`[scrape] Returning content with links and final URL: ${finalFormattedUrl}`);
      return {
        ...processedResult,
        finalURL: finalFormattedUrl,
      };
    } catch (err: unknown) {
      let errorMessage = 'Unknown error occurred';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      console.error(
        `[scrape] Fetch attempt with ${scheme.toUpperCase()} failed for ${finalFormattedUrl}: ${errorMessage}`,
      );
      return null;
    }
  };

  // Handle URLs that already have a scheme specified
  if (/^https?:\/\//i.test(targetUrl)) {
    const detectedScheme = targetUrl.startsWith('https://') ? 'https' : 'http';
    const fallbackScheme = detectedScheme === 'https' ? 'http' : 'https';

    console.info(`[scrape] URL has ${detectedScheme.toUpperCase()} scheme, attempting primary fetch`);
    const primaryResult = await attemptFetchWithScheme(detectedScheme);
    if (primaryResult) return primaryResult;

    console.warn(`[scrape] Primary scheme failed, trying fallback ${fallbackScheme.toUpperCase()} for: ${targetUrl}`);
    return await attemptFetchWithScheme(fallbackScheme);
  }

  // Handle URLs without scheme - try HTTPS first (modern standard)
  console.info(`[scrape] No scheme detected in URL, attempting HTTPS first`);
  const httpsResult = await attemptFetchWithScheme('https');
  if (httpsResult !== null) return httpsResult;

  console.warn(`[scrape] HTTPS failed, falling back to HTTP for URL: ${targetUrl}`);
  return await attemptFetchWithScheme('http');
};
