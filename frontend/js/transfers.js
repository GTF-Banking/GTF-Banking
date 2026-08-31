/* ============================================================
   GLOBAL TRUSTFUND
   TRANSFERS.JS
   ------------------------------------------------------------
   Transfer interface controller.

   Intended page:
     frontend/dashboard/transfers.html

   Shared dependencies:
     ../js/api.js
     ../js/auth.js
     ../js/app.js
     ../js/logo-loader.js
     ../js/logo-guard.js
     ../js/dashboard.js

   Responsibilities:
     - Load eligible transfer accounts
     - Populate account selectors
     - Validate transfer forms
     - Calculate/display transfer summary
     - Submit transfer requests to the backend
     - Display success/error states
     - Prevent duplicate submissions
     - Reset forms
     - Handle online/offline state

   SECURITY:
     This frontend does not authorize, settle, or
     independently create financial transfers.
     All transfer authorization and validation must
     be performed by the authenticated backend.
   ============================================================ */

(function (window, document) {
  "use strict";


  /* ==========================================================
     CONFIGURATION
     ========================================================== */

  const CONFIG = {

    apiBase: "/api",

    loginPage: "../login.html",

    endpoints: {
      accounts: "/users/me/accounts",
      accountsFallback: "/accounts",
      transfers: "/transactions/transfers",
      transfersFallback: "/transfers"
    },

    selectors: {

      form:
        "[data-transfer-form]",

      fromAccount:
        "[data-transfer-from]",

      toAccount:
        "[data-transfer-to]",

      amount:
        "[data-transfer-amount]",

      currency:
        "[data-transfer-currency]",

      description:
        "[data-transfer-description]",

      reference:
        "[data-transfer-reference]",

      submit:
        "[data-transfer-submit]",

      reset:
        "[data-transfer-reset]",

      summary:
        "[data-transfer-summary]",

      summaryAmount:
        "[data-transfer-summary-amount]",

      summaryFee:
        "[data-transfer-summary-fee]",

      summaryTotal:
        "[data-transfer-summary-total]",

      balance:
        "[data-transfer-balance]",

      status:
        "[data-transfer-status]",

      error:
        "[data-transfer-error]",

      success:
        "[data-transfer-success]",

      loading:
        "[data-transfer-loading]",

      accountList:
        "[data-transfer-account-list]"

    }

  };


  /* ==========================================================
     STATE
     ========================================================== */

  const state = {

    initialized: false,

    loading: false,

    submitting: false,

    accounts: [],

    selectedFromAccount: null,

    selectedToAccount: null,

    amount: 0,

    currency: "USD",

    fee: 0,

    description: "",

    reference: ""

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
     API REQUEST
     ========================================================== */

  async function apiRequest(
    endpoint,
    options = {}
  ) {

    /*
     * Prefer the project's shared API layer.
     */

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
          "GTF Transfers authentication:",
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


    setLoading(true);

    clearMessages();


    try {

      let response;


      try {

        response =
          await apiRequest(
            CONFIG.endpoints.accounts
          );

      } catch (primaryError) {

        response =
          await apiRequest(
            CONFIG.endpoints.accountsFallback
          );

      }


      state.accounts =
        normalizeAccounts(
          extractAccounts(response)
        );


      populateAccountSelectors();

      updateSelectedAccount();

      updateBalance();

      setLoading(false);


      return state.accounts;

    } catch (error) {

      console.error(
        "GTF Transfers account loading:",
        error
      );


      state.accounts =
        [];


      populateAccountSelectors();

      setLoading(false);


      showError(
        getErrorMessage(error)
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
     EXTRACT ACCOUNT DATA
     ========================================================== */

  function extractAccounts(response) {

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
     NORMALIZE ACCOUNTS
     ========================================================== */

  function normalizeAccounts(
    accounts
  ) {

    return accounts
      .map(account => {

        if (
          !account ||
          typeof account !== "object"
        ) {
          return null;
        }


        const balance =
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

          balance:
            Number.isFinite(balance)
              ? balance
              : 0,

          currency:
            account.currency ||
            "USD",

          status:
            account.status ||
            "Active"

        };

      })
      .filter(Boolean)
      .filter(
        account =>
          account.status
            .toLowerCase()
            .includes("active")
      );

  }


  /* ==========================================================
     POPULATE ACCOUNT SELECTORS
     ========================================================== */

  function populateAccountSelectors() {

    const fromSelect =
      $(CONFIG.selectors.fromAccount);

    const toSelect =
      $(CONFIG.selectors.toAccount);


    if (
      fromSelect
    ) {

      populateSelect(
        fromSelect,
        state.accounts,
        "Select source account"
      );

    }


    if (
      toSelect
    ) {

      populateSelect(
        toSelect,
        state.accounts,
        "Select destination account"
      );

    }

  }


  /* ==========================================================
     POPULATE SELECT
     ========================================================== */

  function populateSelect(
    select,
    accounts,
    placeholder
  ) {

    const currentValue =
      select.value;


    select.innerHTML = "";


    const placeholderOption =
      document.createElement(
        "option"
      );


    placeholderOption.value =
      "";

    placeholderOption.textContent =
      placeholder;

    placeholderOption.disabled =
      false;

    placeholderOption.selected =
      true;


    select.appendChild(
      placeholderOption
    );


    accounts.forEach(
      account => {

        const option =
          document.createElement(
            "option"
          );


        option.value =
          account.id;


        const masked =
          maskAccountNumber(
            account.accountNumber
          );


        option.textContent =
          `${account.name} — ${masked}`;


        select.appendChild(
          option
        );

      }
    );


    if (
      currentValue &&
      accounts.some(
        account =>
          account.id === currentValue
      )
    ) {

      select.value =
        currentValue;

    }

  }


  /* ==========================================================
     ACCOUNT SELECT EVENTS
     ========================================================== */

  function initializeAccountSelectors() {

    const fromSelect =
      $(CONFIG.selectors.fromAccount);

    const toSelect =
      $(CONFIG.selectors.toAccount);


    if (
      fromSelect
    ) {

      fromSelect.addEventListener(
        "change",
        function () {

          state.selectedFromAccount =
            findAccount(
              fromSelect.value
            );


          updateBalance();

          updateSummary();

          validateForm();

        }
      );

    }


    if (
      toSelect
    ) {

      toSelect.addEventListener(
        "change",
        function () {

          state.selectedToAccount =
            findAccount(
              toSelect.value
            );


          validateForm();

          updateSummary();

        }
      );

    }

  }


  /* ==========================================================
     FIND ACCOUNT
     ========================================================== */

  function findAccount(
    id
  ) {

    return state.accounts.find(
      account =>
        String(account.id) ===
        String(id)
    ) || null;

  }


  /* ==========================================================
     UPDATE SELECTED ACCOUNTS
     ========================================================== */

  function updateSelectedAccount() {

    const fromSelect =
      $(CONFIG.selectors.fromAccount);

    const toSelect =
      $(CONFIG.selectors.toAccount);


    if (
      fromSelect
    ) {

      state.selectedFromAccount =
        findAccount(
          fromSelect.value
        );

    }


    if (
      toSelect
    ) {

      state.selectedToAccount =
        findAccount(
          toSelect.value
        );

    }

  }


  /* ==========================================================
     AMOUNT INPUT
     ========================================================== */

  function initializeAmountInput() {

    const input =
      $(CONFIG.selectors.amount);


    if (
      !input
    ) {
      return;
    }


    input.addEventListener(
      "input",
      function () {

        /*
         * Keep the raw value in the input but
         * store a normalized numeric value.
         */

        state.amount =
          parseAmount(
            input.value
          );


        updateSummary();

        validateForm();

      }
    );


    input.addEventListener(
      "blur",
      function () {

        const amount =
          parseAmount(
            input.value
          );


        if (
          amount > 0
        ) {

          input.value =
            amount.toFixed(2);

        }

      }
    );

  }


  /* ==========================================================
     TEXT INPUTS
     ========================================================== */

  function initializeTextInputs() {

    const description =
      $(CONFIG.selectors.description);

    const reference =
      $(CONFIG.selectors.reference);


    if (
      description
    ) {

      description.addEventListener(
        "input",
        function () {

          state.description =
            description.value.trim();

        }
      );

    }


    if (
      reference
    ) {

      reference.addEventListener(
        "input",
        function () {

          state.reference =
            reference.value.trim();

        }
      );

    }

  }


  /* ==========================================================
     CURRENCY
     ========================================================== */

  function initializeCurrency() {

    const select =
      $(CONFIG.selectors.currency);


    if (
      !select
    ) {
      return;
    }


    state.currency =
      select.value ||
      "USD";


    select.addEventListener(
      "change",
      function () {

        state.currency =
          select.value ||
          "USD";


        updateSummary();

      }
    );

  }


  /* ==========================================================
     PARSE AMOUNT
     ========================================================== */

  function parseAmount(
    value
  ) {

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return 0;
    }


    const cleaned =
      String(value)
        .replace(/,/g, "")
        .replace(/[^\d.-]/g, "");


    const amount =
      Number(cleaned);


    return Number.isFinite(amount)
      ? amount
      : 0;

  }


  /* ==========================================================
     BALANCE DISPLAY
     ========================================================== */

  function updateBalance() {

    const element =
      $(CONFIG.selectors.balance);


    if (
      !element
    ) {
      return;
    }


    const account =
      state.selectedFromAccount;


    if (
      !account
    ) {

      element.textContent =
        "Available balance: —";

      return;

    }


    element.textContent =
      `Available balance: ${formatCurrency(
        account.balance,
        account.currency
      )}`;

  }


  /* ==========================================================
     TRANSFER FEE
     ==========================================================
     The frontend displays zero by default because the
     authoritative fee must come from the backend.
     ========================================================== */

  function calculateEstimatedFee() {

    /*
     * Do not invent a real banking fee.
     *
     * The backend should return the actual fee,
     * if any, when the transfer is submitted.
     */

    return 0;

  }


  /* ==========================================================
     SUMMARY
     ========================================================== */

  function updateSummary() {

    state.amount =
      parseAmount(
        $(
          CONFIG.selectors.amount
        )?.value
      );


    state.fee =
      calculateEstimatedFee();


    const total =
      state.amount +
      state.fee;


    setText(
      CONFIG.selectors.summaryAmount,
      formatCurrency(
        state.amount,
        state.currency
      )
    );


    setText(
      CONFIG.selectors.summaryFee,
      formatCurrency(
        state.fee,
        state.currency
      )
    );


    setText(
      CONFIG.selectors.summaryTotal,
      formatCurrency(
        total,
        state.currency
      )
    );


    $$(CONFIG.selectors.summary)
      .forEach(
        element => {

          element.hidden =
            state.amount <= 0;

        }
      );

  }


  /* ==========================================================
     FORM VALIDATION
     ========================================================== */

  function validateForm() {

    const submit =
      $(CONFIG.selectors.submit);


    const result =
      validateTransfer();


    if (
      submit
    ) {

      submit.disabled =
        !result.valid ||
        state.submitting;

    }


    return result;

  }


  /* ==========================================================
     VALIDATE TRANSFER
     ========================================================== */

  function validateTransfer() {

    const errors = [];


    const from =
      state.selectedFromAccount;


    const to =
      state.selectedToAccount;


    const amount =
      parseAmount(
        $(
          CONFIG.selectors.amount
        )?.value
      );


    state.amount =
      amount;


    if (
      !from
    ) {

      errors.push(
        "Select the account you want to transfer from."
      );

    }


    if (
      !to
    ) {

      errors.push(
        "Select a destination account."
      );

    }


    if (
      from &&
      to &&
      from.id === to.id
    ) {

      errors.push(
        "The source and destination accounts must be different."
      );

    }


    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {

      errors.push(
        "Enter a valid transfer amount."
      );

    }


    if (
      amount > 0 &&
      from &&
      amount > Number(from.balance)
    ) {

      errors.push(
        "The transfer amount exceeds the available balance shown for this account."
      );

    }


    if (
      amount > 100000000
    ) {

      errors.push(
        "The requested amount exceeds the permitted transfer range."
      );

    }


    return {

      valid:
        errors.length === 0,

      errors

    };

  }


  /* ==========================================================
     FORM SUBMISSION
     ========================================================== */

  function initializeForm() {

    const form =
      $(CONFIG.selectors.form);


    if (
      !form
    ) {
      return;
    }


    form.addEventListener(
      "submit",
      async function (event) {

        event.preventDefault();


        if (
          state.submitting
        ) {
          return;
        }


        clearMessages();


        const validation =
          validateTransfer();


        if (
          !validation.valid
        ) {

          showError(
            validation.errors.join(" ")
          );

          return;

        }


        await submitTransfer();

      }
    );

  }


  /* ==========================================================
     SUBMIT TRANSFER
     ========================================================== */

  async function submitTransfer() {

    if (
      state.submitting
    ) {
      return;
    }


    state.submitting =
      true;


    setSubmitting(true);

    clearMessages();


    const payload =
      buildTransferPayload();


    try {

      let response;


      try {

        response =
          await apiRequest(
            CONFIG.endpoints.transfers,
            {
              method: "POST",

              body:
                JSON.stringify(
                  payload
                )
            }
          );

      } catch (primaryError) {

        /*
         * Compatibility endpoint.
         */

        response =
          await apiRequest(
            CONFIG.endpoints.transfersFallback,
            {
              method: "POST",

              body:
                JSON.stringify(
                  payload
                )
            }
          );

      }


      handleSuccessfulTransfer(
        response
      );


    } catch (error) {

      console.error(
        "GTF Transfer:",
        error
      );


      showError(
        getErrorMessage(error)
      );


      if (
        error.status === 401 ||
        error.status === 403
      ) {

        redirectToLogin();

      }

    } finally {

      state.submitting =
        false;


      setSubmitting(false);

      validateForm();

    }

  }


  /* ==========================================================
     BUILD TRANSFER PAYLOAD
     ========================================================== */

  function buildTransferPayload() {

    return {

      from_account_id:
        state.selectedFromAccount?.id ||
        null,

      to_account_id:
        state.selectedToAccount?.id ||
        null,

      amount:
        Number(
          state.amount.toFixed(2)
        ),

      currency:
        state.currency,

      description:
        state.description ||
        null,

      reference:
        state.reference ||
        null

    };

  }


  /* ==========================================================
     SUCCESS HANDLER
     ========================================================== */

  function handleSuccessfulTransfer(
    response
  ) {

    const transaction =
      response?.transaction ||
      response?.data?.transaction ||
      response?.data ||
      response;


    const transactionId =
      transaction?.id ||
      transaction?.transaction_id ||
      "";


    let message =
      "Your transfer request was submitted successfully.";


    if (
      transactionId
    ) {

      message +=
        ` Reference: ${transactionId}.`;

    }


    showSuccess(
      message
    );


    resetForm({
      preserveSuccess: true
    });


    /*
     * Refresh balances/accounts after a successful
     * backend response.
     */

    setTimeout(
      function () {

        loadAccounts();

      },
      300
    );

  }


  /* ==========================================================
     RESET FORM
     ========================================================== */

  function initializeReset() {

    const buttons =
      $$(CONFIG.selectors.reset);


    buttons.forEach(
      button => {

        button.addEventListener(
          "click",
          function () {

            resetForm();

          }
        );

      }
    );

  }


  function resetForm(
    options = {}
  ) {

    const form =
      $(CONFIG.selectors.form);


    if (
      form
    ) {

      form.reset();

    }


    state.selectedFromAccount =
      null;

    state.selectedToAccount =
      null;

    state.amount =
      0;

    state.description =
      "";

    state.reference =
      "";


    updateSelectedAccount();

    updateBalance();

    updateSummary();

    validateForm();


    if (
      !options.preserveSuccess
    ) {

      clearMessages();

    }

  }


  /* ==========================================================
     SUBMIT BUTTON STATE
     ========================================================== */

  function setSubmitting(
    submitting
  ) {

    const buttons =
      $$(CONFIG.selectors.submit);


    buttons.forEach(
      button => {

        button.disabled =
          submitting;


        button.classList.toggle(
          "is-loading",
          submitting
        );


        if (
          submitting
        ) {

          if (
            !button.dataset.originalText
          ) {

            button.dataset.originalText =
              button.textContent;

          }


          button.textContent =
            "Processing…";

        } else {

          button.textContent =
            button.dataset.originalText ||
            "Transfer";

        }

      }
    );

  }


  /* ==========================================================
     LOADING STATE
     ========================================================== */

  function setLoading(
    loading
  ) {

    $$(CONFIG.selectors.loading)
      .forEach(
        element => {

          element.hidden =
            !loading;

        }
      );

  }


  /* ==========================================================
     ERROR MESSAGE
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


    setStatus(
      "error",
      message
    );

  }


  /* ==========================================================
     SUCCESS MESSAGE
     ========================================================== */

  function showSuccess(
    message
  ) {

    $$(CONFIG.selectors.success)
      .forEach(
        element => {

          element.hidden =
            false;

          element.textContent =
            message;

        }
      );


    setStatus(
      "success",
      message
    );

  }


  /* ==========================================================
     CLEAR MESSAGES
     ========================================================== */

  function clearMessages() {

    $$(CONFIG.selectors.error)
      .forEach(
        element => {

          element.hidden =
            true;

          element.textContent =
            "";

        }
      );


    $$(CONFIG.selectors.success)
      .forEach(
        element => {

          element.hidden =
            true;

          element.textContent =
            "";

        }
      );

  }


  /* ==========================================================
     STATUS
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
     TEXT
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
     CURRENCY
     ========================================================== */

  function formatCurrency(
    amount,
    currency = "USD"
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
          currency:
            currency || "USD"
        }
      ).format(value);

    } catch {

      return `${currency || "USD"} ${value.toFixed(2)}`;

    }

  }


  /* ==========================================================
     ACCOUNT NUMBER MASKING
     ========================================================== */

  function maskAccountNumber(
    value
  ) {

    if (
      !value
    ) {
      return "Account";
    }


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
     ERROR NORMALIZATION
     ========================================================== */

  function getErrorMessage(
    error
  ) {

    if (
      error?.data?.message
    ) {

      return error.data.message;

    }


    if (
      error?.data?.error
    ) {

      return error.data.error;

    }


    if (
      error?.message
    ) {

      return error.message;

    }


    return (
      "We could not process the transfer request. Please try again."
    );

  }


  /* ==========================================================
     ONLINE / OFFLINE
     ========================================================== */

  function initializeConnectionEvents() {

    window.addEventListener(
      "offline",
      function () {

        setStatus(
          "error",
          "You are offline. Transfer requests are unavailable until the connection is restored."
        );

      }
    );


    window.addEventListener(
      "online",
      function () {

        setStatus(
          "success",
          "Connection restored."
        );


        loadAccounts();

      }
    );

  }


  /* ==========================================================
     PAGE VISIBILITY
     ========================================================== */

  function initializeVisibilityEvents() {

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


    initializeAccountSelectors();

    initializeAmountInput();

    initializeTextInputs();

    initializeCurrency();

    initializeForm();

    initializeReset();

    initializeConnectionEvents();

    initializeVisibilityEvents();


    await loadAccounts();


    updateSummary();

    validateForm();


    document.documentElement
      .classList.add(
        "gtf-transfers-ready"
      );

  }


  /* ==========================================================
     PUBLIC API
     ========================================================== */

  window.GTF_TRANSFERS = {

    config:
      CONFIG,

    state,

    initialize,

    loadAccounts,

    refresh:
      loadAccounts,

    validate:
      validateTransfer,

    reset:
      resetForm

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