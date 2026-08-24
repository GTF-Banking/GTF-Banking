/**
 * GTF-Banking
 * backend/transactions/transactionService.js
 *
 * Transaction business-logic layer.
 *
 * Responsibilities:
 * - Create transactions
 * - Retrieve transactions
 * - Retrieve a user's transactions
 * - Validate transaction data
 * - Prevent unauthorized account access
 * - Generate transaction references
 * - Update transaction status
 *
 * IMPORTANT:
 * For real banking production, balance-changing operations should
 * be performed with database transactions/RPC functions that lock
 * the affected account rows atomically. Do not rely on a sequence
 * of separate client-side updates for financial balances.
 */

"use strict";

const {
  supabase,
  supabaseAdmin
} = require("../database/supabase");

const {
  generateReference
} = require("../security/security");

const {
  validateAmount,
  validateCurrency,
  validateTransactionType,
  validateTransactionStatus,
  validateAccountNumber,
  validateUUID,
  validateDescription
} = require("../security/validation");


/* =========================================================
   CONSTANTS
   ========================================================= */

const TRANSACTION_TYPES = Object.freeze([
  "deposit",
  "withdrawal",
  "transfer",
  "payment"
]);

const TRANSACTION_STATUSES = Object.freeze([
  "pending",
  "completed",
  "failed",
  "cancelled"
]);

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;


/* =========================================================
   INTERNAL HELPERS
   ========================================================= */

function getClient(
  client
) {
  return client || supabase;
}


function requireClient(
  client
) {

  const database =
    getClient(client);

  if (!database) {

    throw new Error(
      "Supabase database client is not configured."
    );

  }

  return database;

}


function normalizePage(
  page
) {

  const value =
    Number(page);

  if (
    !Number.isInteger(value) ||
    value < 1
  ) {

    return 1;

  }

  return value;

}


function normalizePageSize(
  pageSize
) {

  const value =
    Number(pageSize);

  if (
    !Number.isInteger(value) ||
    value < 1
  ) {

    return DEFAULT_PAGE_SIZE;

  }

  return Math.min(
    value,
    MAX_PAGE_SIZE
  );

}


function getPagination(
  page,
  pageSize
) {

  const normalizedPage =
    normalizePage(
      page
    );

  const normalizedPageSize =
    normalizePageSize(
      pageSize
    );

  const from =
    (
      normalizedPage - 1
    ) *
    normalizedPageSize;

  const to =
    from +
    normalizedPageSize -
    1;

  return {
    page:
      normalizedPage,

    pageSize:
      normalizedPageSize,

    from,

    to
  };

}


/* =========================================================
   ACCOUNT LOOKUP
   ========================================================= */

/**
 * Find an account owned by a specific authenticated user.
 *
 * Expected database structure:
 *
 * accounts
 * ├── id
 * ├── user_id
 * ├── account_number
 * ├── account_type
 * ├── currency
 * ├── balance
 * └── status
 *
 * Adjust column names if your schema uses different names.
 */

async function getUserAccount(
  userId,
  accountId,
  client
) {

  if (
    !userId
  ) {

    throw new Error(
      "Authenticated user ID is required."
    );

  }

  const database =
    requireClient(
      client
    );


  let query =
    database
      .from("accounts")
      .select("*")
      .eq(
        "user_id",
        userId
      );


  if (
    accountId
  ) {

    query =
      query.eq(
        "id",
        accountId
      );

  }


  const {
    data,
    error
  } =
    await query
      .maybeSingle();


  if (error) {

    throw new Error(
      `Unable to retrieve account: ${error.message}`
    );

  }


  if (!data) {

    throw new Error(
      "Account not found."
    );

  }


  return data;

}


/* =========================================================
   FIND ACCOUNT BY ACCOUNT NUMBER
   ========================================================= */

async function getAccountByNumber(
  userId,
  accountNumber,
  client
) {

  const validation =
    validateAccountNumber(
      accountNumber
    );


  if (
    !validation.valid
  ) {

    throw new Error(
      validation.errors.join(" ")
    );

  }


  const database =
    requireClient(
      client
    );


  const {
    data,
    error
  } =
    await database
      .from("accounts")
      .select("*")
      .eq(
        "user_id",
        userId
      )
      .eq(
        "account_number",
        validation.data
      )
      .maybeSingle();


  if (error) {

    throw new Error(
      `Unable to retrieve account: ${error.message}`
    );

  }


  if (!data) {

    throw new Error(
      "Account not found."
    );

  }


  return data;

}


