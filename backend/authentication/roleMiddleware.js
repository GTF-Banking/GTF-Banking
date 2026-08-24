/**
 * GTB-Banking
 * backend/authentication/roleMiddleware.js
 *
 * Role-based authorization middleware.
 *
 * IMPORTANT:
 * This middleware should be used AFTER requireAuth
 * from authMiddleware.js.
 *
 * Example:
 *
 * router.get(
 *   "/admin",
 *   requireAuth,
 *   requireAdmin,
 *   handler
 * );
 */

"use strict";


/* =========================================================
   ROLE CONSTANTS
   ========================================================= */

const ROLES = Object.freeze({

  CUSTOMER:
    "customer",

  MANAGER:
    "manager",

  ADMIN:
    "admin"

});


/* =========================================================
   INTERNAL ROLE CHECK
   ========================================================= */

function normalizeRole(
  role
) {

  if (
    role === undefined ||
    role === null
  ) {

    return null;

  }

  return String(
    role
  )
    .trim()
    .toLowerCase();

}


/* =========================================================
   REQUIRE ROLE
   =========================================================
 *
 * Usage:
 *
 * requireRole("admin")
 *
 * or:
 *
 * requireRole("manager", "admin")
 */

function requireRole(
  ...allowedRoles
) {

  const normalizedRoles =
    allowedRoles
      .map(
        normalizeRole
      )
      .filter(Boolean);


  return function (
    req,
    res,
    next
  ) {

    /*
     * Authentication must already have populated
     * req.user.
     */

    if (!req.user) {

      return res.status(401).json({

        success: false,

        message:
          "Authentication required."

      });

    }


    /*
     * req.userRole should have been populated by
     * authMiddleware.js.
     */

    const currentRole =
      normalizeRole(
        req.userRole
      );


    if (!currentRole) {

      return res.status(403).json({

        success: false,

        message:
          "User role could not be determined."

      });

    }


    if (
      !normalizedRoles.includes(
        currentRole
      )
    ) {

      return res.status(403).json({

        success: false,

        message:
          "You are not authorized to access this resource."

      });

    }


    return next();

  };

}


/* =========================================================
   CUSTOMER
   ========================================================= */

const requireCustomer =
  requireRole(
    ROLES.CUSTOMER
  );


/* =========================================================
   MANAGER
   ========================================================= */

const requireManager =
  requireRole(
    ROLES.MANAGER,
    ROLES.ADMIN
  );


/* =========================================================
   ADMIN
   ========================================================= */

const requireAdmin =
  requireRole(
    ROLES.ADMIN
  );


/* =========================================================
   MANAGER OR ADMIN
   ========================================================= */

const requireManagerOrAdmin =
  requireRole(
    ROLES.MANAGER,
    ROLES.ADMIN
  );


/* =========================================================
   ROLE CHECK FUNCTIONS
   ========================================================= */

function hasRole(
  req,
  role
) {

  return (
    normalizeRole(
      req.userRole
    ) ===
    normalizeRole(
      role
    )
  );

}


function isCustomer(
  req
) {

  return hasRole(
    req,
    ROLES.CUSTOMER
  );

}


function isManager(
  req
) {

  return hasRole(
    req,
    ROLES.MANAGER
  );

}


function isAdmin(
  req
) {

  return hasRole(
    req,
    ROLES.ADMIN
  );

}


function isManagerOrAdmin(
  req
) {

  const role =
    normalizeRole(
      req.userRole
    );

  return (
    role === ROLES.MANAGER ||
    role === ROLES.ADMIN
  );

}


/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {

  ROLES,

  normalizeRole,

  requireRole,

  requireCustomer,

  requireManager,

  requireAdmin,

  requireManagerOrAdmin,

  hasRole,

  isCustomer,

  isManager,

  isAdmin,

  isManagerOrAdmin

};