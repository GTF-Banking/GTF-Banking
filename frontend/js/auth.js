/*
 * ============================================================
 * GTF-Banking
 * frontend/js/auth.js
 * ============================================================
 *
 * Authentication controller for:
 *   - Login
 *   - Signup
 *   - Session checking
 *   - Logout
 *   - Protected-page handling
 *
 * Works with:
 *
 *   frontend/js/app.js
 *
 * Backend endpoints expected:
 *
 *   POST /api/auth/login
 *   POST /api/auth/signup
 *   GET  /api/auth/me
 *   POST /api/auth/logout
 *
 * Authentication is handled by secure server-side
 * session cookies.
 *
 * NEVER store:
 *   - Passwords
 *   - PINs
 *   - Session tokens
 *   - Access tokens
 *   - Secret keys
 * in localStorage.
 *
 * ============================================================
 */

(function () {

  "use strict";


  /* ==========================================================
     CONFIGURATION
  ========================================================== */

  const AUTH_CONFIG = {

    endpoints: {

      login:
        "/api/auth/login",

      signup:
        "/api/auth/signup",

      me:
        "/api/auth/me",

      logout:
        "/api/auth/logout"

    },


    pages: {

      login:
        "/login.html",

      signup:
        "/signup.html",

      dashboard:
        "/dashboard/index.html",

      home:
        "/index.html"

    }

  };


  /* ==========================================================
     STATE
  ========================================================== */

  const authState = {

    initialized:
      false,

    checking:
      false,

    authenticated:
      false,

    user:
      null

  };


  /* ==========================================================
     APP REFERENCE
  ========================================================== */

  function getApp() {

    return window.GTFBanking ||
      null;

  }


  /* ==========================================================
     API REQUEST
  ========================================================== */

  async function request(
    endpoint,
    options = {}
  ) {

    const app =
      getApp();


    /*
     * Prefer the shared API helper from app.js.
     */

    if (
      app &&
      typeof app.apiRequest ===
      "function"
    ) {

      return app.apiRequest(
        endpoint,
        options
      );

    }


    /*
     * Fallback request in case auth.js
     * is loaded before app.js.
     */

    const {

      method = "GET",

      body = undefined,

      headers = {},

      signal = undefined

    } = options;


    const requestHeaders = {

      Accept:
        "application/json",

      ...headers

    };


    let requestBody =
      body;


    if (
      body !== undefined &&
      body !== null &&
      typeof body !== "string" &&
      !(body instanceof FormData)
    ) {

      requestHeaders[
        "Content-Type"
      ] =
        "application/json";


      requestBody =
        JSON.stringify(
          body
        );

    }


    const response =
      await fetch(
        endpoint,
        {

          method,

          credentials:
            "include",

          headers:
            requestHeaders,

          body:
            requestBody,

          signal

        }
      );


    let data =
      null;


    const contentType =
      response.headers.get(
        "content-type"
      ) || "";


    if (
      contentType.includes(
        "application/json"
      )
    ) {

      try {

        data =
          await response.json();

      } catch {

        data =
          null;

      }

    } else {

      try {

        const text =
          await response.text();


        data =
          text
            ? {
                message:
                  text
              }
            : null;

      } catch {

        data =
          null;

      }

    }


    if (
      !response.ok
    ) {

      const error =
        new Error(
          data?.message ||
          data?.error ||
          "Authentication request failed."
        );


      error.status =
        response.status;


      error.data =
        data;


      throw error;

    }


    return data;

  }


  /* ==========================================================
     NOTIFICATION
  ========================================================== */

  function notify(
    message,
    type = "info"
  ) {

    const app =
      getApp();


    if (
      app &&
      typeof app.showNotification ===
      "function"
    ) {

      return app.showNotification(
        message,
        type
      );

    }


    /*
     * Avoid browser alert() for normal
     * authentication messages.
     */

    console.log(
      `[${type}] ${message}`
    );

  }


  /* ==========================================================
     REDIRECT
  ========================================================== */

  function redirectTo(
    page
  ) {

    const app =
      getApp();


    if (
      app &&
      typeof app.redirectTo ===
      "function"
    ) {

      app.redirectTo(
        page
      );

      return;

    }


    window.location.assign(
      page
    );

  }


  /* ==========================================================
     USER HELPERS
  ========================================================== */

  function getUserName(
    user
  ) {

    if (
      !user
    ) {

      return "Customer";

    }


    const firstName =
      user.first_name ||
      user.firstName ||
      "";


    const lastName =
      user.last_name ||
      user.lastName ||
      "";


    return (
      user.name ||
      user.full_name ||
      user.fullName ||
      `${firstName} ${lastName}`.trim() ||
      "Customer"
    );

  }


  /* ==========================================================
     SESSION CHECK
  ========================================================== */

  async function checkSession(
    options = {}
  ) {

    const {

      redirectIfUnauthenticated =
        false,

      redirectIfAuthenticated =
        false,

      authenticatedPage =
        AUTH_CONFIG.pages.dashboard,

      loginPage =
        AUTH_CONFIG.pages.login

    } = options;


    if (
      authState.checking
    ) {

      return authState.user;

    }


    authState.checking =
      true;


    try {

      const data =
        await request(
          AUTH_CONFIG.endpoints.me,
          {
            method:
              "GET"
          }
        );


      const user =
        data?.user ||
        data?.data?.user ||
        null;


      authState.user =
        user;


      authState.authenticated =
        Boolean(
          user
        );


      /*
       * Synchronize app.js state.
       */

      const app =
        getApp();


      if (
        app &&
        app.state
      ) {

        app.state.user =
          user;

        app.state.authenticated =
          Boolean(
            user
          );

      }


      if (
        user &&
        redirectIfAuthenticated
      ) {

        redirectTo(
          authenticatedPage
        );

        return user;

      }


      if (
        !user &&
        redirectIfUnauthenticated
      ) {

        redirectTo(
          loginPage
        );

        return null;

      }


      return user;

    } catch (error) {

      authState.user =
        null;

      authState.authenticated =
        false;


      if (
        error.status === 401 ||
        error.status === 403
      ) {

        if (
          redirectIfUnauthenticated
        ) {

          redirectTo(
            loginPage
          );

        }

        return null;

      }


      console.error(
        "Session check failed:",
        error
      );


      return null;

    } finally {

      authState.checking =
        false;

    }

  }


  /* ==========================================================
     LOGIN
  ========================================================== */

  async function login(
    credentials
  ) {

    if (
      !credentials ||
      typeof credentials !==
      "object"
    ) {

      throw new Error(
        "Login information is required."
      );

    }


    const email =
      String(
        credentials.email ||
        ""
      )
      .trim();


    const password =
      String(
        credentials.password ||
        ""
      );


    if (
      !email
    ) {

      throw new Error(
        "Email address is required."
      );

    }


    if (
      !password
    ) {

      throw new Error(
        "Password is required."
      );

    }


    const data =
      await request(
        AUTH_CONFIG.endpoints.login,
        {

          method:
            "POST",

          body: {

            email,

            password

          }

        }
      );


    const user =
      data?.user ||
      data?.data?.user ||
      null;


    authState.user =
      user;


    authState.authenticated =
      Boolean(
        user
      );


    /*
     * Synchronize app.js state.
     */

    const app =
      getApp();


    if (
      app &&
      app.state
    ) {

      app.state.user =
        user;

      app.state.authenticated =
        Boolean(
          user
        );

    }


    return {

      success:
        true,

      user,

      data

    };

  }


  /* ==========================================================
     SIGNUP
  ========================================================== */

  async function signup(
    information
  ) {

    if (
      !information ||
      typeof information !==
      "object"
    ) {

      throw new Error(
        "Signup information is required."
      );

    }


    const data =
      await request(
        AUTH_CONFIG.endpoints.signup,
        {

          method:
            "POST",

          body:
            information

        }
      );


    const user =
      data?.user ||
      data?.data?.user ||
      null;


    /*
     * Some systems create the account without
     * automatically signing the customer in.
     *
     * Therefore we only mark the state as
     * authenticated when the backend actually
     * returns an authenticated user.
     */

    if (
      user
    ) {

      authState.user =
        user;

      authState.authenticated =
        true;

    }


    return {

      success:
        true,

      user,

      data

    };

  }


  /* ==========================================================
     LOGOUT
  ========================================================== */

  async function logout(
    options = {}
  ) {

    const {

      redirect = true,

      redirectPage =
        AUTH_CONFIG.pages.login

    } = options;


    try {

      await request(
        AUTH_CONFIG.endpoints.logout,
        {

          method:
            "POST"

        }
      );

    } catch (error) {

      /*
       * The local authentication state is
       * cleared regardless of the response.
       */

      console.warn(
        "Logout request failed:",
        error
      );

    } finally {

      authState.user =
        null;

      authState.authenticated =
        false;


      const app =
        getApp();


      if (
        app &&
        app.state
      ) {

        app.state.user =
          null;

        app.state.authenticated =
          false;

      }


      if (
        redirect
      ) {

        redirectTo(
          redirectPage
        );

      }

    }

  }


  /* ==========================================================
     LOGIN FORM
  ========================================================== */

  function findLoginForm() {

    return (

      document.querySelector(
        "#loginForm"
      ) ||

      document.querySelector(
        "form[data-auth-login]"
      ) ||

      document.querySelector(
        "form"
      )

    );

  }


  function setupLoginForm() {

    const form =
      findLoginForm();


    if (
      !form
    ) {

      return;

    }


    /*
     * Prevent binding the same form twice.
     */

    if (
      form.dataset
        .gtfAuthLoginBound ===
      "true"
    ) {

      return;

    }


    form.dataset
      .gtfAuthLoginBound =
      "true";


    form.addEventListener(
      "submit",
      async event => {

        event.preventDefault();


        const emailInput =
          form.querySelector(
            '[name="email"], #email'
          );


        const passwordInput =
          form.querySelector(
            '[name="password"], #password'
          );


        const submitButton =
          form.querySelector(
            'button[type="submit"], input[type="submit"]'
          );


        const email =
          emailInput?.value?.trim() ||
          "";


        const password =
          passwordInput?.value ||
          "";


        if (
          !email
        ) {

          notify(
            "Enter your email address.",
            "warning"
          );


          emailInput?.focus();


          return;

        }


        if (
          !password
        ) {

          notify(
            "Enter your password.",
            "warning"
          );


          passwordInput?.focus();


          return;

        }


        const originalButtonText =
          submitButton?.textContent ||
          "Sign in";


        if (
          submitButton
        ) {

          submitButton.disabled =
            true;


          submitButton.setAttribute(
            "aria-busy",
            "true"
          );


          submitButton.textContent =
            "Signing in...";

        }


        try {

          await login(
            {

              email,

              password

            }
          );


          notify(
            "Sign in successful.",
            "success"
          );


          /*
           * Never pass passwords through the URL.
           */

          redirectTo(
            AUTH_CONFIG.pages.dashboard
          );

        } catch (error) {

          console.error(
            "Login failed:",
            error
          );


          notify(
            error.message ||
            "Unable to sign in.",
            "error"
          );

        } finally {

          if (
            submitButton
          ) {

            submitButton.disabled =
              false;


            submitButton.removeAttribute(
              "aria-busy"
            );


            submitButton.textContent =
              originalButtonText;

          }

        }

      }
    );

  }


  /* ==========================================================
     SIGNUP FORM
  ========================================================== */

  function findSignupForm() {

    return (

      document.querySelector(
        "#signupForm"
      ) ||

      document.querySelector(
        "form[data-auth-signup]"
      )

    );

  }


  function setupSignupForm() {

    const form =
      findSignupForm();


    if (
      !form
    ) {

      return;

    }


    if (
      form.dataset
        .gtfAuthSignupBound ===
      "true"
    ) {

      return;

    }


    form.dataset
      .gtfAuthSignupBound =
      "true";


    form.addEventListener(
      "submit",
      async event => {

        event.preventDefault();


        const formData =
          new FormData(
            form
          );


        const information =
          {};


        formData.forEach(
          (
            value,
            key
          ) => {

            if (
              typeof value ===
              "string"
            ) {

              information[key] =
                value.trim();

            } else {

              information[key] =
                value;

            }

          }
        );


        /*
         * Support common field names.
         */

        if (
          !information.email
        ) {

          notify(
            "Email address is required.",
            "warning"
          );


          return;

        }


        if (
          !information.password
        ) {

          notify(
            "Password is required.",
            "warning"
          );


          return;

        }


        const confirmPassword =
          information.confirmPassword ||
          information.confirm_password ||
          information.passwordConfirmation;


        if (
          confirmPassword !==
          undefined &&
          information.password !==
          confirmPassword
        ) {

          notify(
            "Passwords do not match.",
            "warning"
          );


          return;

        }


        const submitButton =
          form.querySelector(
            'button[type="submit"], input[type="submit"]'
          );


        const originalButtonText =
          submitButton?.textContent ||
          "Create account";


        if (
          submitButton
        ) {

          submitButton.disabled =
            true;


          submitButton.setAttribute(
            "aria-busy",
            "true"
          );


          submitButton.textContent =
            "Creating account...";

        }


        try {

          const result =
            await signup(
              information
            );


          notify(
            "Your account has been created successfully.",
            "success"
          );


          /*
           * If the backend automatically
           * authenticated the user, go directly
           * to the dashboard.
           */

          if (
            result.user
          ) {

            redirectTo(
              AUTH_CONFIG.pages.dashboard
            );

          } else {

            /*
             * Otherwise send the customer
             * to login.
             */

            redirectTo(
              AUTH_CONFIG.pages.login
            );

          }

        } catch (error) {

          console.error(
            "Signup failed:",
            error
          );


          notify(
            error.message ||
            "Unable to create your account.",
            "error"
          );

        } finally {

          if (
            submitButton
          ) {

            submitButton.disabled =
              false;


            submitButton.removeAttribute(
              "aria-busy"
            );


            submitButton.textContent =
              originalButtonText;

          }

        }

      }
    );

  }


  /* ==========================================================
     LOGOUT BUTTONS
  ========================================================== */

  function setupLogoutButtons() {

    const buttons =
      document.querySelectorAll(
        "[data-gtf-logout], #logoutButton, #logoutBtn"
      );


    buttons.forEach(
      button => {

        if (
          button.dataset
            .gtfAuthLogoutBound ===
          "true"
        ) {

          return;

        }


        button.dataset
          .gtfAuthLogoutBound =
          "true";


        button.addEventListener(
          "click",
          async event => {

            event.preventDefault();


            await logout();

          }
        );

      }
    );

  }


  /* ==========================================================
     PROTECTED PAGE
  ========================================================== */

  async function protectPage() {

    const body =
      document.body;


    if (
      !body
    ) {

      return null;

    }


    const requiresAuth =
      body.dataset.requiresAuth ===
      "true";


    if (
      !requiresAuth
    ) {

      return null;

    }


    return checkSession(
      {

        redirectIfUnauthenticated:
          true,

        loginPage:
          AUTH_CONFIG.pages.login

      }
    );

  }


  /* ==========================================================
     AUTHENTICATED-ONLY PAGE
     FOR LOGIN / SIGNUP
  ========================================================== */

  async function redirectAuthenticatedUsers() {

    const body =
      document.body;


    if (
      !body
    ) {

      return;

    }


    const redirectAuthenticated =
      body.dataset.redirectAuthenticated ===
      "true";


    if (
      !redirectAuthenticated
    ) {

      return;

    }


    await checkSession(
      {

        redirectIfAuthenticated:
          true,

        authenticatedPage:
          AUTH_CONFIG.pages.dashboard

      }
    );

  }


  /* ==========================================================
     DISPLAY USER
  ========================================================== */

  function displayUser() {

    const user =
      authState.user;


    if (
      !user
    ) {

      return;

    }


    const app =
      getApp();


    if (
      app &&
      typeof app.displayUserInformation ===
      "function"
    ) {

      app.displayUserInformation(
        user
      );


      return;

    }


    const name =
      getUserName(
        user
      );


    document
      .querySelectorAll(
        "[data-user-name], #userName"
      )
      .forEach(
        element => {

          element.textContent =
            name;

        }
      );


    document
      .querySelectorAll(
        "[data-user-email], #userEmail"
      )
      .forEach(
        element => {

          element.textContent =
            user.email ||
            "";

        }
      );


    document
      .querySelectorAll(
        "[data-user-role], #userRole"
      )
      .forEach(
        element => {

          element.textContent =
            user.role ||
            "";

        }
      );

  }


  /* ==========================================================
     PUBLIC AUTH API
  ========================================================== */

  window.GTFAuth = {

    config:
      AUTH_CONFIG,

    state:
      authState,

    request,

    login,

    signup,

    logout,

    checkSession,

    protectPage,

    getUser:
      () =>
        authState.user,

    isAuthenticated:
      () =>
        authState.authenticated

  };


  /* ==========================================================
     INITIALIZATION
  ========================================================== */

  async function initialize() {

    if (
      authState.initialized
    ) {

      return;

    }


    authState.initialized =
      true;


    setupLoginForm();

    setupSignupForm();

    setupLogoutButtons();


    /*
     * Login/signup pages can use:
     *
     * <body data-redirect-authenticated="true">
     *
     * Protected pages can use:
     *
     * <body data-requires-auth="true">
     */

    await redirectAuthenticatedUsers();


    const user =
      await protectPage();


    if (
      user
    ) {

      displayUser();

    }

  }


  /* ==========================================================
     DOM READY
  ========================================================== */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      {
        once:
          true
      }
    );

  } else {

    initialize();

  }


})();