/**
 * GTB-Banking
 * backend/authentication/session.js
 *
 * Supabase session utilities.
 *
 * Responsibilities:
 * - Extract Bearer access tokens
 * - Verify authenticated users
 * - Read the current session
 * - Refresh sessions
 * - Sign out authenticated sessions
 * - Attach optional session information to requests
 * - Require an authenticated session
 *
 * Security:
 * - Never log access tokens or refresh tokens
 * - Never expose service-role credentials
 * - Never accept a user ID as proof of identity
 * - Supabase Auth is the source of authentication truth
 */

"use strict";

const {
  createClient
} = require("@supabase/supabase-js");


/* =========================================================
   CONFIGURATION
   ========================================================= */

const SUPABASE_URL =
  process.env.SUPABASE_URL;

const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY;


/* =========================================================
   VALIDATE CONFIGURATION
   ========================================================= */

function hasSupabaseConfig() {

  return Boolean(
    SUPABASE_URL &&
    SUPABASE_ANON_KEY
  );

}


/* =========================================================
   CREATE USER-SCOPED CLIENT
   ========================================================= */

function createUserClient(
  accessToken
) {

  if (
    !hasSupabaseConfig()
  ) {

    throw new Error(
      "Supabase configuration is missing."
    );

  }

  if (
    !accessToken
  ) {

    throw new Error(
      "Access token is required."
    );

  }


  return createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      },

      global: {
        headers: {
          Authorization:
            `Bearer ${accessToken}`
        }
      }
    }
  );

}


/* =========================================================
   EXTRACT BEARER TOKEN
   ========================================================= */

function getAccessTokenFromHeader(
  authorization
) {

  if (
    !authorization ||
    typeof authorization !== "string"
  ) {

    return null;

  }


  const parts =
    authorization
      .trim()
      .split(/\s+/);


  if (
    parts.length !== 2
  ) {

    return null;

  }


  if (
    parts[0].toLowerCase() !==
    "bearer"
  ) {

    return null;

  }


  const token =
    parts[1].trim();


  if (!token) {

    return null;

  }


  return token;

}


/* =========================================================
   EXTRACT TOKEN FROM REQUEST
   ========================================================= */

function getAccessToken(
  req
) {

  if (!req) {
    return null;
  }


  return getAccessTokenFromHeader(
    req.headers?.authorization
  );

}


/* =========================================================
   VERIFY ACCESS TOKEN
   ========================================================= */

async function getUserFromAccessToken(
  accessToken
) {

  if (
    !accessToken
  ) {

    return {
      user: null,
      error:
        "Access token is required."
    };

  }


  if (
    !hasSupabaseConfig()
  ) {

    return {
      user: null,
      error:
        "Supabase configuration is missing."
    };

  }


  try {

    /*
     * getUser(accessToken) verifies the token with
     * Supabase Auth rather than trusting information
     * supplied by the browser.
     */

    const {
      data,
      error
    } =
      await createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
          }
        }
      )
        .auth
        .getUser(
          accessToken
        );


    if (error) {

      return {
        user: null,
        error:
          error.message
      };

    }


    if (
      !data ||
      !data.user
    ) {

      return {
        user: null,
        error:
          "Authenticated user not found."
      };

    }


    return {
      user:
        data.user,

      error:
        null
    };

  } catch (error) {

    console.error(
      "Session verification error:",
      error.message
    );


    return {
      user: null,

      error:
        "Unable to verify the authentication session."
    };

  }

}


/* =========================================================
   GET CURRENT USER FROM REQUEST
   ========================================================= */

async function getCurrentUser(
  req
) {

  const accessToken =
    getAccessToken(
      req
    );


  if (
    !accessToken
  ) {

    return {
      user: null,

      error:
        "Authentication required."
    };

  }


  return getUserFromAccessToken(
    accessToken
  );

}


/* =========================================================
   GET SAFE SESSION INFORMATION
   ========================================================= */

async function getSessionInfo(
  req
) {

  const accessToken =
    getAccessToken(
      req
    );


  if (
    !accessToken
  ) {

    return {
      authenticated:
        false,

      user:
        null
    };

  }


  const {
    user,
    error
  } =
    await getUserFromAccessToken(
      accessToken
    );


  if (!user) {

    return {
      authenticated:
        false,

      user:
        null,

      error
    };

  }


  return {
    authenticated:
      true,

    user: {
      id:
        user.id,

      email:
        user.email || null,

      phone:
        user.phone || null,

      email_confirmed:
        Boolean(
          user.email_confirmed_at
        ),

      phone_confirmed:
        Boolean(
          user.phone_confirmed_at
        ),

      created_at:
        user.created_at || null,

      last_sign_in_at:
        user.last_sign_in_at || null
    }
  };

}


