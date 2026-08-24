/**
 * GTF-Banking
 * backend/security/security.js
 *
 * Security utilities for the backend.
 *
 * Responsibilities:
 * - Secure random values
 * - Request-safe identifiers
 * - Input validation helpers
 * - Password policy validation
 * - Email validation
 * - Transaction/reference validation
 * - Sensitive-field filtering
 * - Constant-time string comparison
 *
 * Application-wide Express security such as CORS,
 * security headers, and rate limiting belongs in:
 *
 * backend/security/app.js
 *
 * Authentication belongs in:
 *
 * backend/authentication/
 */

"use strict";

const crypto = require("crypto");


/* =========================================================
   CONSTANTS
   ========================================================= */

const MAX_TEXT_LENGTH = 1000;

const MAX_NAME_LENGTH = 150;

const MAX_EMAIL_LENGTH = 254;

const MAX_PHONE_LENGTH = 40;

const MAX_REFERENCE_LENGTH = 100;


/* =========================================================
   SAFE STRING
   ========================================================= */

/**
 * Convert a value to a safe trimmed string.
 *
 * This is NOT an HTML sanitizer.
 * Database queries should still use parameterized
 * Supabase queries.
 */

function cleanString(
  value,
  maxLength = MAX_TEXT_LENGTH
) {

  if (
    value === undefined ||
    value === null
  ) {

    return null;

  }


  if (
    typeof value !== "string"
  ) {

    return null;

  }


  return value
    .replace(/\u0000/g, "")
    .trim()
    .slice(
      0,
      maxLength
    );

}


/* =========================================================
   EMAIL VALIDATION
   ========================================================= */

function normalizeEmail(
  email
) {

  const value =
    cleanString(
      email,
      MAX_EMAIL_LENGTH
    );


  if (!value) {
    return null;
  }


  return value.toLowerCase();

}


function isValidEmail(
  email
) {

  const normalized =
    normalizeEmail(
      email
    );


  if (!normalized) {
    return false;
  }


  /*
   * Practical email validation.
   *
   * Supabase Auth remains responsible for the actual
   * account/email authentication workflow.
   */

  const emailPattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


  return emailPattern.test(
    normalized
  );

}


/* =========================================================
   PASSWORD POLICY
   ========================================================= */

/**
 * Validates password strength without storing or logging
 * the password.
 *
 * This does not replace Supabase Auth password policies.
 */

function validatePassword(
  password
) {

  if (
    typeof password !== "string"
  ) {

    return {
      valid: false,
      errors: [
        "Password is required."
      ]
    };

  }


  const errors = [];


  if (
    password.length < 8
  ) {

    errors.push(
      "Password must contain at least 8 characters."
    );

  }


  if (
    password.length > 128
  ) {

    errors.push(
      "Password must not exceed 128 characters."
    );

  }


  if (
    !/[A-Z]/.test(password)
  ) {

    errors.push(
      "Password must contain at least one uppercase letter."
    );

  }


  if (
    !/[a-z]/.test(password)
  ) {

    errors.push(
      "Password must contain at least one lowercase letter."
    );

  }


  if (
    !/[0-9]/.test(password)
  ) {

    errors.push(
      "Password must contain at least one number."
    );

  }


  return {
    valid:
      errors.length === 0,

    errors
  };

}


/* =========================================================
   PHONE VALIDATION
   ========================================================= */

function normalizePhone(
  phone
) {

  const value =
    cleanString(
      phone,
      MAX_PHONE_LENGTH
    );


  if (!value) {
    return null;
  }


  return value.replace(
    /[^\d+().\-\s]/g,
    ""
  );

}


function isValidPhone(
  phone
) {

  const normalized =
    normalizePhone(
      phone
    );


  if (!normalized) {
    return false;
  }


  const digits =
    normalized.replace(
      /\D/g,
      ""
    );


  return (
    digits.length >= 7 &&
    digits.length <= 15
  );

}


/* =========================================================
   NAME VALIDATION
   ========================================================= */

function normalizeName(
  name
) {

  return cleanString(
    name,
    MAX_NAME_LENGTH
  );

}


function isValidName(
  name
) {

  const normalized =
    normalizeName(
      name
    );


  if (!normalized) {
    return false;
  }


  return (
    normalized.length >= 2
  );

}


/* =========================================================
   AMOUNT VALIDATION
   ========================================================= */

/**
 * Validate a normal currency amount.
 *
 * Returns a rounded numeric value or null.
 */

function parseAmount(
  value
) {

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {

    return null;

  }


  /*
   * Avoid accepting arrays, objects, NaN, Infinity,
   * or arbitrary strings.
   */

  const amount =
    typeof value === "number"
      ? value
      : Number(value);


  if (
    !Number.isFinite(amount)
  ) {

    return null;

  }


  if (
    amount <= 0
  ) {

    return null;

  }


  /*
   * Normal currency precision.
   */

  const rounded =
    Math.round(
      (amount + Number.EPSILON) *
      100
    ) / 100;


  if (
    rounded <= 0
  ) {

    return null;

  }


  return rounded;

}


/* =========================================================
   CURRENCY VALIDATION
   ========================================================= */

