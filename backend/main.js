/*
=========================================================
 GTF BANKING
 MAIN APPLICATION SERVER
=========================================================

Responsibilities:

  1. Load environment variables
  2. Create Express application
  3. Configure security middleware
  4. Mount ALL /api routes
  5. Serve the frontend
  6. Provide health endpoint
  7. Provide useful API errors
  8. Start HTTP server

IMPORTANT:

Frontend and API are intentionally served from the
same Express origin.

Example:

  https://your-domain.com/
  https://your-domain.com/login.html

API:

  https://your-domain.com/api/health
  https://your-domain.com/api/auth/login
  https://your-domain.com/api/users/me

Therefore frontend JavaScript should use:

  /api/...

and NOT:

  http://localhost:3001/api/...

=========================================================
*/
'use strict';
require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');

const app = express();


/*
=========================================================
 CONFIGURATION
=========================================================
*/

const PORT =
  Number(process.env.PORT) || 3001;

const HOST =
  process.env.HOST || '0.0.0.0';

const FRONTEND_DIR =
  path.resolve(
    __dirname,
    '..',
    'frontend'
  );


/*
=========================================================
 TRUST PROXY
=========================================================
*/

if (
  process.env.TRUST_PROXY === 'true'
) {
  app.set('trust proxy', 1);
}


/*
=========================================================
 BASIC APP SETTINGS
=========================================================
*/

app.disable('x-powered-by');

app.set(
  'json spaces',
  process.env.NODE_ENV === 'production'
    ? 0
    : 2
);


/*
=========================================================
 SECURITY HEADERS
=========================================================
*/

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);


/*
=========================================================
 REQUEST PARSING
=========================================================
*/

app.use(
  express.json({
    limit: '1mb'
  })
);

app.use(
  express.urlencoded({
    extended: false,
    limit: '1mb'
  })
);


/*
=========================================================
 REQUEST LOGGING
=========================================================
*/

app.use(
  function requestLogger(
    req,
    res,
    next
  ) {

    const started =
      Date.now();

    res.on(
      'finish',
      function () {

        const duration =
          Date.now() - started;

        if (
          process.env.NODE_ENV !==
          'test'
        ) {

          console.log(
            `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`
          );

        }

      }
    );

    next();

  }
);


/*
=========================================================
 CORS
=========================================================

Same-origin frontend requests do not require CORS.

If the frontend is hosted separately, set:

  CORS_ORIGIN=https://example.com

Multiple origins:

  CORS_ORIGIN=https://example.com,https://www.example.com

=========================================================
*/

const corsOrigin =
  process.env.CORS_ORIGIN;

if (corsOrigin) {

  const allowedOrigins =
    corsOrigin
      .split(',')
      .map(
        value =>
          value.trim()
      )
      .filter(Boolean);

  app.use(
    function corsMiddleware(
      req,
      res,
      next
    ) {

      const origin =
        req.headers.origin;

      if (
        origin &&
        allowedOrigins.includes(origin)
      ) {

        res.setHeader(
          'Access-Control-Allow-Origin',
          origin
        );

        res.setHeader(
          'Vary',
          'Origin'
        );

        res.setHeader(
          'Access-Control-Allow-Credentials',
          'true'
        );

        res.setHeader(
          'Access-Control-Allow-Headers',
          'Content-Type, Authorization'
        );

        res.setHeader(
          'Access-Control-Allow-Methods',
          'GET, POST, PUT, PATCH, DELETE, OPTIONS'
        );

      }

      if (
        req.method === 'OPTIONS'
      ) {

        return res.sendStatus(204);

      }

      next();

    }
  );

}


/*
=========================================================
 API HEALTH
=========================================================
*/

app.get(
  '/api/health',
  function health(
    req,
    res
  ) {

    res.status(200).json({

      success: true,

      service:
        'GTF Banking API',

      status:
        'online',

      timestamp:
        new Date().toISOString(),

      environment:
        process.env.NODE_ENV ||
        'development'

    });

  }
);


/*
=========================================================
 API ROUTER
=========================================================
*/

const apiRouter =
  require('./api/router');

app.use(
  '/api',
  apiRouter
);


/*
=========================================================
 FRONTEND STATIC FILES
=========================================================
*/

app.use(
  express.static(
    FRONTEND_DIR,
    {
      extensions: [
        'html'
      ],

      index:
        'index.html',

      maxAge:
        process.env.NODE_ENV ===
        'production'
          ? '1h'
          : 0
    }
  )
);


/*
=========================================================
 ADMIN ROOT
=========================================================
*/

app.get(
  '/admin',
  function (
    req,
    res
  ) {

    res.sendFile(
      path.join(
        FRONTEND_DIR,
        'admin',
        'index.html'
      )
    );

  }
);


/*
=========================================================
 ADMIN ROOT WITH TRAILING SLASH
=========================================================
*/

app.get(
  '/admin/',
  function (
    req,
    res
  ) {

    res.sendFile(
      path.join(
        FRONTEND_DIR,
        'admin',
        'index.html'
      )
    );

  }
);


