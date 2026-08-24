/**
 * Global TrustFund
 * backend/api/accounts.js
 *
 * Account API
 *
 * Responsibilities:
 * - Authenticate the requesting user
 * - Verify the user is allowed to access the account
 * - Retrieve account records
 * - Retrieve a single account
 * - Create an account record
 * - Update permitted account fields
 * - Return safe JSON responses
 *
 * IMPORTANT:
 * - Never put the Supabase service-role key in frontend code.
 * - Never trust a user-supplied user_id for authorization.
 * - Authorization must be enforced server-side and with
 *   Supabase Row Level Security (RLS).
 */

"use strict";

const express = require("express");

const {
  supabase
} = require("../database/supabase");

const {
  requireAuth
} = require("../authentication/authMiddleware");

const {
  validateAccountCreate,
  validateAccountUpdate
} = require("../security/validation");


const router = express.Router();


/* =========================================================
   HELPERS
   ========================================================= */

/**
 * Standard success response.
 */
function success(
  res,
  data = {},
  statusCode = 200
) {
  return res.status(statusCode).json({
    success: true,
    data
  });
}


/**
 * Standard error response.
 *
 * Avoid returning database internals to clients.
 */
function failure(
  res,
  message,
  statusCode = 400
) {
  return res.status(statusCode).json({
    success: false,
    message
  });
}


/**
 * Determine whether the authenticated user is a manager.
 *
 * This function expects the authentication middleware to attach
 * the authenticated user to req.user.
 *
 * The exact role implementation can later be replaced with
 * your Supabase profile/role lookup.
 */
function isManager(req) {

  const role =
    req.user?.role ||
    req.user?.user_metadata?.role ||
    req.user?.app_metadata?.role;

  return role === "manager" ||
         role === "admin";
}


/**
 * Get the authenticated user's ID.
 */
function getAuthenticatedUserId(req) {

  return (
    req.user?.id ||
    req.user?.user_id ||
    null
  );

}


/**
 * Check whether a requested account belongs to the
 * authenticated user.
 */
async function accountBelongsToUser(
  accountId,
  userId
) {

  const {
    data,
    error
  } = await supabase
    .from("accounts")
    .select("id,user_id")
    .eq("id", accountId)
    .maybeSingle();


  if (error) {
    throw error;
  }


  if (!data) {
    return false;
  }


  return data.user_id === userId;

}


/* =========================================================
   GET /api/accounts
   =========================================================
 *
 * Customer:
 *   Returns accounts belonging to the authenticated user.
 *
 * Manager/admin:
 *   Returns accounts according to backend/RLS permissions.
 *
 * Do not allow arbitrary user_id values from the client
 * to bypass authorization.
 */

