/**
 * GTF-Banking
 * backend/transactions/transactionValidation.js
 *
 * Transaction-specific validation.
 *
 * This file is intentionally separate from:
 *
 * backend/security/validation.js
 *
 * security/validation.js
 * -> common API/input validation
 *
 * transactionValidation.js
 * -> rules specific to banking transactions
 *
 * IMPORTANT:
 * This module validates transaction requests.
 * It does NOT authorize users and does NOT update balances.
 */

"use strict";


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


const MAX_AMOUNT = 1000000000;

const MAX_DESCRIPTION_LENGTH = 2000;

const MAX_REFERENCE_LENGTH = 100;

const MAX_CURRENCY_LENGTH = 3;

const MAX_ACCOUNT_NUMBER_LENGTH = 34;


/* =========================================================
   RESULT HELPERS
   ========================================================= */

function validationSuccess(
  data = null
) {

  return {
    valid: true,
    errors: [],
    data
  };

}


function validationFailure(
  errors
) {

  return {
    valid: false,
    errors: Array.isArray(errors)
      ? errors
      : [String(errors)],
    data: null
  };

}


/* =========================================================
   BASIC HELPERS
   ========================================================= */

function isPlainObject(
  value
) {

  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );

}


function hasOwn(
  object,
  property
) {

  return Object.prototype.hasOwnProperty.call(
    object,
    property
  );

}


/* =========================================================
   TRANSACTION TYPE
   ========================================================= */

function normalizeTransactionType(
  type
) {

  if (
    typeof type !== "string"
  ) {

    return null;

  }


  return type
    .trim()
    .toLowerCase();

}


function validateTransactionType(
  type
) {

  const normalized =
    normalizeTransactionType(
      type
    );


  if (!normalized) {

    return validationFailure(
      "Transaction type is required."
    );

  }


  if (
    !TRANSACTION_TYPES.includes(
      normalized
    )
  ) {

    return validationFailure(
      "Invalid transaction type."
    );

  }


  return validationSuccess(
    normalized
  );

}


/* =========================================================
   TRANSACTION STATUS
   ========================================================= */

function normalizeTransactionStatus(
  status
) {

  if (
    typeof status !== "string"
  ) {

    return null;

  }


  return status
    .trim()
    .toLowerCase();

}


function validateTransactionStatus(
  status
) {

  const normalized =
    normalizeTransactionStatus(
      status
    );


  if (!normalized) {

    return validationFailure(
      "Transaction status is required."
    );

  }


  if (
    !TRANSACTION_STATUSES.includes(
      normalized
    )
  ) {

    return validationFailure(
      "Invalid transaction status."
    );

  }


  return validationSuccess(
    normalized
  );

}


/* =========================================================
   AMOUNT
   ========================================================= */

function normalizeAmount(
  amount
) {

  if (
    typeof amount === "number"
  ) {

    return amount;

  }


  if (
    typeof amount === "string" &&
    amount.trim() !== ""
  ) {

    return Number(
      amount.trim()
    );

  }


  return null;

}


function validateTransactionAmount(
  amount
) {

  const numericAmount =
    normalizeAmount(
      amount
    );


  if (
    numericAmount === null
  ) {

    return validationFailure(
      "Transaction amount is required."
    );

  }


  if (
    !Number.isFinite(
      numericAmount
    )
  ) {

    return validationFailure(
      "Transaction amount must be a valid number."
    );

  }


  if (
    numericAmount <= 0
  ) {

    return validationFailure(
      "Transaction amount must be greater than zero."
    );

  }


  if (
    numericAmount > MAX_AMOUNT
  ) {

    return validationFailure(
      "Transaction amount exceeds the permitted limit."
    );

  }


  /*
   * Currency transactions should not contain more
   * than two decimal places.
   */

  const decimalText =
    String(
      numericAmount
    ).split(".")[1];


  if (
    decimalText &&
    decimalText.length > 2
  ) {

    return validationFailure(
      "Transaction amount cannot contain more than two decimal places."
    );

  }


  const normalized =
    Math.round(
      (
        numericAmount +
        Number.EPSILON
      ) * 100
    ) / 100;


  return validationSuccess(
    normalized
  );

}


