/**
 * Global TrustFund — Role Guard
 * Client-side route protection. Server-side enforcement is mandatory.
 */

(function () {
  const GTF = (window.GTF = window.GTF || {});

  const ROLE_HIERARCHY = {
    customer: 1,
    cashier: 2,
    manager: 3,
    admin: 4,
    super_admin: 5
  };

  GTF.roleGuard = {
    /**
     * Check if current user has at least the required role level
     * or one of the allowed roles.
     */
    hasRole(allowedRoles = []) {
      const user = GTF.auth.getUser();
      if (!user || !user.role) return false;

      if (Array.isArray(allowedRoles) && allowedRoles.length) {
        return allowedRoles.includes(user.role);
      }
      return true;
    },

    /**
     * Require specific roles. Redirects if unauthorized.
     * @param {string[]} roles - e.g. ['admin', 'super_admin']
     * @param {string} fallback - redirect path
     */
    requireRoles(roles, fallback = '/login.html') {
      if (!GTF.auth.requireAuth(fallback)) return false;

      if (!this.hasRole(roles)) {
        GTF.toast('You do not have permission to access this area.', 'error');
        // Redirect based on actual role
        const user = GTF.auth.getUser();
        if (user?.role === 'customer') {
          window.location.replace('/dashboard/');
        } else {
          window.location.replace(fallback);
        }
        return false;
      }
      return true;
    },

    /**
     * Convenience guards
     */
    requireCustomer() {
      return this.requireRoles(['customer', 'admin', 'super_admin'], '/login.html');
    },

    requireAdmin() {
      return this.requireRoles(['admin', 'super_admin'], '/admin/login.html');
    },

    requireManager() {
      return this.requireRoles(['manager', 'admin', 'super_admin'], '/manager/login.html');
    },

    requireCashier() {
      return this.requireRoles(['cashier', 'manager', 'admin', 'super_admin'], '/cashier/login.html');
    }
  };
})();