/* =========================================================
   VALIDATE TRANSACTION INPUT
   ========================================================= */

function validateTransactionInput(
  input
) {

  const errors = [];


  if (
    !input ||
    typeof input !== "object"
  ) {

    return {
      valid: false,
      errors: [
        "Transaction data is required."
      ]
    };

  }


  const type =
    validateTransactionType(
      input.type
    );


  if (
    !type.valid
  ) {

    errors.push(
      ...type.errors
    );

  }


  const amount =
    validateAmount(
      input.amount
    );


  if (
    !amount.valid
  ) {

    errors.push(
      ...amount.errors
    );

  }


  const currency =
    validateCurrency(
      input.currency
    );


  if (
    !currency.valid
  ) {

    errors.push(
      ...currency.errors
    );

  }


  if (
    input.description !==
    undefined
  ) {

    const description =
      validateDescription(
        input.description
      );


    if (
      !description.valid
    ) {

      errors.push(
        ...description.errors
      );

    }

  }


  return {

    valid:
      errors.length === 0,

    errors,

    data:
      errors.length === 0
        ? {
            type:
              type.data,

            amount:
              amount.data,

            currency:
              currency.data,

            description:
              input.description
                ? String(
                    input.description
                  )
                    .trim()
                    .slice(
                      0,
                      2000
                    )
                : null
          }
        : null

  };

}


/* =========================================================
   CREATE TRANSACTION
   ========================================================= */

/**
 * Creates a transaction record.
 *
 * This function does NOT directly modify account balances.
 * Balance-changing operations should be handled atomically
 * through a trusted database transaction/RPC.
 */

async function createTransaction(
  {
    userId,
    accountId,
    type,
    amount,
    currency,
    description = null,
    metadata = {}
  },
  client
) {

  if (
    !userId
  ) {

    throw new Error(
      "Authenticated user ID is required."
    );

  }


  const validation =
    validateTransactionInput({
      type,
      amount,
      currency,
      description
    });


  if (
    !validation.valid
  ) {

    throw new Error(
      validation.errors.join(" ")
    );

  }


  const database =
    requireClient(
      client
    );


  /*
   * Verify that the source account belongs to the
   * authenticated user.
   */

  const account =
    await getUserAccount(
      userId,
      accountId,
      database
    );


  if (
    account.status &&
    ![
      "active",
      "open"
    ].includes(
      String(
        account.status
      ).toLowerCase()
    )
  ) {

    throw new Error(
      "This account is not available for transactions."
    );

  }


  const transactionReference =
    generateReference(
      "GTF"
    );


  const transaction = {

    user_id:
      userId,

    account_id:
      account.id,

    type:
      validation.data.type,

    amount:
      validation.data.amount,

    currency:
      validation.data.currency,

    description:
      validation.data.description,

    reference:
      transactionReference,

    status:
      "pending",

    metadata:
      metadata &&
      typeof metadata === "object"
        ? metadata
        : {}

  };


  const {
    data,
    error
  } =
    await database
      .from("transactions")
      .insert(
        transaction
      )
      .select("*")
      .single();


  if (error) {

    throw new Error(
      `Unable to create transaction: ${error.message}`
    );

  }


  return data;

}


/* =========================================================
   GET TRANSACTION BY ID
   ========================================================= */

async function getTransactionById(
  userId,
  transactionId,
  client
) {

  if (
    !userId
  ) {

    throw new Error(
      "Authenticated user ID is required."
    );

  }


  const idValidation =
    validateUUID(
      transactionId,
      "Transaction ID"
    );


  if (
    !idValidation.valid
  ) {

    throw new Error(
      idValidation.errors.join(" ")
    );

  }


  const database =
    requireClient(
      client
    );


  const {
    data,
    error
  } =
    await database
      .from("transactions")
      .select("*")
      .eq(
        "id",
        idValidation.data
      )
      .eq(
        "user_id",
        userId
      )
      .maybeSingle();


  if (error) {

    throw new Error(
      `Unable to retrieve transaction: ${error.message}`
    );

  }


  if (!data) {

    throw new Error(
      "Transaction not found."
    );

  }


  return data;

}


/* =========================================================
   GET USER TRANSACTIONS
   ========================================================= */

