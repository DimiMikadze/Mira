import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { EnrichmentSources, Analysis } from 'mira-ai/types';
import type { Database } from '@/constants/database.types';
import type { WorkspaceRow } from './supabase/orm';

// API endpoints
export const API_ENDPOINTS = {
  ENRICH: '/api/enrich',
} as const;

// Combines and merges Tailwind CSS classes, handling conflicts intelligently
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Validates URLs, auto-prepending https:// and checking domain format
export function isValidURL(url: string): boolean {
  try {
    const normalized = url.startsWith('http') ? url : `https://${url}`;
    const parsed = new URL(normalized);
    const domainRegex = /^([a-zA-Z0-9-_]+\.)+[a-zA-Z]{2,}$/;
    return domainRegex.test(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * Safe localStorage operations that handle SSR and errors gracefully
 */
export const storage = {
  get: (key: string): string | null => {
    try {
      return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  },

  set: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch {
      // Ignore localStorage errors
    }
  },
};

/**
 * Converts WorkspaceRow database fields to EnrichmentSources object format
 */
export function workspaceToEnrichmentSources(workspace: WorkspaceRow): EnrichmentSources {
  return {
    crawl: workspace.source_crawl,
    google: workspace.source_google,
    linkedin: workspace.source_linkedin,
  };
}

/**
 * Converts WorkspaceRow database fields to Analysis object format
 */
export function workspaceToAnalysis(workspace: WorkspaceRow): Analysis {
  return {
    executiveSummary: workspace.analysis_executive_summary,
    companyCriteria: workspace.analysis_company_criteria || undefined,
  };
}
