/* ============================================================
   GLOBAL TRUSTFUND
   APP.JS
   ------------------------------------------------------------
   Shared frontend application controller.

   Responsibilities:
   - Mobile navigation
   - Header scroll state
   - Active navigation
   - Current year
   - Password utilities
   - Alerts
   - Form helpers
   - Password visibility
   - Generic loading states
   - Back navigation
   - Smooth scrolling
   - Currency formatting
   - Date/time formatting
   - Toast notifications
   - Accessibility helpers
   - Global error handling

   Load after:
       api.js
       auth.js

   Example:
       <script src="js/api.js"></script>
       <script src="js/auth.js"></script>
       <script src="js/app.js"></script>
       <script src="js/logo-loader.js"></script>
   ============================================================ */

(function (window, document) {
  "use strict";


  /* ==========================================================
     CONFIGURATION
     ========================================================== */

  const CONFIG = {

    MOBILE_BREAKPOINT: 900,

    HEADER_SCROLL_DISTANCE: 20,

    TOAST_DURATION: 4500,

    ANIMATION_THRESHOLD: 0.12,

    DEFAULT_CURRENCY: "USD",

    DEFAULT_LOCALE: "en-US"

  };


  /* ==========================================================
     GENERAL HELPERS
     ========================================================== */

  function $(selector, parent) {

    return (
      parent || document
    ).querySelector(selector);

  }


  function $$(selector, parent) {

    return Array.from(
      (
        parent || document
      ).querySelectorAll(selector)
    );

  }


  function byId(id) {

    return document.getElementById(id);

  }


  function isElement(element) {

    return (
      element instanceof
      Element
    );

  }


  function escapeHtml(value) {

    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  }


  function debounce(
    callback,
    delay = 250
  ) {

    let timer;

    return function (...args) {

      clearTimeout(timer);

      timer = setTimeout(
        () => callback.apply(this, args),
        delay
      );

    };

  }


  function throttle(
    callback,
    delay = 100
  ) {

    let waiting = false;

    return function (...args) {

      if (waiting) {
        return;
      }

      callback.apply(this, args);

      waiting = true;

      setTimeout(
        () => {
          waiting = false;
        },
        delay
      );

    };

  }


  /* ==========================================================
     CURRENT YEAR
     ========================================================== */

  function initializeCurrentYear() {

    const year =
      new Date().getFullYear();


    $$("[data-current-year], #current-year")
      .forEach(
        element => {
          element.textContent =
            year;
        }
      );

  }


  /* ==========================================================
     MOBILE NAVIGATION
     ========================================================== */

  function initializeMobileNavigation() {

    const menuButton =
      byId("mobile-menu-toggle");


    const mobileNavigation =
      byId("mobile-navigation");


    if (
      !menuButton ||
      !mobileNavigation
    ) {
      return;
    }


    function setMenuState(open) {

      mobileNavigation.classList.toggle(
        "open",
        open
      );

      menuButton.classList.toggle(
        "open",
        open
      );


      menuButton.setAttribute(
        "aria-expanded",
        String(open)
      );


      menuButton.setAttribute(
        "aria-label",
        open
          ? "Close navigation menu"
          : "Open navigation menu"
      );


      document.body.classList.toggle(
        "menu-open",
        open
      );

    }


    menuButton.addEventListener(
      "click",
      function () {

        const isOpen =
          mobileNavigation.classList.contains(
            "open"
          );


        setMenuState(
          !isOpen
        );

      }
    );


    /*
     * Close after selecting a navigation link.
     */

    $$("a", mobileNavigation)
      .forEach(
        link => {

          link.addEventListener(
            "click",
            function () {

              setMenuState(false);

            }
          );

        }
      );


    /*
     * Close when clicking outside.
     */

    document.addEventListener(
      "click",
      function (event) {

        if (
          !mobileNavigation.classList.contains(
            "open"
          )
        ) {
          return;
        }


        if (
          mobileNavigation.contains(
            event.target
          ) ||
          menuButton.contains(
            event.target
          )
        ) {
          return;
        }


        setMenuState(false);

      }
    );


    /*
     * Close with Escape.
     */

    document.addEventListener(
      "keydown",
      function (event) {

        if (
          event.key === "Escape"
        ) {

          setMenuState(false);

        }

      }
    );


    /*
     * Close when moving back to desktop.
     */

    window.addEventListener(
      "resize",
      debounce(
        function () {

          if (
            window.innerWidth >
            CONFIG.MOBILE_BREAKPOINT
          ) {

            setMenuState(false);

          }

        },
        150
      )
    );

  }


  /* ==========================================================
     HEADER SCROLL EFFECT
     ========================================================== */

  function initializeHeader() {

    const header =
      byId("site-header");


    if (!header) {
      return;
    }


    function updateHeader() {

      header.classList.toggle(
        "scrolled",
        window.scrollY >
        CONFIG.HEADER_SCROLL_DISTANCE
      );

    }


    updateHeader();


    window.addEventListener(
      "scroll",
      throttle(
        updateHeader,
        50
      ),
      {
        passive: true
      }
    );

  }


  /* ==========================================================
     ACTIVE NAVIGATION
     ========================================================== */

  function initializeActiveNavigation() {

    const currentPath =
      window.location.pathname;


    const currentFile =
      currentPath
        .split("/")
        .pop()
        .toLowerCase() ||
      "index.html";


    $$(
      ".nav-links a, .mobile-navigation a, .footer-column a"
    )
      .forEach(
        link => {

          const href =
            link.getAttribute("href");


          if (
            !href ||
            href.startsWith("#") ||
            href.startsWith("http://") ||
            href.startsWith("https://")
          ) {
            return;
          }


          const linkFile =
            href
              .split("/")
              .pop()
              .split("?")[0]
              .split("#")[0]
              .toLowerCase();


          if (
            linkFile &&
            linkFile === currentFile
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
     SMOOTH SCROLLING
     ========================================================== */

  function initializeSmoothScrolling() {

    $$(
      'a[href^="#"]'
    )
      .forEach(
        link => {

          link.addEventListener(
            "click",
            function (event) {

              const targetId =
                link.getAttribute(
                  "href"
                );


              if (
                !targetId ||
                targetId === "#"
              ) {
                return;
              }


              let target;


              try {

                target =
                  document.querySelector(
                    targetId
                  );

              } catch {

                return;

              }


              if (!target) {
                return;
              }


              event.preventDefault();


              const header =
                byId("site-header");


              const headerHeight =
                header
                  ? header.offsetHeight
                  : 0;


              const top =
                target.getBoundingClientRect()
                  .top +
                window.scrollY -
                headerHeight -
                16;


              window.scrollTo({
                top: Math.max(top, 0),
                behavior: "smooth"
              });


              /*
               * Update URL without jumping.
               */

              try {

                history.pushState(
                  null,
                  "",
                  targetId
                );

              } catch {
                /* Ignore history errors. */
              }

            }
          );

        }
      );

  }


  /* ==========================================================
     BACK BUTTONS
     ========================================================== */

  function initializeBackButtons() {

    $$(
      '[data-action="back"], .back-button'
    )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            function (event) {

              event.preventDefault();


              /*
               * Only use history when there is a
               * meaningful previous page.
               */

              if (
                document.referrer &&
                window.history.length > 1
              ) {

                window.history.back();

              } else {

                const fallback =
                  button.dataset.fallback ||
                  "index.html";


                window.location.href =
                  fallback;

              }

            }
          );

        }
      );

  }


  /* ==========================================================
     ALERT SYSTEM
     ========================================================== */

  function showAlert(
    container,
    type,
    message,
    options = {}
  ) {

    if (
      typeof container === "string"
    ) {

      container =
        byId(container) ||
        $(container);

    }


    if (!container) {
      return;
    }


    const alertType =
      [
        "success",
        "danger",
        "warning",
        "info"
      ].includes(type)
        ? type
        : "info";


    const dismissible =
      options.dismissible !== false;


    container.innerHTML = "";


    const alert =
      document.createElement(
        "div"
      );


    alert.className =
      `alert alert-${alertType}`;


    alert.setAttribute(
      "role",
      alertType === "danger"
        ? "alert"
        : "status"
    );


    const messageElement =
      document.createElement(
        "span"
      );


    messageElement.className =
      "alert-message";


    messageElement.textContent =
      String(
        message ||
        ""
      );


    alert.appendChild(
      messageElement
    );


    if (dismissible) {

      const close =
        document.createElement(
          "button"
        );


      close.type =
        "button";


      close.className =
        "alert-close";


      close.setAttribute(
        "aria-label",
        "Dismiss message"
      );


      close.innerHTML =
        "&times;";


      close.addEventListener(
        "click",
        function () {

          alert.remove();

        }
      );


      alert.appendChild(
        close
      );

    }


    container.appendChild(
      alert
    );


    if (
      options.autoHide
    ) {

      setTimeout(
        function () {

          if (
            alert.isConnected
          ) {
            alert.remove();
          }

        },
        options.autoHide
      );

    }


    return alert;

  }


  /* ==========================================================
     TOAST NOTIFICATIONS
     ========================================================== */

  function ensureToastContainer() {

    let container =
      byId("gtf-toast-container");


    if (container) {
      return container;
    }


    container =
      document.createElement(
        "div"
      );


    container.id =
      "gtf-toast-container";


    container.className =
      "toast-container";


    container.setAttribute(
      "aria-live",
      "polite"
    );


    container.setAttribute(
      "aria-atomic",
      "true"
    );


    document.body.appendChild(
      container
    );


    return container;

  }


  function showToast(
    message,
    type = "info",
    duration = CONFIG.TOAST_DURATION
  ) {

    const container =
      ensureToastContainer();


    const toast =
      document.createElement(
        "div"
      );


    toast.className =
      `toast toast-${type}`;


    toast.setAttribute(
      "role",
      type === "danger"
        ? "alert"
        : "status"
    );


    const content =
      document.createElement(
        "span"
      );


    content.textContent =
      String(message || "");


    toast.appendChild(
      content
    );


    const close =
      document.createElement(
        "button"
      );


    close.type =
      "button";


    close.className =
      "toast-close";


    close.setAttribute(
      "aria-label",
      "Dismiss notification"
    );


    close.innerHTML =
      "&times;";


    close.addEventListener(
      "click",
      function () {

        toast.remove();

      }
    );


    toast.appendChild(
      close
    );


    container.appendChild(
      toast
    );


    setTimeout(
      function () {

        if (
          toast.isConnected
        ) {

          toast.classList.add(
            "toast-hide"
          );


          setTimeout(
            () => toast.remove(),
            250
          );

        }

      },
      duration
    );


    return toast;

  }


  /* ==========================================================
     PASSWORD VISIBILITY
     ========================================================== */

  function initializePasswordToggles() {

    $$(
      '[data-password-toggle]'
    )
      .forEach(
        button => {

          const targetId =
            button.dataset.passwordToggle;


          const input =
            byId(targetId);


          if (!input) {
            return;
          }


          button.addEventListener(
            "click",
            function () {

              const visible =
                input.type === "text";


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


              button.setAttribute(
                "aria-pressed",
                String(!visible)
              );


              /*
               * Supports simple text/icon buttons.
               */

              if (
                button.dataset.showText
              ) {

                button.textContent =
                  visible
                    ? button.dataset.showText
                    : (
                        button.dataset.hideText ||
                        "Hide"
                      );

              }

            }
          );

        }
      );

  }


  /* ==========================================================
     GENERIC PASSWORD TOGGLE
     ========================================================== */

  function initializePasswordFields() {

    $$(
      'input[type="password"]'
    )
      .forEach(
        input => {

          if (
            input.dataset.toggleInitialized
          ) {
            return;
          }


          /*
           * Only automatically add a toggle when
           * explicitly requested.
           */

          if (
            input.dataset.passwordToggle !==
            "true"
          ) {
            return;
          }


          const wrapper =
            input.parentElement;


          if (!wrapper) {
            return;
          }


          const button =
            document.createElement(
              "button"
            );


          button.type =
            "button";


          button.className =
            "password-toggle";


          button.textContent =
            "Show";


          button.setAttribute(
            "aria-label",
            "Show password"
          );


          button.addEventListener(
            "click",
            function () {

              const isPassword =
                input.type ===
                "password";


              input.type =
                isPassword
                  ? "text"
                  : "password";


              button.textContent =
                isPassword
                  ? "Hide"
                  : "Show";


              button.setAttribute(
                "aria-label",
                isPassword
                  ? "Hide password"
                  : "Show password"
              );

            }
          );


          wrapper.appendChild(
            button
          );


          input.dataset.toggleInitialized =
            "true";

        }
      );

  }


  /* ==========================================================
     FORM VALIDATION HELPERS
     ========================================================== */

  function validateRequiredFields(
    form
  ) {

    if (!form) {
      return false;
    }


    let valid = true;


    $$(
      "[required]",
      form
    )
      .forEach(
        field => {

          const value =
            field.type === "checkbox"
              ? field.checked
              : String(
                  field.value || ""
                ).trim();


          if (!value) {

            valid = false;

            field.classList.add(
              "is-invalid"
            );

          } else {

            field.classList.remove(
              "is-invalid"
            );

          }

        }
      );


    return valid;

  }


  function initializeFormValidation() {

    $$("form")
      .forEach(
        form => {

          $$(
            "input, select, textarea",
            form
          )
            .forEach(
              field => {

                field.addEventListener(
                  "input",
                  function () {

                    if (
                      field.value ||
                      (
                        field.type ===
                        "checkbox" &&
                        field.checked
                      )
                    ) {

                      field.classList.remove(
                        "is-invalid"
                      );

                    }

                  }
                );


                field.addEventListener(
                  "change",
                  function () {

                    if (
                      field.value ||
                      (
                        field.type ===
                        "checkbox" &&
                        field.checked
                      )
                    ) {

                      field.classList.remove(
                        "is-invalid"
                      );

                    }

                  }
                );

              }
            );

        }
      );

  }


  /* ==========================================================
     LOADING STATES
     ========================================================== */

  function setLoading(
    element,
    loading,
    text = "Loading..."
  ) {

    if (!element) {
      return;
    }


    if (loading) {

      element.dataset
        .originalText =
        element.textContent;


      element.disabled =
        true;


      element.setAttribute(
        "aria-busy",
        "true"
      );


      element.classList.add(
        "loading"
      );


      if (
        text
      ) {

        element.textContent =
          text;

      }

    } else {

      element.disabled =
        false;


      element.removeAttribute(
        "aria-busy"
      );


      element.classList.remove(
        "loading"
      );


      if (
        element.dataset.originalText
      ) {

        element.textContent =
          element.dataset.originalText;

      }

    }

  }


  function initializeLoadingButtons() {

    $$(
      "[data-loading-text]"
    )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            function () {

              const text =
                button.dataset.loadingText;


              if (
                button.tagName ===
                "BUTTON"
              ) {

                setLoading(
                  button,
                  true,
                  text
                );

              }

            }
          );

        }
      );

  }


  /* ==========================================================
     PASSWORD STRENGTH
     ========================================================== */

  function passwordStrength(
    password
  ) {

    password =
      String(
        password || ""
      );


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
      /[a-z]/.test(password)
    ) {
      score++;
    }


    if (
      /[A-Z]/.test(password)
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


  function validatePassword(
    password
  ) {

    password =
      String(
        password || ""
      );


    return (
      password.length >= 8 &&
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^A-Za-z0-9]/.test(password)
    );

  }


  /* ==========================================================
     EMAIL VALIDATION
     ========================================================== */

  function validateEmail(
    email
  ) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      .test(
        String(
          email || ""
        )
          .trim()
          .toLowerCase()
      );

  }


  /* ==========================================================
     PHONE VALIDATION
     ========================================================== */

  function validatePhone(
    phone
  ) {

    const value =
      String(
        phone || ""
      ).trim();


    /*
     * Accept international numbers and common
     * formatting characters.
     */

    return /^[+]?[0-9\s().-]{7,25}$/
      .test(value);

  }


  /* ==========================================================
     CURRENCY FORMATTING
     ========================================================== */

  function formatCurrency(
    amount,
    currency = CONFIG.DEFAULT_CURRENCY,
    locale = CONFIG.DEFAULT_LOCALE
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


    try {

      return new Intl.NumberFormat(
        locale,
        {
          style: "currency",
          currency
        }
      ).format(
        numericAmount
      );

    } catch {

      return `${currency} ${numericAmount.toFixed(2)}`;

    }

  }


  /* ==========================================================
     NUMBER FORMATTING
     ========================================================== */

  function formatNumber(
    value,
    locale = CONFIG.DEFAULT_LOCALE
  ) {

    const number =
      Number(value);


    if (
      !Number.isFinite(number)
    ) {
      return "—";
    }


    return new Intl.NumberFormat(
      locale
    ).format(number);

  }


  /* ==========================================================
     DATE FORMATTING
     ========================================================== */

  function formatDate(
    value,
    options = {}
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


    const formatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
      ...options
    };


    try {

      return new Intl.DateTimeFormat(
        CONFIG.DEFAULT_LOCALE,
        formatOptions
      ).format(date);

    } catch {

      return date.toLocaleDateString();

    }

  }


  /* ==========================================================
     DATE + TIME FORMATTING
     ========================================================== */

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


  /* ==========================================================
     RELATIVE TIME
     ========================================================== */

  function relativeTime(
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


    const now =
      new Date();


    const difference =
      date.getTime() -
      now.getTime();


    const seconds =
      Math.round(
        difference / 1000
      );


    const minutes =
      Math.round(
        seconds / 60
      );


    const hours =
      Math.round(
        minutes / 60
      );


    const days =
      Math.round(
        hours / 24
      );


    try {

      const formatter =
        new Intl.RelativeTimeFormat(
          CONFIG.DEFAULT_LOCALE,
          {
            numeric: "auto"
          }
        );


      if (
        Math.abs(seconds) <
        60
      ) {

        return formatter.format(
          seconds,
          "second"
        );

      }


      if (
        Math.abs(minutes) <
        60
      ) {

        return formatter.format(
          minutes,
          "minute"
        );

      }


      if (
        Math.abs(hours) <
        24
      ) {

        return formatter.format(
          hours,
          "hour"
        );

      }


      return formatter.format(
        days,
        "day"
      );

    } catch {

      return formatDateTime(
        value
      );

    }

  }


  /* ==========================================================
     TEXT HELPERS
     ========================================================== */

  function capitalize(
    value
  ) {

    const text =
      String(
        value || ""
      ).trim();


    if (!text) {
      return "";
    }


    return (
      text.charAt(0).toUpperCase() +
      text.slice(1)
    );

  }


  function initials(
    firstName,
    lastName
  ) {

    const first =
      String(
        firstName || ""
      ).trim();


    const last =
      String(
        lastName || ""
      ).trim();


    return (
      (
        first.charAt(0) +
        last.charAt(0)
      )
        .toUpperCase() ||
      "G"
    );

  }


  /* ==========================================================
     COPY TO CLIPBOARD
     ========================================================== */

  async function copyToClipboard(
    value
  ) {

    const text =
      String(
        value ?? ""
      );


    if (!text) {
      return false;
    }


    try {

      await navigator.clipboard.writeText(
        text
      );


      showToast(
        "Copied to clipboard.",
        "success"
      );


      return true;

    } catch {

      /*
       * Fallback for older browsers.
       */

      const textarea =
        document.createElement(
          "textarea"
        );


      textarea.value =
        text;


      textarea.style.position =
        "fixed";


      textarea.style.opacity =
        "0";


      document.body.appendChild(
        textarea
      );


      textarea.select();


      try {

        document.execCommand(
          "copy"
        );


        textarea.remove();


        showToast(
          "Copied to clipboard.",
          "success"
        );


        return true;

      } catch {

        textarea.remove();

        return false;

      }

    }

  }


  function initializeCopyButtons() {

    $$(
      "[data-copy]"
    )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            async function () {

              const value =
                button.dataset.copy;


              await copyToClipboard(
                value
              );

            }
          );

        }
      );

  }


  /* ==========================================================
     CONFIRMATION ACTIONS
     ========================================================== */

  function initializeConfirmActions() {

    $$(
      "[data-confirm]"
    )
      .forEach(
        element => {

          element.addEventListener(
            "click",
            function (event) {

              const message =
                element.dataset.confirm ||
                "Are you sure you want to continue?";


              if (
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


  /* ==========================================================
     TABS
     ========================================================== */

  function initializeTabs() {

    $$(
      "[data-tabs]"
    )
      .forEach(
        tabContainer => {

          const buttons =
            $$(
              "[data-tab]",
              tabContainer
            );


          const panels =
            $$(
              "[data-tab-panel]",
              tabContainer
            );


          buttons.forEach(
            button => {

              button.addEventListener(
                "click",
                function () {

                  const target =
                    button.dataset.tab;


                  buttons.forEach(
                    item => {

                      const active =
                        item ===
                        button;


                      item.classList.toggle(
                        "active",
                        active
                      );


                      item.setAttribute(
                        "aria-selected",
                        String(active)
                      );

                    }
                  );


                  panels.forEach(
                    panel => {

                      panel.classList.toggle(
                        "active",
                        panel.dataset.tabPanel ===
                        target
                      );

                    }
                  );

                }
              );

            }
          );


          if (
            buttons.length &&
            !buttons.some(
              button =>
                button.classList.contains(
                  "active"
                )
            )
          ) {

            buttons[0].click();

          }

        }
      );

  }


  /* ==========================================================
     ACCORDIONS
     ========================================================== */

  function initializeAccordions() {

    $$(
      "[data-accordion-trigger]"
    )
      .forEach(
        trigger => {

          const targetId =
            trigger.dataset.accordionTrigger;


          const target =
            byId(targetId);


          if (!target) {
            return;
          }


          trigger.addEventListener(
            "click",
            function () {

              const open =
                trigger.getAttribute(
                  "aria-expanded"
                ) === "true";


              trigger.setAttribute(
                "aria-expanded",
                String(!open)
              );


              target.hidden =
                open;


              target.classList.toggle(
                "open",
                !open
              );

            }
          );

        }
      );

  }


  /* ==========================================================
     SCROLL REVEAL
     ========================================================== */

  function initializeScrollReveal() {

    const elements =
      $$(
        "[data-reveal]"
      );


    if (
      !elements.length
    ) {
      return;
    }


    if (
      !("IntersectionObserver" in window)
    ) {

      elements.forEach(
        element => {

          element.classList.add(
            "revealed"
          );

        }
      );

      return;

    }


    const observer =
      new IntersectionObserver(
        entries => {

          entries.forEach(
            entry => {

              if (
                entry.isIntersecting
              ) {

                entry.target.classList.add(
                  "revealed"
                );


                observer.unobserve(
                  entry.target
                );

              }

            }
          );

        },
        {
          threshold:
            CONFIG.ANIMATION_THRESHOLD
        }
      );


    elements.forEach(
      element => {

        observer.observe(
          element
        );

      }
    );

  }


  /* ==========================================================
     EXTERNAL LINKS
     ========================================================== */

  function initializeExternalLinks() {

    $$(
      'a[href^="http://"], a[href^="https://"]'
    )
      .forEach(
        link => {

          try {

            const url =
              new URL(
                link.href,
                window.location.href
              );


            if (
              url.hostname !==
              window.location.hostname
            ) {

              link.setAttribute(
                "target",
                "_blank"
              );


              link.setAttribute(
                "rel",
                "noopener noreferrer"
              );

            }

          } catch {
            /* Ignore invalid links. */
          }

        }
      );

  }


  /* ==========================================================
     DISABLE EMPTY HASH LINKS
     ========================================================== */

  function initializeEmptyLinks() {

    $$(
      'a[href="#"]'
    )
      .forEach(
        link => {

          link.addEventListener(
            "click",
            function (event) {

              event.preventDefault();

            }
          );

        }
      );

  }


  /* ==========================================================
     PAGE LOADING STATE
     ========================================================== */

  function initializePageLoader() {

    const loader =
      byId("page-loader");


    if (!loader) {
      return;
    }


    window.addEventListener(
      "load",
      function () {

        loader.classList.add(
          "loaded"
        );


        setTimeout(
          function () {

            loader.hidden =
              true;

          },
          400
        );

      }
    );

  }


  /* ==========================================================
     GLOBAL ERROR HANDLING
     ========================================================== */

  function initializeErrorHandling() {

    window.addEventListener(
      "unhandledrejection",
      function (event) {

        console.error(
          "Unhandled application error:",
          event.reason
        );

      }
    );


    window.addEventListener(
      "error",
      function (event) {

        console.error(
          "Frontend error:",
          event.error ||
          event.message
        );

      }
    );

  }


  /* ==========================================================
     OFFLINE / ONLINE STATUS
     ========================================================== */

  function initializeConnectionStatus() {

    const update =
      function () {

        document.body.classList.toggle(
          "is-offline",
          !navigator.onLine
        );


        if (
          !navigator.onLine
        ) {

          showToast(
            "You are offline. Some banking features may be unavailable.",
            "warning",
            6000
          );

        } else {

          /*
           * Only show reconnect message when
           * the page was previously offline.
           */

          if (
            document.body.dataset
              .wasOffline === "true"
          ) {

            showToast(
              "Connection restored.",
              "success"
            );

          }

          document.body.dataset.wasOffline =
            "false";

        }

      };


    window.addEventListener(
      "offline",
      function () {

        document.body.dataset.wasOffline =
          "true";


        update();

      }
    );


    window.addEventListener(
      "online",
      update
    );

  }


  /* ==========================================================
     FOCUS MANAGEMENT
     ========================================================== */

  function initializeFocusHelpers() {

    document.addEventListener(
      "click",
      function (event) {

        const button =
          event.target.closest(
            "[data-focus]"
          );


        if (!button) {
          return;
        }


        const targetId =
          button.dataset.focus;


        const target =
          byId(targetId);


        if (
          target &&
          typeof target.focus ===
          "function"
        ) {

          target.focus();

        }

      }
    );

  }


  /* ==========================================================
     MODAL HELPERS
     ========================================================== */

  function initializeModals() {

    $$(
      "[data-modal-open]"
    )
      .forEach(
        trigger => {

          const targetId =
            trigger.dataset.modalOpen;


          const modal =
            byId(targetId);


          if (!modal) {
            return;
          }


          trigger.addEventListener(
            "click",
            function () {

              modal.classList.add(
                "open"
              );


              modal.removeAttribute(
                "hidden"
              );


              document.body.classList.add(
                "modal-open"
              );


              const close =
                $(
                  "[data-modal-close]",
                  modal
                );


              if (close) {
                close.focus();
              }

            }
          );

        }
      );


    $$(
      "[data-modal-close]"
    )
      .forEach(
        close => {

          close.addEventListener(
            "click",
            function () {

              const modal =
                close.closest(
                  "[role='dialog'], .modal"
                );


              if (!modal) {
                return;
              }


              modal.classList.remove(
                "open"
              );


              modal.setAttribute(
                "hidden",
                ""
              );


              document.body.classList.remove(
                "modal-open"
              );

            }
          );

        }
      );


    document.addEventListener(
      "keydown",
      function (event) {

        if (
          event.key !==
          "Escape"
        ) {
          return;
        }


        const modal =
          $(
            ".modal.open, [role='dialog'].open"
          );


        if (!modal) {
          return;
        }


        const close =
          $(
            "[data-modal-close]",
            modal
          );


        if (close) {
          close.click();
        }

      }
    );

  }


  /* ==========================================================
     SEARCH FILTER
     ========================================================== */

  function initializeSearchFilters() {

    $$(
      "[data-filter-input]"
    )
      .forEach(
        input => {

          const targetId =
            input.dataset.filterInput;


          const target =
            byId(targetId);


          if (!target) {
            return;
          }


          const items =
            $$(
              "[data-filter-item]",
              target
            );


          input.addEventListener(
            "input",
            debounce(
              function () {

                const query =
                  input.value
                    .trim()
                    .toLowerCase();


                items.forEach(
                  item => {

                    const text =
                      item.textContent
                        .toLowerCase();


                    item.hidden =
                      query &&
                      !text.includes(
                        query
                      );

                  }
                );

              },
              150
            )
          );

        }
      );

  }


  /* ==========================================================
     TABLE SORTING
     ========================================================== */

  function initializeSortableTables() {

    $$(
      "table[data-sortable]"
    )
      .forEach(
        table => {

          const headers =
            $$(
              "thead th[data-sort]",
              table
            );


          const body =
            $("tbody", table);


          if (
            !body ||
            !headers.length
          ) {
            return;
          }


          headers.forEach(
            header => {

              header.style.cursor =
                "pointer";


              header.addEventListener(
                "click",
                function () {

                  const index =
                    Number(
                      header.dataset.sort
                    );


                  if (
                    !Number.isInteger(
                      index
                    )
                  ) {
                    return;
                  }


                  const rows =
                    Array.from(
                      body.querySelectorAll(
                        "tr"
                      )
                    );


                  const ascending =
                    header.dataset.direction !==
                    "asc";


                  rows.sort(
                    function (a, b) {

                      const aValue =
                        (
                          a.children[index]
                            ?.textContent ||
                          ""
                        ).trim();


                      const bValue =
                        (
                          b.children[index]
                            ?.textContent ||
                          ""
                        ).trim();


                      return ascending
                        ? aValue.localeCompare(
                            bValue,
                            undefined,
                            {
                              numeric: true,
                              sensitivity: "base"
                            }
                          )
                        : bValue.localeCompare(
                            aValue,
                            undefined,
                            {
                              numeric: true,
                              sensitivity: "base"
                            }
                          );

                    }
                  );


                  rows.forEach(
                    row => {
                      body.appendChild(
                        row
                      );
                    }
                  );


                  headers.forEach(
                    item => {
                      delete item.dataset.direction;
                    }
                  );


                  header.dataset.direction =
                    ascending
                      ? "asc"
                      : "desc";

                }
              );

            }
          );

        }
      );

  }


  /* ==========================================================
     AUTO FORMAT ELEMENTS
     ========================================================== */

  function initializeFormattedValues() {

    $$(
      "[data-currency]"
    )
      .forEach(
        element => {

          const value =
            element.dataset.currency;


          const currency =
            element.dataset.currencyCode ||
            CONFIG.DEFAULT_CURRENCY;


          element.textContent =
            formatCurrency(
              value,
              currency
            );

        }
      );


    $$(
      "[data-number]"
    )
      .forEach(
        element => {

          element.textContent =
            formatNumber(
              element.dataset.number
            );

        }
      );


    $$(
      "[data-date]"
    )
      .forEach(
        element => {

          element.textContent =
            formatDate(
              element.dataset.date
            );

        }
      );


    $$(
      "[data-datetime]"
    )
      .forEach(
        element => {

          element.textContent =
            formatDateTime(
              element.dataset.datetime
            );

        }
      );


    $$(
      "[data-relative-time]"
    )
      .forEach(
        element => {

          element.textContent =
            relativeTime(
              element.dataset.relativeTime
            );

        }
      );

  }


  /* ==========================================================
     AUTO INITIALIZATION
     ========================================================== */

  function initialize() {

    initializeCurrentYear();

    initializeMobileNavigation();

    initializeHeader();

    initializeActiveNavigation();

    initializeSmoothScrolling();

    initializeBackButtons();

    initializePasswordToggles();

    initializePasswordFields();

    initializeFormValidation();

    initializeLoadingButtons();

    initializeCopyButtons();

    initializeConfirmActions();

    initializeTabs();

    initializeAccordions();

    initializeScrollReveal();

    initializeExternalLinks();

    initializeEmptyLinks();

    initializePageLoader();

    initializeErrorHandling();

    initializeConnectionStatus();

    initializeFocusHelpers();

    initializeModals();

    initializeSearchFilters();

    initializeSortableTables();

    initializeFormattedValues();

  }


  /* ==========================================================
     PUBLIC GTF APP OBJECT
     ========================================================== */

  const GTF_APP = {

    config: CONFIG,

    $, 
    $$,
    byId,

    escapeHtml,

    debounce,
    throttle,

    showAlert,
    showToast,

    setLoading,

    passwordStrength,
    validatePassword,
    validateEmail,
    validatePhone,

    formatCurrency,
    formatNumber,
    formatDate,
    formatDateTime,
    relativeTime,

    capitalize,
    initials,

    copyToClipboard,

    initialize,

    /*
     * API reference if api.js has already loaded.
     */
    api:
      window.GTF_API ||
      null,

    /*
     * Authentication reference if auth.js
     * has already loaded.
     */
    auth:
      window.GTF_AUTH ||
      null

  };


  /*
   * Preserve any existing GTF_APP properties
   * created by api.js/auth.js.
   */

  window.GTF_APP =
    Object.assign(
      window.GTF_APP || {},
      GTF_APP
    );


  /* ==========================================================
     START APPLICATION
     ========================================================== */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initialize
    );

  } else {

    initialize();

  }


})(window, document);