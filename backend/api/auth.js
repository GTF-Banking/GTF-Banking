/**
 * Global TrustFund
 * backend/api/auth.js
 *
 * Authentication API
 *
 * Routes:
 *
 * POST /api/auth/signup
 * POST /api/auth/login
 * POST /api/auth/logout
 * GET  /api/auth/me
 * GET  /api/auth/verify
 * GET  /api/auth/status
 * GET  /api/auth/manager
 * POST /api/auth/refresh
 *
 * Authentication:
 * - Supabase Auth
 *
 * Application users:
 * - public.users
 *
 * Application roles:
 * - users.role
 *
 * IMPORTANT:
 * - Never store passwords in PostgreSQL yourself.
 * - Never expose SUPABASE_SERVICE_ROLE_KEY to frontend code.
 * - Never trust a role supplied by the browser.
 * - Always authenticate access tokens through Supabase.
 * - Manager/admin authorization is checked server-side.
 */

"use strict";

const express = require("express");

const {
  supabase,
  supabaseAdmin,
  createUserClient
} = require("../database/supabase");

const router = express.Router();

const MIN_PASSWORD_LENGTH = 8;


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


function errorResponse(
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
   SUPABASE AVAILABILITY
   ========================================================= */

function ensureSupabase(res) {

  if (!supabase) {

    errorResponse(
      res,
      "Authentication service is not configured.",
      503
    );

    return false;
  }

  return true;
}


/* =========================================================
   USER HELPERS
   ========================================================= */

function safeUser(user) {

  if (!user) {
    return null;
  }

  return {
    id:
      user.id,

    email:
      user.email || null,

    email_confirmed_at:
      user.email_confirmed_at || null,

    created_at:
      user.created_at || null,

    last_sign_in_at:
      user.last_sign_in_at || null
  };
}


/* =========================================================
   SESSION HELPER
   ========================================================= */

function safeSession(session) {

  if (!session) {
    return null;
  }

  return {

    access_token:
      session.access_token,

    refresh_token:
      session.refresh_token,

    expires_at:
      session.expires_at,

    expires_in:
      session.expires_in,

    token_type:
      session.token_type
  };
}


/* =========================================================
   TOKEN HELPERS
   ========================================================= */

function getBearerToken(req) {

  const header =
    req.headers.authorization;

  if (!header) {
    return null;
  }

  const parts =
    header
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


function getAccessToken(req) {
  return getBearerToken(req);
}


/* =========================================================
   AUTHENTICATE REQUEST
   ========================================================= */

async function authenticateRequest(req) {

  const token =
    getAccessToken(req);

  if (!token) {

    return {
      user: null,
      token: null,
      error: new Error(
        "Authentication token missing."
      )
    };
  }


  if (!supabase) {

    return {
      user: null,
      token,
      error: new Error(
        "Supabase authentication client unavailable."
      )
    };
  }


  try {

    const {
      data,
      error
    } =
      await supabase.auth.getUser(
        token
      );


    if (error) {

      return {
        user: null,
        token,
        error
      };
    }


    if (!data?.user) {

      return {
        user: null,
        token,
        error: new Error(
          "Authenticated user not found."
        )
      };
    }


    return {
      user:
        data.user,

      token,

      error:
        null
    };

  } catch (error) {

    return {
      user: null,
      token,
      error
    };
  }
}


/* =========================================================
   GET USER ROLE
   =========================================================
 *
 * Actual database table:
 *
 * public.users
 *
 * id
 * full_name
 * email
 * role
 * created_at
 *
 * We use the user's access token so normal RLS
 * policies remain active.
 *
 * If a service-role client exists, it can be used
 * server-side for authoritative role lookup.
 *
 * NEVER send supabaseAdmin to the frontend.
 */

async function getUserRole(
  userId,
  accessToken = null
) {

  if (!userId) {
    return null;
  }


  /*
   * Prefer the authenticated user client.
   *
   * This keeps RLS active.
   */

  if (accessToken) {

    try {

      const userClient =
        createUserClient(
          accessToken
        );


      const {
        data,
        error
      } =
        await userClient
          .from("users")
          .select("id, role")
          .eq("id", userId)
          .maybeSingle();


      if (!error && data) {

        return data.role || null;
      }


      if (error) {

        console.warn(
          "User role lookup through RLS failed:",
          error.message
        );
      }

    } catch (error) {

      console.warn(
        "User role client error:",
        error.message
      );
    }
  }


  /*
   * Server-side fallback.
   *
   * Only available when the service-role key
   * has been configured on the backend.
   */

  if (supabaseAdmin) {

    try {

      const {
        data,
        error
      } =
        await supabaseAdmin
          .from("users")
          .select("id, role")
          .eq("id", userId)
          .maybeSingle();


      if (error) {

        console.error(
          "Admin role lookup error:",
          error.message
        );

        return null;
      }


      return data?.role || null;

    } catch (error) {

      console.error(
        "Admin role lookup exception:",
        error.message
      );

      return null;
    }
  }


  return null;
}


/* =========================================================
   MANAGER ROLE CHECK
   ========================================================= */

function isManagerRole(role) {

  return (
    role === "manager" ||
    role === "admin"
  );
}


/* =========================================================
   POST /api/auth/signup
   ========================================================= */

router.post(
  "/signup",
  async (req, res) => {

    if (!ensureSupabase(res)) {
      return;
    }


    try {

      const email =
        String(
          req.body?.email || ""
        )
          .trim()
          .toLowerCase();


      const password =
        String(
          req.body?.password || ""
        );


      const fullName =
        String(
          req.body?.full_name || ""
        )
          .trim();


      if (!email) {

        return errorResponse(
          res,
          "Email is required.",
          400
        );
      }


      if (!password) {

        return errorResponse(
          res,
          "Password is required.",
          400
        );
      }


      if (
        password.length <
        MIN_PASSWORD_LENGTH
      ) {

        return errorResponse(
          res,
          `Password must contain at least ${MIN_PASSWORD_LENGTH} characters.`,
          400
        );
      }


      const {
        data,
        error
      } =
        await supabase.auth.signUp({

          email,

          password,

          options: {

            data: {

              full_name:
                fullName || null
            }
          }
        });


      if (error) {

        console.error(
          "Signup error:",
          error.message
        );

        return errorResponse(
          res,
          "Unable to create the account.",
          400
        );
      }


      if (!data?.user) {

        return errorResponse(
          res,
          "Account creation failed.",
          400
        );
      }


      /*
       * The users table should normally be populated
       * by a Supabase database trigger when a new
       * auth.users record is created.
       *
       * Do NOT create passwords in users.
       */


      return success(
        res,
        {

          user:
            safeUser(data.user),

          session:
            safeSession(data.session),

          email_confirmation_required:
            !data.session
        },
        201
      );

    } catch (error) {

      console.error(
        "POST /auth/signup error:",
        error
      );

      return errorResponse(
        res,
        "An unexpected authentication error occurred.",
        500
      );
    }
  }
);


/* =========================================================
   POST /api/auth/login
   ========================================================= */

router.post(
  "/login",
  async (req, res) => {

    if (!ensureSupabase(res)) {
      return;
    }


    try {

      const email =
        String(
          req.body?.email || ""
        )
          .trim()
          .toLowerCase();


      const password =
        String(
          req.body?.password || ""
        );


      if (!email) {

        return errorResponse(
          res,
          "Email is required.",
          400
        );
      }


      if (!password) {

        return errorResponse(
          res,
          "Password is required.",
          400
        );
      }


      /*
       * Don't reveal whether the account exists.
       */

      if (
        password.length <
        MIN_PASSWORD_LENGTH
      ) {

        return errorResponse(
          res,
          "Invalid email or password.",
          401
        );
      }


      const {
        data,
        error
      } =
        await supabase.auth
          .signInWithPassword({

            email,

            password
          });


      if (error) {

        console.error(
          "Login error:",
          error.message
        );

        return errorResponse(
          res,
          "Invalid email or password.",
          401
        );
      }


      if (
        !data?.user ||
        !data?.session
      ) {

        return errorResponse(
          res,
          "Authentication failed.",
          401
        );
      }


      const role =
        await getUserRole(
          data.user.id,
          data.session.access_token
        );


      /*
       * The browser may request manager access,
       * but the database role is authoritative.
       */

      const requestedRole =
        String(
          req.body?.role || ""
        )
          .trim()
          .toLowerCase();


      if (
        requestedRole === "manager" &&
        !isManagerRole(role)
      ) {

        return errorResponse(
          res,
          "This account is not authorized for the manager portal.",
          403
        );
      }


      return success(
        res,
        {

          user:
            safeUser(data.user),

          role,

          session:
            safeSession(data.session)
        }
      );

    } catch (error) {

      console.error(
        "POST /auth/login error:",
        error
      );

      return errorResponse(
        res,
        "Unable to complete sign in.",
        500
      );
    }
  }
);


/* =========================================================
   GET /api/auth/me
   ========================================================= */

router.get(
  "/me",
  async (req, res) => {

    if (!ensureSupabase(res)) {
      return;
    }


    try {

      const {
        user,
        token,
        error
      } =
        await authenticateRequest(
          req
        );


      if (
        error ||
        !user
      ) {

        return errorResponse(
          res,
          "Authentication required.",
          401
        );
      }


      const role =
        await getUserRole(
          user.id,
          token
        );


      return success(
        res,
        {

          user:
            safeUser(user),

          role
        }
      );

    } catch (error) {

      console.error(
        "GET /auth/me error:",
        error
      );

      return errorResponse(
        res,
        "Unable to retrieve the authenticated user.",
        500
      );
    }
  }
);


/* =========================================================
   GET /api/auth/verify
   ========================================================= */

router.get(
  "/verify",
  async (req, res) => {

    if (!supabase) {

      return success(
        res,
        {
          authenticated: false,
          role: null
        }
      );
    }


    try {

      const {
        user,
        token
      } =
        await authenticateRequest(
          req
        );


      if (!user) {

        return success(
          res,
          {
            authenticated: false,
            role: null
          }
        );
      }


      const role =
        await getUserRole(
          user.id,
          token
        );


      return success(
        res,
        {

          authenticated:
            true,

          user:
            safeUser(user),

          role
        }
      );

    } catch (error) {

      console.error(
        "GET /auth/verify error:",
        error
      );

      return errorResponse(
        res,
        "Unable to verify authentication.",
        500
      );
    }
  }
);


/* =========================================================
   GET /api/auth/status
   ========================================================= */

router.get(
  "/status",
  async (req, res) => {

    if (!supabase) {

      return success(
        res,
        {
          authenticated: false,
          manager: false,
          role: null,
          service_available: false
        }
      );
    }


    try {

      const {
        user,
        token
      } =
        await authenticateRequest(
          req
        );


      if (!user) {

        return success(
          res,
          {

            authenticated:
              false,

            manager:
              false,

            role:
              null,

            service_available:
              true
          }
        );
      }


      const role =
        await getUserRole(
          user.id,
          token
        );


      return success(
        res,
        {

          authenticated:
            true,

          manager:
            isManagerRole(role),

          role,

          user:
            safeUser(user),

          service_available:
            true
        }
      );

    } catch (error) {

      console.error(
        "GET /auth/status error:",
        error
      );

      return errorResponse(
        res,
        "Unable to retrieve authentication status.",
        500
      );
    }
  }
);


/* =========================================================
   GET /api/auth/manager
   ========================================================= */

router.get(
  "/manager",
  async (req, res) => {

    if (!ensureSupabase(res)) {
      return;
    }


    try {

      const {
        user,
        token,
        error
      } =
        await authenticateRequest(
          req
        );


      if (
        error ||
        !user
      ) {

        return errorResponse(
          res,
          "Authentication required.",
          401
        );
      }


      const role =
        await getUserRole(
          user.id,
          token
        );


      if (
        !isManagerRole(role)
      ) {

        return errorResponse(
          res,
          "Manager authorization required.",
          403
        );
      }


      return success(
        res,
        {

          authorized:
            true,

          user:
            safeUser(user),

          role
        }
      );

    } catch (error) {

      console.error(
        "GET /auth/manager error:",
        error
      );

      return errorResponse(
        res,
        "Unable to verify manager authorization.",
        500
      );
    }
  }
);


/* =========================================================
   POST /api/auth/logout
   ========================================================= */

router.post(
  "/logout",
  async (req, res) => {

    /*
     * Supabase access tokens are normally managed by
     * the client session.
     *
     * The backend does not maintain a separate password
     * or session database.
     */

    try {

      const token =
        getAccessToken(req);


      if (!token) {

        return success(
          res,
          {
            logged_out: true
          }
        );
      }


      /*
       * Verify that the token is valid before reporting
       * a successful authenticated logout operation.
       */

      if (supabase) {

        const {
          error
        } =
          await supabase.auth.getUser(
            token
          );


        /*
         * Even if the token is already invalid/expired,
         * the desired client state is logged out.
         */

        if (error) {

          return success(
            res,
            {
              logged_out: true
            }
          );
        }
      }


      return success(
        res,
        {
          logged_out: true
        }
      );

    } catch (error) {

      console.error(
        "POST /auth/logout error:",
        error
      );

      return errorResponse(
        res,
        "Unable to complete logout.",
        500
      );
    }
  }
);


/* =========================================================
   POST /api/auth/refresh
   ========================================================= */

router.post(
  "/refresh",
  async (req, res) => {

    if (!ensureSupabase(res)) {
      return;
    }


    try {

      const refreshToken =
        String(
          req.body?.refresh_token || ""
        ).trim();


      if (!refreshToken) {

        return errorResponse(
          res,
          "Refresh token is required.",
          400
        );
      }


      const {
        data,
        error
      } =
        await supabase.auth
          .refreshSession({

            refresh_token:
              refreshToken
          });


      if (
        error ||
        !data?.session ||
        !data?.user
      ) {

        return errorResponse(
          res,
          "Unable to refresh the session.",
          401
        );
      }


      const role =
        await getUserRole(
          data.user.id,
          data.session.access_token
        );


      return success(
        res,
        {

          user:
            safeUser(data.user),

          role,

          session:
            safeSession(data.session)
        }
      );

    } catch (error) {

      console.error(
        "POST /auth/refresh error:",
        error
      );

      return errorResponse(
        res,
        "Unable to refresh the session.",
        500
      );
    }
  }
);


/* =========================================================
   OPTIONAL ROUTER INFORMATION
   =========================================================
 *
 * This prevents:
 *
 * GET /api/auth/
 *
 * from falling through to the global 404 handler.
 */

router.get(
  "/",
  (req, res) => {

    return success(
      res,
      {
        service:
          "GTF Banking Authentication API",

        endpoints: {

          signup:
            "POST /api/auth/signup",

          login:
            "POST /api/auth/login",

          logout:
            "POST /api/auth/logout",

          me:
            "GET /api/auth/me",

          verify:
            "GET /api/auth/verify",

          status:
            "GET /api/auth/status",

          manager:
            "GET /api/auth/manager",
          refresh:
            "POST /api/auth/refresh"
        }
      }
    );
  }
);


/* =========================================================
   EXPORT
   ========================================================= */

module.exports =
  router;