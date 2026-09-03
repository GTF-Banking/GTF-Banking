/**
 * Loads public config and optional Supabase JS SDK.
 */
(function () {
  const GTF = (window.GTF = window.GTF || {});

  GTF.loadEnv = async function () {
    try {
      const res = await fetch('/api/config');
      if (!res.ok) return;
      const cfg = await res.json();
      window.__GTF_ENV__ = {
        SUPABASE_URL: cfg.supabaseUrl || '',
        SUPABASE_ANON_KEY: cfg.supabaseAnonKey || ''
      };
      GTF.env = window.__GTF_ENV__;
      GTF.supabaseConfigured = Boolean(cfg.configured);
    } catch (e) {
      console.warn('[GTF] config load failed', e);
    }
  };

  // Auto-load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => GTF.loadEnv());
  } else {
    GTF.loadEnv();
  }
})();
