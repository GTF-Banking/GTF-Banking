/* =========================================================
   GLOBAL TRUSTFUND
   MASTER FRONTEND APPLICATION UTILITIES
   frontend/js/app.js

   Shared UI, formatting, navigation and accessibility
   utilities used throughout the Global TrustFund frontend.
   ========================================================= */

(function (window, document) {
  "use strict";


  /* =======================================================
     CONFIGURATION
     ======================================================= */

  const CONFIG = {
    BRAND_NAME: "Global TrustFund",

    DEFAULT_CURRENCY: "USD",

    LOADING_TEXT: "Please wait...",

    TOAST_DURATION: 4500
  };


  /* =======================================================
     DOM HELPERS
     ======================================================= */

  function $(selector, parent = document) {
    return parent.querySelector(selector);
  }


  function $$(selector, parent = document) {
    return Array.from(
      parent.querySelectorAll(selector)
    );
  }


  function byId(id) {
    return document.getElementById(id);
  }


  function createElement(
    tag,
    className = "",
    text = ""
  ) {

    const element =
      document.createElement(tag);

    if (className) {
      element.className =
        className;
    }

    if (text) {
      element.textContent =
        text;
    }

    return element;
  }


  /* =======================================================
     HTML ESCAPING
     ======================================================= */

  function escapeHtml(value) {

    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    return String(value)
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );
  }


  /* =======================================================
     ALERTS
     ======================================================= */

  function showAlert(
    container,
    type = "info",
    message = "",
    options = {}
  ) {

    if (!container) {
      return null;
    }


    const {
      dismissible = false,
      autoHide = false,
      duration = CONFIG.TOAST_DURATION
    } = options;


    container.innerHTML = "";


    const alert =
      createElement(
        "div",
        `alert alert-${type}`
      );


    alert.setAttribute(
      "role",
      type === "danger"
        ? "alert"
        : "status"
    );


    const messageElement =
      createElement(
        "span",
        "alert-message"
      );


    messageElement.innerHTML =
      escapeHtml(message)
        .replace(
          /\n/g,
          "<br>"
        );


    alert.appendChild(
      messageElement
    );


    if (dismissible) {

      const close =
        createElement(
          "button",
          "alert-close",
          "×"
        );

      close.type = "button";

      close.setAttribute(
        "aria-label",
        "Dismiss"
      );

      close.style.cssText =
        "float:right;background:none;border:0;cursor:pointer;font-size:18px;margin-left:12px;";

      close.addEventListener(
        "click",
        () => {
          alert.remove();
        }
      );

      alert.prepend(close);
    }


    container.appendChild(
      alert
    );


    if (autoHide) {

      setTimeout(
        () => {
          if (
            alert &&
            alert.parentNode
          ) {
            alert.remove();
          }
        },
        duration
      );
    }


    return alert;
  }


  /* =======================================================
     TOAST NOTIFICATIONS
     ======================================================= */

  function showToast(
    message,
    type = "info",
    duration = CONFIG.TOAST_DURATION
  ) {

    let container =
      byId(
        "gtf-toast-container"
      );


    if (!container) {

      container =
        createElement(
          "div",
          "gtf-toast-container"
        );

      container.id =
        "gtf-toast-container";


      container.style.cssText = `
        position:fixed;
        right:20px;
        bottom:20px;
        z-index:99999;
        display:flex;
        flex-direction:column;
        gap:10px;
        width:min(380px,calc(100% - 40px));
      `;


      document.body.appendChild(
        container
      );
    }


    const toast =
      createElement(
        "div",
        `alert alert-${type}`
      );


    toast.style.cssText += `
      margin:0;
      box-shadow:0 15px 35px rgba(0,0,0,.18);
    `;


    toast.textContent =
      message;


    container.appendChild(
      toast
    );


    setTimeout(
      () => {
        toast.remove();
      },
      duration
    );


    return toast;
  }


  /* =======================================================
     LOADING STATE
     ======================================================= */

  function setLoading(
    button,
    loading = true,
    text = CONFIG.LOADING_TEXT
  ) {

    if (!button) {
      return;
    }


    if (loading) {

      if (
        !button.dataset.originalText
      ) {
        button.dataset.originalText =
          button.textContent;
      }


      button.disabled = true;

      button.setAttribute(
        "aria-busy",
        "true"
      );


      button.innerHTML = `
        <span class="spinner"
              aria-hidden="true"></span>
        <span>${escapeHtml(text)}</span>
      `;

    } else {

      button.disabled = false;

      button.removeAttribute(
        "aria-busy"
      );


      if (
        button.dataset.originalText
      ) {

        button.textContent =
          button.dataset.originalText;

        delete button.dataset.originalText;
      }
    }
  }


  /* =======================================================
     PASSWORD VALIDATION
     ======================================================= */

  function validatePassword(
    password
  ) {

    if (
      typeof password !==
      "string"
    ) {
      return false;
    }


    return (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^A-Za-z0-9]/.test(password)
    );
  }


  function passwordStrength(
    password
  ) {

    if (
      typeof password !==
      "string" ||
      !password
    ) {
      return 0;
    }


    let score = 0;


    if (
      password.length >= 8
    ) {
      score++;
    }


    if (
      password.length >= 12
    ) {
      score++;
    }


    if (
      /[A-Z]/.test(password)
    ) {
      score++;
    }


    if (
      /[a-z]/.test(password)
    ) {
      score++;
    }


    if (
      /[0-9]/.test(password)
    ) {
      score++;
    }


    if (
      /[^A-Za-z0-9]/.test(password)
    ) {
      score++;
    }


    return Math.min(
      score,
      5
    );
  }


  /* =======================================================
     EMAIL VALIDATION
     ======================================================= */

  function validateEmail(
    email
  ) {

    if (
      typeof email !==
      "string"
    ) {
      return false;
    }


    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      .test(
        email.trim()
      );
  }


  /* =======================================================
     PHONE VALIDATION
     ======================================================= */

  function validatePhone(
    phone
  ) {

    if (
      typeof phone !==
      "string"
    ) {
      return false;
    }


    const normalized =
      phone.replace(
        /[\s().-]/g,
        ""
      );


    return /^\+?[0-9]{7,15}$/
      .test(
        normalized
      );
  }


  /* =======================================================
     CURRENCY FORMATTING
     ======================================================= */

  function formatCurrency(
    amount,
    currency = CONFIG.DEFAULT_CURRENCY,
    locale = undefined
  ) {

    const numeric =
      Number(amount);


    if (
      Number.isNaN(numeric)
    ) {
      return "—";
    }


    try {

      return new Intl.NumberFormat(
        locale,
        {
          style: "currency",
          currency
        }
      ).format(
        numeric
      );

    } catch (error) {

      return `${currency} ${numeric.toFixed(2)}`;
    }
  }


  /* =======================================================
     NUMBER FORMATTING
     ======================================================= */

  function formatNumber(
    value,
    decimals = 2,
    locale = undefined
  ) {

    const numeric =
      Number(value);


    if (
      Number.isNaN(numeric)
    ) {
      return "—";
    }


    return new Intl.NumberFormat(
      locale,
      {
        minimumFractionDigits:
          decimals,

        maximumFractionDigits:
          decimals
      }
    ).format(
      numeric
    );
  }


  /* =======================================================
     DATE FORMATTING
     ======================================================= */

  function formatDate(
    value,
    options = {}
  ) {

    if (!value) {
      return "—";
    }


    const date =
      value instanceof Date
        ? value
        : new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "—";
    }


    const defaultOptions = {
      year: "numeric",
      month: "short",
      day: "numeric"
    };


    try {

      return new Intl.DateTimeFormat(
        undefined,
        {
          ...defaultOptions,
          ...options
        }
      ).format(
        date
      );

    } catch (error) {

      return date.toLocaleDateString();
    }
  }


  function formatDateTime(
    value
  ) {

    return formatDate(
      value,
      {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      }
    );
  }


  /* =======================================================
     TIME AGO
     ======================================================= */

  function timeAgo(value) {

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


    const seconds =
      Math.floor(
        (
          Date.now() -
          date.getTime()
        ) / 1000
      );


    if (seconds < 60) {
      return "Just now";
    }


    const minutes =
      Math.floor(
        seconds / 60
      );


    if (minutes < 60) {
      return `${minutes}m ago`;
    }


    const hours =
      Math.floor(
        minutes / 60
      );


    if (hours < 24) {
      return `${hours}h ago`;
    }


    const days =
      Math.floor(
        hours / 24
      );


    if (days < 30) {
      return `${days}d ago`;
    }


    const months =
      Math.floor(
        days / 30
      );


    if (months < 12) {
      return `${months}mo ago`;
    }


    const years =
      Math.floor(
        months / 12
      );


    return `${years}y ago`;
  }


  /* =======================================================
     CAPITALIZATION
     ======================================================= */

  function capitalize(
    value
  ) {

    if (!value) {
      return "";
    }


    const text =
      String(value);


    return (
      text.charAt(0)
        .toUpperCase() +
      text.slice(1)
    );
  }


  function titleCase(
    value
  ) {

    if (!value) {
      return "";
    }


    return String(value)
      .toLowerCase()
      .split(/\s+/)
      .map(
        capitalize
      )
      .join(" ");
  }


  /* =======================================================
     INITIALS
     ======================================================= */

  function initials(
    value,
    maximum = 2
  ) {

    if (!value) {
      return "";
    }


    const words =
      String(value)
        .trim()
        .split(/\s+/);


    return words
      .slice(0, maximum)
      .map(
        word =>
          word
            .charAt(0)
            .toUpperCase()
      )
      .join("");
  }


  /* =======================================================
     DEBOUNCE
     ======================================================= */

  function debounce(
    callback,
    delay = 300
  ) {

    let timer;


    return function (...args) {

      clearTimeout(
        timer
      );


      timer =
        setTimeout(
          () => {
            callback.apply(
              this,
              args
            );
          },
          delay
        );
    };
  }


  /* =======================================================
     THROTTLE
     ======================================================= */

  function throttle(
    callback,
    delay = 300
  ) {

    let waiting = false;


    return function (...args) {

      if (waiting) {
        return;
      }


      callback.apply(
        this,
        args
      );


      waiting = true;


      setTimeout(
        () => {
          waiting = false;
        },
        delay
      );
    };
  }


  /* =======================================================
     QUERY STRING
     ======================================================= */

  function getQueryParam(
    name
  ) {

    const params =
      new URLSearchParams(
        window.location.search
      );


    return params.get(
      name
    );
  }


  function getQueryParams() {

    const params =
      new URLSearchParams(
        window.location.search
      );


    const result = {};


    params.forEach(
      (value, key) => {
        result[key] = value;
      }
    );


    return result;
  }


  /* =======================================================
     SAFE REDIRECT
     ======================================================= */

  function safeRedirect(
    url,
    fallback = "index.html"
  ) {

    if (!url) {
      window.location.href =
        fallback;

      return;
    }


    /*
     * Only allow local relative paths.
     * This prevents untrusted redirect URLs.
     */
    if (
      url.startsWith("/") &&
      !url.startsWith("//")
    ) {

      window.location.href =
        url;

      return;
    }


    if (
      url.startsWith("./") ||
      url.startsWith("../")
    ) {

      window.location.href =
        url;

      return;
    }


    /*
     * Absolute URLs are only allowed
     * for the current origin.
     */
    try {

      const target =
        new URL(
          url,
          window.location.origin
        );


      if (
        target.origin ===
        window.location.origin
      ) {

        window.location.href =
          target.href;

        return;
      }

    } catch (error) {
      // Use fallback below.
    }


    window.location.href =
      fallback;
  }


  /* =======================================================
     CURRENT PATH
     ======================================================= */

  function getCurrentPath() {
    return window.location.pathname;
  }


  function isPage(
    filename
  ) {

    return getCurrentPath()
      .endsWith(
        filename
      );
  }


  /* =======================================================
     MOBILE NAVIGATION
     ======================================================= */

  function initMobileMenu() {

    const button =
      document.querySelector(
        "[data-mobile-menu]"
      );


    const menu =
      document.querySelector(
        "[data-mobile-menu-target]"
      );


    if (
      !button ||
      !menu
    ) {
      return;
    }


    button.addEventListener(
      "click",
      () => {

        const open =
          menu.classList.toggle(
            "mobile-open"
          );


        button.setAttribute(
          "aria-expanded",
          open
            ? "true"
            : "false"
        );
      }
    );


    /*
     * Close the menu after selecting
     * a navigation link.
     */
    menu
      .querySelectorAll("a")
      .forEach(
        link => {

          link.addEventListener(
            "click",
            () => {

              menu.classList.remove(
                "mobile-open"
              );

              button.setAttribute(
                "aria-expanded",
                "false"
              );
            }
          );
        }
      );
  }


  /* =======================================================
     PASSWORD VISIBILITY
     ======================================================= */

  function initPasswordToggles() {

    $$(
      "[data-password-toggle]"
    ).forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const targetId =
              button.getAttribute(
                "data-password-toggle"
              );


            const input =
              byId(targetId);


            if (!input) {
              return;
            }


            const visible =
              input.type ===
              "text";


            input.type =
              visible
                ? "password"
                : "text";


            button.setAttribute(
              "aria-label",
              visible
                ? "Show password"
                : "Hide password"
            );


            button.textContent =
              visible
                ? "Show"
                : "Hide";
          }
        );
      }
    );
  }


  /* =======================================================
     ACTIVE NAVIGATION
     ======================================================= */

  function initActiveNavigation() {

    const current =
      window.location.pathname;


    $$(
      "a[href]"
    ).forEach(
      link => {

        const href =
          link.getAttribute(
            "href"
          );


        if (
          !href ||
          href.startsWith("#") ||
          href.startsWith("http")
        ) {
          return;
        }


        /*
         * Strip query and hash.
         */
        const cleanHref =
          href
            .split("?")[0]
            .split("#")[0];


        if (
          current.endsWith(
            cleanHref
          )
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


  /* =======================================================
     BACK BUTTON
     ======================================================= */

  function initBackButtons() {

    $$(
      "[data-back]"
    ).forEach(
      button => {

        button.addEventListener(
          "click",
          event => {

            event.preventDefault();


            if (
              window.history.length >
              1
            ) {

              window.history.back();

            } else {

              const fallback =
                button.getAttribute(
                  "data-back"
                ) ||
                "index.html";


              window.location.href =
                fallback;
            }
          }
        );
      }
    );
  }


  /* =======================================================
     CONFIRMATION LINKS
     ======================================================= */

  function initConfirmActions() {

    $$(
      "[data-confirm]"
    ).forEach(
      element => {

        element.addEventListener(
          "click",
          event => {

            const message =
              element.getAttribute(
                "data-confirm"
              );


            if (
              message &&
              !window.confirm(
                message
              )
            ) {
              event.preventDefault();
            }
          }
        );
      }
    );
  }


  /* =======================================================
     AUTO-FORMATTING
     ======================================================= */

  function applyCurrencyFormatting() {

    $$(
      "[data-currency]"
    ).forEach(
      element => {

        const amount =
          element.getAttribute(
            "data-currency"
          );


        const currency =
          element.getAttribute(
            "data-currency-code"
          ) ||
          CONFIG.DEFAULT_CURRENCY;


        element.textContent =
          formatCurrency(
            amount,
            currency
          );
      }
    );
  }


  function applyDateFormatting() {

    $$(
      "[data-date]"
    ).forEach(
      element => {

        const value =
          element.getAttribute(
            "data-date"
          );


        element.textContent =
          formatDate(
            value
          );
      }
    );
  }


  /* =======================================================
     SCROLL TO TOP
     ======================================================= */

  function initScrollTop() {

    let button =
      document.querySelector(
        "[data-scroll-top]"
      );


    if (!button) {
      return;
    }


    button.addEventListener(
      "click",
      () => {

        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });
      }
    );
  }


  /* =======================================================
     MODAL HELPERS
     ======================================================= */

  function openModal(
    modal
  ) {

    if (
      typeof modal ===
      "string"
    ) {
      modal =
        byId(modal) ||
        document.querySelector(
          modal
        );
    }


    if (!modal) {
      return;
    }


    modal.classList.add(
      "active"
    );


    modal.setAttribute(
      "aria-hidden",
      "false"
    );


    document.body.style.overflow =
      "hidden";
  }


  function closeModal(
    modal
  ) {

    if (
      typeof modal ===
      "string"
    ) {
      modal =
        byId(modal) ||
        document.querySelector(
          modal
        );
    }


    if (!modal) {
      return;
    }


    modal.classList.remove(
      "active"
    );


    modal.setAttribute(
      "aria-hidden",
      "true"
    );


    document.body.style.overflow =
      "";
  }


  function initModals() {

    $$(
      "[data-modal-open]"
    ).forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const target =
              button.getAttribute(
                "data-modal-open"
              );


            openModal(
              target
            );
          }
        );
      }
    );


    $$(
      "[data-modal-close]"
    ).forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const modal =
              button.closest(
                ".modal-overlay"
              );


            closeModal(
              modal
            );
          }
        );
      }
    );


    $$(".modal-overlay")
      .forEach(
        overlay => {

          overlay.addEventListener(
            "click",
            event => {

              if (
                event.target ===
                overlay
              ) {
                closeModal(
                  overlay
                );
              }
            }
          );
        }
      );


    document.addEventListener(
      "keydown",
      event => {

        if (
          event.key !==
          "Escape"
        ) {
          return;
        }


        $$(".modal-overlay.active")
          .forEach(
            closeModal
          );
      }
    );
  }


  /* =======================================================
     FORM HELPERS
     ======================================================= */

  function serializeForm(
    form
  ) {

    if (!form) {
      return {};
    }


    const data = {};


    new FormData(form)
      .forEach(
        (value, key) => {

          if (
            data[key] !==
            undefined
          ) {

            if (
              !Array.isArray(
                data[key]
              )
            ) {

              data[key] =
                [
                  data[key]
                ];
            }

            data[key].push(
              value
            );

          } else {

            data[key] =
              value;
          }
        }
      );


    return data;
  }


  function clearFormErrors(
    form
  ) {

    if (!form) {
      return;
    }


    $$(".field-error", form)
      .forEach(
        element => {
          element.remove();
        }
      );


    $$(".is-invalid", form)
      .forEach(
        element => {
          element.classList.remove(
            "is-invalid"
          );
        }
      );
  }


  function showFieldError(
    input,
    message
  ) {

    if (!input) {
      return;
    }


    input.classList.add(
      "is-invalid"
    );


    const error =
      createElement(
        "div",
        "field-error",
        message
      );


    error.style.cssText = `
      margin-top:6px;
      color:#b33a3a;
      font-size:10px;
    `;


    input.insertAdjacentElement(
      "afterend",
      error
    );
  }


  /* =======================================================
     LOCAL STORAGE JSON
     ======================================================= */

  function storageGet(
    key,
    fallback = null
  ) {

    try {

      const value =
        localStorage.getItem(
          key
        );


      if (
        value === null
      ) {
        return fallback;
      }


      return JSON.parse(
        value
      );

    } catch (error) {

      return fallback;
    }
  }


  function storageSet(
    key,
    value
  ) {

    try {

      localStorage.setItem(
        key,
        JSON.stringify(value)
      );


      return true;

    } catch (error) {

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

    } catch (error) {

      return false;
    }
  }


  /* =======================================================
     NETWORK STATUS
     ======================================================= */

  function initNetworkStatus() {

    const update =
      () => {

        const offline =
          !navigator.onLine;


        $$(
          "[data-network-status]"
        ).forEach(
          element => {

            element.textContent =
              offline
                ? "Offline"
                : "Online";


            element.classList.toggle(
              "offline",
              offline
            );
          }
        );
      };


    window.addEventListener(
      "online",
      update
    );


    window.addEventListener(
      "offline",
      update
    );


    update();
  }


  /* =======================================================
     YEAR
     ======================================================= */

  function initCurrentYear() {

    $$(
      "[data-current-year]"
    ).forEach(
      element => {

        element.textContent =
          new Date()
            .getFullYear();
      }
    );
  }


  /* =======================================================
     LOGGED-IN USER DISPLAY
     ======================================================= */

  function initUserDisplay() {

    if (
      !window.GTF_AUTH
    ) {
      return;
    }


    const user =
      GTF_AUTH.getStoredUser();


    if (!user) {
      return;
    }


    const name =
      GTF_AUTH.getUserDisplayName(
        user
      );


    $$(
      "[data-user-name]"
    ).forEach(
      element => {
        element.textContent =
          name;
      }
    );


    $$(
      "[data-user-email]"
    ).forEach(
      element => {
        element.textContent =
          user.email || "";
      }
    );


    $$(
      "[data-user-initials]"
    ).forEach(
      element => {
        element.textContent =
          initials(name);
      }
    );
  }


  /* =======================================================
     SIGN OUT LINKS
     ======================================================= */

  function initLogoutLinks() {

    $$(
      "[data-logout]"
    ).forEach(
      element => {

        element.addEventListener(
          "click",
          async event => {

            event.preventDefault();


            const confirmed =
              element.hasAttribute(
                "data-confirm-logout"
              )
                ? window.confirm(
                    "Are you sure you want to sign out?"
                  )
                : true;


            if (!confirmed) {
              return;
            }


            try {

              if (
                window.GTF_AUTH
              ) {

                await GTF_AUTH.logout(
                  true
                );

              } else {

                window.location.href =
                  "../signout.html";
              }

            } catch (error) {

              console.error(
                "GTF logout error:",
                error
              );

              window.location.href =
                "../login.html";
            }
          }
        );
      }
    );
  }


  /* =======================================================
     TOOLTIP TITLE SUPPORT
     ======================================================= */

  function initTooltips() {

    $$(
      "[data-tooltip]"
    ).forEach(
      element => {

        if (
          !element.getAttribute(
            "title"
          )
        ) {

          element.setAttribute(
            "title",
            element.getAttribute(
              "data-tooltip"
            )
          );
        }
      }
    );
  }


  /* =======================================================
     GLOBAL INITIALIZATION
     ======================================================= */

  function init() {

    initMobileMenu();

    initPasswordToggles();

    initActiveNavigation();

    initBackButtons();

    initConfirmActions();

    applyCurrencyFormatting();

    applyDateFormatting();

    initScrollTop();

    initModals();

    initNetworkStatus();

    initCurrentYear();

    initUserDisplay();

    initLogoutLinks();

    initTooltips();
  }


  /* =======================================================
     PUBLIC API
     ======================================================= */

  const GTF_APP = {

    config: CONFIG,

    $,
    $$,
    byId,
    createElement,

    escapeHtml,

    showAlert,
    showToast,

    setLoading,

    validatePassword,
    passwordStrength,
    validateEmail,
    validatePhone,

    formatCurrency,
    formatNumber,
    formatDate,
    formatDateTime,
    timeAgo,

    capitalize,
    titleCase,
    initials,

    debounce,
    throttle,

    getQueryParam,
    getQueryParams,

    safeRedirect,
    getCurrentPath,
    isPage,

    openModal,
    closeModal,

    serializeForm,
    clearFormErrors,
    showFieldError,

    storageGet,
    storageSet,
    storageRemove,

    init
  };


  /* =======================================================
     EXPORT
     ======================================================= */

  window.GTF_APP =
    GTF_APP;


  /* =======================================================
     DOM READY
     ======================================================= */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init
    );

  } else {

    init();
  }


})(window, document);
