/* =========================================================
   GLOBAL TRUSTFUND
   ROLE GUARD
   frontend/js/role-guard.js

   Protects frontend portal pages according to the user's
   authenticated role.

   IMPORTANT:
   This is a frontend navigation guard only.
   Real authorization MUST also be enforced by the backend
   and database/RLS policies.
   ========================================================= */

(function (window, document) {
  "use strict";


  /* =======================================================
     CONFIGURATION
     ======================================================= */

  const PORTALS = {
    customer: {
      roles: [
        "customer",
        "user",
        "client"
      ],
      dashboard:
        "../customer/dashboard.html",
      login:
        "../login.html"
    },

    cashier: {
      roles: [
        "cashier"
      ],
      dashboard:
        "../cashier/index.html",
      login:
        "../login.html"
    },

    manager: {
      roles: [
        "manager"
      ],
      dashboard:
        "../manager/index.html",
      login:
        "../login.html"
    },

    admin: {
      roles: [
        "admin",
        "administrator"
      ],
      dashboard:
        "../admin/index.html",
      login:
        "../login.html"
    }
  };


  /* =======================================================
     ROLE NORMALIZATION
     ======================================================= */

  function normalizeRole(role) {

    if (
      role === null ||
      role === undefined
    ) {
      return "";
    }


    if (
      typeof role === "object"
    ) {

      role =
        role.name ||
        role.slug ||
        role.role ||
        role.type ||
        "";
    }


    return String(role)
      .trim()
      .toLowerCase();
  }


  /* =======================================================
     DETECT CURRENT PORTAL
     ======================================================= */

  function detectPortal() {

    const path =
      window.location.pathname
        .toLowerCase();


    if (
      path.includes(
        "/admin/"
      )
    ) {
      return "admin";
    }


    if (
      path.includes(
        "/manager/"
      )
    ) {
      return "manager";
    }


    if (
      path.includes(
        "/cashier/"
      )
    ) {
      return "cashier";
    }


    if (
      path.includes(
        "/customer/"
      ) ||
      path.includes(
        "/dashboard/"
      )
    ) {
      return "customer";
    }


    return null;
  }


  /* =======================================================
     CHECK ROLE
     ======================================================= */

  function roleAllowed(
    role,
    portal
  ) {

    const normalized =
      normalizeRole(role);


    const configuration =
      PORTALS[portal];


    if (
      !configuration
    ) {
      return false;
    }


    return configuration.roles
      .includes(
        normalized
      );
  }


  /* =======================================================
     REDIRECT TO LOGIN
     ======================================================= */

  function redirectToLogin() {

    const portal =
      detectPortal();


    const configuration =
      PORTALS[portal] ||
      PORTALS.customer;


    const current =
      window.location.pathname;


    const query =
      new URLSearchParams();


    query.set(
      "redirect",
      current
    );


    query.set(
      "message",
      "Please sign in to continue."
    );


    window.location.href =
      `${configuration.login}?${query.toString()}`;
  }


  /* =======================================================
     REDIRECT TO CORRECT PORTAL
     ======================================================= */

  function redirectToCorrectPortal(
    role
  ) {

    const normalized =
      normalizeRole(role);


    if (
      normalized ===
        "admin" ||
      normalized ===
        "administrator"
    ) {

      window.location.href =
        "../admin/index.html";

      return;
    }


    if (
      normalized ===
      "manager"
    ) {

      window.location.href =
        "../manager/index.html";

      return;
    }


    if (
      normalized ===
      "cashier"
    ) {

      window.location.href =
        "../cashier/index.html";

      return;
    }


    window.location.href =
      "../customer/dashboard.html";
  }


  /* =======================================================
     GET STORED ROLE
     ======================================================= */

  function getStoredRole() {

    if (
      !window.GTF_AUTH
    ) {
      return "";
    }


    return normalizeRole(
      GTF_AUTH.getStoredRole()
    );
  }


  /* =======================================================
     VERIFY ACCESS
     ======================================================= */

  async function verify(
    portal = null
  ) {

    portal =
      portal ||
      detectPortal();


    /*
     * If this isn't a protected portal page,
     * there is nothing to guard.
     */
    if (!portal) {
      return true;
    }


    /*
     * Authentication layer must exist.
     */
    if (
      !window.GTF_AUTH
    ) {

      console.error(
        "GTF Role Guard: GTF_AUTH is not loaded."
      );

      return false;
    }


    try {

      const session =
        await GTF_AUTH.checkSession();


      /*
       * Not authenticated.
       */
      if (
        !session ||
        !session.authenticated
      ) {

        redirectToLogin();

        return false;
      }


      let role =
        normalizeRole(
          session.role
        );


      /*
       * If the session did not include a role,
       * ask the authentication layer for it.
       */
      if (!role) {

        role =
          normalizeRole(
            await GTF_AUTH.getCurrentRole(
              true
            )
          );
      }


      /*
       * If no role can be established,
       * don't allow access to the protected page.
       */
      if (!role) {

        console.error(
          "GTF Role Guard: User role could not be determined."
        );

        if (
          window.GTF_APP
        ) {

          GTF_APP.showToast(
            "Your account role could not be verified.",
            "danger"
          );
        }


        return false;
      }


      /*
       * Check whether the current role belongs
       * to the requested portal.
       */
      if (
        roleAllowed(
          role,
          portal
        )
      ) {

        document.documentElement
          .setAttribute(
            "data-gtf-role",
            role
          );

        document.documentElement
          .setAttribute(
            "data-gtf-portal",
            portal
          );


        return true;
      }


      /*
       * Authenticated but attempting to access
       * another role's portal.
       */
      if (
        window.GTF_APP
      ) {

        GTF_APP.showToast(
          "You do not have permission to access this portal.",
          "danger"
        );
      }


      setTimeout(
        () => {
          redirectToCorrectPortal(
            role
          );
        },
        600
      );


      return false;

    } catch (error) {

      console.error(
        "GTF Role Guard Error:",
        error
      );


      /*
       * A 401 means the session is no longer valid.
       */
      if (
        error.status ===
        401
      ) {

        if (
          window.GTF_AUTH
        ) {
          GTF_AUTH.clearSession();
        }


        redirectToLogin();

        return false;
      }


      /*
       * For other errors, fail closed.
       */
      return false;
    }
  }


  /* =======================================================
     ADMIN GUARD
     ======================================================= */

  async function requireAdmin() {

    return verify(
      "admin"
    );
  }


  /* =======================================================
     MANAGER GUARD
     ======================================================= */

  async function requireManager() {

    return verify(
      "manager"
    );
  }


  /* =======================================================
     CASHIER GUARD
     ======================================================= */

  async function requireCashier() {

    return verify(
      "cashier"
    );
  }


  /* =======================================================
     CUSTOMER GUARD
     ======================================================= */

  async function requireCustomer() {

    return verify(
      "customer"
    );
  }


  /* =======================================================
     GENERIC ROLE GUARD
     ======================================================= */

  async function requireRole(
    roles
  ) {

    if (
      !Array.isArray(roles)
    ) {

      roles = [
        roles
      ];
    }


    const normalized =
      roles
        .map(
          normalizeRole
        )
        .filter(Boolean);


    if (
      normalized.length === 0
    ) {
      return false;
    }


    if (
      !window.GTF_AUTH
    ) {
      return false;
    }


    try {

      const session =
        await GTF_AUTH.checkSession();


      if (
        !session.authenticated
      ) {

        redirectToLogin();

        return false;
      }


      let role =
        normalizeRole(
          session.role
        );


      if (!role) {

        role =
          normalizeRole(
            await GTF_AUTH.getCurrentRole(
              true
            )
          );
      }


      if (
        normalized.includes(
          role
        )
      ) {

        document.documentElement
          .setAttribute(
            "data-gtf-role",
            role
          );

        return true;
      }


      redirectToCorrectPortal(
        role
      );


      return false;

    } catch (error) {

      console.error(
        "GTF generic role guard error:",
        error
      );

      redirectToLogin();

      return false;
    }
  }


  /* =======================================================
     PAGE INITIALIZATION
     ======================================================= */

  async function initialize() {

    const portal =
      detectPortal();


    if (!portal) {
      return true;
    }


    /*
     * Hide protected content until the role check
     * completes. CSS can override this with:
     *
     * html.gtf-auth-checking body { visibility:hidden; }
     */
    document.documentElement
      .classList.add(
        "gtf-auth-checking"
      );


    const allowed =
      await verify(
        portal
      );


    document.documentElement
      .classList.remove(
        "gtf-auth-checking"
      );


    if (!allowed) {
      return false;
    }


    /*
     * Dispatch a useful event for portal scripts.
     */
    document.dispatchEvent(
      new CustomEvent(
        "gtf:authorized",
        {
          detail: {
            portal,
            role:
              document.documentElement
                .getAttribute(
                  "data-gtf-role"
                )
          }
        }
      )
    );


    return true;
  }


  /* =======================================================
     PUBLIC API
     ======================================================= */

  const GTF_ROLE_GUARD = {

    portals: PORTALS,

    normalizeRole,

    detectPortal,

    roleAllowed,

    getStoredRole,

    verify,

    requireAdmin,

    requireManager,

    requireCashier,

    requireCustomer,

    requireRole,

    redirectToLogin,

    redirectToCorrectPortal,

    initialize
  };


  /* =======================================================
     GLOBAL EXPORT
     ======================================================= */

  window.GTF_ROLE_GUARD =
    GTF_ROLE_GUARD;


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
        initialize();
      },
      {
        once: true
      }
    );

  } else {

    initialize();
  }


})(window, document);
