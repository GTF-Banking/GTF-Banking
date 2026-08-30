/* =========================================================
   GLOBAL TRUSTFUND
   AUTHENTICATION CLIENT

   File:
   frontend/js/auth.js

   Purpose:
   - Signup
   - Login
   - Logout
   - Session management
   - Current-user retrieval
   - Role detection
   - Authentication guards
   - Redirect handling
   - Password reset helpers

   Depends on:
   frontend/js/api.js
   frontend/js/app.js

   ========================================================= */

(function (window, document) {

  "use strict";


  /* =======================================================
     CONFIGURATION
     ======================================================= */

  const CONFIG = {

    tokenKey:
      "gtf_token",

    userKey:
      "gtf_user",

    redirectKey:
      "gtf_redirect",

    defaultLogin:
      "/login.html",

    defaultCustomer:
      "/customer/index.html",

    defaultAdmin:
      "/admin/index.html",

    defaultManager:
      "/manager/index.html",

    defaultCashier:
      "/cashier/index.html",

    defaultDashboard:
      "/dashboard/index.html"
  };


  /* =======================================================
     INTERNAL HELPERS
     ======================================================= */

  function getStoredToken() {

    try {

      return (
        localStorage.getItem(
          CONFIG.tokenKey
        ) ||
        sessionStorage.getItem(
          CONFIG.tokenKey
        ) ||
        null
      );

    } catch {

      return null;
    }
  }


  function getStoredUser() {

    try {

      const value =
        localStorage.getItem(
          CONFIG.userKey
        );

      if (!value) {
        return null;
      }

      return JSON.parse(value);

    } catch {

      return null;
    }
  }


  function saveToken(token) {

    if (!token) {
      return;
    }

    try {

      localStorage.setItem(
        CONFIG.tokenKey,
        token
      );

    } catch {

      try {

        sessionStorage.setItem(
          CONFIG.tokenKey,
          token
        );

      } catch {
        /* Ignore storage failure. */
      }
    }
  }


  function saveUser(user) {

    if (!user) {
      return;
    }

    try {

      localStorage.setItem(
        CONFIG.userKey,
        JSON.stringify(user)
      );

    } catch {
      /* Ignore storage failure. */
    }
  }


  function removeAuthenticationData() {

    try {

      localStorage.removeItem(
        CONFIG.tokenKey
      );

      localStorage.removeItem(
        CONFIG.userKey
      );

      sessionStorage.removeItem(
        CONFIG.tokenKey
      );

    } catch {
      /* Ignore storage failure. */
    }
  }


  function extractToken(data) {

    if (!data) {
      return null;
    }

    return (
      data.token ||
      data.access_token ||
      data.accessToken ||
      data.session?.access_token ||
      data.session?.accessToken ||
      data.data?.token ||
      data.data?.access_token ||
      null
    );
  }


  function extractUser(data) {

    if (!data) {
      return null;
    }

    return (
      data.user ||
      data.profile ||
      data.customer ||
      data.data?.user ||
      data.data?.profile ||
      data.data?.customer ||
      null
    );
  }


  function normalizeRole(user) {

    if (!user) {
      return null;
    }

    const role =
      user.role ||
      user.user_role ||
      user.account_role ||
      user.userRole ||
      user.role_name ||
      user.roleName ||
      user.data?.role ||
      null;


    if (!role) {
      return null;
    }


    return String(role)
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, "");
  }


  function isPublicPage() {

    const path =
      window.location.pathname
        .toLowerCase();


    const page =
      path.split("/").pop();


    const publicPages = [
      "",
      "index.html",
      "login.html",
      "signup.html",
      "register.html",
      "forgot-password.html",
      "reset-password.html",
      "about.html",
      "business.html",
      "cards.html",
      "checking.html",
      "contact.html",
      "loans.html",
      "personal.html",
      "privacy.html",
      "savings.html",
      "security.html",
      "support.html",
      "terms.html"
    ];


    return publicPages.includes(
      page
    );
  }


  function storeRedirect() {

    try {

      const current =
        window.location.href;

      localStorage.setItem(
        CONFIG.redirectKey,
        current
      );

    } catch {
      /* Ignore storage failure. */
    }
  }


  function getRedirect() {

    try {

      return localStorage.getItem(
        CONFIG.redirectKey
      );

    } catch {

      return null;
    }
  }


  function clearRedirect() {

    try {

      localStorage.removeItem(
        CONFIG.redirectKey
      );

    } catch {
      /* Ignore storage failure. */
    }
  }


  /* =======================================================
     ROLE ROUTING
     ======================================================= */

  function roleDestination(role) {

    const normalized =
      String(role || "")
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, "");


    switch (normalized) {

      case "admin":
      case "administrator":
      case "superadmin":

        return CONFIG.defaultAdmin;


      case "manager":
      case "branchmanager":

        return CONFIG.defaultManager;


      case "cashier":
      case "teller":

        return CONFIG.defaultCashier;


      case "customer":
      case "client":
      case "user":

        return CONFIG.defaultCustomer;


      default:

        return CONFIG.defaultDashboard;
    }
  }


  /* =======================================================
     AUTH OBJECT
     ======================================================= */

  const GTF_AUTH = {


    /* =====================================================
       SIGN UP
       ===================================================== */

    async signup(formData) {

      if (
        !formData ||
        typeof formData !== "object"
      ) {

        throw new Error(
          "Registration information is required."
        );
      }


      const requiredFields = [
        "first_name",
        "last_name",
        "email",
        "phone",
        "account_type",
        "country",
        "password"
      ];


      for (
        const field of requiredFields
      ) {

        if (
          !String(
            formData[field] ?? ""
          ).trim()
        ) {

          throw new Error(
            `${this.fieldLabel(field)} is required.`
          );
        }
      }


      if (
        window.GTF_APP &&
        !GTF_APP.validateEmail(
          formData.email
        )
      ) {

        throw new Error(
          "Please enter a valid email address."
        );
      }


      if (
        window.GTF_APP &&
        !GTF_APP.validatePhone(
          formData.phone
        )
      ) {

        throw new Error(
          "Please enter a valid phone number."
        );
      }


      if (
        window.GTF_APP &&
        !GTF_APP.validatePassword(
          formData.password
        )
      ) {

        throw new Error(
          "Password does not meet the required security rules."
        );
      }


      const response =
        await GTF_API.auth.signup(
          formData
        );


      const token =
        extractToken(response);


      const user =
        extractUser(response);


      if (token) {
        saveToken(token);
      }


      if (user) {
        saveUser(user);
      }


      return response;
    },


    /* =====================================================
       LOGIN
       ===================================================== */

    async login(
      email,
      password
    ) {

      if (
        !email ||
        !String(email).trim()
      ) {

        throw new Error(
          "Email address is required."
        );
      }


      if (!password) {

        throw new Error(
          "Password is required."
        );
      }


      if (
        window.GTF_APP &&
        !GTF_APP.validateEmail(
          email
        )
      ) {

        throw new Error(
          "Please enter a valid email address."
        );
      }


      const response =
        await GTF_API.auth.login(
          String(email).trim(),
          password
        );


      const token =
        extractToken(response);


      const user =
        extractUser(response);


      if (!token) {

        /*
         * Some backends use cookies rather than
         * bearer tokens. In that case the response
         * may legitimately have no token.
         */

        if (
          response?.authenticated === false
        ) {

          throw new Error(
            "Sign in was not successful."
          );
        }

      } else {

        saveToken(token);
      }


      if (user) {
        saveUser(user);
      }


      return response;
    },


    /* =====================================================
       LOGOUT
       ===================================================== */

    async logout(
      redirect = CONFIG.defaultLogin
    ) {

      try {

        await GTF_API.auth.logout();

      } catch (error) {

        console.warn(
          "Remote logout failed:",
          error
        );
      }


      removeAuthenticationData();

      clearRedirect();


      if (redirect) {

        window.location.href =
          redirect;
      }


      return true;
    },


    /* =====================================================
       CURRENT USER
       ===================================================== */

    async getCurrentUser(
      refresh = false
    ) {

      const stored =
        getStoredUser();


      if (
        stored &&
        !refresh
      ) {

        return stored;
      }


      const token =
        getStoredToken();


      if (!token) {

        return stored;
      }


      try {

        const response =
          await GTF_API.auth.me();


        const user =
          extractUser(
            response
          ) ||
          response;


        if (user) {
          saveUser(user);
        }


        return user || null;

      } catch (error) {

        if (
          error.status === 401
        ) {

          removeAuthenticationData();

          return null;
        }


        /*
         * If the server is temporarily
         * unavailable, keep the locally
         * stored user rather than deleting
         * the session unnecessarily.
         */

        return stored;
      }
    },


    /* =====================================================
       IS AUTHENTICATED
       ===================================================== */

    isAuthenticated() {

      return Boolean(
        getStoredToken() ||
        getStoredUser()
      );
    },


    /* =====================================================
       TOKEN
       ===================================================== */

    getToken() {

      return getStoredToken();
    },


    /* =====================================================
       USER
       ===================================================== */

    getUser() {

      return getStoredUser();
    },


    /* =====================================================
       ROLE
       ===================================================== */

    getRole() {

      return normalizeRole(
        getStoredUser()
      );
    },


    /* =====================================================
       ROLE CHECK
       ===================================================== */

    hasRole(
      role
    ) {

      const current =
        this.getRole();


      if (!current || !role) {
        return false;
      }


      const expected =
        String(role)
          .trim()
          .toLowerCase()
          .replace(/[\s_-]+/g, "");


      return (
        current === expected
      );
    },


    hasAnyRole(
      roles = []
    ) {

      if (
        !Array.isArray(roles)
      ) {

        roles = [
          roles
        ];
      }


      return roles.some(
        (role) =>
          this.hasRole(role)
      );
    },


    /* =====================================================
       REQUIRE LOGIN
       ===================================================== */

    requireAuth(
      options = {}
    ) {

      const {

        loginUrl =
          CONFIG.defaultLogin,

        redirect =
          true

      } = options;


      if (
        this.isAuthenticated()
      ) {

        return true;
      }


      if (redirect) {

        storeRedirect();

        window.location.href =
          loginUrl;
      }


      return false;
    },


    /* =====================================================
       REQUIRE ROLE
       ===================================================== */

    requireRole(
      roles,
      options = {}
    ) {

      const {

        loginUrl =
          CONFIG.defaultLogin,

        unauthorizedUrl =
          "/index.html",

        redirect =
          true

      } = options;


      if (
        !this.requireAuth({
          loginUrl,
          redirect
        })
      ) {

        return false;
      }


      const allowed =
        Array.isArray(roles)
          ? roles
          : [roles];


      if (
        this.hasAnyRole(
          allowed
        )
      ) {

        return true;
      }


      if (redirect) {

        window.location.href =
          unauthorizedUrl;
      }


      return false;
    },


    /* =====================================================
       REDIRECT AFTER LOGIN
       ===================================================== */

    redirectAfterLogin(
      response = null
    ) {

      const user =
        extractUser(
          response
        ) ||
        getStoredUser();


      const role =
        normalizeRole(
          user
        );


      /*
       * If the user came from a protected
       * page, return there first.
       */

      const savedRedirect =
        getRedirect();


      if (
        savedRedirect &&
        savedRedirect !==
          window.location.href
      ) {

        clearRedirect();

        window.location.href =
          savedRedirect;

        return;
      }


      window.location.href =
        roleDestination(
          role
        );
    },


    /* =====================================================
       PASSWORD RESET
       ===================================================== */

    async forgotPassword(
      email
    ) {

      if (
        !email ||
        !String(email).trim()
      ) {

        throw new Error(
          "Email address is required."
        );
      }


      if (
        window.GTF_APP &&
        !GTF_APP.validateEmail(
          email
        )
      ) {

        throw new Error(
          "Please enter a valid email address."
        );
      }


      return GTF_API.auth
        .forgotPassword(
          String(email).trim()
        );
    },


    async resetPassword(
      token,
      password
    ) {

      if (!token) {

        throw new Error(
          "Password reset token is missing."
        );
      }


      if (
        window.GTF_APP &&
        !GTF_APP.validatePassword(
          password
        )
      ) {

        throw new Error(
          "Password does not meet the required security rules."
        );
      }


      return GTF_API.auth
        .resetPassword(
          token,
          password
        );
    },


    /* =====================================================
       FIELD LABEL
       ===================================================== */

    fieldLabel(
      field
    ) {

      const labels = {

        first_name:
          "First name",

        last_name:
          "Last name",

        email:
          "Email",

        phone:
          "Phone number",

        account_type:
          "Account type",

        country:
          "Country",

        password:
          "Password"
      };


      return (
        labels[field] ||
        String(field)
          .replace(/_/g, " ")
          .replace(
            /\b\w/g,
            (letter) =>
              letter.toUpperCase()
          )
      );
    },


    /* =====================================================
       LOGIN FORM HELPER
       ===================================================== */

    async handleLoginForm(
      form,
      options = {}
    ) {

      if (!form) {
        throw new Error(
          "Login form was not found."
        );
      }


      const email =
        form.querySelector(
          '[name="email"]'
        )?.value.trim();


      const password =
        form.querySelector(
          '[name="password"]'
        )?.value;


      const button =
        form.querySelector(
          'button[type="submit"]'
        );


      const alertBox =
        document.getElementById(
          "alert-box"
        );


      try {

        if (button) {

          button.disabled =
            true;

          button.dataset.originalText =
            button.textContent;

          button.textContent =
            options.loadingText ||
            "Signing in...";
        }


        if (
          alertBox
        ) {
          alertBox.innerHTML =
            "";
        }


        const response =
          await this.login(
            email,
            password
          );


        if (
          alertBox &&
          window.GTF_APP
        ) {

          GTF_APP.showAlert(
            alertBox,
            "success",
            "Sign in successful. Redirecting..."
          );
        }


        setTimeout(
          () => {

            this.redirectAfterLogin(
              response
            );

          },
          options.redirectDelay ||
            700
        );


        return response;

      } catch (error) {

        if (
          alertBox &&
          window.GTF_APP
        ) {

          GTF_APP.showAlert(
            alertBox,
            "danger",
            error.message ||
              "Unable to sign in."
          );
        }


        throw error;

      } finally {

        if (button) {

          button.disabled =
            false;

          button.textContent =
            button.dataset.originalText ||
            "Sign In";

          delete button.dataset
            .originalText;
        }
      }
    },


    /* =====================================================
       SIGNUP FORM HELPER
       ===================================================== */

    async handleSignupForm(
      form,
      options = {}
    ) {

      if (!form) {

        throw new Error(
          "Signup form was not found."
        );
      }


      const data =
        window.GTF_APP
          ? GTF_APP.formToObject(form)
          : this.serializeForm(form);


      const password =
        form.querySelector(
          '[name="password"]'
        )?.value;


      const confirm =
        form.querySelector(
          '[name="confirm_password"]'
        )?.value;


      if (
        password !== confirm
      ) {

        throw new Error(
          "Passwords do not match."
        );
      }


      const button =
        form.querySelector(
          'button[type="submit"]'
        );


      const alertBox =
        document.getElementById(
          "alert-box"
        );


      try {

        if (button) {

          button.disabled =
            true;

          button.dataset.originalText =
            button.textContent;

          button.textContent =
            options.loadingText ||
            "Creating account...";
        }


        if (alertBox) {
          alertBox.innerHTML =
            "";
        }


        delete data.confirm_password;


        delete data.terms;


        const response =
          await this.signup(
            data
          );


        const requiresConfirmation =
          Boolean(
            response?.requires_confirmation ||
            response?.email_confirmation_required ||
            response?.confirmation_required ||
            (
              response?.message &&
              String(
                response.message
              )
                .toLowerCase()
                .includes(
                  "confirm"
                )
            )
          );


        if (
          alertBox &&
          window.GTF_APP
        ) {

          if (
            requiresConfirmation
          ) {

            GTF_APP.showAlert(
              alertBox,
              "success",
              "Your account has been created. Please confirm your email address before signing in."
            );

          } else {

            GTF_APP.showAlert(
              alertBox,
              "success",
              "Your account has been created successfully."
            );
          }
        }


        if (
          options.resetForm !== false
        ) {
          form.reset();
        }


        if (
          !requiresConfirmation &&
          options.redirect !== false
        ) {

          setTimeout(
            () => {

              window.location.href =
                options.loginUrl ||
                CONFIG.defaultLogin;

            },
            options.redirectDelay ||
              1200
          );
        }


        return response;

      } catch (error) {

        if (
          alertBox &&
          window.GTF_APP
        ) {

          GTF_APP.showAlert(
            alertBox,
            "danger",
            error.message ||
              "Registration failed."
          );
        }


        throw error;

      } finally {

        if (button) {

          button.disabled =
            false;

          button.textContent =
            button.dataset.originalText ||
            "Create Account";

          delete button.dataset
            .originalText;
        }
      }
    },


    /* =====================================================
       SIMPLE FORM SERIALIZER
       ===================================================== */

    serializeForm(
      form
    ) {

      const data = {};

      const elements =
        form.querySelectorAll(
          "input, select, textarea"
        );


      elements.forEach(
        (element) => {

          if (!element.name) {
            return;
          }


          if (
            element.type ===
              "checkbox"
          ) {

            data[element.name] =
              element.checked;

            return;
          }


          if (
            element.type ===
              "radio"
          ) {

            if (
              element.checked
            ) {

              data[element.name] =
                element.value;
            }

            return;
          }


          data[element.name] =
            element.value;
        }
      );


      return data;
    },


    /* =====================================================
       INITIALIZE AUTH UI
       ===================================================== */

    init() {

      /*
       * Automatically display the current user's
       * name/email when matching data attributes
       * exist on a page.
       */

      const user =
        getStoredUser();


      if (!user) {
        return;
      }


      document
        .querySelectorAll(
          "[data-auth-user-name]"
        )
        .forEach(
          (element) => {

            element.textContent =
              user.first_name ||
              user.name ||
              "Customer";
          }
        );


      document
        .querySelectorAll(
          "[data-auth-user-email]"
        )
        .forEach(
          (element) => {

            element.textContent =
              user.email ||
              "";
          }
        );


      document
        .querySelectorAll(
          "[data-auth-role]"
        )
        .forEach(
          (element) => {

            element.textContent =
              user.role ||
              user.user_role ||
              "Customer";
          }
        );
    }
  };


  /* =======================================================
     GLOBAL EXPORT
     ======================================================= */

  window.GTF_AUTH =
    GTF_AUTH;


  /* =======================================================
     AUTO INITIALIZATION
     ======================================================= */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      () => {
        GTF_AUTH.init();
      }
    );

  } else {

    GTF_AUTH.init();
  }


})(window, document);
