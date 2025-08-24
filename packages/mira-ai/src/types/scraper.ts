export type Link = { href: string; text: string };
export type Links = Link[];

export type ScrapingResult = {
  content: string;
  links: Links;
  socialMediaLinks: string[];
  metaTitle?: string;
  finalURL?: string;
};

export type ScrapeResponse =
  | string
  | { content: string; finalURL: string }
  | { content: string; links: Links; finalURL: string }
  | { content: string; links: Links }
  | ScrapingResult
  | (ScrapingResult & { finalURL: string })
  | null;
