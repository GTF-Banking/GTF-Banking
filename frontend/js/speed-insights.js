/**
 * Vercel Speed Insights Integration
 * Loads and initializes performance monitoring for the Global TrustFund platform.
 */

(function initSpeedInsights() {
  // Only run in browser environment
  if (typeof window === 'undefined') return;

  // Initialize the queue for Speed Insights events
  if (!window.si) {
    window.si = function(...params) {
      window.siq = window.siq || [];
      window.siq.push(params);
    };
  }

  // Determine the appropriate script source
  // In production on Vercel, use the platform-provided script
  // In development, use Vercel's debug script
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const scriptSrc = isDev 
    ? 'https://va.vercel-scripts.com/v1/speed-insights/script.debug.js'
    : '/_vercel/speed-insights/script.js';

  // Check if script is already loaded
  if (document.head.querySelector(`script[src*="speed-insights"]`)) {
    return;
  }

  // Create and configure the Speed Insights script
  const script = document.createElement('script');
  script.src = scriptSrc;
  script.defer = true;
  
  // Add metadata for tracking
  script.dataset.sdkn = '@vercel/speed-insights';
  script.dataset.sdkv = '2.0.0';
  
  // Track current route
  script.dataset.route = window.location.pathname;

  // Handle script load errors
  script.onerror = function() {
    console.warn(
      '[Speed Insights] Failed to load script from ' + scriptSrc + '. ' +
      'This is normal in local development without Vercel deployment. ' +
      'Performance tracking will be enabled when deployed to Vercel.'
    );
  };

  // Inject the script
  document.head.appendChild(script);

  // Track route changes for single-page-style navigation (if applicable)
  if (window.GTF) {
    GTF.on('routeChange', function(newRoute) {
      if (script.dataset) {
        script.dataset.route = newRoute;
      }
    });
  }
})();
