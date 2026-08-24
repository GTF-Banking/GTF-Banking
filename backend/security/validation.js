/**
 * GTF-Banking
 * backend/security/validation.js
 *
 * Request validation utilities.
 *
 * This file validates incoming API data before it reaches
 * business logic or database operations.
 *
 * Authentication:
 *   backend/authentication/
 *
 * Application security:
 *   backend/security/app.js
 *
 * Security utilities:
 *   backend/security/security.js
 */

"use strict";


/* =========================================================
   CONSTANTS
   ========================================================= */

const LIMITS = Object.freeze({

  name: 150,

  email: 254,

  phone: 40,

  password: 128,

  address: 300,

  description: 2000,

  reference: 100,

  accountNumber: 34,

  currency: 3,

  transactionType: 30,

  role: 30,

  page: 1000000,

  pageSize: 100

});


const ROLES = Object.freeze([
  "customer",
  "manager",
  "admin"
]);


const TRANSACTION_TYPES =
  Object.freeze([
    "deposit",
    "withdrawal",
    "transfer",
    "payment"
  ]);


const TRANSACTION_STATUSES =
  Object.freeze([
    "pending",
    "completed",
    "failed",
    "cancelled"
  ]);


/* =========================================================
   BASIC HELPERS
   ========================================================= */

function isObject(
  value
) {

  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );

}


function isNonEmptyString(
  value,
  maxLength
) {

  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= maxLength
  );

}


function cleanString(
  value,
  maxLength
) {

  if (
    typeof value !== "string"
  ) {

    return null;

  }


  return value
    .replace(
      /\u0000/g,
      ""
    )
    .trim()
    .slice(
      0,
      maxLength
    );

}


function isInteger(
  value
) {

  return Number.isInteger(
    value
  );

}


function isPositiveInteger(
  value
) {

  return (
    Number.isInteger(value) &&
    value > 0
  );

}


/* =========================================================
   VALIDATION RESULT
   ========================================================= */

function result(
  errors = [],
  data = null
) {

  return {

    valid:
      errors.length === 0,

    errors,

    data

  };

}


/* =========================================================
   EMAIL
   ========================================================= */

function normalizeEmail(
  email
) {

  if (
    typeof email !== "string"
  ) {

    return null;

  }


  const value =
    email
      .trim()
      .toLowerCase();


  if (
    value.length >
    LIMITS.email
  ) {

    return null;

  }


  return value;

}


function validateEmail(
  email
) {

  const normalized =
    normalizeEmail(
      email
    );


  if (!normalized) {

    return result([
      "Email address is required."
    ]);

  }


  const pattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


  if (
    !pattern.test(
      normalized
    )
  ) {

    return result([
      "Please provide a valid email address."
    ]);

  }


  return result(
    [],
    normalized
  );

}


/* =========================================================
   PASSWORD
   ========================================================= */

function validatePassword(
  password
) {

  const errors = [];


  if (
    typeof password !== "string"
  ) {

    return result([
      "Password is required."
    ]);

  }


  if (
    password.length <
    8
  ) {

    errors.push(
      "Password must contain at least 8 characters."
    );

  }


  if (
    password.length >
    LIMITS.password
  ) {

    errors.push(
      "Password must not exceed 128 characters."
    );

  }


  if (
    !/[A-Z]/.test(
      password
    )
  ) {

    errors.push(
      "Password must contain at least one uppercase letter."
    );

  }


  if (
    !/[a-z]/.test(
      password
    )
  ) {

    errors.push(
      "Password must contain at least one lowercase letter."
    );

  }


  if (
    !/[0-9]/.test(
      password
    )
  ) {

    errors.push(
      "Password must contain at least one number."
    );

  }


  return result(
    errors
  );

}


/* =========================================================
   PASSWORD CONFIRMATION
   ========================================================= */

function validatePasswordConfirmation(
  password,
  confirmation
) {

  if (
    typeof confirmation !==
    "string"
  ) {

    return result([
      "Password confirmation is required."
    ]);

  }


  if (
    password !==
    confirmation
  ) {

    return result([
      "Passwords do not match."
    ]);

  }


  return result();

}


/* =========================================================
   NAME
   ========================================================= */

function validateName(
  name,
  fieldName = "Name"
) {

  const value =
    cleanString(
      name,
      LIMITS.name
    );


  if (!value) {

    return result([
      `${fieldName} is required.`
    ]);

  }


  if (
    value.length < 2
  ) {

    return result([
      `${fieldName} must contain at least 2 characters.`
    ]);

  }


  return result(
    [],
    value
  );

}


