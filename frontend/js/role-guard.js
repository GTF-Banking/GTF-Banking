/**
 * Client-side role guard (server still enforces)
 */
(function () {
  const path = window.location.pathname;

  if (path.includes('/admin/')) {
    document.addEventListener('DOMContentLoaded', () => {
      if (window.GTF_AUTH) {
        GTF_AUTH.requireRole([
          'admin',
          'super_admin',
          'compliance_officer',
          'manager'
        ]);
      }
    });
  } else if (path.includes('/dashboard/')) {
    document.addEventListener('DOMContentLoaded', () => {
      if (window.GTF_AUTH) GTF_AUTH.requireAuth();
    });
  } else if (path.includes('/cashier/')) {
    document.addEventListener('DOMContentLoaded', () => {
      if (window.GTF_AUTH) {
        GTF_AUTH.requireRole(['cashier', 'admin', 'manager']);
      }
    });
  } else if (path.includes('/manager/')) {
    document.addEventListener('DOMContentLoaded', () => {
      if (window.GTF_AUTH) {
        GTF_AUTH.requireRole(['manager', 'admin', 'super_admin']);
      }
    });
  }
})();
