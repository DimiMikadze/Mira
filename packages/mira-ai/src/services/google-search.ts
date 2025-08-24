/**
 * Google Search Service
 *
 * Provides Google search functionality using ScrapingBee's Google Search API.
 */

// Google Search result structure from ScrapingBee API
export interface GoogleSearchResult {
  url: string;
  title: string;
  description: string | null;
  displayed_url: string;
  domain: string;
  position: number;
  date?: string | null;
  date_utc?: string | null;
}

// Google Search API response from ScrapingBee
export interface GoogleSearchResponse {
  organic_results: GoogleSearchResult[];
  meta_data: {
    number_of_results: number;
    number_of_organic_results: number;
    url: string;
  };
  related_queries?: Array<{ title: string; position: number }>;
  questions?: Array<{ text: string; position: number }>;
}

/**
 * Performs a Google search using ScrapingBee's Google Search API
 */
export const searchGoogle = async (
  query: string,
  options: {
    searchType?: 'classic' | 'news';
    nbResults?: number;
    countryCode?: string;
    language?: string;
  } = {}
): Promise<GoogleSearchResponse | null> => {
  try {
    console.info(`[GoogleSearch] Searching: "${query}"`);

    const { searchType = 'classic', nbResults = 10, countryCode = 'us', language = 'en' } = options;

    // Call ScrapingBee Google Search API following documentation pattern
    const params = new URLSearchParams({
      api_key: process.env.SCRAPING_BEE_API_KEY!,
      search: query,
      search_type: searchType,
      nb_results: nbResults.toString(),
      country_code: countryCode,
      language: language,
      light_request: 'true',
    });

    const response = await fetch(`https://app.scrapingbee.com/api/v1/store/google?${params}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const searchResults: GoogleSearchResponse = await response.json();

    console.info(`[GoogleSearch] Found ${searchResults.organic_results?.length || 0} results for: "${query}"`);

    return searchResults;
  } catch (error) {
    console.error(`[GoogleSearch] Search failed for query "${query}":`, error);
    return null;
  }
};