/* =========================================================
   PHONE
   ========================================================= */

function normalizePhone(
  phone
) {

  if (
    typeof phone !== "string"
  ) {

    return null;

  }


  const value =
    phone
      .trim()
      .replace(
        /[^\d+().\-\s]/g,
        ""
      );


  if (
    value.length >
    LIMITS.phone
  ) {

    return null;

  }


  return value;

}


function validatePhone(
  phone
) {

  const normalized =
    normalizePhone(
      phone
    );


  if (!normalized) {

    return result([
      "Phone number is required."
    ]);

  }


  const digits =
    normalized.replace(
      /\D/g,
      ""
    );


  if (
    digits.length < 7 ||
    digits.length > 15
  ) {

    return result([
      "Please provide a valid phone number."
    ]);

  }


  return result(
    [],
    normalized
  );

}


/* =========================================================
   UUID
   ========================================================= */

function validateUUID(
  value,
  fieldName = "ID"
) {

  if (
    typeof value !== "string"
  ) {

    return result([
      `${fieldName} is required.`
    ]);

  }


  const pattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;


  if (
    !pattern.test(
      value.trim()
    )
  ) {

    return result([
      `${fieldName} is invalid.`
    ]);

  }


  return result(
    [],
    value.trim()
  );

}


/* =========================================================
   ACCOUNT NUMBER
   ========================================================= */

function validateAccountNumber(
  accountNumber
) {

  if (
    typeof accountNumber !==
    "string"
  ) {

    return result([
      "Account number is required."
    ]);

  }


  const value =
    accountNumber
      .trim()
      .replace(
        /[\s-]/g,
        ""
      );


  if (
    !/^\d{6,34}$/.test(
      value
    )
  ) {

    return result([
      "Account number is invalid."
    ]);

  }


  return result(
    [],
    value
  );

}


/* =========================================================
   CURRENCY
   ========================================================= */

function validateCurrency(
  currency
) {

  if (
    typeof currency !==
    "string"
  ) {

    return result([
      "Currency is required."
    ]);

  }


  const value =
    currency
      .trim()
      .toUpperCase();


  if (
    !/^[A-Z]{3}$/.test(
      value
    )
  ) {

    return result([
      "Currency must be a valid three-letter currency code."
    ]);

  }


  return result(
    [],
    value
  );

}


/* =========================================================
   AMOUNT
   ========================================================= */

function validateAmount(
  amount
) {

  let numericAmount;


  if (
    typeof amount === "number"
  ) {

    numericAmount =
      amount;

  } else if (
    typeof amount === "string" &&
    amount.trim() !== ""
  ) {

    numericAmount =
      Number(
        amount
      );

  } else {

    return result([
      "Transaction amount is required."
    ]);

  }


  if (
    !Number.isFinite(
      numericAmount
    )
  ) {

    return result([
      "Transaction amount must be a valid number."
    ]);

  }


  if (
    numericAmount <= 0
  ) {

    return result([
      "Transaction amount must be greater than zero."
    ]);

  }


  /*
   * Prevent excessive currency precision.
   */

  const decimalPart =
    String(
      numericAmount
    ).split(".")[1];


  if (
    decimalPart &&
    decimalPart.length > 2
  ) {

    return result([
      "Transaction amount cannot contain more than two decimal places."
    ]);

  }


  return result(
    [],
    Math.round(
      (
        numericAmount +
        Number.EPSILON
      ) * 100
    ) / 100
  );

}


/* =========================================================
   ROLE
   ========================================================= */

function validateRole(
  role
) {

  if (
    typeof role !== "string"
  ) {

    return result([
      "Role is required."
    ]);

  }


  const normalized =
    role
      .trim()
      .toLowerCase();


  if (
    !ROLES.includes(
      normalized
    )
  ) {

    return result([
      "Invalid user role."
    ]);

  }


  return result(
    [],
    normalized
  );

}


/* =========================================================
   TRANSACTION TYPE
   ========================================================= */

function validateTransactionType(
  type
) {

  if (
    typeof type !== "string"
  ) {

    return result([
      "Transaction type is required."
    ]);

  }


  const normalized =
    type
      .trim()
      .toLowerCase();


  if (
    !TRANSACTION_TYPES.includes(
      normalized
    )
  ) {

    return result([
      "Invalid transaction type."
    ]);

  }


  return result(
    [],
    normalized
  );

}


/* =========================================================
   TRANSACTION STATUS
   ========================================================= */