/*
=========================================================
 MANAGER ROOT
=========================================================
*/

app.get(
  '/manager',
  function (
    req,
    res
  ) {

    res.sendFile(
      path.join(
        FRONTEND_DIR,
        'manager',
        'index.html'
      )
    );

  }
);

app.get(
  '/manager/',
  function (
    req,
    res
  ) {

    res.sendFile(
      path.join(
        FRONTEND_DIR,
        'manager',
        'index.html'
      )
    );

  }
);


/*
=========================================================
 CASHIER ROOT
=========================================================
*/

app.get(
  '/cashier',
  function (
    req,
    res
  ) {

    res.sendFile(
      path.join(
        FRONTEND_DIR,
        'cashier',
        'index.html'
      )
    );

  }
);

app.get(
  '/cashier/',
  function (
    req,
    res
  ) {

    res.sendFile(
      path.join(
        FRONTEND_DIR,
        'cashier',
        'index.html'
      )
    );

  }
);


/*
=========================================================
 CUSTOMER DASHBOARD ROOT
=========================================================
*/

app.get(
  '/dashboard',
  function (
    req,
    res
  ) {

    res.sendFile(
      path.join(
        FRONTEND_DIR,
        'dashboard',
        'index.html'
      )
    );

  }
);

app.get(
  '/dashboard/',
  function (
    req,
    res
  ) {

    res.sendFile(
      path.join(
        FRONTEND_DIR,
        'dashboard',
        'index.html'
      )
    );

  }
);


/*
=========================================================
 API 404
=========================================================
*/

app.use(
  '/api',
  function apiNotFound(
    req,
    res
  ) {

    res.status(404).json({

      success: false,

      error:
        'API endpoint not found.',

      method:
        req.method,

      path:
        req.originalUrl

    });

  }
);


/*
=========================================================
 FRONTEND 404
=========================================================
*/

app.use(
  function frontendNotFound(
    req,
    res
  ) {

    if (
      req.accepts('html')
    ) {

      return res.status(404).send(`
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Page Not Found | GTF Banking</title>
<style>
body{
  margin:0;
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  font-family:Arial,sans-serif;
  background:#f4f7fa;
  color:#0b2a4a;
}
.card{
  max-width:520px;
  margin:20px;
  padding:40px;
  background:#fff;
  border:1px solid #dce4eb;
  border-radius:12px;
  text-align:center;
}
a{
  color:#145da0;
}
</style>
</head>
<body>
<div class="card">
<h1>404</h1>
<h2>Page not found</h2>
<p>The requested GTF Banking page does not exist.</p>
<a href="/">Return to GTF Banking</a>
</div>
</body>
</html>
      `);

    }

    res.status(404).json({

      success: false,

      error:
        'Resource not found.'

    });

  }
);


/*
=========================================================
 GLOBAL ERROR HANDLER
=========================================================
*/

app.use(
  function errorHandler(
    error,
    req,
    res,
    next
  ) {

    console.error(
      'GTF SERVER ERROR:',
      error
    );

    if (
      res.headersSent
    ) {

      return next(error);

    }

    const status =
      Number(error.statusCode) ||
      Number(error.status) ||
      500;


    if (
      req.originalUrl.startsWith(
        '/api'
      )
    ) {

      return res
        .status(
          status >= 400 &&
          status < 600
            ? status
            : 500
        )
        .json({

          success: false,

          error:
            process.env.NODE_ENV ===
            'production'
              ? 'Internal server error.'
              : (
                error.message ||
                'Internal server error.'
              )

        });

    }


    res.status(
      status >= 400 &&
      status < 600
        ? status
        : 500
    ).send(
      'Internal server error.'
    );

  }
);


/*
=========================================================
 START SERVER
=========================================================
*/

const server =
  app.listen(
    PORT,
    HOST,
    function () {

      console.log('');
      console.log(
        '=============================================='
      );
      console.log(
        ' GTF BANKING API SERVER'
      );
      console.log(
        '=============================================='
      );

      console.log(
        `Environment: ${
          process.env.NODE_ENV ||
          'development'
        }`
      );

      console.log(
        `Server: http://${HOST}:${PORT}`
      );

      console.log(
        `Frontend: ${FRONTEND_DIR}`
      );

      console.log(
        'API base: /api'
      );

      console.log(
        'Health: /api/health'
      );

      console.log(
        '=============================================='
      );
      console.log('');

    }
  );


/*
=========================================================
 GRACEFUL SHUTDOWN
=========================================================
*/

function shutdown(
  signal
) {

  console.log(
    `${signal} received. Shutting down GTF server...`
  );

  server.close(
    function () {

      console.log(
        'GTF server stopped.'
      );

      process.exit(0);

    }
  );

}


process.on(
  'SIGTERM',
  () => shutdown('SIGTERM')
);

process.on(
  'SIGINT',
  () => shutdown('SIGINT')
);


module.exports = app;