async function getUserTransactions(
  userId,
  options = {},
  client
) {

  if (
    !userId
  ) {

    throw new Error(
      "Authenticated user ID is required."
    );

  }


  const database =
    requireClient(
      client
    );


  const {
    page,
    pageSize,
    from,
    to
  } =
    getPagination(
      options.page,
      options.pageSize
    );


  let query =
    database
      .from("transactions")
      .select(
        "*",
        {
          count: "exact"
        }
      )
      .eq(
        "user_id",
        userId
      );


  /*
   * Optional account filtering.
   */

  if (
    options.accountId
  ) {

    const validation =
      validateUUID(
        options.accountId,
        "Account ID"
      );


    if (
      !validation.valid
    ) {

      throw new Error(
        validation.errors.join(" ")
      );

    }


    query =
      query.eq(
        "account_id",
        validation.data
      );

  }


  /*
   * Optional transaction type filtering.
   */

  if (
    options.type
  ) {

    const validation =
      validateTransactionType(
        options.type
      );


    if (
      !validation.valid
    ) {

      throw new Error(
        validation.errors.join(" ")
      );

    }


    query =
      query.eq(
        "type",
        validation.data
      );

  }


  /*
   * Optional status filtering.
   */

  if (
    options.status
  ) {

    const validation =
      validateTransactionStatus(
        options.status
      );


    if (
      !validation.valid
    ) {

      throw new Error(
        validation.errors.join(" ")
      );

    }


    query =
      query.eq(
        "status",
        validation.data
      );

  }


  /*
   * Optional currency filtering.
   */

  if (
    options.currency
  ) {

    const validation =
      validateCurrency(
        options.currency
      );


    if (
      !validation.valid
    ) {

      throw new Error(
        validation.errors.join(" ")
      );

    }


    query =
      query.eq(
        "currency",
        validation.data
      );

  }


  /*
   * Newest transactions first.
   */

  query =
    query
      .order(
        "created_at",
        {
          ascending:
            false
        }
      )
      .range(
        from,
        to
      );


  const {
    data,
    error,
    count
  } =
    await query;


  if (error) {

    throw new Error(
      `Unable to retrieve transactions: ${error.message}`
    );

  }


  return {

    transactions:
      data || [],

    pagination: {

      page,

      pageSize,

      total:
        count || 0,

      totalPages:
        count
          ? Math.ceil(
              count /
              pageSize
            )
          : 0

    }

  };

}


/* =========================================================
   UPDATE TRANSACTION STATUS
   ========================================================= */

/**
 * Status changes should normally be restricted to trusted
 * backend workflows.
 *
 * This function verifies that the transaction belongs to
 * the authenticated user unless an administrative workflow
 * supplies a server-side client and explicitly handles its
 * authorization separately.
 */

async function updateTransactionStatus(
  userId,
  transactionId,
  status,
  client
) {

  if (
    !userId
  ) {

    throw new Error(
      "Authenticated user ID is required."
    );

  }


  const idValidation =
    validateUUID(
      transactionId,
      "Transaction ID"
    );


  if (
    !idValidation.valid
  ) {

    throw new Error(
      idValidation.errors.join(" ")
    );

  }


  const statusValidation =
    validateTransactionStatus(
      status
    );


  if (
    !statusValidation.valid
  ) {

    throw new Error(
      statusValidation.errors.join(" ")
    );

  }


  const database =
    requireClient(
      client
    );


  const {
    data,
    error
  } =
    await database
      .from("transactions")
      .update({
        status:
          statusValidation.data
      })
      .eq(
        "id",
        idValidation.data
      )
      .eq(
        "user_id",
        userId
      )
      .select("*")
      .maybeSingle();


  if (error) {

    throw new Error(
      `Unable to update transaction: ${error.message}`
    );

  }


  if (!data) {

    throw new Error(
      "Transaction not found or cannot be updated."
    );

  }


  return data;

}


/* =========================================================
   CANCEL TRANSACTION
   ========================================================= */

async function cancelTransaction(
  userId,
  transactionId,
  client
) {

  const transaction =
    await getTransactionById(
      userId,
      transactionId,
      client
    );


  if (
    transaction.status !==
    "pending"
  ) {

    throw new Error(
      "Only pending transactions can be cancelled."
    );

  }


  return updateTransactionStatus(
    userId,
    transactionId,
    "cancelled",
    client
  );

}


/* =========================================================
   TRANSACTION SUMMARY
   ========================================================= */

