import { DataPoint } from './company.js';

// Page types that we can identify and extract data from
export type PageType = 'landingPage' | 'about' | 'careers' | 'blog' | 'news' | 'clients' | 'caseStudies' | 'contact';

/**
 * Supported internal page types for secondary extraction.
 * `landingPage` is intentionally excluded — it is handled by the discovery agent.
 */
export type InternalPageType = Exclude<PageType, 'landingPage'>;

/**
 * Minimal input expected by the internal-pages agent.
 * - dataPoints: best-known values so far (e.g., from landing page)
 * - internalPages: URLs of discovered internal pages to crawl
 */
export type DiscoveryOutput = {
  dataPoints: Record<string, DataPoint | undefined>;
  internalPages: Partial<Record<InternalPageType, string | null | undefined>>;
};

/**
 * Configuration for AI agents
 */
export interface AgentConfig {
  model?: string;
  temperature?: number;
  maxRetries?: number;
}

/**
 * Result of agent execution
 */
export interface AgentResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
