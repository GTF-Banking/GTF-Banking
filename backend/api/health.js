'use strict';

/*
=========================================================
 GTF BANKING
 HEALTH API
=========================================================

Mounted by:

    backend/api/router.js

at:

    /api/health

Therefore:

    GET /api/health

=========================================================
*/

const express =
  require('express');

const router =
  express.Router();


/*
=========================================================
 SUPABASE CLIENT
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

  console.warn(
    'Supabase module could not be loaded:',
    error.message
  );

}


/*
=========================================================
 BASIC HEALTH
=========================================================
*/

router.get(
  '/',
  async function (
    req,
    res
  ) {

    const result = {

      success: true,

      service:
        'GTF Banking API',

      status:
        'online',

      timestamp:
        new Date().toISOString(),

      environment:
        process.env.NODE_ENV ||
        'development',

      database:
        'not checked'

    };


    /*
     * If Supabase is not configured,
     * the API itself is still alive.
     */

    if (!supabase) {

      result.database =
        'not configured';

      return res.status(200).json(
        result
      );

    }


    /*
     * Check database connectivity.
     *
     * We query users with a harmless
     * limited request.
     */

    try {

      const {
        error
      } =
        await supabase
          .from('users')
          .select('id')
          .limit(1);


      if (error) {

        console.error(
          'Supabase health check:',
          error.message
        );

        result.database =
          'error';

        result.database_error =
          error.message;

        /*
         * API is alive, but database is not.
         */

        return res.status(503).json(
          result
        );

      }


      result.database =
        'connected';


      return res.status(200).json(
        result
      );

    } catch (error) {

      result.database =
        'error';

      result.database_error =
        error.message;


      return res.status(503).json(
        result
      );

    }

  }
);


module.exports =
  router;