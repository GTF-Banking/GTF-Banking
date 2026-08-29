/* =========================================================
   GLOBAL TRUSTFUND
   CENTRAL NAVIGATION ENGINE

   File:
   frontend/js/navigation.js
   ========================================================= */

(function () {

    "use strict";


    function applyRoutes() {

        if (!window.GTF_ROUTES) {

            console.error(
                "[GTF Navigation] routes.js has not loaded."
            );

            return;

        }


        document
            .querySelectorAll("[data-route]")
            .forEach(function (element) {

                const routeName =
                    element.getAttribute(
                        "data-route"
                    );


                const route =
                    window.GTF_ROUTES[
                        routeName
                    ];


                if (!route) {

                    console.warn(
                        "[GTF Navigation] Unknown route:",
                        routeName
                    );

                    return;

                }


                element.setAttribute(
                    "href",
                    route.path
                );


                if (
                    element.dataset.routeLabel === "true"
                ) {

                    element.textContent =
                        route.label;

                }

            });

    }


    function closeMobileNavigation() {

        const nav =
            document.querySelector(
                ".gtf-mobile-nav"
            );


        const button =
            document.querySelector(
                ".gtf-menu-button"
            );


        if (!nav) {
            return;
        }


        nav.classList.remove("is-open");


        if (button) {

            button.setAttribute(
                "aria-expanded",
                "false"
            );

        }

    }


    function setupMobileNavigation() {

        const button =
            document.querySelector(
                ".gtf-menu-button"
            );


        const nav =
            document.querySelector(
                ".gtf-mobile-nav"
            );


        if (!button || !nav) {
            return;
        }


        button.addEventListener(
            "click",
            function () {

                const open =
                    nav.classList.toggle(
                        "is-open"
                    );


                button.setAttribute(
                    "aria-expanded",
                    String(open)
                );

            }
        );


        nav
            .querySelectorAll("a")
            .forEach(function (link) {

                link.addEventListener(
                    "click",
                    closeMobileNavigation
                );

            });


        window.addEventListener(
            "resize",
            function () {

                if (
                    window.innerWidth > 900
                ) {

                    closeMobileNavigation();

                }

            }
        );

    }


    function setupScrollReveal() {

        const elements =
            document.querySelectorAll(
                "[data-reveal]"
            );


        if (!elements.length) {
            return;
        }


        if (
            !("IntersectionObserver" in window)
        ) {

            elements.forEach(
                function (element) {

                    element.classList.add(
                        "is-visible"
                    );

                }
            );

            return;

        }


        const observer =
            new IntersectionObserver(
                function (entries) {

                    entries.forEach(
                        function (entry) {

                            if (
                                entry.isIntersecting
                            ) {

                                entry.target.classList.add(
                                    "is-visible"
                                );

                                observer.unobserve(
                                    entry.target
                                );

                            }

                        }
                    );

                },
                {
                    threshold: 0.12
                }
            );


        elements.forEach(
            function (element) {

                observer.observe(element);

            }
        );

    }


    document.addEventListener(
        "DOMContentLoaded",
        function () {

            applyRoutes();

            setupMobileNavigation();

            setupScrollReveal();

        }
    );


})();
