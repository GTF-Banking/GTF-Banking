"use strict";

/*
 * ============================================================
 * GTF BANKING - GLOBAL LOGO / HEADER LOADER
 * ============================================================
 *
 * File:
 * frontend/js/logo-loader.js
 *
 * Purpose:
 * - Automatically creates the GTF Banking header
 * - Automatically loads gtf-logo.svg
 * - Automatically calculates the correct paths
 * - Works from:
 *      frontend/
 *      frontend/pages/
 *      frontend/admin/
 *      frontend/cashier/
 *      frontend/dashboard/
 *      frontend/manager/
 *
 * IMPORTANT:
 * The page must include this script once.
 * ============================================================
 */


/* ============================================================
   DETERMINE FRONTEND ROOT
============================================================ */

(function () {

  const currentScript =
    document.currentScript ||
    document.querySelector(
      'script[src*="logo-loader.js"]'
    );

  if (!currentScript) {
    console.error(
      "GTF Logo Loader: logo-loader.js was not found."
    );
    return;
  }


  /*
   * Resolve the location of logo-loader.js.
   *
   * Example:
   *
   * frontend/js/logo-loader.js
   *
   * From this we determine:
   *
   * frontend/
   */

  const scriptUrl =
    new URL(
      currentScript.src,
      window.location.href
    );


  const jsDirectory =
    new URL(
      "./",
      scriptUrl
    );


  const frontendDirectory =
    new URL(
      "../",
      jsDirectory
    );


  /*
   * Shared asset paths
   */

  const logoUrl =
    new URL(
      "assets/gtf-logo.svg",
      frontendDirectory
    ).href;


  const rootUrl =
    frontendDirectory.href;


/* ============================================================
   PAGE PATH HELPERS
============================================================ */

  function page(path) {

    return new URL(
      path,
      rootUrl
    ).href;

  }


/* ============================================================
   CURRENT PAGE
============================================================ */

  const currentPage =
    window.location.pathname
      .split("/")
      .pop()
      .toLowerCase();


/* ============================================================
   NAVIGATION
============================================================ */

  const navigation = [

    {
      label: "Home",
      path: "index.html",
      match: [
        "index.html",
        ""
      ]
    },

    {
      label: "About",
      path: "pages/about.html",
      match: [
        "about.html"
      ]
    },

    {
      label: "Personal",
      path: "pages/personal.html",
      match: [
        "personal.html"
      ]
    },

    {
      label: "Business",
      path: "pages/business.html",
      match: [
        "business.html"
      ]
    },

    {
      label: "Cards",
      path: "pages/cards.html",
      match: [
        "cards.html"
      ]
    },

    {
      label: "Checking",
      path: "pages/checking.html",
      match: [
        "checking.html"
      ]
    },

    {
      label: "Savings",
      path: "pages/savings.html",
      match: [
        "savings.html"
      ]
    },

    {
      label: "Loans",
      path: "pages/loans.html",
      match: [
        "loans.html"
      ]
    },

    {
      label: "Security",
      path: "pages/security.html",
      match: [
        "security.html"
      ]
    },

    {
      label: "Contact",
      path: "pages/contact.html",
      match: [
        "contact.html"
      ]
    }

  ];


/* ============================================================
   BUILD NAVIGATION
============================================================ */

  function buildNavigation() {

    return navigation
      .map(function (item) {

        const active =
          item.match.includes(
            currentPage
          );

        return `
          <a
            href="${page(item.path)}"
            class="gtf-global-nav-link${active ? " active" : ""}"
            ${active ? 'aria-current="page"' : ""}
          >
            ${item.label}
          </a>
        `;

      })
      .join("");

  }


/* ============================================================
   HEADER CSS
============================================================ */

  function injectStyles() {

    if (
      document.getElementById(
        "gtf-global-header-styles"
      )
    ) {
      return;
    }


    const style =
      document.createElement("style");

    style.id =
      "gtf-global-header-styles";


    style.textContent = `

      /* ==========================================
         GTF GLOBAL HEADER
      ========================================== */

      .gtf-global-header {

        position: sticky;
        top: 0;
        z-index: 9999;

        width: 100%;

        background: #ffffff;

        border-bottom:
          1px solid #dce4eb;

        box-shadow:
          0 2px 12px rgba(11, 42, 74, .06);

      }


      .gtf-global-header-inner {

        width:
          min(1180px, calc(100% - 32px));

        min-height: 72px;

        margin: 0 auto;

        display: flex;

        align-items: center;

        justify-content: space-between;

        gap: 20px;

      }


      /* ==========================================
         BRAND
      ========================================== */

      .gtf-global-brand {

        display: flex;

        align-items: center;

        gap: 10px;

        flex-shrink: 0;

        text-decoration: none;

      }


      .gtf-global-logo {

        width: 43px;
        height: 43px;

        display: block;

        object-fit: contain;

      }


      .gtf-global-brand-text strong {

        display: block;

        color: #0b2a4a;

        font-size: .94rem;

        line-height: 1.1;

      }


      .gtf-global-brand-text span {

        display: block;

        margin-top: 2px;

        color: #66788a;

        font-size: .52rem;

        line-height: 1.1;

      }


      /* ==========================================
         NAVIGATION
      ========================================== */

      .gtf-global-nav {

        display: flex;

        align-items: center;

        justify-content: center;

        gap: 18px;

      }


      .gtf-global-nav-link {

        position: relative;

        display: inline-flex;

        align-items: center;

        min-height: 72px;

        color: #42586b;

        font-size: .62rem;

        font-weight: 700;

        text-decoration: none;

        white-space: nowrap;

      }


      .gtf-global-nav-link:hover {

        color: #145da0;

      }


      .gtf-global-nav-link.active {

        color: #145da0;

      }


      .gtf-global-nav-link.active::after {

        content: "";

        position: absolute;

        left: 0;
        right: 0;

        bottom: 16px;

        height: 2px;

        background: #c9962b;

      }


      /* ==========================================
         ACTION BUTTONS
      ========================================== */

      .gtf-global-actions {

        display: flex;

        align-items: center;

        gap: 8px;

        flex-shrink: 0;

      }


      .gtf-global-action {

        min-height: 35px;

        padding:
          7px 13px;

        display: inline-flex;

        align-items: center;

        justify-content: center;

        border-radius: 5px;

        font-size: .59rem;

        font-weight: 700;

        text-decoration: none;

        white-space: nowrap;

      }


      .gtf-global-login {

        border:
          1px solid #145da0;

        background: #ffffff;

        color: #145da0;

      }


      .gtf-global-login:hover {

        background: #f0f6fb;

      }


      .gtf-global-open {

        border:
          1px solid #145da0;

        background: #145da0;

        color: #ffffff;

      }


      .gtf-global-open:hover {

        background: #0d477c;

      }


      /* ==========================================
         MOBILE BUTTON
      ========================================== */

      .gtf-global-mobile {

        display: none;

        width: 38px;
        height: 38px;

        border:
          1px solid #dce4eb;

        border-radius: 6px;

        background: #ffffff;

        color: #0b2a4a;

        font-size: 1.1rem;

        cursor: pointer;

      }


      /* ==========================================
         MOBILE MENU
      ========================================== */

      @media (max-width: 1100px) {

        .gtf-global-mobile {

          display: flex;

          align-items: center;

          justify-content: center;

        }


        .gtf-global-nav,
        .gtf-global-actions {

          display: none;

        }


        .gtf-global-header.mobile-open
        .gtf-global-header-inner {

          flex-wrap: wrap;

          padding-top: 12px;

          padding-bottom: 15px;

        }


        .gtf-global-header.mobile-open
        .gtf-global-nav {

          display: flex;

          width: 100%;

          flex-direction: column;

          align-items: stretch;

          gap: 0;

          order: 5;

        }


        .gtf-global-header.mobile-open
        .gtf-global-nav-link {

          min-height: auto;

          padding: 9px 0;

        }


        .gtf-global-header.mobile-open
        .gtf-global-nav-link.active::after {

          display: none;

        }


        .gtf-global-header.mobile-open
        .gtf-global-actions {

          display: flex;

          order: 6;

          width: 100%;

          padding-top: 8px;

        }

      }


      @media (max-width: 520px) {

        .gtf-global-header-inner {

          width:
            min(100% - 20px, 1180px);

        }


        .gtf-global-brand-text strong {

          font-size: .82rem;

        }


        .gtf-global-brand-text span {

          font-size: .46rem;

        }

      }

    `;


    document.head.appendChild(style);

  }


/* ============================================================
   CREATE HEADER
============================================================ */

  function createHeader() {

    /*
     * Don't create a second header if the page
     * already contains one created by this loader.
     */

    if (
      document.querySelector(
        "[data-gtf-global-header]"
      )
    ) {
      return;
    }


    const header =
      document.createElement("header");


    header.className =
      "gtf-global-header";


    header.setAttribute(
      "data-gtf-global-header",
      "true"
    );


    header.innerHTML = `

      <div class="gtf-global-header-inner">

        <a
          href="${page("index.html")}"
          class="gtf-global-brand"
          aria-label="GTF Banking home"
        >

          <img
            src="${logoUrl}"
            alt="GTF Banking logo"
            class="gtf-global-logo"
            width="43"
            height="43"
          >

          <span class="gtf-global-brand-text">

            <strong>
              GTF Banking
            </strong>

            <span>
              Banking made simple
            </span>

          </span>

        </a>


        <nav
          class="gtf-global-nav"
          aria-label="GTF Banking main navigation"
        >

          ${buildNavigation()}

        </nav>


        <div class="gtf-global-actions">

          <a
            href="${page("login.html")}"
            class="gtf-global-action gtf-global-login"
          >
            Sign In
          </a>

          <a
            href="${page("signup.html")}"
            class="gtf-global-action gtf-global-open"
          >
            Open Account
          </a>

        </div>


        <button
          type="button"
          class="gtf-global-mobile"
          aria-label="Open navigation"
          aria-expanded="false"
        >
          ☰
        </button>

      </div>

    `;


    /*
     * Put the header at the beginning of body.
     */

    document.body.insertBefore(
      header,
      document.body.firstChild
    );


    setupMobileNavigation(
      header
    );

  }


/* ============================================================
   MOBILE NAVIGATION
============================================================ */

  function setupMobileNavigation(
    header
  ) {

    const button =
      header.querySelector(
        ".gtf-global-mobile"
      );


    if (!button) {
      return;
    }


    button.addEventListener(
      "click",
      function () {

        const open =
          header.classList.toggle(
            "mobile-open"
          );


        button.setAttribute(
          "aria-expanded",
          String(open)
        );


        button.setAttribute(
          "aria-label",
          open
            ? "Close navigation"
            : "Open navigation"
        );


        button.textContent =
          open
            ? "×"
            : "☰";

      }
    );


    header
      .querySelectorAll(
        ".gtf-global-nav-link"
      )
      .forEach(function (link) {

        link.addEventListener(
          "click",
          function () {

            header.classList.remove(
              "mobile-open"
            );

            button.setAttribute(
              "aria-expanded",
              "false"
            );

            button.setAttribute(
              "aria-label",
              "Open navigation"
            );

            button.textContent =
              "☰";

          }
        );

      });

  }


/* ============================================================
   START LOADER
============================================================ */

  function initialize() {

    injectStyles();

    createHeader();

  }


  /*
   * Wait until the document body exists.
   */

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

})();