function validateTransactionStatus(
  status
) {

  if (
    typeof status !== "string"
  ) {

    return result([
      "Transaction status is invalid."
    ]);

  }


  const normalized =
    status
      .trim()
      .toLowerCase();


  if (
    !TRANSACTION_STATUSES.includes(
      normalized
    )
  ) {

    return result([
      "Invalid transaction status."
    ]);

  }


  return result(
    [],
    normalized
  );

}


/* =========================================================
   REFERENCE
   ========================================================= */

function validateReference(
  reference
) {

  if (
    typeof reference !==
    "string"
  ) {

    return result([
      "Reference is required."
    ]);

  }


  const value =
    reference.trim();


  if (
    value.length === 0 ||
    value.length >
      LIMITS.reference
  ) {

    return result([
      "Transaction reference is invalid."
    ]);

  }


  /*
   * Restrict references to predictable characters.
   */

  if (
    !/^[A-Za-z0-9._:-]+$/.test(
      value
    )
  ) {

    return result([
      "Transaction reference contains invalid characters."
    ]);

  }


  return result(
    [],
    value
  );

}


/* =========================================================
   DESCRIPTION
   ========================================================= */

function validateDescription(
  description
) {

  if (
    description === undefined ||
    description === null
  ) {

    return result(
      [],
      null
    );

  }


  if (
    typeof description !==
    "string"
  ) {

    return result([
      "Description must be text."
    ]);

  }


  const value =
    cleanString(
      description,
      LIMITS.description
    );


  return result(
    [],
    value
  );

}


/* =========================================================
   PAGINATION
   ========================================================= */

function validatePagination(
  query = {}
) {

  const errors = [];


  let page =
    query.page === undefined
      ? 1
      : Number(
          query.page
        );


  let pageSize =
    query.page_size === undefined
      ? 20
      : Number(
          query.page_size
        );


  if (
    !Number.isInteger(page) ||
    page < 1 ||
    page > LIMITS.page
  ) {

    errors.push(
      "Page must be a positive integer."
    );

  }


  if (
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > LIMITS.pageSize
  ) {

    errors.push(
      `Page size must be between 1 and ${LIMITS.pageSize}.`
    );

  }


  return result(
    errors,
    errors.length === 0
      ? {
          page,
          pageSize
        }
      : null
  );

}


/* =========================================================
   SIGNUP REQUEST
   ========================================================= */

function validateSignup(
  body = {}
) {

  if (
    !isObject(body)
  ) {

    return result([
      "Request body must be an object."
    ]);

  }


  const errors = [];


  const email =
    validateEmail(
      body.email
    );


  if (!email.valid) {

    errors.push(
      ...email.errors
    );

  }


  const password =
    validatePassword(
      body.password
    );


  if (!password.valid) {

    errors.push(
      ...password.errors
    );

  }


  if (
    body.password_confirmation !==
    undefined
  ) {

    const confirmation =
      validatePasswordConfirmation(
        body.password,
        body.password_confirmation
      );


    if (
      !confirmation.valid
    ) {

      errors.push(
        ...confirmation.errors
      );

    }

  }


  if (
    body.full_name !==
    undefined
  ) {

    const name =
      validateName(
        body.full_name,
        "Full name"
      );


    if (!name.valid) {

      errors.push(
        ...name.errors
      );

    }

  }


  if (
    body.phone !==
    undefined
  ) {

    const phone =
      validatePhone(
        body.phone
      );


    if (!phone.valid) {

      errors.push(
        ...phone.errors
      );

    }

  }


  return result(
    errors,
    errors.length === 0
      ? {
          email:
            email.data,

          full_name:
            body.full_name
              ? cleanString(
                  body.full_name,
                  LIMITS.name
                )
              : null,

          phone:
            body.phone
              ? normalizePhone(
                  body.phone
                )
              : null
        }
      : null
  );

}


/* =========================================================
   LOGIN REQUEST
   ========================================================= */

function validateLogin(
  body = {}
) {

  if (
    !isObject(body)
  ) {

    return result([
      "Request body must be an object."
    ]);

  }


  const errors = [];


  const email =
    validateEmail(
      body.email
    );


  if (!email.valid) {

    errors.push(
      ...email.errors
    );

  }


  if (
    typeof body.password !==
    "string" ||
    body.password.length === 0
  ) {

    errors.push(
      "Password is required."
    );

  }


  return result(
    errors,
    errors.length === 0
      ? {
          email:
            email.data
        }
      : null
  );

}


/* =========================================================
   TRANSACTION REQUEST
   ========================================================= */

