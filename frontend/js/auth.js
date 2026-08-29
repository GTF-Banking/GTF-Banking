/**
 * Global TrustFund — Authentication Controller
 */
const GTF_AUTH = {
  user: null,

  async checkSession() {
    try {
      const data = await GTF_API.me();
      this.user = data.user || data;
      return this.user;
    } catch (e) {
      this.user = null;
      return null;
    }
  },

  async login(email, password) {
    const data = await GTF_API.login({ email, password });
    this.user = data.user || data;
    return data;
  },

  async signup(payload) {
    return GTF_API.signup(payload);
  },

  async logout() {
    try {
      await GTF_API.logout();
    } catch (_) {}
    this.user = null;
    window.location.href = '/login.html';
  },

  requireAuth(redirectTo = '/login.html') {
    return this.checkSession().then((user) => {
      if (!user) {
        const next = encodeURIComponent(
          window.location.pathname + window.location.search
        );
        window.location.href = `\( {redirectTo}?next= \){next}`;
        return null;
      }
      return user;
    });
  },

  requireRole(roles = []) {
    return this.requireAuth().then((user) => {
      if (!user) return null;
      const role = (
        user.role ||
        user.user_metadata?.role ||
        'customer'
      ).toLowerCase();
      if (
        roles.length &&
        !roles.map((r) => r.toLowerCase()).includes(role)
      ) {
        window.location.href = '/dashboard/index.html';
        return null;
      }
      return user;
    });
  },

  isAuthenticated() {
    return !!this.user;
  },

  displayName() {
    if (!this.user) return 'Guest';
    return this.user.first_name
      ? `${this.user.first_name} ${this.user.last_name || ''}`.trim()
      : this.user.email || 'User';
  }
};

window.GTF_AUTH = GTF_AUTH;