function normalizeCurrency(
  currency
) {

  const value =
    cleanString(
      currency,
      10
    );


  if (!value) {
    return null;
  }


  return value.toUpperCase();

}


function isValidCurrency(
  currency
) {

  const normalized =
    normalizeCurrency(
      currency
    );


  if (!normalized) {
    return false;
  }


  /*
   * ISO-style three-letter currency code.
   */

  return /^[A-Z]{3}$/.test(
    normalized
  );

}


/* =========================================================
   TRANSACTION REFERENCE
   ========================================================= */

function generateReference(
  prefix = "GTF"
) {

  const safePrefix =
    String(prefix)
      .replace(
        /[^A-Z0-9]/gi,
        ""
      )
      .toUpperCase()
      .slice(
        0,
        10
      ) || "GTF";


  const timestamp =
    Date.now()
      .toString(36)
      .toUpperCase();


  const random =
    crypto
      .randomBytes(5)
      .toString("hex")
      .toUpperCase();


  return `${safePrefix}-${timestamp}-${random}`;

}


/* =========================================================
   SECURE RANDOM TOKEN
   ========================================================= */

function generateSecureToken(
  bytes = 32
) {

  let size =
    Number(bytes);


  if (
    !Number.isInteger(size) ||
    size < 16
  ) {

    size = 32;

  }


  if (
    size > 128
  ) {

    size = 128;

  }


  return crypto
    .randomBytes(size)
    .toString("hex");

}


/* =========================================================
   SECURE RANDOM CODE
   ========================================================= */

function generateNumericCode(
  length = 6
) {

  let size =
    Number(length);


  if (
    !Number.isInteger(size) ||
    size < 4
  ) {

    size = 6;

  }


  if (
    size > 12
  ) {

    size = 12;

  }


  let code = "";


  for (
    let i = 0;
    i < size;
    i++
  ) {

    code += crypto
      .randomInt(
        0,
        10
      )
      .toString();

  }


  return code;

}


/* =========================================================
   REQUEST ID
   ========================================================= */

function generateRequestId() {

  return crypto.randomUUID();

}


/* =========================================================
   ACCOUNT NUMBER VALIDATION
   ========================================================= */

function normalizeAccountNumber(
  accountNumber
) {

  const value =
    cleanString(
      accountNumber,
      34
    );


  if (!value) {
    return null;
  }


  /*
   * Remove spaces and common separators.
   */

  return value.replace(
    /[\s-]/g,
    ""
  );

}


function isValidAccountNumber(
  accountNumber
) {

  const normalized =
    normalizeAccountNumber(
      accountNumber
    );


  if (!normalized) {
    return false;
  }


  /*
   * This validates a generic numeric account identifier.
   * Actual account-number rules should be determined by
   * your database/business requirements.
   */

  return /^\d{6,34}$/.test(
    normalized
  );

}


/* =========================================================
   UUID VALIDATION
   ========================================================= */

function isValidUUID(
  value
) {

  if (
    typeof value !== "string"
  ) {

    return false;

  }


  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(value.trim());

}


/* =========================================================
   ROLE VALIDATION
   ========================================================= */

const VALID_ROLES =
  Object.freeze([
    "customer",
    "manager",
    "admin"
  ]);


function isValidRole(
  role
) {

  if (
    typeof role !== "string"
  ) {

    return false;

  }


  return VALID_ROLES.includes(
    role
      .trim()
      .toLowerCase()
  );

}


/* =========================================================
   TRANSACTION TYPE
   ========================================================= */

const VALID_TRANSACTION_TYPES =
  Object.freeze([
    "deposit",
    "withdrawal",
    "transfer",
    "payment"
  ]);


function isValidTransactionType(
  type
) {

  if (
    typeof type !== "string"
  ) {

    return false;

  }


  return VALID_TRANSACTION_TYPES.includes(
    type
      .trim()
      .toLowerCase()
  );

}


/* =========================================================
   TRANSACTION STATUS
   ========================================================= */

const VALID_TRANSACTION_STATUSES =
  Object.freeze([
    "pending",
    "completed",
    "failed",
    "cancelled"
  ]);


function isValidTransactionStatus(
  status
) {

  if (
    typeof status !== "string"
  ) {

    return false;

  }


  return VALID_TRANSACTION_STATUSES.includes(
    status
      .trim()
      .toLowerCase()
  );

}


/* =========================================================
   SENSITIVE FIELD FILTER
   ========================================================= */

const SENSITIVE_FIELDS =
  Object.freeze([

    "password",

    "password_confirmation",

    "current_password",

    "new_password",

    "access_token",

    "refresh_token",

    "token",

    "authorization",

    "api_key",

    "apikey",

    "secret",

    "service_role_key",

    "supabase_service_role_key",

    "credit_card_number",

    "card_number",

    "cvv",

    "cvc",

    "pin"

  ]);


/**
 * Removes sensitive properties from an object.
 *
 * This should be used before logging or returning debug
 * information.
 */

