import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Storage keys for localStorage
const STORAGE_KEYS = {
  COMPANY_CRITERIA: 'company-criteria',
  COMPANY_CRITERIA_WARNING_DISMISSED: 'company-criteria-warning-dismissed',
} as const;

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
 * Company criteria specific utility functions
 */
export const companyCriteriaUtils = {
  hasCompanyCriteria: (): boolean => {
    const criteria = storage.get(STORAGE_KEYS.COMPANY_CRITERIA);
    return criteria !== null && criteria.trim().length > 0;
  },

  getCompanyCriteria: (): string => {
    return storage.get(STORAGE_KEYS.COMPANY_CRITERIA) || '';
  },

  setCompanyCriteria: (criteria: string): void => {
    storage.set(STORAGE_KEYS.COMPANY_CRITERIA, criteria.trim());
  },

  isCompanyCriteriaWarningDismissed: (): boolean => {
    return storage.get(STORAGE_KEYS.COMPANY_CRITERIA_WARNING_DISMISSED) === 'true';
  },

  dismissCompanyCriteriaWarning: (): void => {
    storage.set(STORAGE_KEYS.COMPANY_CRITERIA_WARNING_DISMISSED, 'true');
  },
};
