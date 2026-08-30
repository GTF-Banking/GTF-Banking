/* =========================================================
   GLOBAL TRUSTFUND
   ROLE GUARD

   File:
   frontend/js/role-guard.js

   Purpose:
   - Protect authenticated pages
   - Protect portal folders by role
   - Redirect unauthenticated users to login
   - Redirect unauthorized users away from restricted pages
   - Highlight the current portal
   - Handle logout links
   - Prevent accidental access to another portal

   Depends on:
   ../js/api.js
   ../js/auth.js
   ../js/app.js

   ========================================================= */

(function (window, document) {

  "use strict";


  /* =======================================================
     CONFIGURATION
     ======================================================= */

  const CONFIG = {

    login:
      "/login.html",

    home:
      "/index.html",

    customer:
      "/customer/index.html",

    admin:
      "/admin/index.html",

    manager:
      "/manager/index.html",

    cashier:
      "/cashier/index.html",

    dashboard:
      "/dashboard/index.html",

    unauthorized:
      "/index.html"
  };


  /* =======================================================
     ROLE DEFINITIONS
     ======================================================= */

  const ROLES = {

    CUSTOMER: [
      "customer",
      "client",
      "user"
    ],

    ADMIN: [
      "admin",
      "administrator",
      "superadmin"
    ],

    MANAGER: [
      "manager",
      "branchmanager"
    ],

    CASHIER: [
      "cashier",
      "teller"
    ]
  };


  /* =======================================================
     NORMALIZE ROLE
     ======================================================= */

  function normalizeRole(role) {

    if (!role) {
      return null;
    }

    return String(role)
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, "");
  }


  /* =======================================================
     GET CURRENT USER
     ======================================================= */

  function getUser() {

    if (
      window.GTF_AUTH &&
      typeof GTF_AUTH.getUser ===
        "function"
    ) {

      return GTF_AUTH.getUser();
    }

    try {

      const value =
        localStorage.getItem(
          "gtf_user"
        );

      return value
        ? JSON.parse(value)
        : null;

    } catch {

      return null;
    }
  }


  /* =======================================================
     GET CURRENT ROLE
     ======================================================= */

  function getRole() {

    const user =
      getUser();


    if (!user) {
      return null;
    }


    return normalizeRole(
      user.role ||
      user.user_role ||
      user.account_role ||
      user.userRole ||
      user.role_name ||
      user.roleName ||
      null
    );
  }


  /* =======================================================
     ROLE MATCH
     ======================================================= */

  function roleMatches(
    role,
    allowedRoles
  ) {

    const normalized =
      normalizeRole(role);


    if (!normalized) {
      return false;
    }


    return allowedRoles.some(
      (allowed) =>
        normalizeRole(
          allowed
        ) === normalized
    );
  }


  /* =======================================================
     DETERMINE PORTAL
     ======================================================= */

  function getPortalFromPath() {

    const path =
      window.location.pathname
        .toLowerCase();


    if (
      /\/admin(?:\/|$)/.test(path)
    ) {

      return "admin";
    }


    if (
      /\/manager(?:\/|$)/.test(path)
    ) {

      return "manager";
    }


    if (
      /\/cashier(?:\/|$)/.test(path)
    ) {

      return "cashier";
    }


    if (
      /\/customer(?:\/|$)/.test(path)
    ) {

      return "customer";
    }


    if (
      /\/dashboard(?:\/|$)/.test(path)
    ) {

      return "dashboard";
    }


    return null;
  }


  /* =======================================================
     PORTAL FOR ROLE
     ======================================================= */

  function getPortalForRole(
    role
  ) {

    const normalized =
      normalizeRole(role);


    if (
      ROLES.ADMIN.includes(
        normalized
      )
    ) {

      return "admin";
    }


    if (
      ROLES.MANAGER.includes(
        normalized
      )
    ) {

      return "manager";
    }


    if (
      ROLES.CASHIER.includes(
        normalized
      )
    ) {

      return "cashier";
    }


    if (
      ROLES.CUSTOMER.includes(
        normalized
      )
    ) {

      return "customer";
    }


    return "dashboard";
  }


  /* =======================================================
     PORTAL URL
     ======================================================= */

  function getPortalURL(
    portal
  ) {

    switch (
      String(portal || "")
        .toLowerCase()
    ) {

      case "admin":
        return CONFIG.admin;

      case "manager":
        return CONFIG.manager;

      case "cashier":
        return CONFIG.cashier;

      case "customer":
        return CONFIG.customer;

      case "dashboard":
        return CONFIG.dashboard;

      default:
        return CONFIG.home;
    }
  }


  /* =======================================================
     STORE ORIGINAL URL
     ======================================================= */

  function storeRequestedURL() {

    try {

      localStorage.setItem(
        "gtf_redirect",
        window.location.href
      );

    } catch {
      /* Ignore storage errors. */
    }
  }


  /* =======================================================
     CLEAR ORIGINAL URL
     ======================================================= */

  function clearRequestedURL() {

    try {

      localStorage.removeItem(
        "gtf_redirect"
      );

    } catch {
      /* Ignore storage errors. */
    }
  }


  /* =======================================================
     AUTHENTICATION CHECK
     ======================================================= */

  function isAuthenticated() {

    if (
      window.GTF_AUTH &&
      typeof GTF_AUTH.isAuthenticated ===
        "function"
    ) {

      return GTF_AUTH.isAuthenticated();
    }


    try {

      return Boolean(
        localStorage.getItem(
          "gtf_token"
        ) ||
        localStorage.getItem(
          "gtf_user"
        )
      );

    } catch {

      return false;
    }
  }


  /* =======================================================
     REDIRECT TO LOGIN
     ======================================================= */

  function redirectToLogin() {

    storeRequestedURL();

    window.location.href =
      CONFIG.login;
  }


  /* =======================================================
     REDIRECT TO CORRECT PORTAL
     ======================================================= */

  function redirectToCorrectPortal(
    role
  ) {

    const portal =
      getPortalForRole(
        role
      );


    const destination =
      getPortalURL(
        portal
      );


    window.location.href =
      destination;
  }


  /* =======================================================
     SHOW ACCESS DENIED
     ======================================================= */

  function showAccessDenied() {

    const message =
      document.querySelector(
        "[data-access-denied]"
      );


    if (message) {

      message.hidden =
        false;

      message.textContent =
        "You do not have permission to access this area.";

      return;
    }


    /*
     * If the page does not contain a dedicated
     * access-denied element, redirect to the
     * user's legitimate portal.
     */

    const role =
      getRole();


    if (role) {

      redirectToCorrectPortal(
        role
      );

    } else {

      window.location.href =
        CONFIG.home;
    }
  }


  /* =======================================================
     PROTECT CURRENT PAGE
     ======================================================= */

  function protect(
    requiredRoles = null,
    options = {}
  ) {

    const {

      redirectUnauthorized =
        true,

      redirectUnauthenticated =
        true,

      allowChildRoles =
        false

    } = options;


    /*
     * Step 1:
     * Authentication
     */

    if (
      !isAuthenticated()
    ) {

      if (
        redirectUnauthenticated
      ) {

        redirectToLogin();
      }

      return false;
    }


    /*
     * Step 2:
     * If there is no role requirement,
     * authentication alone is sufficient.
     */

    if (
      !requiredRoles
    ) {

      return true;
    }


    const roles =
      Array.isArray(
        requiredRoles
      )
        ? requiredRoles
        : [requiredRoles];


    const currentRole =
      getRole();


    if (!currentRole) {

      if (
        redirectUnauthorized
      ) {

        showAccessDenied();
      }

      return false;
    }


    /*
     * Step 3:
     * Check role.
     */

    if (
      roleMatches(
        currentRole,
        roles
      )
    ) {

      return true;
    }


    /*
     * Optional hierarchical access.
     *
     * Admin may optionally be allowed to
     * view manager/cashier areas if a page
     * explicitly requests this behavior.
     */

    if (
      allowChildRoles &&
      currentRole === "admin"
    ) {

      const normalizedRequired =
        roles.map(
          normalizeRole
        );


      if (
        normalizedRequired.includes(
          "manager"
        ) ||
        normalizedRequired.includes(
          "cashier"
        ) ||
        normalizedRequired.includes(
          "customer"
        )
      ) {

        return true;
      }
    }


    if (
      redirectUnauthorized
    ) {

      showAccessDenied();
    }


    return false;
  }


  /* =======================================================
     CUSTOMER GUARD
     ======================================================= */

  function customer(options = {}) {

    return protect(
      ROLES.CUSTOMER,
      options
    );
  }


  /* =======================================================
     ADMIN GUARD
     ======================================================= */

  function admin(options = {}) {

    return protect(
      ROLES.ADMIN,
      options
    );
  }


  /* =======================================================
     MANAGER GUARD
     ======================================================= */

  function manager(options = {}) {

    return protect(
      ROLES.MANAGER,
      options
    );
  }


  /* =======================================================
     CASHIER GUARD
     ======================================================= */

  function cashier(options = {}) {

    return protect(
      ROLES.CASHIER,
      options
    );
  }


  /* =======================================================
     AUTHENTICATED USER GUARD
     ======================================================= */

  function authenticated(
    options = {}
  ) {

    return protect(
      null,
      options
    );
  }


  /* =======================================================
     CURRENT PORTAL GUARD
     ======================================================= */

  function protectCurrentPortal(
    options = {}
  ) {

    const portal =
      getPortalFromPath();


    if (!portal) {

      return authenticated(
        options
      );
    }


    switch (portal) {

      case "customer":
        return customer(
          options
        );

      case "admin":
        return admin(
          options
        );

      case "manager":
        return manager(
          options
        );

      case "cashier":
        return cashier(
          options
        );

      case "dashboard":
        return authenticated(
          options
        );

      default:
        return true;
    }
  }


  /* =======================================================
     PREVENT LOGGED-IN USERS FROM LOGIN PAGE
     ======================================================= */

  function redirectAuthenticatedUser() {

    if (
      !isAuthenticated()
    ) {

      return false;
    }


    const path =
      window.location.pathname
        .toLowerCase();


    const page =
      path.split("/").pop();


    const authPages = [
      "login.html",
      "signup.html",
      "register.html"
    ];


    if (
      !authPages.includes(page)
    ) {

      return false;
    }


    const role =
      getRole();


    if (role) {

      redirectToCorrectPortal(
        role
      );

      return true;
    }


    window.location.href =
      CONFIG.defaultDashboard ||
      CONFIG.home;

    return true;
  }


  /* =======================================================
     LOGOUT HANDLERS
     ======================================================= */

  function setupLogoutLinks() {

    document.addEventListener(
      "click",
      async (event) => {

        const logout =
          event.target.closest(
            "[data-logout]"
          );


        if (!logout) {
          return;
        }


        event.preventDefault();


        const redirect =
          logout.getAttribute(
            "data-logout-redirect"
          ) ||
          CONFIG.login;


        const confirmed =
          logout.hasAttribute(
            "data-confirm-logout"
          )
            ? window.confirm(
                "Are you sure you want to sign out?"
              )
            : true;


        if (!confirmed) {
          return;
        }


        logout.disabled =
          true;


        try {

          if (
            window.GTF_AUTH &&
            typeof GTF_AUTH.logout ===
              "function"
          ) {

            await GTF_AUTH.logout(
              null
            );

          } else {

            try {

              localStorage.removeItem(
                "gtf_token"
              );

              localStorage.removeItem(
                "gtf_user"
              );

              sessionStorage.removeItem(
                "gtf_token"
              );

            } catch {
              /* Ignore storage errors. */
            }
          }

        } finally {

          clearRequestedURL();

          window.location.href =
            redirect;
        }
      }
    );
  }


  /* =======================================================
     CURRENT PORTAL NAVIGATION
     ======================================================= */

  function setupPortalNavigation() {

    document
      .querySelectorAll(
        "[data-portal-link]"
      )
      .forEach(
        (link) => {

          const portal =
            link.getAttribute(
              "data-portal-link"
            );


          if (!portal) {
            return;
          }


          link.setAttribute(
            "href",
            getPortalURL(
              portal
            )
          );
        }
      );
  }


  /* =======================================================
     ROLE DISPLAY
     ======================================================= */

  function displayRole() {

    const role =
      getRole();


    document
      .querySelectorAll(
        "[data-current-role]"
      )
      .forEach(
        (element) => {

          element.textContent =
            role
              ? role.charAt(0)
                  .toUpperCase() +
                role.slice(1)
              : "Guest";
        }
      );
  }


  /* =======================================================
     USER DISPLAY
     ======================================================= */

  function displayUser() {

    const user =
      getUser();


    if (!user) {
      return;
    }


    const firstName =
      user.first_name ||
      user.firstName ||
      "";


    const lastName =
      user.last_name ||
      user.lastName ||
      "";


    const fullName =
      user.name ||
      `${firstName} ${lastName}`
        .trim() ||
      "Customer";


    document
      .querySelectorAll(
        "[data-current-user]"
      )
      .forEach(
        (element) => {

          element.textContent =
            fullName;
        }
      );


    document
      .querySelectorAll(
        "[data-current-email]"
      )
      .forEach(
        (element) => {

          element.textContent =
            user.email ||
            "";
        }
      );
  }


  /* =======================================================
     PORTAL BODY CLASS
     ======================================================= */

  function setPortalBodyClass() {

    const portal =
      getPortalFromPath();


    if (!portal) {
      return;
    }


    document.body.classList.add(
      `portal-${portal}`
    );
  }


  /* =======================================================
     BACK BUTTON
     ======================================================= */

  function setupBackButtons() {

    document.addEventListener(
      "click",
      (event) => {

        const button =
          event.target.closest(
            "[data-go-back]"
          );


        if (!button) {
          return;
        }


        event.preventDefault();


        const fallback =
          button.getAttribute(
            "data-fallback"
          ) ||
          CONFIG.home;


        if (
          document.referrer &&
          window.history.length > 1
        ) {

          window.history.back();

        } else {

          window.location.href =
            fallback;
        }
      }
    );
  }


  /* =======================================================
     GUARD BASED ON HTML ATTRIBUTE
     ======================================================= */

  function guardFromMarkup() {

    const guard =
      document.body.dataset
        .roleGuard;


    if (!guard) {
      return true;
    }


    const value =
      guard
        .trim()
        .toLowerCase();


    if (
      value === "auth" ||
      value === "authenticated"
    ) {

      return authenticated();
    }


    if (
      value === "customer"
    ) {

      return customer();
    }


    if (
      value === "admin"
    ) {

      return admin();
    }


    if (
      value === "manager"
    ) {

      return manager();
    }


    if (
      value === "cashier"
    ) {

      return cashier();
    }


    return true;
  }


  /* =======================================================
     PUBLIC OBJECT
     ======================================================= */

  const GTF_ROLE_GUARD = {

    config:
      CONFIG,

    roles:
      ROLES,

    getUser,

    getRole,

    getPortalFromPath,

    getPortalForRole,

    getPortalURL,

    isAuthenticated,

    protect,

    authenticated,

    customer,

    admin,

    manager,

    cashier,

    protectCurrentPortal,

    redirectAuthenticatedUser,

    redirectToLogin,

    redirectToCorrectPortal,

    setupLogoutLinks,

    setupPortalNavigation,

    setupBackButtons,

    displayRole,

    displayUser,

    setPortalBodyClass,

    guardFromMarkup
  };


  /* =======================================================
     GLOBAL EXPORT
     ======================================================= */

  window.GTF_ROLE_GUARD =
    GTF_ROLE_GUARD;


  /* =======================================================
     INITIALIZATION
     ======================================================= */

  function initialize() {

    setPortalBodyClass();

    setupLogoutLinks();

    setupPortalNavigation();

    setupBackButtons();

    displayRole();

    displayUser();


    /*
     * Do not automatically protect a page merely
     * because role-guard.js was included.
     *
     * A portal page can explicitly use:
     *
     * <body data-role-guard="customer">
     *
     * or JavaScript:
     *
     * GTF_ROLE_GUARD.customer();
     */

    guardFromMarkup();
  }


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


})(window);
