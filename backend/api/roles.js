/**
 * GTB-Banking
 * backend/api/roles.js
 *
 * Role Management API
 *
 * Routes:
 * GET    /api/roles
 * GET    /api/roles/me
 * GET    /api/roles/:userId
 * PATCH  /api/roles/:userId
 *
 * Supported application roles:
 * - customer
 * - manager
 * - admin
 *
 * IMPORTANT:
 * - Never trust a role supplied by the frontend.
 * - Role changes are restricted to administrators.
 * - Supabase RLS should also enforce these permissions.
 * - Do not store passwords in the profiles table.
 */

"use strict";

const express = require("express");

const {
  supabase
} = require("../database/supabase");

const router = express.Router();


/* =========================================================
   CONSTANTS
   ========================================================= */

const ALLOWED_ROLES = [
  "customer",
  "manager",
  "admin"
];


/* =========================================================
   RESPONSE HELPERS
   ========================================================= */

function success(
  res,
  data = {},
  status = 200
) {
  return res.status(status).json({
    success: true,
    data
  });
}


function failure(
  res,
  message,
  status = 400
) {
  return res.status(status).json({
    success: false,
    message
  });
}


/* =========================================================
   AUTHENTICATION HELPERS
   ========================================================= */

function getBearerToken(req) {

  const header =
    req.headers.authorization;

  if (!header) {
    return null;
  }

  const parts =
    header.trim().split(/\s+/);

  if (
    parts.length !== 2 ||
    parts[0].toLowerCase() !== "bearer"
  ) {
    return null;
  }

  return parts[1];

}


async function getAuthenticatedUser(req) {

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
      "Authentication error:",
      error.message
    );

    return null;
  }

  return data?.user || null;

}


async function getUserRole(userId) {

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
      .eq("id", userId)
      .maybeSingle();

  if (error) {

    console.error(
      "Role lookup error:",
      error.message
    );

    return null;
  }

  return data?.role || null;

}


async function getAuthenticatedContext(req) {

  const user =
    await getAuthenticatedUser(
      req
    );

  if (!user) {

    return {
      user: null,
      role: null
    };

  }

  const role =
    await getUserRole(
      user.id
    );

  return {
    user,
    role
  };

}


/* =========================================================
   AUTHORIZATION
   ========================================================= */

function isAdmin(role) {

  return role === "admin";

}


function isManagerOrAdmin(role) {

  return (
    role === "manager" ||
    role === "admin"
  );

}


/* =========================================================
   SAFE PROFILE
   ========================================================= */

function safeProfile(profile) {

  if (!profile) {
    return null;
  }

  return {
    id:
      profile.id,

    email:
      profile.email || null,

    full_name:
      profile.full_name || null,

    role:
      profile.role || "customer",

    status:
      profile.status || null,

    created_at:
      profile.created_at || null,

    updated_at:
      profile.updated_at || null
  };

}


/* =========================================================
   GET /api/roles
   =========================================================
 *
 * Returns the available application roles.
 *
 * This endpoint does not expose users or private data.
 */

router.get(
  "/",
  (req, res) => {

    return success(
      res,
      {
        roles: ALLOWED_ROLES
      }
    );

  }
);


/* =========================================================
   GET /api/roles/me
   =========================================================
 *
 * Returns the authenticated user's role.
 */

router.get(
  "/me",
  async (req, res) => {

    try {

      const {
        user,
        role
      } =
        await getAuthenticatedContext(
          req
        );


      if (!user) {

        return failure(
          res,
          "Authentication required.",
          401
        );

      }


      return success(
        res,
        {
          user_id:
            user.id,

          email:
            user.email || null,

          role:
            role || "customer",

          manager:
            role === "manager" ||
            role === "admin",

          admin:
            role === "admin"
        }
      );

    } catch (error) {

      console.error(
        "GET /roles/me error:",
        error
      );

      return failure(
        res,
        "Unable to retrieve your role.",
        500
      );

    }

  }
);


/* =========================================================
   GET /api/roles/:userId
   =========================================================
 *
 * Managers/admins can retrieve role information.
 */

