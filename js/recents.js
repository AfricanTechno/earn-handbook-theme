(function () {
  var MAX_RECENTS = 10;

  function storageKey() {
    var handbookId = document.body.getAttribute("data-handbook") || "default";
    return "earn-handbook-recents::" + handbookId;
  }

  function readRecents() {
    try {
      var raw = localStorage.getItem(storageKey());
      if (!raw) {
        return [];
      }
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function writeRecents(items) {
    try {
      localStorage.setItem(storageKey(), JSON.stringify(items.slice(0, MAX_RECENTS)));
    } catch (error) {
      // Ignore storage errors.
    }
  }

  function currentRecord() {
    var titleNode = document.querySelector("[data-doc-title]");
    var summaryNode = document.querySelector("[data-doc-purpose]");
    var title = titleNode ? titleNode.textContent.trim() : document.title;
    var summary = summaryNode ? summaryNode.textContent.trim() : "";

    return {
      url: window.location.pathname + window.location.search,
      title: title || "Untitled page",
      summary: summary,
      viewedAt: new Date().toISOString()
    };
  }

  function upsertRecent(record) {
    var existing = readRecents().filter(function (item) {
      return item && item.url !== record.url;
    });

    existing.unshift(record);
    writeRecents(existing);
    return existing.slice(0, MAX_RECENTS);
  }

  function renderRecents(items) {
    var targets = document.querySelectorAll("[data-recents-list]");
    if (!targets.length) {
      return;
    }

    targets.forEach(function (list) {
      list.innerHTML = "";

      if (!items.length) {
        var empty = document.createElement("li");
        empty.textContent = "No recently viewed pages yet.";
        list.appendChild(empty);
        return;
      }

      items.forEach(function (item) {
        var li = document.createElement("li");
        var link = document.createElement("a");
        link.href = item.url;
        link.textContent = item.title;
        li.appendChild(link);

        if (item.summary) {
          var hint = document.createElement("small");
          hint.textContent = item.summary;
          hint.style.display = "block";
          li.appendChild(hint);
        }

        list.appendChild(li);
      });
    });
  }

  function wireClear() {
    var clearButtons = document.querySelectorAll("[data-recents-clear]");
    clearButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        writeRecents([]);
        renderRecents([]);
      });
    });
  }

  function initRecents() {
    var recents = upsertRecent(currentRecord());
    renderRecents(recents);
    wireClear();
  }

  window.EarnThemeRecents = {
    init: initRecents,
    read: readRecents,
    clear: function () {
      writeRecents([]);
      renderRecents([]);
    }
  };

  document.addEventListener("DOMContentLoaded", function () {
    initRecents();
  });
})();
