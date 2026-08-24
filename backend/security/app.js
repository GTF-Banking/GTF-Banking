/**
 * GTF-Banking
 * backend/security/app.js
 *
 * Application-level security utilities.
 *
 * Responsibilities:
 * - Security headers
 * - CORS configuration
 * - Request limits
 * - Basic request sanitization
 * - Rate limiting
 * - Request ID generation
 * - Security logging
 *
 * This module does NOT replace:
 * - Supabase RLS
 * - Authentication
 * - Authorization
 * - HTTPS/TLS
 * - Database security
 */

"use strict";

const crypto = require("crypto");
const rateLimit = require("express-rate-limit");


/* =========================================================
   ENVIRONMENT
   ========================================================= */

const NODE_ENV =
  process.env.NODE_ENV ||
  "development";

const isProduction =
  NODE_ENV === "production";


/* =========================================================
   TRUST PROXY
   =========================================================
 *
 * Enable this when the application is deployed behind a
 * trusted reverse proxy/load balancer.
 */

function configureTrustProxy(
  app
) {

  if (
    isProduction &&
    app
  ) {

    app.set(
      "trust proxy",
      1
    );

  }

}


/* =========================================================
   REQUEST ID
   ========================================================= */

function requestId(
  req,
  res,
  next
) {

  const incomingId =
    req.headers[
      "x-request-id"
    ];


  /*
   * Do not blindly trust an arbitrary client-provided
   * request ID. Validate its size and format first.
   */

  const validIncomingId =
    typeof incomingId === "string" &&
    /^[a-zA-Z0-9._:-]{1,100}$/.test(
      incomingId
    );


  const id =
    validIncomingId
      ? incomingId
      : crypto.randomUUID();


  req.requestId =
    id;


  res.setHeader(
    "X-Request-ID",
    id
  );


  next();

}


/* =========================================================
   SECURITY HEADERS
   ========================================================= */

function securityHeaders(
  req,
  res,
  next
) {

  /*
   * Prevent MIME-type sniffing.
   */

  res.setHeader(
    "X-Content-Type-Options",
    "nosniff"
  );


  /*
   * Prevent framing by other sites.
   */

  res.setHeader(
    "X-Frame-Options",
    "DENY"
  );


  /*
   * Restrict referrer information.
   */

  res.setHeader(
    "Referrer-Policy",
    "strict-origin-when-cross-origin"
  );


  /*
   * Disable browser features that the banking API
   * does not need.
   */

  res.setHeader(
    "Permissions-Policy",
    [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()"
    ].join(", ")
  );


  /*
   * Basic Content Security Policy.
   *
   * API responses normally do not need scripts, frames,
   * plugins, or embedded objects.
   */

  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'none'",
      "form-action 'none'"
    ].join("; ")
  );


  /*
   * HSTS should only be enabled when HTTPS is actually
   * being used in production.
   */

  if (isProduction) {

    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );

  }


  next();

}


/* =========================================================
   CORS
   ========================================================= */

function getAllowedOrigins() {

  const configured =
    process.env.CORS_ORIGIN;


  if (!configured) {

    return [];

  }


  return configured
    .split(",")
    .map(
      origin =>
        origin.trim()
    )
    .filter(Boolean);

}


function corsMiddleware(
  req,
  res,
  next
) {

  const allowedOrigins =
    getAllowedOrigins();


  const origin =
    req.headers.origin;


  /*
   * Development convenience:
   * if no CORS_ORIGIN is configured, allow requests
   * without an Origin header.
   */

  if (!origin) {

    return next();

  }


  if (
    allowedOrigins.includes(
      origin
    )
  ) {

    res.setHeader(
      "Access-Control-Allow-Origin",
      origin
    );

    res.setHeader(
      "Vary",
      "Origin"
    );

    res.setHeader(
      "Access-Control-Allow-Credentials",
      "true"
    );

    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS"
    );

    res.setHeader(
      "Access-Control-Allow-Headers",
      [
        "Content-Type",
        "Authorization",
        "X-Request-ID"
      ].join(", ")
    );

  }


  /*
   * Handle browser preflight requests.
   */

  if (
    req.method ===
    "OPTIONS"
  ) {

    if (
      allowedOrigins.includes(
        origin
      )
    ) {

      return res
        .status(204)
        .end();

    }

    return res
      .status(403)
      .json({
        success: false,
        message:
          "CORS origin is not allowed."
      });

  }


  next();

}


/* =========================================================
   JSON REQUEST LIMIT
   ========================================================= */

function configureBodyLimits(
  app
) {

  /*
   * Keep JSON request bodies small.
   *
   * This should be used when registering Express parsers:
   *
   * app.use(express.json({
   *   limit: "1mb"
   * }));
   */

  return {
    jsonLimit:
      "1mb",

    urlEncodedLimit:
      "100kb"
  };

}


/* =========================================================
   BASIC INPUT SANITIZATION
   =========================================================
 *
 * This intentionally does NOT attempt to "sanitize"
 * SQL or HTML globally.
 *
 * Parameterized Supabase queries should be used for
 * database operations.
 */

