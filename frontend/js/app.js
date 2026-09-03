/**
 * Global TrustFund — Core Application Utilities
 */

(function () {
  const GTF = (window.GTF = window.GTF || {});

  /* ---------- Config ---------- */
  GTF.config = {
    apiBase: '/api',
    demoMode: true, // set false in production builds
    currencyDefault: 'USD',
    dateLocale: 'en-US'
  };

  /* ---------- Toast System ---------- */
  const toastContainer = (() => {
    let el = document.querySelector('.toast-container');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast-container';
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    return el;
  })();

  GTF.toast = function (message, type = 'info', duration = 4200) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'status');
    toast.innerHTML = `<div>${message}</div>`;
    toastContainer.appendChild(toast);

    const remove = () => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      setTimeout(() => toast.remove(), 220);
    };

    setTimeout(remove, duration);
    toast.addEventListener('click', remove);
  };

  /* ---------- API Helper ---------- */
  GTF.api = async function (endpoint, options = {}) {
    const url = `${GTF.config.apiBase}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    // Attach token if present
    const token = localStorage.getItem('gtf_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(url, {
        ...options,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const err = new Error(data.message || data.error || 'Request failed');
        err.status = res.status;
        err.data = data;
        throw err;
      }

      return data;
    } catch (err) {
      if (!err.status) {
        // Network error
        console.error('[GTF API]', err);
      }
      throw err;
    }
  };

  /* ---------- Formatters ---------- */
  GTF.format = {
    currency(amount, currency = GTF.config.currencyDefault) {
      if (amount == null || isNaN(amount)) return '—';
      return new Intl.NumberFormat(GTF.config.dateLocale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2
      }).format(Number(amount));
    },

    date(iso, opts = {}) {
      if (!iso) return '—';
      const d = new Date(iso);
      return d.toLocaleDateString(GTF.config.dateLocale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...opts
      });
    },

    datetime(iso) {
      if (!iso) return '—';
      const d = new Date(iso);
      return d.toLocaleString(GTF.config.dateLocale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },

    maskAccount(number) {
      if (!number) return '••••';
      const str = String(number);
      if (str.length <= 4) return str;
      return `•••• ${str.slice(-4)}`;
    },

    maskCard(number) {
      if (!number) return '•••• •••• •••• ••••';
      const str = String(number).replace(/\s/g, '');
      return `•••• •••• •••• ${str.slice(-4)}`;
    }
  };

  /* ---------- Simple Event Bus ---------- */
  const listeners = {};
  GTF.on = (event, fn) => {
    (listeners[event] = listeners[event] || []).push(fn);
  };
  GTF.emit = (event, payload) => {
    (listeners[event] || []).forEach((fn) => fn(payload));
  };

  /* ---------- Mobile Nav ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.querySelector('.nav-toggle');
    const mobileNav = document.querySelector('.mobile-nav');
    if (toggle && mobileNav) {
      toggle.addEventListener('click', () => {
        const open = mobileNav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
  });

  /* ---------- Demo Mode Banner (optional) ---------- */
  if (GTF.config.demoMode) {
    document.addEventListener('DOMContentLoaded', () => {
      // Optional subtle indicator that this is a demonstration platform
      // Can be removed or gated in production builds
    });
  }
})();
