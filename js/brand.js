(function () {
  var DEFAULT_CONFIG = {
    handbook_title: document.title || "",
    entity_code: "",
    home_url: "/",
    eyebrow: "",
    brand_subtitle: "",
    meta_description: "",
    public_site_url: "",
    public_site_label: "",
    group_site_url: "",
    group_site_label: "",
    theme: {}
  };

  var THEME_VARIABLES = {
    canvas: "--brand-canvas",
    canvasAlt: "--brand-canvas-alt",
    surface: "--brand-surface",
    surfaceAlt: "--brand-surface-alt",
    line: "--brand-line",
    lineStrong: "--brand-line-strong",
    text: "--brand-text",
    muted: "--brand-muted",
    accent: "--brand-accent",
    accentStrong: "--brand-accent-strong",
    accentSoft: "--brand-accent-soft",
    highlight: "--brand-highlight"
  };

  function setTextContent(selector, value) {
    if (!value) {
      return;
    }

    document.querySelectorAll(selector).forEach(function (node) {
      node.textContent = value;
    });
  }

  function setMetaDescription(value) {
    var content = String(value || "").trim();
    if (!content) {
      return;
    }

    var meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }

    meta.setAttribute("content", content);
  }

  function applyTheme(theme) {
    if (!theme || typeof theme !== "object") {
      return;
    }

    Object.keys(THEME_VARIABLES).forEach(function (key) {
      var value = theme[key];
      if (typeof value === "string" && value.trim()) {
        document.documentElement.style.setProperty(THEME_VARIABLES[key], value.trim());
      }
    });
  }

  function makeUtilityLink(label, href) {
    var link = document.createElement("a");
    link.className = "brand-link";
    link.href = href;

    if (/^https?:\/\//i.test(href)) {
      link.target = "_blank";
      link.rel = "noreferrer noopener";
    }

    link.textContent = label;
    return link;
  }

  function applyBrandLinks(config) {
    var brandLockup = document.querySelector(".brand-lockup");
    if (!brandLockup) {
      return;
    }

    var utilityLinks = brandLockup.querySelector(".brand-utility-links");
    if (!utilityLinks) {
      utilityLinks = document.createElement("div");
      utilityLinks.className = "brand-utility-links";
      brandLockup.appendChild(utilityLinks);
    }

    var links = [];
    var publicSiteUrl = String(config.public_site_url || "").trim();
    var publicSiteLabel = String(config.public_site_label || "").trim();
    var groupSiteUrl = String(config.group_site_url || "").trim();
    var groupSiteLabel = String(config.group_site_label || "").trim();

    if (publicSiteUrl) {
      links.push(makeUtilityLink("Visit " + (publicSiteLabel || "public site"), publicSiteUrl));
    }

    if (groupSiteUrl && groupSiteUrl !== publicSiteUrl) {
      links.push(makeUtilityLink(groupSiteLabel || "Open EARN Group", groupSiteUrl));
    }

    if (!links.length) {
      utilityLinks.remove();
      return;
    }

    utilityLinks.replaceChildren.apply(utilityLinks, links);
  }

  function applyBranding(config) {
    var merged = Object.assign({}, DEFAULT_CONFIG, config || {});
    var handbookTitle = String(merged.handbook_title || "").trim();
    var entityCode = String(merged.entity_code || "").trim();
    var homeUrl = String(merged.home_url || "").trim();

    if (handbookTitle) {
      document.title = handbookTitle;
      document.querySelectorAll("[data-handbook-title]").forEach(function (node) {
        node.textContent = handbookTitle;
      });
    }

    if (entityCode) {
      if (document.body) {
        document.body.setAttribute("data-entity-code", entityCode);
      }
      document.querySelectorAll("[data-entity-badge]").forEach(function (node) {
        node.textContent = entityCode;
      });
    }

    if (homeUrl) {
      document.querySelectorAll("[data-handbook-home-url]").forEach(function (node) {
        if (node.tagName && node.tagName.toLowerCase() === "a") {
          node.setAttribute("href", homeUrl);
        }
      });
    }

    setTextContent(".eyebrow", String(merged.eyebrow || "").trim());
    setTextContent(".brand-sub", String(merged.brand_subtitle || "").trim());
    setMetaDescription(merged.meta_description);
    applyTheme(merged.theme);
    applyBrandLinks(merged);

    window.__HANDBOOK_CONFIG__ = merged;
  }

  function initBranding() {
    fetch("/handbook.config.json", {
      headers: {
        Accept: "application/json"
      }
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("HTTP " + response.status);
        }
        return response.json();
      })
      .then(function (payload) {
        applyBranding(payload || {});
      })
      .catch(function () {
        applyBranding(DEFAULT_CONFIG);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBranding, { once: true });
  } else {
    initBranding();
  }
})();