router.get(
  "/",
  requireAuth,
  async (req, res) => {

    try {

      const userId =
        getAuthenticatedUserId(req);


      if (!userId) {

        return failure(
          res,
          "Authentication required.",
          401
        );

      }


      let query =
        supabase
          .from("accounts")
          .select(
            [
              "id",
              "user_id",
              "account_type",
              "account_number",
              "status",
              "currency",
              "created_at",
              "updated_at"
            ].join(",")
          )
          .order(
            "created_at",
            {
              ascending: false
            }
          );


      /*
       * Normal customers are restricted to their own
       * accounts.
       *
       * Managers/admins can use the database/RLS policy
       * appropriate for their authorized scope.
       */

      if (!isManager(req)) {

        query =
          query.eq(
            "user_id",
            userId
          );

      }


      const {
        data,
        error
      } = await query;


      if (error) {

        console.error(
          "Accounts query error:",
          error
        );

        return failure(
          res,
          "Unable to retrieve accounts.",
          500
        );

      }


      return success(
        res,
        {
          accounts: data || []
        }
      );

    } catch (error) {

      console.error(
        "GET /accounts error:",
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
   GET /api/accounts/:id
   ========================================================= */

router.get(
  "/:id",
  requireAuth,
  async (req, res) => {

    try {

      const accountId =
        String(
          req.params.id || ""
        ).trim();


      const userId =
        getAuthenticatedUserId(req);


      if (!userId) {

        return failure(
          res,
          "Authentication required.",
          401
        );

      }


      if (!accountId) {

        return failure(
          res,
          "Account ID is required.",
          400
        );

      }


      let query =
        supabase
          .from("accounts")
          .select(
            [
              "id",
              "user_id",
              "account_type",
              "account_number",
              "status",
              "currency",
              "created_at",
              "updated_at"
            ].join(",")
          )
          .eq(
            "id",
            accountId
          );


      /*
       * Customer authorization.
       *
       * Managers/admins are allowed through according to
       * their authenticated role and database RLS.
       */

      if (!isManager(req)) {

        query =
          query.eq(
            "user_id",
            userId
          );

      }


      const {
        data,
        error
      } = await query.maybeSingle();


      if (error) {

        console.error(
          "Account lookup error:",
          error
        );

        return failure(
          res,
          "Unable to retrieve the account.",
          500
        );

      }


      if (!data) {

        return failure(
          res,
          "Account not found.",
          404
        );

      }


      return success(
        res,
        {
          account: data
        }
      );

    } catch (error) {

      console.error(
        "GET /accounts/:id error:",
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
   POST /api/accounts
   =========================================================
 *
 * Creates an account record.
 *
 * In a production banking system, account creation should
 * normally be performed by a controlled backend workflow,
 * not by blindly accepting arbitrary account fields.
 */

router.post(
  "/",
  requireAuth,
  async (req, res) => {

    try {

      const userId =
        getAuthenticatedUserId(req);


      if (!userId) {

        return failure(
          res,
          "Authentication required.",
          401
        );

      }


      /*
       * Account creation is restricted to authorized
       * manager/admin workflows in this example.
       */

      if (!isManager(req)) {

        return failure(
          res,
          "You are not authorized to create accounts.",
          403
        );

      }


      const validation =
        validateAccountCreate(
          req.body
        );


      if (
        !validation ||
        validation.valid !== true
      ) {

        return failure(
          res,
          validation?.message ||
          "Invalid account information.",
          400
        );

      }


      const input =
        validation.data ||
        req.body;


      const accountData = {

        user_id:
          input.user_id,

        account_type:
          input.account_type,

        currency:
          input.currency || "USD",

        status:
          input.status || "pending"

      };


      /*
       * Do not allow clients to submit:
       *
       * - balance
       * - available_balance
       * - ledger_balance
       * - internal account identifiers
       * - created_at
       * - updated_at
       *
       * Those should be generated/controlled by the
       * backend/database.
       */


      const {
        data,
        error
      } = await supabase
        .from("accounts")
        .insert(
          accountData
        )
        .select(
          [
            "id",
            "user_id",
            "account_type",
            "account_number",
            "status",
            "currency",
            "created_at",
            "updated_at"
          ].join(",")
        )
        .single();


      if (error) {

        console.error(
          "Account creation error:",
          error
        );

        return failure(
          res,
          "Unable to create the account.",
          500
        );

      }


      return success(
        res,
        {
          account: data
        },
        201
      );

    } catch (error) {

      console.error(
        "POST /accounts error:",
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
   PATCH /api/accounts/:id
   =========================================================
 *
 * Updates permitted account metadata.
 *
 * Financial balances should NOT be modified through a generic
 * account update endpoint.
 */

router.patch(
  "/:id",
  requireAuth,
  async (req, res) => {

    try {

      const accountId =
        String(
          req.params.id || ""
        ).trim();


      const userId =
        getAuthenticatedUserId(req);


      if (!userId) {

        return failure(
          res,
          "Authentication required.",
          401
        );

      }


      if (!accountId) {

        return failure(
          res,
          "Account ID is required.",
          400
        );

      }


      /*
       * Only managers/admins may update account metadata.
       */

      if (!isManager(req)) {

        return failure(
          res,
          "You are not authorized to update accounts.",
          403
        );

      }


      const validation =
        validateAccountUpdate(
          req.body
        );


      if (
        !validation ||
        validation.valid !== true
      ) {

        return failure(
          res,
          validation?.message ||
          "Invalid account update.",
          400
        );

      }


      const input =
        validation.data ||
        req.body;


      const updates = {};


      /*
       * Explicit allow-list.
       *
       * Never pass req.body directly into Supabase.
       */

      if (
        typeof input.status ===
        "string"
      ) {

        updates.status =
          input.status;

      }


      if (
        typeof input.account_type ===
        "string"
      ) {

        updates.account_type =
          input.account_type;

      }


      if (
        typeof input.currency ===
        "string"
      ) {

        updates.currency =
          input.currency;

      }


      if (
        Object.keys(updates).length === 0
      ) {

        return failure(
          res,
          "No permitted account fields were supplied.",
          400
        );

      }


      updates.updated_at =
        new Date().toISOString();


      const {
        data,
        error
      } = await supabase
        .from("accounts")
        .update(
          updates
        )
        .eq(
          "id",
          accountId
        )
        .select(
          [
            "id",
            "user_id",
            "account_type",
            "account_number",
            "status",
            "currency",
            "created_at",
            "updated_at"
          ].join(",")
        )
        .single();


      if (error) {

        console.error(
          "Account update error:",
          error
        );

        return failure(
          res,
          "Unable to update the account.",
          500
        );

      }


      return success(
        res,
        {
          account: data
        }
      );

    } catch (error) {

      console.error(
        "PATCH /accounts/:id error:",
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
   DELETE /api/accounts/:id
   =========================================================
 *
 * Hard deletion of banking records is intentionally disabled.
 *
 * Banking records generally require controlled lifecycle
 * management and auditability rather than unrestricted DELETE.
 */

router.delete(
  "/:id",
  requireAuth,
  async (req, res) => {

    try {

      if (!isManager(req)) {

        return failure(
          res,
          "You are not authorized to manage account lifecycle.",
          403
        );

      }


      return failure(
        res,
        "Account deletion is disabled. Use an authorized account lifecycle workflow.",
        405
      );

    } catch (error) {

      console.error(
        "DELETE /accounts/:id error:",
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