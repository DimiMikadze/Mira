/**
 * Creates a configuration object with pre-set cookie values to bypass common cookie consent dialogs
 * By setting these cookies upfront, many websites will skip showing cookie banners entirely
 * @param url - The target URL to extract hostname from
 * @returns Configuration object with common consent cookies
 */
export const createCookieConsentConfig = (url: string) => {
  const hostname = new URL(url).hostname;
  return {
    cookies: [
      // Common cookie consent framework cookies
      { name: 'cookieconsent_status', value: 'dismiss', domain: hostname }, // Generic cookie consent library
      { name: 'gdpr', value: 'accepted', domain: hostname }, // GDPR compliance cookie
      { name: 'cc_cookie_accept', value: '1', domain: hostname }, // Cookie consent acceptance flag
      { name: 'CookieConsent', value: 'true', domain: hostname }, // Microsoft/SharePoint cookie consent
      { name: 'cookies_accepted', value: 'true', domain: hostname }, // Custom acceptance cookie
    ],
  };
};

/**
 * Array of selectors used to find and click cookie consent buttons
 * Combines XPath selectors (for flexible text matching) and CSS selectors (for common frameworks)
 * The selectors are tried in order until one successfully clicks an element
 */
const defaultConsentSelectors: string[] = [
  // XPath selectors (more flexible for text matching)
  // Uses translate() function to perform case-insensitive text matching
  "//button[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'accept')]",
  "//button[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'agree')]",
  "//button[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'consent')]",
  "//button[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'ok')]",
  "//button[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'got it')]",
  "//button[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'allow')]",
  "//a[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'accept')]", // Also check links
  "//a[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'agree')]",

  // CSS selectors for common cookie consent frameworks and patterns
  '#onetrust-accept-btn-handler', // OneTrust cookie management platform
  '#cookie_action_close_header', // Common cookie notice close button
  '.cc-allow', // Cookie Consent library class
  '.cookie-agree', // Generic agree button class
  '.accept-cookies', // Generic accept cookies class
  "[data-testid='cookie-accept']", // React/testing framework data attribute
  "[aria-label*='accept' i]", // Case-insensitive aria-label check for accessibility
  "[aria-label*='agree' i]", // Case-insensitive aria-label agree button
  "[id*='accept' i]", // Case-insensitive ID containing 'accept'
  "[class*='accept' i]", // Case-insensitive class containing 'accept'
];

/**
 * Creates a JavaScript scenario for ScrapingBee to automatically handle cookie consent dialogs
 * This scenario runs in the browser after page load to click consent buttons and clean up banners
 * @returns JSON string containing the instruction sequence for ScrapingBee
 */
export const createCookieConsentScenario = (): string => {
  const instructions = [
    { wait: 1500 }, // Initial wait for page to load and banners to appear
    {
      // Main consent handling logic
      evaluate: `
        const selectors = ${JSON.stringify(defaultConsentSelectors)};
        for (const sel of selectors) {
          try {
            // Determine if selector is XPath (starts with /) or CSS
            let el = sel.startsWith('/')
              ? document.evaluate(sel, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
              : document.querySelector(sel);
            
            // Only click visible, clickable elements
            if (el && el.offsetParent !== null && typeof el.click === 'function') {
              el.click();
              break; // Stop after first successful click
            }
          } catch (e) {
            // Silently handle selector errors (some XPath might not work on all pages)
            // console.warn('[Cookie Consent] Error with selector:', sel, e.message); // Optional debug log
          }
        }
      `,
    },
    { wait: 1000 }, // Wait for consent action to process
    {
      // Clean up any remaining banner elements
      evaluate: createCookieBannerCleanupScript(),
    },
  ];
  return JSON.stringify({ instructions });
};

/**
 * Creates a JavaScript cleanup script to remove cookie banners and fix page styling issues
 * This runs after consent buttons are clicked to ensure banners are fully removed
 * @returns JavaScript code as string to be executed in the browser
 */
export const createCookieBannerCleanupScript = (): string => {
  return `
    // Remove common cookie banners and overlays that might persist after consent
    const bannerSelectors = [
      // Target elements with cookie-related IDs and banner/popup classes
      '[id*="cookie"][class*="banner"]',
      '[id*="cookie"][class*="popup"]',
      '[id*="cookie"][class*="overlay"]',
      '[class*="cookie"][class*="banner"]',
      '[class*="cookie"][class*="popup"]',
      '[class*="cookie"][class*="overlay"]',
      '[id*="consent"][class*="banner"]',
      '[id*="gdpr"]', // GDPR compliance banners
      
      // Common cookie consent library classes and IDs
      '.cc-window', // Cookie Consent library
      '.cookie-notice', // Generic cookie notice
      '#onetrust-banner-sdk', // OneTrust banner
      '#onetrust-consent-sdk', // OneTrust consent form
      '.cookiebanner', // Generic cookie banner
      '.privacy-overlay', // Privacy-related overlays
      '.cookie-overlay' // Cookie-specific overlays
    ];
    
    // Remove each matching banner element
    bannerSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        // Only remove elements that exist, have a parent, and aren't full-height (to avoid removing main content)
        if (el && el.parentNode && el.offsetHeight < window.innerHeight) {
          el.parentNode.removeChild(el);
        }
      });
    });
    
    // Fix common scroll and styling issues caused by cookie banners
    document.body.style.overflow = 'auto'; // Restore body scroll
    document.documentElement.style.overflow = 'auto'; // Restore document scroll
    // Remove common no-scroll classes that cookie banners add
    document.body.classList.remove('no-scroll', 'cookie-banner-open', 'consent-open');
  `;
};
