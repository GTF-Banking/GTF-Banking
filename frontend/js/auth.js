/**
 * Global TrustFund — Authentication Module
 * Handles login, registration, session, and logout.
 * Server-side validation is authoritative.
 */

(function () {
  const GTF = (window.GTF = window.GTF || {});

  const TOKEN_KEY = 'gtf_token';
  const USER_KEY = 'gtf_user';

  GTF.auth = {
    /**
     * Get current stored user (client-side cache only).
     */
    getUser() {
      try {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    },

    getToken() {
      return localStorage.getItem(TOKEN_KEY);
    },

    isAuthenticated() {
      return Boolean(this.getToken());
    },

    /**
     * Persist session after successful auth response.
     */
    setSession({ token, user }) {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
      GTF.emit('auth:change', user);
    },

    clearSession() {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      GTF.emit('auth:change', null);
    },

    /**
     * Login
     * @param {{ email: string, password: string }} credentials
     */
    async login(credentials) {
      const data = await GTF.api('/auth/login', {
        method: 'POST',
        body: credentials
      });
      this.setSession(data);
      return data;
    },

    /**
     * Register new customer
     */
    async register(payload) {
      const data = await GTF.api('/auth/register', {
        method: 'POST',
        body: payload
      });
      // Some flows auto-login; others require email verification
      if (data.token) {
        this.setSession(data);
      }
      return data;
    },

    /**
     * Logout (also calls server to invalidate session if needed)
     */
    async logout() {
      try {
        await GTF.api('/auth/logout', { method: 'POST' });
      } catch {
        // Proceed with local clear even if network fails
      }
      this.clearSession();
      window.location.href = '/login.html';
    },

    /**
     * Fetch current user from server (source of truth)
     */
    async me() {
      const data = await GTF.api('/users/me');
      if (data.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      }
      return data.user;
    },

    /**
     * Redirect if already authenticated (for login/signup pages)
     */
    redirectIfAuthenticated(target = '/dashboard/') {
      if (this.isAuthenticated()) {
        window.location.replace(target);
      }
    },

    /**
     * Require authentication; redirect to login if missing
     */
    requireAuth(redirectTo = '/login.html') {
      if (!this.isAuthenticated()) {
        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.replace(`${redirectTo}?return=${returnUrl}`);
        return false;
      }
      return true;
    }
  };
})();
