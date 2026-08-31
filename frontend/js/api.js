/* ============================================================
   GLOBAL TRUSTFUND
   API.JS
   ------------------------------------------------------------
   Centralized API client for the frontend.

   Used by:
   - auth.js
   - dashboard pages
   - account pages
   - payments
   - transfers
   - support
   - admin portal

   Expected backend base:
   /api

   Example endpoints:
   /api/health
   /api/auth
   /api/users
   /api/roles
   /api/transactions
   /api/dashboard/summary
   ============================================================ */

(function (window) {
  "use strict";

  /* ==========================================================
     CONFIGURATION
     ========================================================== */

  const CONFIG = {
    /*
     * If frontend and backend are served from the same domain:
     *   /api
     *
     * If your backend is hosted separately, change this to:
     *   https://your-api-domain.com/api
     */
    API_BASE_URL: "/api",

    /*
     * Request timeout in milliseconds.
     */
    REQUEST_TIMEOUT: 15000,

    /*
     * Storage keys.
     */
    ACCESS_TOKEN_KEY: "gtf_access_token",
    REFRESH_TOKEN_KEY: "gtf_refresh_token",
    USER_KEY: "gtf_user",

    /*
     * Default headers.
     */
    HEADERS: {
      Accept: "application/json"
    }
  };


  /* ==========================================================
     INTERNAL HELPERS
     ========================================================== */

  function getAccessToken() {
    return (
      localStorage.getItem(CONFIG.ACCESS_TOKEN_KEY) ||
      sessionStorage.getItem(CONFIG.ACCESS_TOKEN_KEY) ||
      null
    );
  }


  function getRefreshToken() {
    return (
      localStorage.getItem(CONFIG.REFRESH_TOKEN_KEY) ||
      sessionStorage.getItem(CONFIG.REFRESH_TOKEN_KEY) ||
      null
    );
  }


  function saveTokens(tokens, rememberMe) {
    if (!tokens) return;

    const storage = rememberMe
      ? localStorage
      : sessionStorage;

    if (tokens.access_token) {
      storage.setItem(
        CONFIG.ACCESS_TOKEN_KEY,
        tokens.access_token
      );
    }

    if (tokens.refresh_token) {
      storage.setItem(
        CONFIG.REFRESH_TOKEN_KEY,
        tokens.refresh_token
      );
    }
  }


  function clearTokens() {
    localStorage.removeItem(CONFIG.ACCESS_TOKEN_KEY);
    localStorage.removeItem(CONFIG.REFRESH_TOKEN_KEY);

    sessionStorage.removeItem(CONFIG.ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(CONFIG.REFRESH_TOKEN_KEY);

    localStorage.removeItem(CONFIG.USER_KEY);
    sessionStorage.removeItem(CONFIG.USER_KEY);
  }


  function saveUser(user, rememberMe) {
    if (!user) return;

    const storage = rememberMe
      ? localStorage
      : sessionStorage;

    storage.setItem(
      CONFIG.USER_KEY,
      JSON.stringify(user)
    );
  }


  function getStoredUser() {
    const raw =
      localStorage.getItem(CONFIG.USER_KEY) ||
      sessionStorage.getItem(CONFIG.USER_KEY);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn(
        "GTF API: Invalid stored user data."
      );

      return null;
    }
  }


  function buildUrl(endpoint) {
    if (!endpoint) {
      return CONFIG.API_BASE_URL;
    }

    /*
     * Allow absolute URLs when needed.
     */
    if (
      endpoint.startsWith("http://") ||
      endpoint.startsWith("https://")
    ) {
      return endpoint;
    }

    const base =
      CONFIG.API_BASE_URL.replace(/\/+$/, "");

    const path =
      endpoint.startsWith("/")
        ? endpoint
        : `/${endpoint}`;

    return `${base}${path}`;
  }


  function createError(message, status, data) {
    const error = new Error(
      message || "An unexpected API error occurred."
    );

    error.status = status || 0;
    error.data = data || null;

    return error;
  }


  async function parseResponse(response) {
    const contentType =
      response.headers.get("content-type") || "";

    if (
      contentType.includes("application/json")
    ) {
      try {
        return await response.json();
      } catch {
        return {};
      }
    }

    const text = await response.text();

    if (!text) {
      return {};
    }

    return {
      message: text
    };
  }


  function extractErrorMessage(data, fallback) {
    if (!data) {
      return fallback;
    }

    if (typeof data === "string") {
      return data;
    }

    return (
      data.message ||
      data.error ||
      data.detail ||
      data.msg ||
      fallback
    );
  }


  /* ==========================================================
     CORE REQUEST METHOD
     ========================================================== */

  async function request(
    endpoint,
    options = {}
  ) {
    const url = buildUrl(endpoint);

    const controller =
      new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      CONFIG.REQUEST_TIMEOUT
    );

    const headers = {
      ...CONFIG.HEADERS,
      ...(options.headers || {})
    };


    /*
     * Automatically attach authentication token.
     */
    const token = getAccessToken();

    if (token) {
      headers.Authorization =
        `Bearer ${token}`;
    }


    /*
     * Automatically send JSON when body is
     * a normal JavaScript object.
     */
    let body = options.body;

    if (
      body &&
      typeof body === "object" &&
      !(body instanceof FormData) &&
      !(body instanceof Blob) &&
      !(body instanceof URLSearchParams)
    ) {
      headers["Content-Type"] =
        "application/json";

      body = JSON.stringify(body);
    }


    try {

      const response = await fetch(url, {
        method:
          options.method || "GET",

        headers,

        body,

        credentials:
          options.credentials || "include",

        signal:
          controller.signal,

        cache:
          options.cache || "no-store"
      });


      const data =
        await parseResponse(response);


      /*
       * Unauthorized.
       */
      if (response.status === 401) {

        /*
         * Don't automatically redirect here.
         *
         * auth.js / role-guard.js can decide
         * what the correct destination should be.
         */

        const message =
          extractErrorMessage(
            data,
            "Your session has expired. Please sign in again."
          );

        throw createError(
          message,
          401,
          data
        );
      }


      /*
       * Forbidden.
       */
      if (response.status === 403) {

        const message =
          extractErrorMessage(
            data,
            "You do not have permission to perform this action."
          );

        throw createError(
          message,
          403,
          data
        );
      }


      /*
       * Other HTTP errors.
       */
      if (!response.ok) {

        const message =
          extractErrorMessage(
            data,
            `Request failed with status ${response.status}.`
          );

        throw createError(
          message,
          response.status,
          data
        );
      }


      return data;

    } catch (error) {

      if (error.name === "AbortError") {

        throw createError(
          "The request timed out. Please check your connection and try again.",
          408
        );
      }


      /*
       * Browser/network error.
       */
      if (
        error instanceof TypeError
      ) {

        throw createError(
          "Unable to connect to the Global TrustFund server. Please try again.",
          0
        );
      }


      throw error;

    } finally {

      clearTimeout(timeout);

    }
  }


  /* ==========================================================
     HTTP METHODS
     ========================================================== */

  async function get(
    endpoint,
    options = {}
  ) {
    return request(
      endpoint,
      {
        ...options,
        method: "GET"
      }
    );
  }


  async function post(
    endpoint,
    data = {},
    options = {}
  ) {
    return request(
      endpoint,
      {
        ...options,
        method: "POST",
        body: data
      }
    );
  }


  async function put(
    endpoint,
    data = {},
    options = {}
  ) {
    return request(
      endpoint,
      {
        ...options,
        method: "PUT",
        body: data
      }
    );
  }


  async function patch(
    endpoint,
    data = {},
    options = {}
  ) {
    return request(
      endpoint,
      {
        ...options,
        method: "PATCH",
        body: data
      }
    );
  }


  async function del(
    endpoint,
    options = {}
  ) {
    return request(
      endpoint,
      {
        ...options,
        method: "DELETE"
      }
    );
  }


  /* ==========================================================
     AUTHENTICATION API
     ========================================================== */

  const auth = {

    async signup(payload) {

      const data = await post(
        "/auth/signup",
        payload
      );

      if (data.tokens) {
        saveTokens(
          data.tokens,
          true
        );
      }

      if (data.user) {
        saveUser(
          data.user,
          true
        );
      }

      return data;
    },


    async login(
      email,
      password,
      rememberMe = true
    ) {

      const data = await post(
        "/auth/login",
        {
          email,
          password
        }
      );


      /*
       * Support common backend response formats.
       */

      const tokens =
        data.tokens ||
        data.session ||
        data;


      if (
        tokens &&
        (
          tokens.access_token ||
          tokens.refresh_token
        )
      ) {

        saveTokens(
          tokens,
          rememberMe
        );
      }


      const user =
        data.user ||
        data.profile ||
        null;


      if (user) {
        saveUser(
          user,
          rememberMe
        );
      }


      return data;
    },


    async logout() {

      try {

        await post(
          "/auth/logout",
          {}
        );

      } finally {

        clearTokens();

      }
    },


    async me() {

      const data = await get(
        "/users/me"
      );

      const user =
        data.user ||
        data.profile ||
        data;

      if (user) {

        const remember =
          Boolean(
            localStorage.getItem(
              CONFIG.ACCESS_TOKEN_KEY
            )
          );

        saveUser(
          user,
          remember
        );
      }

      return data;
    },


    async refresh() {

      const refreshToken =
        getRefreshToken();

      if (!refreshToken) {
        throw createError(
          "No refresh token is available.",
          401
        );
      }

      const data = await post(
        "/auth/refresh",
        {
          refresh_token:
            refreshToken
        }
      );


      const tokens =
        data.tokens ||
        data;


      if (tokens) {

        const remember =
          Boolean(
            localStorage.getItem(
              CONFIG.REFRESH_TOKEN_KEY
            )
          );

        saveTokens(
          tokens,
          remember
        );
      }

      return data;
    },


    async forgotPassword(email) {

      return post(
        "/auth/forgot-password",
        {
          email
        }
      );
    },


    async resetPassword(
      token,
      password
    ) {

      return post(
        "/auth/reset-password",
        {
          token,
          password
        }
      );
    }

  };


  /* ==========================================================
     USER API
     ========================================================== */

  const users = {

    async me() {
      return get(
        "/users/me"
      );
    },


    async updateMe(payload) {
      return patch(
        "/users/me",
        payload
      );
    },


    async profile() {
      return get(
        "/users/profile"
      );
    }

  };


  /* ==========================================================
     ROLE API
     ========================================================== */

  const roles = {

    async me() {
      return get(
        "/roles/me"
      );
    }

  };


  /* ==========================================================
     DASHBOARD API
     ========================================================== */

  const dashboard = {

    async summary() {
      return get(
        "/dashboard/summary"
      );
    },

    async accounts() {
      return get(
        "/dashboard/accounts"
      );
    },

    async activity() {
      return get(
        "/dashboard/activity"
      );
    }

  };


  /* ==========================================================
     ACCOUNTS API
     ========================================================== */

  const accounts = {

    async list() {
      return get(
        "/accounts"
      );
    },


    async get(accountId) {

      if (!accountId) {
        throw new Error(
          "Account ID is required."
        );
      }

      return get(
        `/accounts/${encodeURIComponent(accountId)}`
      );
    },


    async transactions(accountId) {

      if (!accountId) {
        throw new Error(
          "Account ID is required."
        );
      }

      return get(
        `/accounts/${encodeURIComponent(accountId)}/transactions`
      );
    }

  };


  /* ==========================================================
     TRANSACTIONS API
     ========================================================== */

  const transactions = {

    async list(params = {}) {

      const query =
        new URLSearchParams();

      Object.entries(params)
        .forEach(
          ([key, value]) => {

            if (
              value !== undefined &&
              value !== null &&
              value !== ""
            ) {
              query.set(
                key,
                value
              );
            }

          }
        );

      const queryString =
        query.toString();

      return get(
        `/transactions${
          queryString
            ? `?${queryString}`
            : ""
        }`
      );
    },


    async get(transactionId) {

      if (!transactionId) {
        throw new Error(
          "Transaction ID is required."
        );
      }

      return get(
        `/transactions/${encodeURIComponent(transactionId)}`
      );
    }

  };


  /* ==========================================================
     TRANSFERS API
     ========================================================== */

  const transfers = {

    async create(payload) {

      return post(
        "/transfers",
        payload
      );
    },


    async list() {

      return get(
        "/transfers"
      );
    },


    async get(transferId) {

      if (!transferId) {
        throw new Error(
          "Transfer ID is required."
        );
      }

      return get(
        `/transfers/${encodeURIComponent(transferId)}`
      );
    }

  };


  /* ==========================================================
     PAYMENTS API
     ========================================================== */

  const payments = {

    async create(payload) {

      return post(
        "/payments",
        payload
      );
    },


    async list() {

      return get(
        "/payments"
      );
    },


    async get(paymentId) {

      if (!paymentId) {
        throw new Error(
          "Payment ID is required."
        );
      }

      return get(
        `/payments/${encodeURIComponent(paymentId)}`
      );
    }

  };


  /* ==========================================================
     SUPPORT API
     ========================================================== */

  const support = {

    async createTicket(payload) {

      return post(
        "/support/tickets",
        payload
      );
    },


    async tickets() {

      return get(
        "/support/tickets"
      );
    },


    async getTicket(ticketId) {

      if (!ticketId) {
        throw new Error(
          "Ticket ID is required."
        );
      }

      return get(
        `/support/tickets/${encodeURIComponent(ticketId)}`
      );
    }

  };


  /* ==========================================================
     SECURITY API
     ========================================================== */

  const security = {

    async sessions() {

      return get(
        "/security/sessions"
      );
    },


    async activity() {

      return get(
        "/security/activity"
      );
    },


    async changePassword(
      currentPassword,
      newPassword
    ) {

      return post(
        "/security/change-password",
        {
          current_password:
            currentPassword,

          new_password:
            newPassword
        }
      );
    }

  };


  /* ==========================================================
     ADMIN API
     ========================================================== */

  const admin = {

    async summary() {

      return get(
        "/admin/summary"
      );
    },


    async customers(params = {}) {

      const query =
        new URLSearchParams();

      Object.entries(params)
        .forEach(
          ([key, value]) => {

            if (
              value !== undefined &&
              value !== null &&
              value !== ""
            ) {
              query.set(
                key,
                value
              );
            }

          }
        );

      const queryString =
        query.toString();

      return get(
        `/admin/customers${
          queryString
            ? `?${queryString}`
            : ""
        }`
      );
    },


    async getCustomer(customerId) {

      if (!customerId) {
        throw new Error(
          "Customer ID is required."
        );
      }

      return get(
        `/admin/customers/${encodeURIComponent(customerId)}`
      );
    },


    async approveCustomer(customerId) {

      if (!customerId) {
        throw new Error(
          "Customer ID is required."
        );
      }

      return post(
        `/admin/customers/${encodeURIComponent(customerId)}/approve`,
        {}
      );
    },


    async rejectCustomer(
      customerId,
      reason
    ) {

      if (!customerId) {
        throw new Error(
          "Customer ID is required."
        );
      }

      return post(
        `/admin/customers/${encodeURIComponent(customerId)}/reject`,
        {
          reason
        }
      );
    },


    async auditLogs(params = {}) {

      const query =
        new URLSearchParams();

      Object.entries(params)
        .forEach(
          ([key, value]) => {

            if (
              value !== undefined &&
              value !== null &&
              value !== ""
            ) {
              query.set(
                key,
                value
              );
            }

          }
        );

      const queryString =
        query.toString();

      return get(
        `/admin/audit${
          queryString
            ? `?${queryString}`
            : ""
        }`
      );
    }

  };


  /* ==========================================================
     HEALTH CHECK
     ========================================================== */

  async function health() {

    return get(
      "/health"
    );

  }


  /* ==========================================================
     SESSION UTILITIES
     ========================================================== */

  function isAuthenticated() {

    return Boolean(
      getAccessToken()
    );

  }


  function getCurrentUser() {

    return getStoredUser();

  }


  function setAccessToken(
    token,
    rememberMe = true
  ) {

    if (!token) {
      return;
    }

    const storage =
      rememberMe
        ? localStorage
        : sessionStorage;

    storage.setItem(
      CONFIG.ACCESS_TOKEN_KEY,
      token
    );

  }


  function removeSession() {

    clearTokens();

  }


  /* ==========================================================
     PUBLIC API
     ========================================================== */

  const GTF_API = {

    config: CONFIG,

    request,

    get,

    post,

    put,

    patch,

    delete: del,

    health,

    auth,

    users,

    roles,

    dashboard,

    accounts,

    transactions,

    transfers,

    payments,

    support,

    security,

    admin,

    isAuthenticated,

    getCurrentUser,

    getAccessToken,

    getRefreshToken,

    setAccessToken,

    clearSession: removeSession,

    saveUser,

    getStoredUser

  };


  /*
   * Make API globally available.
   */
  window.GTF_API = GTF_API;


  /* ==========================================================
     OPTIONAL BACKWARD COMPATIBILITY
     ========================================================== */

  /*
   * Some existing frontend code may use GTF_APP.api.
   */
  window.GTF_APP =
    window.GTF_APP || {};

  window.GTF_APP.api =
    GTF_API;


})(window);