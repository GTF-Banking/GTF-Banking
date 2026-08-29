/**
 * Global TrustFund — API Helper
 * All frontend calls go through /api/*
 */
const GTF_API = {
  base: '/api',

  async request(path, options = {}) {
    const url = path.startsWith('http') ? path : `\( {this.base} \){path}`;
    const config = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    };
    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }
    try {
      const res = await fetch(url, config);
      let data = null;
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        data = await res.json();
      } else {
        data = { message: await res.text() };
      }
      if (!res.ok) {
        const err = new Error(data.message || data.error || `Request failed (${res.status})`);
        err.status = res.status;
        err.data = data;
        throw err;
      }
      return data;
    } catch (e) {
      if (e.status) throw e;
      throw new Error(e.message || 'Network error. Please try again.');
    }
  },

  get(path) {
    return this.request(path, { method: 'GET' });
  },
  post(path, body) {
    return this.request(path, { method: 'POST', body });
  },
  patch(path, body) {
    return this.request(path, { method: 'PATCH', body });
  },
  put(path, body) {
    return this.request(path, { method: 'PUT', body });
  },
  delete(path) {
    return this.request(path, { method: 'DELETE' });
  },

  // Auth
  signup(payload) {
    return this.post('/auth/signup', payload);
  },
  login(payload) {
    return this.post('/auth/login', payload);
  },
  logout() {
    return this.post('/auth/logout');
  },
  me() {
    return this.get('/auth/me');
  },
  status() {
    return this.get('/auth/status');
  },
  refresh() {
    return this.post('/auth/refresh');
  },

  // Data
  dashboardSummary() {
    return this.get('/dashboard/summary');
  },
  accounts() {
    return this.get('/accounts');
  },
  transactions(params = '') {
    return this.get('/transactions' + (params ? '?' + params : ''));
  },
  transfers() {
    return this.get('/transfers');
  },
  profile() {
    return this.get('/users/me');
  },
  updateProfile(data) {
    return this.patch('/users/me', data);
  }
};

window.GTF_API = GTF_API;
