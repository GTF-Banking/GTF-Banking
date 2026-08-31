/* ============================================================
   GLOBAL TRUSTFUND
   frontend/js/payments.js
   ------------------------------------------------------------
   Payment / bill-payment interface controller.

   Intended page:
     frontend/dashboard/payments.html

   Shared dependencies:
     api.js
     auth.js
     app.js
     logo-loader.js
     logo-guard.js
     dashboard.js

   SECURITY:
     This file only collects and submits a payment request.
     The backend MUST independently validate:
       - authentication
       - account ownership
       - account status
       - available balance
       - payment amount
       - payment limits
       - beneficiary/payee eligibility
       - currency
       - authorization
       - idempotency / duplicate requests
       - transaction state
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

      payments: "/payments",
      paymentsFallback: "/transactions/payments",

      beneficiaries: "/beneficiaries",
      beneficiariesFallback: "/users/me/beneficiaries"
    },

    selectors: {

      form:
        "[data-payment-form]",

      fromAccount:
        "[data-payment-from]",

      payee:
        "[data-payment-payee]",

      payeeName:
        "[data-payment-payee-name]",

      payeeAccount:
        "[data-payment-payee-account]",

      category:
        "[data-payment-category]",

      amount:
        "[data-payment-amount]",

      currency:
        "[data-payment-currency]",

      description:
        "[data-payment-description]",

      reference:
        "[data-payment-reference]",

      scheduleDate:
        "[data-payment-schedule-date]",

      submit:
        "[data-payment-submit]",

      reset:
        "[data-payment-reset]",

      balance:
        "[data-payment-balance]",

      summary:
        "[data-payment-summary]",

      summaryAmount:
        "[data-payment-summary-amount]",

      summaryFee:
        "[data-payment-summary-fee]",

      summaryTotal:
        "[data-payment-summary-total]",

      loading:
        "[data-payment-loading]",

      error:
        "[data-payment-error]",

      success:
        "[data-payment-success]",

      status:
        "[data-payment-status]",

      beneficiaryList:
        "[data-payment-beneficiary-list]",

      beneficiaryFields:
        "[data-payment-beneficiary-fields]"

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

    beneficiaries: [],

    selectedAccount: null,

    selectedBeneficiary: null,

    category: "",

    amount: 0,

    currency: "USD",

    fee: 0,

    payeeName: "",

    payeeAccount: "",

    description: "",

    reference: "",

    scheduleDate: ""

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
     * Prefer the application's shared API layer.
     */

    if (
      window.GTF_API &&
      typeof window.GTF_API.request === "function"
    ) {

      return window.GTF_API.request(
        endpoint,
        options
      );

    }


    if (
      window.GTF_API &&
      typeof window.GTF_API.get === "function" &&
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


    const response = await fetch(
      CONFIG.apiBase + endpoint,
      {
        credentials: "include",

        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {})
        },

        ...options
      }
    );


    let data = null;


    try {

      data = await response.json();

    } catch {

      data = null;

    }


    if (!response.ok) {

      const error = new Error(
        data?.message ||
        data?.error ||
        `Request failed (${response.status})`
      );

      error.status = response.status;
      error.data = data;

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
      typeof window.GTF_AUTH.requireAuth === "function"
    ) {

      try {

        const result =
          await window.GTF_AUTH.requireAuth();

        if (result === false) {

          redirectToLogin();

          return false;

        }

      } catch (error) {

        console.warn(
          "GTF Payments authentication:",
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

    if (state.loading) {
      return state.accounts;
    }


    state.loading = true;

    setLoading(true);

    clearMessages();


    try {

      let response;


      try {

        response = await apiRequest(
          CONFIG.endpoints.accounts
        );

      } catch (primaryError) {

        response = await apiRequest(
          CONFIG.endpoints.accountsFallback
        );

      }


      state.accounts =
        normalizeAccounts(
          extractArray(
            response,
            "accounts"
          )
        );


      populateAccountSelector();

      updateSelectedAccount();

      updateBalance();

      updateSummary();


      return state.accounts;

    } catch (error) {

      console.error(
        "GTF Payments account loading:",
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


      return [];

    } finally {

      state.loading = false;

      setLoading(false);

    }

  }


  /* ==========================================================
     LOAD BENEFICIARIES / PAYEES
  ========================================================== */

  async function loadBeneficiaries() {

    try {

      let response;


      try {

        response = await apiRequest(
          CONFIG.endpoints.beneficiaries
        );

      } catch (primaryError) {

        response = await apiRequest(
          CONFIG.endpoints.beneficiariesFallback
        );

      }


      state.beneficiaries =
        normalizeBeneficiaries(
          extractArray(
            response,
            "beneficiaries"
          )
        );


      populateBeneficiarySelector();


      return state.beneficiaries;

    } catch (error) {

      /*
       * Beneficiaries may be optional if the page
       * supports manually entered payees.
       */

      console.warn(
        "GTF Payments beneficiary loading:",
        error
      );


      state.beneficiaries = [];

      populateBeneficiarySelector();

      return [];

    }

  }


  /* ==========================================================
     EXTRACT ARRAY
  ========================================================== */

  function extractArray(
    response,
    property
  ) {

    if (Array.isArray(response)) {
      return response;
    }


    if (
      property &&
      Array.isArray(response?.[property])
    ) {
      return response[property];
    }


    if (
      property &&
      Array.isArray(response?.data?.[property])
    ) {
      return response.data[property];
    }


    if (Array.isArray(response?.data)) {
      return response.data;
    }


    return [];

  }


  /* ==========================================================
     NORMALIZE ACCOUNTS
  ========================================================== */

  function normalizeAccounts(accounts) {

    return accounts
      .map(account => {

        if (
          !account ||
          typeof account !== "object"
        ) {
          return null;
        }


        const balance = Number(
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
      .filter(account =>
        String(account.status)
          .toLowerCase()
          .includes("active")
      );

  }


  /* ==========================================================
     NORMALIZE BENEFICIARIES
  ========================================================== */

  function normalizeBeneficiaries(
    beneficiaries
  ) {

    return beneficiaries
      .map(item => {

        if (
          !item ||
          typeof item !== "object"
        ) {
          return null;
        }


        return {

          id:
            item.id ||
            item.beneficiary_id ||
            "",

          name:
            item.name ||
            item.beneficiary_name ||
            item.payee_name ||
            "Payee",

          accountNumber:
            item.account_number ||
            item.accountNumber ||
            item.payee_account ||
            "",

          category:
            item.category ||
            item.type ||
            "",

          currency:
            item.currency ||
            "USD",

          status:
            item.status ||
            "Active"

        };

      })
      .filter(Boolean)
      .filter(item =>
        String(item.status)
          .toLowerCase()
          .includes("active")
      );

  }


  /* ==========================================================
     ACCOUNT SELECTOR
  ========================================================== */

  function populateAccountSelector() {

    const select =
      $(CONFIG.selectors.fromAccount);


    if (!select) {
      return;
    }


    const currentValue =
      select.value;


    select.innerHTML = "";


    const placeholder =
      document.createElement("option");


    placeholder.value = "";

    placeholder.textContent =
      "Select payment account";


    select.appendChild(
      placeholder
    );


    state.accounts.forEach(account => {

      const option =
        document.createElement("option");


      option.value =
        account.id;


      option.textContent =
        `${account.name} — ${maskAccountNumber(
          account.accountNumber
        )}`;


      select.appendChild(
        option
      );

    });


    if (
      currentValue &&
      state.accounts.some(
        account =>
          account.id === currentValue
      )
    ) {

      select.value =
        currentValue;

    }

  }


  /* ==========================================================
     BENEFICIARY SELECTOR
  ========================================================== */

  function populateBeneficiarySelector() {

    const select =
      $(CONFIG.selectors.payee);


    if (!select) {
      return;
    }


    const currentValue =
      select.value;


    /*
     * If the page does not use a select,
     * do not attempt to modify it.
     */

    if (
      select.tagName !== "SELECT"
    ) {
      return;
    }


    select.innerHTML = "";


    const placeholder =
      document.createElement("option");


    placeholder.value = "";

    placeholder.textContent =
      "Select payee";


    select.appendChild(
      placeholder
    );


    state.beneficiaries.forEach(
      beneficiary => {

        const option =
          document.createElement("option");


        option.value =
          beneficiary.id;


        option.textContent =
          beneficiary.name;


        select.appendChild(
          option
        );

      }
    );


    if (
      currentValue &&
      state.beneficiaries.some(
        beneficiary =>
          beneficiary.id === currentValue
      )
    ) {

      select.value =
        currentValue;

    }

  }


  /* ==========================================================
     INITIALIZE SELECT EVENTS
  ========================================================== */

  function initializeSelectors() {

    const accountSelect =
      $(CONFIG.selectors.fromAccount);


    const payeeSelect =
      $(CONFIG.selectors.payee);


    const categorySelect =
      $(CONFIG.selectors.category);


    if (accountSelect) {

      accountSelect.addEventListener(
        "change",
        function () {

          state.selectedAccount =
            findAccount(
              accountSelect.value
            );

          updateBalance();

          updateSummary();

          validateForm();

        }
      );

    }


    if (payeeSelect) {

      payeeSelect.addEventListener(
        "change",
        function () {

          state.selectedBeneficiary =
            findBeneficiary(
              payeeSelect.value
            );


          applyBeneficiary();

          validateForm();

          updateSummary();

        }
      );

    }


    if (categorySelect) {

      categorySelect.addEventListener(
        "change",
        function () {

          state.category =
            categorySelect.value.trim();

          validateForm();

        }
      );

    }

  }


  /* ==========================================================
     FIND ACCOUNT
  ========================================================== */

  function findAccount(id) {

    return state.accounts.find(
      account =>
        String(account.id) ===
        String(id)
    ) || null;

  }


  /* ==========================================================
     FIND BENEFICIARY
  ========================================================== */

  function findBeneficiary(id) {

    return state.beneficiaries.find(
      beneficiary =>
        String(beneficiary.id) ===
        String(id)
    ) || null;

  }


  /* ==========================================================
     APPLY BENEFICIARY
  ========================================================== */

  function applyBeneficiary() {

    const beneficiary =
      state.selectedBeneficiary;


    if (!beneficiary) {
      return;
    }


    const nameInput =
      $(CONFIG.selectors.payeeName);


    const accountInput =
      $(CONFIG.selectors.payeeAccount);


    if (nameInput) {

      nameInput.value =
        beneficiary.name || "";

    }


    if (accountInput) {

      accountInput.value =
        beneficiary.accountNumber || "";

    }


    state.payeeName =
      beneficiary.name || "";


    state.payeeAccount =
      beneficiary.accountNumber || "";

  }


  /* ==========================================================
     UPDATE SELECTED ACCOUNT
  ========================================================== */

  function updateSelectedAccount() {

    const select =
      $(CONFIG.selectors.fromAccount);


    if (!select) {
      return;
    }


    state.selectedAccount =
      findAccount(
        select.value
      );

  }


  /* ==========================================================
     AMOUNT INPUT
  ========================================================== */

  function initializeAmountInput() {

    const input =
      $(CONFIG.selectors.amount);


    if (!input) {
      return;
    }


    input.addEventListener(
      "input",
      function () {

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


        if (amount > 0) {

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

    const nameInput =
      $(CONFIG.selectors.payeeName);


    const accountInput =
      $(CONFIG.selectors.payeeAccount);


    const description =
      $(CONFIG.selectors.description);


    const reference =
      $(CONFIG.selectors.reference);


    const scheduleDate =
      $(CONFIG.selectors.scheduleDate);


    if (nameInput) {

      nameInput.addEventListener(
        "input",
        function () {

          state.payeeName =
            nameInput.value.trim();

          validateForm();

        }
      );

    }


    if (accountInput) {

      accountInput.addEventListener(
        "input",
        function () {

          state.payeeAccount =
            accountInput.value.trim();

          validateForm();

        }
      );

    }


    if (description) {

      description.addEventListener(
        "input",
        function () {

          state.description =
            description.value.trim();

        }
      );

    }


    if (reference) {

      reference.addEventListener(
        "input",
        function () {

          state.reference =
            reference.value.trim();

        }
      );

    }


    if (scheduleDate) {

      scheduleDate.addEventListener(
        "change",
        function () {

          state.scheduleDate =
            scheduleDate.value;

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


    if (!select) {
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

        validateForm();

      }
    );

  }


  /* ==========================================================
     PARSE AMOUNT
  ========================================================== */

  function parseAmount(value) {

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
     UPDATE BALANCE
  ========================================================== */

  function updateBalance() {

    const element =
      $(CONFIG.selectors.balance);


    if (!element) {
      return;
    }


    const account =
      state.selectedAccount;


    if (!account) {

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
     PAYMENT FEE
     ----------------------------------------------------------
     The frontend does not invent a banking fee.
     The backend remains authoritative.
  ========================================================== */

  function calculateEstimatedFee() {

    return 0;

  }


  /* ==========================================================
     UPDATE PAYMENT SUMMARY
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
      .forEach(element => {

        element.hidden =
          state.amount <= 0;

      });

  }


  /* ==========================================================
     FORM VALIDATION
  ========================================================== */

  function validateForm() {

    const result =
      validatePayment();


    $$(CONFIG.selectors.submit)
      .forEach(button => {

        button.disabled =
          !result.valid ||
          state.submitting;

      });


    return result;

  }


  /* ==========================================================
     PAYMENT VALIDATION
  ========================================================== */

  function validatePayment() {

    const errors = [];


    const account =
      state.selectedAccount;


    const amount =
      parseAmount(
        $(
          CONFIG.selectors.amount
        )?.value
      );


    state.amount =
      amount;


    if (!account) {

      errors.push(
        "Select the account that will be charged."
      );

    }


    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {

      errors.push(
        "Enter a valid payment amount."
      );

    }


    if (
      account &&
      amount > account.balance
    ) {

      errors.push(
        "The payment amount exceeds the available balance shown for this account."
      );

    }


    if (
      amount > 100000000
    ) {

      errors.push(
        "The requested payment amount exceeds the permitted range."
      );

    }


    /*
     * A selected beneficiary can satisfy the payee fields.
     * Otherwise manually entered payee information is required.
     */

    const payeeName =
      $(
        CONFIG.selectors.payeeName
      )?.value.trim() ||
      state.payeeName;


    const payeeAccount =
      $(
        CONFIG.selectors.payeeAccount
      )?.value.trim() ||
      state.payeeAccount;


    if (
      !payeeName
    ) {

      errors.push(
        "Enter or select a payee."
      );

    }


    if (
      !payeeAccount
    ) {

      errors.push(
        "Enter a payee account or billing identifier."
      );

    }


    if (
      account &&
      state.currency &&
      account.currency &&
      state.currency !== account.currency
    ) {

      errors.push(
        "The selected payment currency does not match the source account currency."
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


    if (!form) {
      return;
    }


    form.addEventListener(
      "submit",
      async function (event) {

        event.preventDefault();


        if (state.submitting) {
          return;
        }


        clearMessages();


        const validation =
          validatePayment();


        if (!validation.valid) {

          showError(
            validation.errors.join(" ")
          );

          return;

        }


        await submitPayment();

      }
    );

  }


  /* ==========================================================
     SUBMIT PAYMENT
  ========================================================== */

  async function submitPayment() {

    if (state.submitting) {
      return;
    }


    state.submitting =
      true;


    setSubmitting(true);

    clearMessages();


    const payload =
      buildPaymentPayload();


    try {

      let response;


      try {

        response =
          await apiRequest(
            CONFIG.endpoints.payments,
            {
              method: "POST",

              body:
                JSON.stringify(
                  payload
                )
            }
          );

      } catch (primaryError) {

        response =
          await apiRequest(
            CONFIG.endpoints.paymentsFallback,
            {
              method: "POST",

              body:
                JSON.stringify(
                  payload
                )
            }
          );

      }


      handleSuccessfulPayment(
        response
      );

    } catch (error) {

      console.error(
        "GTF Payment:",
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
     BUILD PAYMENT PAYLOAD
  ========================================================== */

  function buildPaymentPayload() {

    const payeeName =
      $(
        CONFIG.selectors.payeeName
      )?.value.trim() ||
      state.payeeName;


    const payeeAccount =
      $(
        CONFIG.selectors.payeeAccount
      )?.value.trim() ||
      state.payeeAccount;


    return {

      account_id:
        state.selectedAccount?.id ||
        null,

      beneficiary_id:
        state.selectedBeneficiary?.id ||
        null,

      payee_name:
        payeeName ||
        null,

      payee_account:
        payeeAccount ||
        null,

      category:
        state.category ||
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
        null,

      scheduled_date:
        state.scheduleDate ||
        null

    };

  }


  /* ==========================================================
     SUCCESS HANDLER
  ========================================================== */

  function handleSuccessfulPayment(
    response
  ) {

    const payment =
      response?.payment ||
      response?.data?.payment ||
      response?.data ||
      response;


    const paymentId =
      payment?.id ||
      payment?.payment_id ||
      payment?.transaction_id ||
      "";


    let message =
      "Your payment request was submitted successfully.";


    if (paymentId) {

      message +=
        ` Reference: ${paymentId}.`;

    }


    showSuccess(
      message
    );


    resetForm({
      preserveSuccess: true
    });


    /*
     * Refresh account balances.
     */

    setTimeout(
      function () {

        loadAccounts();

      },
      300
    );

  }


  /* ==========================================================
     RESET
  ========================================================== */

  function initializeReset() {

    $$(CONFIG.selectors.reset)
      .forEach(button => {

        button.addEventListener(
          "click",
          function () {

            resetForm();

          }
        );

      });

  }


  function resetForm(
    options = {}
  ) {

    const form =
      $(CONFIG.selectors.form);


    if (form) {

      form.reset();

    }


    state.selectedAccount =
      null;

    state.selectedBeneficiary =
      null;

    state.category =
      "";

    state.amount =
      0;

    state.currency =
      "USD";

    state.fee =
      0;

    state.payeeName =
      "";

    state.payeeAccount =
      "";

    state.description =
      "";

    state.reference =
      "";

    state.scheduleDate =
      "";


    updateSelectedAccount();

    updateBalance();

    updateSummary();

    validateForm();


    if (!options.preserveSuccess) {

      clearMessages();

    }

  }


  /* ==========================================================
     SUBMIT BUTTON
  ========================================================== */

  function setSubmitting(
    submitting
  ) {

    $$(CONFIG.selectors.submit)
      .forEach(button => {

        button.disabled =
          submitting;


        button.classList.toggle(
          "is-loading",
          submitting
        );


        if (submitting) {

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
            "Make Payment";

        }

      });

  }


  /* ==========================================================
     LOADING
  ========================================================== */

  function setLoading(
    loading
  ) {

    $$(CONFIG.selectors.loading)
      .forEach(element => {

        element.hidden =
          !loading;

      });

  }


  /* ==========================================================
     ERROR
  ========================================================== */

  function showError(
    message
  ) {

    $$(CONFIG.selectors.error)
      .forEach(element => {

        element.hidden =
          false;

        element.textContent =
          message;

      });


    setStatus(
      "error",
      message
    );

  }


  /* ==========================================================
     SUCCESS
  ========================================================== */

  function showSuccess(
    message
  ) {

    $$(CONFIG.selectors.success)
      .forEach(element => {

        element.hidden =
          false;

        element.textContent =
          message;

      });


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
      .forEach(element => {

        element.hidden =
          true;

        element.textContent =
          "";

      });


    $$(CONFIG.selectors.success)
      .forEach(element => {

        element.hidden =
          true;

        element.textContent =
          "";

      });

  }


  /* ==========================================================
     STATUS
  ========================================================== */

  function setStatus(
    type,
    message
  ) {

    $$(CONFIG.selectors.status)
      .forEach(element => {

        element.dataset.status =
          type;

        element.textContent =
          message;

      });

  }


  /* ==========================================================
     TEXT
  ========================================================== */

  function setText(
    selector,
    value
  ) {

    $$(selector)
      .forEach(element => {

        element.textContent =
          value ?? "";

      });

  }


  /* ==========================================================
     CURRENCY FORMAT
  ========================================================== */

  function formatCurrency(
    amount,
    currency = "USD"
  ) {

    const value =
      Number(amount);


    if (!Number.isFinite(value)) {
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
     MASK ACCOUNT NUMBER
  ========================================================== */

  function maskAccountNumber(
    value
  ) {

    if (!value) {
      return "Account";
    }


    const clean =
      String(value)
        .replace(/\s+/g, "");


    if (clean.length <= 4) {
      return clean;
    }


    return (
      "•••• " +
      clean.slice(-4)
    );

  }


  /* ==========================================================
     ERROR MESSAGE
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
      "We could not process the payment request. Please try again."
    );

  }


  /* ==========================================================
     CONNECTION EVENTS
  ========================================================== */

  function initializeConnectionEvents() {

    window.addEventListener(
      "offline",
      function () {

        setStatus(
          "error",
          "You are offline. Payment requests are unavailable until the connection is restored."
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

    if (state.initialized) {
      return;
    }


    state.initialized =
      true;


    const authenticated =
      await verifyAuthentication();


    if (!authenticated) {
      return;
    }


    initializeSelectors();

    initializeAmountInput();

    initializeTextInputs();

    initializeCurrency();

    initializeForm();

    initializeReset();

    initializeConnectionEvents();

    initializeVisibilityEvents();


    await Promise.all([
      loadAccounts(),
      loadBeneficiaries()
    ]);


    updateSummary();

    validateForm();


    document.documentElement
      .classList.add(
        "gtf-payments-ready"
      );

  }


  /* ==========================================================
     PUBLIC API
  ========================================================== */

  window.GTF_PAYMENTS = {

    config:
      CONFIG,

    state,

    initialize,

    loadAccounts,

    loadBeneficiaries,

    refresh:
      loadAccounts,

    validate:
      validatePayment,

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