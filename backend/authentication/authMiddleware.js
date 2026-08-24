/**
 * GTB-Banking
 * backend/authentication/authMiddleware.js
 *
 * Authentication & Authorization Middleware
 *
 * Provides:
 * - Supabase access-token verification
 * - req.user
 * - req.userRole
 * - requireAuth
 * - requireRole
 * - requireManager
 * - requireAdmin
 *
 * IMPORTANT:
 * Never trust user IDs or roles sent by the frontend.
 * The authenticated Supabase user and database profile
 * are the source of truth.
 */

"use strict";

const {
  supabase
} = require("../database/supabase");


/* =========================================================
   TOKEN EXTRACTION
   ========================================================= */

function getBearerToken(req) {

  const authorization =
    req.headers.authorization;

  if (!authorization) {
    return null;
  }

  const parts =
    authorization
      .trim()
      .split(/\s+/);

  if (
    parts.length !== 2 ||
    parts[0].toLowerCase() !== "bearer"
  ) {
    return null;
  }

  return parts[1];

}


/* =========================================================
   USER VERIFICATION
   ========================================================= */

async function getAuthenticatedUser(
  req
) {

  const token =
    getBearerToken(req);

  if (!token) {
    return null;
  }

  const {
    data,
    error
  } =
    await supabase.auth.getUser(
      token
    );

  if (error) {

    console.error(
      "Supabase authentication error:",
      error.message
    );

    return null;

  }

  return data?.user || null;

}


/* =========================================================
   ROLE LOOKUP
   ========================================================= */

async function getUserRole(
  userId
) {

  if (!userId) {
    return null;
  }

  const {
    data,
    error
  } =
    await supabase
      .from("profiles")
      .select("role")
      .eq(
        "id",
        userId
      )
      .maybeSingle();


  if (error) {

    console.error(
      "User role lookup error:",
      error.message
    );

    return null;

  }


  return (
    data?.role ||
    "customer"
  );

}


/* =========================================================
   AUTHENTICATION MIDDLEWARE
   =========================================================
 *
 * Requires a valid Supabase access token.
 *
 * Usage:
 *
 * router.get(
 *   "/protected",
 *   requireAuth,
 *   handler
 * );
 */

async function requireAuth(
  req,
  res,
  next
) {

  try {

    const token =
      getBearerToken(req);


    if (!token) {

      return res.status(401).json({
        success: false,
        message:
          "Authentication required."
      });

    }


    const user =
      await getAuthenticatedUser(
        req
      );


    if (!user) {

      return res.status(401).json({
        success: false,
        message:
          "Invalid or expired authentication token."
      });

    }


    /*
     * Attach authenticated identity to request.
     */

    req.user =
      user;


    /*
     * Retrieve application role from the database.
     */

    req.userRole =
      await getUserRole(
        user.id
      );


    /*
     * Request ID may have been created by main.js.
     */

    req.authenticated =
      true;


    return next();

  } catch (error) {

    console.error(
      "requireAuth error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to verify authentication."
    });

  }

}


/* =========================================================
   OPTIONAL AUTHENTICATION
   =========================================================
 *
 * Does not reject unauthenticated requests.
 *
 * If a valid token exists:
 *
 * req.user
 * req.userRole
 *
 * will be populated.
 */

async function optionalAuth(
  req,
  res,
  next
) {

  try {

    const token =
      getBearerToken(req);


    if (!token) {

      req.user =
        null;

      req.userRole =
        null;

      req.authenticated =
        false;

      return next();

    }


    const user =
      await getAuthenticatedUser(
        req
      );


    if (!user) {

      req.user =
        null;

      req.userRole =
        null;

      req.authenticated =
        false;

      return next();

    }


    req.user =
      user;

    req.userRole =
      await getUserRole(
        user.id
      );

    req.authenticated =
      true;


    return next();

  } catch (error) {

    console.error(
      "optionalAuth error:",
      error
    );

    req.user =
      null;

    req.userRole =
      null;

    req.authenticated =
      false;

    return next();

  }

}


/* =========================================================
   ROLE AUTHORIZATION
   =========================================================
 *
 * Usage:
 *
 * router.get(
 *   "/admin-area",
 *   requireAuth,
 *   requireRole("admin"),
 *   handler
 * );
 */

function requireRole(
  ...allowedRoles
) {

  return async function roleMiddleware(
    req,
    res,
    next
  ) {

    try {

      /*
       * Authentication must happen first.
       */

      if (
        !req.user
      ) {

        return res.status(401).json({
          success: false,
          message:
            "Authentication required."
        });

      }


      /*
       * Normalize roles.
       */

      const roles =
        allowedRoles
          .map(
            role =>
              String(role)
                .trim()
                .toLowerCase()
          )
          .filter(Boolean);


      if (
        roles.length === 0
      ) {

        return res.status(500).json({
          success: false,
          message:
            "No authorized roles were configured."
        });

      }


      const currentRole =
        String(
          req.userRole ||
          "customer"
        )
          .trim()
          .toLowerCase();


      if (
        !roles.includes(
          currentRole
        )
      ) {

        return res.status(403).json({
          success: false,
          message:
            "You are not authorized to perform this action."
        });

      }


      return next();

    } catch (error) {

      console.error(
        "requireRole error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to verify authorization."
      });

    }

  };

}


/* =========================================================
   CUSTOMER
   ========================================================= */

const requireCustomer =
  requireRole(
    "customer"
  );


/* =========================================================
   MANAGER
   ========================================================= */

const requireManager =
  requireRole(
    "manager",
    "admin"
  );


/* =========================================================
   ADMIN
   ========================================================= */

const requireAdmin =
  requireRole(
    "admin"
  );


/* =========================================================
   MANAGER OR ADMIN
   ========================================================= */

const requireManagerOrAdmin =
  requireRole(
    "manager",
    "admin"
  );


/* =========================================================
   ROLE CHECK HELPERS
   ========================================================= */

function isAdmin(
  req
) {

  return (
    req.userRole ===
    "admin"
  );

}


function isManager(
  req
) {

  return (
    req.userRole ===
    "manager"
  );

}


function isManagerOrAdmin(
  req
) {

  return (
    req.userRole ===
      "manager" ||
    req.userRole ===
      "admin"
  );

}


/* =========================================================
   CURRENT USER ID
   ========================================================= */

function getCurrentUserId(
  req
) {

  return (
    req.user?.id ||
    null
  );

}


/* =========================================================
   EXPORT
   ========================================================= */

module.exports = {

  getBearerToken,

  getAuthenticatedUser,

  getUserRole,

  requireAuth,

  optionalAuth,

  requireRole,

  requireCustomer,

  requireManager,

  requireAdmin,

  requireManagerOrAdmin,

  isAdmin,

  isManager,

  isManagerOrAdmin,

  getCurrentUserId

};