/* =========================================================
   CURRENCY
   ========================================================= */

function normalizeCurrency(
  currency
) {

  if (
    typeof currency !== "string"
  ) {

    return null;

  }


  return currency
    .trim()
    .toUpperCase();

}


function validateTransactionCurrency(
  currency
) {

  const normalized =
    normalizeCurrency(
      currency
    );


  if (!normalized) {

    return validationFailure(
      "Currency is required."
    );

  }


  if (
    normalized.length !==
    MAX_CURRENCY_LENGTH
  ) {

    return validationFailure(
      "Currency must contain exactly three letters."
    );

  }


  if (
    !/^[A-Z]{3}$/.test(
      normalized
    )
  ) {

    return validationFailure(
      "Currency must be a valid three-letter currency code."
    );

  }


  return validationSuccess(
    normalized
  );

}


/* =========================================================
   ACCOUNT ID
   ========================================================= */

function validateAccountId(
  accountId
) {

  if (
    typeof accountId !== "string"
  ) {

    return validationFailure(
      "Account ID is required."
    );

  }


  const value =
    accountId.trim();


  /*
   * UUID validation.
   */

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;


  if (
    !uuidPattern.test(
      value
    )
  ) {

    return validationFailure(
      "Account ID is invalid."
    );

  }


  return validationSuccess(
    value
  );

}


/* =========================================================
   ACCOUNT NUMBER
   ========================================================= */

function normalizeAccountNumber(
  accountNumber
) {

  if (
    typeof accountNumber !==
    "string"
  ) {

    return null;

  }


  return accountNumber
    .trim()
    .replace(
      /[\s-]/g,
      ""
    );

}


function validateTransactionAccountNumber(
  accountNumber
) {

  const normalized =
    normalizeAccountNumber(
      accountNumber
    );


  if (!normalized) {

    return validationFailure(
      "Account number is required."
    );

  }


  if (
    normalized.length >
    MAX_ACCOUNT_NUMBER_LENGTH
  ) {

    return validationFailure(
      "Account number is too long."
    );

  }


  if (
    !/^\d{6,34}$/.test(
      normalized
    )
  ) {

    return validationFailure(
      "Account number is invalid."
    );

  }


  return validationSuccess(
    normalized
  );

}


/* =========================================================
   DESCRIPTION
   ========================================================= */

function validateTransactionDescription(
  description
) {

  if (
    description === undefined ||
    description === null ||
    description === ""
  ) {

    return validationSuccess(
      null
    );

  }


  if (
    typeof description !==
    "string"
  ) {

    return validationFailure(
      "Transaction description must be text."
    );

  }


  const normalized =
    description
      .replace(
        /\u0000/g,
        ""
      )
      .trim();


  if (
    normalized.length >
    MAX_DESCRIPTION_LENGTH
  ) {

    return validationFailure(
      "Transaction description is too long."
    );

  }


  return validationSuccess(
    normalized
  );

}


/* =========================================================
   REFERENCE
   ========================================================= */

function validateTransactionReference(
  reference
) {

  if (
    reference === undefined ||
    reference === null ||
    reference === ""
  ) {

    return validationSuccess(
      null
    );

  }


  if (
    typeof reference !==
    "string"
  ) {

    return validationFailure(
      "Transaction reference must be text."
    );

  }


  const normalized =
    reference.trim();


  if (
    normalized.length === 0
  ) {

    return validationSuccess(
      null
    );

  }


  if (
    normalized.length >
    MAX_REFERENCE_LENGTH
  ) {

    return validationFailure(
      "Transaction reference is too long."
    );

  }


  if (
    !/^[A-Za-z0-9._:-]+$/.test(
      normalized
    )
  ) {

    return validationFailure(
      "Transaction reference contains invalid characters."
    );

  }


  return validationSuccess(
    normalized
  );

}


/* =========================================================
   TRANSACTION DATA
   ========================================================= */

/**
 * Validate data required to create a transaction.
 */

