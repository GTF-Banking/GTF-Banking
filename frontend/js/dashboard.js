/* ============================================================
   GLOBAL TRUSTFUND
   DASHBOARD.JS
   ------------------------------------------------------------
   Shared customer-dashboard controller.

   Works with:
     frontend/dashboard/index.html
     frontend/dashboard/accounts.html
     frontend/dashboard/profile.html
     frontend/dashboard/support.html
     frontend/dashboard/transactions.html
     frontend/dashboard/transfers.html

   Depends on:
     ../js/api.js
     ../js/auth.js
     ../js/app.js
     ../js/logo-loader.js
     ../js/logo-guard.js

   IMPORTANT:
     This frontend is designed for a banking simulation/demo.
     Financial balances and transactions should come from
     authenticated backend/API data in production.
   ============================================================ */

(function (window, document) {
  "use strict";


  /* ==========================================================
     CONFIGURATION
     ========================================================== */

  const CONFIG = {

    apiBase:
      "/api",

    loginPage:
      "../login.html",

    homePage:
      "../index.html",

    defaultCurrency:
      "USD",

    currencyLocale:
      "en-US",

    refreshInterval:
      60000,

    selectors: {

      balance:
        "[data-dashboard-balance]",

      availableBalance:
        "[data-available-balance]",

      accountNumber:
        "[data-account-number]",

      customerName:
        "[data-customer-name]",

      customerEmail:
        "[data-customer-email]",

      transactionList:
        "[data-transaction-list]",

      accountList:
        "[data-account-list]",

      dashboardStatus:
        "[data-dashboard-status]",

      lastUpdated:
        "[data-last-updated]"

    }

  };


  /* ==========================================================
     STATE
     ========================================================== */

  const state = {

    initialized: false,

    loading: false,

    authenticated: false,

    user: null,

    dashboard: null,

    accounts: [],

    transactions: [],

    currency:
      CONFIG.defaultCurrency,

    refreshTimer: null

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

    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(numericAmount)
    ) {
      return new Intl.NumberFormat(
        CONFIG.currencyLocale,
        {
          style: "currency",
          currency
        }
      ).format(0);
    }

    try {

      return new Intl.NumberFormat(
        CONFIG.currencyLocale,
        {
          style: "currency",
          currency
        }
      ).format(
        numericAmount
      );

    } catch (error) {

      return `${currency} ${numericAmount.toFixed(2)}`;

    }

  }


  /* ==========================================================
     DATE FORMATTER
     ========================================================== */

  function formatDate(
    value
  ) {

    if (!value) {
      return "—";
    }

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
      CONFIG.currencyLocale,
      {
        year: "numeric",
        month: "short",
        day: "numeric"
      }
    ).format(date);

  }


  function formatDateTime(
    value
  ) {

    if (!value) {
      return "—";
    }

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
      CONFIG.currencyLocale,
      {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      }
    ).format(date);

  }


  /* ==========================================================
     API ADAPTER
     ----------------------------------------------------------
     Uses the existing global GTF_API object when available.
     ========================================================== */

  async function apiRequest(
    endpoint,
    options = {}
  ) {

    /*
     * Prefer your existing api.js implementation.
     */

    if (
      window.GTF_API
    ) {

      if (
        typeof window.GTF_API.request ===
        "function"
      ) {

        return window.GTF_API.request(
          endpoint,
          options
        );

      }


      if (
        typeof window.GTF_API.get ===
        "function" &&
        (!options.method ||
          options.method.toUpperCase() === "GET")
      ) {

        return window.GTF_API.get(
          endpoint,
          options
        );

      }

    }


    /*
     * Fallback fetch implementation.
     */

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

      const message =
        data?.message ||
        data?.error ||
        `Request failed (${response.status})`;

      const error =
        new Error(message);

      error.status =
        response.status;

      error.data =
        data;

      throw error;

    }


    return data;

  }


  /* ==========================================================
     AUTHENTICATION CHECK
     ========================================================== */

  async function checkAuthentication() {

    /*
     * Prefer existing auth.js.
     */

    if (
      window.GTF_AUTH
    ) {

      if (
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
            "GTF authentication check:",
            error
          );

          redirectToLogin();

          return false;

        }

      }


      if (
        typeof window.GTF_AUTH.isAuthenticated ===
        "function"
      ) {

        try {

          const authenticated =
            await window.GTF_AUTH.isAuthenticated();

          if (
            authenticated === false
          ) {

            redirectToLogin();

            return false;

          }

        } catch {
          /*
           * Continue to API verification.
           */
        }

      }

    }


    /*
     * Backend verification.
     */

    try {

      const response =
        await apiRequest(
          "/users/me"
        );


      if (
        response?.user
      ) {

        state.user =
          response.user;

      } else if (
        response?.data?.user
      ) {

        state.user =
          response.data.user;

      } else if (
        response?.data
      ) {

        state.user =
          response.data;

      } else {

        state.user =
          response;

      }


      state.authenticated =
        true;


      return true;

    } catch (error) {

      if (
        error.status === 401 ||
        error.status === 403
      ) {

        state.authenticated =
          false;

        redirectToLogin();

        return false;

      }


      /*
       * During local UI development, allow
       * the dashboard to render if the API is
       * temporarily unavailable.
       */

      console.warn(
        "Dashboard authentication API unavailable:",
        error
      );

      state.authenticated =
        true;

      return true;

    }

  }


  /* ==========================================================
     REDIRECT TO LOGIN
     ========================================================== */

  function redirectToLogin() {

    if (
      window.location.pathname
        .includes("/dashboard/")
    ) {

      window.location.href =
        CONFIG.loginPage;

      return;

    }

    window.location.href =
      "login.html";

  }


  /* ==========================================================
     LOAD DASHBOARD SUMMARY
     ========================================================== */

  async function loadDashboardSummary() {

    try {

      const response =
        await apiRequest(
          "/dashboard/summary"
        );


      const data =
        response?.data ||
        response;


      state.dashboard =
        data || {};


      if (
        data?.currency
      ) {

        state.currency =
          data.currency;

      }


      renderDashboardSummary(
        data
      );


      setDashboardStatus(
        "online",
        "Account data updated"
      );


      updateLastUpdated();

      return data;

    } catch (error) {

      console.warn(
        "Unable to load dashboard summary:",
        error
      );


      setDashboardStatus(
        "offline",
        "Unable to refresh account data"
      );


      return null;

    }

  }


  /* ==========================================================
     LOAD ACCOUNTS
     ========================================================== */

  async function loadAccounts() {

    try {

      const response =
        await apiRequest(
          "/users/me/accounts"
        );


      const accounts =
        response?.accounts ||
        response?.data?.accounts ||
        response?.data ||
        [];


      state.accounts =
        Array.isArray(accounts)
          ? accounts
          : [];


      renderAccounts(
        state.accounts
      );


      return state.accounts;

    } catch (error) {

      /*
       * Try alternate endpoint used by
       * some versions of the backend.
       */

      try {

        const response =
          await apiRequest(
            "/accounts"
          );


        const accounts =
          response?.accounts ||
          response?.data?.accounts ||
          response?.data ||
          [];


        state.accounts =
          Array.isArray(accounts)
            ? accounts
            : [];


        renderAccounts(
          state.accounts
        );


        return state.accounts;

      } catch (fallbackError) {

        console.warn(
          "Unable to load accounts:",
          fallbackError
        );

        renderAccounts([]);

        return [];

      }

    }

  }


  /* ==========================================================
     LOAD TRANSACTIONS
     ========================================================== */

  async function loadTransactions() {

    try {

      const response =
        await apiRequest(
          "/transactions"
        );


      const transactions =
        response?.transactions ||
        response?.data?.transactions ||
        response?.data ||
        [];


      state.transactions =
        Array.isArray(transactions)
          ? transactions
          : [];


      renderTransactions(
        state.transactions
      );


      return state.transactions;

    } catch (error) {

      console.warn(
        "Unable to load transactions:",
        error
      );

      renderTransactions([]);

      return [];

    }

  }


  /* ==========================================================
     RENDER DASHBOARD SUMMARY
     ========================================================== */

  function renderDashboardSummary(
    data
  ) {

    if (!data) {
      return;
    }


    const balance =
      data.balance ??
      data.total_balance ??
      data.totalBalance ??
      0;


    const availableBalance =
      data.available_balance ??
      data.availableBalance ??
      balance;


    const accountNumber =
      data.account_number ??
      data.accountNumber ??
      "";


    const customerName =
      data.customer_name ??
      data.customerName ??
      data.name ??
      getUserName();


    setText(
      CONFIG.selectors.balance,
      formatCurrency(balance)
    );


    setText(
      CONFIG.selectors.availableBalance,
      formatCurrency(
        availableBalance
      )
    );


    setText(
      CONFIG.selectors.accountNumber,
      accountNumber
        ? maskAccountNumber(accountNumber)
        : "—"
    );


    setText(
      CONFIG.selectors.customerName,
      customerName || "Customer"
    );


    setText(
      CONFIG.selectors.customerEmail,
      getUserEmail()
    );

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


    containers.forEach(
      container => {

        if (
          !accounts.length
        ) {

          container.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon">
                —
              </div>

              <h3>
                No accounts available
              </h3>

              <p>
                Account information will appear here
                when it becomes available.
              </p>
            </div>
          `;

          return;

        }


        container.innerHTML =
          accounts
            .map(
              account =>
                createAccountCard(
                  account
                )
            )
            .join("");

      }
    );

  }


  /* ==========================================================
     ACCOUNT CARD
     ========================================================== */

  function createAccountCard(
    account
  ) {

    const name =
      account.name ||
      account.account_name ||
      account.account_type ||
      "Account";


    const number =
      account.account_number ||
      account.accountNumber ||
      "";


    const balance =
      account.balance ??
      account.available_balance ??
      0;


    const currency =
      account.currency ||
      state.currency;


    const status =
      account.status ||
      "Active";


    return `
      <article class="dashboard-account-card">

        <div class="dashboard-account-card-header">

          <div>
            <span class="dashboard-card-label">
              Account
            </span>

            <h3>
              ${escapeHTML(name)}
            </h3>
          </div>

          <span class="account-status">
            ${escapeHTML(status)}
          </span>

        </div>


        <div class="dashboard-account-number">
          ${number
            ? escapeHTML(
                maskAccountNumber(number)
              )
            : "Account number unavailable"}
        </div>


        <div class="dashboard-account-balance">

          <span>
            Available balance
          </span>

          <strong>
            ${escapeHTML(
              formatCurrency(
                balance,
                currency
              )
            )}
          </strong>

        </div>

      </article>
    `;

  }


  /* ==========================================================
     RENDER TRANSACTIONS
     ========================================================== */

  function renderTransactions(
    transactions
  ) {

    const containers =
      $$(
        CONFIG.selectors.transactionList
      );


    if (
      containers.length === 0
    ) {
      return;
    }


    containers.forEach(
      container => {

        if (
          !transactions.length
        ) {

          container.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon">
                —
              </div>

              <h3>
                No transactions yet
              </h3>

              <p>
                Your account activity will appear here.
              </p>
            </div>
          `;

          return;

        }


        container.innerHTML =
          transactions
            .map(
              transaction =>
                createTransactionRow(
                  transaction
                )
            )
            .join("");

      }
    );

  }


  /* ==========================================================
     TRANSACTION ROW
     ========================================================== */

  function createTransactionRow(
    transaction
  ) {

    const description =
      transaction.description ||
      transaction.merchant ||
      transaction.name ||
      "Transaction";


    const date =
      transaction.created_at ||
      transaction.date ||
      transaction.transaction_date;


    const amount =
      Number(
        transaction.amount || 0
      );


    const type =
      String(
        transaction.type ||
        transaction.transaction_type ||
        ""
      ).toLowerCase();


    const isCredit =
      type === "credit" ||
      type === "deposit" ||
      type === "income" ||
      amount > 0;


    const displayAmount =
      Math.abs(amount);


    const sign =
      isCredit
        ? "+"
        : "−";


    const amountClass =
      isCredit
        ? "transaction-credit"
        : "transaction-debit";


    const status =
      transaction.status ||
      "Completed";


    return `
      <div class="dashboard-transaction-row">

        <div class="transaction-symbol ${
          isCredit
            ? "credit"
            : "debit"
        }">

          ${isCredit ? "+" : "−"}

        </div>


        <div class="transaction-details">

          <strong>
            ${escapeHTML(description)}
          </strong>

          <small>
            ${escapeHTML(
              formatDate(date)
            )}
          </small>

        </div>


        <div class="transaction-status">
          ${escapeHTML(status)}
        </div>


        <strong class="${amountClass}">
          ${sign}${escapeHTML(
            formatCurrency(
              displayAmount
            )
          )}
        </strong>

      </div>
    `;

  }


  /* ==========================================================
     USER HELPERS
     ========================================================== */

  function getUserName() {

    if (
      !state.user
    ) {
      return "";
    }


    return (
      state.user.full_name ||
      state.user.fullName ||
      state.user.name ||
      [
        state.user.first_name,
        state.user.last_name
      ]
        .filter(Boolean)
        .join(" ")
    );

  }


  function getUserEmail() {

    return (
      state.user?.email ||
      ""
    );

  }


  /* ==========================================================
     MASK ACCOUNT NUMBER
     ========================================================== */

  function maskAccountNumber(
    accountNumber
  ) {

    const value =
      String(accountNumber)
        .replace(/\s+/g, "");


    if (
      value.length <= 4
    ) {

      return value;

    }


    return (
      "•••• " +
      value.slice(-4)
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
     DASHBOARD STATUS
     ========================================================== */

  function setDashboardStatus(
    status,
    message
  ) {

    $$(CONFIG.selectors.dashboardStatus)
      .forEach(
        element => {

          element.dataset.status =
            status;

          element.textContent =
            message;

        }
      );

  }


  /* ==========================================================
     LAST UPDATED
     ========================================================== */

  function updateLastUpdated() {

    const now =
      new Date();


    $$(CONFIG.selectors.lastUpdated)
      .forEach(
        element => {

          element.textContent =
            formatDateTime(now);

        }
      );

  }


  /* ==========================================================
     REFRESH DASHBOARD
     ========================================================== */

  async function refreshDashboard() {

    if (
      state.loading
    ) {
      return;
    }


    state.loading =
      true;


    try {

      await Promise.all([
        loadDashboardSummary(),
        loadAccounts(),
        loadTransactions()
      ]);

    } finally {

      state.loading =
        false;

    }

  }


  /* ==========================================================
     REFRESH BUTTON
     ========================================================== */

  function initializeRefreshButton() {

    $$(
      "[data-dashboard-refresh]"
    )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            async function () {

              if (
                button.disabled
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

                await refreshDashboard();

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
     SIDEBAR / MOBILE NAVIGATION
     ========================================================== */

  function initializeDashboardMenu() {

    const toggle =
      $(
        "[data-dashboard-menu-toggle]"
      );


    const sidebar =
      $(
        "[data-dashboard-sidebar]"
      );


    if (
      !toggle ||
      !sidebar
    ) {
      return;
    }


    toggle.addEventListener(
      "click",
      function () {

        const open =
          sidebar.classList.toggle(
            "open"
          );


        toggle.classList.toggle(
          "open",
          open
        );


        toggle.setAttribute(
          "aria-expanded",
          String(open)
        );


        document.body.classList.toggle(
          "dashboard-menu-open",
          open
        );

      }
    );


    $$(".dashboard-sidebar a")
      .forEach(
        link => {

          link.addEventListener(
            "click",
            function () {

              sidebar.classList.remove(
                "open"
              );

              toggle.classList.remove(
                "open"
              );

              toggle.setAttribute(
                "aria-expanded",
                "false"
              );

              document.body.classList.remove(
                "dashboard-menu-open"
              );

            }
          );

        }
      );

  }


  /* ==========================================================
     ACTIVE SIDEBAR LINK
     ========================================================== */

  function initializeActiveNavigation() {

    const currentPath =
      window.location.pathname
        .split("/")
        .pop()
        .toLowerCase();


    $$(".dashboard-sidebar a")
      .forEach(
        link => {

          const href =
            link.getAttribute(
              "href"
            );


          if (!href) {
            return;
          }


          const linkPath =
            href
              .split("?")[0]
              .split("#")[0]
              .split("/")
              .pop()
              .toLowerCase();


          if (
            linkPath ===
            currentPath
          ) {

            link.classList.add(
              "active"
            );

            link.setAttribute(
              "aria-current",
              "page"
            );

          } else {

            link.classList.remove(
              "active"
            );

            link.removeAttribute(
              "aria-current"
            );

          }

        }
      );

  }


  /* ==========================================================
     ACCOUNT NUMBER COPY
     ========================================================== */

  function initializeCopyButtons() {

    $$(
      "[data-copy-account]"
    )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            async function () {

              const value =
                button.dataset.copyAccount;


              if (!value) {
                return;
              }


              try {

                await navigator.clipboard.writeText(
                  value
                );


                const original =
                  button.textContent;


                button.textContent =
                  "Copied";


                setTimeout(
                  function () {
                    button.textContent =
                      original;
                  },
                  1500
                );

              } catch (error) {

                console.warn(
                  "Could not copy account number:",
                  error
                );

              }

            }
          );

        }
      );

  }


  /* ==========================================================
     TRANSACTION FILTER
     ========================================================== */

  function initializeTransactionFilters() {

    const filter =
      $(
        "[data-transaction-filter]"
      );


    if (!filter) {
      return;
    }


    filter.addEventListener(
      "change",
      function () {

        const value =
          filter.value
            .toLowerCase();


        const rows =
          $$(
            ".dashboard-transaction-row"
          );


        rows.forEach(
          row => {

            if (
              !value ||
              value === "all"
            ) {

              row.hidden =
                false;

              return;

            }


            const text =
              row.textContent
                .toLowerCase();


            row.hidden =
              !text.includes(value);

          }
        );

      }
    );

  }


  /* ==========================================================
     TRANSACTION SEARCH
     ========================================================== */

  function initializeTransactionSearch() {

    const search =
      $(
        "[data-transaction-search]"
      );


    if (!search) {
      return;
    }


    search.addEventListener(
      "input",
      function () {

        const query =
          search.value
            .trim()
            .toLowerCase();


        $$(".dashboard-transaction-row")
          .forEach(
            row => {

              row.hidden =
                query &&
                !row.textContent
                  .toLowerCase()
                  .includes(query);

            }
          );

      }
    );

  }


  /* ==========================================================
     PASSWORD / SENSITIVE DATA VISIBILITY
     ========================================================== */

  function initializeBalanceVisibility() {

    $$(
      "[data-toggle-balance]"
    )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            function () {

              const targets =
                button.dataset.toggleBalance;


              if (!targets) {
                return;
              }


              const elements =
                $$(targets);


              const hidden =
                button.dataset.hidden ===
                "true";


              elements.forEach(
                element => {

                  if (
                    hidden
                  ) {

                    element.classList.remove(
                      "balance-hidden"
                    );

                  } else {

                    element.classList.add(
                      "balance-hidden"
                    );

                  }

                }
              );


              button.dataset.hidden =
                String(!hidden);


              button.setAttribute(
                "aria-pressed",
                String(!hidden)
              );

            }
          );

        }
      );

  }


  /* ==========================================================
     LOGOUT
     ========================================================== */

  async function logout() {

    try {

      if (
        window.GTF_AUTH &&
        typeof window.GTF_AUTH.logout ===
        "function"
      ) {

        await window.GTF_AUTH.logout();

      } else {

        await apiRequest(
          "/auth/logout",
          {
            method: "POST"
          }
        );

      }

    } catch (error) {

      console.warn(
        "Logout request failed:",
        error
      );

    } finally {

      /*
       * Never leave a customer on a protected
       * dashboard after logout.
       */

      window.location.href =
        CONFIG.loginPage;

    }

  }


  function initializeLogout() {

    $$(
      "[data-logout]"
    )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            async function (event) {

              event.preventDefault();

              await logout();

            }
          );

        }
      );

  }


  /* ==========================================================
     REFRESH TIMER
     ========================================================== */

  function initializeRefreshTimer() {

    if (
      state.refreshTimer
    ) {

      clearInterval(
        state.refreshTimer
      );

    }


    state.refreshTimer =
      window.setInterval(
        function () {

          if (
            document.visibilityState ===
            "visible"
          ) {

            refreshDashboard();

          }

        },
        CONFIG.refreshInterval
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

          refreshDashboard();

        }

      }
    );

  }


  /* ==========================================================
     ONLINE / OFFLINE STATUS
     ========================================================== */

  function initializeConnectionStatus() {

    window.addEventListener(
      "online",
      function () {

        setDashboardStatus(
          "online",
          "Connection restored"
        );


        refreshDashboard();

      }
    );


    window.addEventListener(
      "offline",
      function () {

        setDashboardStatus(
          "offline",
          "You are currently offline"
        );

      }
    );

  }


  /* ==========================================================
     INITIALIZE DASHBOARD
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
      await checkAuthentication();


    if (
      !authenticated
    ) {
      return;
    }


    initializeDashboardMenu();

    initializeActiveNavigation();

    initializeRefreshButton();

    initializeCopyButtons();

    initializeTransactionFilters();

    initializeTransactionSearch();

    initializeBalanceVisibility();

    initializeLogout();

    initializeConnectionStatus();

    initializeVisibilityRefresh();


    await refreshDashboard();


    initializeRefreshTimer();


    document.documentElement
      .classList.add(
        "gtf-dashboard-ready"
      );

  }


  /* ==========================================================
     PUBLIC API
     ========================================================== */

  window.GTF_DASHBOARD = {

    config:
      CONFIG,

    state,

    initialize,

    refresh:
      refreshDashboard,

    loadSummary:
      loadDashboardSummary,

    loadAccounts,

    loadTransactions,

    formatCurrency,

    formatDate,

    formatDateTime,

    logout

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