router.get(
  "/:userId",
  async (req, res) => {

    try {

      const {
        user,
        role
      } =
        await getAuthenticatedContext(
          req
        );


      if (!user) {

        return failure(
          res,
          "Authentication required.",
          401
        );

      }


      /*
       * Only managers/admins can inspect another
       * user's role.
       */

      if (
        !isManagerOrAdmin(role)
      ) {

        return failure(
          res,
          "You are not authorized to view user roles.",
          403
        );

      }


      const userId =
        String(
          req.params.userId || ""
        ).trim();


      if (!userId) {

        return failure(
          res,
          "User ID is required.",
          400
        );

      }


      const {
        data,
        error
      } =
        await supabase
          .from("profiles")
          .select(
            [
              "id",
              "email",
              "full_name",
              "role",
              "status",
              "created_at",
              "updated_at"
            ].join(",")
          )
          .eq(
            "id",
            userId
          )
          .maybeSingle();


      if (error) {

        console.error(
          "Profile role lookup error:",
          error.message
        );

        return failure(
          res,
          "Unable to retrieve the user role.",
          500
        );

      }


      if (!data) {

        return failure(
          res,
          "User profile not found.",
          404
        );

      }


      return success(
        res,
        {
          profile:
            safeProfile(data)
        }
      );

    } catch (error) {

      console.error(
        "GET /roles/:userId error:",
        error
      );

      return failure(
        res,
        "An unexpected error occurred.",
        500
      );

    }

  }
);


/* =========================================================
   PATCH /api/roles/:userId
   =========================================================
 *
 * Change a user's application role.
 *
 * Only administrators can perform this operation.
 */

router.patch(
  "/:userId",
  async (req, res) => {

    try {

      const {
        user,
        role: requesterRole
      } =
        await getAuthenticatedContext(
          req
        );


      if (!user) {

        return failure(
          res,
          "Authentication required.",
          401
        );

      }


      /*
       * Only admins can change roles.
       */

      if (
        !isAdmin(requesterRole)
      ) {

        return failure(
          res,
          "Administrator authorization is required.",
          403
        );

      }


      const userId =
        String(
          req.params.userId || ""
        ).trim();


      if (!userId) {

        return failure(
          res,
          "User ID is required.",
          400
        );

      }


      const requestedRole =
        String(
          req.body?.role || ""
        )
          .trim()
          .toLowerCase();


      if (
        !ALLOWED_ROLES.includes(
          requestedRole
        )
      ) {

        return failure(
          res,
          "Invalid role. Allowed roles are customer, manager, and admin.",
          400
        );

      }


      /*
       * Prevent an administrator from accidentally
       * changing their own role through this endpoint.
       *
       * Use a dedicated account-recovery/admin workflow
       * for administrator self-management.
       */

      if (
        userId === user.id
      ) {

        return failure(
          res,
          "Your own administrator role cannot be changed through this endpoint.",
          403
        );

      }


      /*
       * Make sure the target profile exists.
       */

      const {
        data: existingProfile,
        error: profileError
      } =
        await supabase
          .from("profiles")
          .select(
            "id,role"
          )
          .eq(
            "id",
            userId
          )
          .maybeSingle();


      if (profileError) {

        console.error(
          "Existing profile lookup error:",
          profileError.message
        );

        return failure(
          res,
          "Unable to verify the target user.",
          500
        );

      }


      if (!existingProfile) {

        return failure(
          res,
          "User profile not found.",
          404
        );

      }


      /*
       * Prevent a non-admin from being created through
       * an invalid workflow. The requester is already
       * confirmed as an administrator above.
       */

      const {
        data,
        error
      } =
        await supabase
          .from("profiles")
          .update({
            role:
              requestedRole,

            updated_at:
              new Date().toISOString()
          })
          .eq(
            "id",
            userId
          )
          .select(
            [
              "id",
              "email",
              "full_name",
              "role",
              "status",
              "created_at",
              "updated_at"
            ].join(",")
          )
          .single();


      if (error) {

        console.error(
          "Role update error:",
          error.message
        );

        return failure(
          res,
          "Unable to update the user role.",
          500
        );

      }


      return success(
        res,
        {
          profile:
            safeProfile(data),

          previous_role:
            existingProfile.role,

          new_role:
            requestedRole
        }
      );

    } catch (error) {

      console.error(
        "PATCH /roles/:userId error:",
        error
      );

      return failure(
        res,
        "An unexpected error occurred.",
        500
      );

    }

  }
);


/* =========================================================
   EXPORT
   ========================================================= */

module.exports =
  router;