export interface LinkedInEmployee {
  name: string;
  title: string;
  profileUrl?: string;
  photoUrl?: string;
  location?: string;
}

export interface LinkedInPost {
  timeAgo: string | null;
  text: string | null;
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

  // Essential images only
  logoUrl?: string;

  // Special data points (extracted via selectors) - use uppercase for consistency
  LINKEDIN_EMPLOYEES?: LinkedInEmployee[];
  LINKEDIN_POSTS?: LinkedInPost[];
}

export interface LinkedInScrapingResult {
  success: boolean;
  data?: LinkedInCompanyData;
  error?: string;
}