function removeSensitiveFields(
  input
) {

  if (
    Array.isArray(input)
  ) {

    return input.map(
      removeSensitiveFields
    );

  }


  if (
    !input ||
    typeof input !== "object"
  ) {

    return input;

  }


  const output = {};


  for (
    const [key, value]
    of Object.entries(input)
  ) {

    const normalizedKey =
      key
        .toLowerCase()
        .replace(
          /[-\s]/g,
          "_"
        );


    if (
      SENSITIVE_FIELDS.includes(
        normalizedKey
      )
    ) {

      output[key] =
        "[REDACTED]";

      continue;

    }


    if (
      value &&
      typeof value === "object"
    ) {

      output[key] =
        removeSensitiveFields(
          value
        );

    } else {

      output[key] =
        value;

    }

  }


  return output;

}


/* =========================================================
   CONSTANT-TIME COMPARISON
   ========================================================= */

/**
 * Compare two strings without using a normal ===
 * comparison.
 *
 * Useful for security-sensitive comparisons.
 */

function safeCompare(
  first,
  second
) {

  if (
    typeof first !== "string" ||
    typeof second !== "string"
  ) {

    return false;

  }


  const firstBuffer =
    Buffer.from(
      first
    );


  const secondBuffer =
    Buffer.from(
      second
    );


  if (
    firstBuffer.length !==
    secondBuffer.length
  ) {

    return false;

  }


  return crypto.timingSafeEqual(
    firstBuffer,
    secondBuffer
  );

}


/* =========================================================
   IP ADDRESS HELPER
   ========================================================= */

function getClientIP(
  req
) {

  if (!req) {
    return null;
  }


  return (
    req.ip ||
    req.socket?.remoteAddress ||
    null
  );

}


/* =========================================================
   SECURITY-SAFE REQUEST SUMMARY
   ========================================================= */

function getSafeRequestSummary(
  req
) {

  if (!req) {
    return null;
  }


  return {

    request_id:
      req.requestId || null,

    method:
      req.method || null,

    path:
      req.originalUrl || null,

    ip:
      getClientIP(req),

    authenticated:
      Boolean(
        req.user
      ),

    user_id:
      req.user?.id || null,

    role:
      req.userRole || null,

    user_agent:
      req.get
        ? req.get(
            "user-agent"
          )
        : null

  };

}


/* =========================================================
   SECURITY ERROR
   ========================================================= */

function createSecurityError(
  message,
  statusCode = 400,
  code = "SECURITY_ERROR"
) {

  const error =
    new Error(
      message
    );


  error.statusCode =
    statusCode;


  error.code =
    code;


  return error;

}


/* =========================================================
   VALIDATION RESULT
   ========================================================= */

function validationResult(
  valid,
  errors = []
) {

  return {

    valid:
      Boolean(valid),

    errors:
      Array.isArray(errors)
        ? errors
        : []

  };

}


/* =========================================================
   VALIDATE COMMON USER DATA
   ========================================================= */

function validateUserData(
  data = {}
) {

  const errors = [];


  if (
    data.email !== undefined &&
    !isValidEmail(
      data.email
    )
  ) {

    errors.push(
      "A valid email address is required."
    );

  }


  if (
    data.full_name !== undefined &&
    !isValidName(
      data.full_name
    )
  ) {

    errors.push(
      "A valid full name is required."
    );

  }


  if (
    data.phone !== undefined &&
    !isValidPhone(
      data.phone
    )
  ) {

    errors.push(
      "A valid phone number is required."
    );

  }


  return validationResult(
    errors.length === 0,
    errors
  );

}


/* =========================================================
   VALIDATE TRANSACTION DATA
   ========================================================= */

function validateTransactionData(
  data = {}
) {

  const errors = [];


  if (
    !isValidTransactionType(
      data.type
    )
  ) {

    errors.push(
      "Invalid transaction type."
    );

  }


  if (
    parseAmount(
      data.amount
    ) === null
  ) {

    errors.push(
      "A valid amount greater than zero is required."
    );

  }


  if (
    data.currency !== undefined &&
    !isValidCurrency(
      data.currency
    )
  ) {

    errors.push(
      "A valid three-letter currency code is required."
    );

  }


  return validationResult(
    errors.length === 0,
    errors
  );

}


/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {

  MAX_TEXT_LENGTH,

  MAX_NAME_LENGTH,

  MAX_EMAIL_LENGTH,

  MAX_PHONE_LENGTH,

  MAX_REFERENCE_LENGTH,

  VALID_ROLES,

  VALID_TRANSACTION_TYPES,

  VALID_TRANSACTION_STATUSES,

  cleanString,

  normalizeEmail,

  isValidEmail,

  validatePassword,

  normalizePhone,

  isValidPhone,

  normalizeName,

  isValidName,

  parseAmount,

  normalizeCurrency,

  isValidCurrency,

  generateReference,

  generateSecureToken,

  generateNumericCode,

  generateRequestId,

  normalizeAccountNumber,

  isValidAccountNumber,

  isValidUUID,

  isValidRole,

  isValidTransactionType,

  isValidTransactionStatus,

  removeSensitiveFields,

  safeCompare,

  getClientIP,

  getSafeRequestSummary,

  createSecurityError,

  validationResult,

  validateUserData,

  validateTransactionData

};