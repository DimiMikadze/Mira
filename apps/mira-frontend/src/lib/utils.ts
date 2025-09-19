import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { EnrichmentSources } from 'mira-ai/types';
import type { Database } from '@/constants/database.types';

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
 * Converts Supabase database sources array to EnrichmentSources object format
 */
export function sourcesArrayToObject(sources: Database['public']['Enums']['source'][]): EnrichmentSources {
  return {
    crawl: sources.includes('crawl'),
    google: sources.includes('google'),
    linkedin: sources.includes('linkedin'),
    analysis: sources.includes('analysis'),
  };
}

/**
 * Converts EnrichmentSources object to Supabase database sources array format
 */
export function sourcesObjectToArray(sources: EnrichmentSources): Database['public']['Enums']['source'][] {
  const result: Database['public']['Enums']['source'][] = [];

  if (sources.crawl) result.push('crawl');
  if (sources.google) result.push('google');
  if (sources.linkedin) result.push('linkedin');
  if (sources.analysis) result.push('analysis');

  return result;
}