function validateTransactionData(
  input
) {

  if (
    !isPlainObject(input)
  ) {

    return validationFailure(
      "Transaction data must be an object."
    );

  }


  const errors = [];


  const type =
    validateTransactionType(
      input.type
    );


  if (!type.valid) {

    errors.push(
      ...type.errors
    );

  }


  const amount =
    validateTransactionAmount(
      input.amount
    );


  if (!amount.valid) {

    errors.push(
      ...amount.errors
    );

  }


  const currency =
    validateTransactionCurrency(
      input.currency
    );


  if (!currency.valid) {

    errors.push(
      ...currency.errors
    );

  }


  let accountId = null;


  if (
    hasOwn(
      input,
      "account_id"
    )
  ) {

    const validation =
      validateAccountId(
        input.account_id
      );


    if (!validation.valid) {

      errors.push(
        ...validation.errors
      );

    } else {

      accountId =
        validation.data;

    }

  }


  let accountNumber = null;


  if (
    hasOwn(
      input,
      "account_number"
    )
  ) {

    const validation =
      validateTransactionAccountNumber(
        input.account_number
      );


    if (!validation.valid) {

      errors.push(
        ...validation.errors
      );

    } else {

      accountNumber =
        validation.data;

    }

  }


  const description =
    validateTransactionDescription(
      input.description
    );


  if (!description.valid) {

    errors.push(
      ...description.errors
    );

  }


  const reference =
    validateTransactionReference(
      input.reference
    );


  if (!reference.valid) {

    errors.push(
      ...reference.errors
    );

  }


  /*
   * At least one account identifier is needed for
   * transaction creation.
   */

  if (
    !accountId &&
    !accountNumber
  ) {

    errors.push(
      "A source account ID or account number is required."
    );

  }


  if (
    errors.length > 0
  ) {

    return validationFailure(
      errors
    );

  }


  return validationSuccess({

    type:
      type.data,

    amount:
      amount.data,

    currency:
      currency.data,

    account_id:
      accountId,

    account_number:
      accountNumber,

    description:
      description.data,

    reference:
      reference.data

  });

}


/* =========================================================
   TRANSFER VALIDATION
   ========================================================= */

/**
 * Transfer-specific validation.
 *
 * A transfer requires a destination account.
 */

function validateTransfer(
  input
) {

  if (
    !isPlainObject(input)
  ) {

    return validationFailure(
      "Transfer data must be an object."
    );

  }


  const errors = [];


  const base =
    validateTransactionData({
      ...input,
      type: "transfer"
    });


  if (!base.valid) {

    errors.push(
      ...base.errors
    );

  }


  let destinationAccountId =
    null;


  if (
    input.destination_account_id
  ) {

    const validation =
      validateAccountId(
        input.destination_account_id
      );


    if (!validation.valid) {

      errors.push(
        ...validation.errors
      );

    } else {

      destinationAccountId =
        validation.data;

    }

  }


  let destinationAccountNumber =
    null;


  if (
    input.destination_account_number
  ) {

    const validation =
      validateTransactionAccountNumber(
        input.destination_account_number
      );


    if (!validation.valid) {

      errors.push(
        ...validation.errors
      );

    } else {

      destinationAccountNumber =
        validation.data;

    }

  }


  if (
    !destinationAccountId &&
    !destinationAccountNumber
  ) {

    errors.push(
      "A destination account is required for transfers."
    );

  }


  /*
   * Prevent the same account from being supplied as
   * both source and destination when both IDs are present.
   */

  if (
    base.valid &&
    destinationAccountId &&
    base.data.account_id &&
    destinationAccountId ===
      base.data.account_id
  ) {

    errors.push(
      "Source and destination accounts cannot be the same."
    );

  }


  if (
    errors.length > 0
  ) {

    return validationFailure(
      errors
    );

  }


  return validationSuccess({

    ...base.data,

    destination_account_id:
      destinationAccountId,

    destination_account_number:
      destinationAccountNumber

  });

}


/* =========================================================
   DEPOSIT VALIDATION
   ========================================================= */

