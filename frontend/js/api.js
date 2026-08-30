/* =========================================================
   GLOBAL TRUSTFUND
   SHARED API CLIENT

   File:
   frontend/js/api.js

   Purpose:
   - Centralize all API requests
   - Use one backend configuration
   - Handle JSON requests/responses
   - Attach authentication token
   - Handle 401/403/500 responses
   - Provide reusable GET/POST/PATCH/PUT/DELETE methods
   - Support all GTF frontend portals

   ========================================================= */

(function (window) {
  "use strict";

  /* =======================================================
     CONFIGURATION
     ======================================================= */

  const CONFIG = {

    /*
     * Change ONLY this value when the backend moves
     * to another production server.
     *
     * Example:
     * https://api.globaltrustfund.com/api
     *
     * For the current same-domain deployment:
     */
    baseURL: "/api",

    timeout: 20000,

    tokenKey: "gtf_token",

    userKey: "gtf_user",

    redirectKey: "gtf_redirect"
  };


  /* =======================================================
     STORAGE HELPERS
     ======================================================= */

  function getToken() {

    try {

      return (
        localStorage.getItem(
          CONFIG.tokenKey
        ) ||
        sessionStorage.getItem(
          CONFIG.tokenKey
        ) ||
        null
      );

    } catch (error) {

      console.warn(
        "Unable to read authentication token.",
        error
      );

      return null;
    }
  }


  function saveToken(token) {

    if (!token) {
      return false;
    }

    try {

      localStorage.setItem(
        CONFIG.tokenKey,
        token
      );

      return true;

    } catch (error) {

      console.warn(
        "Unable to save authentication token.",
        error
      );

      return false;
    }
  }


  function removeToken() {

    try {

      localStorage.removeItem(
        CONFIG.tokenKey
      );

      sessionStorage.removeItem(
        CONFIG.tokenKey
      );

    } catch (error) {

      console.warn(
        "Unable to remove authentication token.",
        error
      );
    }
  }


  function saveUser(user) {

    if (!user) {
      return false;
    }

    try {

      localStorage.setItem(
        CONFIG.userKey,
        JSON.stringify(user)
      );

      return true;

    } catch (error) {

      console.warn(
        "Unable to save user information.",
        error
      );

      return false;
    }
  }


  function getUser() {

    try {

      const value =
        localStorage.getItem(
          CONFIG.userKey
        );

      if (!value) {
        return null;
      }

      return JSON.parse(value);

    } catch (error) {

      console.warn(
        "Unable to read saved user.",
        error
      );

      return null;
    }
  }


  function removeUser() {

    try {

      localStorage.removeItem(
        CONFIG.userKey
      );

    } catch (error) {

      console.warn(
        "Unable to remove saved user.",
        error
      );
    }
  }


  /* =======================================================
     URL BUILDER
     ======================================================= */

  function buildURL(
    endpoint,
    query
  ) {

    let path =
      String(endpoint || "");

    /*
     * Allow callers to use either:
     *
     * /users
     * users
     * /api/users
     *
     * without accidentally producing /api/api/users.
     */

    path =
      path.replace(
        /^\/+/,
        ""
      );


    if (
      path.startsWith("api/")
    ) {

      path =
        path.substring(4);
    }


    const base =
      CONFIG.baseURL
        .replace(/\/+$/, "");


    let url =
      `${base}/${path}`;


    if (
      query &&
      typeof query === "object"
    ) {

      const params =
        new URLSearchParams();


      Object.entries(query)
        .forEach(
          ([key, value]) => {

            if (
              value === undefined ||
              value === null ||
              value === ""
            ) {
              return;
            }

            if (
              Array.isArray(value)
            ) {

              value.forEach(
                (item) => {
                  params.append(
                    key,
                    item
                  );
                }
              );

            } else {

              params.append(
                key,
                value
              );
            }
          }
        );


      const queryString =
        params.toString();


      if (queryString) {

        url +=
          `?${queryString}`;
      }
    }


    return url;
  }


  /* =======================================================
     REQUEST TIMEOUT
     ======================================================= */

  function createTimeoutSignal(
    timeout
  ) {

    if (
      typeof AbortController ===
      "undefined"
    ) {
      return {
        signal: undefined,
        cleanup: () => {}
      };
    }


    const controller =
      new AbortController();


    const timer =
      setTimeout(
        () => {
          controller.abort();
        },
        timeout
      );


    return {

      signal:
        controller.signal,

      cleanup:
        () => clearTimeout(timer)
    };
  }


  /* =======================================================
     RESPONSE PARSER
     ======================================================= */

  async function parseResponse(
    response
  ) {

    const contentType =
      response.headers.get(
        "content-type"
      ) || "";


    if (
      contentType.includes(
        "application/json"
      )
    ) {

      try {

        return await response.json();

      } catch {

        return {};
      }
    }


    const text =
      await response.text();


    return text
      ? {
          message: text
        }
      : {};
  }


  /* =======================================================
     ERROR CREATOR
     ======================================================= */

  function createAPIError(
    response,
    data
  ) {

    let message =
      "The request could not be completed.";


    if (
      data &&
      typeof data === "object"
    ) {

      message =
        data.message ||
        data.error ||
        data.detail ||
        message;
    }


    if (
      response.status === 400
    ) {
      message =
        data?.message ||
        "The request contains invalid information.";
    }


    if (
      response.status === 401
    ) {
      message =
        data?.message ||
        "Your session has expired. Please sign in again.";
    }


    if (
      response.status === 403
    ) {
      message =
        data?.message ||
        "You do not have permission to perform this action.";
    }


    if (
      response.status === 404
    ) {
      message =
        data?.message ||
        "The requested resource was not found.";
    }


    if (
      response.status === 409
    ) {
      message =
        data?.message ||
        "This request conflicts with existing information.";
    }


    if (
      response.status >= 500
    ) {
      message =
        data?.message ||
        "The server encountered an error. Please try again later.";
    }


    const error =
      new Error(message);


    error.status =
      response.status;

    error.data =
      data;

    error.response =
      response;


    return error;
  }


  /* =======================================================
     AUTH FAILURE HANDLER
     ======================================================= */

  function handleUnauthorized() {

    removeToken();

    /*
     * Do not automatically redirect every API call.
     * Public pages such as signup and login need to
     * handle authentication errors themselves.
     */

    const path =
      window.location.pathname
        .toLowerCase();


    const publicPages = [
      "login.html",
      "signup.html",
      "register.html",
      "index.html",
      "about.html",
      "contact.html",
      "support.html",
      "privacy.html",
      "terms.html",
      "security.html"
    ];


    const currentPage =
      path.split("/").pop();


    if (
      publicPages.includes(
        currentPage
      )
    ) {
      return;
    }


    try {

      localStorage.setItem(
        CONFIG.redirectKey,
        window.location.href
      );

    } catch {
      /* Ignore storage errors. */
    }


    /*
     * Root-relative redirect keeps the
     * authentication flow consistent.
     */

    window.location.href =
      "/login.html";
  }


  /* =======================================================
     CORE REQUEST METHOD
     ======================================================= */

  async function request(
    endpoint,
    options = {}
  ) {

    const {

      method = "GET",

      query = null,

      body = undefined,

      headers = {},

      timeout = CONFIG.timeout,

      skipAuth = false

    } = options;


    const url =
      buildURL(
        endpoint,
        query
      );


    const requestHeaders = {

      "Accept":
        "application/json",

      ...headers
    };


    const token =
      getToken();


    if (
      token &&
      !skipAuth
    ) {

      requestHeaders[
        "Authorization"
      ] =
        `Bearer ${token}`;
    }


    let requestBody =
      body;


    /*
     * Automatically convert normal JavaScript
     * objects to JSON.
     *
     * FormData is left untouched.
     */

    if (
      body !== undefined &&
      body !== null &&
      !(body instanceof FormData) &&
      typeof body === "object"
    ) {

      requestHeaders[
        "Content-Type"
      ] =
        "application/json";


      requestBody =
        JSON.stringify(body);
    }


    const timeoutController =
      createTimeoutSignal(
        timeout
      );


    let response;


    try {

      response =
        await fetch(
          url,
          {
            method,

            headers:
              requestHeaders,

            body:
              requestBody,

            credentials:
              "same-origin",

            signal:
              timeoutController.signal
          }
        );

    } catch (error) {

      timeoutController.cleanup();


      if (
        error.name ===
        "AbortError"
      ) {

        const timeoutError =
          new Error(
            "The request timed out. Please check your connection and try again."
          );

        timeoutError.code =
          "TIMEOUT";

        throw timeoutError;
      }


      const networkError =
        new Error(
          "Unable to connect to Global TrustFund services. Please check your internet connection."
        );

      networkError.code =
        "NETWORK_ERROR";

      networkError.original =
        error;

      throw networkError;

    } finally {

      timeoutController.cleanup();
    }


    const data =
      await parseResponse(
        response
      );


    if (
      response.status === 401
    ) {

      handleUnauthorized();
    }


    if (!response.ok) {

      throw createAPIError(
        response,
        data
      );
    }


    return data;
  }


  /* =======================================================
     HTTP METHODS
     ======================================================= */

  async function get(
    endpoint,
    query = null,
    options = {}
  ) {

    return request(
      endpoint,
      {
        ...options,
        method: "GET",
        query
      }
    );
  }


  async function post(
    endpoint,
    body = {},
    options = {}
  ) {

    return request(
      endpoint,
      {
        ...options,
        method: "POST",
        body
      }
    );
  }


  async function put(
    endpoint,
    body = {},
    options = {}
  ) {

    return request(
      endpoint,
      {
        ...options,
        method: "PUT",
        body
      }
    );
  }


  async function patch(
    endpoint,
    body = {},
    options = {}
  ) {

    return request(
      endpoint,
      {
        ...options,
        method: "PATCH",
        body
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


  /* =======================================================
     AUTH API
     ======================================================= */

  const auth = {

    async signup(data) {

      const response =
        await post(
          "/auth/signup",
          data,
          {
            skipAuth: true
          }
        );


      /*
       * Support different backend response
       * structures without forcing every
       * frontend page to know the backend format.
       */

      if (
        response?.token
      ) {
        saveToken(
          response.token
        );
      }


      if (
        response?.access_token
      ) {
        saveToken(
          response.access_token
        );
      }


      if (
        response?.user
      ) {
        saveUser(
          response.user
        );
      }


      return response;
    },


    async login(
      email,
      password
    ) {

      const response =
        await post(
          "/auth/login",
          {
            email,
            password
          },
          {
            skipAuth: true
          }
        );


      const token =
        response?.token ||
        response?.access_token ||
        response?.session?.access_token;


      if (token) {
        saveToken(token);
      }


      const user =
        response?.user ||
        response?.profile ||
        response?.customer;


      if (user) {
        saveUser(user);
      }


      return response;
    },


    async logout() {

      try {

        await post(
          "/auth/logout",
          {},
          {
            timeout: 10000
          }
        );

      } catch (error) {

        /*
         * Local logout must still happen if
         * the server is unreachable.
         */

        console.warn(
          "Server logout failed.",
          error
        );
      }


      removeToken();
      removeUser();

      return true;
    },


    async me() {

      return get(
        "/users/me"
      );
    },


    async refresh() {

      const response =
        await post(
          "/auth/refresh",
          {}
        );


      const token =
        response?.token ||
        response?.access_token;


      if (token) {
        saveToken(token);
      }


      return response;
    },


    async forgotPassword(
      email
    ) {

      return post(
        "/auth/forgot-password",
        {
          email
        },
        {
          skipAuth: true
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
        },
        {
          skipAuth: true
        }
      );
    }
  };


  /* =======================================================
     USER API
     ======================================================= */

  const users = {

    async me() {

      return get(
        "/users/me"
      );
    },


    async updateMe(
      data
    ) {

      return patch(
        "/users/me",
        data
      );
    },


    async profile() {

      return get(
        "/users/me/profile"
      );
    },


    async updateProfile(
      data
    ) {

      return patch(
        "/users/me/profile",
        data
      );
    }
  };


  /* =======================================================
     ACCOUNT API
     ======================================================= */

  const accounts = {

    async list(
      query = {}
    ) {

      return get(
        "/accounts",
        query
      );
    },


    async get(
      accountId
    ) {

      return get(
        `/accounts/${encodeURIComponent(
          accountId
        )}`
      );
    },


    async balance(
      accountId
    ) {

      return get(
        `/accounts/${encodeURIComponent(
          accountId
        )}/balance`
      );
    },


    async transactions(
      accountId,
      query = {}
    ) {

      return get(
        `/accounts/${encodeURIComponent(
          accountId
        )}/transactions`,
        query
      );
    }
  };


  /* =======================================================
     TRANSACTION API
     ======================================================= */

  const transactions = {

    async list(
      query = {}
    ) {

      return get(
        "/transactions",
        query
      );
    },


    async get(
      transactionId
    ) {

      return get(
        `/transactions/${encodeURIComponent(
          transactionId
        )}`
      );
    },


    async create(
      data
    ) {

      return post(
        "/transactions",
        data
      );
    }
  };


  /* =======================================================
     TRANSFER API
     ======================================================= */

  const transfers = {

    async list(
      query = {}
    ) {

      return get(
        "/transfers",
        query
      );
    },


    async create(
      data
    ) {

      return post(
        "/transfers",
        data
      );
    },


    async get(
      transferId
    ) {

      return get(
        `/transfers/${encodeURIComponent(
          transferId
        )}`
      );
    },


    async cancel(
      transferId
    ) {

      return post(
        `/transfers/${encodeURIComponent(
          transferId
        )}/cancel`
      );
    }
  };


  /* =======================================================
     PAYMENT API
     ======================================================= */

  const payments = {

    async list(
      query = {}
    ) {

      return get(
        "/payments",
        query
      );
    },


    async create(
      data
    ) {

      return post(
        "/payments",
        data
      );
    },


    async get(
      paymentId
    ) {

      return get(
        `/payments/${encodeURIComponent(
          paymentId
        )}`
      );
    }
  };


  /* =======================================================
     BENEFICIARY API
     ======================================================= */

  const beneficiaries = {

    async list() {

      return get(
        "/beneficiaries"
      );
    },


    async create(
      data
    ) {

      return post(
        "/beneficiaries",
        data
      );
    },


    async update(
      beneficiaryId,
      data
    ) {

      return patch(
        `/beneficiaries/${encodeURIComponent(
          beneficiaryId
        )}`,
        data
      );
    },


    async remove(
      beneficiaryId
    ) {

      return del(
        `/beneficiaries/${encodeURIComponent(
          beneficiaryId
        )}`
      );
    }
  };


  /* =======================================================
     CARDS API
     ======================================================= */

  const cards = {

    async list() {

      return get(
        "/cards"
      );
    },


    async get(
      cardId
    ) {

      return get(
        `/cards/${encodeURIComponent(
          cardId
        )}`
      );
    },


    async freeze(
      cardId
    ) {

      return post(
        `/cards/${encodeURIComponent(
          cardId
        )}/freeze`
      );
    },


    async unfreeze(
      cardId
    ) {

      return post(
        `/cards/${encodeURIComponent(
          cardId
        )}/unfreeze`
      );
    }
  };


  /* =======================================================
     SUPPORT API
     ======================================================= */

  const support = {

    async tickets(
      query = {}
    ) {

      return get(
        "/support/tickets",
        query
      );
    },


    async createTicket(
      data
    ) {

      return post(
        "/support/tickets",
        data
      );
    },


    async getTicket(
      ticketId
    ) {

      return get(
        `/support/tickets/${encodeURIComponent(
          ticketId
        )}`
      );
    }
  };


  /* =======================================================
     DASHBOARD API
     ======================================================= */

  const dashboard = {

    async summary() {

      return get(
        "/dashboard/summary"
      );
    }
  };


  /* =======================================================
     ROLE API
     ======================================================= */

  const roles = {

    async me() {

      return get(
        "/roles/me"
      );
    }
  };


  /* =======================================================
     HEALTH API
     ======================================================= */

  const health = {

    async check() {

      return get(
        "/health",
        null,
        {
          skipAuth: true,
          timeout: 10000
        }
      );
    }
  };


  /* =======================================================
     PUBLIC API
     ======================================================= */

  const GTF_API = {

    config: CONFIG,

    request,

    get,

    post,

    put,

    patch,

    delete: del,

    auth,

    users,

    accounts,

    transactions,

    transfers,

    payments,

    beneficiaries,

    cards,

    support,

    dashboard,

    roles,

    health,

    storage: {

      getToken,

      saveToken,

      removeToken,

      getUser,

      saveUser,

      removeUser
    }
  };


  /* =======================================================
     GLOBAL EXPORT
     ======================================================= */

  window.GTF_API =
    GTF_API;


})(window);
