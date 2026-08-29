/* =========================================================
   GLOBAL TRUSTFUND
   CENTRAL NAVIGATION / ROUTE CONFIGURATION

   File:
   frontend/js/navigation.js
   ========================================================= */

(function () {

    "use strict";


    /* =====================================================
       GLOBAL PUBLIC ROUTES
       ===================================================== */

    const PUBLIC_ROUTES = {

        home:
            "/index.html",

        login:
            "/customer/login.html",

        register:
            "/customer/register.html",

        support:
            "/customer/support.html",

        security:
            "/customer/security.html"

    };


    /* =====================================================
       CUSTOMER ROUTES
       ===================================================== */

    const CUSTOMER_ROUTES = {

        dashboard:
            "/customer/dashboard.html",

        accounts:
            "/customer/accounts.html",

        transactions:
            "/customer/transactions.html",

        transfers:
            "/customer/transfers.html",

        payments:
            "/customer/payments.html",

        cards:
            "/customer/cards.html",

        beneficiaries:
            "/customer/beneficiaries.html",

        loans:
            "/customer/loans.html",

        statements:
            "/customer/statements.html",

        notifications:
            "/customer/notifications.html",

        profile:
            "/customer/profile.html",

        security:
            "/customer/security.html",

        support:
            "/customer/support.html",

        signout:
            "/customer/signout.html"

    };


    /* =====================================================
       CASHIER ROUTES
       ===================================================== */

    const CASHIER_ROUTES = {

        dashboard:
            "/cashier/dashboard.html",

        customers:
            "/cashier/customers.html",

        deposits:
            "/cashier/deposits.html",

        withdrawals:
            "/cashier/withdrawals.html",

        transfers:
            "/cashier/transfers.html",

        transactions:
            "/cashier/transactions.html",

        approvals:
            "/cashier/approvals.html",

        drawer:
            "/cashier/drawer.html",

        support:
            "/cashier/support.html",

        profile:
            "/cashier/profile.html",

        signout:
            "/cashier/signout.html"

    };


    /* =====================================================
       MANAGEMENT ROUTES
       ===================================================== */

    const MANAGER_ROUTES = {

        dashboard:
            "/manager/dashboard.html",

        customers:
            "/manager/customers.html",

        accounts:
            "/manager/accounts.html",

        transactions:
            "/manager/transactions.html",

        approvals:
            "/manager/approvals.html",

        compliance:
            "/manager/compliance.html",

        fraud:
            "/manager/fraud.html",

        reports:
            "/manager/reports.html",

        staff:
            "/manager/staff.html",

        support:
            "/manager/support.html",

        profile:
            "/manager/profile.html",

        settings:
            "/manager/settings.html",

        signout:
            "/manager/signout.html"

    };


    /* =====================================================
       ADMIN ROUTES
       ===================================================== */

    const ADMIN_ROUTES = {

        dashboard:
            "/admin/dashboard.html",

        customers:
            "/admin/customers.html",

        users:
            "/admin/users.html",

        accounts:
            "/admin/accounts.html",

        transactions:
            "/admin/transactions.html",

        compliance:
            "/admin/compliance.html",

        fraud:
            "/admin/fraud.html",

        audit:
            "/admin/audit.html",

        reports:
            "/admin/reports.html",

        permissions:
            "/admin/permissions.html",

        staff:
            "/admin/staff.html",

        settings:
            "/admin/settings.html",

        system:
            "/admin/system.html",

        signout:
            "/admin/signout.html"

    };


    /* =====================================================
       EXPORT ROUTES
       ===================================================== */

    window.GTF_ROUTES = {

        public:
            PUBLIC_ROUTES,

        customer:
            CUSTOMER_ROUTES,

        cashier:
            CASHIER_ROUTES,

        manager:
            MANAGER_ROUTES,

        admin:
            ADMIN_ROUTES

    };


})();
