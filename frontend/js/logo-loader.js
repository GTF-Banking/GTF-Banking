/* ============================================================
   GLOBAL TRUSTFUND
   LOGO-LOADER.JS
   ------------------------------------------------------------
   Shared branding / logo loader.

   Logo assets:
       frontend/assets/gtf-logo.svg
       frontend/assets/gtf-logo-white.svg
       frontend/assets/gtf-favicon.svg

   Supports:
       frontend/index.html
       frontend/login.html
       frontend/signup.html
       frontend/dashboard/*.html
       frontend/admin/*.html
       frontend/cashier/*.html
       frontend/manager/*.html

   Usage:
       <script src="js/logo-loader.js"></script>

   Optional HTML:
       <a class="logo-link" data-gtf-logo href="index.html"></a>

   Or:
       <img data-gtf-logo src="" alt="Global TrustFund">
   ============================================================ */

(function (window, document) {
  "use strict";


  /* ==========================================================
     CONFIGURATION
     ========================================================== */

  const CONFIG = {

    brandName: "Global TrustFund",

    brandSubtitle: "Banking",

    logo: "assets/gtf-logo.svg",

    logoWhite: "assets/gtf-logo-white.svg",

    favicon: "assets/gtf-favicon.svg",

    logoAlt: "Global TrustFund",

    defaultLogoClass: "gtf-logo-image",

    defaultMarkClass: "gtf-logo-mark",

    defaultTextClass: "gtf-logo-text"

  };


  /* ==========================================================
     PATH HELPERS
     ========================================================== */

  function getPageDepth() {

    const path =
      window.location.pathname
        .replace(/\\/g, "/");


    /*
     * If the current URL ends with a file,
     * remove the filename before calculating depth.
     */

    let directory =
      path;


    if (
      !path.endsWith("/")
    ) {

      directory =
        path.substring(
          0,
          path.lastIndexOf("/") + 1
        );

    }


    const parts =
      directory
        .split("/")
        .filter(Boolean);


    /*
     * GitHub Pages / Vercel root:
     *
     * frontend/
     *   index.html
     *
     * requires:
     * assets/logo.svg
     *
     * dashboard/index.html
     * requires:
     * ../assets/logo.svg
     *
     * admin/index.html
     * requires:
     * ../assets/logo.svg
     */

    return parts.length;

  }


  function getAssetPrefix() {

    /*
     * Determine whether this file is being served
     * from a subdirectory.
     */

    const path =
      window.location.pathname
        .replace(/\\/g, "/");


    const frontendIndex =
      path.indexOf("/frontend/");


    if (
      frontendIndex !== -1
    ) {

      const afterFrontend =
        path.substring(
          frontendIndex +
          "/frontend/".length
        );


      const segments =
        afterFrontend
          .split("/")
          .filter(Boolean);


      /*
       * Root frontend files:
       * frontend/index.html
       *
       * segments:
       * ["index.html"]
       */

      if (
        segments.length <= 1
      ) {

        return "";

      }


      /*
       * Nested frontend pages:
       * frontend/admin/index.html
       *
       * segments:
       * ["admin", "index.html"]
       */

      return "../";

    }


    /*
     * Generic fallback for deployments where
     * /frontend/ is not visible in the URL.
     */

    const depth =
      getPageDepth();


    if (
      depth <= 1
    ) {

      return "";

    }


    return "../";

  }


  function resolveAsset(
    relativePath
  ) {

    if (
      !relativePath
    ) {
      return "";
    }


    /*
     * Absolute URLs remain unchanged.
     */

    if (
      /^(https?:)?\/\//i.test(
        relativePath
      )
    ) {

      return relativePath;

    }


    /*
     * Root-relative paths.
     */

    if (
      relativePath.startsWith("/")
    ) {

      return relativePath;

    }


    return (
      getAssetPrefix() +
      relativePath
    );

  }


  /* ==========================================================
     CREATE LOGO MARKUP
     ========================================================== */

  function createLogoMarkup(
    options = {}
  ) {

    const {

      white = false,

      showText = true,

      showSubtitle = true,

      href = "index.html",

      className = "",

      imageClass =
        CONFIG.defaultLogoClass,

      textClass =
        CONFIG.defaultTextClass,

      target = "",

      ariaLabel =
        `${CONFIG.brandName} home`

    } = options;


    const logoSource =
      resolveAsset(
        white
          ? CONFIG.logoWhite
          : CONFIG.logo
      );


    const link =
      document.createElement(
        "a"
      );


    link.className =
      `logo-link ${className}`
        .trim();


    link.href =
      resolveNavigation(
        href
      );


    link.setAttribute(
      "aria-label",
      ariaLabel
    );


    if (target) {

      link.target =
        target;

    }


    /*
     * Logo image.
     */

    const image =
      document.createElement(
        "img"
      );


    image.className =
      imageClass;


    image.src =
      logoSource;


    image.alt =
      CONFIG.logoAlt;


    image.loading =
      "eager";


    image.decoding =
      "async";


    image.width =
      180;


    image.height =
      52;


    image.addEventListener(
      "error",
      function () {

        /*
         * If the SVG cannot load, replace it
         * with a clean text-based fallback.
         */

        image.remove();


        const fallback =
          document.createElement(
            "span"
          );


        fallback.className =
          CONFIG.defaultMarkClass;


        fallback.textContent =
          "GTF";


        link.insertBefore(
          fallback,
          link.firstChild
        );

      }
    );


    link.appendChild(
      image
    );


    /*
     * Optional text beside logo.
     */

    if (
      showText
    ) {

      const text =
        document.createElement(
          "span"
        );


      text.className =
        textClass;


      const brand =
        document.createElement(
          "strong"
        );


      brand.textContent =
        CONFIG.brandName;


      text.appendChild(
        brand
      );


      if (
        showSubtitle
      ) {

        const subtitle =
          document.createElement(
            "small"
          );


        subtitle.textContent =
          CONFIG.brandSubtitle;


        text.appendChild(
          subtitle
        );

      }


      link.appendChild(
        text
      );

    }


    return link;

  }


  /* ==========================================================
     NAVIGATION PATH RESOLVER
     ========================================================== */

  function resolveNavigation(
    href
  ) {

    if (
      !href
    ) {
      return "index.html";
    }


    /*
     * Do not modify:
     * - #
     * - javascript:
     * - mailto:
     * - tel:
     * - http(s)
     */

    if (
      href.startsWith("#") ||
      href.startsWith("javascript:") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      /^(https?:)?\/\//i.test(href)
    ) {

      return href;

    }


    /*
     * If already explicitly relative to the
     * current directory, leave it alone.
     */

    if (
      href.startsWith("./") ||
      href.startsWith("../")
    ) {

      return href;

    }


    /*
     * Nested pages need ../.
     */

    const prefix =
      getAssetPrefix();


    return prefix + href;

  }


  /* ==========================================================
     INITIALIZE DATA-LOGO ELEMENTS
     ========================================================== */

  function initializeDataLogos() {

    $$(
      "[data-gtf-logo]"
    )
      .forEach(
        element => {

          const white =
            element.dataset.logoWhite ===
            "true";


          const showText =
            element.dataset.logoText !==
            "false";


          const showSubtitle =
            element.dataset.logoSubtitle !==
            "false";


          const href =
            element.dataset.logoHref ||
            "index.html";


          const className =
            element.dataset.logoClass ||
            "";


          const logo =
            createLogoMarkup({
              white,
              showText,
              showSubtitle,
              href,
              className
            });


          /*
           * Preserve custom attributes.
           */

          if (
            element.id
          ) {

            logo.id =
              element.id;

          }


          element.replaceWith(
            logo
          );

        }
      );

  }


  /* ==========================================================
     INITIALIZE LOGO IMAGE ELEMENTS
     ========================================================== */

  function initializeLogoImages() {

    $$(
      "img[data-gtf-logo-src]"
    )
      .forEach(
        image => {

          const white =
            image.dataset.logoWhite ===
            "true";


          const source =
            white
              ? CONFIG.logoWhite
              : CONFIG.logo;


          image.src =
            resolveAsset(
              source
            );


          if (
            !image.alt
          ) {

            image.alt =
              CONFIG.logoAlt;

          }


          image.classList.add(
            CONFIG.defaultLogoClass
          );

        }
      );

  }


  /* ==========================================================
     INITIALIZE EXISTING LOGO LINKS
     ========================================================== */

  function initializeExistingLogoLinks() {

    $$(
      ".logo-link"
    )
      .forEach(
        link => {

          /*
           * If the page already contains a logo,
           * keep its HTML but fix the image source.
           */

          const image =
            $("img", link);


          if (
            image
          ) {

            const isWhite =
              image.dataset.logoWhite ===
              "true" ||
              link.dataset.logoWhite ===
              "true";


            const expectedSource =
              resolveAsset(
                isWhite
                  ? CONFIG.logoWhite
                  : CONFIG.logo
              );


            /*
             * Replace only relative/empty
             * placeholder sources.
             */

            const currentSource =
              image.getAttribute(
                "src"
              );


            if (
              !currentSource ||
              currentSource ===
                "assets/gtf-logo.svg" ||
              currentSource ===
                "../assets/gtf-logo.svg" ||
              currentSource ===
                "assets/gtf-logo-white.svg" ||
              currentSource ===
                "../assets/gtf-logo-white.svg"
            ) {

              image.src =
                expectedSource;

            }


            if (
              !image.alt
            ) {

              image.alt =
                CONFIG.logoAlt;

            }

          }

        }
      );

  }


  /* ==========================================================
     FAVICON
     ========================================================== */

  function initializeFavicon() {

    let favicon =
      document.querySelector(
        'link[rel="icon"]'
      );


    const faviconUrl =
      resolveAsset(
        CONFIG.favicon
      );


    if (
      !favicon
    ) {

      favicon =
        document.createElement(
          "link"
        );


      favicon.rel =
        "icon";


      document.head.appendChild(
        favicon
      );

    }


    favicon.href =
      faviconUrl;


    favicon.type =
      "image/svg+xml";


    /*
     * Also provide an Apple touch icon.
     */

    let appleIcon =
      document.querySelector(
        'link[rel="apple-touch-icon"]'
      );


    if (
      !appleIcon
    ) {

      appleIcon =
        document.createElement(
          "link"
        );


      appleIcon.rel =
        "apple-touch-icon";


      document.head.appendChild(
        appleIcon
      );

    }


    appleIcon.href =
      faviconUrl;

  }


  /* ==========================================================
     BRAND FALLBACK
     ========================================================== */

  function initializeBrandFallback() {

    $$(
      "[data-gtf-brand]"
    )
      .forEach(
        element => {

          const type =
            element.dataset.gtfBrand;


          switch (
            type
          ) {

            case "name":

              element.textContent =
                CONFIG.brandName;

              break;


            case "subtitle":

              element.textContent =
                CONFIG.brandSubtitle;

              break;


            case "short":

              element.textContent =
                "GTF";

              break;


            default:

              element.textContent =
                CONFIG.brandName;

          }

        }
      );

  }


  /* ==========================================================
     LOGO LOADING CLASS
     ========================================================== */

  function initializeLogoState() {

    document.documentElement
      .classList.add(
        "gtf-logo-ready"
      );


    document.documentElement
      .classList.remove(
        "gtf-logo-loading"
      );

  }


  /* ==========================================================
     GENERIC QUERY HELPERS
     ========================================================== */

  function $(
    selector,
    parent = document
  ) {

    return parent.querySelector(
      selector
    );

  }


  function $$(
    selector,
    parent = document
  ) {

    return Array.from(
      parent.querySelectorAll(
        selector
      )
    );

  }


  /* ==========================================================
     INITIALIZATION
     ========================================================== */

  function initialize() {

    /*
     * Tell CSS that logo loading has started.
     */

    document.documentElement
      .classList.add(
        "gtf-logo-loading"
      );


    initializeDataLogos();

    initializeLogoImages();

    initializeExistingLogoLinks();

    initializeFavicon();

    initializeBrandFallback();

    initializeLogoState();

  }


  /* ==========================================================
     PUBLIC API
     ========================================================== */

  const GTF_LOGO = {

    config: CONFIG,

    resolveAsset,

    resolveNavigation,

    createLogoMarkup,

    initialize

  };


  window.GTF_LOGO =
    GTF_LOGO;


  /* ==========================================================
     START
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