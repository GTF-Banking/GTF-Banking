'use strict';

/*
=========================================================
 GTF BANKING
 USERS API
=========================================================

Mounted at:

    /api/users

Endpoints:

    GET /api/users/me
    GET /api/users/stats

Authentication:

    Protected endpoints require the existing
    authMiddleware.js.

=========================================================
*/

const express =
  require('express');

const router =
  express.Router();


/*
=========================================================
 AUTH MIDDLEWARE
=========================================================
*/

const {
  requireAuth
} =
  require('../authentication/authMiddleware');


/*
=========================================================
 SUPABASE
=========================================================
*/

let supabase = null;

try {

  const supabaseModule =
    require('../database/supabase');

  supabase =
    supabaseModule.supabase ||
    supabaseModule.client ||
    supabaseModule;

} catch (error) {

  console.error(
    'Unable to load Supabase:',
    error.message
  );

}


/*
=========================================================
 DATABASE HELPER
=========================================================
*/

function requireDatabase(
  res
) {

  if (!supabase) {

    res.status(503).json({

      success: false,

      error:
        'Database service is not configured.'

    });

    return false;

  }

  return true;

}


/*
=========================================================
 GET CURRENT USER
=========================================================
*/

router.get(
  '/me',
  requireAuth,
  async function (
    req,
    res
  ) {

    /*
     * req.user is supplied by authMiddleware.
     */

    if (!req.user) {

      return res.status(401).json({

        success: false,

        error:
          'Authentication required.'

      });

    }


    let profile =
      req.user.profile ||
      null;


    /*
     * If auth middleware already attached
     * the application profile, use it.
     *
     * Otherwise attempt to retrieve it
     * from public.users.
     */

    if (
      !profile &&
      supabase &&
      req.user.id
    ) {

      try {

        const {
          data,
          error
        } =
          await supabase
            .from('users')
            .select('*')
            .eq(
              'id',
              req.user.id
            )
            .maybeSingle();


        if (
          !error &&
          data
        ) {

          profile = data;

        }

      } catch (error) {

        console.error(
          'Profile lookup failed:',
          error.message
        );

      }

    }


    return res.json({

      success: true,

      user: {

        id:
          req.user.id,

        email:
          req.user.email ||
          profile?.email ||
          null,

        full_name:
          profile?.full_name ||
          req.user.user_metadata?.full_name ||
          null,

        phone:
          profile?.phone ||
          req.user.phone ||
          null,

        role:
          profile?.role ||
          req.user.user_metadata?.role ||
          null,

        account_status:
          profile?.account_status ||
          null,

        verification_status:
          profile?.verification_status ||
          null,

        created_at:
          profile?.created_at ||
          req.user.created_at ||
          null

      }

    });

  }
);


/*
=========================================================
 USER / ACCOUNT STATISTICS
=========================================================
*/

router.get(
  '/stats',
  requireAuth,
  async function (
    req,
    res
  ) {

    if (
      !requireDatabase(res)
    ) {
      return;
    }


    /*
     * Count users.
     */

    const usersQuery =
      await supabase
        .from('users')
        .select(
          'id',
          {
            count: 'exact',
            head: true
          }
        );


    if (
      usersQuery.error
    ) {

      console.error(
        'Users count error:',
        usersQuery.error
      );

      return res.status(500).json({

        success: false,

        error:
          'Unable to retrieve customer statistics.'

      });

    }


    /*
     * Count accounts.
     */

    const accountsQuery =
      await supabase
        .from('bank_accounts')
        .select(
          'id',
          {
            count: 'exact',
            head: true
          }
        );


    if (
      accountsQuery.error
    ) {

      console.error(
        'Accounts count error:',
        accountsQuery.error
      );

      return res.status(500).json({

        success: false,

        error:
          'Unable to retrieve account statistics.'

      });

    }


    /*
     * Count active accounts.
     */

    const activeAccountsQuery =
      await supabase
        .from('bank_accounts')
        .select(
          'id',
          {
            count: 'exact',
            head: true
          }
        )
        .eq(
          'status',
          'active'
        );


    if (
      activeAccountsQuery.error
    ) {

      console.error(
        'Active accounts count error:',
        activeAccountsQuery.error
      );

      return res.status(500).json({

        success: false,

        error:
          'Unable to retrieve active account statistics.'

      });

    }


    return res.json({

      success: true,

      customers:
        usersQuery.count || 0,

      accounts:
        accountsQuery.count || 0,

      active_accounts:
        activeAccountsQuery.count || 0

    });

  }
);


/*
=========================================================
 CUSTOMER LIST
=========================================================

This endpoint is intentionally limited.

For production banking environments, pagination,
search authorization and audit logging should be
implemented before exposing large customer datasets.

=========================================================
*/

router.get(
  '/',
  requireAuth,
  async function (
    req,
    res
  ) {

    if (
      !requireDatabase(res)
    ) {
      return;
    }


    const limit =
      Math.min(
        Math.max(
          Number(req.query.limit) || 25,
          1
        ),
        100
      );


    const {
      data,
      error
    } =
      await supabase
        .from('users')
        .select(
          'id,full_name,email,phone,account_status,verification_status,created_at'
        )
        .order(
          'created_at',
          {
            ascending: false
          }
        )
        .limit(limit);


    if (error) {

      console.error(
        'Customer query error:',
        error
      );

      return res.status(500).json({

        success: false,

        error:
          'Unable to retrieve customers.'

      });

    }


    return res.json({

      success: true,

      users:
        data || [],

      count:
        data?.length || 0

    });

  }
);


module.exports =
  router;