function sanitizeString(
  value,
  maxLength = 1000
) {

  if (
    typeof value !== "string"
  ) {

    return value;

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


function sanitizeObject(
  value,
  depth = 0
) {

  if (
    depth > 5
  ) {

    return value;

  }


  if (
    typeof value === "string"
  ) {

    return sanitizeString(
      value
    );

  }


  if (
    Array.isArray(value)
  ) {

    return value.map(
      item =>
        sanitizeObject(
          item,
          depth + 1
        )
    );

  }


  if (
    value &&
    typeof value === "object"
  ) {

    const output = {};


    for (
      const [key, item]
      of Object.entries(value)
    ) {

      /*
       * Reject dangerous prototype-related keys.
       */

      if (
        key === "__proto__" ||
        key === "constructor" ||
        key === "prototype"
      ) {

        continue;

      }


      output[key] =
        sanitizeObject(
          item,
          depth + 1
        );

    }


    return output;

  }


  return value;

}


function sanitizeRequest(
  req,
  res,
  next
) {

  if (
    req.body &&
    typeof req.body === "object"
  ) {

    req.body =
      sanitizeObject(
        req.body
      );

  }


  if (
    req.query &&
    typeof req.query === "object"
  ) {

    req.query =
      sanitizeObject(
        req.query
      );

  }


  if (
    req.params &&
    typeof req.params === "object"
  ) {

    req.params =
      sanitizeObject(
        req.params
      );

  }


  next();

}


/* =========================================================
   GENERAL API RATE LIMIT
   ========================================================= */

const apiLimiter =
  rateLimit({

    windowMs:
      15 * 60 * 1000,

    limit:
      300,

    standardHeaders:
      "draft-7",

    legacyHeaders:
      false,

    message: {
      success:
        false,

      message:
        "Too many requests. Please try again later."
    },

    handler:
      (req, res) => {

        res.status(429).json({

          success:
            false,

          message:
            "Too many requests. Please try again later.",

          request_id:
            req.requestId || null

        });

      }

  });


/* =========================================================
   AUTH RATE LIMIT
   =========================================================
 *
 * Use this specifically on login/signup/password-reset
 * routes.
 */

const authLimiter =
  rateLimit({

    windowMs:
      15 * 60 * 1000,

    limit:
      20,

    standardHeaders:
      "draft-7",

    legacyHeaders:
      false,

    skipSuccessfulRequests:
      true,

    message: {
      success:
        false,

      message:
        "Too many authentication attempts. Please try again later."
    },

    handler:
      (req, res) => {

        res.status(429).json({

          success:
            false,

          message:
            "Too many authentication attempts. Please try again later.",

          request_id:
            req.requestId || null

        });

      }

  });


/* =========================================================
   TRANSACTION RATE LIMIT
   =========================================================
 *
 * More restrictive than general API traffic.
 */

const transactionLimiter =
  rateLimit({

    windowMs:
      15 * 60 * 1000,

    limit:
      60,

    standardHeaders:
      "draft-7",

    legacyHeaders:
      false,

    message: {
      success:
        false,

      message:
        "Too many transaction requests. Please try again later."
    },

    handler:
      (req, res) => {

        res.status(429).json({

          success:
            false,

          message:
            "Too many transaction requests. Please try again later.",

          request_id:
            req.requestId || null

        });

      }

  });


/* =========================================================
   SECURITY LOGGING
   ========================================================= */

function securityLogger(
  req,
  res,
  next
) {

  const startedAt =
    Date.now();


  res.on(
    "finish",
    () => {

      const duration =
        Date.now() -
        startedAt;


      /*
       * Never log:
       * - passwords
       * - access tokens
       * - refresh tokens
       * - authorization headers
       * - sensitive account information
       */

      if (
        res.statusCode >= 400
      ) {

        console.warn(
          "[Security]",
          JSON.stringify({

            request_id:
              req.requestId || null,

            method:
              req.method,

            path:
              req.originalUrl,

            status:
              res.statusCode,

            duration_ms:
              duration,

            ip:
              req.ip || null,

            user_agent:
              req.get(
                "user-agent"
              ) || null

          })
        );

      }

    }
  );


  next();

}


/* =========================================================
   APPLY DEFAULT SECURITY
   ========================================================= */

function applySecurity(
  app
) {

  if (!app) {

    throw new Error(
      "An Express application instance is required."
    );

  }


  configureTrustProxy(
    app
  );


  app.use(
    requestId
  );


  app.use(
    securityHeaders
  );


  app.use(
    corsMiddleware
  );


  app.use(
    securityLogger
  );


  app.use(
    sanitizeRequest
  );


  app.use(
    apiLimiter
  );


  return app;

}


/* =========================================================
   ERROR RESPONSE
   ========================================================= */

function securityErrorHandler(
  err,
  req,
  res,
  next
) {

  console.error(
    "Security/application error:",
    err?.message || err
  );


  if (
    res.headersSent
  ) {

    return next(
      err
    );

  }


  return res
    .status(
      err?.statusCode || 500
    )
    .json({

      success:
        false,

      message:
        isProduction
          ? "An internal server error occurred."
          : (
              err?.message ||
              "An internal server error occurred."
            ),

      request_id:
        req.requestId || null

    });

}


/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {

  configureTrustProxy,

  requestId,

  securityHeaders,

  corsMiddleware,

  configureBodyLimits,

  sanitizeString,

  sanitizeObject,

  sanitizeRequest,

  apiLimiter,

  authLimiter,

  transactionLimiter,

  securityLogger,

  applySecurity,

  securityErrorHandler

};