/* ============================================================
   GLOBAL TRUSTFUND
   frontend/js/support.js
   ------------------------------------------------------------
   Support / Help Center controller

   Responsibilities:
   - Submit support requests
   - Validate support forms
   - Load authenticated user's support tickets
   - Display ticket status
   - Open ticket details
   - Refresh tickets
   - Handle loading/error/success states
   - Prevent duplicate submissions
   - Safely render server-provided content

   SECURITY:
   - Authentication/authorization must be enforced server-side.
   - Never trust user ID, role, or ticket ownership supplied by
     the browser.
   - Never expose passwords, authentication tokens, PINs, CVVs,
     complete card numbers, or other secrets in support messages.
   ============================================================ */

(function (window, document) {
  "use strict";


  /* ==========================================================
     CONFIGURATION
  ========================================================== */

  const CONFIG = {

    apiBase: "/api",

    loginPage: "login.html",

    endpoints: {

      tickets:
        "/support/tickets",

      createTicket:
        "/support/tickets",

      fallbackTickets:
        "/tickets",

      fallbackCreate:
        "/tickets"

    },

    selectors: {

      form:
        "[data-support-form]",

      subject:
        "[data-support-subject]",

      category:
        "[data-support-category]",

      priority:
        "[data-support-priority]",

      message:
        "[data-support-message]",

      email:
        "[data-support-email]",

      ticketId:
        "[data-support-ticket-id]",

      submit:
        "[data-support-submit]",

      reset:
        "[data-support-reset]",

      loading:
        "[data-support-loading]",

      error:
        "[data-support-error]",

      success:
        "[data-support-success]",

      status:
        "[data-support-status]",

      ticketList:
        "[data-support-ticket-list]",

      ticketEmpty:
        "[data-support-empty]",

      ticketCount:
        "[data-support-ticket-count]",

      refresh:
        "[data-support-refresh]",

      ticket:
        "[data-support-ticket]",

      ticketDetails:
        "[data-ticket-details]",

      search:
        "[data-support-search]",

      filter:
        "[data-support-filter]",

      modal:
        "[data-support-modal]",

      modalClose:
        "[data-support-modal-close]",

      modalContent:
        "[data-support-modal-content]"

    },

    validation: {

      subjectMin:
        3,

      subjectMax:
        120,

      messageMin:
        10,

      messageMax:
        5000

    }

  };


  /* ==========================================================
     STATE
  ========================================================== */

  const state = {

    initialized:
      false,

    submitting:
      false,

    loading:
      false,

    tickets:
      [],

    selectedTicket:
      null,

    search:
      "",

    filter:
      "all"

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
     ----------------------------------------------------------
     Uses the project's centralized API helper when available.
     Falls back to fetch so the page can still function during
     development.
  ========================================================== */

  async function apiRequest(
    endpoint,
    options = {}
  ) {

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


    const method =
      (
        options.method ||
        "GET"
      ).toUpperCase();


    if (
      window.GTF_API &&
      method === "GET" &&
      typeof window.GTF_API.get ===
      "function"
    ) {

      return window.GTF_API.get(
        endpoint
      );

    }


    const response =
      await fetch(
        CONFIG.apiBase +
        endpoint,
        {

          method,

          credentials:
            "include",

          headers: {
            "Content-Type":
              "application/json",

            ...(options.headers || {})
          },

          body:
            options.body

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

  async function requireAuthentication() {

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
          "GTF Support authentication check failed:",
          error
        );


        redirectToLogin();

        return false;

      }

    }


    return true;

  }


  function redirectToLogin() {

    window.location.href =
      CONFIG.loginPage;

  }


  /* ==========================================================
     LOAD SUPPORT TICKETS
  ========================================================== */

  async function loadTickets() {

    if (
      state.loading
    ) {

      return state.tickets;

    }


    state.loading =
      true;


    setLoading(
      true
    );


    try {

      let response;


      try {

        response =
          await apiRequest(
            CONFIG.endpoints.tickets
          );

      } catch (primaryError) {

        response =
          await apiRequest(
            CONFIG.endpoints.fallbackTickets
          );

      }


      state.tickets =
        normalizeTickets(
          extractTickets(
            response
          )
        );


      renderTickets();


      return state.tickets;

    } catch (error) {

      console.error(
        "GTF Support ticket loading error:",
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
     EXTRACT TICKETS
  ========================================================== */

  function extractTickets(
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
        response?.tickets
      )
    ) {

      return response.tickets;

    }


    if (
      Array.isArray(
        response?.data?.tickets
      )
    ) {

      return response.data.tickets;

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
     NORMALIZE TICKETS
  ========================================================== */

  function normalizeTickets(
    tickets
  ) {

    return tickets
      .map(
        ticket => {

          if (
            !ticket ||
            typeof ticket !==
            "object"
          ) {

            return null;

          }


          return {

            id:
              ticket.id ||
              ticket.ticket_id ||
              ticket.ticketId ||
              "",

            subject:
              ticket.subject ||
              "Support request",

            category:
              ticket.category ||
              "General",

            priority:
              normalizePriority(
                ticket.priority
              ),

            status:
              normalizeStatus(
                ticket.status
              ),

            message:
              ticket.message ||
              ticket.description ||
              "",

            createdAt:
              ticket.created_at ||
              ticket.createdAt ||
              ticket.created ||
              null,

            updatedAt:
              ticket.updated_at ||
              ticket.updatedAt ||
              null,

            response:
              ticket.response ||
              ticket.staff_response ||
              ticket.reply ||
              "",

            reference:
              ticket.reference ||
              ticket.reference_number ||
              ""

          };

        }
      )
      .filter(Boolean);

  }


  /* ==========================================================
     CREATE SUPPORT TICKET
  ========================================================== */

  async function submitTicket(
    event
  ) {

    if (
      event
    ) {

      event.preventDefault();

    }


    if (
      state.submitting
    ) {

      return;

    }


    const form =
      $(CONFIG.selectors.form);


    if (!form) {

      return;

    }


    clearMessages();


    const formData =
      collectFormData(
        form
      );


    const validation =
      validateForm(
        formData
      );


    if (
      !validation.valid
    ) {

      showError(
        validation.message
      );


      focusInvalidField(
        validation.field
      );


      return;

    }


    state.submitting =
      true;


    setSubmitState(
      true
    );


    try {

      const payload = {

        subject:
          formData.subject,

        category:
          formData.category,

        priority:
          formData.priority,

        message:
          formData.message

      };


      if (
        formData.email
      ) {

        payload.email =
          formData.email;

      }


      let response;


      try {

        response =
          await apiRequest(
            CONFIG.endpoints.createTicket,
            {
              method:
                "POST",

              body:
                JSON.stringify(
                  payload
                )
            }
          );

      } catch (primaryError) {

        response =
          await apiRequest(
            CONFIG.endpoints.fallbackCreate,
            {
              method:
                "POST",

              body:
                JSON.stringify(
                  payload
                )
            }
          );

      }


      const ticket =
        normalizeTickets(
          extractTickets(
            response
          )
        )[0];


      const returnedTicket =
        ticket ||
        normalizeTicketFromResponse(
          response
        );


      if (
        returnedTicket
      ) {

        state.tickets.unshift(
          returnedTicket
        );

      }


      const reference =
        response?.reference ||
        response?.ticket?.reference ||
        response?.data?.reference ||
        returnedTicket?.reference ||
        returnedTicket?.id ||
        "";


      let successMessage =
        "Your support request has been submitted successfully.";


      if (
        reference
      ) {

        successMessage +=
          ` Reference: ${reference}.`;

      }


      showSuccess(
        successMessage
      );


      resetForm();


      renderTickets();


      document.dispatchEvent(
        new CustomEvent(
          "gtf:support-submitted",
          {
            detail: {
              ticket:
                returnedTicket
            }
          }
        )
      );

    } catch (error) {

      console.error(
        "GTF Support submission error:",
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

      state.submitting =
        false;


      setSubmitState(
        false
      );

    }

  }


  /* ==========================================================
     COLLECT FORM DATA
  ========================================================== */

  function collectFormData(
    form
  ) {

    const subject =
      $(
        CONFIG.selectors.subject,
        form
      )?.value.trim() ||
      "";


    const category =
      $(
        CONFIG.selectors.category,
        form
      )?.value ||
      "general";


    const priority =
      $(
        CONFIG.selectors.priority,
        form
      )?.value ||
      "normal";


    const message =
      $(
        CONFIG.selectors.message,
        form
      )?.value.trim() ||
      "";


    const email =
      $(
        CONFIG.selectors.email,
        form
      )?.value.trim() ||
      "";


    const ticketId =
      $(
        CONFIG.selectors.ticketId,
        form
      )?.value.trim() ||
      "";


    return {

      subject,

      category,

      priority,

      message,

      email,

      ticketId

    };

  }


  /* ==========================================================
     VALIDATE FORM
  ========================================================== */

  function validateForm(
    data
  ) {

    if (
      data.subject.length <
      CONFIG.validation.subjectMin
    ) {

      return {

        valid:
          false,

        field:
          CONFIG.selectors.subject,

        message:
          `Please enter a subject of at least ${CONFIG.validation.subjectMin} characters.`

      };

    }


    if (
      data.subject.length >
      CONFIG.validation.subjectMax
    ) {

      return {

        valid:
          false,

        field:
          CONFIG.selectors.subject,

        message:
          `Subject must be ${CONFIG.validation.subjectMax} characters or fewer.`

      };

    }


    if (
      data.message.length <
      CONFIG.validation.messageMin
    ) {

      return {

        valid:
          false,

        field:
          CONFIG.selectors.message,

        message:
          `Please enter at least ${CONFIG.validation.messageMin} characters describing your issue.`

      };

    }


    if (
      data.message.length >
      CONFIG.validation.messageMax
    ) {

      return {

        valid:
          false,

        field:
          CONFIG.selectors.message,

        message:
          `Your message must be ${CONFIG.validation.messageMax} characters or fewer.`

      };

    }


    if (
      data.email &&
      !isValidEmail(
        data.email
      )
    ) {

      return {

        valid:
          false,

        field:
          CONFIG.selectors.email,

        message:
          "Please enter a valid email address."

      };

    }


    /*
     * Prevent accidental submission of secrets.
     */

    if (
      containsSensitiveInformation(
        data.message
      )
    ) {

      return {

        valid:
          false,

        field:
          CONFIG.selectors.message,

        message:
          "For your security, do not include passwords, PINs, CVVs, one-time codes, or complete card numbers in a support message."

      };

    }


    return {

      valid:
        true,

      field:
        null,

      message:
        ""

    };

  }


  /* ==========================================================
     SENSITIVE INFORMATION CHECK
  ========================================================== */

  function containsSensitiveInformation(
    value
  ) {

    const text =
      String(
        value || ""
      );


    const patterns = [

      /\b\d{13,19}\b/,

      /\b\d{3,4}\b.*\bCVV\b/i,

      /\bCVV\b.*\b\d{3,4}\b/i,

      /\bPIN\b.*\b\d{4,8}\b/i,

      /\bpassword\b/i,

      /\bpasscode\b/i,

      /\bone[- ]?time (password|code|pin)\b/i,

      /\bOTP\b/i,

      /\bverification code\b/i

    ];


    return patterns.some(
      pattern =>
        pattern.test(
          text
        )
    );

  }


  /* ==========================================================
     EMAIL VALIDATION
  ========================================================== */

  function isValidEmail(
    email
  ) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      .test(
        email
      );

  }


  /* ==========================================================
     NORMALIZE STATUS
  ========================================================== */

  function normalizeStatus(
    status
  ) {

    const value =
      String(
        status ||
        "open"
      )
      .toLowerCase()
      .trim();


    if (
      value === "closed" ||
      value === "resolved"
    ) {

      return "closed";

    }


    if (
      value === "pending" ||
      value === "waiting"
    ) {

      return "pending";

    }


    if (
      value === "in_progress" ||
      value === "in-progress" ||
      value === "processing"
    ) {

      return "in_progress";

    }


    return "open";

  }


  /* ==========================================================
     NORMALIZE PRIORITY
  ========================================================== */

  function normalizePriority(
    priority
  ) {

    const value =
      String(
        priority ||
        "normal"
      )
      .toLowerCase()
      .trim();


    if (
      value === "high" ||
      value === "urgent"
    ) {

      return "high";

    }


    if (
      value === "low"
    ) {

      return "low";

    }


    return "normal";

  }


  /* ==========================================================
     RENDER TICKETS
  ========================================================== */

  function renderTickets() {

    const list =
      $(CONFIG.selectors.ticketList);


    if (!list) {

      updateTicketCount();

      return;

    }


    const filtered =
      getFilteredTickets();


    list.innerHTML =
      "";


    if (
      filtered.length ===
      0
    ) {

      showTicketEmptyState();

      updateTicketCount();

      return;

    }


    hideTicketEmptyState();


    filtered.forEach(
      ticket => {

        list.appendChild(
          createTicketElement(
            ticket
          )
        );

      }
    );


    bindTicketEvents();

    updateTicketCount();

  }


  /* ==========================================================
     FILTER TICKETS
  ========================================================== */

  function getFilteredTickets() {

    const search =
      state.search
        .toLowerCase()
        .trim();


    return state.tickets.filter(
      ticket => {

        const matchesFilter =
          state.filter === "all" ||
          ticket.status ===
          state.filter;


        if (
          !matchesFilter
        ) {

          return false;

        }


        if (
          !search
        ) {

          return true;

        }


        return (

          String(
            ticket.subject
          )
          .toLowerCase()
          .includes(
            search
          ) ||

          String(
            ticket.id
          )
          .toLowerCase()
          .includes(
            search
          ) ||

          String(
            ticket.category
          )
          .toLowerCase()
          .includes(
            search
          )

        );

      }
    );

  }


  /* ==========================================================
     CREATE TICKET ELEMENT
  ========================================================== */

  function createTicketElement(
    ticket
  ) {

    const article =
      document.createElement(
        "article"
      );


    article.className =
      "support-ticket-card";


    article.dataset.supportTicket =
      "true";


    article.dataset.ticketId =
      ticket.id;


    article.innerHTML = `

      <div class="support-ticket-header">

        <div>

          <span class="support-ticket-reference">
            ${escapeHTML(
              ticket.reference ||
              ticket.id ||
              "Support request"
            )}
          </span>

          <h3>
            ${escapeHTML(
              ticket.subject
            )}
          </h3>

        </div>

        <span
          class="support-ticket-status status-${escapeHTML(
            ticket.status
          )}"
        >
          ${escapeHTML(
            formatStatus(
              ticket.status
            )
          )}
        </span>

      </div>


      <div class="support-ticket-meta">

        <span>
          ${escapeHTML(
            ticket.category
          )}
        </span>

        <span>
          Priority:
          ${escapeHTML(
            capitalize(
              ticket.priority
            )
          )}
        </span>

        <span>
          ${escapeHTML(
            formatDate(
              ticket.createdAt
            )
          )}
        </span>

      </div>


      <p class="support-ticket-preview">
        ${escapeHTML(
          truncate(
            ticket.message,
            180
          )
        )}
      </p>


      <div class="support-ticket-footer">

        <button
          type="button"
          class="btn btn-outline"
          data-ticket-details
          data-ticket-id="${escapeHTML(
            ticket.id
          )}"
        >
          View Details
        </button>

      </div>

    `;


    return article;

  }


  /* ==========================================================
     BIND TICKET EVENTS
  ========================================================== */

  function bindTicketEvents() {

    $$(CONFIG.selectors.ticketDetails)
      .forEach(
        button => {

          button.addEventListener(
            "click",
            function () {

              openTicket(
                button.dataset.ticketId
              );

            }
          );

        }
      );

  }


  /* ==========================================================
     OPEN TICKET
  ========================================================== */

  function openTicket(
    ticketId
  ) {

    const ticket =
      state.tickets.find(
        item =>
          String(
            item.id
          ) ===
          String(
            ticketId
          )
      );


    if (!ticket) {

      showError(
        "The requested support ticket could not be found."
      );

      return;

    }


    state.selectedTicket =
      ticket;


    const modal =
      $(CONFIG.selectors.modal);


    const content =
      $(CONFIG.selectors.modalContent);


    if (
      !modal ||
      !content
    ) {

      showTicketDetailsInline(
        ticket
      );

      return;

    }


    content.innerHTML =
      buildTicketDetails(
        ticket
      );


    modal.hidden =
      false;


    modal.classList.add(
      "open"
    );


    document.body.classList.add(
      "modal-open"
    );


    document.dispatchEvent(
      new CustomEvent(
        "gtf:support-ticket-opened",
        {
          detail: {
            ticket
          }
        }
      )
    );

  }


  /* ==========================================================
     INLINE DETAILS FALLBACK
  ========================================================== */

  function showTicketDetailsInline(
    ticket
  ) {

    const container =
      $(CONFIG.selectors.ticketList);


    if (!container) {
      return;
    }


    const details =
      document.createElement(
        "div"
      );


    details.className =
      "support-ticket-details";


    details.innerHTML =
      buildTicketDetails(
        ticket
      );


    container.prepend(
      details
    );

  }


  /* ==========================================================
     BUILD TICKET DETAILS
  ========================================================== */

  function buildTicketDetails(
    ticket
  ) {

    return `

      <div class="support-detail-header">

        <div>

          <span class="support-ticket-reference">
            ${escapeHTML(
              ticket.reference ||
              ticket.id ||
              "Support request"
            )}
          </span>

          <h2>
            ${escapeHTML(
              ticket.subject
            )}
          </h2>

        </div>

        <span
          class="support-ticket-status status-${escapeHTML(
            ticket.status
          )}"
        >
          ${escapeHTML(
            formatStatus(
              ticket.status
            )
          )}
        </span>

      </div>


      <div class="support-detail-meta">

        <div>
          <strong>Category</strong>
          <span>
            ${escapeHTML(
              ticket.category
            )}
          </span>
        </div>

        <div>
          <strong>Priority</strong>
          <span>
            ${escapeHTML(
              capitalize(
                ticket.priority
              )
            )}
          </span>
        </div>

        <div>
          <strong>Created</strong>
          <span>
            ${escapeHTML(
              formatDate(
                ticket.createdAt
              )
            )}
          </span>
        </div>

      </div>


      <div class="support-detail-message">

        <h3>Your message</h3>

        <p>
          ${escapeHTML(
            ticket.message
          )}
        </p>

      </div>


      ${
        ticket.response
          ? `
            <div class="support-detail-response">

              <h3>Support response</h3>

              <p>
                ${escapeHTML(
                  ticket.response
                )}
              </p>

            </div>
          `
          : `
            <div class="support-detail-pending">

              <strong>
                Awaiting response
              </strong>

              <p>
                Our support team has not yet added a response to this request.
              </p>

            </div>
          `
      }

    `;

  }


  /* ==========================================================
     CLOSE MODAL
  ========================================================== */

  function closeModal() {

    const modal =
      $(CONFIG.selectors.modal);


    if (!modal) {
      return;
    }


    modal.classList.remove(
      "open"
    );


    modal.hidden =
      true;


    document.body.classList.remove(
      "modal-open"
    );


    state.selectedTicket =
      null;

  }


  /* ==========================================================
     SEARCH
  ========================================================== */

  function initializeSearch() {

    const input =
      $(CONFIG.selectors.search);


    if (!input) {
      return;
    }


    input.addEventListener(
      "input",
      function () {

        state.search =
          input.value;


        renderTickets();

      }
    );

  }


  /* ==========================================================
     FILTER
  ========================================================== */

  function initializeFilter() {

    const filter =
      $(CONFIG.selectors.filter);


    if (!filter) {
      return;
    }


    filter.addEventListener(
      "change",
      function () {

        state.filter =
          filter.value ||
          "all";


        renderTickets();

      }
    );

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
            function () {

              loadTickets();

            }
          );

        }
      );

  }


  /* ==========================================================
     RESET FORM
  ========================================================== */

  function resetForm() {

    const form =
      $(CONFIG.selectors.form);


    if (!form) {
      return;
    }


    form.reset();


    clearFieldErrors();

  }


  /* ==========================================================
     SUBMIT BUTTON STATE
  ========================================================== */

  function setSubmitState(
    submitting
  ) {

    $$(CONFIG.selectors.submit)
      .forEach(
        button => {

          button.disabled =
            submitting;


          button.classList.toggle(
            "is-loading",
            submitting
          );


          if (
            submitting
          ) {

            button.dataset.originalText =
              button.textContent;


            button.textContent =
              "Submitting…";

          } else {

            button.textContent =
              button.dataset.originalText ||
              "Submit Request";

          }

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
     EMPTY STATE
  ========================================================== */

  function showTicketEmptyState() {

    $$(CONFIG.selectors.ticketEmpty)
      .forEach(
        element => {

          element.hidden =
            false;

        }
      );

  }


  function hideTicketEmptyState() {

    $$(CONFIG.selectors.ticketEmpty)
      .forEach(
        element => {

          element.hidden =
            true;

        }
      );

  }


  /* ==========================================================
     TICKET COUNT
  ========================================================== */

  function updateTicketCount() {

    const element =
      $(CONFIG.selectors.ticketCount);


    if (!element) {
      return;
    }


    const count =
      getFilteredTickets().length;


    element.textContent =
      `${count} ${
        count === 1
          ? "request"
          : "requests"
      }`;

  }


  /* ==========================================================
     ERROR MESSAGE
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
     SUCCESS MESSAGE
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
     STATUS MESSAGE
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


    $$(CONFIG.selectors.status)
      .forEach(
        element => {

          element.textContent =
            "";

        }
      );

  }


  /* ==========================================================
     CLEAR FIELD ERRORS
  ========================================================== */

  function clearFieldErrors() {

    $$(
      "input, textarea, select",
      $(CONFIG.selectors.form) || document
    )
      .forEach(
        field => {

          field.classList.remove(
            "is-invalid"
          );


          field.removeAttribute(
            "aria-invalid"
          );

        }
      );

  }


  /* ==========================================================
     FOCUS INVALID FIELD
  ========================================================== */

  function focusInvalidField(
    selector
  ) {

    clearFieldErrors();


    if (!selector) {
      return;
    }


    const field =
      $(selector);


    if (!field) {
      return;
    }


    field.classList.add(
      "is-invalid"
    );


    field.setAttribute(
      "aria-invalid",
      "true"
    );


    field.focus();

  }


  /* ==========================================================
     NORMALIZE SINGLE RESPONSE TICKET
  ========================================================== */

  function normalizeTicketFromResponse(
    response
  ) {

    const raw =
      response?.ticket ||
      response?.data?.ticket ||
      response?.data;


    if (
      !raw ||
      typeof raw !==
      "object"
    ) {

      return null;

    }


    return normalizeTickets(
      [raw]
    )[0] || null;

  }


  /* ==========================================================
     FORMAT STATUS
  ========================================================== */

  function formatStatus(
    status
  ) {

    switch (
      status
    ) {

      case "in_progress":
        return "In Progress";

      case "pending":
        return "Pending";

      case "closed":
        return "Closed";

      default:
        return "Open";

    }

  }


  /* ==========================================================
     FORMAT DATE
  ========================================================== */

  function formatDate(
    value
  ) {

    if (!value) {

      return "Date unavailable";

    }


    const date =
      new Date(
        value
      );


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return "Date unavailable";

    }


    return new Intl.DateTimeFormat(
      undefined,
      {
        year:
          "numeric",

        month:
          "short",

        day:
          "numeric",

        hour:
          "numeric",

        minute:
          "2-digit"
      }
    ).format(
      date
    );

  }


  /* ==========================================================
     TRUNCATE
  ========================================================== */

  function truncate(
    value,
    length
  ) {

    const text =
      String(
        value ||
        ""
      );


    if (
      text.length <=
      length
    ) {

      return text;

    }


    return (
      text.slice(
        0,
        length
      ) +
      "…"
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
        value ||
        ""
      );


    return (
      text.charAt(0).toUpperCase() +
      text.slice(1)
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
      "We could not complete your support request. Please try again."
    );

  }


  /* ==========================================================
     ESCAPE HTML
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
     INITIALIZE FORM
  ========================================================== */

  function initializeForm() {

    const form =
      $(CONFIG.selectors.form);


    if (!form) {
      return;
    }


    form.addEventListener(
      "submit",
      submitTicket
    );


    $$(CONFIG.selectors.reset, form)
      .forEach(
        button => {

          button.addEventListener(
            "click",
            function () {

              resetForm();

            }
          );

        }
      );


    const messageField =
      $(CONFIG.selectors.message, form);


    if (
      messageField
    ) {

      messageField.addEventListener(
        "input",
        function () {

          const remaining =
            CONFIG.validation.messageMax -
            messageField.value.length;


          const counter =
            form.querySelector(
              "[data-support-message-count]"
            );


          if (
            counter
          ) {

            counter.textContent =
              `${Math.max(
                0,
                remaining
              )} characters remaining`;

          }

        }
      );

    }

  }


  /* ==========================================================
     MODAL EVENTS
  ========================================================== */

  function initializeModal() {

    $$(CONFIG.selectors.modalClose)
      .forEach(
        button => {

          button.addEventListener(
            "click",
            closeModal
          );

        }
      );


    const modal =
      $(CONFIG.selectors.modal);


    if (
      modal
    ) {

      modal.addEventListener(
        "click",
        function (event) {

          if (
            event.target ===
            modal
          ) {

            closeModal();

          }

        }
      );

    }


    document.addEventListener(
      "keydown",
      function (event) {

        if (
          event.key ===
          "Escape"
        ) {

          closeModal();

        }

      }
    );

  }


  /* ==========================================================
     CONNECTION EVENTS
  ========================================================== */

  function initializeConnectionEvents() {

    window.addEventListener(
      "offline",
      function () {

        setStatus(
          "error",
          "You are offline. Support requests cannot be submitted until your connection is restored."
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


        loadTickets();

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

          loadTickets();

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
      await requireAuthentication();


    if (!authenticated) {
      return;
    }


    initializeForm();

    initializeRefresh();

    initializeSearch();

    initializeFilter();

    initializeModal();

    initializeConnectionEvents();

    initializeVisibilityEvents();


    await loadTickets();


    document.documentElement
      .classList.add(
        "gtf-support-ready"
      );

  }


  /* ==========================================================
     PUBLIC API
  ========================================================== */

  window.GTF_SUPPORT = {

    config:
      CONFIG,

    state,

    initialize,

    loadTickets,

    refresh:
      loadTickets,

    submitTicket,

    openTicket,

    closeModal,

    clearMessages

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
        once:
          true
      }
    );

  } else {

    initialize();

  }


})(window, document);