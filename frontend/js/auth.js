/* ============================================================
   GLOBAL TRUSTFUND
   AUTH.JS
   ------------------------------------------------------------
   Frontend authentication controller.

   Works with:
   - frontend/js/api.js
   - login.html
   - signup.html
   - forgot-password.html
   - reset-password.html
   - dashboard pages
   - admin / manager / cashier portals

   Backend API base:
   /api
   ============================================================ */

(function (window) {
  "use strict";


  /* ==========================================================
     CONFIGURATION
     ========================================================== */

  const AUTH_CONFIG = {

    LOGIN_PAGE: "login.html",

    SIGNUP_PAGE: "signup.html",

    DEFAULT_AFTER_LOGIN: "dashboard/index.html",

    ADMIN_PAGE: "admin/index.html",

    MANAGER_PAGE: "manager/index.html",

    CASHIER_PAGE: "cashier/index.html",

    FORGOT_PASSWORD_PAGE:
      "forgot-password.html",

    RESET_PASSWORD_PAGE:
      "reset-password.html"

  };


  /* ==========================================================
     BASIC HELPERS
     ========================================================== */

  function getApi() {

    if (!window.GTF_API) {

      throw new Error(
        "GTF_API is not available. Make sure js/api.js is loaded before auth.js."
      );

    }

    return window.GTF_API;

  }


  function showAlert(
    container,
    type,
    message
  ) {

    if (!container) {
      return;
    }

    const safeMessage =
      String(message || "Something went wrong.");

    container.innerHTML = `
      <div class="alert alert-${escapeHtml(type)}" role="alert">
        ${escapeHtml(safeMessage)}
      </div>
    `;

  }


  function escapeHtml(value) {

    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  }


  function normalizeEmail(email) {

    return String(email || "")
      .trim()
      .toLowerCase();

  }


  function getElement(id) {

    return document.getElementById(id);

  }


  function getInputValue(id) {

    const element =
      getElement(id);

    return element
      ? element.value.trim()
      : "";

  }


  function setButtonLoading(
    button,
    loading,
    loadingText,
    normalText
  ) {

    if (!button) {
      return;
    }

    if (loading) {

      button.disabled = true;

      button.dataset.originalText =
        normalText ||
        button.textContent;

      button.textContent =
        loadingText ||
        "Please wait...";

    } else {

      button.disabled = false;

      button.textContent =
        normalText ||
        button.dataset.originalText ||
        "Continue";

    }

  }


  /* ==========================================================
     PASSWORD VALIDATION
     ========================================================== */

  function passwordStrength(password) {

    let score = 0;

    password =
      String(password || "");


    if (password.length >= 8) {
      score++;
    }

    if (password.length >= 12) {
      score++;
    }

    if (/[a-z]/.test(password)) {
      score++;
    }

    if (/[A-Z]/.test(password)) {
      score++;
    }

    if (/[0-9]/.test(password)) {
      score++;
    }

    if (/[^A-Za-z0-9]/.test(password)) {
      score++;
    }


    /*
     * Convert the result to a maximum of 5.
     */

    return Math.min(score, 5);

  }


  function validatePassword(password) {

    password =
      String(password || "");


    if (password.length < 8) {
      return false;
    }

    if (!/[a-z]/.test(password)) {
      return false;
    }

    if (!/[A-Z]/.test(password)) {
      return false;
    }

    if (!/[0-9]/.test(password)) {
      return false;
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      return false;
    }

    return true;

  }


  function validateEmail(email) {

    const value =
      normalizeEmail(email);

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      .test(value);

  }


  /* ==========================================================
     SIGN UP
     ========================================================== */

  async function signup(payload) {

    if (!payload) {

      throw new Error(
        "Registration information is required."
      );

    }


    const firstName =
      String(payload.first_name || "").trim();

    const lastName =
      String(payload.last_name || "").trim();

    const email =
      normalizeEmail(payload.email);

    const phone =
      String(payload.phone || "").trim();

    const accountType =
      String(payload.account_type || "").trim();

    const country =
      String(payload.country || "").trim();

    const password =
      String(payload.password || "");


    if (!firstName) {

      throw new Error(
        "Please enter your first name."
      );

    }


    if (!lastName) {

      throw new Error(
        "Please enter your last name."
      );

    }


    if (!validateEmail(email)) {

      throw new Error(
        "Please enter a valid email address."
      );

    }


    if (!phone) {

      throw new Error(
        "Please enter your phone number."
      );

    }


    if (!accountType) {

      throw new Error(
        "Please select an account type."
      );

    }


    if (!country) {

      throw new Error(
        "Please select your country."
      );

    }


    if (!validatePassword(password)) {

      throw new Error(
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
      );

    }


    const api =
      getApi();


    return api.auth.signup({

      first_name: firstName,

      last_name: lastName,

      email,

      phone,

      account_type: accountType,

      country,

      password

    });

  }


  /* ==========================================================
     LOGIN
     ========================================================== */

  async function login(
    email,
    password,
    rememberMe
  ) {

    email =
      normalizeEmail(email);

    password =
      String(password || "");


    if (!validateEmail(email)) {

      throw new Error(
        "Please enter a valid email address."
      );

    }


    if (!password) {

      throw new Error(
        "Please enter your password."
      );

    }


    const api =
      getApi();


    const data =
      await api.auth.login(
        email,
        password,
        rememberMe !== false
      );


    return data;

  }


  /* ==========================================================
     LOGOUT
     ========================================================== */

  async function logout(
    redirect = true
  ) {

    const api =
      getApi();


    try {

      await api.auth.logout();

    } catch (error) {

      /*
       * Always clear local authentication state,
       * even if the server cannot be reached.
       */

      console.warn(
        "GTF logout request failed:",
        error
      );

      api.clearSession();

    }


    if (redirect) {

      window.location.href =
        getRelativePage(
          AUTH_CONFIG.LOGIN_PAGE
        );

    }

  }


  /* ==========================================================
     CURRENT USER
     ========================================================== */

  async function getCurrentUser(
    refresh = false
  ) {

    const api =
      getApi();


    if (!refresh) {

      const cached =
        api.getCurrentUser();

      if (cached) {
        return cached;
      }

    }


    try {

      const response =
        await api.auth.me();


      return (
        response.user ||
        response.profile ||
        response ||
        null
      );

    } catch (error) {

      if (error.status === 401) {
        return null;
      }

      throw error;

    }

  }


  /* ==========================================================
     AUTHENTICATION CHECK
     ========================================================== */

  function isAuthenticated() {

    const api =
      getApi();

    return api.isAuthenticated();

  }


  async function requireAuth(
    redirect = true
  ) {

    if (!isAuthenticated()) {

      if (redirect) {

        redirectToLogin();

      }

      return false;

    }


    try {

      const user =
        await getCurrentUser();


      if (!user) {

        getApi().clearSession();

        if (redirect) {
          redirectToLogin();
        }

        return false;

      }


      return true;

    } catch (error) {

      console.error(
        "Authentication verification failed:",
        error
      );


      if (error.status === 401) {

        getApi().clearSession();

        if (redirect) {
          redirectToLogin();
        }

        return false;

      }


      /*
       * For temporary network errors, don't immediately
       * destroy a potentially valid local session.
       */

      return true;

    }

  }


  /* ==========================================================
     LOGIN REDIRECTION
     ========================================================== */

  function getUserRole(user) {

    if (!user) {
      return null;
    }


    return (
      user.role ||
      user.user_role ||
      user.account_role ||
      user.role_name ||
      (
        Array.isArray(user.roles) &&
        user.roles.length
          ? user.roles[0]
          : null
      )
    );

  }


  function normalizeRole(role) {

    return String(role || "")
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, "");

  }


  function getDashboardForRole(user) {

    const role =
      normalizeRole(
        getUserRole(user)
      );


    switch (role) {

      case "admin":

      case "administrator":

        return AUTH_CONFIG.ADMIN_PAGE;


      case "manager":

      case "branchmanager":

        return AUTH_CONFIG.MANAGER_PAGE;


      case "cashier":

      case "teller":

        return AUTH_CONFIG.CASHIER_PAGE;


      case "customer":

      case "user":

      case "client":

      default:

        return AUTH_CONFIG.DEFAULT_AFTER_LOGIN;

    }

  }


  async function redirectAfterLogin(
    user,
    explicitDestination = null
  ) {

    let destination =
      explicitDestination;


    if (!destination) {

      if (!user) {

        try {

          user =
            await getCurrentUser();

        } catch {
          user = null;
        }

      }


      destination =
        getDashboardForRole(user);

    }


    window.location.href =
      getRelativePage(destination);

  }


  /* ==========================================================
     LOGIN PAGE CONTROLLER
     ========================================================== */

  function initializeLoginForm() {

    const form =
      getElement("login-form");


    if (!form) {
      return;
    }


    const alertBox =
      getElement("alert-box");

    const submitButton =
      getElement("submit-btn");


    form.addEventListener(
      "submit",
      async function (event) {

        event.preventDefault();


        if (submitButton &&
            submitButton.disabled) {
          return;
        }


        const email =
          getInputValue("email");


        const passwordElement =
          getElement("password");


        const password =
          passwordElement
            ? passwordElement.value
            : "";


        const rememberElement =
          getElement("remember");


        const rememberMe =
          rememberElement
            ? rememberElement.checked
            : true;


        if (!validateEmail(email)) {

          showAlert(
            alertBox,
            "danger",
            "Please enter a valid email address."
          );

          return;

        }


        if (!password) {

          showAlert(
            alertBox,
            "danger",
            "Please enter your password."
          );

          return;

        }


        setButtonLoading(
          submitButton,
          true,
          "Signing in...",
          "Sign In"
        );


        try {

          const data =
            await login(
              email,
              password,
              rememberMe
            );


          showAlert(
            alertBox,
            "success",
            "Sign in successful. Redirecting..."
          );


          const user =
            data.user ||
            data.profile ||
            getApi().getCurrentUser();


          const destination =
            getDashboardForRole(user);


          setTimeout(
            function () {

              redirectAfterLogin(
                user,
                destination
              );

            },
            500
          );


        } catch (error) {

          console.error(
            "GTF login error:",
            error
          );


          let message =
            error.message ||
            "Unable to sign in. Please check your credentials and try again.";


          if (error.status === 401) {

            message =
              "The email or password you entered is incorrect.";

          }


          if (error.status === 403) {

            message =
              "Your account does not currently have permission to sign in.";

          }


          showAlert(
            alertBox,
            "danger",
            message
          );


        } finally {

          setButtonLoading(
            submitButton,
            false,
            "Signing in...",
            "Sign In"
          );

        }

      }
    );

  }


  /* ==========================================================
     SIGNUP PAGE CONTROLLER
     ========================================================== */

  function initializeSignupForm() {

    const form =
      getElement("signup-form");


    if (!form) {
      return;
    }


    const password =
      getElement("password");


    const confirmPassword =
      getElement("confirm_password");


    const strengthBar =
      getElement("strength-bar");


    const submitButton =
      getElement("submit-btn");


    const alertBox =
      getElement("alert-box");


    /*
     * Password strength display.
     */

    if (password && strengthBar) {

      password.addEventListener(
        "input",
        function () {

          const score =
            passwordStrength(
              password.value
            );


          strengthBar.style.width =
            `${Math.min(score * 20, 100)}%`;


          const strengthClasses = [
            "weak",
            "weak",
            "medium",
            "medium",
            "strong",
            "strong"
          ];


          strengthBar.className =
            "password-strength-bar " +
            (
              strengthClasses[score] ||
              "weak"
            );

        }
      );

    }


    /*
     * Confirm-password visual validation.
     */

    if (
      password &&
      confirmPassword
    ) {

      confirmPassword.addEventListener(
        "input",
        function () {

          if (!confirmPassword.value) {

            confirmPassword.classList.remove(
              "valid",
              "invalid"
            );

            return;

          }


          if (
            password.value ===
            confirmPassword.value
          ) {

            confirmPassword.classList.add(
              "valid"
            );

            confirmPassword.classList.remove(
              "invalid"
            );

          } else {

            confirmPassword.classList.add(
              "invalid"
            );

            confirmPassword.classList.remove(
              "valid"
            );

          }

        }
      );

    }


    /*
     * Registration submission.
     */

    form.addEventListener(
      "submit",
      async function (event) {

        event.preventDefault();


        if (
          submitButton &&
          submitButton.disabled
        ) {
          return;
        }


        const firstName =
          getInputValue("first_name");


        const lastName =
          getInputValue("last_name");


        const email =
          getInputValue("email");


        const phone =
          getInputValue("phone");


        const accountTypeElement =
          getElement("account_type");


        const countryElement =
          getElement("country");


        const passwordValue =
          password
            ? password.value
            : "";


        const confirmValue =
          confirmPassword
            ? confirmPassword.value
            : "";


        const termsElement =
          getElement("terms");


        const accountType =
          accountTypeElement
            ? accountTypeElement.value
            : "";


        const country =
          countryElement
            ? countryElement.value
            : "";


        const termsAccepted =
          termsElement
            ? termsElement.checked
            : false;


        /*
         * Client-side validation.
         */

        if (!firstName) {

          showAlert(
            alertBox,
            "danger",
            "Please enter your first name."
          );

          return;

        }


        if (!lastName) {

          showAlert(
            alertBox,
            "danger",
            "Please enter your last name."
          );

          return;

        }


        if (!validateEmail(email)) {

          showAlert(
            alertBox,
            "danger",
            "Please enter a valid email address."
          );

          return;

        }


        if (!phone) {

          showAlert(
            alertBox,
            "danger",
            "Please enter your phone number."
          );

          return;

        }


        if (!accountType) {

          showAlert(
            alertBox,
            "danger",
            "Please select an account type."
          );

          return;

        }


        if (!country) {

          showAlert(
            alertBox,
            "danger",
            "Please select your country."
          );

          return;

        }


        if (!validatePassword(passwordValue)) {

          showAlert(
            alertBox,
            "danger",
            "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
          );

          return;

        }


        if (
          passwordValue !==
          confirmValue
        ) {

          showAlert(
            alertBox,
            "danger",
            "Passwords do not match."
          );

          return;

        }


        if (!termsAccepted) {

          showAlert(
            alertBox,
            "danger",
            "Please accept the Terms of Service and Privacy Policy."
          );

          return;

        }


        setButtonLoading(
          submitButton,
          true,
          "Creating account...",
          "Create Account"
        );


        try {

          const data =
            await signup({

              first_name:
                firstName,

              last_name:
                lastName,

              email,

              phone,

              account_type:
                accountType,

              country,

              password:
                passwordValue

            });


          /*
           * Determine whether email confirmation
           * is required by the backend.
           */

          const requiresConfirmation =
            Boolean(
              data.requires_confirmation ||
              data.email_confirmation_required ||
              data.email_confirm_required ||
              (
                data.message &&
                String(data.message)
                  .toLowerCase()
                  .includes("confirm")
              )
            );


          if (requiresConfirmation) {

            showAlert(
              alertBox,
              "success",
              "Your account was created successfully. Please check your email and confirm your email address before signing in."
            );


            form.reset();


            if (strengthBar) {

              strengthBar.style.width =
                "0%";

              strengthBar.className =
                "password-strength-bar";

            }


          } else {

            showAlert(
              alertBox,
              "success",
              "Account created successfully. Redirecting to sign in..."
            );


            setTimeout(
              function () {

                window.location.href =
                  getRelativePage(
                    AUTH_CONFIG.LOGIN_PAGE
                  );

              },
              1200
            );

          }


        } catch (error) {

          console.error(
            "GTF signup error:",
            error
          );


          let message =
            error.message ||
            "Registration failed. Please try again.";


          if (error.status === 409) {

            message =
              "An account with this email address already exists.";

          }


          showAlert(
            alertBox,
            "danger",
            message
          );


        } finally {

          setButtonLoading(
            submitButton,
            false,
            "Creating account...",
            "Create Account"
          );

        }

      }
    );

  }


  /* ==========================================================
     FORGOT PASSWORD
     ========================================================== */

  function initializeForgotPasswordForm() {

    const form =
      getElement("forgot-password-form");


    if (!form) {
      return;
    }


    const emailElement =
      getElement("email");


    const alertBox =
      getElement("alert-box");


    const submitButton =
      getElement("submit-btn");


    form.addEventListener(
      "submit",
      async function (event) {

        event.preventDefault();


        const email =
          emailElement
            ? normalizeEmail(
                emailElement.value
              )
            : "";


        if (!validateEmail(email)) {

          showAlert(
            alertBox,
            "danger",
            "Please enter a valid email address."
          );

          return;

        }


        setButtonLoading(
          submitButton,
          true,
          "Sending...",
          "Send Reset Link"
        );


        try {

          await getApi()
            .auth
            .forgotPassword(email);


          /*
           * Do not reveal whether an email address
           * exists in the system.
           */

          showAlert(
            alertBox,
            "success",
            "If an account exists for that email address, password reset instructions have been sent."
          );


          form.reset();


        } catch (error) {

          console.error(
            "GTF password reset request error:",
            error
          );


          showAlert(
            alertBox,
            "danger",
            error.message ||
            "Unable to process your request. Please try again."
          );


        } finally {

          setButtonLoading(
            submitButton,
            false,
            "Sending...",
            "Send Reset Link"
          );

        }

      }
    );

  }


  /* ==========================================================
     RESET PASSWORD
     ========================================================== */

  function getResetToken() {

    const params =
      new URLSearchParams(
        window.location.search
      );


    return (
      params.get("token") ||
      params.get("access_token") ||
      ""
    );

  }


  function initializeResetPasswordForm() {

    const form =
      getElement("reset-password-form");


    if (!form) {
      return;
    }


    const passwordElement =
      getElement("password");


    const confirmElement =
      getElement("confirm_password");


    const alertBox =
      getElement("alert-box");


    const submitButton =
      getElement("submit-btn");


    const strengthBar =
      getElement("strength-bar");


    const token =
      getResetToken();


    /*
     * Password strength.
     */

    if (
      passwordElement &&
      strengthBar
    ) {

      passwordElement.addEventListener(
        "input",
        function () {

          const score =
            passwordStrength(
              passwordElement.value
            );


          strengthBar.style.width =
            `${Math.min(score * 20, 100)}%`;

        }
      );

    }


    form.addEventListener(
      "submit",
      async function (event) {

        event.preventDefault();


        const password =
          passwordElement
            ? passwordElement.value
            : "";


        const confirm =
          confirmElement
            ? confirmElement.value
            : "";


        if (!token) {

          showAlert(
            alertBox,
            "danger",
            "The password reset link is missing or invalid."
          );

          return;

        }


        if (!validatePassword(password)) {

          showAlert(
            alertBox,
            "danger",
            "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
          );

          return;

        }


        if (password !== confirm) {

          showAlert(
            alertBox,
            "danger",
            "Passwords do not match."
          );

          return;

        }


        setButtonLoading(
          submitButton,
          true,
          "Updating password...",
          "Reset Password"
        );


        try {

          await getApi()
            .auth
            .resetPassword(
              token,
              password
            );


          showAlert(
            alertBox,
            "success",
            "Your password has been updated successfully. Redirecting to sign in..."
          );


          form.reset();


          setTimeout(
            function () {

              window.location.href =
                getRelativePage(
                  AUTH_CONFIG.LOGIN_PAGE
                );

            },
            1500
          );


        } catch (error) {

          console.error(
            "GTF reset password error:",
            error
          );


          showAlert(
            alertBox,
            "danger",
            error.message ||
            "Unable to reset your password. The link may have expired."
          );


        } finally {

          setButtonLoading(
            submitButton,
            false,
            "Updating password...",
            "Reset Password"
          );

        }

      }
    );

  }


  /* ==========================================================
     LOGOUT BUTTONS
     ========================================================== */

  function initializeLogoutButtons() {

    document
      .querySelectorAll(
        '[data-action="logout"], .logout-btn'
      )
      .forEach(
        function (button) {

          button.addEventListener(
            "click",
            async function (event) {

              event.preventDefault();

              await logout(true);

            }
          );

        }
      );

  }


  /* ==========================================================
     AUTH GUARD FOR ELEMENTS
     ========================================================== */

  async function initializeProtectedPage() {

    const protectedPage =
      document.body &&
      (
        document.body.dataset.authRequired ===
        "true"
      );


    if (!protectedPage) {
      return;
    }


    await requireAuth(true);

  }


  /* ==========================================================
     REDIRECT ALREADY AUTHENTICATED USERS
     ========================================================== */

  async function redirectIfAuthenticated() {

    const authPage =
      document.body &&
      (
        document.body.dataset.authPage ===
        "true"
      );


    if (!authPage) {
      return;
    }


    if (!isAuthenticated()) {
      return;
    }


    try {

      const user =
        await getCurrentUser();


      if (user) {

        /*
         * Avoid redirect loops on pages that explicitly
         * allow authenticated users.
         */

        const allowAuthenticated =
          document.body.dataset
            .allowAuthenticated ===
          "true";


        if (!allowAuthenticated) {

          await redirectAfterLogin(
            user
          );

        }

      }

    } catch (error) {

      console.warn(
        "Unable to verify existing authentication:",
        error
      );

    }

  }


  /* ==========================================================
     RELATIVE PAGE HANDLING
     ========================================================== */

  function getRelativePage(
    target
  ) {

    if (!target) {
      return AUTH_CONFIG.LOGIN_PAGE;
    }


    /*
     * Keep absolute URLs unchanged.
     */

    if (
      target.startsWith("http://") ||
      target.startsWith("https://") ||
      target.startsWith("/")
    ) {

      return target;

    }


    const path =
      window.location.pathname;


    /*
     * Pages inside /dashboard, /admin,
     * /manager or /cashier require ../
     * to reach frontend root.
     */

    if (
      path.includes("/dashboard/") ||
      path.includes("/admin/") ||
      path.includes("/manager/") ||
      path.includes("/cashier/")
    ) {

      if (
        target.startsWith("../") ||
        target.startsWith("/")
      ) {

        return target;

      }

      return `../${target}`;

    }


    return target;

  }


  function redirectToLogin() {

    const current =
      window.location.pathname +
      window.location.search;


    const loginPage =
      getRelativePage(
        AUTH_CONFIG.LOGIN_PAGE
      );


    /*
     * Preserve the page the user was trying
     * to access.
     */

    const separator =
      loginPage.includes("?")
        ? "&"
        : "?";


    window.location.href =
      `${loginPage}${separator}redirect=${encodeURIComponent(current)}`;

  }


  /* ==========================================================
     INITIALIZATION
     ========================================================== */

  function initialize() {

    initializeLoginForm();

    initializeSignupForm();

    initializeForgotPasswordForm();

    initializeResetPasswordForm();

    initializeLogoutButtons();

    initializeProtectedPage();

    redirectIfAuthenticated();

  }


  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initialize
    );

  } else {

    initialize();

  }


  /* ==========================================================
     PUBLIC AUTH API
     ========================================================== */

  const GTF_AUTH = {

    config: AUTH_CONFIG,

    signup,

    login,

    logout,

    getCurrentUser,

    isAuthenticated,

    requireAuth,

    redirectAfterLogin,

    redirectToLogin,

    getDashboardForRole,

    getUserRole,

    validateEmail,

    validatePassword,

    passwordStrength

  };


  /*
   * Make authentication globally available.
   */

  window.GTF_AUTH =
    GTF_AUTH;


  /*
   * Backward compatibility with existing code.
   */

  window.GTF_APP =
    window.GTF_APP || {};

  window.GTF_APP.auth =
    GTF_AUTH;

  window.GTF_APP.validatePassword =
    validatePassword;

  window.GTF_APP.passwordStrength =
    passwordStrength;

})(window);