function validateDeposit(
  input
) {

  if (
    !isPlainObject(input)
  ) {

    return validationFailure(
      "Deposit data must be an object."
    );

  }


  return validateTransactionData({
    ...input,
    type: "deposit"
  });

}


/* =========================================================
   WITHDRAWAL VALIDATION
   ========================================================= */

function validateWithdrawal(
  input
) {

  if (
    !isPlainObject(input)
  ) {

    return validationFailure(
      "Withdrawal data must be an object."
    );

  }


  return validateTransactionData({
    ...input,
    type: "withdrawal"
  });

}


/* =========================================================
   PAYMENT VALIDATION
   ========================================================= */

function validatePayment(
  input
) {

  if (
    !isPlainObject(input)
  ) {

    return validationFailure(
      "Payment data must be an object."
    );

  }


  const validation =
    validateTransactionData({
      ...input,
      type: "payment"
    });


  if (
    !validation.valid
  ) {

    return validation;

  }


  /*
   * Optional merchant/reference information.
   */

  if (
    input.merchant
  ) {

    if (
      typeof input.merchant !==
      "string" ||
      input.merchant.trim()
        .length > 200
    ) {

      return validationFailure(
        "Merchant information is invalid."
      );

    }

  }


  return validationSuccess({

    ...validation.data,

    merchant:
      input.merchant
        ? input.merchant
            .trim()
            .slice(
              0,
              200
            )
        : null

  });

}


/* =========================================================
   STATUS TRANSITION VALIDATION
   ========================================================= */

/**
 * Prevent invalid status transitions.
 *
 * Allowed:
 *
 * pending -> completed
 * pending -> failed
 * pending -> cancelled
 *
 * completed/failed/cancelled -> no transition
 */

function validateStatusTransition(
  currentStatus,
  nextStatus
) {

  const current =
    validateTransactionStatus(
      currentStatus
    );


  const next =
    validateTransactionStatus(
      nextStatus
    );


  const errors = [];


  if (!current.valid) {

    errors.push(
      ...current.errors
    );

  }


  if (!next.valid) {

    errors.push(
      ...next.errors
    );

  }


  if (
    errors.length > 0
  ) {

    return validationFailure(
      errors
    );

  }


  const allowedTransitions = {

    pending: [
      "completed",
      "failed",
      "cancelled"
    ],

    completed: [],

    failed: [],

    cancelled: []

  };


  if (
    !allowedTransitions[
      current.data
    ].includes(
      next.data
    )
  ) {

    return validationFailure(
      `Transaction cannot move from "${current.data}" to "${next.data}".`
    );

  }


  return validationSuccess({

    from:
      current.data,

    to:
      next.data

  });

}


/* =========================================================
   QUERY FILTER VALIDATION
   ========================================================= */

function validateTransactionFilters(
  filters = {}
) {

  if (
    !isPlainObject(
      filters
    )
  ) {

    return validationFailure(
      "Transaction filters must be an object."
    );

  }


  const errors = [];

  const resultData = {};


  if (
    filters.type
  ) {

    const validation =
      validateTransactionType(
        filters.type
      );


    if (!validation.valid) {

      errors.push(
        ...validation.errors
      );

    } else {

      resultData.type =
        validation.data;

    }

  }


  if (
    filters.status
  ) {

    const validation =
      validateTransactionStatus(
        filters.status
      );


    if (!validation.valid) {

      errors.push(
        ...validation.errors
      );

    } else {

      resultData.status =
        validation.data;

    }

  }


  if (
    filters.currency
  ) {

    const validation =
      validateTransactionCurrency(
        filters.currency
      );


    if (!validation.valid) {

      errors.push(
        ...validation.errors
      );

    } else {

      resultData.currency =
        validation.data;

    }

  }


  if (
    filters.account_id
  ) {

    const validation =
      validateAccountId(
        filters.account_id
      );


    if (!validation.valid) {

      errors.push(
        ...validation.errors
      );

    } else {

      resultData.account_id =
        validation.data;

    }

  }


  if (
    filters.page !== undefined
  ) {

    const page =
      Number(
        filters.page
      );


    if (
      !Number.isInteger(page) ||
      page < 1
    ) {

      errors.push(
        "Page must be a positive integer."
      );

    } else {

      resultData.page =
        page;

    }

  }


  if (
    filters.page_size !== undefined
  ) {

    const pageSize =
      Number(
        filters.page_size
      );


    if (
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 100
    ) {

      errors.push(
        "Page size must be between 1 and 100."
      );

    } else {

      resultData.page_size =
        pageSize;

    }

  }


  if (
    errors.length > 0
  ) {

    return validationFailure(
      errors
    );

  }


  return validationSuccess(
    resultData
  );

}


