(() => {
  const menuToggle = document.getElementById("menu-toggle");
  const sidebar = document.getElementById("sidebar");
  const searchTrigger = document.getElementById("search-trigger");
  const sitesTrigger = document.getElementById("sites-trigger");
  const docSearchInput = document.getElementById("doc-search");
  const utilityTitle = document.getElementById("utility-doc-title");
  const docTitle = document.getElementById("doc-title");
  const siteLink = document.querySelector(".shell-site-link");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DRAWER_BREAKPOINT = 1100;
  const DRAWER_TRANSITION_MS = prefersReducedMotion ? 1 : 220;
  const SEARCH_RENDER_DEBOUNCE_MS = prefersReducedMotion ? 0 : 120;
  const NAV_INDEX_ENDPOINTS = ["/data/nav-index.json", "/api/tree"];
  const SEARCH_INDEX_ENDPOINTS = ["/data/search-index.json"];
  const SYSTEMS = [
    {
      id: "earnos",
      label: "earnOS",
      title: "EARN Group hub",
      description: "Group governance and shared services",
      port: 4273,
      host: "earnos-navigator.pages.dev"
    },
    {
      id: "agos",
      label: "agOS",
      title: "African Greeneurs",
      description: "Entity governance and operations",
      port: 4373,
      host: "agos-navigator.pages.dev"
    },
    {
      id: "aghos",
      label: "aghOS",
      title: "AG Horticulture",
      description: "Production and horticulture operations",
      port: 4473,
      host: "aghos-navigator.pages.dev"
    },
    {
      id: "alpos",
      label: "alpOS",
      title: "African Lakeside Properties",
      description: "Property governance and estate operations",
      port: 4573,
      host: "alpos-navigator.pages.dev"
    },
    {
      id: "atos",
      label: "atOS",
      title: "African Technopreneurs",
      description: "Entity operating system and delivery",
      port: 4173,
      host: "atos-navigator.pages.dev"
    },
    {
      id: "ebsos",
      label: "ebsOS",
      title: "EARN Business Solutions",
      description: "Shared-services execution controls",
      port: 4673,
      host: "ebsos-navigator.pages.dev"
    }
  ];

  const shellState = {
    docsPromise: null,
    docs: [],
    docsByPath: new Map(),
    topics: [],
    remoteSearchCache: new Map(),
    remoteSearchAvailable: null,
    utilityMode: "",
    utilityReturnFocus: null,
    searchRenderTimer: 0,
    searchRequestId: 0,
    overlay: null,
    scrim: null,
    sheet: null,
    titleNode: null,
    closeButton: null,
    searchPanel: null,
    searchField: null,
    searchResults: null,
    searchMeta: null,
    sitesPanel: null,
    sitesList: null
  };

  let drawerTimer = 0;
  let treeFrame = 0;
  let syncingTree = false;

  function isDrawerViewport() {
    return window.innerWidth < DRAWER_BREAKPOINT;
  }

  function isLocalRuntimeHost(hostname) {
    const normalized = String(hostname || "").toLowerCase();
    return normalized === "127.0.0.1" || normalized === "localhost";
  }

  function currentSystemId() {
    const hostname = String(window.location.hostname || "").toLowerCase();
    const port = Number(window.location.port || 0);

    if (isLocalRuntimeHost(hostname)) {
      const localSystem = SYSTEMS.find((system) => system.port === port);
      if (localSystem) {
        return localSystem.id;
      }
    }

    const hostedSystem = SYSTEMS.find((system) => system.host === hostname);
    if (hostedSystem) {
      return hostedSystem.id;
    }

    const titleText = `${document.title} ${siteLink ? siteLink.textContent : ""}`.toLowerCase();
    const inferred = SYSTEMS.find((system) => titleText.includes(system.label.toLowerCase()));
    return inferred ? inferred.id : "";
  }

  function resolveSystemUrl(systemId) {
    const system = SYSTEMS.find((entry) => entry.id === String(systemId || "").toLowerCase());
    if (!system) {
      return "/";
    }

    if (isLocalRuntimeHost(window.location.hostname)) {
      return `${window.location.protocol}//${window.location.hostname}:${system.port}/`;
    }

    return `https://${system.host}/`;
  }

  function normalizeSearchText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function prettyTreeLabel(value) {
    return String(value || "")
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (match) => match.toUpperCase());
  }

  function prettyDomainLabel(value) {
    if (!value || value === "all") {
      return "All topics";
    }

    if (String(value).toLowerCase() === "root") {
      return "Overview";
    }

    return prettyTreeLabel(value);
  }

  function displayTitleFromPath(pathValue) {
    const parts = String(pathValue || "")
      .split("/")
      .filter(Boolean);
    const lastPart = parts.length ? parts[parts.length - 1] : "Document";
    return prettyTreeLabel(lastPart);
  }

  function createHeading(level, text) {
    const heading = document.createElement(level);
    heading.textContent = text;
    return heading;
  }

  function fetchJsonOrNull(url) {
    return fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        try {
          return await response.json();
        } catch {
          return null;
        }
      })
      .catch(() => null);
  }

  function closestMoveGroup(control) {
    if (!control) {
      return null;
    }

    const wrapper = control.closest(".domain-jump-wrap, .system-jump-wrap, .domain-switch-wrap, .entity-switch-wrap, label");
    if (!wrapper || !sidebar || !sidebar.contains(wrapper)) {
      return null;
    }

    if (wrapper.matches(".domain-jump-wrap, .system-jump-wrap, .domain-switch-wrap, .entity-switch-wrap")) {
      return wrapper;
    }

    if (wrapper.tagName === "LABEL" && wrapper.querySelectorAll("input, select, textarea, button").length === 1) {
      return wrapper;
    }

    return null;
  }

  function cleanupEmptyNode(node) {
    if (!node || !sidebar || !sidebar.contains(node)) {
      return;
    }

    const shouldKeep =
      node.matches(".panel, .brand-panel, .systems-panel, .domain-panel, .docs-panel, .recent-panel, .recents-panel") ||
      node.querySelector(
        "input, select, button[data-path], button[data-domain], a[href], #systems-list, #domain-chips, #doc-list, #recent-list, #recent-links, #recent-docs"
      );

    if (!shouldKeep && !node.textContent.trim()) {
      node.remove();
    }
  }

  function moveLooseField(labelSelector, control, panel, fieldClass, labelClass, fallbackLabel) {
    if (!control || !panel) {
      return;
    }

    if (panel.contains(control)) {
      return;
    }

    const parentBeforeMove = control.parentElement;
    const moveGroup = closestMoveGroup(control);
    if (moveGroup) {
      panel.appendChild(moveGroup);
      cleanupEmptyNode(parentBeforeMove);
      return;
    }

    const looseLabel = labelSelector ? document.querySelector(labelSelector) : null;
    const wrapper = document.createElement("label");
    wrapper.className = fieldClass;

    const label = document.createElement("span");
    label.className = labelClass;
    label.textContent = looseLabel && looseLabel.textContent ? looseLabel.textContent.trim() : fallbackLabel;
    wrapper.appendChild(label);
    wrapper.appendChild(control);

    panel.appendChild(wrapper);

    if (looseLabel && looseLabel.parentElement) {
      const labelParent = looseLabel.parentElement;
      looseLabel.remove();
      cleanupEmptyNode(labelParent);
    }

    cleanupEmptyNode(parentBeforeMove);
  }

  function ensurePanel(id, className, title) {
    if (!sidebar) {
      return null;
    }

    let panel = document.getElementById(id);
    if (!panel) {
      panel = document.createElement("section");
      panel.id = id;
      panel.className = `panel ${className}`;
      sidebar.appendChild(panel);
    }

    panel.classList.add("panel");
    if (className) {
      for (const token of className.split(" ")) {
        if (token) {
          panel.classList.add(token);
        }
      }
    }

    if (title) {
      const existingHeading = panel.querySelector(":scope > h2, :scope > .systems-head h2, :scope > .docs-head h2");
      if (existingHeading) {
        existingHeading.textContent = title;
      } else {
        panel.prepend(createHeading("h2", title));
      }
    }

    return panel;
  }

  function assignPanelMetadata(panel, section) {
    if (!panel) {
      return;
    }

    panel.dataset.shellSection = section;
  }

  function reorderPanels(panels) {
    if (!sidebar) {
      return;
    }

    const ordered = panels.filter(Boolean);
    const leftovers = [...sidebar.children].filter((child) => !ordered.includes(child));

    for (const panel of [...ordered, ...leftovers]) {
      sidebar.appendChild(panel);
    }
  }

  function renderEmbeddedSystemsList() {
    const sitesPanel = document.getElementById("panel-sites");
    if (!sitesPanel) {
      return;
    }

    let block = sitesPanel.querySelector(".shell-sites-compact");
    if (!block) {
      block = document.createElement("section");
      block.className = "shell-sites-compact";
      block.innerHTML = '<h3 class="shell-compact-title">EARN handbooks</h3><div class="shell-sites-list"></div>';

      const anchors = [...sitesPanel.querySelectorAll(".shell-field-site, .system-jump-wrap")];
      const afterNode = anchors.length ? anchors[anchors.length - 1] : sitesPanel.querySelector(":scope > h2, :scope > .systems-head");
      if (afterNode) {
        afterNode.insertAdjacentElement("afterend", block);
      } else {
        sitesPanel.prepend(block);
      }
    }

    const list = block.querySelector(".shell-sites-list");
    if (!list) {
      return;
    }

    const activeSystemId = currentSystemId();
    list.innerHTML = "";

    for (const system of SYSTEMS) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `shell-site-entry${system.id === activeSystemId ? " current" : ""}`;
      button.dataset.systemId = system.id;
      button.innerHTML =
        `<span class="shell-site-entry-main">` +
        `<span class="shell-site-entry-label">${system.label}</span>` +
        `<span class="shell-site-entry-title">${system.title}</span>` +
        `</span>` +
        `<span class="shell-site-entry-meta">${system.id === activeSystemId ? "Current handbook" : "Open handbook"}</span>`;
      list.appendChild(button);
    }
  }

  function normalizeNavigationPanels() {
    if (!sidebar) {
      return;
    }

    const brandPanel = sidebar.querySelector(".brand-panel");
    const searchPanel = ensurePanel("panel-search", "search-panel");
    const starterPanel = ensurePanel("panel-starter", "onboarding-panel", "Start here");
    const leadershipPanel = ensurePanel("panel-leadership", "leadership-panel", "Leadership essentials");
    let topicsPanel =
      document.getElementById("panel-topics") ||
      document.getElementById("panel-domains") ||
      sidebar.querySelector(".domain-panel");
    if (topicsPanel && topicsPanel.id !== "panel-topics") {
      topicsPanel.id = "panel-topics";
    }
    topicsPanel = ensurePanel("panel-topics", "domain-panel", "Topics");

    let docsPanel = document.getElementById("panel-docs") || sidebar.querySelector(".docs-panel");
    if (docsPanel && docsPanel.id !== "panel-docs") {
      docsPanel.id = "panel-docs";
    }
    docsPanel = ensurePanel("panel-docs", "docs-panel", "All documents");

    let recentsPanel =
      document.getElementById("panel-recents") ||
      document.getElementById("recent-panel") ||
      sidebar.querySelector(".recent-panel, .recents-panel");
    if (recentsPanel && recentsPanel.id !== "panel-recents") {
      recentsPanel.id = "panel-recents";
    }
    recentsPanel = ensurePanel("panel-recents", "recent-panel", "Recently viewed");

    const existingSitesPanel = document.getElementById("panel-sites") || sidebar.querySelector(".systems-panel");
    const sitesPanel = ensurePanel(
      "panel-sites",
      existingSitesPanel ? existingSitesPanel.className.replace(/\bpanel\b/g, "").trim() : "systems-panel",
      "Related handbooks"
    );

    const domainSwitch = document.getElementById("domain-switch") || document.getElementById("domain-switcher");
    const domainJump = document.getElementById("domain-jump");
    const domainChips = document.getElementById("domain-chips");
    const entitySwitch = document.getElementById("entity-switch") || document.getElementById("entity-switcher");
    const systemJump = document.getElementById("system-jump");
    const systemJumpOpen = document.getElementById("system-jump-open");

    if (domainSwitch) {
      moveLooseField(
        `label[for="${domainSwitch.id}"]`,
        domainSwitch,
        topicsPanel,
        "shell-field shell-field-topic",
        "switcher-label",
        "Topic"
      );
    }

    if (domainJump) {
      moveLooseField(`label[for="${domainJump.id}"]`, domainJump, topicsPanel, "domain-jump-wrap", "switcher-label", "Topic");
    }

    if (domainChips && !topicsPanel.contains(domainChips)) {
      topicsPanel.appendChild(domainChips);
    }

    if (entitySwitch) {
      moveLooseField(
        `label[for="${entitySwitch.id}"]`,
        entitySwitch,
        sitesPanel,
        "shell-field shell-field-site",
        "switcher-label",
        "Open a handbook"
      );
    }

    if (systemJump) {
      moveLooseField(
        `label[for="${systemJump.id}"]`,
        systemJump,
        sitesPanel,
        "system-jump-wrap",
        "switcher-label",
        "Open a handbook"
      );
    }

    if (systemJumpOpen && !sitesPanel.contains(systemJumpOpen)) {
      const systemRow = sitesPanel.querySelector(".system-jump-row");
      if (systemRow) {
        systemRow.appendChild(systemJumpOpen);
      } else {
        sitesPanel.appendChild(systemJumpOpen);
      }
    }

    assignPanelMetadata(starterPanel, "starter");
    assignPanelMetadata(leadershipPanel, "leadership");
    assignPanelMetadata(brandPanel, "brand");
    assignPanelMetadata(topicsPanel, "topics");
    assignPanelMetadata(docsPanel, "docs");
    assignPanelMetadata(recentsPanel, "recents");
    assignPanelMetadata(sitesPanel, "sites");
    assignPanelMetadata(searchPanel, "search");

    for (const selector of [".switchers", ".topbar-switchers", ".topbar-controls"]) {
      for (const node of sidebar.querySelectorAll(selector)) {
        if (!node.querySelector("input, select, button, a[href]")) {
          node.remove();
        }
      }
    }

    for (const panel of sidebar.querySelectorAll("#panel-context")) {
      if (!panel.querySelector("input, select, button, a[href], #systems-list, #domain-chips")) {
        panel.remove();
      }
    }

    reorderPanels([brandPanel, searchPanel, starterPanel, leadershipPanel, topicsPanel, recentsPanel, docsPanel, sitesPanel]);

    searchPanel.dataset.utilityPanel = "search";
    sitesPanel.dataset.utilityPanel = "sites";

    renderEmbeddedSystemsList();
  }

  function getTreeGroupMeta(path) {
    const segments = String(path || "")
      .split("/")
      .filter(Boolean);

    if (segments.length <= 1) {
      return { key: "general", label: "General" };
    }

    return {
      key: segments[0].toLowerCase(),
      label: prettyTreeLabel(segments[0])
    };
  }

  function normalizeDocumentTree() {
    const docList = document.getElementById("doc-list");
    if (!docList || syncingTree) {
      return;
    }

    if (docList.firstElementChild && docList.firstElementChild.classList.contains("doc-tree")) {
      return;
    }

    const buttons = [...docList.querySelectorAll("button[data-path]")];
    if (!buttons.length) {
      docList.classList.remove("doc-list-tree");
      return;
    }

    syncingTree = true;

    const groups = new Map();
    for (const button of buttons) {
      const path = button.dataset.path || "";
      const groupMeta = getTreeGroupMeta(path);
      const entry = groups.get(groupMeta.key) || {
        label: groupMeta.label,
        buttons: [],
        hasActive: false
      };
      entry.buttons.push(button);
      entry.hasActive ||= button.classList.contains("active");
      groups.set(groupMeta.key, entry);
    }

    const orderedGroups = [...groups.entries()].sort((left, right) => {
      if (left[0] === "general") {
        return -1;
      }
      if (right[0] === "general") {
        return 1;
      }
      return left[1].label.localeCompare(right[1].label);
    });

    const tree = document.createElement("div");
    tree.className = "doc-tree";

    orderedGroups.forEach(([key, group], index) => {
      const details = document.createElement("details");
      details.className = "doc-tree-group";
      details.dataset.group = key;
      details.open = group.hasActive || orderedGroups.length === 1 || index === 0;

      const summary = document.createElement("summary");
      summary.className = "doc-tree-summary";
      summary.innerHTML =
        `<span class="doc-tree-label">${group.label}</span>` +
        `<span class="doc-tree-count">${group.buttons.length}</span>`;

      const items = document.createElement("div");
      items.className = "doc-tree-items";

      for (const button of group.buttons) {
        items.appendChild(button);
      }

      details.append(summary, items);
      tree.appendChild(details);
    });

    docList.replaceChildren(tree);
    docList.classList.add("doc-list-tree");

    syncingTree = false;
  }

  function scheduleTreeNormalization() {
    if (treeFrame) {
      return;
    }

    treeFrame = window.requestAnimationFrame(() => {
      treeFrame = 0;
      normalizeDocumentTree();
    });
  }

  function syncUtilityTitle() {
    if (!utilityTitle) {
      return;
    }

    const fallbackTitle = (siteLink && siteLink.textContent ? siteLink.textContent : document.title || "Document").trim();
    const nextTitle = (docTitle && docTitle.textContent ? docTitle.textContent : "").trim();
    const resolvedTitle = nextTitle && !/^loading/i.test(nextTitle) ? nextTitle : fallbackTitle;
    utilityTitle.textContent = resolvedTitle || fallbackTitle;
    utilityTitle.title = utilityTitle.textContent;
  }

  function setDrawerState(state) {
    document.body.dataset.drawerState = state;
    if (sidebar) {
      sidebar.dataset.drawerState = state;
    }
    if (menuToggle) {
      menuToggle.dataset.drawerState = state;
      menuToggle.classList.toggle("is-open", state === "open" || state === "opening");
    }
  }

  function syncDrawerState() {
    window.clearTimeout(drawerTimer);

    if (!menuToggle || !sidebar) {
      return;
    }

    const drawerOpen = document.body.classList.contains("sidebar-open");
    menuToggle.setAttribute("aria-expanded", String(drawerOpen));

    if (!isDrawerViewport()) {
      setDrawerState("closed");
      return;
    }

    setDrawerState(drawerOpen ? "opening" : "closing");
    drawerTimer = window.setTimeout(() => {
      setDrawerState(drawerOpen ? "open" : "closed");
    }, DRAWER_TRANSITION_MS);
  }

  function setTriggerState(mode) {
    document.body.dataset.utilityMode = mode || "";

    if (searchTrigger) {
      searchTrigger.classList.toggle("is-active", mode === "search");
      searchTrigger.setAttribute("aria-expanded", String(mode === "search"));
    }

    if (sitesTrigger) {
      sitesTrigger.classList.toggle("is-active", mode === "sites");
      sitesTrigger.setAttribute("aria-expanded", String(mode === "sites"));
    }
  }

  function syncEmbeddedSitesState() {
    const activeSystemId = currentSystemId();
    for (const entry of document.querySelectorAll(".shell-site-entry[data-system-id]")) {
      const isCurrent = entry.dataset.systemId === activeSystemId;
      entry.classList.toggle("current", isCurrent);
      const meta = entry.querySelector(".shell-site-entry-meta");
      if (meta) {
        meta.textContent = isCurrent ? "Current handbook" : "Open handbook";
      }
    }
  }

  function buildUtilityLayer() {
    if (shellState.overlay) {
      return;
    }

    const layer = document.createElement("div");
    layer.className = "utility-layer";
    layer.hidden = true;
    layer.innerHTML =
      `<button class="utility-scrim" type="button" aria-label="Close overlay"></button>` +
      `<section class="utility-sheet" role="dialog" aria-modal="true" aria-labelledby="utility-sheet-title">` +
      `<div class="utility-sheet-head">` +
      `<div class="utility-sheet-heading">` +
      `<p class="utility-sheet-kicker">Handbook</p>` +
      `<h2 id="utility-sheet-title">Search</h2>` +
      `</div>` +
      `<button class="utility-close" type="button">Close</button>` +
      `</div>` +
      `<div class="utility-search-panel" hidden>` +
      `<label class="utility-search-label" for="utility-search-input">Find a handbook entry</label>` +
      `<input id="utility-search-input" class="utility-search-input" type="search" placeholder="Search handbook entries, topics, and related handbooks" autocomplete="off" />` +
      `<p class="utility-search-meta">Press Escape to close.</p>` +
      `<div class="utility-search-results"></div>` +
      `</div>` +
      `<div class="utility-sites-panel" hidden>` +
      `<p class="utility-search-meta">Browse related EARN handbooks from here.</p>` +
      `<div class="utility-sites-results"></div>` +
      `</div>` +
      `</section>`;

    document.body.appendChild(layer);

    shellState.overlay = layer;
    shellState.scrim = layer.querySelector(".utility-scrim");
    shellState.sheet = layer.querySelector(".utility-sheet");
    shellState.titleNode = layer.querySelector("#utility-sheet-title");
    shellState.closeButton = layer.querySelector(".utility-close");
    shellState.searchPanel = layer.querySelector(".utility-search-panel");
    shellState.searchField = layer.querySelector("#utility-search-input");
    shellState.searchMeta = layer.querySelector(".utility-search-meta");
    shellState.searchResults = layer.querySelector(".utility-search-results");
    shellState.sitesPanel = layer.querySelector(".utility-sites-panel");
    shellState.sitesList = layer.querySelector(".utility-sites-results");

    shellState.scrim.addEventListener("click", () => closeUtility());
    shellState.closeButton.addEventListener("click", () => closeUtility());

    shellState.searchField.addEventListener("input", () => {
      window.clearTimeout(shellState.searchRenderTimer);
      shellState.searchRenderTimer = window.setTimeout(() => {
        renderSearchOverlay(shellState.searchField.value);
      }, SEARCH_RENDER_DEBOUNCE_MS);
    });

    shellState.searchResults.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-doc-path], button[data-topic], button[data-system-id]");
      if (!button) {
        return;
      }

      if (button.dataset.docPath) {
        await openDocumentResult(button.dataset.docPath, button.dataset.canonicalPath || "");
        return;
      }

      if (button.dataset.topic) {
        applyTopicFilter(button.dataset.topic);
        closeUtility();
        return;
      }

      if (button.dataset.systemId) {
        openSystem(button.dataset.systemId);
      }
    });

    shellState.sitesList.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-system-id]");
      if (!button) {
        return;
      }

      openSystem(button.dataset.systemId);
    });
  }

  function isUtilityOpen() {
    return Boolean(shellState.utilityMode);
  }

  function openUtility(mode, trigger) {
    buildUtilityLayer();
    shellState.utilityMode = mode;
    shellState.utilityReturnFocus = trigger || document.activeElement;

    if (document.body.classList.contains("sidebar-open") && menuToggle) {
      menuToggle.click();
    }

    shellState.overlay.hidden = false;
    document.body.classList.add("utility-open");
    setTriggerState(mode);

    const searchMode = mode === "search";
    shellState.searchPanel.hidden = !searchMode;
    shellState.sitesPanel.hidden = searchMode;
    shellState.titleNode.textContent = searchMode ? "Search" : "Related handbooks";

    if (searchMode) {
      shellState.searchField.value = "";
      renderSearchOverlay("");
      window.requestAnimationFrame(() => {
        shellState.searchField.focus();
        shellState.searchField.select();
      });
      return;
    }

    renderSitesOverlay();
    window.requestAnimationFrame(() => {
      shellState.closeButton.focus();
    });
  }

  function closeUtility(restoreFocus = true) {
    if (!shellState.overlay || !shellState.utilityMode) {
      return;
    }

    shellState.utilityMode = "";
    shellState.overlay.hidden = true;
    document.body.classList.remove("utility-open");
    setTriggerState("");

    if (restoreFocus && shellState.utilityReturnFocus && typeof shellState.utilityReturnFocus.focus === "function") {
      shellState.utilityReturnFocus.focus();
    }
  }

  function deriveTopicsFromDocs(docs) {
    const counts = new Map();
    for (const doc of docs) {
      const key = String(doc.domain || "root");
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    return [...counts.entries()]
      .sort((left, right) => {
        if (left[0] === "root") {
          return -1;
        }
        if (right[0] === "root") {
          return 1;
        }
        return left[0].localeCompare(right[0]);
      })
      .map(([key, count]) => ({
        id: key,
        label: prettyDomainLabel(key),
        count
      }));
  }

  function normalizeDocsPayload(payload) {
    const entries = Array.isArray(payload && payload.docs)
      ? payload.docs
      : Array.isArray(payload && payload.items)
        ? payload.items
      : Array.isArray(payload && payload.files)
        ? payload.files.map((pathValue) => ({ path: pathValue }))
        : [];

    return entries
      .filter((entry) => entry && typeof entry.path === "string")
      .map((entry) => {
        const pathValue = String(entry.path || "");
        const domain = String(entry.domain || (pathValue.includes("/") ? pathValue.split("/")[0] : "root"));
        const title = String(entry.title || "").trim();
        const summary = String(entry.summary || "").trim();
        const canonicalPath = String(entry.canonical_path || "").trim();
        const navWeightValue = Number(entry.nav_weight ?? entry.navWeight);
        const navWeight = Number.isFinite(navWeightValue) ? navWeightValue : 999;
        const audience = String(entry.audience || "both").trim().toLowerCase() || "both";
        const surface = String(entry.surface || "handbook").trim().toLowerCase() || "handbook";
        const featured = Boolean(entry.featured);
        const owner = String(entry.owner || "").trim();
        const readMinutesValue = Number(entry.read_minutes ?? entry.estimated_read_minutes ?? entry.estimatedReadMinutes);
        const readMinutes = Number.isFinite(readMinutesValue) ? readMinutesValue : null;

        return {
          path: pathValue,
          title: title || displayTitleFromPath(pathValue),
          summary,
          domain,
          canonicalPath,
          navWeight,
          audience,
          surface,
          featured,
          owner,
          readMinutes,
          searchText: normalizeSearchText(`${title} ${summary} ${domain} ${pathValue} ${owner}`)
        };
      })
      .filter((entry) => entry.surface !== "admin");
  }

  function normalizeSearchPayload(payload) {
    const entries = Array.isArray(payload && payload.documents)
      ? payload.documents
      : Array.isArray(payload && payload.entries)
        ? payload.entries
      : Array.isArray(payload && payload.docs)
        ? payload.docs
        : [];

    return new Map(
      entries
        .filter((entry) => entry && typeof entry.path === "string")
        .map((entry) => [
          String(entry.path),
          {
            title: String(entry.title || "").trim(),
            summary: String(entry.summary || "").trim(),
            canonicalPath: String(entry.canonical_path || "").trim(),
            audience: String(entry.audience || "both").trim().toLowerCase() || "both",
            surface: String(entry.surface || "handbook").trim().toLowerCase() || "handbook",
            featured: Boolean(entry.featured),
            owner: String(entry.owner || "").trim(),
            readMinutes: Number(entry.read_minutes ?? entry.estimated_read_minutes ?? entry.estimatedReadMinutes),
            text: String(entry.search_text || entry.text || entry.content || "").trim()
          }
        ])
        .filter(([, entry]) => entry.surface !== "admin")
    );
  }

  function docsFromDomFallback() {
    const seen = new Map();
    const selectors = [
      "#doc-list button[data-path]",
      "#recent-docs button[data-path]",
      "#recent-list button[data-path]",
      "#recent-links button[data-path]"
    ];

    for (const selector of selectors) {
      for (const button of document.querySelectorAll(selector)) {
        const pathValue = button.dataset.path || "";
        if (!pathValue || seen.has(pathValue)) {
          continue;
        }

        const title =
          button.querySelector(".doc-name, .item-title, .recent-title, .recent-link-title")?.textContent?.trim() ||
          displayTitleFromPath(pathValue);
        const summary = button.querySelector(".doc-sub")?.textContent?.trim() || "";
        const meta = button.querySelector(".doc-domain, .item-meta")?.textContent?.trim() || "";
        const domain = meta ? meta.split("-")[0].trim().toLowerCase().replace(/\s+/g, "-") : pathValue.includes("/") ? pathValue.split("/")[0] : "root";

        seen.set(pathValue, {
          path: pathValue,
          title,
          summary,
          domain,
          canonicalPath: "",
          navWeight: 999,
          searchText: normalizeSearchText(`${title} ${summary} ${domain} ${pathValue}`)
        });
      }
    }

    return [...seen.values()];
  }

  async function loadDocsIndex() {
    if (shellState.docsPromise) {
      return shellState.docsPromise;
    }

    shellState.docsPromise = (async () => {
      let docs = [];
      for (const url of NAV_INDEX_ENDPOINTS) {
        const payload = await fetchJsonOrNull(url);
        if (!payload) {
          continue;
        }

        docs = normalizeDocsPayload(payload);
        if (docs.length) {
          break;
        }
      }

      if (!docs.length) {
        docs = docsFromDomFallback();
      }

      const searchMetaByPath = new Map();
      for (const url of SEARCH_INDEX_ENDPOINTS) {
        const payload = await fetchJsonOrNull(url);
        if (!payload) {
          continue;
        }

        const normalized = normalizeSearchPayload(payload);
        if (normalized.size) {
          for (const [pathValue, details] of normalized.entries()) {
            searchMetaByPath.set(pathValue, details);
          }
          break;
        }
      }

      shellState.docs = docs
        .map((doc) => {
          const details = searchMetaByPath.get(doc.path);
          if (!details) {
            return doc;
          }

          const nextTitle = details.title || doc.title;
          const nextSummary = details.summary || doc.summary;
          const nextCanonicalPath = details.canonicalPath || doc.canonicalPath;
          const nextText = normalizeSearchText(
            `${nextTitle} ${nextSummary} ${doc.domain} ${doc.path} ${details.owner || ""} ${details.text || ""}`
          );

          return {
            ...doc,
            title: nextTitle,
            summary: nextSummary,
            canonicalPath: nextCanonicalPath,
            audience: details.audience || doc.audience,
            surface: details.surface || doc.surface,
            featured: details.featured ?? doc.featured,
            owner: details.owner || doc.owner,
            readMinutes: Number.isFinite(details.readMinutes) ? details.readMinutes : doc.readMinutes,
            searchText: nextText || doc.searchText
          };
        })
        .filter((doc) => doc.surface !== "admin")
        .sort((left, right) => left.navWeight - right.navWeight || left.path.localeCompare(right.path));

      shellState.docsByPath = new Map(shellState.docs.map((doc) => [doc.path, doc]));
      shellState.topics = deriveTopicsFromDocs(shellState.docs);
      return shellState.docs;
    })().catch((error) => {
      shellState.docsPromise = null;
      throw error;
    });

    return shellState.docsPromise;
  }

  async function fetchRemoteSearchMatches(query) {
    if (!query) {
      return new Set();
    }

    if (shellState.remoteSearchAvailable === false) {
      return new Set();
    }

    if (shellState.remoteSearchCache.has(query)) {
      return shellState.remoteSearchCache.get(query);
    }

    const request = fetchJsonOrNull(`/api/search?q=${encodeURIComponent(query)}`)
      .then((payload) => {
        if (!payload || !Array.isArray(payload.results)) {
          shellState.remoteSearchAvailable = false;
          return new Set();
        }

        shellState.remoteSearchAvailable = true;
        const results = Array.isArray(payload && payload.results) ? payload.results : [];
        return new Set(
          results
            .map((result) => String(result && result.path ? result.path : ""))
            .filter(Boolean)
        );
      })
      .catch(() => new Set());

    shellState.remoteSearchCache.set(query, request);
    return request;
  }

  function collectRecentDocs() {
    const paths = [];
    const seen = new Set();

    for (const button of document.querySelectorAll("#recent-docs button[data-path], #recent-list button[data-path], #recent-links button[data-path]")) {
      const pathValue = String(button.dataset.path || "");
      if (!pathValue || seen.has(pathValue)) {
        continue;
      }

      seen.add(pathValue);
      const record = shellState.docsByPath.get(pathValue);
      paths.push(
        record || {
          path: pathValue,
          title:
            button.querySelector(".doc-name, .item-title, .recent-title, .recent-link-title")?.textContent?.trim() ||
            displayTitleFromPath(pathValue),
          summary: "",
          domain: pathValue.includes("/") ? pathValue.split("/")[0] : "root",
          canonicalPath: "",
          navWeight: 999,
          searchText: normalizeSearchText(pathValue)
        }
      );
    }

    return paths.slice(0, 8);
  }

  function findTopicControl() {
    return document.getElementById("domain-jump") || document.getElementById("domain-switch") || document.getElementById("domain-switcher");
  }

  function applyTopicFilter(topicId) {
    const nextTopic = String(topicId || "all");
    const topicControl = findTopicControl();
    if (topicControl) {
      topicControl.value = nextTopic;
      topicControl.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }

    const buttons = [...document.querySelectorAll("#domain-chips button[data-domain]")];
    const directMatch = buttons.find((button) => button.dataset.domain === nextTopic);
    if (directMatch) {
      directMatch.click();
      return;
    }

    const allButton = buttons.find((button) => button.dataset.domain === "all");
    if (nextTopic === "all" && allButton) {
      allButton.click();
    }
  }

  function findDocButton(pathValue) {
    const buttons = document.querySelectorAll("button[data-path]");
    for (const button of buttons) {
      if (button.dataset.path === pathValue) {
        return button;
      }
    }
    return null;
  }

  async function openDocumentResult(pathValue, canonicalPath) {
    closeUtility(false);

    const button = findDocButton(pathValue);
    if (button) {
      button.click();
      return;
    }

    if (canonicalPath) {
      window.location.assign(canonicalPath);
      return;
    }

    const encodedPath = encodeURIComponent(pathValue).replaceAll("%2F", "/");
    const nextHash = `#/${encodedPath}`;
    if (window.location.hash !== nextHash) {
      window.location.hash = `/${encodedPath}`;
    }
  }

  function openSystem(systemId) {
    closeUtility(false);
    const targetUrl = resolveSystemUrl(systemId);
    window.location.assign(targetUrl);
  }

  function scoreDoc(doc, queryTokens, recentSet, remoteMatches) {
    if (!queryTokens.length) {
      return 0;
    }

    const titleText = normalizeSearchText(doc.title);
    const pathText = normalizeSearchText(doc.path);
    const domainText = normalizeSearchText(doc.domain);
    const queryString = queryTokens.join(" ");
    let score = 0;

    if (titleText.startsWith(queryString)) {
      score += 8;
    } else if (titleText.includes(queryString)) {
      score += 5;
    }

    if (pathText.includes(queryString)) {
      score += 3;
    }

    if (domainText.includes(queryString)) {
      score += 2;
    }

    if (recentSet.has(doc.path)) {
      score += 2;
    }

    if (remoteMatches.has(doc.path)) {
      score += 6;
    }

    return score;
  }

  function buildDocMatches(query, remoteMatches) {
    const normalizedQuery = normalizeSearchText(query);
    const queryTokens = normalizedQuery ? normalizedQuery.split(" ").filter(Boolean) : [];
    const recentSet = new Set(collectRecentDocs().map((doc) => doc.path));

    return shellState.docs
      .filter((doc) => {
        if (!queryTokens.length) {
          return false;
        }

        const matchesLocal = queryTokens.every((token) => doc.searchText.includes(token));
        return matchesLocal || remoteMatches.has(doc.path);
      })
      .map((doc) => ({
        ...doc,
        _score: scoreDoc(doc, queryTokens, recentSet, remoteMatches)
      }))
      .sort((left, right) => right._score - left._score || left.navWeight - right.navWeight || left.path.localeCompare(right.path))
      .slice(0, 8);
  }

  function createResultList(items, renderer) {
    const list = document.createElement("div");
    list.className = "utility-result-list";
    for (const item of items) {
      list.appendChild(renderer(item));
    }
    return list;
  }

  function createSearchDocButton(doc) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "utility-result";
    button.dataset.docPath = doc.path;
    if (doc.canonicalPath) {
      button.dataset.canonicalPath = doc.canonicalPath;
    }

    const summary = doc.summary || doc.path;
    button.innerHTML =
      `<span class="utility-result-head">` +
      `<span class="utility-result-label">${doc.title}</span>` +
      `<span class="utility-result-kind">${prettyDomainLabel(doc.domain)}</span>` +
      `</span>` +
      `<span class="utility-result-meta">${summary}</span>`;
    return button;
  }

  function createSearchTopicButton(topic) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "utility-result utility-result-topic";
    button.dataset.topic = topic.id;
    button.innerHTML =
      `<span class="utility-result-head">` +
      `<span class="utility-result-label">${topic.label}</span>` +
      `<span class="utility-result-kind">${topic.count} entries</span>` +
      `</span>` +
      `<span class="utility-result-meta">Filter the handbook to this topic.</span>`;
    return button;
  }

  function createSearchSystemButton(system) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `utility-result utility-result-system${system.id === currentSystemId() ? " current" : ""}`;
    button.dataset.systemId = system.id;
    button.innerHTML =
      `<span class="utility-result-head">` +
      `<span class="utility-result-label">${system.label}</span>` +
      `<span class="utility-result-kind">${system.id === currentSystemId() ? "Current handbook" : "Handbook"}</span>` +
      `</span>` +
      `<span class="utility-result-meta">${system.description}</span>`;
    return button;
  }

  function renderEmptySearchState() {
    shellState.searchResults.innerHTML = '<p class="utility-empty">No matches found.</p>';
  }

  function renderSearchGroups(groups) {
    shellState.searchResults.innerHTML = "";

    if (!groups.length) {
      renderEmptySearchState();
      return;
    }

    for (const group of groups) {
      const section = document.createElement("section");
      section.className = "utility-group";
      section.appendChild(createHeading("h3", group.title));
      section.lastChild.className = "utility-group-title";
      section.appendChild(createResultList(group.items, group.renderer));
      shellState.searchResults.appendChild(section);
    }
  }

  async function renderSearchOverlay(query) {
    buildUtilityLayer();

    const requestId = ++shellState.searchRequestId;
    const rawQuery = String(query || "");
    const normalizedQuery = normalizeSearchText(rawQuery);

    shellState.searchMeta.textContent = normalizedQuery
      ? "Searching handbook entries, topics, and related handbooks."
      : "Recent handbook entries, topics, and related handbooks.";
    shellState.searchResults.innerHTML = '<p class="utility-loading">Loading…</p>';

    try {
      await loadDocsIndex();
      const remoteMatches = normalizedQuery ? await fetchRemoteSearchMatches(normalizedQuery) : new Set();
      if (requestId !== shellState.searchRequestId || shellState.utilityMode !== "search") {
        return;
      }

      const recentDocs = collectRecentDocs();
      const systems = [...SYSTEMS];
      const topics = [...shellState.topics];
      const groups = [];

      if (!normalizedQuery) {
        if (recentDocs.length) {
          groups.push({ title: "Recent", items: recentDocs.slice(0, 6), renderer: createSearchDocButton });
        }

        groups.push({ title: "Topics", items: topics.slice(0, 6), renderer: createSearchTopicButton });
        groups.push({ title: "Related handbooks", items: systems, renderer: createSearchSystemButton });
        renderSearchGroups(groups);
        return;
      }

      const queryTokens = normalizedQuery.split(" ").filter(Boolean);
      const docMatches = buildDocMatches(rawQuery, remoteMatches);
      const recentMatches = recentDocs.filter((doc) => {
        const haystack = normalizeSearchText(`${doc.title} ${doc.summary || ""} ${doc.path} ${doc.domain || ""}`);
        return queryTokens.every((token) => haystack.includes(token));
      });
      const topicMatches = topics.filter((topic) => {
        const haystack = normalizeSearchText(`${topic.label} ${topic.id}`);
        return queryTokens.every((token) => haystack.includes(token));
      });
      const systemMatches = systems.filter((system) => {
        const haystack = normalizeSearchText(`${system.label} ${system.title} ${system.description}`);
        return queryTokens.every((token) => haystack.includes(token));
      });

      if (docMatches.length) {
        groups.push({ title: "Handbook entries", items: docMatches, renderer: createSearchDocButton });
      }

      if (recentMatches.length) {
        groups.push({ title: "Recent", items: recentMatches.slice(0, 5), renderer: createSearchDocButton });
      }

      if (topicMatches.length) {
        groups.push({ title: "Topics", items: topicMatches.slice(0, 6), renderer: createSearchTopicButton });
      }

      if (systemMatches.length) {
        groups.push({ title: "Related handbooks", items: systemMatches, renderer: createSearchSystemButton });
      }

      renderSearchGroups(groups);
    } catch {
      if (requestId !== shellState.searchRequestId || shellState.utilityMode !== "search") {
        return;
      }

      shellState.searchResults.innerHTML = '<p class="utility-empty">Search is not available right now.</p>';
    }
  }

  function createSitesPanelButton(system) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `utility-site-item${system.id === currentSystemId() ? " current" : ""}`;
    button.dataset.systemId = system.id;
    button.innerHTML =
      `<span class="utility-site-item-main">` +
      `<span class="utility-site-item-label">${system.label}</span>` +
      `<span class="utility-site-item-title">${system.title}</span>` +
      `</span>` +
      `<span class="utility-site-item-meta">${system.id === currentSystemId() ? "Current handbook" : "Open handbook"}</span>`;
    return button;
  }

  function renderSitesOverlay() {
    buildUtilityLayer();
    shellState.sitesList.innerHTML = "";

    const group = document.createElement("section");
    group.className = "utility-group";
    const heading = createHeading("h3", "Related handbooks");
    heading.className = "utility-group-title";
    group.appendChild(heading);
    group.appendChild(createResultList(SYSTEMS, createSitesPanelButton));
    shellState.sitesList.appendChild(group);
  }

  function shortcutTargetIsInput(target) {
    const tagName = target && target.tagName ? target.tagName.toLowerCase() : "";
    return tagName === "input" || tagName === "textarea" || tagName === "select" || (target && target.isContentEditable);
  }

  function handleGlobalShortcuts(event) {
    if (isUtilityOpen() && event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeUtility();
      return;
    }

    if (shortcutTargetIsInput(event.target)) {
      return;
    }

    const key = String(event.key || "").toLowerCase();
    const searchShortcut =
      ((event.metaKey || event.ctrlKey) && key === "k") ||
      (key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey);

    if (!searchShortcut) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    if (shellState.utilityMode === "search") {
      closeUtility();
      return;
    }

    openUtility("search", searchTrigger || document.activeElement);
  }

  normalizeNavigationPanels();
  scheduleTreeNormalization();
  syncUtilityTitle();
  syncDrawerState();
  syncEmbeddedSitesState();
  buildUtilityLayer();

  const docList = document.getElementById("doc-list");
  if (docList) {
    new MutationObserver(scheduleTreeNormalization).observe(docList, {
      childList: true,
      subtree: true
    });
  }

  const recentsContainer =
    document.getElementById("recent-docs") || document.getElementById("recent-list") || document.getElementById("recent-links");
  if (recentsContainer) {
    new MutationObserver(() => {
      if (shellState.utilityMode === "search" && !normalizeSearchText(shellState.searchField.value)) {
        renderSearchOverlay(shellState.searchField.value);
      }
    }).observe(recentsContainer, {
      childList: true,
      subtree: true
    });
  }

  if (docTitle && utilityTitle) {
    new MutationObserver(syncUtilityTitle).observe(docTitle, {
      characterData: true,
      childList: true,
      subtree: true
    });
  }

  if (menuToggle) {
    new MutationObserver(syncDrawerState).observe(document.body, {
      attributes: true,
      attributeFilter: ["class"]
    });
  }

  if (searchTrigger) {
    searchTrigger.setAttribute("aria-haspopup", "dialog");
    searchTrigger.setAttribute("aria-expanded", "false");
    searchTrigger.addEventListener("click", () => {
      if (shellState.utilityMode === "search") {
        closeUtility();
        return;
      }

      openUtility("search", searchTrigger);
    });
  }

  if (sitesTrigger) {
    sitesTrigger.setAttribute("aria-haspopup", "dialog");
    sitesTrigger.setAttribute("aria-expanded", "false");
    sitesTrigger.addEventListener("click", () => {
      if (shellState.utilityMode === "sites") {
        closeUtility();
        return;
      }

      openUtility("sites", sitesTrigger);
    });
  }

  if (sidebar) {
    sidebar.addEventListener("click", (event) => {
      const button = event.target.closest(".shell-site-entry[data-system-id]");
      if (!button) {
        return;
      }

      openSystem(button.dataset.systemId);
    });
  }

  window.addEventListener("keydown", handleGlobalShortcuts, true);
  window.addEventListener("resize", () => {
    syncDrawerState();
    syncEmbeddedSitesState();

    if (shellState.utilityMode === "sites") {
      renderSitesOverlay();
    }
  });
  window.addEventListener("pageshow", () => {
    syncDrawerState();
    syncEmbeddedSitesState();
  });

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => {
      void loadDocsIndex();
    });
  }
})();
