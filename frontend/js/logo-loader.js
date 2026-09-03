/**
 * Global TrustFund — Logo & Branding Loader
 * Ensures consistent brand mark across all pages.
 */

(function () {
  const LOGO_PATH = '/assets/gtf-logo.svg';
  const BRAND_NAME = 'Global TrustFund';
  const BRAND_DESC = 'Banking';

  /**
   * Inject brand into any element with data-brand attribute.
   * Usage: <div data-brand="full"></div> or data-brand="mark"
   */
  function loadBranding() {
    document.querySelectorAll('[data-brand]').forEach((el) => {
      const mode = el.getAttribute('data-brand') || 'full';

      if (mode === 'mark') {
        el.innerHTML = `
          <a href="/" class="brand" aria-label="${BRAND_NAME}">
            <img src="${LOGO_PATH}" alt="" width="40" height="40" />
          </a>
        `;
      } else {
        el.innerHTML = `
          <a href="/" class="brand" aria-label="${BRAND_NAME} — ${BRAND_DESC}">
            <img src="${LOGO_PATH}" alt="" width="120" height="40" />
          </a>
        `;
      }
    });
  }

  /**
   * Set document title with brand suffix when needed.
   */
  function setPageTitle(pageTitle) {
    if (pageTitle) {
      document.title = `${pageTitle} | ${BRAND_NAME}`;
    }
  }

  // Auto-run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadBranding);
  } else {
    loadBranding();
  }

  // Expose helpers
  window.GTF = window.GTF || {};
  window.GTF.brand = {
    name: BRAND_NAME,
    descriptor: BRAND_DESC,
    logoPath: LOGO_PATH,
    load: loadBranding,
    setTitle: setPageTitle
  };
})();
