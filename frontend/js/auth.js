/* =========================================================
   GLOBAL TRUSTFUND
   AUTHENTICATION CLIENT
   frontend/js/auth.js

   Shared authentication logic for the frontend.

   Depends on:
     - api.js
     - app.js is optional for UI helpers
   ========================================================= */

(function (window) {
  "use strict";

  const STORAGE = {
    USER: "gtf_user",
    ROLE: "gtf_role",
    SESSION: "gtf_session",
    REMEMBER: "gtf_remember"
  };


  /* =======================================================
     INTERNAL HELPERS
     ======================================================= */

  function safeParse(value) {
    if (!value) return null;

    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }


  function getStorage(remember = true) {
    return remember
      ? localStorage
      : sessionStorage;
  }


  function getStoredUser() {
    try {
      return (
        safeParse(
          localStorage.getItem(STORAGE.USER)
        ) ||
        safeParse(
          sessionStorage.getItem(STORAGE.USER)
        ) ||
        null
      );
    } catch (error) {
      return null;
    }
  }


  function getStoredRole() {
    try {
      return (
        localStorage.getItem(STORAGE.ROLE) ||
        sessionStorage.getItem(STORAGE.ROLE) ||
        null
      );
    } catch (error) {
      return null;
    }
  }


  function saveUser(user, remember = true) {
    if (!user) return;

    try {
      const storage =
        getStorage(remember);

      storage.setItem(
        STORAGE.USER,
        JSON.stringify(user)
      );

      localStorage.removeItem(
        STORAGE.USER
      );

      sessionStorage.removeItem(
        STORAGE.USER
      );

      storage.setItem(
        STORAGE.USER,
        JSON.stringify(user)
      );

    } catch (error) {
      console.warn(
        "GTF: Could not save user session.",
        error
      );
    }
  }


  function saveRole(role, remember = true) {
    if (!role) return;

    try {
      const storage =
        getStorage(remember);

      localStorage.removeItem(
        STORAGE.ROLE
      );

      sessionStorage.removeItem(
        STORAGE.ROLE
      );

      storage.setItem(
        STORAGE.ROLE,
        role
      );

    } catch (error) {
      console.warn(
        "GTF: Could not save role.",
        error
      );
    }
  }


  function saveSession(session, remember = true) {
    if (!session) return;

    try {
      const storage =
        getStorage(remember);

      localStorage.removeItem(
        STORAGE.SESSION
      );

      sessionStorage.removeItem(
        STORAGE.SESSION
      );

      storage.setItem(
        STORAGE.SESSION,
        JSON.stringify(session)
      );

      storage.setItem(
        STORAGE.REMEMBER,
        remember
          ? "true"
          : "false"
      );

    } catch (error) {
      console.warn(
        "GTF: Could not save session.",
        error
      );
    }
  }


  function clearLocalAuth() {
    const keys = [
      STORAGE.USER,
      STORAGE.ROLE,
      STORAGE.SESSION,
      STORAGE.REMEMBER
    ];

    try {
      keys.forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      if (window.GTF_API) {
        window.GTF_API.clearTokens();
      }

    } catch (error) {
      console.warn(
        "GTF: Could not clear authentication data.",
        error
      );
    }
  }


  function normalizeAuthResponse(data) {
    if (!data) {
      return {
        data: null,
        user: null,
        role: null,
        session: null
      };
    }

    const user =
      data.user ||
      data.profile ||
      data.customer ||
      data.data?.user ||
      null;

    const session =
      data.session ||
      data.data?.session ||
      data.auth ||
      null;

    let role =
      data.role ||
      data.user_role ||
      data.data?.role ||
      user?.role ||
      null;

    if (
      typeof role === "object" &&
      role !== null
    ) {
      role =
        role.name ||
        role.slug ||
        role.role ||
        null;
    }

    return {
      data,
      user,
      role,
      session
    };
  }


  /* =======================================================
     SIGN UP
     ======================================================= */

  async function signup(payload) {

    if (!payload || typeof payload !== "object") {
      throw new Error(
        "Registration information is required."
      );
    }

    const response =
      await GTF_API.post(
        "/auth/signup",
        payload,
        {
          auth: false
        }
      );

    const normalized =
      normalizeAuthResponse(
        response
      );

    /*
     * Save tokens when the backend immediately
     * authenticates the newly registered account.
     */
    if (
      normalized.session ||
      response.access_token ||
      response.accessToken
    ) {

      GTF_API.saveTokens(
        response,
        true
      );
    }

    if (normalized.user) {
      saveUser(
        normalized.user,
        true
      );
    }

    if (normalized.role) {
      saveRole(
        normalized.role,
        true
      );
    }

    if (normalized.session) {
      saveSession(
        normalized.session,
        true
      );
    }

    return response;
  }


  /* =======================================================
     LOGIN
     ======================================================= */

  async function login(
    email,
    password,
    rememberMe = true
  ) {

    if (!email) {
      throw new Error(
        "Email address is required."
      );
    }

    if (!password) {
      throw new Error(
        "Password is required."
      );
    }


    const response =
      await GTF_API.post(
        "/auth/login",
        {
          email,
          password
        },
        {
          auth: false
        }
      );


    const normalized =
      normalizeAuthResponse(
        response
      );


    /*
     * Store authentication tokens.
     */
    GTF_API.saveTokens(
      response,
      rememberMe
    );


    /*
     * Store user information.
     */
    if (normalized.user) {
      saveUser(
        normalized.user,
        rememberMe
      );
    }


    /*
     * Store role when supplied.
     */
    if (normalized.role) {
      saveRole(
        normalized.role,
        rememberMe
      );
    }


    /*
     * Store complete session.
     */
    if (normalized.session) {
      saveSession(
        normalized.session,
        rememberMe
      );
    }


    return response;
  }


  /* =======================================================
     CURRENT USER
     ======================================================= */

  async function getCurrentUser(
    forceRefresh = false
  ) {

    if (!forceRefresh) {
      const cached =
        getStoredUser();

      if (cached) {
        return cached;
      }
    }


    if (
      !window.GTF_API ||
      !GTF_API.isAuthenticated()
    ) {
      return null;
    }


    try {

      const response =
        await GTF_API.get(
          "/users/me"
        );


      const normalized =
        normalizeAuthResponse(
          response
        );


      const user =
        normalized.user ||
        response;


      if (user) {
        const remember =
          getRememberPreference();

        saveUser(
          user,
          remember
        );
      }


      if (normalized.role) {
        saveRole(
          normalized.role,
          getRememberPreference()
        );
      }


      return user || null;

    } catch (error) {

      /*
       * A 401 means the stored session
       * should no longer be trusted.
       */
      if (error.status === 401) {
        clearLocalAuth();
      }

      throw error;
    }
  }


  /* =======================================================
     CURRENT ROLE
     ======================================================= */

  async function getCurrentRole(
    forceRefresh = false
  ) {

    if (!forceRefresh) {

      const cached =
        getStoredRole();

      if (cached) {
        return cached;
      }
    }


    if (
      !window.GTF_API ||
      !GTF_API.isAuthenticated()
    ) {
      return null;
    }


    try {

      const response =
        await GTF_API.get(
          "/roles/me"
        );


      let role =
        response?.role ||
        response?.name ||
        response?.slug ||
        response?.data?.role ||
        response?.data?.name ||
        response;


      if (
        typeof role === "object" &&
        role !== null
      ) {
        role =
          role.name ||
          role.slug ||
          role.role ||
          null;
      }


      if (role) {
        saveRole(
          String(role),
          getRememberPreference()
        );
      }


      return role
        ? String(role)
        : null;

    } catch (error) {

      if (error.status === 401) {
        clearLocalAuth();
      }

      throw error;
    }
  }


  /* =======================================================
     SESSION CHECK
     ======================================================= */

  async function checkSession() {

    if (
      !window.GTF_API ||
      !GTF_API.isAuthenticated()
    ) {
      return {
        authenticated: false,
        user: null,
        role: null
      };
    }


    try {

      const user =
        await getCurrentUser(
          true
        );

      let role = null;

      try {
        role =
          await getCurrentRole(
            true
          );
      } catch (roleError) {
        /*
         * The user may be authenticated even if
         * role retrieval is temporarily unavailable.
         */
        console.warn(
          "GTF: Could not retrieve current role.",
          roleError
        );
      }


      return {
        authenticated: Boolean(user),
        user,
        role
      };

    } catch (error) {

      if (
        error.status === 401
      ) {
        clearLocalAuth();

        return {
          authenticated: false,
          user: null,
          role: null
        };
      }

      throw error;
    }
  }


  /* =======================================================
     LOGOUT
     ======================================================= */

  async function logout(
    redirect = true
  ) {

    /*
     * Attempt server-side logout, but always
     * clear the browser session afterwards.
     */
    try {

      if (
        window.GTF_API &&
        GTF_API.isAuthenticated()
      ) {
        await GTF_API.logout();
      }

    } catch (error) {

      console.warn(
        "GTF: Server logout failed; clearing local session.",
        error
      );

    } finally {

      clearLocalAuth();

      if (redirect) {
        redirectToLogin();
      }
    }
  }


  /* =======================================================
     AUTHENTICATION STATUS
     ======================================================= */

  function isAuthenticated() {

    return Boolean(
      window.GTF_API &&
      GTF_API.isAuthenticated()
    );
  }


  function getRememberPreference() {

    try {

      const value =
        localStorage.getItem(
          STORAGE.REMEMBER
        );

      if (value !== null) {
        return value === "true";
      }

      const sessionValue =
        sessionStorage.getItem(
          STORAGE.REMEMBER
        );

      if (sessionValue !== null) {
        return sessionValue === "true";
      }

    } catch (error) {
      return true;
    }

    return true;
  }


  /* =======================================================
     REDIRECTS
     ======================================================= */

  function redirectToLogin(
    message = ""
  ) {

    const currentPath =
      window.location.pathname;


    /*
     * Don't create an endless login loop.
     */
    if (
      currentPath.endsWith(
        "/login.html"
      ) ||
      currentPath.endsWith(
        "/login"
      )
    ) {
      return;
    }


    let loginPath =
      "login.html";


    /*
     * Pages inside subfolders need ../
     */
    const segments =
      currentPath
        .split("/")
        .filter(Boolean);


    if (
      segments.length > 1
    ) {
      loginPath =
        "../login.html";
    }


    const params =
      new URLSearchParams();


    if (message) {
      params.set(
        "message",
        message
      );
    }


    params.set(
      "redirect",
      currentPath
    );


    window.location.href =
      `${loginPath}?${params.toString()}`;
  }


  function redirectAfterLogin(
    role
  ) {

    const normalized =
      String(
        role || ""
      )
        .toLowerCase()
        .trim();


    switch (normalized) {

      case "admin":
      case "administrator":
        window.location.href =
          "admin/index.html";
        break;


      case "manager":
        window.location.href =
          "manager/index.html";
        break;


      case "cashier":
        window.location.href =
          "cashier/index.html";
        break;


      case "staff":
        window.location.href =
          "dashboard/index.html";
        break;


      case "customer":
      case "user":
      case "client":
      default:
        window.location.href =
          "customer/dashboard.html";
        break;
    }
  }


  /* =======================================================
     PASSWORD VALIDATION
     ======================================================= */

  function validatePassword(
    password
  ) {

    if (
      typeof password !==
      "string"
    ) {
      return false;
    }


    if (
      password.length < 8
    ) {
      return false;
    }


    const hasUppercase =
      /[A-Z]/.test(password);

    const hasLowercase =
      /[a-z]/.test(password);

    const hasNumber =
      /[0-9]/.test(password);

    const hasSpecial =
      /[^A-Za-z0-9]/.test(password);


    return (
      hasUppercase &&
      hasLowercase &&
      hasNumber &&
      hasSpecial
    );
  }


  function passwordStrength(
    password
  ) {

    if (
      typeof password !==
      "string" ||
      password.length === 0
    ) {
      return 0;
    }


    let score = 0;


    if (
      password.length >= 8
    ) {
      score++;
    }


    if (
      password.length >= 12
    ) {
      score++;
    }


    if (
      /[A-Z]/.test(password)
    ) {
      score++;
    }


    if (
      /[a-z]/.test(password)
    ) {
      score++;
    }


    if (
      /[0-9]/.test(password)
    ) {
      score++;
    }


    if (
      /[^A-Za-z0-9]/.test(password)
    ) {
      score++;
    }


    /*
     * Return a maximum of 5 because
     * the signup UI uses a five-step bar.
     */
    return Math.min(
      score,
      5
    );
  }


  /* =======================================================
     EMAIL VALIDATION
     ======================================================= */

  function validateEmail(
    email
  ) {

    if (
      typeof email !==
      "string"
    ) {
      return false;
    }


    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      .test(
        email.trim()
      );
  }


  /* =======================================================
     USER DISPLAY HELPERS
     ======================================================= */

  function getUserDisplayName(
    user = null
  ) {

    const current =
      user ||
      getStoredUser();


    if (!current) {
      return "Customer";
    }


    if (
      current.full_name
    ) {
      return current.full_name;
    }


    if (
      current.name
    ) {
      return current.name;
    }


    const first =
      current.first_name ||
      current.firstName ||
      "";

    const last =
      current.last_name ||
      current.lastName ||
      "";


    const full =
      `${first} ${last}`
        .trim();


    if (full) {
      return full;
    }


    if (current.email) {
      return current.email
        .split("@")[0];
    }


    return "Customer";
  }


  /* =======================================================
     AUTH GUARD
     ======================================================= */

  async function requireAuth(
    options = {}
  ) {

    const {
      redirect = true,
      allowedRoles = null
    } = options;


    const session =
      await checkSession();


    if (!session.authenticated) {

      if (redirect) {
        redirectToLogin(
          "Please sign in to continue."
        );
      }

      return false;
    }


    /*
     * Role restriction.
     */
    if (
      Array.isArray(
        allowedRoles
      ) &&
      allowedRoles.length > 0
    ) {

      let role =
        session.role;


      if (!role) {
        role =
          await getCurrentRole(
            true
          );
      }


      const normalizedRole =
        String(
          role || ""
        ).toLowerCase();


      const allowed =
        allowedRoles
          .map(
            (item) =>
              String(item)
                .toLowerCase()
          );


      if (
        !allowed.includes(
          normalizedRole
        )
      ) {

        if (redirect) {

          window.location.href =
            getSafeDashboardPath(
              normalizedRole
            );
        }

        return false;
      }
    }


    return true;
  }


  /* =======================================================
     SAFE DASHBOARD PATH
     ======================================================= */

  function getSafeDashboardPath(
    role
  ) {

    switch (
      String(role || "")
        .toLowerCase()
    ) {

      case "admin":
      case "administrator":
        return "admin/index.html";

      case "manager":
        return "manager/index.html";

      case "cashier":
        return "cashier/index.html";

      default:
        return "customer/dashboard.html";
    }
  }


  /* =======================================================
     AUTH API
     ======================================================= */

  const GTF_AUTH = {

    signup,

    register: signup,

    login,

    logout,

    checkSession,

    requireAuth,

    isAuthenticated,

    getCurrentUser,

    getCurrentRole,

    getStoredUser,

    getStoredRole,

    getUserDisplayName,

    getRememberPreference,

    validatePassword,

    passwordStrength,

    validateEmail,

    clearSession:
      clearLocalAuth,

    redirectToLogin,

    redirectAfterLogin,

    getSafeDashboardPath
  };


  /* =======================================================
     GLOBAL EXPORT
     ======================================================= */

  window.GTF_AUTH =
    GTF_AUTH;


})(window);
