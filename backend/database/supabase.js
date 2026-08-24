/**
 * GTF-Banking
 * backend/database/supabase.js
 *
 * Supabase configuration.
 *
 * IMPORTANT:
 * SUPABASE_SERVICE_ROLE_KEY must NEVER be exposed
 * to frontend/browser code.
 */

"use strict";

const {
  createClient
} = require("@supabase/supabase-js");


/* =========================================================
   ENVIRONMENT
   ========================================================= */

const SUPABASE_URL =
  process.env.SUPABASE_URL;

const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;


/* =========================================================
   VALIDATION
   ========================================================= */

if (!SUPABASE_URL) {

  console.warn(
    "[Supabase] SUPABASE_URL is not configured."
  );
}


if (!SUPABASE_ANON_KEY) {

  console.warn(
    "[Supabase] SUPABASE_ANON_KEY is not configured."
  );
}


if (!SUPABASE_SERVICE_ROLE_KEY) {

  console.warn(
    "[Supabase] SUPABASE_SERVICE_ROLE_KEY is not configured."
  );
}


/* =========================================================
   PUBLIC / ANON CLIENT
   ========================================================= */

let supabase = null;

if (
  SUPABASE_URL &&
  SUPABASE_ANON_KEY
) {

  supabase =
    createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        auth: {

          autoRefreshToken:
            false,

          persistSession:
            false,

          detectSessionInUrl:
            false
        }
      }
    );
}


/* =========================================================
   SERVER ADMIN CLIENT
   =========================================================
 *
 * NEVER export this to frontend code.
 *
 * This client bypasses RLS.
 */

let supabaseAdmin = null;

if (
  SUPABASE_URL &&
  SUPABASE_SERVICE_ROLE_KEY
) {

  supabaseAdmin =
    createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {

          autoRefreshToken:
            false,

          persistSession:
            false,

          detectSessionInUrl:
            false
        }
      }
    );
}


/* =========================================================
   USER-SCOPED CLIENT
   =========================================================
 *
 * Uses the authenticated user's access token.
 *
 * RLS remains active.
 */

function createUserClient(
  accessToken
) {

  if (!SUPABASE_URL) {

    throw new Error(
      "SUPABASE_URL is not configured."
    );
  }


  if (!SUPABASE_ANON_KEY) {

    throw new Error(
      "SUPABASE_ANON_KEY is not configured."
    );
  }


  if (
    !accessToken ||
    typeof accessToken !== "string"
  ) {

    throw new Error(
      "A valid access token is required."
    );
  }


  return createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {

      auth: {

        autoRefreshToken:
          false,

        persistSession:
          false,

        detectSessionInUrl:
          false
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
   CONFIGURATION STATUS
   ========================================================= */

function getSupabaseStatus() {

  return {

    configured:
      Boolean(
        SUPABASE_URL &&
        SUPABASE_ANON_KEY
      ),

    adminConfigured:
      Boolean(
        SUPABASE_URL &&
        SUPABASE_SERVICE_ROLE_KEY
      ),

    urlConfigured:
      Boolean(
        SUPABASE_URL
      ),

    anonKeyConfigured:
      Boolean(
        SUPABASE_ANON_KEY
      )
  };
}


/* =========================================================
   DATABASE HEALTH CHECK
   ========================================================= */

async function checkSupabaseConnection() {

  if (!supabase) {

    return {

      connected:
        false,

      error:
        "Supabase client is not configured."
    };
  }


  try {

    /*
     * Your actual database contains the users table.
     *
     * We only request one ID.
     */

    const {
      data,
      error
    } =
      await supabase
        .from("users")
        .select("id")
        .limit(1);


    if (error) {

      return {

        connected:
          false,

        error:
          error.message
      };
    }


    return {

      connected:
        true,

      error:
        null,

      rows:
        Array.isArray(data)
          ? data.length
          : 0
    };

  } catch (error) {

    return {

      connected:
        false,

      error:
        error.message
    };
  }
}


/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {

  supabase,

  supabaseAdmin,

  createUserClient,

  getSupabaseStatus,

  checkSupabaseConnection
};