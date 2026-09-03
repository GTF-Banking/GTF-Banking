/**
 * Global TrustFund — Supabase browser client
 * Uses anon key only. Never put service_role in frontend.
 */
(function () {
  const GTF = (window.GTF = window.GTF || {});

  // Injected at runtime from meta tags or window.__GTF_ENV__ (set by server or build)
  const env = window.__GTF_ENV__ || {};
  const url = env.SUPABASE_URL || '';
  const anon = env.SUPABASE_ANON_KEY || '';

  let client = null;

  function getClient() {
    if (client) return client;
    if (!url || !anon || typeof window.supabase === 'undefined') {
      return null;
    }
    client = window.supabase.createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    return client;
  }

  GTF.supabase = {
    getClient,
    isConfigured() {
      return Boolean(url && anon);
    },
    async getSession() {
      const c = getClient();
      if (!c) return null;
      const { data } = await c.auth.getSession();
      return data.session || null;
    }
  };
})();
