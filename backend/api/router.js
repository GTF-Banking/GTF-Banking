'use strict';

/*
=========================================================
 GTF BANKING
 CENTRAL API ROUTER
=========================================================

Every backend API endpoint is mounted underneath:

    /api

Therefore:

    router.get('/health')

becomes:

    GET /api/health

and:

    router.use('/users', usersRouter)

becomes:

    /api/users/...

=========================================================
*/

const express =
  require('express');

const router =
  express.Router();


/*
=========================================================
 HEALTH
=========================================================
*/

const healthRouter =
  require('./health');

router.use(
  '/health',
  healthRouter
);


/*
=========================================================
 AUTHENTICATION
=========================================================
*/

try {

  const authRouter =
    require('./auth');

  router.use(
    '/auth',
    authRouter
  );

} catch (error) {

  console.warn(
    'Auth API could not be loaded:',
    error.message
  );

}


/*
=========================================================
 ROLES
=========================================================
*/

try {

  const rolesRouter =
    require('./roles');

  router.use(
    '/roles',
    rolesRouter
  );

} catch (error) {

  console.warn(
    'Roles API could not be loaded:',
    error.message
  );

}


/*
=========================================================
 USERS
=========================================================
*/

const usersRouter =
  require('./users');

router.use(
  '/users',
  usersRouter
);


/*
=========================================================
 TRANSACTIONS
=========================================================
*/

try {

  const transactionsRouter =
    require('./transactions');

  router.use(
    '/transactions',
    transactionsRouter
  );

} catch (error) {

  console.warn(
    'Transactions API could not be loaded:',
    error.message
  );

}


/*
=========================================================
 DASHBOARD SUMMARY
=========================================================
*/

const {
  getDashboardSummary
} = require('./dashboard-summary');


router.get(
  '/dashboard/summary',
  getDashboardSummary
);


/*
=========================================================
 API ROOT
=========================================================
*/

router.get(
  '/',
  function (
    req,
    res
  ) {

    res.json({

      success: true,

      service:
        'GTF Banking API',

      version:
        '1.0.0',

      endpoints: {

        health:
          '/api/health',

        auth:
          '/api/auth',

        users:
          '/api/users',

        roles:
          '/api/roles',

        transactions:
          '/api/transactions',

        dashboard:
          '/api/dashboard/summary'

      }

    });

  }
);


module.exports =
  router;