function validateTransaction(
  body = {}
) {

  if (
    !isObject(body)
  ) {

    return result([
      "Request body must be an object."
    ]);

  }


  const errors = [];


  const type =
    validateTransactionType(
      body.type
    );


  if (!type.valid) {

    errors.push(
      ...type.errors
    );

  }


  const amount =
    validateAmount(
      body.amount
    );


  if (!amount.valid) {

    errors.push(
      ...amount.errors
    );

  }


  const currency =
    validateCurrency(
      body.currency
    );


  if (!currency.valid) {

    errors.push(
      ...currency.errors
    );

  }


  if (
    body.reference !==
    undefined
  ) {

    const reference =
      validateReference(
        body.reference
      );


    if (
      !reference.valid
    ) {

      errors.push(
        ...reference.errors
      );

    }

  }


  if (
    body.description !==
    undefined
  ) {

    const description =
      validateDescription(
        body.description
      );


    if (
      !description.valid
    ) {

      errors.push(
        ...description.errors
      );

    }

  }


  return result(
    errors,
    errors.length === 0
      ? {
          type:
            type.data,

          amount:
            amount.data,

          currency:
            currency.data,

          reference:
            body.reference
              ? cleanString(
                  body.reference,
                  LIMITS.reference
                )
              : null,

          description:
            body.description
              ? cleanString(
                  body.description,
                  LIMITS.description
                )
              : null
        }
      : null
  );

}


/* =========================================================
   UPDATE PROFILE
   ========================================================= */

function validateProfileUpdate(
  body = {}
) {

  if (
    !isObject(body)
  ) {

    return result([
      "Request body must be an object."
    ]);

  }


  const errors = [];


  if (
    body.full_name !==
    undefined
  ) {

    const name =
      validateName(
        body.full_name,
        "Full name"
      );


    if (!name.valid) {

      errors.push(
        ...name.errors
      );

    }

  }


  if (
    body.phone !==
    undefined
  ) {

    const phone =
      validatePhone(
        body.phone
      );


    if (!phone.valid) {

      errors.push(
        ...phone.errors
      );

    }

  }


  if (
    body.address !==
    undefined
  ) {

    if (
      !isNonEmptyString(
        body.address,
        LIMITS.address
      )
    ) {

      errors.push(
        "Address is invalid."
      );

    }

  }


  return result(
    errors
  );

}


/* =========================================================
   VALIDATION MIDDLEWARE FACTORY
   ========================================================= */

/**
 * Usage:
 *
 * router.post(
 *   "/signup",
 *   validateBody(validateSignup),
 *   handler
 * );
 */

function validateBody(
  validator
) {

  return function (
    req,
    res,
    next
  ) {

    try {

      const validation =
        validator(
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
              "Validation failed.",

            errors:
              validation.errors,

            request_id:
              req.requestId ||
              null

          });

      }


      /*
       * If the validator produced normalized data,
       * expose it as req.validatedBody.
       */

      req.validatedBody =
        validation.data ||
        req.body;


      return next();

    } catch (error) {

      console.error(
        "Validation middleware error:",
        error.message
      );


      return res
        .status(400)
        .json({

          success:
            false,

          message:
            "Invalid request data.",

          request_id:
            req.requestId ||
            null

        });

    }

  };

}


/* =========================================================
   VALIDATION MIDDLEWARE
   ========================================================= */

const validateSignupRequest =
  validateBody(
    validateSignup
  );


const validateLoginRequest =
  validateBody(
    validateLogin
  );


const validateTransactionRequest =
  validateBody(
    validateTransaction
  );


const validateProfileUpdateRequest =
  validateBody(
    validateProfileUpdate
  );


/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {

  LIMITS,

  ROLES,

  TRANSACTION_TYPES,

  TRANSACTION_STATUSES,

  isObject,

  isNonEmptyString,

  cleanString,

  isInteger,

  isPositiveInteger,

  result,

  normalizeEmail,

  validateEmail,

  validatePassword,

  validatePasswordConfirmation,

  validateName,

  normalizePhone,

  validatePhone,

  validateUUID,

  validateAccountNumber,

  validateCurrency,

  validateAmount,

  validateRole,

  validateTransactionType,

  validateTransactionStatus,

  validateReference,

  validateDescription,

  validatePagination,

  validateSignup,

  validateLogin,

  validateTransaction,

  validateProfileUpdate,

  validateBody,

  validateSignupRequest,

  validateLoginRequest,

  validateTransactionRequest,

  validateProfileUpdateRequest

};