/*
 * ============================================================
 * GTF-Banking
 * frontend/js/role-guard.js
 * ============================================================
 *
 * Frontend role-based access controller.
 *
 * IMPORTANT:
 * This file improves the user interface and prevents users
 * from being casually sent to pages they should not use.
 *
 * It is NOT a security boundary.
 *
 * The backend MUST independently enforce:
 *
 *   Authentication
 *   Authorization
 *   Roles
 *   Permissions
 *
 * Never rely on this file alone to protect banking data.
 *
 * ============================================================
 */

(function () {

  "use strict";


  /* ==========================================================
     CONFIGURATION
  ========================================================== */

  const CONFIG = {

    loginPage:
      "/login.html",

    unauthorizedPage:
      "/dashboard/index.html",

    homePage:
      "/index.html",

    pages: {

      customer:
        "/dashboard/index.html",

      accounts:
        "/dashboard/accounts.html",

      transactions:
        "/dashboard/transactions.html",

      transfers:
        "/dashboard/transfers.html",

      support:
        "/dashboard/support.html",

      admin:
        "/admin/index.html",

      adminCustomers:
        "/admin/customers.html",

      adminReports:
        "/admin/reports.html",

      adminAudit:
        "/admin/audit.html",

      adminCompliance:
        "/admin/compliance.html",

      adminSettings:
        "/admin/settings.html",

      cashier:
        "/cashier/index.html"

    }

  };


  /* ==========================================================
     ROLE DEFINITIONS
  ========================================================== */

  /*
   * These are application-level role names.
   *
   * Make sure they match the role values returned by:
   *
   * GET /api/auth/me
   *
   * and enforced by:
   *
   * backend/authentication/roleMiddleware.js
   */

  const ROLES = {

    CUSTOMER:
      "customer",

    USER:
      "user",

    ADMIN:
      "admin",

    SUPER_ADMIN:
      "super_admin",

    MANAGER:
      "manager",

    CASHIER:
      "cashier",

    COMPLIANCE:
      "compliance",

    AUDITOR:
      "auditor"

  };


  /* ==========================================================
     ROLE GROUPS
  ========================================================== */

  const ROLE_GROUPS = {

    CUSTOMER: [

      ROLES.CUSTOMER,

      ROLES.USER

    ],


    ADMIN: [

      ROLES.ADMIN,

      ROLES.SUPER_ADMIN

    ],


    MANAGEMENT: [

      ROLES.ADMIN,

      ROLES.SUPER_ADMIN,

      ROLES.MANAGER

    ],


    CASHIER: [

      ROLES.CASHIER,

      ROLES.MANAGER,

      ROLES.ADMIN,

      ROLES.SUPER_ADMIN

    ],


    COMPLIANCE: [

      ROLES.COMPLIANCE,

      ROLES.MANAGER,

      ROLES.ADMIN,

      ROLES.SUPER_ADMIN

    ],


    AUDIT: [

      ROLES.AUDITOR,

      ROLES.COMPLIANCE,

      ROLES.MANAGER,

      ROLES.ADMIN,

      ROLES.SUPER_ADMIN

    ]

  };


  /* ==========================================================
     STATE
  ========================================================== */

  const state = {

    initialized:
      false,

    checking:
      false,

    authorized:
      false,

    user:
      null,

    role:
      null

  };


  /* ==========================================================
     APP / AUTH REFERENCES
  ========================================================== */

  function getApp() {

    return window.GTFBanking ||
      null;

  }


  function getAuth() {

    return window.GTFAuth ||
      null;

  }


  /* ==========================================================
     ROLE NORMALIZATION
  ========================================================== */

  function normalizeRole(
    role
  ) {

    if (
      role === null ||
      role === undefined
    ) {

      return "";

    }


    return String(
      role
    )
      .trim()
      .toLowerCase()
      .replaceAll(
        "-",
        "_"
      )
      .replaceAll(
        " ",
        "_"
      );

  }


  /* ==========================================================
     GET USER ROLE
  ========================================================== */

  function getRoleFromUser(
    user
  ) {

    if (
      !user
    ) {

      return "";

    }


    return normalizeRole(

      user.role ||

      user.user_role ||

      user.userRole ||

      user.account_role ||

      user.accountRole ||

      ""

    );

  }


  /* ==========================================================
     GET CURRENT USER
  ========================================================== */

  async function getCurrentUser() {

    /*
     * Prefer GTFAuth.
     */

    const auth =
      getAuth();


    if (
      auth &&
      typeof auth.checkSession ===
      "function"
    ) {

      try {

        const user =
          await auth.checkSession();


        if (
          user
        ) {

          return user;

        }

      } catch (error) {

        console.warn(
          "Unable to retrieve authenticated user:",
          error
        );

      }

    }


    /*
     * Fall back to GTFBanking.
     */

    const app =
      getApp();


    if (
      app &&
      typeof app.getCurrentUser ===
      "function"
    ) {

      return app.getCurrentUser();

    }


    return null;

  }


  /* ==========================================================
     GET ROLE
  ========================================================== */

  async function getCurrentRole() {

    const user =
      await getCurrentUser();


    state.user =
      user;


    state.role =
      getRoleFromUser(
        user
      );


    return state.role;

  }


  /* ==========================================================
     ROLE CHECK
  ========================================================== */

  function hasRole(
    role,
    requiredRole
  ) {

    const current =
      normalizeRole(
        role
      );


    const required =
      normalizeRole(
        requiredRole
      );


    if (
      !current ||
      !required
    ) {

      return false;

    }


    return (
      current ===
      required
    );

  }


  function hasAnyRole(
    role,
    requiredRoles
  ) {

    const current =
      normalizeRole(
        role
      );


    if (
      !current ||
      !Array.isArray(
        requiredRoles
      )
    ) {

      return false;

    }


    return requiredRoles
      .some(
        requiredRole =>
          current ===
          normalizeRole(
            requiredRole
          )
      );

  }


  function hasAllRoles(
    role,
    requiredRoles
  ) {

    /*
     * A user normally has one primary role.
     *
     * This function is retained for compatibility,
     * but a single role cannot satisfy multiple
     * independent roles unless the application's
     * role hierarchy explicitly allows it.
     */

    if (
      !Array.isArray(
        requiredRoles
      ) ||
      requiredRoles.length ===
      0
    ) {

      return true;

    }


    return requiredRoles
      .every(
        requiredRole =>
          hasRole(
            role,
            requiredRole
          )
      );

  }


  /* ==========================================================
     ROLE GROUP CHECK
  ========================================================== */

  function isInGroup(
    role,
    groupName
  ) {

    const group =
      ROLE_GROUPS[
        String(
          groupName
        )
          .toUpperCase()
      ];


    if (
      !Array.isArray(
        group
      )
    ) {

      return false;

    }


    return hasAnyRole(
      role,
      group
    );

  }


  /* ==========================================================
     ROLE HIERARCHY
  ========================================================== */

  /*
   * This is useful for interface decisions.
   *
   * It MUST NOT replace backend authorization.
   */

  const ROLE_LEVELS = {

    user:
      10,

    customer:
      10,

    cashier:
      20,

    compliance:
      30,

    auditor:
      30,

    manager:
      40,

    admin:
      50,

    super_admin:
      60

  };


  function getRoleLevel(
    role
  ) {

    const normalized =
      normalizeRole(
        role
      );


    return (
      ROLE_LEVELS[
        normalized
      ] ||
      0
    );

  }


  function hasMinimumRole(
    role,
    minimumRole
  ) {

    const currentLevel =
      getRoleLevel(
        role
      );


    const requiredLevel =
      getRoleLevel(
        minimumRole
      );


    if (
      currentLevel ===
      0 ||
      requiredLevel ===
      0
    ) {

      return false;

    }


    return (
      currentLevel >=
      requiredLevel
    );

  }


  /* ==========================================================
     PERMISSIONS
  ========================================================== */

  const PERMISSIONS = {

    VIEW_CUSTOMER_DASHBOARD:
      "view_customer_dashboard",

    VIEW_ACCOUNTS:
      "view_accounts",

    CREATE_TRANSFER:
      "create_transfer",

    VIEW_TRANSACTIONS:
      "view_transactions",

    VIEW_SUPPORT:
      "view_support",

    VIEW_ADMIN:
      "view_admin",

    VIEW_CUSTOMERS:
      "view_customers",

    VIEW_REPORTS:
      "view_reports",

    VIEW_AUDIT:
      "view_audit",

    VIEW_COMPLIANCE:
      "view_compliance",

    MANAGE_SETTINGS:
      "manage_settings",

    PROCESS_CASHIER:
      "process_cashier"

  };


  const ROLE_PERMISSIONS = {

    customer: [

      PERMISSIONS.VIEW_CUSTOMER_DASHBOARD,

      PERMISSIONS.VIEW_ACCOUNTS,

      PERMISSIONS.CREATE_TRANSFER,

      PERMISSIONS.VIEW_TRANSACTIONS,

      PERMISSIONS.VIEW_SUPPORT

    ],


    user: [

      PERMISSIONS.VIEW_CUSTOMER_DASHBOARD,

      PERMISSIONS.VIEW_ACCOUNTS,

      PERMISSIONS.CREATE_TRANSFER,

      PERMISSIONS.VIEW_TRANSACTIONS,

      PERMISSIONS.VIEW_SUPPORT

    ],


    cashier: [

      PERMISSIONS.VIEW_CUSTOMER_DASHBOARD,

      PERMISSIONS.VIEW_ACCOUNTS,

      PERMISSIONS.VIEW_TRANSACTIONS,

      PERMISSIONS.PROCESS_CASHIER

    ],


    compliance: [

      PERMISSIONS.VIEW_CUSTOMER_DASHBOARD,

      PERMISSIONS.VIEW_TRANSACTIONS,

      PERMISSIONS.VIEW_AUDIT,

      PERMISSIONS.VIEW_COMPLIANCE

    ],


    auditor: [

      PERMISSIONS.VIEW_CUSTOMER_DASHBOARD,

      PERMISSIONS.VIEW_TRANSACTIONS,

      PERMISSIONS.VIEW_AUDIT,

      PERMISSIONS.VIEW_REPORTS

    ],


    manager: [

      PERMISSIONS.VIEW_CUSTOMER_DASHBOARD,

      PERMISSIONS.VIEW_ACCOUNTS,

      PERMISSIONS.VIEW_TRANSACTIONS,

      PERMISSIONS.VIEW_SUPPORT,

      PERMISSIONS.VIEW_CUSTOMERS,

      PERMISSIONS.VIEW_REPORTS,

      PERMISSIONS.VIEW_AUDIT,

      PERMISSIONS.VIEW_COMPLIANCE,

      PERMISSIONS.PROCESS_CASHIER

    ],


    admin: [

      PERMISSIONS.VIEW_CUSTOMER_DASHBOARD,

      PERMISSIONS.VIEW_ACCOUNTS,

      PERMISSIONS.CREATE_TRANSFER,

      PERMISSIONS.VIEW_TRANSACTIONS,

      PERMISSIONS.VIEW_SUPPORT,

      PERMISSIONS.VIEW_ADMIN,

      PERMISSIONS.VIEW_CUSTOMERS,

      PERMISSIONS.VIEW_REPORTS,

      PERMISSIONS.VIEW_AUDIT,

      PERMISSIONS.VIEW_COMPLIANCE,

      PERMISSIONS.MANAGE_SETTINGS,

      PERMISSIONS.PROCESS_CASHIER

    ],


    super_admin: [

      PERMISSIONS.VIEW_CUSTOMER_DASHBOARD,

      PERMISSIONS.VIEW_ACCOUNTS,

      PERMISSIONS.CREATE_TRANSFER,

      PERMISSIONS.VIEW_TRANSACTIONS,

      PERMISSIONS.VIEW_SUPPORT,

      PERMISSIONS.VIEW_ADMIN,

      PERMISSIONS.VIEW_CUSTOMERS,

      PERMISSIONS.VIEW_REPORTS,

      PERMISSIONS.VIEW_AUDIT,

      PERMISSIONS.VIEW_COMPLIANCE,

      PERMISSIONS.MANAGE_SETTINGS,

      PERMISSIONS.PROCESS_CASHIER

    ]

  };


  /* ==========================================================
     PERMISSION CHECK
  ========================================================== */

  function hasPermission(
    role,
    permission
  ) {

    const normalizedRole =
      normalizeRole(
        role
      );


    const permissions =
      ROLE_PERMISSIONS[
        normalizedRole
      ];


    if (
      !Array.isArray(
        permissions
      )
    ) {

      return false;

    }


    return permissions.includes(
      permission
    );

  }


  function hasAnyPermission(
    role,
    permissions
  ) {

    if (
      !Array.isArray(
        permissions
      )
    ) {

      return false;

    }


    return permissions.some(
      permission =>
        hasPermission(
          role,
          permission
        )
    );

  }


  /* ==========================================================
     UNAUTHORIZED HANDLER
  ========================================================== */

  function redirect(
    page
  ) {

    const app =
      getApp();


    if (
      app &&
      typeof app.redirectTo ===
      "function"
    ) {

      app.redirectTo(
        page
      );

      return;

    }


    window.location.assign(
      page
    );

  }


  function handleUnauthorized(
    options = {}
  ) {

    const {

      redirectToPage =
        CONFIG.unauthorizedPage,

      showMessage =
        true

    } = options;


    if (
      showMessage
    ) {

      const app =
        getApp();


      if (
        app &&
        typeof app.showNotification ===
        "function"
      ) {

        app.showNotification(
          "You are not authorized to access this page.",
          "error"
        );

      }

    }


    state.authorized =
      false;


    redirect(
      redirectToPage
    );

  }


  function handleUnauthenticated() {

    state.authorized =
      false;


    state.user =
      null;


    state.role =
      null;


    redirect(
      CONFIG.loginPage
    );

  }


  /* ==========================================================
     REQUIRE ROLE
  ========================================================== */

  async function requireRole(
    requiredRole,
    options = {}
  ) {

    const {

      redirectUnauthorized =
        true,

      unauthorizedPage =
        CONFIG.unauthorizedPage

    } = options;


    if (
      state.checking
    ) {

      return state.authorized;

    }


    state.checking =
      true;


    try {

      const user =
        await getCurrentUser();


      if (
        !user
      ) {

        if (
          redirectUnauthorized
        ) {

          handleUnauthenticated();

        }


        return false;

      }


      const role =
        getRoleFromUser(
          user
        );


      state.user =
        user;


      state.role =
        role;


      const authorized =
        hasRole(
          role,
          requiredRole
        );


      state.authorized =
        authorized;


      if (
        !authorized &&
        redirectUnauthorized
      ) {

        handleUnauthorized(
          {

            redirectToPage:
              unauthorizedPage

          }
        );

      }


      return authorized;

    } finally {

      state.checking =
        false;

    }

  }


  /* ==========================================================
     REQUIRE ANY ROLE
  ========================================================== */

  async function requireAnyRole(
    requiredRoles,
    options = {}
  ) {

    const {

      redirectUnauthorized =
        true,

      unauthorizedPage =
        CONFIG.unauthorizedPage

    } = options;


    if (
      !Array.isArray(
        requiredRoles
      ) ||
      requiredRoles.length ===
      0
    ) {

      return false;

    }


    const user =
      await getCurrentUser();


    if (
      !user
    ) {

      if (
        redirectUnauthorized
      ) {

        handleUnauthenticated();

      }


      return false;

    }


    const role =
      getRoleFromUser(
        user
      );


    state.user =
      user;


    state.role =
      role;


    const authorized =
      hasAnyRole(
        role,
        requiredRoles
      );


    state.authorized =
      authorized;


    if (
      !authorized &&
      redirectUnauthorized
    ) {

      handleUnauthorized(
        {

          redirectToPage:
            unauthorizedPage

        }
      );

    }


    return authorized;

  }


  /* ==========================================================
     REQUIRE PERMISSION
  ========================================================== */

  async function requirePermission(
    permission,
    options = {}
  ) {

    const {

      redirectUnauthorized =
        true,

      unauthorizedPage =
        CONFIG.unauthorizedPage

    } = options;


    const user =
      await getCurrentUser();


    if (
      !user
    ) {

      if (
        redirectUnauthorized
      ) {

        handleUnauthenticated();

      }


      return false;

    }


    const role =
      getRoleFromUser(
        user
      );


    state.user =
      user;


    state.role =
      role;


    const authorized =
      hasPermission(
        role,
        permission
      );


    state.authorized =
      authorized;


    if (
      !authorized &&
      redirectUnauthorized
    ) {

      handleUnauthorized(
        {

          redirectToPage:
            unauthorizedPage

        }
      );

    }


    return authorized;

  }


  /* ==========================================================
     PAGE ACCESS MAP
  ========================================================== */

  const PAGE_RULES = [

    {
      pattern:
        /\/dashboard\/accounts\.html$/i,

      roles:
        ROLE_GROUPS.CUSTOMER

    },

    {
      pattern:
        /\/dashboard\/transactions\.html$/i,

      roles:
        ROLE_GROUPS.CUSTOMER

    },

    {
      pattern:
        /\/dashboard\/transfers\.html$/i,

      roles:
        ROLE_GROUPS.CUSTOMER

    },

    {
      pattern:
        /\/dashboard\/support\.html$/i,

      roles:
        ROLE_GROUPS.CUSTOMER

    },

    {
      pattern:
        /\/admin\/customers\.html$/i,

      roles:
        ROLE_GROUPS.MANAGEMENT

    },

    {
      pattern:
        /\/admin\/reports\.html$/i,

      roles:
        ROLE_GROUPS.MANAGEMENT

    },

    {
      pattern:
        /\/admin\/audit\.html$/i,

      roles:
        ROLE_GROUPS.AUDIT

    },

    {
      pattern:
        /\/admin\/compliance\.html$/i,

      roles:
        ROLE_GROUPS.COMPLIANCE

    },

    {
      pattern:
        /\/admin\/settings\.html$/i,

      roles: [

        ROLES.ADMIN,

        ROLES.SUPER_ADMIN

      ]

    },

    {
      pattern:
        /\/admin\/index\.html$/i,

      roles:
        ROLE_GROUPS.MANAGEMENT

    },

    {
      pattern:
        /\/cashier\/index\.html$/i,

      roles:
        ROLE_GROUPS.CASHIER

    }

  ];


  /* ==========================================================
     FIND CURRENT PAGE RULE
  ========================================================== */

  function getPageRule() {

    const pathname =
      window.location.pathname;


    return PAGE_RULES.find(
      rule =>
        rule.pattern.test(
          pathname
        )
    ) || null;

  }


  /* ==========================================================
     AUTOMATIC PAGE GUARD
  ========================================================== */

  async function guardCurrentPage() {

    const rule =
      getPageRule();


    if (
      !rule
    ) {

      /*
       * No special role rule.
       */

      return true;

    }


    return requireAnyRole(
      rule.roles,
      {

        redirectUnauthorized:
          true

      }
    );

  }


  /* ==========================================================
     HIDE ROLE-RESTRICTED UI
  ========================================================== */

  function applyRoleVisibility(
    role
  ) {

    $$(
      "[data-role-required]"
    )
      .forEach(
        element => {

          const required =
            element.dataset
              .roleRequired
              ?.split(
                ","
              )
              .map(
                item =>
                  normalizeRole(
                    item
                  )
              )
              .filter(
                Boolean
              ) || [];


          const visible =
            hasAnyRole(
              role,
              required
            );


          element.hidden =
            !visible;


          element.setAttribute(
            "aria-hidden",
            String(
              !visible
            )
          );

        }
      );

  }


  /* ==========================================================
     HIDE PERMISSION-RESTRICTED UI
  ========================================================== */

  function applyPermissionVisibility(
    role
  ) {

    $$(
      "[data-permission-required]"
    )
      .forEach(
        element => {

          const required =
            element.dataset
              .permissionRequired
              ?.split(
                ","
              )
              .map(
                item =>
                  item.trim()
              )
              .filter(
                Boolean
              ) || [];


          const visible =
            required.length ===
            0
              ? true
              : hasAnyPermission(
                  role,
                  required
                );


          element.hidden =
            !visible;


          element.setAttribute(
            "aria-hidden",
            String(
              !visible
            )
          );

        }
      );

  }


  /* ==========================================================
     PUBLIC API
  ========================================================== */

  window.GTFRoleGuard = {

    config:
      CONFIG,

    roles:
      ROLES,

    groups:
      ROLE_GROUPS,

    permissions:
      PERMISSIONS,

    state,

    normalizeRole,

    getRoleFromUser,

    getCurrentUser,

    getCurrentRole,

    hasRole,

    hasAnyRole,

    hasAllRoles,

    isInGroup,

    getRoleLevel,

    hasMinimumRole,

    hasPermission,

    hasAnyPermission,

    requireRole,

    requireAnyRole,

    requirePermission,

    guardCurrentPage,

    applyRoleVisibility,

    applyPermissionVisibility

  };


  /* ==========================================================
     INITIALIZATION
  ========================================================== */

  async function initialize() {

    if (
      state.initialized
    ) {

      return;

    }


    state.initialized =
      true;


    /*
     * Only perform the automatic role check on
     * pages that have a matching PAGE_RULE.
     */

    const rule =
      getPageRule();


    if (
      !rule
    ) {

      return;

    }


    const authorized =
      await guardCurrentPage();


    if (
      !authorized
    ) {

      return;

    }


    const role =
      state.role ||
      await getCurrentRole();


    applyRoleVisibility(
      role
    );


    applyPermissionVisibility(
      role
    );

  }


  /* ==========================================================
     DOM READY
  ========================================================== */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      {
        once:
          true
      }
    );

  } else {

    initialize();

  }


})();