/**
 * GTB-Banking
 * backend/api/transactions.js
 *
 * Transaction API
 *
 * Routes:
 * POST   /api/transactions
 * GET    /api/transactions
 * GET    /api/transactions/:id
 * PATCH  /api/transactions/:id/status
 *
 * Expected Supabase table:
 * transactions
 *
 * Suggested columns:
 * id
 * user_id
 * account_id
 * type
 * amount
 * currency
 * description
 * recipient_name
 * recipient_account
 * reference
 * status
 * created_at
 * updated_at
 *
 * IMPORTANT:
 * - Users can only access their own transactions.
 * - Do not trust user_id from the browser.
 * - The authenticated Supabase user is authoritative.
 * - Financial operations should also be protected by
 *   Supabase Row Level Security (RLS).
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

const TRANSACTION_TYPES = [
  "deposit",
  "withdrawal",
  "transfer",
  "payment"
];

const TRANSACTION_STATUSES = [
  "pending",
  "completed",
  "failed",
  "cancelled"
];

const DEFAULT_CURRENCY =
  "USD";


/* =========================================================
   RESPONSE HELPERS
   ========================================================= */

function success(
  res,
  data = {},
  status = 200
) {

  return res
    .status(status)
    .json({
      success: true,
      data
    });

}


function failure(
  res,
  message,
  status = 400
) {

  return res
    .status(status)
    .json({
      success: false,
      message
    });

}


/* =========================================================
   AUTHENTICATION
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
      "Transaction authentication error:",
      error.message
    );

    return null;

  }

  return data?.user || null;

}


/* =========================================================
   VALIDATION
   ========================================================= */

function parseAmount(value) {

  const amount =
    Number(value);

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {

    return null;

  }

  /*
   * Prevent more than two decimal places for normal
   * currency transactions.
   */

  if (
    Math.round(
      amount * 100
    ) !==
    Math.round(amount) * 100
  ) {
    /*
     * This branch is intentionally not used because
     * floating-point values can make this unreliable.
     */
  }

  return Math.round(
    amount * 100
  ) / 100;

}


function isValidType(type) {

  return TRANSACTION_TYPES.includes(
    type
  );

}


function isValidStatus(status) {

  return TRANSACTION_STATUSES.includes(
    status
  );

}


function normalizeText(
  value,
  maxLength = 255
) {

  if (
    value === undefined ||
    value === null
  ) {

    return null;

  }

  const text =
    String(value).trim();

  if (!text) {
    return null;
  }

  return text.slice(
    0,
    maxLength
  );

}


/* =========================================================
   SAFE TRANSACTION
   ========================================================= */

function safeTransaction(
  transaction
) {

  if (!transaction) {
    return null;
  }

  return {
    id:
      transaction.id,

    user_id:
      transaction.user_id,

    account_id:
      transaction.account_id,

    type:
      transaction.type,

    amount:
      transaction.amount,

    currency:
      transaction.currency,

    description:
      transaction.description,

    recipient_name:
      transaction.recipient_name,

    recipient_account:
      transaction.recipient_account,

    reference:
      transaction.reference,

    status:
      transaction.status,

    created_at:
      transaction.created_at,

    updated_at:
      transaction.updated_at
  };

}


/* =========================================================
   POST /api/transactions
   =========================================================
 *
 * Creates a transaction record.
 *
 * This endpoint records a transaction request.
 * It does NOT independently move money.
 *
 * For a production banking system, actual balance
 * changes should occur inside a properly authorized,
 * atomic database transaction/service.
 */

