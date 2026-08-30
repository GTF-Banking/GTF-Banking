/* =========================================================
   GLOBAL TRUSTFUND
   SHARED BRAND / LOGO LOADER
   frontend/js/logo-loader.js

   Provides one consistent GTF logo, header, navigation,
   mobile navigation and footer across the frontend.

   Usage:
     <div data-gtf-header></div>
     <div data-gtf-footer></div>

   The loader automatically determines whether the page
   is in the root, customer, admin, manager or cashier
   directory and adjusts relative links accordingly.
   ========================================================= */

(function (window, document) {
  "use strict";


  /* =======================================================
     CONFIGURATION
     ======================================================= */

  const BRAND = {
    name: "Global TrustFund",
    shortName: "GTF",
    tagline: "Secure. Trusted. Connected.",
    logoPath: "assets/gtf-logo.svg"
  };


  /* =======================================================
     DETERMINE BASE PATH
     ======================================================= */

  function getBasePath() {

    const path =
      window.location.pathname
        .toLowerCase();


    if (
      path.includes("/customer/")
    ) {
      return "../";
    }


    if (
      path.includes("/admin/")
    ) {
      return "../";
    }


    if (
      path.includes("/manager/")
    ) {
      return "../";
    }


    if (
      path.includes("/cashier/")
    ) {
      return "../";
    }


    if (
      path.includes("/dashboard/")
    ) {
      return "../";
    }


    return "";
  }


  const BASE =
    getBasePath();


  /* =======================================================
     URL HELPER
     ======================================================= */

  function url(path) {

    return BASE + path;
  }


  /* =======================================================
     LOGO MARKUP
     ======================================================= */

  function logoMarkup(
    options = {}
  ) {

    const {
      href = url("index.html"),
      centered = false,
      compact = false,
      light = false
    } = options;


    const classes = [
      "gtf-brand",
      compact
        ? "gtf-brand-compact"
        : "",
      light
        ? "gtf-brand-light"
        : "",
      centered
        ? "gtf-brand-centered"
        : ""
    ]
      .filter(Boolean)
      .join(" ");


    return `
      <a
        href="${href}"
        class="${classes}"
        aria-label="Global TrustFund home"
      >
        <span
          class="gtf-logo-mark"
          aria-hidden="true"
        >
          <span class="gtf-logo-letters">GT</span>
        </span>

        <span class="gtf-brand-copy">
          <span class="gtf-brand-name">
            Global TrustFund
          </span>
          <span class="gtf-brand-tagline">
            Banking
          </span>
        </span>
      </a>
    `;
  }


  /* =======================================================
     HEADER MARKUP
     ======================================================= */

  function headerMarkup() {

    return `
      <header class="gtf-site-header">

        <div class="gtf-header-inner">

          <div class="gtf-header-brand">
            ${logoMarkup()}
          </div>


          <button
            type="button"
            class="gtf-mobile-toggle"
            data-gtf-mobile-toggle
            aria-label="Open navigation"
            aria-expanded="false"
            aria-controls="gtf-main-navigation"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>


          <nav
            id="gtf-main-navigation"
            class="gtf-main-navigation"
            data-gtf-navigation
            aria-label="Main navigation"
          >

            <a
              href="${url("index.html")}"
              data-gtf-nav="home"
            >
              Home
            </a>

            <a
              href="${url("pages/personal.html")}"
              data-gtf-nav="personal"
            >
              Personal
            </a>

            <a
              href="${url("pages/business.html")}"
              data-gtf-nav="business"
            >
              Business
            </a>

            <a
              href="${url("pages/accounts.html")}"
              data-gtf-nav="accounts"
            >
              Accounts
            </a>

            <a
              href="${url("pages/cards.html")}"
              data-gtf-nav="cards"
            >
              Cards
            </a>

            <a
              href="${url("pages/loans.html")}"
              data-gtf-nav="loans"
            >
              Loans
            </a>

            <a
              href="${url("pages/security.html")}"
              data-gtf-nav="security"
            >
              Security
            </a>

            <a
              href="${url("support.html")}"
              data-gtf-nav="support"
            >
              Support
            </a>

          </nav>


          <div class="gtf-header-actions">

            <a
              href="${url("login.html")}"
              class="gtf-header-login"
            >
              Sign In
            </a>

            <a
              href="${url("signup.html")}"
              class="gtf-header-register"
            >
              Open Account
            </a>

          </div>

        </div>

      </header>
    `;
  }


  /* =======================================================
     AUTHENTICATED HEADER
     ======================================================= */

  function authenticatedHeaderMarkup(
    role = "customer"
  ) {

    const normalized =
      String(role)
        .toLowerCase();


    let dashboard =
      "customer/dashboard.html";


    if (
      normalized === "admin" ||
      normalized === "administrator"
    ) {
      dashboard =
        "admin/index.html";
    }


    if (
      normalized === "manager"
    ) {
      dashboard =
        "manager/index.html";
    }


    if (
      normalized === "cashier"
    ) {
      dashboard =
        "cashier/index.html";
    }


    return `
      <header class="gtf-site-header gtf-auth-header">

        <div class="gtf-header-inner">

          <div class="gtf-header-brand">
            ${logoMarkup()}
          </div>


          <button
            type="button"
            class="gtf-mobile-toggle"
            data-gtf-mobile-toggle
            aria-label="Open navigation"
            aria-expanded="false"
            aria-controls="gtf-main-navigation"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>


          <nav
            id="gtf-main-navigation"
            class="gtf-main-navigation"
            data-gtf-navigation
            aria-label="Account navigation"
          >

            <a href="${url(dashboard)}">
              Dashboard
            </a>

            ${
              normalized === "customer" ||
              normalized === "user" ||
              normalized === "client"
                ? `
                  <a href="${url("customer/accounts.html")}">
                    Accounts
                  </a>

                  <a href="${url("customer/transfers.html")}">
                    Transfers
                  </a>

                  <a href="${url("customer/payments.html")}">
                    Payments
                  </a>

                  <a href="${url("customer/cards.html")}">
                    Cards
                  </a>
                `
                : ""
            }

            ${
              normalized === "admin" ||
              normalized === "administrator"
                ? `
                  <a href="${url("admin/customers.html")}" >
                    Customers
                  </a>

                  <a href="${url("admin/transactions.html")}" >
                    Transactions
                  </a>

                  <a href="${url("admin/compliance.html")}" >
                    Compliance
                  </a>

                  <a href="${url("admin/reports.html")}" >
                    Reports
                  </a>
                `
                : ""
            }

            ${
              normalized === "manager"
                ? `
                  <a href="${url("manager/customers.html")}">
                    Customers
                  </a>

                  <a href="${url("manager/reports.html")}">
                    Reports
                  </a>
                `
                : ""
            }

            ${
              normalized === "cashier"
                ? `
                  <a href="${url("cashier/transactions.html")}">
                    Transactions
                  </a>

                  <a href="${url("cashier/customers.html")}">
                    Customers
                  </a>
                `
                : ""
            }

            <a href="${url("support.html")}" >
              Support
            </a>

          </nav>


          <div class="gtf-header-actions">

            <a
              href="${url(dashboard)}"
              class="gtf-header-login"
            >
              My Portal
            </a>

            <a
              href="${url("signout.html")}"
              class="gtf-header-register gtf-signout-link"
              data-logout
            >
              Sign Out
            </a>

          </div>

        </div>

      </header>
    `;
  }


  /* =======================================================
     FOOTER MARKUP
     ======================================================= */

  function footerMarkup() {

    return `
      <footer class="gtf-site-footer">

        <div class="gtf-footer-main">

          <div class="gtf-footer-brand">

            ${logoMarkup({
              href: url("index.html")
            })}

            <p>
              Secure digital banking experiences built
              around trust, simplicity and responsible
              financial technology.
            </p>

          </div>


          <div class="gtf-footer-column">

            <h3>Banking</h3>

            <a href="${url("pages/personal.html")}">
              Personal Banking
            </a>

            <a href="${url("pages/business.html")}">
              Business Banking
            </a>

            <a href="${url("pages/checking.html")}" >
              Checking
            </a>

            <a href="${url("pages/savings.html")}" >
              Savings
            </a>

            <a href="${url("pages/cards.html")}" >
              Cards
            </a>

          </div>


          <div class="gtf-footer-column">

            <h3>Resources</h3>

            <a href="${url("pages/loans.html")}" >
              Loans
            </a>

            <a href="${url("pages/security.html")}" >
              Security
            </a>

            <a href="${url("support.html")}" >
              Support
            </a>

            <a href="${url("pages/contact.html")}" >
              Contact
            </a>

            <a href="${url("pages/about.html")}" >
              About
            </a>

          </div>


          <div class="gtf-footer-column">

            <h3>Legal</h3>

            <a href="${url("terms.html")}" >
              Terms of Service
            </a>

            <a href="${url("privacy.html")}" >
              Privacy Policy
            </a>

            <a href="${url("pages/security.html")}" >
              Security
            </a>

          </div>

        </div>


        <div class="gtf-footer-bottom">

          <div>
            ©
            <span data-current-year>
              ${new Date().getFullYear()}
            </span>
            Global TrustFund.
            All rights reserved.
          </div>

          <div class="gtf-footer-status">
            <span
              class="gtf-status-dot"
              aria-hidden="true"
            ></span>
            Secure connection
          </div>

        </div>

      </footer>
    `;
  }


  /* =======================================================
     INSERT COMPONENT
     ======================================================= */

  function loadHeaders() {

    document
      .querySelectorAll(
        "[data-gtf-header]"
      )
      .forEach(
        container => {

          if (
            container.dataset.gtfLoaded ===
            "true"
          ) {
            return;
          }


          container.innerHTML =
            headerMarkup();


          container.dataset.gtfLoaded =
            "true";
        }
      );
  }


  function loadFooters() {

    document
      .querySelectorAll(
        "[data-gtf-footer]"
      )
      .forEach(
        container => {

          if (
            container.dataset.gtfLoaded ===
            "true"
          ) {
            return;
          }


          container.innerHTML =
            footerMarkup();


          container.dataset.gtfLoaded =
            "true";
        }
      );
  }


  /* =======================================================
     AUTHENTICATED HEADER LOADER
     ======================================================= */

  async function loadAuthenticatedHeaders() {

    const containers =
      document.querySelectorAll(
        "[data-gtf-auth-header]"
      );


    if (
      containers.length === 0
    ) {
      return;
    }


    let role =
      "customer";


    if (
      window.GTF_AUTH
    ) {

      try {

        role =
          await GTF_AUTH.getCurrentRole(
            false
          ) ||
          "customer";

      } catch (error) {

        console.warn(
          "GTF: Could not determine role for header.",
          error
        );
      }
    }


    containers.forEach(
      container => {

        if (
          container.dataset.gtfLoaded ===
          "true"
        ) {
          return;
        }


        container.innerHTML =
          authenticatedHeaderMarkup(
            role
          );


        container.dataset.gtfLoaded =
          "true";
      }
    );


    initializeNavigation();
  }


  /* =======================================================
     MOBILE NAVIGATION
     ======================================================= */

  function initializeNavigation() {

    document
      .querySelectorAll(
        "[data-gtf-mobile-toggle]"
      )
      .forEach(
        button => {

          if (
            button.dataset.gtfInitialized ===
            "true"
          ) {
            return;
          }


          button.dataset.gtfInitialized =
            "true";


          button.addEventListener(
            "click",
            () => {

              const navigation =
                document.querySelector(
                  "[data-gtf-navigation]"
                );


              if (!navigation) {
                return;
              }


              const open =
                navigation.classList
                  .toggle(
                    "gtf-navigation-open"
                  );


              button.classList.toggle(
                "gtf-toggle-open",
                open
              );


              button.setAttribute(
                "aria-expanded",
                open
                  ? "true"
                  : "false"
              );


              button.setAttribute(
                "aria-label",
                open
                  ? "Close navigation"
                  : "Open navigation"
              );
            }
          );
        }
      );


    /*
     * Close mobile navigation when a link
     * is selected.
     */
    document
      .querySelectorAll(
        "[data-gtf-navigation] a"
      )
      .forEach(
        link => {

          if (
            link.dataset.gtfInitialized ===
            "true"
          ) {
            return;
          }


          link.dataset.gtfInitialized =
            "true";


          link.addEventListener(
            "click",
            () => {

              const navigation =
                link.closest(
                  "[data-gtf-navigation]"
                );


              const button =
                document.querySelector(
                  "[data-gtf-mobile-toggle]"
                );


              if (navigation) {

                navigation.classList.remove(
                  "gtf-navigation-open"
                );
              }


              if (button) {

                button.classList.remove(
                  "gtf-toggle-open"
                );

                button.setAttribute(
                  "aria-expanded",
                  "false"
                );
              }
            }
          );
        }
      );


    markActiveNavigation();
  }


  /* =======================================================
     ACTIVE NAVIGATION
     ======================================================= */

  function markActiveNavigation() {

    const current =
      window.location.pathname
        .toLowerCase();


    document
      .querySelectorAll(
        "[data-gtf-navigation] a"
      )
      .forEach(
        link => {

          const href =
            link.getAttribute(
              "href"
            );


          if (!href) {
            return;
          }


          const normalizedHref =
            href
              .split("?")[0]
              .split("#")[0]
              .toLowerCase();


          const normalizedCurrent =
            current
              .replace(
                /\/$/,
                ""
              );


          if (
            normalizedCurrent.endsWith(
              normalizedHref
                .replace(
                  /\/$/,
                  ""
                )
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
     INJECT BASIC BRAND STYLES
     ======================================================= */

  function injectBrandStyles() {

    if (
      document.getElementById(
        "gtf-brand-loader-styles"
      )
    ) {
      return;
    }


    const style =
      document.createElement(
        "style"
      );


    style.id =
      "gtf-brand-loader-styles";


    style.textContent = `
      .gtf-brand {
        display:inline-flex;
        align-items:center;
        gap:11px;
        text-decoration:none;
        color:inherit;
        min-width:max-content;
      }

      .gtf-logo-mark {
        width:42px;
        height:42px;
        border-radius:12px;
        display:inline-flex;
        align-items:center;
        justify-content:center;
        position:relative;
        overflow:hidden;
        background:
          linear-gradient(
            145deg,
            #0b3d2e 0%,
            #0f5b43 65%,
            #b8860b 100%
          );
        border:1px solid
          rgba(184,134,11,.65);
        box-shadow:
          0 8px 20px
          rgba(11,61,46,.22);
      }

      .gtf-logo-mark::after {
        content:"";
        position:absolute;
        inset:4px;
        border:1px solid
          rgba(255,255,255,.32);
        border-radius:9px;
        pointer-events:none;
      }

      .gtf-logo-letters {
        position:relative;
        z-index:2;
        color:#fff;
        font-size:13px;
        font-weight:800;
        letter-spacing:-.5px;
      }

      .gtf-brand-copy {
        display:flex;
        flex-direction:column;
        line-height:1.05;
      }

      .gtf-brand-name {
        font-size:16px;
        font-weight:800;
        letter-spacing:-.35px;
      }

      .gtf-brand-tagline {
        margin-top:4px;
        font-size:9px;
        font-weight:700;
        letter-spacing:2px;
        text-transform:uppercase;
        color:#b8860b;
      }

      .gtf-site-header {
        position:relative;
        z-index:1000;
        background:
          rgba(255,255,255,.92);
        backdrop-filter:
          blur(18px);
        -webkit-backdrop-filter:
          blur(18px);
        border-bottom:1px solid
          rgba(11,61,46,.10);
      }

      .gtf-header-inner {
        width:min(1240px,calc(100% - 32px));
        min-height:76px;
        margin:0 auto;
        display:flex;
        align-items:center;
        gap:24px;
      }

      .gtf-header-brand {
        flex-shrink:0;
      }

      .gtf-main-navigation {
        flex:1;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:4px;
      }

      .gtf-main-navigation a {
        position:relative;
        display:inline-flex;
        align-items:center;
        min-height:42px;
        padding:0 10px;
        color:#18382f;
        text-decoration:none;
        font-size:12px;
        font-weight:650;
        border-radius:9px;
        transition:
          background .2s ease,
          color .2s ease;
      }

      .gtf-main-navigation a:hover,
      .gtf-main-navigation a.active {
        color:#0b3d2e;
        background:
          rgba(11,61,46,.07);
      }

      .gtf-main-navigation a.active::after {
        content:"";
        position:absolute;
        left:12px;
        right:12px;
        bottom:5px;
        height:2px;
        border-radius:99px;
        background:#b8860b;
      }

      .gtf-header-actions {
        display:flex;
        align-items:center;
        gap:8px;
        flex-shrink:0;
      }

      .gtf-header-login,
      .gtf-header-register {
        min-height:40px;
        display:inline-flex;
        align-items:center;
        justify-content:center;
        padding:0 15px;
        border-radius:9px;
        text-decoration:none;
        font-size:11px;
        font-weight:750;
        transition:
          transform .2s ease,
          box-shadow .2s ease,
          background .2s ease;
      }

      .gtf-header-login {
        color:#0b3d2e;
        border:1px solid
          rgba(11,61,46,.20);
        background:#fff;
      }

      .gtf-header-register {
        color:#fff;
        background:#0b3d2e;
        border:1px solid #0b3d2e;
        box-shadow:
          0 7px 18px
          rgba(11,61,46,.18);
      }

      .gtf-header-login:hover,
      .gtf-header-register:hover {
        transform:translateY(-1px);
      }

      .gtf-header-register:hover {
        background:#124d3a;
      }

      .gtf-mobile-toggle {
        display:none;
        width:42px;
        height:42px;
        margin-left:auto;
        border:1px solid
          rgba(11,61,46,.14);
        border-radius:10px;
        background:#fff;
        cursor:pointer;
        align-items:center;
        justify-content:center;
        flex-direction:column;
        gap:5px;
      }

      .gtf-mobile-toggle span {
        width:18px;
        height:2px;
        border-radius:99px;
        background:#0b3d2e;
        transition:
          transform .2s ease;
      }

      .gtf-site-footer {
        margin-top:60px;
        color:#e9f1ed;
        background:#082f24;
      }

      .gtf-footer-main {
        width:min(1240px,calc(100% - 32px));
        margin:0 auto;
        padding:54px 0 42px;
        display:grid;
        grid-template-columns:
          minmax(240px,1.7fr)
          repeat(3,minmax(130px,1fr));
        gap:40px;
      }

      .gtf-footer-brand p {
        max-width:360px;
        margin:17px 0 0;
        color:
          rgba(255,255,255,.68);
        font-size:12px;
        line-height:1.8;
      }

      .gtf-footer-column {
        display:flex;
        flex-direction:column;
        gap:10px;
      }

      .gtf-footer-column h3 {
        margin:0 0 8px;
        color:#b8860b;
        font-size:11px;
        text-transform:uppercase;
        letter-spacing:1.4px;
      }

      .gtf-footer-column a {
        color:
          rgba(255,255,255,.72);
        text-decoration:none;
        font-size:11px;
      }

      .gtf-footer-column a:hover {
        color:#fff;
      }

      .gtf-footer-bottom {
        width:min(1240px,calc(100% - 32px));
        margin:0 auto;
        padding:18px 0;
        border-top:1px solid
          rgba(255,255,255,.10);
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:20px;
        color:
          rgba(255,255,255,.52);
        font-size:10px;
      }

      .gtf-footer-status {
        display:flex;
        align-items:center;
        gap:7px;
      }

      .gtf-status-dot {
        width:7px;
        height:7px;
        border-radius:50%;
        background:#b8860b;
        box-shadow:
          0 0 0 4px
          rgba(184,134,11,.12);
      }

      @media (max-width:1000px) {

        .gtf-main-navigation {
          gap:0;
        }

        .gtf-main-navigation a {
          padding:0 7px;
          font-size:11px;
        }

        .gtf-header-actions {
          display:none;
        }

        .gtf-mobile-toggle {
          display:flex;
        }

        .gtf-header-inner {
          flex-wrap:wrap;
          padding:10px 0;
        }

        .gtf-main-navigation {
          display:none;
          flex-basis:100%;
          flex-direction:column;
          align-items:stretch;
          padding:8px 0 4px;
        }

        .gtf-main-navigation.gtf-navigation-open {
          display:flex;
        }

        .gtf-main-navigation a {
          min-height:46px;
          padding:0 13px;
        }

        .gtf-main-navigation a.active::after {
          left:auto;
          right:12px;
          bottom:10px;
          width:3px;
          height:26px;
        }

        .gtf-footer-main {
          grid-template-columns:
            repeat(2,1fr);
        }
      }

      @media (max-width:600px) {

        .gtf-header-inner {
          width:min(100% - 22px,1240px);
        }

        .gtf-logo-mark {
          width:39px;
          height:39px;
        }

        .gtf-brand-name {
          font-size:14px;
        }

        .gtf-footer-main {
          grid-template-columns:1fr;
          gap:30px;
          padding:40px 0 30px;
        }

        .gtf-footer-bottom {
          flex-direction:column;
          align-items:flex-start;
        }
      }

      html.gtf-auth-checking body {
        visibility:hidden;
      }

      html.gtf-auth-checking body::after {
        content:"";
        position:fixed;
        inset:0;
        z-index:999999;
        background:#f6faf8;
        visibility:visible;
      }
    `;


    document.head.appendChild(
      style
    );
  }


  /* =======================================================
     INITIALIZATION
     ======================================================= */

  async function init() {

    injectBrandStyles();

    loadHeaders();

    loadFooters();

    await loadAuthenticatedHeaders();

    initializeNavigation();

    markActiveNavigation();
  }


  /* =======================================================
     PUBLIC API
     ======================================================= */

  window.GTF_BRAND = {

    config: BRAND,

    basePath: BASE,

    url,

    logoMarkup,

    headerMarkup,

    authenticatedHeaderMarkup,

    footerMarkup,

    loadHeaders,

    loadFooters,

    loadAuthenticatedHeaders,

    initializeNavigation,

    markActiveNavigation,

    init
  };


  /* =======================================================
     DOM READY
     ======================================================= */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init,
      {
        once: true
      }
    );

  } else {

    init();
  }


})(window, document);
