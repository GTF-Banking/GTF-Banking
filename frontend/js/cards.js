/* ============================================================
   GLOBAL TRUSTFUND
   frontend/js/cards.js
   ------------------------------------------------------------
   Card-management interface controller.

   Intended page:
     frontend/dashboard/cards.html

   Shared dependencies:
     api.js
     auth.js
     app.js
     logo-loader.js
     logo-guard.js
     dashboard.js

   Responsibilities:
     - Load the authenticated user's cards
     - Render card information safely
     - Mask sensitive card numbers
     - Show card status
     - Select an active card
     - Toggle card-number visibility
     - Copy safe card identifiers
     - Request card status changes
     - Request replacement
     - Handle card actions
     - Prevent duplicate requests
     - Handle loading/error/success states

   SECURITY:
     This frontend does NOT authorize card operations.
     Sensitive card data must never be trusted from the browser.
     The backend must enforce authentication, ownership,
     authorization, card status, rate limits and audit logging.

   IMPORTANT:
     Full PAN/CVV/PIN values should never be rendered into
     the page unless the backend and security architecture
     explicitly support secure, compliant presentation.
   ============================================================ */

(function (window, document) {
  "use strict";


  /* ==========================================================
     CONFIGURATION
  ========================================================== */

  const CONFIG = {

    apiBase: "/api",

    loginPage: "../login.html",

    endpoints: {

      cards:
        "/users/me/cards",

      cardsFallback:
        "/cards",

      card:
        "/cards",

      status:
        "/cards/status",

      replace:
        "/cards/replace"

    },

    selectors: {

      container:
        "[data-cards-container]",

      cardList:
        "[data-card-list]",

      card:
        "[data-card]",

      loading:
        "[data-cards-loading]",

      empty:
        "[data-cards-empty]",

      error:
        "[data-cards-error]",

      success:
        "[data-cards-success]",

      status:
        "[data-cards-status]",

      refresh:
        "[data-cards-refresh]",

      cardNumber:
        "[data-card-number]",

      cardHolder:
        "[data-card-holder]",

      expiry:
        "[data-card-expiry]",

      type:
        "[data-card-type]",

      statusBadge:
        "[data-card-status]",

      lastFour:
        "[data-card-last-four]",

      toggleNumber:
        "[data-card-toggle-number]",

      copyNumber:
        "[data-card-copy]",

      freeze:
        "[data-card-freeze]",

      unfreeze:
        "[data-card-unfreeze]",

      replace:
        "[data-card-replace]",

      details:
        "[data-card-details]",

      select:
        "[data-card-select]",

      selectedCard:
        "[data-selected-card]",

      action:
        "[data-card-action]"

    }

  };


  /* ==========================================================
     STATE
  ========================================================== */

  const state = {

    initialized:
      false,

    loading:
      false,

    actionInProgress:
      false,

    cards:
      [],

    selectedCard:
      null,

    revealedCards:
      new Set()

  };


  /* ==========================================================
     DOM HELPERS
  ========================================================== */

  function $(selector, parent = document) {

    return parent.querySelector(
      selector
    );

  }


  function $$(selector, parent = document) {

    return Array.from(
      parent.querySelectorAll(
        selector
      )
    );

  }


  /* ==========================================================
     API REQUEST
  ========================================================== */

  async function apiRequest(
    endpoint,
    options = {}
  ) {

    /*
     * Use the project's centralized API layer
     * whenever available.
     */

    if (
      window.GTF_API &&
      typeof window.GTF_API.request ===
      "function"
    ) {

      return window.GTF_API.request(
        endpoint,
        options
      );

    }


    if (
      window.GTF_API &&
      typeof window.GTF_API.get ===
      "function" &&
      (
        !options.method ||
        options.method.toUpperCase() ===
        "GET"
      )
    ) {

      return window.GTF_API.get(
        endpoint,
        options
      );

    }


    const response =
      await fetch(
        CONFIG.apiBase +
        endpoint,
        {

          credentials:
            "include",

          headers: {
            "Content-Type":
              "application/json",

            ...(options.headers || {})
          },

          ...options

        }
      );


    let data =
      null;


    try {

      data =
        await response.json();

    } catch {

      data =
        null;

    }


    if (!response.ok) {

      const error =
        new Error(
          data?.message ||
          data?.error ||
          `Request failed (${response.status})`
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
     AUTHENTICATION
  ========================================================== */

  async function verifyAuthentication() {

    if (
      window.GTF_AUTH &&
      typeof window.GTF_AUTH.requireAuth ===
      "function"
    ) {

      try {

        const result =
          await window.GTF_AUTH.requireAuth();


        if (
          result === false
        ) {

          redirectToLogin();

          return false;

        }

      } catch (error) {

        console.warn(
          "GTF Cards authentication:",
          error
        );


        redirectToLogin();

        return false;

      }

    }


    return true;

  }


  /* ==========================================================
     LOGIN
  ========================================================== */

  function redirectToLogin() {

    window.location.href =
      CONFIG.loginPage;

  }


  /* ==========================================================
     LOAD CARDS
  ========================================================== */

  async function loadCards() {

    if (
      state.loading
    ) {

      return state.cards;

    }


    state.loading =
      true;


    setLoading(
      true
    );


    clearMessages();


    try {

      let response;


      try {

        response =
          await apiRequest(
            CONFIG.endpoints.cards
          );

      } catch (primaryError) {

        response =
          await apiRequest(
            CONFIG.endpoints.cardsFallback
          );

      }


      const cards =
        extractCards(
          response
        );


      state.cards =
        normalizeCards(
          cards
        );


      renderCards();


      return state.cards;

    } catch (error) {

      console.error(
        "GTF Cards loading:",
        error
      );


      state.cards =
        [];


      renderCards();


      showError(
        getErrorMessage(
          error
        )
      );


      if (
        error.status === 401 ||
        error.status === 403
      ) {

        redirectToLogin();

      }


      return [];

    } finally {

      state.loading =
        false;


      setLoading(
        false
      );

    }

  }


  /* ==========================================================
     EXTRACT CARDS
  ========================================================== */

  function extractCards(
    response
  ) {

    if (
      Array.isArray(
        response
      )
    ) {

      return response;

    }


    if (
      Array.isArray(
        response?.cards
      )
    ) {

      return response.cards;

    }


    if (
      Array.isArray(
        response?.data?.cards
      )
    ) {

      return response.data.cards;

    }


    if (
      Array.isArray(
        response?.data
      )
    ) {

      return response.data;

    }


    return [];

  }


  /* ==========================================================
     NORMALIZE CARDS
  ========================================================== */

  function normalizeCards(
    cards
  ) {

    return cards
      .map(
        card => {

          if (
            !card ||
            typeof card !==
            "object"
          ) {

            return null;

          }


          const lastFour =
            String(
              card.last_four ??
              card.lastFour ??
              extractLastFour(
                card.card_number ??
                card.cardNumber ??
                ""
              )
            )
            .slice(-4);


          return {

            id:
              card.id ||
              card.card_id ||
              "",

            type:
              card.card_type ||
              card.cardType ||
              card.type ||
              "Debit Card",

            network:
              card.network ||
              card.brand ||
              "GTF",

            holder:
              card.cardholder_name ||
              card.cardholderName ||
              card.holder_name ||
              "GTF CUSTOMER",

            lastFour:
              lastFour,

            expiry:
              card.expiry ||
              card.expiry_date ||
              card.expiryDate ||
              "—",

            status:
              normalizeStatus(
                card.status
              ),

            currency:
              card.currency ||
              "USD",

            nickname:
              card.nickname ||
              card.name ||
              "",

            maskedNumber:
              card.masked_number ||
              card.maskedNumber ||
              buildMaskedNumber(
                lastFour
              )

          };

        }
      )
      .filter(Boolean);

  }


  /* ==========================================================
     STATUS NORMALIZATION
  ========================================================== */

  function normalizeStatus(
    status
  ) {

    const value =
      String(
        status ||
        "active"
      )
      .toLowerCase()
      .trim();


    if (
      value === "frozen" ||
      value === "freeze"
    ) {

      return "frozen";

    }


    if (
      value === "blocked" ||
      value === "disabled"
    ) {

      return "blocked";

    }


    if (
      value === "expired"
    ) {

      return "expired";

    }


    if (
      value === "pending"
    ) {

      return "pending";

    }


    return "active";

  }


  /* ==========================================================
     RENDER CARDS
  ========================================================== */

  function renderCards() {

    const list =
      $(CONFIG.selectors.cardList);


    if (!list) {

      return;

    }


    list.innerHTML =
      "";


    if (
      state.cards.length ===
      0
    ) {

      showEmptyState();

      return;

    }


    hideEmptyState();


    state.cards.forEach(
      card => {

        const element =
          createCardElement(
            card
          );


        list.appendChild(
          element
        );

      }
    );


    bindRenderedCardEvents();


    if (
      !state.selectedCard
    ) {

      selectCard(
        state.cards[0]
      );

    } else {

      const refreshed =
        findCard(
          state.selectedCard.id
        );


      if (refreshed) {

        selectCard(
          refreshed
        );

      }

    }

  }


  /* ==========================================================
     CREATE CARD ELEMENT
  ========================================================== */

  function createCardElement(
    card
  ) {

    const wrapper =
      document.createElement(
        "article"
      );


    wrapper.className =
      "gtf-card-item";


    wrapper.dataset.card =
      "true";


    wrapper.dataset.cardId =
      card.id;


    const revealed =
      state.revealedCards.has(
        card.id
      );


    const displayedNumber =
      revealed
        ? formatCardNumber(
            card
          )
        : buildMaskedNumber(
            card.lastFour
          );


    wrapper.innerHTML = `
      <div class="gtf-bank-card">

        <div class="gtf-bank-card-top">

          <span class="gtf-card-network">
            ${escapeHTML(card.network)}
          </span>

          <span class="gtf-card-type">
            ${escapeHTML(card.type)}
          </span>

        </div>


        <div class="gtf-bank-card-number"
             data-card-number>
          ${escapeHTML(displayedNumber)}
        </div>


        <div class="gtf-bank-card-bottom">

          <div>
            <small>CARDHOLDER</small>
            <strong data-card-holder>
              ${escapeHTML(card.holder)}
            </strong>
          </div>

          <div>
            <small>VALID THRU</small>
            <strong data-card-expiry>
              ${escapeHTML(card.expiry)}
            </strong>
          </div>

        </div>

      </div>


      <div class="gtf-card-information">

        <div class="gtf-card-heading">

          <div>
            <h3>
              ${escapeHTML(card.nickname || card.type)}
            </h3>

            <span
              class="gtf-card-status gtf-card-status-${escapeHTML(card.status)}"
              data-card-status
            >
              ${escapeHTML(capitalize(card.status))}
            </span>
          </div>

          <button
            type="button"
            class="btn btn-outline"
            data-card-select
          >
            Select
          </button>

        </div>


        <dl class="gtf-card-details">

          <div>
            <dt>Card</dt>
            <dd data-card-last-four>
              •••• ${escapeHTML(card.lastFour)}
            </dd>
          </div>

          <div>
            <dt>Type</dt>
            <dd data-card-type>
              ${escapeHTML(card.type)}
            </dd>
          </div>

        </dl>


        <div class="gtf-card-actions">

          <button
            type="button"
            class="btn btn-outline"
            data-card-toggle-number
            data-card-id="${escapeHTML(card.id)}"
          >
            ${revealed ? "Hide number" : "Show number"}
          </button>

          <button
            type="button"
            class="btn btn-outline"
            data-card-copy
            data-card-id="${escapeHTML(card.id)}"
          >
            Copy identifier
          </button>

          ${
            card.status === "frozen"
              ? `
                <button
                  type="button"
                  class="btn btn-primary"
                  data-card-unfreeze
                  data-card-id="${escapeHTML(card.id)}"
                >
                  Unfreeze
                </button>
              `
              : card.status === "active"
                ? `
                  <button
                    type="button"
                    class="btn btn-outline"
                    data-card-freeze
                    data-card-id="${escapeHTML(card.id)}"
                  >
                    Freeze
                  </button>
                `
                : ""
          }

          <button
            type="button"
            class="btn btn-outline"
            data-card-replace
            data-card-id="${escapeHTML(card.id)}"
          >
            Request replacement
          </button>

        </div>

      </div>
    `;


    return wrapper;

  }


  /* ==========================================================
     BIND CARD EVENTS
  ========================================================== */

  function bindRenderedCardEvents() {

    $$(CONFIG.selectors.select)
      .forEach(
        button => {

          button.addEventListener(
            "click",
            function () {

              const wrapper =
                button.closest(
                  "[data-card]"
                );


              const id =
                wrapper?.dataset.cardId;


              const card =
                findCard(
                  id
                );


              if (card) {

                selectCard(
                  card
                );

              }

            }
          );

        }
      );


    $$(CONFIG.selectors.toggleNumber)
      .forEach(
        button => {

          button.addEventListener(
            "click",
            function () {

              toggleCardNumber(
                button.dataset.cardId
              );

            }
          );

        }
      );


    $$(CONFIG.selectors.copyNumber)
      .forEach(
        button => {

          button.addEventListener(
            "click",
            function () {

              copyCardIdentifier(
                button.dataset.cardId
              );

            }
          );

        }
      );


    $$(CONFIG.selectors.freeze)
      .forEach(
        button => {

          button.addEventListener(
            "click",
            function () {

              changeCardStatus(
                button.dataset.cardId,
                "frozen"
              );

            }
          );

        }
      );


    $$(CONFIG.selectors.unfreeze)
      .forEach(
        button => {

          button.addEventListener(
            "click",
            function () {

              changeCardStatus(
                button.dataset.cardId,
                "active"
              );

            }
          );

        }
      );


    $$(CONFIG.selectors.replace)
      .forEach(
        button => {

          button.addEventListener(
            "click",
            function () {

              requestReplacement(
                button.dataset.cardId
              );

            }
          );

        }
      );

  }


  /* ==========================================================
     SELECT CARD
  ========================================================== */

  function selectCard(
    card
  ) {

    if (!card) {
      return;
    }


    state.selectedCard =
      card;


    $$(CONFIG.selectors.card)
      .forEach(
        element => {

          element.classList.toggle(
            "is-selected",
            element.dataset.cardId ===
            String(card.id)
          );

        }
      );


    $$(CONFIG.selectors.selectedCard)
      .forEach(
        element => {

          element.textContent =
            card.nickname ||
            `${card.type} •••• ${card.lastFour}`;

        }
      );


    document.dispatchEvent(
      new CustomEvent(
        "gtf:card-selected",
        {
          detail: {
            card
          }
        }
      )
    );

  }


  /* ==========================================================
     FIND CARD
  ========================================================== */

  function findCard(
    id
  ) {

    return state.cards.find(
      card =>
        String(card.id) ===
        String(id)
    ) || null;

  }


  /* ==========================================================
     TOGGLE CARD NUMBER
     ----------------------------------------------------------
     This only works with data explicitly returned by the
     backend. The normalized model deliberately does not
     fabricate a full PAN.
  ========================================================== */

  function toggleCardNumber(
    cardId
  ) {

    const card =
      findCard(
        cardId
      );


    if (!card) {
      return;
    }


    if (
      state.revealedCards.has(
        card.id
      )
    ) {

      state.revealedCards.delete(
        card.id
      );

    } else {

      /*
       * Never fabricate a full card number from the last four.
       *
       * If the backend did not provide a securely authorized
       * display value, keep the card masked.
       */

      if (
        !card.fullNumber
      ) {

        showError(
          "For security, only the last four digits are available on this page."
        );

        return;

      }


      state.revealedCards.add(
        card.id
      );

    }


    renderCards();

  }


  /* ==========================================================
     FORMAT CARD NUMBER
  ========================================================== */

  function formatCardNumber(
    card
  ) {

    if (
      !card.fullNumber
    ) {

      return buildMaskedNumber(
        card.lastFour
      );

    }


    const digits =
      String(
        card.fullNumber
      )
      .replace(/\D/g, "");


    return digits
      .replace(
        /(.{4})/g,
        "$1 "
      )
      .trim();

  }


  /* ==========================================================
     MASKED NUMBER
  ========================================================== */

  function buildMaskedNumber(
    lastFour
  ) {

    return (
      "•••• •••• •••• " +
      String(
        lastFour ||
        "••••"
      )
    );

  }


  /* ==========================================================
     EXTRACT LAST FOUR
  ========================================================== */

  function extractLastFour(
    value
  ) {

    const digits =
      String(
        value || ""
      )
      .replace(/\D/g, "");


    return digits.slice(-4);

  }


  /* ==========================================================
     COPY SAFE CARD IDENTIFIER
     ----------------------------------------------------------
     Only the masked identifier / last four digits are copied.
     Full PAN values are intentionally not copied.
  ========================================================== */

  async function copyCardIdentifier(
    cardId
  ) {

    const card =
      findCard(
        cardId
      );


    if (!card) {
      return;
    }


    const value =
      `•••• ${card.lastFour}`;


    try {

      await navigator.clipboard.writeText(
        value
      );


      showSuccess(
        "Card identifier copied."
      );

    } catch (error) {

      console.warn(
        "Clipboard unavailable:",
        error
      );


      showError(
        "The card identifier could not be copied."
      );

    }

  }


  /* ==========================================================
     CHANGE CARD STATUS
  ========================================================== */

  async function changeCardStatus(
    cardId,
    newStatus
  ) {

    if (
      state.actionInProgress
    ) {
      return;
    }


    const card =
      findCard(
        cardId
      );


    if (!card) {
      return;
    }


    const normalizedStatus =
      normalizeStatus(
        newStatus
      );


    const action =
      normalizedStatus ===
      "frozen"
        ? "freeze"
        : "unfreeze";


    const confirmed =
      window.confirm(
        normalizedStatus === "frozen"
          ? "Freeze this card?"
          : "Unfreeze this card?"
      );


    if (!confirmed) {
      return;
    }


    state.actionInProgress =
      true;


    setActionState(
      true
    );


    clearMessages();


    try {

      let response;


      try {

        response =
          await apiRequest(
            `${CONFIG.endpoints.card}/${encodeURIComponent(card.id)}/status`,
            {
              method: "PATCH",

              body:
                JSON.stringify({
                  status:
                    normalizedStatus
                })
            }
          );

      } catch (primaryError) {

        response =
          await apiRequest(
            CONFIG.endpoints.status,
            {
              method: "PATCH",

              body:
                JSON.stringify({
                  card_id:
                    card.id,

                  status:
                    normalizedStatus
                })
            }
          );

      }


      applyCardResponse(
        response,
        card
      );


      showSuccess(
        normalizedStatus === "frozen"
          ? "Your card has been frozen."
          : "Your card has been unfrozen."
      );


      renderCards();

    } catch (error) {

      console.error(
        "GTF Card status:",
        error
      );


      showError(
        getErrorMessage(
          error
        )
      );


      if (
        error.status === 401 ||
        error.status === 403
      ) {

        redirectToLogin();

      }

    } finally {

      state.actionInProgress =
        false;


      setActionState(
        false
      );

    }

  }


  /* ==========================================================
     REPLACEMENT REQUEST
  ========================================================== */

  async function requestReplacement(
    cardId
  ) {

    if (
      state.actionInProgress
    ) {
      return;
    }


    const card =
      findCard(
        cardId
      );


    if (!card) {
      return;
    }


    const confirmed =
      window.confirm(
        "Request a replacement for this card?"
      );


    if (!confirmed) {
      return;
    }


    state.actionInProgress =
      true;


    setActionState(
      true
    );


    clearMessages();


    try {

      let response;


      try {

        response =
          await apiRequest(
            `${CONFIG.endpoints.card}/${encodeURIComponent(card.id)}/replace`,
            {
              method: "POST",

              body:
                JSON.stringify({
                  card_id:
                    card.id
                })
            }
          );

      } catch (primaryError) {

        response =
          await apiRequest(
            CONFIG.endpoints.replace,
            {
              method: "POST",

              body:
                JSON.stringify({
                  card_id:
                    card.id
                })
            }
          );

      }


      applyCardResponse(
        response,
        card
      );


      const replacementId =
        response?.replacement?.id ||
        response?.data?.replacement?.id ||
        response?.replacement_id ||
        "";


      let message =
        "Your card replacement request was submitted.";


      if (replacementId) {

        message +=
          ` Reference: ${replacementId}.`;

      }


      showSuccess(
        message
      );


      await loadCards();

    } catch (error) {

      console.error(
        "GTF Card replacement:",
        error
      );


      showError(
        getErrorMessage(
          error
        )
      );


      if (
        error.status === 401 ||
        error.status === 403
      ) {

        redirectToLogin();

      }

    } finally {

      state.actionInProgress =
        false;


      setActionState(
        false
      );

    }

  }


  /* ==========================================================
     APPLY CARD RESPONSE
  ========================================================== */

  function applyCardResponse(
    response,
    originalCard
  ) {

    const updated =
      response?.card ||
      response?.data?.card;


    if (
      !updated ||
      !originalCard
    ) {

      return;

    }


    const normalized =
      normalizeCards(
        [updated]
      )[0];


    if (!normalized) {
      return;
    }


    const index =
      state.cards.findIndex(
        card =>
          card.id ===
          originalCard.id
      );


    if (
      index !== -1
    ) {

      state.cards[index] =
        {
          ...state.cards[index],
          ...normalized
        };

    }

  }


  /* ==========================================================
     REFRESH
  ========================================================== */

  function initializeRefresh() {

    $$(CONFIG.selectors.refresh)
      .forEach(
        button => {

          button.addEventListener(
            "click",
            async function () {

              if (
                state.loading
              ) {
                return;
              }


              await loadCards();

            }
          );

        }
      );

  }


  /* ==========================================================
     LOADING STATE
  ========================================================== */

  function setLoading(
    loading
  ) {

    $$(CONFIG.selectors.loading)
      .forEach(
        element => {

          element.hidden =
            !loading;

        }
      );

  }


  /* ==========================================================
     ACTION STATE
  ========================================================== */

  function setActionState(
    busy
  ) {

    $$(CONFIG.selectors.action)
      .forEach(
        button => {

          button.disabled =
            busy;


          button.classList.toggle(
            "is-loading",
            busy
          );

        }
      );

  }


  /* ==========================================================
     EMPTY STATE
  ========================================================== */

  function showEmptyState() {

    $$(CONFIG.selectors.empty)
      .forEach(
        element => {

          element.hidden =
            false;

        }
      );

  }


  function hideEmptyState() {

    $$(CONFIG.selectors.empty)
      .forEach(
        element => {

          element.hidden =
            true;

        }
      );

  }


  /* ==========================================================
     ERROR
  ========================================================== */

  function showError(
    message
  ) {

    $$(CONFIG.selectors.error)
      .forEach(
        element => {

          element.hidden =
            false;

          element.textContent =
            message;

        }
      );


    setStatus(
      "error",
      message
    );

  }


  /* ==========================================================
     SUCCESS
  ========================================================== */

  function showSuccess(
    message
  ) {

    $$(CONFIG.selectors.success)
      .forEach(
        element => {

          element.hidden =
            false;

          element.textContent =
            message;

        }
      );


    setStatus(
      "success",
      message
    );

  }


  /* ==========================================================
     CLEAR MESSAGES
  ========================================================== */

  function clearMessages() {

    $$(CONFIG.selectors.error)
      .forEach(
        element => {

          element.hidden =
            true;

          element.textContent =
            "";

        }
      );


    $$(CONFIG.selectors.success)
      .forEach(
        element => {

          element.hidden =
            true;

          element.textContent =
            "";

        }
      );

  }


  /* ==========================================================
     STATUS
  ========================================================== */

  function setStatus(
    type,
    message
  ) {

    $$(CONFIG.selectors.status)
      .forEach(
        element => {

          element.dataset.status =
            type;

          element.textContent =
            message;

        }
      );

  }


  /* ==========================================================
     ERROR MESSAGE
  ========================================================== */

  function getErrorMessage(
    error
  ) {

    if (
      error?.data?.message
    ) {

      return error.data.message;

    }


    if (
      error?.data?.error
    ) {

      return error.data.error;

    }


    if (
      error?.message
    ) {

      return error.message;

    }


    return (
      "We could not complete the card request. Please try again."
    );

  }


  /* ==========================================================
     CAPITALIZE
  ========================================================== */

  function capitalize(
    value
  ) {

    const text =
      String(
        value || ""
      );


    return (
      text.charAt(0).toUpperCase() +
      text.slice(1)
    );

  }


  /* ==========================================================
     HTML ESCAPING
  ========================================================== */

  function escapeHTML(
    value
  ) {

    if (
      value === null ||
      value === undefined
    ) {

      return "";

    }


    return String(value)
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );

  }


  /* ==========================================================
     ONLINE / OFFLINE
  ========================================================== */

  function initializeConnectionEvents() {

    window.addEventListener(
      "offline",
      function () {

        setStatus(
          "error",
          "You are offline. Card management is unavailable until your connection is restored."
        );

      }
    );


    window.addEventListener(
      "online",
      function () {

        setStatus(
          "success",
          "Connection restored."
        );


        loadCards();

      }
    );

  }


  /* ==========================================================
     PAGE VISIBILITY
  ========================================================== */

  function initializeVisibilityEvents() {

    document.addEventListener(
      "visibilitychange",
      function () {

        if (
          document.visibilityState ===
          "visible"
        ) {

          loadCards();

        }

      }
    );

  }


  /* ==========================================================
     INITIALIZE
  ========================================================== */

  async function initialize() {

    if (
      state.initialized
    ) {

      return;

    }


    state.initialized =
      true;


    const authenticated =
      await verifyAuthentication();


    if (!authenticated) {
      return;
    }


    initializeRefresh();

    initializeConnectionEvents();

    initializeVisibilityEvents();


    await loadCards();


    document.documentElement
      .classList.add(
        "gtf-cards-ready"
      );

  }


  /* ==========================================================
     PUBLIC API
  ========================================================== */

  window.GTF_CARDS = {

    config:
      CONFIG,

    state,

    initialize,

    loadCards,

    refresh:
      loadCards,

    selectCard,

    freezeCard:
      function (id) {
        return changeCardStatus(
          id,
          "frozen"
        );
      },

    unfreezeCard:
      function (id) {
        return changeCardStatus(
          id,
          "active"
        );
      },

    requestReplacement,

    copyCardIdentifier

  };


  /* ==========================================================
     START
  ========================================================== */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      {
        once: true
      }
    );

  } else {

    initialize();

  }


})(window, document);