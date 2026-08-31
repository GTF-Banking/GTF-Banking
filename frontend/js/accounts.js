/* ============================================================
   GLOBAL TRUSTFUND
   ACCOUNTS.JS
   ------------------------------------------------------------
   Customer account management controller.

   Intended pages:
     frontend/dashboard/accounts.html
     frontend/dashboard/index.html

   Shared dependencies:
     ../js/api.js
     ../js/auth.js
     ../js/app.js
     ../js/logo-loader.js
     ../js/logo-guard.js
     ../js/dashboard.js

   Responsibilities:
     - Load customer accounts
     - Display account cards
     - Display balances
     - Display account status
     - Mask account numbers
     - Copy account numbers
     - Filter accounts
     - Refresh account information
     - Handle loading/error/empty states
     - Navigate safely between dashboard pages

   IMPORTANT:
     Account information must ultimately come from the
     authenticated backend. This file does not create or
     authorize financial accounts.
   ============================================================ */

(function (window, document) {
  "use strict";


  /* ==========================================================
     CONFIGURATION
     ========================================================== */

  const CONFIG = {

    apiBase: "/api",

    dashboardPage: "index.html",

    accountsPage: "accounts.html",

    loginPage: "../login.html",

    selectors: {

      accountList:
        "[data-account-list]",

      accountCount:
        "[data-account-count]",

      totalBalance:
        "[data-total-balance]",

      availableBalance:
        "[data-total-available]",

      accountSearch:
        "[data-account-search]",

      accountFilter:
        "[data-account-filter]",

      refresh:
        "[data-accounts-refresh]",

      loading:
        "[data-accounts-loading]",

      error:
        "[data-accounts-error]",

      empty:
        "[data-accounts-empty]",

      status:
        "[data-accounts-status]"

    }

  };


  /* ==========================================================
     STATE
     ========================================================== */

  const state = {

    initialized: false,

    loading: false,

    accounts: [],

    filteredAccounts: [],

    currency: "USD",

    search:
      "",

    filter:
      "all"

  };


  /* ==========================================================
     DOM HELPERS
     ========================================================== */

  function $(selector, parent = document) {
    return parent.querySelector(selector);
  }


  function $$(selector, parent = document) {
    return Array.from(
      parent.querySelectorAll(selector)
    );
  }


  /* ==========================================================
     HTML ESCAPING
     ========================================================== */

  function escapeHTML(value) {

    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  /* ==========================================================
     CURRENCY FORMATTER
     ========================================================== */

  function formatCurrency(
    amount,
    currency = state.currency
  ) {

    const value =
      Number(amount);


    if (
      !Number.isFinite(value)
    ) {
      return "—";
    }


    try {

      return new Intl.NumberFormat(
        "en-US",
        {
          style: "currency",
          currency: currency || "USD"
        }
      ).format(value);

    } catch {

      return `${currency || "USD"} ${value.toFixed(2)}`;

    }

  }


  /* ==========================================================
     API REQUEST
     ----------------------------------------------------------
     Prefer the shared api.js implementation.
     ========================================================== */

  async function apiRequest(
    endpoint,
    options = {}
  ) {

    if (
      window.GTF_API &&
      typeof window.GTF_API.request ===
      "function"
    ) {

      return window.GTF_API.request(
        endpoint,
        options
      );

    }


    if (
      window.GTF_API &&
      typeof window.GTF_API.get ===
      "function" &&
      (
        !options.method ||
        options.method.toUpperCase() === "GET"
      )
    ) {

      return window.GTF_API.get(
        endpoint,
        options
      );

    }


    const response =
      await fetch(
        CONFIG.apiBase + endpoint,
        {
          credentials: "include",

          headers: {
            "Content-Type":
              "application/json",

            ...(options.headers || {})
          },

          ...options
        }
      );


    let data = null;


    try {

      data =
        await response.json();

    } catch {

      data = null;

    }


    if (
      !response.ok
    ) {

      const error =
        new Error(
          data?.message ||
          data?.error ||
          `Request failed (${response.status})`
        );


      error.status =
        response.status;


      error.data =
        data;


      throw error;

    }


    return data;

  }


  /* ==========================================================
     AUTHENTICATION
     ========================================================== */

  async function verifyAuthentication() {

    /*
     * If auth.js exposes requireAuth(),
     * use it first.
     */

    if (
      window.GTF_AUTH &&
      typeof window.GTF_AUTH.requireAuth ===
      "function"
    ) {

      try {

        const result =
          await window.GTF_AUTH.requireAuth();


        if (
          result === false
        ) {

          redirectToLogin();

          return false;

        }

      } catch (error) {

        console.warn(
          "Authentication check failed:",
          error
        );

        redirectToLogin();

        return false;

      }

    }


    return true;

  }


  /* ==========================================================
     LOGIN REDIRECT
     ========================================================== */

  function redirectToLogin() {

    window.location.href =
      CONFIG.loginPage;

  }


  /* ==========================================================
     LOAD ACCOUNTS
     ========================================================== */

  async function loadAccounts() {

    if (
      state.loading
    ) {
      return state.accounts;
    }


    state.loading =
      true;


    setLoadingState(true);

    clearError();


    try {

      let response;


      /*
       * Preferred endpoint.
       */

      try {

        response =
          await apiRequest(
            "/users/me/accounts"
          );

      } catch (primaryError) {

        /*
         * Compatibility fallback for the
         * backend structure used elsewhere
         * in the project.
         */

        response =
          await apiRequest(
            "/accounts"
          );

      }


      const accounts =
        extractAccounts(
          response
        );


      state.accounts =
        accounts;


      state.filteredAccounts =
        accounts;


      updateCurrency(
        accounts
      );


      applyFilters();

      updateSummary();

      setLoadingState(false);

      setStatus(
        "success",
        "Account information updated"
      );


      return accounts;

    } catch (error) {

      console.error(
        "GTF Accounts:",
        error
      );


      state.accounts =
        [];


      state.filteredAccounts =
        [];


      renderAccounts([]);

      updateSummary();


      setLoadingState(false);


      showError(
        getErrorMessage(error)
      );


      setStatus(
        "error",
        "Unable to load account information"
      );


      if (
        error.status === 401 ||
        error.status === 403
      ) {

        redirectToLogin();

      }


      return [];

    } finally {

      state.loading =
        false;

    }

  }


  /* ==========================================================
     EXTRACT ACCOUNTS
     ========================================================== */

  function extractAccounts(
    response
  ) {

    if (
      Array.isArray(response)
    ) {
      return response;
    }


    if (
      Array.isArray(
        response?.accounts
      )
    ) {
      return response.accounts;
    }


    if (
      Array.isArray(
        response?.data?.accounts
      )
    ) {
      return response.data.accounts;
    }


    if (
      Array.isArray(
        response?.data
      )
    ) {
      return response.data;
    }


    return [];

  }


  /* ==========================================================
     NORMALIZE ACCOUNT
     ========================================================== */

  function normalizeAccount(
    account
  ) {

    if (
      !account ||
      typeof account !== "object"
    ) {

      return null;

    }


    const balance =
      Number(
        account.balance ??
        account.current_balance ??
        0
      );


    const availableBalance =
      Number(
        account.available_balance ??
        account.availableBalance ??
        account.balance ??
        0
      );


    return {

      id:
        account.id ||
        account.account_id ||
        "",

      name:
        account.name ||
        account.account_name ||
        account.account_type_name ||
        account.account_type ||
        "Account",

      type:
        account.account_type ||
        account.type ||
        "Bank Account",

      accountNumber:
        account.account_number ||
        account.accountNumber ||
        "",

      routingNumber:
        account.routing_number ||
        account.routingNumber ||
        "",

      balance:
        Number.isFinite(balance)
          ? balance
          : 0,

      availableBalance:
        Number.isFinite(availableBalance)
          ? availableBalance
          : 0,

      currency:
        account.currency ||
        state.currency ||
        "USD",

      status:
        account.status ||
        "Active",

      createdAt:
        account.created_at ||
        account.createdAt ||
        null,

      description:
        account.description ||
        ""

    };

  }


  /* ==========================================================
     NORMALIZE ALL ACCOUNTS
     ========================================================== */

  function normalizeAccounts(
    accounts
  ) {

    return accounts
      .map(normalizeAccount)
      .filter(Boolean);

  }


  /* ==========================================================
     UPDATE CURRENCY
     ========================================================== */

  function updateCurrency(
    accounts
  ) {

    const normalized =
      normalizeAccounts(
        accounts
      );


    if (
      normalized.length > 0 &&
      normalized[0].currency
    ) {

      state.currency =
        normalized[0].currency;

    }

  }


  /* ==========================================================
     FILTER ACCOUNTS
     ========================================================== */

  function applyFilters() {

    const normalized =
      normalizeAccounts(
        state.accounts
      );


    state.filteredAccounts =
      normalized.filter(
        account => {

          /*
           * Search filter.
           */

          const search =
            state.search
              .trim()
              .toLowerCase();


          if (
            search
          ) {

            const searchableText =
              [
                account.name,
                account.type,
                account.accountNumber,
                account.status
              ]
                .join(" ")
                .toLowerCase();


            if (
              !searchableText.includes(
                search
              )
            ) {

              return false;

            }

          }


          /*
           * Status/type filter.
           */

          const filter =
            state.filter
              .toLowerCase();


          if (
            filter !== "all"
          ) {

            const accountStatus =
              String(
                account.status
              )
                .toLowerCase();


            const accountType =
              String(
                account.type
              )
                .toLowerCase();


            if (
              !accountStatus.includes(
                filter
              ) &&
              !accountType.includes(
                filter
              )
            ) {

              return false;

            }

          }


          return true;

        }
      );


    renderAccounts(
      state.filteredAccounts
    );


    updateSummary();

  }


  /* ==========================================================
     RENDER ACCOUNTS
     ========================================================== */

  function renderAccounts(
    accounts
  ) {

    const containers =
      $$(
        CONFIG.selectors.accountList
      );


    if (
      containers.length === 0
    ) {
      return;
    }


    const normalized =
      normalizeAccounts(
        accounts
      );


    containers.forEach(
      container => {

        container.innerHTML = "";


        if (
          normalized.length === 0
        ) {

          container.innerHTML =
            createEmptyState();

          return;

        }


        normalized.forEach(
          account => {

            container.insertAdjacentHTML(
              "beforeend",
              createAccountCard(
                account
              )
            );

          }
        );

      }
    );


    initializeAccountActions();

  }


  /* ==========================================================
     ACCOUNT CARD
     ========================================================== */

  function createAccountCard(
    account
  ) {

    const accountNumber =
      account.accountNumber
        ? maskAccountNumber(
            account.accountNumber
          )
        : "Account number unavailable";


    const statusClass =
      getStatusClass(
        account.status
      );


    const accountId =
      escapeHTML(
        account.id
      );


    return `
      <article
        class="dashboard-account-card account-card"
        data-account-id="${accountId}"
      >

        <div class="dashboard-account-card-header">

          <div class="account-card-heading">

            <span class="dashboard-card-label">
              ${escapeHTML(
                account.type
              )}
            </span>

            <h3>
              ${escapeHTML(
                account.name
              )}
            </h3>

          </div>

          <span
            class="account-status ${statusClass}"
          >
            ${escapeHTML(
              account.status
            )}
          </span>

        </div>


        <div class="dashboard-account-number">

          <span>
            Account number
          </span>

          <strong>
            ${escapeHTML(
              accountNumber
            )}
          </strong>

        </div>


        <div class="dashboard-account-balance">

          <span>
            Available balance
          </span>

          <strong>
            ${escapeHTML(
              formatCurrency(
                account.availableBalance,
                account.currency
              )
            )}
          </strong>

        </div>


        <div class="account-card-meta">

          <div>
            <span>Current balance</span>

            <strong>
              ${escapeHTML(
                formatCurrency(
                  account.balance,
                  account.currency
                )
              )}
            </strong>
          </div>

          ${
            account.createdAt
              ? `
                <div>
                  <span>Opened</span>

                  <strong>
                    ${escapeHTML(
                      formatDate(
                        account.createdAt
                      )
                    )}
                  </strong>
                </div>
              `
              : ""
          }

        </div>


        <div class="account-card-actions">

          ${
            account.accountNumber
              ? `
                <button
                  type="button"
                  class="btn btn-outline btn-sm"
                  data-copy-account-number="${escapeHTML(
                    account.accountNumber
                  )}"
                >
                  Copy Account Number
                </button>
              `
              : ""
          }

          <a
            href="transactions.html"
            class="btn btn-primary btn-sm"
          >
            View Transactions
          </a>

        </div>

      </article>
    `;

  }


  /* ==========================================================
     EMPTY STATE
     ========================================================== */

  function createEmptyState() {

    return `
      <div
        class="empty-state accounts-empty-state"
        data-accounts-empty-state
      >

        <div class="empty-state-icon">
          —
        </div>

        <h3>
          No accounts found
        </h3>

        <p>
          There are currently no accounts matching
          your selection.
        </p>

        <a
          href="support.html"
          class="btn btn-outline"
        >
          Contact Support
        </a>

      </div>
    `;

  }


  /* ==========================================================
     ACCOUNT STATUS CLASS
     ========================================================== */

  function getStatusClass(
    status
  ) {

    const value =
      String(
        status || ""
      )
        .toLowerCase();


    if (
      value.includes("active")
    ) {
      return "status-active";
    }


    if (
      value.includes("pending")
    ) {
      return "status-pending";
    }


    if (
      value.includes("hold") ||
      value.includes("suspend")
    ) {
      return "status-warning";
    }


    if (
      value.includes("closed") ||
      value.includes("inactive")
    ) {
      return "status-inactive";
    }


    return "";

  }


  /* ==========================================================
     MASK ACCOUNT NUMBER
     ========================================================== */

  function maskAccountNumber(
    value
  ) {

    const clean =
      String(value)
        .replace(/\s+/g, "");


    if (
      clean.length <= 4
    ) {

      return clean;

    }


    return (
      "•••• " +
      clean.slice(-4)
    );

  }


  /* ==========================================================
     COPY ACCOUNT NUMBER
     ========================================================== */

  async function copyAccountNumber(
    accountNumber,
    button
  ) {

    if (
      !accountNumber
    ) {
      return;
    }


    try {

      if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText ===
        "function"
      ) {

        await navigator.clipboard.writeText(
          accountNumber
        );

      } else {

        fallbackCopy(
          accountNumber
        );

      }


      const originalText =
        button.textContent;


      button.textContent =
        "Copied";


      button.classList.add(
        "is-success"
      );


      setTimeout(
        function () {

          button.textContent =
            originalText;

          button.classList.remove(
            "is-success"
          );

        },
        1600
      );

    } catch (error) {

      console.warn(
        "Unable to copy account number:",
        error
      );

      button.textContent =
        "Copy failed";


      setTimeout(
        function () {
          button.textContent =
            "Copy Account Number";
        },
        1600
      );

    }

  }


  /* ==========================================================
     FALLBACK COPY
     ========================================================== */

  function fallbackCopy(
    value
  ) {

    const textarea =
      document.createElement(
        "textarea"
      );


    textarea.value =
      value;


    textarea.setAttribute(
      "readonly",
      ""
    );


    textarea.style.position =
      "fixed";

    textarea.style.opacity =
      "0";


    document.body.appendChild(
      textarea
    );


    textarea.select();


    const successful =
      document.execCommand(
        "copy"
      );


    textarea.remove();


    if (
      !successful
    ) {

      throw new Error(
        "Copy operation failed"
      );

    }

  }


  /* ==========================================================
     ACCOUNT ACTIONS
     ========================================================== */

  function initializeAccountActions() {

    $$(
      "[data-copy-account-number]"
    )
      .forEach(
        button => {

          if (
            button.dataset.bound ===
            "true"
          ) {
            return;
          }


          button.dataset.bound =
            "true";


          button.addEventListener(
            "click",
            function () {

              const accountNumber =
                button.dataset.copyAccountNumber;


              copyAccountNumber(
                accountNumber,
                button
              );

            }
          );

        }
      );

  }


  /* ==========================================================
     UPDATE SUMMARY
     ========================================================== */

  function updateSummary() {

    const accounts =
      normalizeAccounts(
        state.filteredAccounts
      );


    const allAccounts =
      normalizeAccounts(
        state.accounts
      );


    const totalBalance =
      allAccounts.reduce(
        (
          total,
          account
        ) =>
          total +
          Number(account.balance || 0),
        0
      );


    const totalAvailable =
      allAccounts.reduce(
        (
          total,
          account
        ) =>
          total +
          Number(
            account.availableBalance || 0
          ),
        0
      );


    setText(
      CONFIG.selectors.accountCount,
      String(accounts.length)
    );


    setText(
      CONFIG.selectors.totalBalance,
      formatCurrency(
        totalBalance
      )
    );


    setText(
      CONFIG.selectors.availableBalance,
      formatCurrency(
        totalAvailable
      )
    );

  }


  /* ==========================================================
     SEARCH
     ========================================================== */

  function initializeSearch() {

    $$(CONFIG.selectors.accountSearch)
      .forEach(
        input => {

          input.addEventListener(
            "input",
            function () {

              state.search =
                input.value;


              applyFilters();

            }
          );

        }
      );

  }


  /* ==========================================================
     FILTER
     ========================================================== */

  function initializeFilter() {

    $$(CONFIG.selectors.accountFilter)
      .forEach(
        select => {

          select.addEventListener(
            "change",
            function () {

              state.filter =
                select.value ||
                "all";


              applyFilters();

            }
          );

        }
      );

  }


  /* ==========================================================
     REFRESH
     ========================================================== */

  function initializeRefresh() {

    $$(CONFIG.selectors.refresh)
      .forEach(
        button => {

          button.addEventListener(
            "click",
            async function () {

              if (
                state.loading
              ) {
                return;
              }


              const originalText =
                button.textContent;


              button.disabled =
                true;


              button.classList.add(
                "is-loading"
              );


              button.textContent =
                "Refreshing…";


              try {

                await loadAccounts();

              } finally {

                button.disabled =
                  false;

                button.classList.remove(
                  "is-loading"
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
     LOADING STATE
     ========================================================== */

  function setLoadingState(
    loading
  ) {

    $$(CONFIG.selectors.loading)
      .forEach(
        element => {

          element.hidden =
            !loading;

        }
      );


    $$(CONFIG.selectors.accountList)
      .forEach(
        element => {

          element.classList.toggle(
            "is-loading",
            loading
          );

        }
      );

  }


  /* ==========================================================
     ERROR STATE
     ========================================================== */

  function showError(
    message
  ) {

    $$(CONFIG.selectors.error)
      .forEach(
        element => {

          element.hidden =
            false;

          element.textContent =
            message;

        }
      );

  }


  function clearError() {

    $$(CONFIG.selectors.error)
      .forEach(
        element => {

          element.hidden =
            true;

          element.textContent =
            "";

        }
      );

  }


  function getErrorMessage(
    error
  ) {

    if (
      error?.message
    ) {
      return error.message;
    }


    return (
      "We could not load your account information. Please try again."
    );

  }


  /* ==========================================================
     STATUS MESSAGE
     ========================================================== */

  function setStatus(
    type,
    message
  ) {

    $$(CONFIG.selectors.status)
      .forEach(
        element => {

          element.dataset.status =
            type;

          element.textContent =
            message;

        }
      );

  }


  /* ==========================================================
     SET TEXT
     ========================================================== */

  function setText(
    selector,
    value
  ) {

    $$(selector)
      .forEach(
        element => {

          element.textContent =
            value ?? "";

        }
      );

  }


  /* ==========================================================
     DATE FORMATTER
     ========================================================== */

  function formatDate(
    value
  ) {

    const date =
      new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return "—";

    }


    return new Intl.DateTimeFormat(
      "en-US",
      {
        year: "numeric",
        month: "short",
        day: "numeric"
      }
    ).format(date);

  }


  /* ==========================================================
     ONLINE / OFFLINE
     ========================================================== */

  function initializeConnectionEvents() {

    window.addEventListener(
      "online",
      function () {

        setStatus(
          "success",
          "Connection restored"
        );


        loadAccounts();

      }
    );


    window.addEventListener(
      "offline",
      function () {

        setStatus(
          "error",
          "You are currently offline"
        );

      }
    );

  }


  /* ==========================================================
     VISIBILITY REFRESH
     ========================================================== */

  function initializeVisibilityRefresh() {

    document.addEventListener(
      "visibilitychange",
      function () {

        if (
          document.visibilityState ===
          "visible"
        ) {

          loadAccounts();

        }

      }
    );

  }


  /* ==========================================================
     DASHBOARD INTEGRATION
     ========================================================== */

  function syncDashboard() {

    if (
      window.GTF_DASHBOARD &&
      typeof window.GTF_DASHBOARD.loadAccounts ===
      "function"
    ) {

      /*
       * Dashboard.js may have its own account
       * rendering. Keep this page's controller
       * authoritative while allowing the shared
       * dashboard module to refresh separately.
       */

      return;

    }

  }


  /* ==========================================================
     INITIALIZE
     ========================================================== */

  async function initialize() {

    if (
      state.initialized
    ) {
      return;
    }


    state.initialized =
      true;


    const authenticated =
      await verifyAuthentication();


    if (
      !authenticated
    ) {
      return;
    }


    initializeSearch();

    initializeFilter();

    initializeRefresh();

    initializeConnectionEvents();

    initializeVisibilityRefresh();

    syncDashboard();


    await loadAccounts();


    document.documentElement
      .classList.add(
        "gtf-accounts-ready"
      );

  }


  /* ==========================================================
     PUBLIC API
     ========================================================== */

  window.GTF_ACCOUNTS = {

    config:
      CONFIG,

    state,

    initialize,

    load:
      loadAccounts,

    refresh:
      loadAccounts,

    filter:
      applyFilters,

    formatCurrency,

    maskAccountNumber

  };


  /* ==========================================================
     START
     ========================================================== */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      {
        once: true
      }
    );

  } else {

    initialize();

  }


})(window, document);