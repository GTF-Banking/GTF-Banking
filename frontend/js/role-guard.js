/* ============================================================
   GLOBAL TRUSTFUND
   LOGO-GUARD.JS
   ------------------------------------------------------------
   Purpose:
     - Protect against broken logo assets
     - Ensure a valid GTF logo is displayed
     - Work with logo-loader.js
     - Support root and nested frontend pages
     - Repair incorrect relative logo paths
     - Provide accessible fallback branding
     - Keep favicon synchronized
   ============================================================ */

(function (window, document) {
  "use strict";

  const CONFIG = {
    brandName: "Global TrustFund",
    brandShortName: "GTF",
    brandSubtitle: "Banking",

    logo: "assets/gtf-logo.svg",
    logoWhite: "assets/gtf-logo-white.svg",
    favicon: "assets/gtf-favicon.svg",

    maxRetries: 2,
    retryDelay: 500,

    logoSelectors: [
      "img[data-gtf-logo]",
      "img[data-gtf-logo-src]",
      ".gtf-logo-image",
      ".logo-link img",
      "img[alt*='Global TrustFund']"
    ]
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
     PATH RESOLUTION
  ========================================================== */

  function getAssetPrefix() {
    const path =
      window.location.pathname.replace(/\\/g, "/");

    const frontendIndex =
      path.indexOf("/frontend/");

    if (frontendIndex !== -1) {
      const afterFrontend =
        path.substring(
          frontendIndex + "/frontend/".length
        );

      const segments =
        afterFrontend
          .split("/")
          .filter(Boolean);

      if (segments.length <= 1) {
        return "";
      }

      return "../";
    }

    /*
     * Fallback for deployments where /frontend/
     * is not included in the URL.
     */

    const pathname =
      path.endsWith("/")
        ? path
        : path.substring(
            0,
            path.lastIndexOf("/") + 1
          );

    const segments =
      pathname
        .split("/")
        .filter(Boolean);

    return segments.length > 1
      ? "../"
      : "";
  }


  function resolveAsset(asset) {
    if (!asset) {
      return "";
    }

    if (
      asset.startsWith("/") ||
      /^(https?:)?\/\//i.test(asset)
    ) {
      return asset;
    }

    return getAssetPrefix() + asset;
  }


  /* ==========================================================
     LOGO SOURCE
  ========================================================== */

  function getLogoSource(image) {
    const isWhite =
      image.dataset.logoWhite === "true" ||
      image.closest(".logo-white") ||
      image.closest("[data-logo-white='true']");

    return resolveAsset(
      isWhite
        ? CONFIG.logoWhite
        : CONFIG.logo
    );
  }


  /* ==========================================================
     CREATE FALLBACK
  ========================================================== */

  function createFallbackLogo(image) {
    const link =
      image.closest(".logo-link");

    const wrapper =
      link || image.parentElement;

    if (!wrapper) {
      return;
    }

    /*
     * Prevent duplicate fallbacks.
     */

    if (
      wrapper.querySelector(
        ".gtf-logo-fallback"
      )
    ) {
      return;
    }

    const fallback =
      document.createElement("span");

    fallback.className =
      "gtf-logo-fallback";

    fallback.setAttribute(
      "aria-label",
      CONFIG.brandName
    );

    fallback.setAttribute(
      "role",
      "img"
    );

    fallback.innerHTML = `
      <span class="gtf-logo-fallback-mark">
        ${CONFIG.brandShortName}
      </span>

      <span class="gtf-logo-fallback-text">
        <strong>${CONFIG.brandName}</strong>
        <small>${CONFIG.brandSubtitle}</small>
      </span>
    `;

    image.style.display = "none";

    wrapper.insertBefore(
      fallback,
      image
    );
  }


  /* ==========================================================
     RESTORE LOGO
  ========================================================== */

  function restoreLogo(image) {
    const fallback =
      image.parentElement &&
      image.parentElement.querySelector(
        ".gtf-logo-fallback"
      );

    if (fallback) {
      fallback.remove();
    }

    image.style.display = "";

    image.classList.add(
      "gtf-logo-valid"
    );

    image.removeAttribute(
      "aria-hidden"
    );
  }


  /* ==========================================================
     LOGO VALIDATION
  ========================================================== */

  function validateLogo(image) {
    if (!image) {
      return;
    }

    /*
     * Ignore images that have already been
     * successfully validated.
     */

    if (
      image.dataset.logoValidated === "true"
    ) {
      return;
    }

    const expectedSource =
      getLogoSource(image);

    /*
     * Repair empty or obviously incorrect paths.
     */

    const currentSource =
      image.getAttribute("src") || "";

    const isKnownLogo =
      currentSource.includes(
        "gtf-logo.svg"
      ) ||
      currentSource.includes(
        "gtf-logo-white.svg"
      );

    if (
      !currentSource ||
      currentSource === "#" ||
      !isKnownLogo
    ) {
      image.src =
        expectedSource;
    }

    /*
     * Accessibility.
     */

    if (!image.alt) {
      image.alt =
        CONFIG.brandName;
    }

    image.loading =
      image.loading || "eager";

    image.decoding =
      image.decoding || "async";


    /*
     * Successful loading.
     */

    image.addEventListener(
      "load",
      function () {
        image.dataset.logoValidated =
          "true";

        restoreLogo(image);
      },
      { once: true }
    );


    /*
     * Failed loading.
     */

    image.addEventListener(
      "error",
      function () {
        handleLogoError(image);
      }
    );

  }


  /* ==========================================================
     LOGO ERROR HANDLER
  ========================================================== */

  function handleLogoError(image) {
    const attempts =
      Number(
        image.dataset.logoAttempts || 0
      );

    if (
      attempts < CONFIG.maxRetries
    ) {
      image.dataset.logoAttempts =
        String(attempts + 1);

      /*
       * Re-resolve the path before retrying.
       */

      image.src =
        getLogoSource(image) +
        `?retry=${Date.now()}`;

      return;
    }

    /*
     * All retries failed.
     */

    image.dataset.logoValidated =
      "false";

    createFallbackLogo(image);
  }


  /* ==========================================================
     INITIALIZE LOGOS
  ========================================================== */

  function initializeLogos() {
    const selector =
      CONFIG.logoSelectors.join(",");

    $$(selector)
      .forEach(validateLogo);
  }


  /* ==========================================================
     DYNAMIC LOGO OBSERVER
  ========================================================== */

  function initializeObserver() {
    if (
      !window.MutationObserver
    ) {
      return;
    }

    const observer =
      new MutationObserver(
        function (mutations) {
          mutations.forEach(
            function (mutation) {

              mutation.addedNodes.forEach(
                function (node) {

                  if (
                    node.nodeType !==
                    Node.ELEMENT_NODE
                  ) {
                    return;
                  }

                  if (
                    node.matches &&
                    node.matches(
                      "img"
                    )
                  ) {
                    validateLogo(node);
                  }

                  const images =
                    node.querySelectorAll
                      ? node.querySelectorAll(
                          "img"
                        )
                      : [];

                  Array.from(images)
                    .forEach(
                      validateLogo
                    );
                }
              );

            }
          );
        }
      );

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );

    window.GTFLogoObserver =
      observer;
  }


  /* ==========================================================
     FAVICON GUARD
  ========================================================== */

  function initializeFavicon() {
    let favicon =
      document.querySelector(
        "link[rel='icon']"
      );

    if (!favicon) {
      favicon =
        document.createElement("link");

      favicon.rel =
        "icon";

      document.head.appendChild(
        favicon
      );
    }

    favicon.href =
      resolveAsset(
        CONFIG.favicon
      );

    favicon.type =
      "image/svg+xml";
  }


  /* ==========================================================
     BRAND TEXT GUARD
  ========================================================== */

  function initializeBrandText() {
    $$("[data-gtf-brand]")
      .forEach(
        function (element) {

          const type =
            element.dataset.gtfBrand;

          if (type === "short") {
            element.textContent =
              CONFIG.brandShortName;

            return;
          }

          if (type === "subtitle") {
            element.textContent =
              CONFIG.brandSubtitle;

            return;
          }

          element.textContent =
            CONFIG.brandName;
        }
      );
  }


  /* ==========================================================
     GLOBAL BRAND STATE
  ========================================================== */

  function markReady() {
    document.documentElement
      .classList.add(
        "gtf-brand-ready"
      );

    document.documentElement
      .classList.remove(
        "gtf-brand-loading"
      );
  }


  /* ==========================================================
     MAIN INITIALIZER
  ========================================================== */

  function initialize() {
    document.documentElement
      .classList.add(
        "gtf-brand-loading"
      );

    /*
     * If logo-loader.js exists, allow it
     * to initialize first.
     */

    if (
      window.GTF_LOGO &&
      typeof window.GTF_LOGO.initialize ===
        "function"
    ) {
      try {
        window.GTF_LOGO.initialize();
      } catch (error) {
        console.warn(
          "GTF Logo Loader:",
          error
        );
      }
    }

    initializeLogos();

    initializeFavicon();

    initializeBrandText();

    initializeObserver();

    markReady();
  }


  /* ==========================================================
     PUBLIC API
  ========================================================== */

  window.GTF_LOGO_GUARD = {

    config: CONFIG,

    resolveAsset,

    validateLogo,

    initialize

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