router.post(
  "/",
  async (req, res) => {

    try {

      const user =
        await getAuthenticatedUser(
          req
        );


      if (!user) {

        return failure(
          res,
          "Authentication required.",
          401
        );

      }


      const type =
        String(
          req.body?.type || ""
        )
          .trim()
          .toLowerCase();


      const amount =
        parseAmount(
          req.body?.amount
        );


      const accountId =
        normalizeText(
          req.body?.account_id,
          100
        );


      const currency =
        (
          normalizeText(
            req.body?.currency,
            10
          ) ||
          DEFAULT_CURRENCY
        ).toUpperCase();


      const description =
        normalizeText(
          req.body?.description,
          500
        );


      const recipientName =
        normalizeText(
          req.body?.recipient_name,
          255
        );


      const recipientAccount =
        normalizeText(
          req.body?.recipient_account,
          100
        );


      if (
        !isValidType(type)
      ) {

        return failure(
          res,
          "Invalid transaction type.",
          400
        );

      }


      if (
        amount === null
      ) {

        return failure(
          res,
          "A valid transaction amount greater than zero is required.",
          400
        );

      }


      if (
        !accountId
      ) {

        return failure(
          res,
          "Account ID is required.",
          400
        );

      }


      /*
       * IMPORTANT:
       * The user_id comes from the authenticated Supabase
       * session, never from req.body.user_id.
       */

      const transaction = {

        user_id:
          user.id,

        account_id:
          accountId,

        type,

        amount,

        currency,

        description,

        recipient_name:
          recipientName,

        recipient_account:
          recipientAccount,

        status:
          "pending"

      };


      const {
        data,
        error
      } =
        await supabase
          .from("transactions")
          .insert(
            transaction
          )
          .select()
          .single();


      if (error) {

        console.error(
          "Transaction creation error:",
          error.message
        );

        return failure(
          res,
          "Unable to create the transaction.",
          500
        );

      }


      return success(
        res,
        {
          transaction:
            safeTransaction(data)
        },
        201
      );

    } catch (error) {

      console.error(
        "POST /transactions error:",
        error
      );

      return failure(
        res,
        "An unexpected transaction error occurred.",
        500
      );

    }

  }
);


/* =========================================================
   GET /api/transactions
   =========================================================
 *
 * Returns transactions belonging to the authenticated user.
 *
 * Optional query parameters:
 *
 * ?limit=25
 * ?page=1
 * ?status=completed
 * ?type=transfer
 */

router.get(
  "/",
  async (req, res) => {

    try {

      const user =
        await getAuthenticatedUser(
          req
        );


      if (!user) {

        return failure(
          res,
          "Authentication required.",
          401
        );

      }


      let limit =
        Number(
          req.query.limit || 25
        );


      let page =
        Number(
          req.query.page || 1
        );


      if (
        !Number.isInteger(limit) ||
        limit < 1
      ) {

        limit = 25;

      }


      /*
       * Prevent excessively large requests.
       */

      limit =
        Math.min(
          limit,
          100
        );


      if (
        !Number.isInteger(page) ||
        page < 1
      ) {

        page = 1;

      }


      const offset =
        (page - 1) * limit;


      const requestedStatus =
        req.query.status
          ? String(
              req.query.status
            )
              .trim()
              .toLowerCase()
          : null;


      const requestedType =
        req.query.type
          ? String(
              req.query.type
            )
              .trim()
              .toLowerCase()
          : null;


      if (
        requestedStatus &&
        !isValidStatus(
          requestedStatus
        )
      ) {

        return failure(
          res,
          "Invalid transaction status.",
          400
        );

      }


      if (
        requestedType &&
        !isValidType(
          requestedType
        )
      ) {

        return failure(
          res,
          "Invalid transaction type.",
          400
        );

      }


      let query =
        supabase
          .from("transactions")
          .select(
            "*",
            {
              count: "exact"
            }
          )
          /*
           * SECURITY:
           * Always filter by authenticated user.
           */
          .eq(
            "user_id",
            user.id
          )
          .order(
            "created_at",
            {
              ascending: false
            }
          )
          .range(
            offset,
            offset + limit - 1
          );


      if (requestedStatus) {

        query =
          query.eq(
            "status",
            requestedStatus
          );

      }


      if (requestedType) {

        query =
          query.eq(
            "type",
            requestedType
          );

      }


      const {
        data,
        error,
        count
      } =
        await query;


      if (error) {

        console.error(
          "Transaction list error:",
          error.message
        );

        return failure(
          res,
          "Unable to retrieve transactions.",
          500
        );

      }


      const transactions =
        (data || [])
          .map(
            safeTransaction
          );


      return success(
        res,
        {
          transactions,

          pagination: {

            page,

            limit,

            total:
              count || 0,

            pages:
              count
                ? Math.ceil(
                    count / limit
                  )
                : 0

          }
        }
      );

    } catch (error) {

      console.error(
        "GET /transactions error:",
        error
      );

      return failure(
        res,
        "Unable to retrieve transactions.",
        500
      );

    }

  }
);


