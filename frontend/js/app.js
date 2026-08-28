/* =========================================================
   GLOBAL TRUSTFUND
   Shared Frontend Application JavaScript
   ========================================================= */

"use strict";


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    initializeMobileMenu();
    initializeCurrentYear();
    initializePasswordToggles();
    initializeNavigation();
    initializeForms();

});


/* =========================================================
   MOBILE MENU
   ========================================================= */

function initializeMobileMenu() {

    const menuButton =
        document.getElementById("mobileMenuButton");

    const navigation =
        document.getElementById("mainNavigation");

    if (!menuButton || !navigation) {
        return;
    }

    menuButton.addEventListener("click", () => {

        const isOpen =
            navigation.classList.toggle("is-open");

        menuButton.classList.toggle(
            "is-open",
            isOpen
        );

        menuButton.setAttribute(
            "aria-expanded",
            String(isOpen)
        );

        menuButton.setAttribute(
            "aria-label",
            isOpen
                ? "Close navigation"
                : "Open navigation"
        );

    });


    /* Close menu after selecting a link */

    navigation
        .querySelectorAll("a")
        .forEach(link => {

            link.addEventListener("click", () => {

                navigation.classList.remove(
                    "is-open"
                );

                menuButton.classList.remove(
                    "is-open"
                );

                menuButton.setAttribute(
                    "aria-expanded",
                    "false"
                );

                menuButton.setAttribute(
                    "aria-label",
                    "Open navigation"
                );

            });

        });


    /* Close menu when clicking outside */

    document.addEventListener("click", event => {

        if (
            !navigation.contains(event.target) &&
            !menuButton.contains(event.target)
        ) {

            navigation.classList.remove(
                "is-open"
            );

            menuButton.classList.remove(
                "is-open"
            );

            menuButton.setAttribute(
                "aria-expanded",
                "false"
            );

            menuButton.setAttribute(
                "aria-label",
                "Open navigation"
            );

        }

    });

}


/* =========================================================
   CURRENT YEAR
   ========================================================= */

function initializeCurrentYear() {

    const yearElements =
        document.querySelectorAll(
            "#currentYear"
        );

    const currentYear =
        new Date().getFullYear();

    yearElements.forEach(element => {

        element.textContent =
            currentYear;

    });

}


/* =========================================================
   PASSWORD TOGGLES
   ========================================================= */

function initializePasswordToggles() {

    const toggleButtons =
        document.querySelectorAll(
            "[data-password-toggle]"
        );


    toggleButtons.forEach(button => {

        button.addEventListener("click", () => {

            const targetId =
                button.getAttribute(
                    "data-password-toggle"
                );

            if (!targetId) {
                return;
            }


            const input =
                document.getElementById(
                    targetId
                );

            if (!input) {
                return;
            }


            const showing =
                input.type === "text";


            input.type =
                showing
                    ? "password"
                    : "text";


            button.textContent =
                showing
                    ? "Show"
                    : "Hide";


            button.setAttribute(
                "aria-label",
                showing
                    ? "Show password"
                    : "Hide password"
            );

        });

    });

}


/* =========================================================
   NAVIGATION
   ========================================================= */

function initializeNavigation() {

    const currentPath =
        window.location.pathname
            .replace(/\\/g, "/")
            .toLowerCase();


    const navigationLinks =
        document.querySelectorAll(
            ".main-navigation a"
        );


    navigationLinks.forEach(link => {

        const href =
            link.getAttribute("href");


        if (
            !href ||
            href.startsWith("#") ||
            href.startsWith("http")
        ) {
            return;
        }


        const linkUrl =
            new URL(
                href,
                window.location.href
            );


        const linkPath =
            linkUrl.pathname
                .replace(/\\/g, "/")
                .toLowerCase();


        if (
            linkPath === currentPath ||
            (
                linkPath.endsWith("/index.html") &&
                currentPath.endsWith("/")
            )
        ) {

            link.classList.add(
                "active"
            );

        }

    });

}


