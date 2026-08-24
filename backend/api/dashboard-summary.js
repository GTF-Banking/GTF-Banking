'use strict';

/*
=========================================================
 GTF BANKING
 ADMIN DASHBOARD SUMMARY API
=========================================================

Endpoint:

    GET /api/dashboard/summary

This endpoint provides the numbers displayed by the
administration dashboard.

=========================================================
*/

const {
  requireAuth
} =
  require('../authentication/authMiddleware');

const {
  roleMiddleware
} =
  require('../authentication/roleMiddleware');


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
    'Supabase module could not be loaded:',
    error.message
  );

}


/*
=========================================================
 ROLE MIDDLEWARE COMPATIBILITY
=========================================================
*/

function adminOnly(
  req,
  res,
  next
) {

  /*
   * If role middleware is available and profile
   * information exists, enforce admin access.
   */

  if (
    req.user &&
    req.user.profile
  ) {

    return roleMiddleware(
      'admin',
      'administrator'
    )(
      req,
      res,
      next
    );

  }


  /*
   * If auth middleware did not attach profile,
   * do not silently claim the user is admin.
   */

  return res.status(403).json({

    success: false,

    error:
      'Administrator role could not be verified.'

  });

}


/*
=========================================================
 SUMMARY
=========================================================
*/

async function getDashboardSummary(
  req,
  res,
  next
) {

  try {

    /*
     * Authentication first.
     */

    return requireAuth(
      req,
      res,
      function () {

        return adminOnly(
          req,
          res,
          async function () {

            if (!supabase) {

              return res.status(503).json({

                success: false,

                error:
                  'Database service is not configured.'

              });

            }


            /*
             * Customer count
             */

            const customers =
              await supabase
                .from('users')
                .select(
                  'id',
                  {
                    count: 'exact',
                    head: true
                  }
                );


            /*
             * Account count
             */

            const accounts =
              await supabase
                .from('bank_accounts')
                .select(
                  'id',
                  {
                    count: 'exact',
                    head: true
                  }
                );


            /*
             * Transaction count
             */

            const transactions =
              await supabase
                .from('transactions')
                .select(
                  'id',
                  {
                    count: 'exact',
                    head: true
                  }
                );


            /*
             * Pending transaction count
             */

            const pendingTransactions =
              await supabase
                .from('transactions')
                .select(
                  'id',
                  {
                    count: 'exact',
                    head: true
                  }
                )
                .eq(
                  'status',
                  'pending'
                );


            /*
             * Check errors.
             */

            const errors = [
              customers.error,
              accounts.error,
              transactions.error,
              pendingTransactions.error
            ].filter(Boolean);


            if (errors.length) {

              console.error(
                'Dashboard summary database error:',
                errors
              );

              return res.status(500).json({

                success: false,

                error:
                  'Unable to retrieve dashboard statistics.'

              });

            }


            return res.json({

              success: true,

              data: {

                customers:
                  customers.count || 0,

                accounts:
                  accounts.count || 0,

                transactions:
                  transactions.count || 0,

                pending_transactions:
                  pendingTransactions.count || 0

              },

              timestamp:
                new Date().toISOString()

            });

          }
        );

      }
    );

  } catch (error) {

    next(error);

  }

}


module.exports = {
  getDashboardSummary
};