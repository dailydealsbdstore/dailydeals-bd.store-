import { db } from '/firebase-config.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

// Admin-only settings are read from the public settings/site document so approved tracking tags
// can load on storefront pages. Never store API secrets or credentials in this document.
const TRUSTED_SCRIPT_HOSTS = new Set([
  'googletagmanager.com', 'www.googletagmanager.com',
  'connect.facebook.net', 'www.googleadservices.com',
  'googleads.g.doubleclick.net', 'www.google-analytics.com',
  'analytics.google.com', 'www.google.com', 'google.com'
]);
const seenSources = new Set();
function injectApprovedSnippet(raw, kind) {
  if (typeof raw !== 'string' || !raw.trim() || raw.length > 10000) return;
  const parsed = new DOMParser().parseFromString(raw, 'text/html');
  for (const sourceScript of parsed.querySelectorAll('script')) {
    const src = sourceScript.getAttribute('src');
    if (src) {
      try {
        const url = new URL(src, location.href);
        if (url.protocol !== 'https:' || !TRUSTED_SCRIPT_HOSTS.has(url.hostname)) continue;
        const key = url.href;
        if (seenSources.has(key)) continue;
        seenSources.add(key);
        const script = document.createElement('script');
        script.src = key;
        script.async = sourceScript.hasAttribute('async') || true;
        if (sourceScript.hasAttribute('defer')) script.defer = true;
        script.dataset.ddTracking = kind;
        document.head.appendChild(script);
      } catch (error) {
        console.warn('Skipped invalid tracking script URL', error);
      }
      continue;
    }
    const code = sourceScript.textContent || '';
    // Accept normal Google Analytics/GTM and Meta Pixel snippets, not generic arbitrary scripts.
    const knownTag = /(dataLayer|gtag\s*\(|fbq\s*\(|googletagmanager|google_conversion|connect\.facebook\.net|fbevents)/i.test(code);
    const risky = /\beval\s*\(|new\s+Function\s*\(|document\.write\s*\(/i.test(code);
    if (!knownTag || risky || code.length > 8000) continue;
    const script = document.createElement('script');
    script.textContent = code;
    script.dataset.ddTracking = kind;
    document.head.appendChild(script);
  }
}

// Keep business admin pages out of marketing analytics to avoid polluting ad/conversion data.
if (!/^\/admin(?:\.html)?\/?$/i.test(location.pathname)) {
  getDoc(doc(db, 'settings', 'site')).then(snapshot => {
    if (!snapshot.exists()) return;
    const cfg = snapshot.data() || {};
    injectApprovedSnippet(cfg.googleAnalyticsSnippet, 'google-analytics');
    injectApprovedSnippet(cfg.googleAdsSnippet, 'google-ads');
    injectApprovedSnippet(cfg.metaPixelSnippet, 'meta-pixel');
  }).catch(error => console.warn('Tracking configuration has not been set up yet.', error));
}