/* =========================================================
   TRANSACTION ID VALIDATION
   ========================================================= */

function validateTransactionId(
  transactionId
) {

  if (
    typeof transactionId !==
    "string"
  ) {

    return validationFailure(
      "Transaction ID is required."
    );

  }


  const value =
    transactionId.trim();


  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;


  if (
    !uuidPattern.test(
      value
    )
  ) {

    return validationFailure(
      "Transaction ID is invalid."
    );

  }


  return validationSuccess(
    value
  );

}


/* =========================================================
   VALIDATE COMPLETE TRANSACTION REQUEST
   ========================================================= */

function validateCreateTransactionRequest(
  input
) {

  if (
    !isPlainObject(input)
  ) {

    return validationFailure(
      "Request body must be an object."
    );

  }


  switch (
    normalizeTransactionType(
      input.type
    )
  ) {

    case "deposit":

      return validateDeposit(
        input
      );


    case "withdrawal":

      return validateWithdrawal(
        input
      );


    case "transfer":

      return validateTransfer(
        input
      );


    case "payment":

      return validatePayment(
        input
      );


    default:

      return validationFailure(
        "A valid transaction type is required."
      );

  }

}


/* =========================================================
   EXPRESS MIDDLEWARE
   ========================================================= */

function validateTransactionRequest(
  req,
  res,
  next
) {

  const validation =
    validateCreateTransactionRequest(
      req.body || {}
    );


  if (
    !validation.valid
  ) {

    return res
      .status(400)
      .json({

        success:
          false,

        message:
          "Transaction validation failed.",

        errors:
          validation.errors,

        request_id:
          req.requestId ||
          null

      });

  }


  /*
   * Store normalized transaction data separately.
   * This prevents accidental mutation of req.body.
   */

  req.validatedTransaction =
    validation.data;


  return next();

}


/* =========================================================
   EXPRESS FILTER MIDDLEWARE
   ========================================================= */

function validateTransactionFilterRequest(
  req,
  res,
  next
) {

  const validation =
    validateTransactionFilters(
      req.query || {}
    );


  if (
    !validation.valid
  ) {

    return res
      .status(400)
      .json({

        success:
          false,

        message:
          "Invalid transaction filters.",

        errors:
          validation.errors,

        request_id:
          req.requestId ||
          null

      });

  }


  req.validatedTransactionFilters =
    validation.data;


  return next();

}


/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {

  TRANSACTION_TYPES,

  TRANSACTION_STATUSES,

  MAX_AMOUNT,

  MAX_DESCRIPTION_LENGTH,

  MAX_REFERENCE_LENGTH,

  MAX_CURRENCY_LENGTH,

  MAX_ACCOUNT_NUMBER_LENGTH,

  validationSuccess,

  validationFailure,

  normalizeTransactionType,

  validateTransactionType,

  normalizeTransactionStatus,

  validateTransactionStatus,

  normalizeAmount,

  validateTransactionAmount,

  normalizeCurrency,

  validateTransactionCurrency,

  validateAccountId,

  normalizeAccountNumber,

  validateTransactionAccountNumber,

  validateTransactionDescription,

  validateTransactionReference,

  validateTransactionData,

  validateTransfer,

  validateDeposit,

  validateWithdrawal,

  validatePayment,

  validateStatusTransition,

  validateTransactionFilters,

  validateTransactionId,

  validateCreateTransactionRequest,

  validateTransactionRequest,

  validateTransactionFilterRequest

};