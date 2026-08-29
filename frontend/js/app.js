/**
 * Global TrustFund — Shared Application Helpers
 */
const GTF_APP = {
  initMobileNav() {
    const toggle = document.querySelector('[data-mobile-toggle]');
    const menu = document.querySelector('[data-mobile-menu]');
    if (toggle && menu) {
      toggle.addEventListener('click', () => {
        menu.classList.toggle('open');
        const open = menu.classList.contains('open');
        toggle.setAttribute('aria-expanded', open);
      });
    }
  },

  initSidebar() {
    const toggle = document.querySelector('[data-sidebar-toggle]');
    const sidebar = document.querySelector('.dash-sidebar');
    if (toggle && sidebar) {
      toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    }
  },

  showAlert(container, type, message) {
    if (!container) return;
    container.innerHTML = `<div class="alert alert-\( {type}" role="alert"> \){this.escape(message)}</div>`;
  },

  escape(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  },

  formatCurrency(amount, currency = 'USD') {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
    } catch {
      return `${currency} ${Number(amount).toFixed(2)}`;
    }
  },

  formatDate(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    } catch {
      return iso;
    }
  },

  maskAccount(num) {
    if (!num) return '••••';
    const s = String(num);
    if (s.length <= 4) return s;
    return '••••' + s.slice(-4);
  },

  setLoading(el, loading, text = 'Loading...') {
    if (!el) return;
    if (loading) {
      el.dataset.prev = el.innerHTML;
      el.innerHTML = `<div class="loading"><div class="spinner"></div><span>${text}</span></div>`;
    } else if (el.dataset.prev !== undefined) {
      el.innerHTML = el.dataset.prev;
      delete el.dataset.prev;
    }
  },

  passwordStrength(pw) {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score; // 0-5
  },

  validatePassword(pw) {
    return (
      pw.length >= 8 &&
      /[a-z]/.test(pw) &&
      /[A-Z]/.test(pw) &&
      /\d/.test(pw) &&
      /[^A-Za-z0-9]/.test(pw)
    );
  }
};

document.addEventListener('DOMContentLoaded', () => {
  GTF_APP.initMobileNav();
  GTF_APP.initSidebar();
});

window.GTF_APP = GTF_APP;
