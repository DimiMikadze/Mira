/**
 * Manages source URL collection and deduplication throughout the enrichment process
 */

/**
 * Creates a sources manager to track and deduplicate source URLs
 */
export const createSourcesManager = () => {
  const sources = new Set<string>();

  return {
    /**
     * Add a single source URL
     */
    addSource: (url: string) => {
      if (url && url.trim()) {
        sources.add(url.trim());
      }
    },

    /**
     * Add multiple source URLs
     */
    addSources: (urls: string[]) => {
      urls.forEach((url) => {
        if (url && url.trim()) {
          sources.add(url.trim());
        }
      });
    },

    /**
     * Add sources from a Set
     */
    addSourcesFromSet: (sourceSet: Set<string>) => {
      sourceSet.forEach((url) => sources.add(url));
    },

    /**
     * Get all sources as an array, with finalURL first if provided
     */
    getSources: (finalURL?: string): string[] => {
      if (finalURL) {
        // Remove finalURL from sources if it exists to avoid duplicates
        sources.delete(finalURL);
        return [finalURL, ...Array.from(sources)];
      }
      return Array.from(sources);
    },

    /**
     * Get the count of unique sources
     */
    getSourceCount: (): number => sources.size,

    /**
     * Check if a source exists
     */
    hasSource: (url: string): boolean => sources.has(url),

    /**
     * Clear all sources
     */
    clear: () => sources.clear(),
  };
};

/**
 * Extract internal page URLs from discovery result
 */
export const extractInternalPageUrls = (internalPages: Record<string, string | null | undefined>): string[] => {
  return Object.values(internalPages).filter((url): url is string => typeof url === 'string' && url.length > 0);
};