async function getTransactionSummary(
  userId,
  options = {},
  client
) {

  if (
    !userId
  ) {

    throw new Error(
      "Authenticated user ID is required."
    );

  }


  const database =
    requireClient(
      client
    );


  let query =
    database
      .from("transactions")
      .select(
        "type, amount, currency, status"
      )
      .eq(
        "user_id",
        userId
      );


  if (
    options.currency
  ) {

    const validation =
      validateCurrency(
        options.currency
      );


    if (
      !validation.valid
    ) {

      throw new Error(
        validation.errors.join(" ")
      );

    }


    query =
      query.eq(
        "currency",
        validation.data
      );

  }


  const {
    data,
    error
  } =
    await query;


  if (error) {

    throw new Error(
      `Unable to calculate transaction summary: ${error.message}`
    );

  }


  const summary = {

    totalTransactions:
      0,

    totalDeposits:
      0,

    totalWithdrawals:
      0,

    totalTransfers:
      0,

    totalPayments:
      0,

    completed:
      0,

    pending:
      0,

    failed:
      0,

    cancelled:
      0

  };


  for (
    const transaction
    of data || []
  ) {

    summary.totalTransactions +=
      1;


    const amount =
      Number(
        transaction.amount
      ) || 0;


    switch (
      transaction.type
    ) {

      case "deposit":

        summary.totalDeposits +=
          amount;

        break;


      case "withdrawal":

        summary.totalWithdrawals +=
          amount;

        break;


      case "transfer":

        summary.totalTransfers +=
          amount;

        break;


      case "payment":

        summary.totalPayments +=
          amount;

        break;

    }


    switch (
      transaction.status
    ) {

      case "completed":

        summary.completed +=
          1;

        break;


      case "pending":

        summary.pending +=
          1;

        break;


      case "failed":

        summary.failed +=
          1;

        break;


      case "cancelled":

        summary.cancelled +=
          1;

        break;

    }

  }


  return summary;

}


/* =========================================================
   ADMIN TRANSACTION LOOKUP
   ========================================================= */

/**
 * Server-side administrative lookup.
 *
 * IMPORTANT:
 * This function should ONLY be called after the API layer
 * has already verified that the authenticated caller has
 * an appropriate manager/admin role.
 */

async function getAllTransactions(
  options = {},
  client
) {

  /*
   * This function intentionally defaults to the normal
   * Supabase client. The caller can explicitly pass
   * supabaseAdmin for a trusted server-side admin workflow.
   */

  const database =
    requireClient(
      client
    );


  const {
    page,
    pageSize,
    from,
    to
  } =
    getPagination(
      options.page,
      options.pageSize
    );


  let query =
    database
      .from("transactions")
      .select(
        "*",
        {
          count:
            "exact"
        }
      );


  if (
    options.userId
  ) {

    const validation =
      validateUUID(
        options.userId,
        "User ID"
      );


    if (
      !validation.valid
    ) {

      throw new Error(
        validation.errors.join(" ")
      );

    }


    query =
      query.eq(
        "user_id",
        validation.data
      );

  }


  if (
    options.status
  ) {

    const validation =
      validateTransactionStatus(
        options.status
      );


    if (
      !validation.valid
    ) {

      throw new Error(
        validation.errors.join(" ")
      );

    }


    query =
      query.eq(
        "status",
        validation.data
      );

  }


  if (
    options.type
  ) {

    const validation =
      validateTransactionType(
        options.type
      );


    if (
      !validation.valid
    ) {

      throw new Error(
        validation.errors.join(" ")
      );

    }


    query =
      query.eq(
        "type",
        validation.data
      );

  }


  const {
    data,
    error,
    count
  } =
    await query
      .order(
        "created_at",
        {
          ascending:
            false
        }
      )
      .range(
        from,
        to
      );


  if (error) {

    throw new Error(
      `Unable to retrieve transactions: ${error.message}`
    );

  }


  return {

    transactions:
      data || [],

    pagination: {

      page,

      pageSize,

      total:
        count || 0,

      totalPages:
        count
          ? Math.ceil(
              count /
              pageSize
            )
          : 0

    }

  };

}


/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {

  TRANSACTION_TYPES,

  TRANSACTION_STATUSES,

  getUserAccount,

  getAccountByNumber,

  validateTransactionInput,

  createTransaction,

  getTransactionById,

  getUserTransactions,

  updateTransactionStatus,

  cancelTransaction,

  getTransactionSummary,

  getAllTransactions,

  supabase,

  supabaseAdmin

};