/* =========================================================
   FORM HELPERS
   ========================================================= */

function initializeForms() {

    const forms =
        document.querySelectorAll(
            "form"
        );


    forms.forEach(form => {

        form.addEventListener(
            "submit",
            event => {

                /*
                 * Authentication pages can provide their
                 * own submit handlers.
                 *
                 * Do not prevent submission here.
                 */

                const submitButton =
                    form.querySelector(
                        "button[type='submit']"
                    );


                if (
                    submitButton &&
                    !submitButton.dataset.originalText
                ) {

                    submitButton.dataset.originalText =
                        submitButton.innerHTML;

                }

            }
        );

    });

}


/* =========================================================
   BUTTON LOADING STATE
   ========================================================= */

function setButtonLoading(
    button,
    loading,
    loadingText = "Processing..."
) {

    if (!button) {
        return;
    }


    if (loading) {

        if (
            !button.dataset.originalText
        ) {

            button.dataset.originalText =
                button.innerHTML;

        }


        button.disabled = true;

        button.innerHTML = `
            <span class="button-content">
                <span class="loading-spinner"
                      aria-hidden="true"></span>
                ${loadingText}
            </span>
        `;

    } else {

        button.disabled = false;

        if (
            button.dataset.originalText
        ) {

            button.innerHTML =
                button.dataset.originalText;

        }

    }

}


/* =========================================================
   STATUS MESSAGE
   ========================================================= */

function showFormStatus(
    element,
    message,
    type = "error"
) {

    if (!element) {
        return;
    }


    element.textContent =
        message;


    element.classList.remove(
        "error",
        "success"
    );


    element.classList.add(
        type
    );


    element.style.display =
        "block";

}


function hideFormStatus(element) {

    if (!element) {
        return;
    }


    element.textContent =
        "";


    element.classList.remove(
        "error",
        "success"
    );


    element.style.display =
        "none";

}


/* =========================================================
   SIMPLE EMAIL VALIDATION
   ========================================================= */

function isValidEmail(email) {

    const pattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return pattern.test(
        String(email).trim()
    );

}


/* =========================================================
   PASSWORD STRENGTH
   ========================================================= */

function getPasswordStrength(password) {

    const value =
        String(password || "");


    let score = 0;


    if (value.length >= 8) {
        score++;
    }


    if (/[a-z]/.test(value)) {
        score++;
    }


    if (/[A-Z]/.test(value)) {
        score++;
    }


    if (/[0-9]/.test(value)) {
        score++;
    }


    if (/[^A-Za-z0-9]/.test(value)) {
        score++;
    }


    if (score <= 1) {

        return {
            score,
            label: "Very weak"
        };

    }


    if (score === 2) {

        return {
            score,
            label: "Weak"
        };

    }


    if (score === 3) {

        return {
            score,
            label: "Fair"
        };

    }


    if (score === 4) {

        return {
            score,
            label: "Good"
        };

    }


    return {
        score,
        label: "Strong"
    };

}


/* =========================================================
   GLOBAL TRUSTFUND LOGO HELPER
   ========================================================= */

function getGTFLogoMarkup(basePath = ".") {

    return `
        <a
            href="${basePath}/index.html"
            class="brand"
            aria-label="Global TrustFund home"
        >

            <img
                src="${basePath}/assets/gtf-logo.svg"
                alt="Global TrustFund logo"
                class="brand-logo"
            >

            <span class="brand-text">

                <strong>
                    Global TrustFund
                </strong>

                <small>
                    Banking
                </small>

            </span>

        </a>
    `;

}


/* =========================================================
   GLOBAL TRUSTFUND PAGE HELPERS
   ========================================================= */

window.GTF = {

    setButtonLoading,

    showFormStatus,

    hideFormStatus,

    isValidEmail,

    getPasswordStrength,

    getGTFLogoMarkup

};
