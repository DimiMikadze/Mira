export interface LinkedInPerson {
  name: string;
  title: string;
  profileUrl?: string;
  photoUrl?: string;
  location?: string;
}

export interface LinkedInCompanyData {
  // Raw content for LLM processing (clean page content only)
  content: string;

  // Specific company data points (extracted via selectors)
  name?: string;
  description?: string;
  industry?: string;
  companySize?: string;
  headquarters?: string;
  founded?: string;
  specialties?: string;

  // Employee information (extracted via selectors)
  employees?: LinkedInPerson[];

  // Essential images only
  logoUrl?: string;
}

export interface LinkedInScrapingResult {
  success: boolean;
  data?: LinkedInCompanyData;
  error?: string;
}
