// Async delay utility for testing or rate limiting
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Converts execution time from start timestamp to human-readable format
export const getExecutionTime = (start: number): string => {
  const end = Date.now();
  const durationInMs = end - start;
  const minutes = Math.floor(durationInMs / 60000);
  const seconds = Math.floor((durationInMs % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
};

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
