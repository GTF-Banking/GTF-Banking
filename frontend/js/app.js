/*
 * ============================================================
 * GTF-Banking
 * frontend/js/app.js
 * ============================================================
 *
 * Shared frontend application controller.
 *
 * Used by:
 *   - Public pages
 *   - Login / signup pages
 *   - Customer dashboard
 *   - Accounts
 *   - Transactions
 *   - Transfers
 *   - Support
 *   - Admin pages
 *   - Cashier pages
 *
 * Backend API:
 *   /api/auth/me
 *   /api/auth/logout
 *
 * Authentication:
 *   Uses secure server-side session cookies.
 *
 * IMPORTANT:
 *   Do not store passwords, access tokens, PINs, or
 *   authentication secrets in localStorage.
 *
 * ============================================================
 */

(function () {

  "use strict";


  /* ==========================================================
     APPLICATION CONFIGURATION
  ========================================================== */

  const CONFIG = {

    name: "GTF Banking",

    version: "1.0.0",

    /*
     * Leave empty when the frontend and backend are served
     * from the same origin.
     *
     * Example for a separate backend:
     *
     * apiBase: "https://api.example.com"
     *
     * Do not put private server secrets here.
     */

    apiBase: "",


    pages: {

      home:
        "/index.html",

      login:
        "/login.html",

      signup:
        "/signup.html",

      dashboard:
        "/dashboard/index.html",

      accounts:
        "/dashboard/accounts.html",

      transactions:
        "/dashboard/transactions.html",

      transfers:
        "/dashboard/transfers.html",

      support:
        "/dashboard/support.html",

      adminLogin:
        "/admin/login.html",

      adminDashboard:
        "/admin/index.html",

      cashierLogin:
        "/cashier/login.html",

      cashierDashboard:
        "/cashier/index.html"

    },


    endpoints: {

      me:
        "/api/auth/me",

      logout:
        "/api/auth/logout"

    }

  };


  /* ==========================================================
     APPLICATION STATE
  ========================================================== */

  const state = {

    initialized:
      false,

    authenticated:
      false,

    loadingUser:
      false,

    user:
      null,

    lastError:
      null

  };


  /* ==========================================================
     DOM HELPERS
  ========================================================== */

  function $(selector) {

    if (
      typeof selector !==
      "string"
    ) {

      return selector || null;

    }


    return document.querySelector(
      selector
    );

  }


  function $$(selector) {

    if (
      typeof selector !==
      "string"
    ) {

      return [];

    }


    return Array.from(
      document.querySelectorAll(
        selector
      )
    );

  }


  /* ==========================================================
     HTML ESCAPING
  ========================================================== */

  function escapeHtml(value) {

    if (
      value === null ||
      value === undefined
    ) {

      return "";

    }


    return String(value)
      .replaceAll(
        "&",
        "&amp;"
      )
      .replaceAll(
        "<",
        "&lt;"
      )
      .replaceAll(
        ">",
        "&gt;"
      )
      .replaceAll(
        '"',
        "&quot;"
      )
      .replaceAll(
        "'",
        "&#039;"
      );

  }


  /* ==========================================================
     API URL
  ========================================================== */

  function apiUrl(endpoint) {

    if (
      !endpoint
    ) {

      return CONFIG.apiBase;

    }


    if (
      /^https?:\/\//i.test(
        endpoint
      )
    ) {

      return endpoint;

    }


    const base =
      String(
        CONFIG.apiBase || ""
      ).replace(
        /\/$/,
        ""
      );


    const path =
      String(endpoint)
        .replace(
          /^\//,
          ""
        );


    return `${base}/${path}`;

  }


  /* ==========================================================
     API REQUEST
  ========================================================== */

  async function apiRequest(
    endpoint,
    options = {}
  ) {

    const {

      method = "GET",

      body = undefined,

      headers = {},

      signal = undefined

    } = options;


    const requestHeaders = {

      Accept:
        "application/json",

      ...headers

    };


    let requestBody =
      body;


    /*
     * Automatically convert JavaScript objects
     * to JSON.
     */

    if (
      body !== undefined &&
      body !== null &&
      typeof body !== "string" &&
      !(body instanceof FormData)
    ) {

      requestHeaders[
        "Content-Type"
      ] =
        "application/json";


      requestBody =
        JSON.stringify(
          body
        );

    }


    /*
     * Do not manually attach authentication
     * tokens here.
     *
     * The application uses credentials: include
     * so secure server-side cookies can be used.
     */

    let response;


    try {

      response =
        await fetch(
          apiUrl(
            endpoint
          ),
          {

            method,

            credentials:
              "include",

            headers:
              requestHeaders,

            body:
              requestBody,

            signal

          }
        );

    } catch (error) {

      const networkError =
        new Error(
          "Unable to connect to the GTF Banking server."
        );


      networkError.code =
        "NETWORK_ERROR";


      networkError.originalError =
        error;


      state.lastError =
        networkError;


      throw networkError;

    }


    let data =
      null;


    const contentType =
      response.headers.get(
        "content-type"
      ) || "";


    /*
     * Parse JSON responses.
     */

    if (
      contentType.includes(
        "application/json"
      )
    ) {

      try {

        data =
          await response.json();

      } catch {

        data =
          null;

      }

    } else {

      /*
       * Some backend endpoints may return
       * plain text.
       */

      try {

        const text =
          await response.text();


        data =
          text
            ? {
                message:
                  text
              }
            : null;

      } catch {

        data =
          null;

      }

    }


    /*
     * Handle HTTP errors.
     */

    if (
      !response.ok
    ) {

      const errorMessage =

        data?.message ||

        data?.error ||

        (
          response.status === 400
            ? "The request was invalid."
            : response.status === 401
              ? "Authentication is required."
              : response.status === 403
                ? "You are not authorized to perform this action."
                : response.status === 404
                  ? "The requested resource was not found."
                  : response.status === 409
                    ? "The request conflicts with existing information."
                    : response.status >= 500
                      ? "The banking server encountered an error."
                      : "The request could not be completed."
        );


      const error =
        new Error(
          errorMessage
        );


      error.status =
        response.status;


      error.data =
        data;


      state.lastError =
        error;


      /*
       * A 401 means the current session is
       * no longer authenticated.
       */

      if (
        response.status === 401
      ) {

        state.authenticated =
          false;

        state.user =
          null;

      }


      throw error;

    }


    state.lastError =
      null;


    return data;

  }


  /* ==========================================================
     CURRENT USER
  ========================================================== */

  async function getCurrentUser(
    options = {}
  ) {

    /*
     * Avoid duplicate simultaneous requests.
     */

    if (
      state.loadingUser
    ) {

      return state.user;

    }


    state.loadingUser =
      true;


    try {

      const data =
        await apiRequest(
          CONFIG.endpoints.me,
          options
        );


      const user =
        data?.user ||
        data?.data?.user ||
        null;


      state.user =
        user;


      state.authenticated =
        Boolean(
          user
        );


      return user;

    } catch (error) {

      state.user =
        null;

      state.authenticated =
        false;


      /*
       * Authentication failure is normal on
       * public pages, so do not automatically
       * display an error there.
       */

      if (
        error.status !== 401 &&
        error.status !== 403
      ) {

        console.warn(
          "Unable to retrieve current user:",
          error
        );

      }


      return null;

    } finally {

      state.loadingUser =
        false;

    }

  }


  function getUser() {

    return state.user;

  }


  function isAuthenticated() {

    return (
      state.authenticated === true
    );

  }


  /* ==========================================================
     AUTHENTICATION GUARD
  ========================================================== */

  async function requireAuth(
    options = {}
  ) {

    const {

      redirect = true,

      loginPage =
        CONFIG.pages.login

    } = options;


    const user =
      await getCurrentUser();


    if (
      user
    ) {

      return user;

    }


    if (
      redirect
    ) {

      redirectTo(
        loginPage
      );

    }


    return null;

  }


  /* ==========================================================
     LOGOUT
  ========================================================== */

  async function logout(
    options = {}
  ) {

    const {

      redirect = true,

      redirectToPage =
        CONFIG.pages.login

    } = options;


    try {

      await apiRequest(
        CONFIG.endpoints.logout,
        {
          method:
            "POST"
        }
      );

    } catch (error) {

      /*
       * Always clear local application state
       * even if the server request fails.
       */

      console.warn(
        "Logout request failed:",
        error
      );

    } finally {

      state.user =
        null;

      state.authenticated =
        false;


      if (
        redirect
      ) {

        redirectTo(
          redirectToPage
        );

      }

    }

  }


  /* ==========================================================
     LOGOUT BUTTONS
  ========================================================== */

  function bindLogoutButtons() {

    const buttons =
      $$(
        "[data-gtf-logout], #logoutButton, #logoutBtn"
      );


    buttons.forEach(
      button => {

        if (
          button.dataset.gtfLogoutBound ===
          "true"
        ) {

          return;

        }


        button.dataset.gtfLogoutBound =
          "true";


        button.addEventListener(
          "click",
          async event => {

            event.preventDefault();


            if (
              button.disabled
            ) {

              return;

            }


            const originalText =
              button.textContent;


            button.disabled =
              true;


            button.setAttribute(
              "aria-busy",
              "true"
            );


            button.textContent =
              "Signing out...";


            try {

              await logout();

            } finally {

              button.disabled =
                false;

              button.removeAttribute(
                "aria-busy"
              );

              button.textContent =
                originalText;

            }

          }
        );

      }
    );

  }


  /* ==========================================================
     NAVIGATION
  ========================================================== */

  function redirectTo(
    path
  ) {

    if (
      !path
    ) {

      return;

    }


    window.location.assign(
      path
    );

  }


  function goHome() {

    redirectTo(
      CONFIG.pages.home
    );

  }


  function goToLogin() {

    redirectTo(
      CONFIG.pages.login
    );

  }


  function goToDashboard() {

    redirectTo(
      CONFIG.pages.dashboard
    );

  }


  function goToAdminLogin() {

    redirectTo(
      CONFIG.pages.adminLogin
    );

  }


  function goToCashierLogin() {

    redirectTo(
      CONFIG.pages.cashierLogin
    );

  }


  /* ==========================================================
     CURRENT PAGE
  ========================================================== */

  function currentPageName() {

    const pathname =
      window.location.pathname;


    const parts =
      pathname.split(
        "/"
      );


    return (
      parts.pop() ||
      "index.html"
    );

  }


  function currentPath() {

    return normalizePath(
      window.location.pathname
    );

  }


  function normalizePath(
    path
  ) {

    if (
      !path
    ) {

      return "/";

    }


    let normalized =
      String(path)
        .replace(
          /\/+/g,
          "/"
        );


    if (
      normalized.length > 1 &&
      normalized.endsWith(
        "/"
      )
    ) {

      normalized =
        normalized.slice(
          0,
          -1
        );

    }


    return normalized;

  }


  /* ==========================================================
     ACTIVE NAVIGATION
  ========================================================== */

  function markActiveNavigation() {

    const current =
      currentPath();


    $$(
      "a[href]"
    )
      .forEach(
        link => {

          const href =
            link.getAttribute(
              "href"
            );


          if (
            !href ||
            href.startsWith(
              "#"
            ) ||
            href.startsWith(
              "javascript:"
            ) ||
            href.startsWith(
              "mailto:"
            ) ||
            href.startsWith(
              "tel:"
            )
          ) {

            return;

          }


          let linkPath;


          try {

            linkPath =
              normalizePath(
                new URL(
                  href,
                  window.location.href
                ).pathname
              );

          } catch {

            return;

          }


          if (
            linkPath === current
          ) {

            link.classList.add(
              "active"
            );


            link.setAttribute(
              "aria-current",
              "page"
            );

          }

        }
      );

  }


  /* ==========================================================
     USER DISPLAY
  ========================================================== */

  function getUserName(
    user
  ) {

    if (
      !user
    ) {

      return "Customer";

    }


    const firstName =
      user.first_name ||
      user.firstName ||
      "";


    const lastName =
      user.last_name ||
      user.lastName ||
      "";


    const fullName =
      user.name ||
      user.full_name ||
      user.fullName ||
      `${firstName} ${lastName}`
        .trim();


    return (
      fullName ||
      "Customer"
    );

  }


  function getUserEmail(
    user
  ) {

    return (
      user?.email ||
      ""
    );

  }


  function getUserRole(
    user
  ) {

    return (
      user?.role ||
      user?.user_role ||
      user?.userRole ||
      ""
    );

  }


  function displayUserInformation(
    user = state.user
  ) {

    if (
      !user
    ) {

      return;

    }


    const name =
      getUserName(
        user
      );


    const email =
      getUserEmail(
        user
      );


    const role =
      getUserRole(
        user
      );


    $$(
      "[data-user-name]"
    )
      .forEach(
        element => {

          element.textContent =
            name;

        }
      );


    $$(
      "[data-user-email]"
    )
      .forEach(
        element => {

          element.textContent =
            email;

        }
      );


    $$(
      "[data-user-role]"
    )
      .forEach(
        element => {

          element.textContent =
            role;

        }
      );


    $$(

      "#userName"

    )
      .forEach(
        element => {

          element.textContent =
            name;

        }
      );


    $$(
      "#userEmail"
    )
      .forEach(
        element => {

          element.textContent =
            email;

        }
      );


    $$(
      "#userRole"
    )
      .forEach(
        element => {

          element.textContent =
            role;

        }
      );

  }


  /* ==========================================================
     LOADING STATE
  ========================================================== */

  function setLoading(
    element,
    loading,
    loadingText = "Loading..."
  ) {

    const target =
      getElement(
        element
      );


    if (
      !target
    ) {

      return;

    }


    if (
      loading
    ) {

      if (
        !target.dataset.gtfOriginalText
      ) {

        target.dataset.gtfOriginalText =
          target.textContent;

      }


      target.disabled =
        true;


      target.setAttribute(
        "aria-busy",
        "true"
      );


      target.textContent =
        loadingText;

    } else {

      target.disabled =
        false;


      target.removeAttribute(
        "aria-busy"
      );


      if (
        target.dataset.gtfOriginalText
      ) {

        target.textContent =
          target.dataset.gtfOriginalText;


        delete target.dataset
          .gtfOriginalText;

      }

    }

  }


  /* ==========================================================
     LOADING ELEMENTS
  ========================================================== */

  function showLoading(
    element,
    text = "Loading..."
  ) {

    const target =
      getElement(
        element
      );


    if (
      !target
    ) {

      return;

    }


    target.dataset
      .gtfPreviousContent =
      target.innerHTML;


    target.innerHTML = `
      <span
        aria-live="polite"
      >
        ${escapeHtml(text)}
      </span>
    `;

  }


  function hideLoading(
    element
  ) {

    const target =
      getElement(
        element
      );


    if (
      !target
    ) {

      return;

    }


    if (
      target.dataset
        .gtfPreviousContent !==
      undefined
    ) {

      target.innerHTML =
        target.dataset
          .gtfPreviousContent;


      delete target.dataset
        .gtfPreviousContent;

    }

  }


  /* ==========================================================
     NOTIFICATIONS
  ========================================================== */

  function getNotificationContainer() {

    let container =
      document.querySelector(
        "[data-gtf-notifications]"
      );


    if (
      container
    ) {

      return container;

    }


    container =
      document.createElement(
        "div"
      );


    container.setAttribute(
      "data-gtf-notifications",
      "true"
    );


    Object.assign(
      container.style,
      {

        position:
          "fixed",

        top:
          "20px",

        right:
          "20px",

        zIndex:
          "99999",

        width:
          "min(360px, calc(100vw - 40px))",

        display:
          "flex",

        flexDirection:
          "column",

        gap:
          "10px"

      }
    );


    document.body.appendChild(
      container
    );


    return container;

  }


  function showNotification(
    message,
    type = "info",
    duration = 5000
  ) {

    if (
      message === null ||
      message === undefined
    ) {

      return null;

    }


    const container =
      getNotificationContainer();


    const notification =
      document.createElement(
        "div"
      );


    const safeType =
      [
        "success",
        "error",
        "warning",
        "info"
      ].includes(
        type
      )
        ? type
        : "info";


    notification.setAttribute(
      "role",
      safeType === "error"
        ? "alert"
        : "status"
    );


    notification.setAttribute(
      "data-type",
      safeType
    );


    notification.textContent =
      String(message);


    Object.assign(
      notification.style,
      {

        padding:
          "12px 14px",

        border:
          "1px solid #d9e1e8",

        borderRadius:
          "7px",

        background:
          "#ffffff",

        color:
          "#172b3a",

        boxShadow:
          "0 5px 20px rgba(0,0,0,.10)",

        fontFamily:
          "Arial, Helvetica, sans-serif",

        fontSize:
          "13px",

        lineHeight:
          "1.45"

      }
    );


    if (
      safeType ===
      "success"
    ) {

      notification.style.borderColor =
        "#b9dec9";

    }


    if (
      safeType ===
      "error"
    ) {

      notification.style.borderColor =
        "#efc1bc";

    }


    if (
      safeType ===
      "warning"
    ) {

      notification.style.borderColor =
        "#ead8a6";

    }


    container.appendChild(
      notification
    );


    if (
      duration > 0
    ) {

      window.setTimeout(
        () => {

          notification.remove();


          if (
            container.children.length ===
            0
          ) {

            container.remove();

          }

        },
        duration
      );

    }


    return notification;

  }


  /* ==========================================================
     LOGO INITIALIZATION
  ========================================================== */

  function configureLogos() {

    $$(
      "[data-gtf-logo]"
    )
      .forEach(
        logo => {

          if (
            logo.tagName.toLowerCase() !==
            "img"
          ) {

            return;

          }


          if (
            !logo.getAttribute(
              "alt"
            )
          ) {

            logo.alt =
              "GTF Banking";

          }


          /*
           * Do not overwrite an explicitly
           * configured image source.
           */

          if (
            !logo.getAttribute(
              "src"
            )
          ) {

            logo.src =
              "../assets/gtf-logo.svg";

          }

        }
      );

  }


  /* ==========================================================
     FORM HELPERS
  ========================================================== */

  function clearForm(
    form
  ) {

    const target =
      getElement(
        form
      );


    if (
      !target
    ) {

      return;

    }


    if (
      typeof target.reset ===
      "function"
    ) {

      target.reset();

    }


    $$(
      ".is-invalid",
    )
      .forEach(
        element => {

          element.classList.remove(
            "is-invalid"
          );

        }
      );

  }


  function preventDoubleSubmit() {

    $$(
      "form[data-prevent-double-submit]"
    )
      .forEach(
        form => {

          if (
            form.dataset
              .gtfDoubleSubmitBound ===
            "true"
          ) {

            return;

          }


          form.dataset
            .gtfDoubleSubmitBound =
            "true";


          form.addEventListener(
            "submit",
            () => {

              const buttons =
                form.querySelectorAll(
                  'button[type="submit"], input[type="submit"]'
                );


              buttons.forEach(
                button => {

                  button.disabled =
                    true;

                }
              );

            }
          );

        }
      );

  }


  /* ==========================================================
     LOCAL STORAGE HELPERS
  ========================================================== */

  /*
   * Only non-sensitive application preferences
   * should be stored here.
   *
   * Never use this helper to store:
   *   - passwords
   *   - PINs
   *   - session secrets
   *   - authentication tokens
   */

  function storageGet(
    key
  ) {

    try {

      const value =
        localStorage.getItem(
          key
        );


      if (
        value === null
      ) {

        return null;

      }


      return JSON.parse(
        value
      );

    } catch {

      return null;

    }

  }


  function storageSet(
    key,
    value
  ) {

    try {

      localStorage.setItem(
        key,
        JSON.stringify(
          value
        )
      );


      return true;

    } catch {

      return false;

    }

  }


  function storageRemove(
    key
  ) {

    try {

      localStorage.removeItem(
        key
      );


      return true;

    } catch {

      return false;

    }

  }


  /* ==========================================================
     FORMATTERS
  ========================================================== */

  function formatMoney(
    amount,
    currency = "USD"
  ) {

    const numericAmount =
      Number(
        amount
      );


    if (
      !Number.isFinite(
        numericAmount
      )
    ) {

      return "—";

    }


    const code =
      String(
        currency || "USD"
      )
      .toUpperCase();


    try {

      return new Intl.NumberFormat(
        undefined,
        {

          style:
            "currency",

          currency:
            code,

          minimumFractionDigits:
            2,

          maximumFractionDigits:
            2

        }
      )
        .format(
          numericAmount
        );

    } catch {

      return `${numericAmount.toFixed(2)} ${code}`;

    }

  }


  function formatDate(
    value
  ) {

    if (
      !value
    ) {

      return "—";

    }


    const date =
      new Date(
        value
      );


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return "—";

    }


    return date.toLocaleString(
      undefined,
      {

        year:
          "numeric",

        month:
          "short",

        day:
          "numeric",

        hour:
          "2-digit",

        minute:
          "2-digit"

      }
    );

  }


  function formatStatus(
    value
  ) {

    return String(
      value || ""
    )
      .replaceAll(
        "_",
        " "
      )
      .replace(
        /\b\w/g,
        character =>
          character.toUpperCase()
      );

  }


  /* ==========================================================
     AUTH PAGE REDIRECTION
  ========================================================== */

  function isPublicPage() {

    const path =
      currentPath();


    const publicPaths = [

      "/",

      "/index.html",

      "/login.html",

      "/signup.html",

      "/support.html"

    ];


    return publicPaths.includes(
      path
    );

  }


  async function initializeProtectedPage() {

    const requiresAuth =
      document.body.dataset.requiresAuth ===
      "true";


    if (
      !requiresAuth
    ) {

      return null;

    }


    const user =
      await requireAuth(
        {
          redirect:
            true
        }
      );


    if (
      user
    ) {

      displayUserInformation(
        user
      );

    }


    return user;

  }


  /* ==========================================================
     GLOBAL ERROR HANDLERS
  ========================================================== */

  function configureErrorHandling() {

    window.addEventListener(
      "unhandledrejection",
      event => {

        console.error(
          "GTF Banking unhandled promise rejection:",
          event.reason
        );

      }
    );


    window.addEventListener(
      "error",
      event => {

        console.error(
          "GTF Banking frontend error:",
          event.error ||
          event.message
        );

      }
    );

  }


  /* ==========================================================
     PUBLIC APPLICATION API
  ========================================================== */

  window.GTFBanking = {

    config:
      CONFIG,

    state,

    $,

    $$,

    apiUrl,

    apiRequest,

    getCurrentUser,

    getUser,

    isAuthenticated,

    requireAuth,

    logout,

    redirectTo,

    goHome,

    goToLogin,

    goToDashboard,

    goToAdminLogin,

    goToCashierLogin,

    currentPageName,

    currentPath,

    normalizePath,

    markActiveNavigation,

    displayUserInformation,

    getUserName,

    getUserEmail,

    getUserRole,

    setLoading,

    showLoading,

    hideLoading,

    showNotification,

    configureLogos,

    clearForm,

    storageGet,

    storageSet,

    storageRemove,

    escapeHtml,

    formatMoney,

    formatDate,

    formatStatus

  };


  /* ==========================================================
     INITIALIZATION
  ========================================================== */

  async function initialize() {

    if (
      state.initialized
    ) {

      return;

    }


    state.initialized =
      true;


    configureErrorHandling();

    bindLogoutButtons();

    markActiveNavigation();

    configureLogos();

    preventDoubleSubmit();


    try {

      const user =
        await initializeProtectedPage();


      if (
        user
      ) {

        displayUserInformation(
          user
        );

      }

    } catch (error) {

      console.error(
        "GTF Banking initialization error:",
        error
      );

    }

  }


  /* ==========================================================
     DOM READY
  ========================================================== */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      {
        once:
          true
      }
    );

  } else {

    initialize();

  }


})();