/* =========================================================
   GET /api/transactions/:id
   ========================================================= */

router.get(
  "/:id",
  async (req, res) => {

    try {

      const user =
        await getAuthenticatedUser(
          req
        );


      if (!user) {

        return failure(
          res,
          "Authentication required.",
          401
        );

      }


      const transactionId =
        String(
          req.params.id || ""
        ).trim();


      if (!transactionId) {

        return failure(
          res,
          "Transaction ID is required.",
          400
        );

      }


      const {
        data,
        error
      } =
        await supabase
          .from("transactions")
          .select("*")
          .eq(
            "id",
            transactionId
          )
          /*
           * SECURITY:
           * Prevent users from retrieving another
           * customer's transaction.
           */
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();


      if (error) {

        console.error(
          "Transaction lookup error:",
          error.message
        );

        return failure(
          res,
          "Unable to retrieve the transaction.",
          500
        );

      }


      if (!data) {

        return failure(
          res,
          "Transaction not found.",
          404
        );

      }


      return success(
        res,
        {
          transaction:
            safeTransaction(data)
        }
      );

    } catch (error) {

      console.error(
        "GET /transactions/:id error:",
        error
      );

      return failure(
        res,
        "Unable to retrieve the transaction.",
        500
      );

    }

  }
);


/* =========================================================
   PATCH /api/transactions/:id/status
   =========================================================
 *
 * Status updates should normally be performed by a
 * trusted backend/service rather than by a customer.
 *
 * This route therefore only allows an authenticated
 * manager/admin to update transaction status.
 */

router.patch(
  "/:id/status",
  async (req, res) => {

    try {

      const user =
        await getAuthenticatedUser(
          req
        );


      if (!user) {

        return failure(
          res,
          "Authentication required.",
          401
        );

      }


      const {
        data: profile,
        error: profileError
      } =
        await supabase
          .from("profiles")
          .select("role")
          .eq(
            "id",
            user.id
          )
          .maybeSingle();


      if (profileError) {

        console.error(
          "Role lookup error:",
          profileError.message
        );

        return failure(
          res,
          "Unable to verify authorization.",
          500
        );

      }


      const role =
        profile?.role;


      if (
        role !== "manager" &&
        role !== "admin"
      ) {

        return failure(
          res,
          "Manager authorization required.",
          403
        );

      }


      const transactionId =
        String(
          req.params.id || ""
        ).trim();


      const newStatus =
        String(
          req.body?.status || ""
        )
          .trim()
          .toLowerCase();


      if (!transactionId) {

        return failure(
          res,
          "Transaction ID is required.",
          400
        );

      }


      if (
        !isValidStatus(
          newStatus
        )
      ) {

        return failure(
          res,
          "Invalid transaction status.",
          400
        );

      }


      const {
        data,
        error
      } =
        await supabase
          .from("transactions")
          .update({
            status:
              newStatus,

            updated_at:
              new Date().toISOString()
          })
          .eq(
            "id",
            transactionId
          )
          .select()
          .maybeSingle();


      if (error) {

        console.error(
          "Transaction status update error:",
          error.message
        );

        return failure(
          res,
          "Unable to update transaction status.",
          500
        );

      }


      if (!data) {

        return failure(
          res,
          "Transaction not found.",
          404
        );

      }


      return success(
        res,
        {
          transaction:
            safeTransaction(data)
        }
      );

    } catch (error) {

      console.error(
        "PATCH /transactions/:id/status error:",
        error
      );

      return failure(
        res,
        "Unable to update the transaction.",
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