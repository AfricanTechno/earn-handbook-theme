(function () {
  var DESKTOP_BREAKPOINT = 1024;

  function isDesktop() {
    return window.innerWidth >= DESKTOP_BREAKPOINT;
  }

  function initMobileNav() {
    var body = document.body;
    var sidebar = document.querySelector("[data-sidebar]");
    var overlay = document.querySelector("[data-sidebar-overlay]");
    var toggle = document.querySelector("[data-mobile-menu-toggle]");
    var mobileNav = document.querySelector("[data-mobile-nav]");

    if (!sidebar || !overlay || !toggle || !mobileNav) {
      return;
    }

    function openSidebar() {
      body.classList.add("eh-sidebar-open");
      toggle.setAttribute("aria-expanded", "true");
    }

    function closeSidebar() {
      body.classList.remove("eh-sidebar-open");
      toggle.setAttribute("aria-expanded", "false");
    }

    function toggleSidebar() {
      if (body.classList.contains("eh-sidebar-open")) {
        closeSidebar();
      } else {
        openSidebar();
      }
    }

    toggle.addEventListener("click", toggleSidebar);
    overlay.addEventListener("click", closeSidebar);

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && body.classList.contains("eh-sidebar-open")) {
        closeSidebar();
      }
    });

    window.addEventListener("resize", function () {
      if (isDesktop()) {
        closeSidebar();
      }
    });

    mobileNav.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-action]");
      if (!button) {
        return;
      }

      var action = button.getAttribute("data-action");
      if (action === "menu") {
        toggleSidebar();
        return;
      }

      if (action === "search") {
        openSidebar();
        var searchInput = document.querySelector("[data-search-input]");
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      if (action === "domains") {
        openSidebar();
        var domainLink = document.querySelector("[data-domain-nav] a, [data-domain-nav] button");
        if (domainLink) {
          domainLink.focus();
        }
        return;
      }

      if (action === "recent") {
        openSidebar();
        var recentLink = document.querySelector("[data-recents-list] a, [data-recents-list] button");
        if (recentLink) {
          recentLink.focus();
        }
      }
    });

    sidebar.addEventListener("click", function (event) {
      var clickable = event.target.closest("a[href], button[data-path]");
      if (!clickable) {
        return;
      }

      if (!isDesktop()) {
        closeSidebar();
      }
    });
  }

  window.EarnThemeMobileNav = {
    init: initMobileNav
  };

  document.addEventListener("DOMContentLoaded", function () {
    initMobileNav();
  });
})();
