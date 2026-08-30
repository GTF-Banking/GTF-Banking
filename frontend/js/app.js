/* =========================================================
   GLOBAL TRUSTFUND
   SHARED FRONTEND APPLICATION UTILITIES

   File:
   frontend/js/app.js

   Used by:
   - Public pages
   - Login / Signup
   - Customer portal
   - Admin portal
   - Manager portal
   - Cashier portal
   ========================================================= */

(function (window, document) {
  "use strict";

  /* =======================================================
     GTF APPLICATION OBJECT
     ======================================================= */

  const GTF_APP = {

    /* -------------------------------------------------------
       CONFIGURATION
       ------------------------------------------------------- */

    config: {
      brandName: "Global TrustFund",
      shortName: "GTF",

      storage: {
        theme: "gtf_theme",
        user: "gtf_user",
        token: "gtf_token",
        redirect: "gtf_redirect"
      },

      defaultCurrency: "USD",

      currencyLocales: {
        USD: "en-US",
        EUR: "de-DE",
        GBP: "en-GB",
        NGN: "en-NG",
        CAD: "en-CA",
        AUD: "en-AU",
        GHS: "en-GH",
        KES: "en-KE",
        ZAR: "en-ZA"
      }
    },


    /* =====================================================
       INITIALIZATION
       ===================================================== */

    init() {
      this.setupGlobalEvents();
      this.setupMobileNavigation();
      this.setupPasswordToggles();
      this.setupDismissibleAlerts();
      this.setupCurrentYear();
      this.restoreUserState();
    },


    /* =====================================================
       GLOBAL EVENTS
       ===================================================== */

    setupGlobalEvents() {

      document.addEventListener("click", (event) => {

        const target = event.target.closest(
          "[data-modal-open]"
        );

        if (target) {
          const modalId =
            target.getAttribute("data-modal-open");

          this.openModal(modalId);
        }


        const closeTarget =
          event.target.closest(
            "[data-modal-close]"
          );

        if (closeTarget) {
          const modal =
            closeTarget.closest(".modal");

          if (modal) {
            this.closeModal(modal);
          }
        }


        if (
          event.target.classList.contains("modal")
        ) {
          this.closeModal(event.target);
        }
      });


      document.addEventListener(
        "keydown",
        (event) => {

          if (event.key === "Escape") {
            this.closeAllModals();
          }
        }
      );
    },


    /* =====================================================
       MOBILE NAVIGATION
       ===================================================== */

    setupMobileNavigation() {

      const toggles =
        document.querySelectorAll(
          ".mobile-menu-toggle"
        );

      toggles.forEach((toggle) => {

        toggle.addEventListener(
          "click",
          () => {

            const menu =
              document.querySelector(
                ".main-nav"
              );

            if (!menu) return;

            menu.classList.toggle(
              "mobile-open"
            );

            toggle.classList.toggle(
              "active"
            );
          }
        );
      });
    },


    /* =====================================================
       PASSWORD TOGGLES
       ===================================================== */

    setupPasswordToggles() {

      document.addEventListener(
        "click",
        (event) => {

          const button =
            event.target.closest(
              "[data-password-toggle]"
            );

          if (!button) return;

          const targetId =
            button.getAttribute(
              "data-password-toggle"
            );

          const input =
            document.getElementById(
              targetId
            );

          if (!input) return;

          if (input.type === "password") {
            input.type = "text";

            button.setAttribute(
              "aria-label",
              "Hide password"
            );
          } else {
            input.type = "password";

            button.setAttribute(
              "aria-label",
              "Show password"
            );
          }
        }
      );
    },


    /* =====================================================
       DISMISSIBLE ALERTS
       ===================================================== */

    setupDismissibleAlerts() {

      document.addEventListener(
        "click",
        (event) => {

          const button =
            event.target.closest(
              "[data-alert-dismiss]"
            );

          if (!button) return;

          const alert =
            button.closest(".alert");

          if (alert) {
            alert.remove();
          }
        }
      );
    },


    /* =====================================================
       CURRENT YEAR
       ===================================================== */

    setupCurrentYear() {

      const year =
        new Date().getFullYear();

      document
        .querySelectorAll("[data-current-year]")
        .forEach((element) => {
          element.textContent = year;
        });
    },


    /* =====================================================
       USER STATE
       ===================================================== */

    restoreUserState() {

      try {

        const raw =
          localStorage.getItem(
            this.config.storage.user
          );

        if (!raw) return;

        const user =
          JSON.parse(raw);

        if (!user) return;

        document
          .querySelectorAll(
            "[data-user-name]"
          )
          .forEach((element) => {

            element.textContent =
              user.first_name ||
              user.name ||
              "Customer";
          });

        document
          .querySelectorAll(
            "[data-user-email]"
          )
          .forEach((element) => {

            element.textContent =
              user.email || "";
          });

      } catch (error) {

        console.warn(
          "Unable to restore user state.",
          error
        );
      }
    },


    /* =====================================================
       ALERT SYSTEM
       ===================================================== */

    showAlert(
      container,
      type,
      message,
      options = {}
    ) {

      if (!container) return;

      const allowedTypes = [
        "success",
        "danger",
        "warning",
        "info"
      ];

      const alertType =
        allowedTypes.includes(type)
          ? type
          : "info";

      const dismissible =
        options.dismissible !== false;

      const alert =
        document.createElement("div");

      alert.className =
        `alert alert-${alertType}`;

      alert.setAttribute(
        "role",
        "alert"
      );

      const content =
        document.createElement("div");

      content.textContent =
        message || "";

      alert.appendChild(content);


      if (dismissible) {

        const close =
          document.createElement("button");

        close.type = "button";

        close.setAttribute(
          "data-alert-dismiss",
          ""
        );

        close.setAttribute(
          "aria-label",
          "Dismiss"
        );

        close.textContent = "×";

        close.style.marginLeft = "auto";
        close.style.border = "0";
        close.style.background = "transparent";
        close.style.cursor = "pointer";
        close.style.fontSize = "18px";
        close.style.lineHeight = "1";

        alert.appendChild(close);
      }


      container.innerHTML = "";

      container.appendChild(alert);

      return alert;
    },


    /* =====================================================
       TOAST SYSTEM
       ===================================================== */

    toast(
      message,
      type = "info",
      duration = 4000
    ) {

      let container =
        document.querySelector(
          ".toast-container"
        );

      if (!container) {

        container =
          document.createElement("div");

        container.className =
          "toast-container";

        document.body.appendChild(
          container
        );
      }


      const toast =
        document.createElement("div");

      toast.className =
        `toast toast-${type}`;

      toast.setAttribute(
        "role",
        "status"
      );

      toast.textContent =
        message || "";

      container.appendChild(toast);


      if (duration > 0) {

        setTimeout(() => {

          toast.style.opacity = "0";
          toast.style.transform =
            "translateY(8px)";

          setTimeout(() => {
            toast.remove();
          }, 250);

        }, duration);
      }

      return toast;
    },


    /* =====================================================
       PASSWORD VALIDATION
       ===================================================== */

    validatePassword(password) {

      if (
        typeof password !== "string"
      ) {
        return false;
      }

      return (
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /\d/.test(password) &&
        /[^A-Za-z0-9]/.test(password)
      );
    },


    passwordStrength(password) {

      if (
        typeof password !== "string" ||
        password.length === 0
      ) {
        return 0;
      }

      let score = 0;


      if (password.length >= 8) {
        score++;
      }


      if (password.length >= 12) {
        score++;
      }


      if (/[a-z]/.test(password)) {
        score++;
      }


      if (/[A-Z]/.test(password)) {
        score++;
      }


      if (
        /\d/.test(password) ||
        /[^A-Za-z0-9]/.test(password)
      ) {
        score++;
      }


      return Math.min(
        score,
        5
      );
    },


    /* =====================================================
       EMAIL VALIDATION
       ===================================================== */

    validateEmail(email) {

      if (
        typeof email !== "string"
      ) {
        return false;
      }

      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(email.trim());
    },


    /* =====================================================
       PHONE VALIDATION
       ===================================================== */

    validatePhone(phone) {

      if (
        typeof phone !== "string"
      ) {
        return false;
      }

      const normalized =
        phone.replace(
          /[\s().-]/g,
          ""
        );

      return /^\+?[0-9]{7,15}$/
        .test(normalized);
    },


    /* =====================================================
       NAME VALIDATION
       ===================================================== */

    validateName(name) {

      if (
        typeof name !== "string"
      ) {
        return false;
      }

      const value =
        name.trim();

      return (
        value.length >= 2 &&
        value.length <= 80
      );
    },


    /* =====================================================
       CURRENCY FORMATTING
       ===================================================== */

    formatCurrency(
      amount,
      currency = this.config.defaultCurrency
    ) {

      const numericAmount =
        Number(amount);

      if (
        !Number.isFinite(
          numericAmount
        )
      ) {
        return "—";
      }


      const locale =
        this.config.currencyLocales[
          currency
        ] || "en-US";


      try {

        return new Intl.NumberFormat(
          locale,
          {
            style: "currency",
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }
        ).format(
          numericAmount
        );

      } catch (error) {

        return `${currency} ${numericAmount.toFixed(2)}`;
      }
    },


    /* =====================================================
       NUMBER FORMATTING
       ===================================================== */

    formatNumber(
      value,
      decimals = 2
    ) {

      const number =
        Number(value);

      if (
        !Number.isFinite(number)
      ) {
        return "0";
      }

      return new Intl.NumberFormat(
        "en-US",
        {
          minimumFractionDigits:
            decimals,
          maximumFractionDigits:
            decimals
        }
      ).format(number);
    },


    /* =====================================================
       PERCENTAGE
       ===================================================== */

    formatPercent(
      value,
      decimals = 1
    ) {

      const number =
        Number(value);

      if (
        !Number.isFinite(number)
      ) {
        return "0%";
      }

      return `${number.toFixed(decimals)}%`;
    },


    /* =====================================================
       DATE FORMATTING
       ===================================================== */

    formatDate(
      date,
      options = {}
    ) {

      if (!date) {
        return "—";
      }

      const parsed =
        new Date(date);

      if (
        Number.isNaN(
          parsed.getTime()
        )
      ) {
        return "—";
      }


      const defaultOptions = {
        year: "numeric",
        month: "short",
        day: "numeric"
      };


      return new Intl.DateTimeFormat(
        options.locale || "en-US",
        {
          ...defaultOptions,
          ...options
        }
      ).format(parsed);
    },


    /* =====================================================
       DATE + TIME
       ===================================================== */

    formatDateTime(date) {

      return this.formatDate(
        date,
        {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit"
        }
      );
    },


    /* =====================================================
       ACCOUNT NUMBER DISPLAY
       ===================================================== */

    maskAccountNumber(
      accountNumber
    ) {

      if (!accountNumber) {
        return "••••";
      }

      const value =
        String(accountNumber)
          .replace(/\s/g, "");

      if (value.length <= 4) {
        return value;
      }

      return (
        "•••• " +
        value.slice(-4)
      );
    },


    /* =====================================================
       CARD NUMBER DISPLAY
       ===================================================== */

    maskCardNumber(cardNumber) {

      if (!cardNumber) {
        return "•••• •••• ••••";
      }

      const value =
        String(cardNumber)
          .replace(/\s/g, "");

      const lastFour =
        value.slice(-4);

      return (
        "•••• •••• •••• " +
        lastFour
      );
    },


    /* =====================================================
       TEXT UTILITIES
       ===================================================== */

    escapeHTML(value) {

      const div =
        document.createElement("div");

      div.textContent =
        value == null
          ? ""
          : String(value);

      return div.innerHTML;
    },


    truncate(
      value,
      length = 80
    ) {

      if (!value) return "";

      const text =
        String(value);

      if (
        text.length <= length
      ) {
        return text;
      }

      return (
        text.slice(0, length - 1) +
        "…"
      );
    },


    capitalize(value) {

      if (!value) return "";

      const text =
        String(value);

      return (
        text.charAt(0).toUpperCase() +
        text.slice(1)
      );
    },


    /* =====================================================
       STORAGE
       ===================================================== */

    setStorage(
      key,
      value
    ) {

      try {

        localStorage.setItem(
          key,
          typeof value === "string"
            ? value
            : JSON.stringify(value)
        );

        return true;

      } catch (error) {

        console.warn(
          "Storage write failed.",
          error
        );

        return false;
      }
    },


    getStorage(key) {

      try {

        const value =
          localStorage.getItem(key);

        if (value === null) {
          return null;
        }

        try {
          return JSON.parse(value);
        } catch {
          return value;
        }

      } catch (error) {

        console.warn(
          "Storage read failed.",
          error
        );

        return null;
      }
    },


    removeStorage(key) {

      try {

        localStorage.removeItem(key);

        return true;

      } catch (error) {

        console.warn(
          "Storage remove failed.",
          error
        );

        return false;
      }
    },


    clearSession() {

      this.removeStorage(
        this.config.storage.user
      );

      this.removeStorage(
        this.config.storage.token
      );
    },


    /* =====================================================
       MODALS
       ===================================================== */

    openModal(modalOrId) {

      const modal =
        typeof modalOrId === "string"
          ? document.getElementById(
              modalOrId
            )
          : modalOrId;

      if (!modal) return;

      modal.classList.add("open");

      modal.setAttribute(
        "aria-hidden",
        "false"
      );

      document.body.style.overflow =
        "hidden";
    },


    closeModal(modalOrId) {

      const modal =
        typeof modalOrId === "string"
          ? document.getElementById(
              modalOrId
            )
          : modalOrId;

      if (!modal) return;

      modal.classList.remove("open");

      modal.setAttribute(
        "aria-hidden",
        "true"
      );

      if (
        !document.querySelector(
          ".modal.open"
        )
      ) {
        document.body.style.overflow =
          "";
      }
    },


    closeAllModals() {

      document
        .querySelectorAll(
          ".modal.open"
        )
        .forEach((modal) => {
          this.closeModal(modal);
        });
    },


    /* =====================================================
       LOADING BUTTON
       ===================================================== */

    setButtonLoading(
      button,
      loading,
      loadingText = "Please wait..."
    ) {

      if (!button) return;

      if (loading) {

        if (
          !button.dataset.originalText
        ) {
          button.dataset.originalText =
            button.textContent;
        }

        button.disabled = true;

        button.innerHTML = `
          <span class="loading">
            <span class="spinner"
              aria-hidden="true">
            </span>
            <span>${this.escapeHTML(
              loadingText
            )}</span>
          </span>
        `;

      } else {

        button.disabled = false;

        button.textContent =
          button.dataset.originalText ||
          "Submit";

        delete button.dataset.originalText;
      }
    },


    /* =====================================================
       FORM HELPERS
       ===================================================== */

    formToObject(form) {

      if (!form) {
        return {};
      }

      const formData =
        new FormData(form);

      const result = {};

      formData.forEach(
        (value, key) => {

          if (
            Object.prototype.hasOwnProperty
              .call(result, key)
          ) {

            if (
              !Array.isArray(
                result[key]
              )
            ) {
              result[key] = [
                result[key]
              ];
            }

            result[key].push(value);

          } else {

            result[key] = value;
          }
        }
      );

      return result;
    },


    clearFormErrors(form) {

      if (!form) return;

      form
        .querySelectorAll(
          ".field-error"
        )
        .forEach(
          (element) =>
            element.remove()
        );

      form
        .querySelectorAll(
          ".is-invalid"
        )
        .forEach(
          (element) =>
            element.classList.remove(
              "is-invalid"
            )
        );
    },


    showFieldError(
      input,
      message
    ) {

      if (!input) return;

      input.classList.add(
        "is-invalid"
      );


      const existing =
        input.parentElement
          ?.querySelector(
            ".field-error"
          );

      if (existing) {
        existing.textContent =
          message;
        return;
      }


      const error =
        document.createElement("div");

      error.className =
        "field-error";

      error.textContent =
        message;

      error.style.marginTop =
        "5px";

      error.style.color =
        "var(--danger)";

      error.style.fontSize =
        "10px";

      input.parentElement
        ?.appendChild(error);
    },


    /* =====================================================
       FETCH JSON HELPER
       ===================================================== */

    async fetchJSON(
      url,
      options = {}
    ) {

      const response =
        await fetch(
          url,
          {
            credentials:
              "same-origin",
            ...options,

            headers: {
              "Accept":
                "application/json",
              ...(options.body &&
              typeof options.body !==
                "string"
                ? {
                    "Content-Type":
                      "application/json"
                  }
                : {}),
              ...(options.headers || {})
            }
          }
        );


      let data = null;

      const contentType =
        response.headers.get(
          "content-type"
        ) || "";


      if (
        contentType.includes(
          "application/json"
        )
      ) {

        data =
          await response.json();

      } else {

        const text =
          await response.text();

        data =
          text
            ? { message: text }
            : {};
      }


      if (!response.ok) {

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
    },


    /* =====================================================
       REDIRECT HELPERS
       ===================================================== */

    redirect(url) {

      if (!url) return;

      window.location.href =
        url;
    },


    redirectAfterLogin(
      role
    ) {

      const routes = {

        customer:
          "customer/index.html",

        admin:
          "admin/index.html",

        manager:
          "manager/index.html",

        cashier:
          "cashier/index.html"
      };


      const destination =
        routes[
          String(role || "")
            .toLowerCase()
        ] ||
        "dashboard/index.html";


      this.redirect(
        destination
      );
    },


    /* =====================================================
       SAFE BACK NAVIGATION
       ===================================================== */

    goBack(
      fallback = "index.html"
    ) {

      if (
        window.history.length > 1 &&
        document.referrer
      ) {
        window.history.back();
        return;
      }

      window.location.href =
        fallback;
    },


    /* =====================================================
       ACTIVE NAVIGATION
       ===================================================== */

    markActiveNavigation() {

      const current =
        window.location.pathname
          .split("/")
          .pop() ||
        "index.html";


      document
        .querySelectorAll(
          "a[href]"
        )
        .forEach((link) => {

          const href =
            link.getAttribute("href");

          if (!href) return;

          if (
            href.startsWith("#") ||
            href.startsWith("http") ||
            href.startsWith("mailto:")
          ) {
            return;
          }


          const target =
            href.split("/")
              .pop()
              .split("?")[0];


          if (
            target === current
          ) {
            link.classList.add(
              "active"
            );
          }
        });
    },


    /* =====================================================
       DEBOUNCE
       ===================================================== */

    debounce(
      callback,
      delay = 300
    ) {

      let timer;

      return (...args) => {

        clearTimeout(timer);

        timer =
          setTimeout(
            () => callback(...args),
            delay
          );
      };
    },


    /* =====================================================
       COPY TO CLIPBOARD
       ===================================================== */

    async copyText(text) {

      if (!text) {
        return false;
      }


      try {

        await navigator.clipboard.writeText(
          String(text)
        );

        this.toast(
          "Copied to clipboard.",
          "success"
        );

        return true;

      } catch {

        const textarea =
          document.createElement(
            "textarea"
          );

        textarea.value =
          String(text);

        textarea.style.position =
          "fixed";

        textarea.style.opacity =
          "0";

        document.body.appendChild(
          textarea
        );

        textarea.select();

        let success = false;

        try {
          success =
            document.execCommand(
              "copy"
            );
        } catch {
          success = false;
        }

        textarea.remove();

        if (success) {
          this.toast(
            "Copied to clipboard.",
            "success"
          );
        }

        return success;
      }
    },


    /* =====================================================
       CONFIRM ACTION
       ===================================================== */

    confirmAction(
      message,
      callback
    ) {

      const confirmed =
        window.confirm(
          message ||
          "Are you sure you want to continue?"
        );

      if (
        confirmed &&
        typeof callback ===
          "function"
      ) {
        callback();
      }

      return confirmed;
    },


    /* =====================================================
       ONLINE STATUS
       ===================================================== */

    isOnline() {

      return navigator.onLine;
    },


    setupOnlineStatus() {

      window.addEventListener(
        "offline",
        () => {

          this.toast(
            "You are currently offline.",
            "warning",
            5000
          );
        }
      );


      window.addEventListener(
        "online",
        () => {

          this.toast(
            "Connection restored.",
            "success"
          );
        }
      );
    },


    /* =====================================================
       GENERIC DATA ATTRIBUTE ACTIONS
       ===================================================== */

    setupDataActions() {

      document.addEventListener(
        "click",
        (event) => {

          const copy =
            event.target.closest(
              "[data-copy]"
            );

          if (copy) {

            const value =
              copy.getAttribute(
                "data-copy"
              );

            this.copyText(value);

            return;
          }


          const back =
            event.target.closest(
              "[data-back]"
            );

          if (back) {

            const fallback =
              back.getAttribute(
                "data-back"
              ) ||
              "index.html";

            this.goBack(
              fallback
            );
          }
        }
      );
    },


    /* =====================================================
       PAGE PROTECTION HELPER
       ===================================================== */

    requireUser() {

      const token =
        this.getStorage(
          this.config.storage.token
        );

      const user =
        this.getStorage(
          this.config.storage.user
        );


      if (!token && !user) {

        this.setStorage(
          this.config.storage.redirect,
          window.location.href
        );

        window.location.href =
          "login.html";

        return false;
      }

      return true;
    },


    /* =====================================================
       USER ROLE
       ===================================================== */

    getUserRole() {

      const user =
        this.getStorage(
          this.config.storage.user
        );

      if (!user) {
        return null;
      }

      return (
        user.role ||
        user.user_role ||
        user.account_role ||
        null
      );
    },


    /* =====================================================
       LOGOUT
       ===================================================== */

    logout(
      redirect = "login.html"
    ) {

      this.clearSession();

      window.location.href =
        redirect;
    },


    /* =====================================================
       INITIAL PAGE SETUP
       ===================================================== */

    setupPage() {

      this.markActiveNavigation();

      this.setupOnlineStatus();

      this.setupDataActions();

      this.setupCurrentYear();

      this.setupMobileNavigation();

      this.restoreUserState();
    }
  };


  /* =======================================================
     GLOBAL EXPORT
     ======================================================= */

  window.GTF_APP =
    GTF_APP;


  /* =======================================================
     AUTO INITIALIZATION
     ======================================================= */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      () => {
        GTF_APP.init();
        GTF_APP.setupPage();
      }
    );

  } else {

    GTF_APP.init();
    GTF_APP.setupPage();
  }


})(window, document);