/* =========================================================
   REFRESH SESSION
   ========================================================= */

async function refreshSession(
  refreshToken
) {

  if (
    !refreshToken ||
    typeof refreshToken !== "string"
  ) {

    return {
      session:
        null,

      user:
        null,

      error:
        "Refresh token is required."
    };

  }


  if (
    !hasSupabaseConfig()
  ) {

    return {
      session:
        null,

      user:
        null,

      error:
        "Supabase configuration is missing."
    };

  }


  try {

    const client =
      createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
          }
        }
      );


    const {
      data,
      error
    } =
      await client.auth.refreshSession({
        refresh_token:
          refreshToken
      });


    if (error) {

      return {
        session:
          null,

        user:
          null,

        error:
          error.message
      };

    }


    return {
      session:
        data?.session || null,

      user:
        data?.user || null,

      error:
        null
    };

  } catch (error) {

    console.error(
      "Session refresh error:",
      error.message
    );


    return {
      session:
        null,

      user:
        null,

      error:
        "Unable to refresh the session."
    };

  }

}


/* =========================================================
   SIGN OUT
   ========================================================= */

async function signOut(
  accessToken
) {

  if (
    !accessToken
  ) {

    return {
      success:
        false,

      error:
        "Access token is required."
    };

  }


  try {

    const client =
      createUserClient(
        accessToken
      );


    const {
      error
    } =
      await client.auth.signOut();


    if (error) {

      return {
        success:
          false,

        error:
          error.message
      };

    }


    return {
      success:
        true,

      error:
        null
    };

  } catch (error) {

    console.error(
      "Sign-out error:",
      error.message
    );


    return {
      success:
        false,

      error:
        "Unable to sign out."
    };

  }

}


/* =========================================================
   OPTIONAL SESSION MIDDLEWARE
   =========================================================
 *
 * Does not reject unauthenticated requests.
 *
 * Adds:
 *
 * req.user
 * req.sessionAuthenticated
 * req.sessionError
 */

async function attachSession(
  req,
  res,
  next
) {

  try {

    const {
      user,
      error
    } =
      await getCurrentUser(
        req
      );


    req.user =
      user || null;


    req.sessionAuthenticated =
      Boolean(
        user
      );


    req.sessionError =
      error || null;


    return next();

  } catch (error) {

    console.error(
      "attachSession error:",
      error.message
    );


    req.user =
      null;


    req.sessionAuthenticated =
      false;


    req.sessionError =
      "Unable to check session.";


    return next();

  }

}


/* =========================================================
   REQUIRE SESSION
   =========================================================
 *
 * Protects an endpoint.
 *
 * Usage:
 *
 * router.get(
 *   "/protected",
 *   requireSession,
 *   handler
 * );
 */

async function requireSession(
  req,
  res,
  next
) {

  try {

    const {
      user,
      error
    } =
      await getCurrentUser(
        req
      );


    if (!user) {

      return res
        .status(401)
        .json({

          success:
            false,

          message:
            error ||
            "Authentication required."

        });

    }


    req.user =
      user;


    req.sessionAuthenticated =
      true;


    return next();

  } catch (error) {

    console.error(
      "requireSession error:",
      error.message
    );


    return res
      .status(500)
      .json({

        success:
          false,

        message:
          "Unable to verify the session."

      });

  }

}


/* =========================================================
   SESSION STATUS MIDDLEWARE
   =========================================================
 *
 * Useful for endpoints that want to know whether the
 * request is authenticated without blocking it.
 */

async function sessionStatus(
  req,
  res,
  next
) {

  try {

    const info =
      await getSessionInfo(
        req
      );


    req.session =
      info;


    return next();

  } catch (error) {

    console.error(
      "sessionStatus error:",
      error.message
    );


    req.session = {
      authenticated:
        false,

      user:
        null,

      error:
        "Unable to determine session status."
    };


    return next();

  }

}


/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {

  createUserClient,

  hasSupabaseConfig,

  getAccessTokenFromHeader,

  getAccessToken,

  getUserFromAccessToken,

  getCurrentUser,

  getSessionInfo,

  refreshSession,

  signOut,

  attachSession,

  requireSession,

  sessionStatus

};