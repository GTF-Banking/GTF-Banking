/* =========================================================
   GLOBAL TRUSTFUND BANKING
   BACKEND SERVER
   File: backend/main.js
   ========================================================= */

"use strict";

/* =========================================================
   1. DEPENDENCIES
   ========================================================= */

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");


/* =========================================================
   2. APPLICATION
   ========================================================= */

const app = express();


/* =========================================================
   3. CONFIGURATION
   ========================================================= */

const PORT =
    Number(process.env.PORT) || 3001;

const NODE_ENV =
    process.env.NODE_ENV || "development";


/* =========================================================
   4. SECURITY / REQUEST MIDDLEWARE
   ========================================================= */

app.disable("x-powered-by");

app.use(
    helmet({
        crossOriginResourcePolicy: {
            policy: "cross-origin"
        }
    })
);

app.use(
    cors({
        origin: true,
        credentials: true,
        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS"
        ],
        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "X-Requested-With"
        ]
    })
);

app.use(
    express.json({
        limit: "1mb"
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "1mb"
    })
);

app.use(
    morgan(
        NODE_ENV === "production"
            ? "combined"
            : "dev"
    )
);


/* =========================================================
   5. STATIC FRONTEND
   ========================================================= */

const frontendPath =
    path.join(__dirname, "..", "frontend");

app.use(
    express.static(frontendPath)
);


/* =========================================================
   6. ROOT ROUTE
   ========================================================= */

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            frontendPath,
            "index.html"
        )
    );

});


/* =========================================================
   7. API INFORMATION
   ========================================================= */

app.get("/api", (req, res) => {

    res.status(200).json({

        success: true,

        service:
            "Global TrustFund Banking API",

        version:
            "1.0.0",

        status:
            "online",

        environment:
            NODE_ENV,

        timestamp:
            new Date().toISOString(),

        endpoints: {

            health:
                "/api/health",

            auth:
                "/api/auth",

            users:
                "/api/users",

            roles:
                "/api/roles",

            transactions:
                "/api/transactions",

            dashboard:
                "/api/dashboard/summary"

        }

    });

});


/* =========================================================
   8. API ROUTER
   ========================================================= */

const apiRouter =
    require("./api/router");

app.use(
    "/api",
    apiRouter
);


/* =========================================================
   9. API 404 HANDLER
   ========================================================= */

app.use(
    "/api",
    (req, res) => {

        res.status(404).json({

            success: false,

            error:
                "API endpoint not found.",

            method:
                req.method,

            path:
                req.originalUrl,

            timestamp:
                new Date().toISOString()

        });

    }
);


/* =========================================================
   10. GENERAL 404 HANDLER
   ========================================================= */

app.use(
    (req, res) => {

        res.status(404).json({

            success: false,

            error:
                "Page or resource not found.",

            method:
                req.method,

            path:
                req.originalUrl

        });

    }
);


/* =========================================================
   11. GLOBAL ERROR HANDLER
   ========================================================= */

app.use(
    (err, req, res, next) => {

        console.error(
            "[GTF ERROR]",
            err
        );

        if (res.headersSent) {

            return next(err);

        }

        const statusCode =
            Number(err.statusCode) ||
            Number(err.status) ||
            500;

        res.status(statusCode).json({

            success: false,

            error:
                NODE_ENV === "production"
                    ? "Internal server error."
                    : err.message,

            ...(NODE_ENV !== "production"
                ? {
                    stack:
                        err.stack
                }
                : {}),

            timestamp:
                new Date().toISOString()

        });

    }
);


/* =========================================================
   12. SERVER START
   ========================================================= */

const server =
    app.listen(
        PORT,
        () => {

            console.log("");
            console.log(
                "================================================="
            );

            console.log(
                " GLOBAL TRUSTFUND BANKING API"
            );

            console.log(
                "================================================="
            );

            console.log(
                `Environment : ${NODE_ENV}`
            );

            console.log(
                `Port        : ${PORT}`
            );

            console.log(
                `API         : http://localhost:${PORT}/api`
            );

            console.log(
                `Health      : http://localhost:${PORT}/api/health`
            );

            console.log(
                "Status      : ONLINE"
            );

            console.log(
                "================================================="
            );

            console.log("");

        }
    );


/* =========================================================
   13. GRACEFUL SHUTDOWN
   ========================================================= */

function shutdown(signal) {

    console.log(
        `\n[GTF] ${signal} received. Shutting down...`
    );

    server.close(
        () => {

            console.log(
                "[GTF] HTTP server closed."
            );

            process.exit(0);

        }
    );

}


process.on(
    "SIGTERM",
    () => shutdown("SIGTERM")
);

process.on(
    "SIGINT",
    () => shutdown("SIGINT")
);


/* =========================================================
   14. UNHANDLED ERRORS
   ========================================================= */

process.on(
    "unhandledRejection",
    (reason) => {

        console.error(
            "[GTF] Unhandled Promise Rejection:",
            reason
        );

    }
);

process.on(
    "uncaughtException",
    (error) => {

        console.error(
            "[GTF] Uncaught Exception:",
            error
        );

        shutdown(
            "uncaughtException"
        );

    }
);


/* =========================================================
   15. EXPORT
   ========================================================= */

module.exports = app;


/* =========================================================
   END OF BACKEND MAIN SERVER
   ========================================================= */
