(function () {
  function slugify(text) {
    return String(text || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "section";
  }

  function buildToc(options) {
    var settings = Object.assign(
      {
        contentSelector: "[data-doc-content]",
        listSelector: "[data-toc-list]",
        tocSelector: "[data-toc]",
        toggleSelector: "[data-toc-toggle]",
        headingSelector: "h2, h3"
      },
      options || {}
    );

    var content = document.querySelector(settings.contentSelector);
    var list = document.querySelector(settings.listSelector);
    var toc = document.querySelector(settings.tocSelector);
    var toggle = document.querySelector(settings.toggleSelector);

    if (!content || !list || !toc) {
      return;
    }

    var headings = Array.prototype.slice.call(content.querySelectorAll(settings.headingSelector));
    list.innerHTML = "";

    if (!headings.length) {
      toc.hidden = true;
      if (toggle) {
        toggle.hidden = true;
      }
      return;
    }

    var seen = {};
    headings.forEach(function (heading) {
      if (!heading.id) {
        var base = slugify(heading.textContent);
        var count = seen[base] || 0;
        seen[base] = count + 1;
        heading.id = count ? base + "-" + count : base;
      }

      var level = heading.tagName.toLowerCase() === "h3" ? 3 : 2;
      var li = document.createElement("li");
      li.className = "level-" + level;

      var link = document.createElement("a");
      link.href = "#" + heading.id;
      link.textContent = heading.textContent.trim();
      link.setAttribute("data-toc-link", heading.id);

      li.appendChild(link);
      list.appendChild(li);
    });

    function setActive(id) {
      var links = list.querySelectorAll("a[data-toc-link]");
      links.forEach(function (link) {
        var active = link.getAttribute("data-toc-link") === id;
        link.classList.toggle("is-active", active);
        if (active) {
          link.setAttribute("aria-current", "true");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    }

    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(
        function (entries) {
          var visible = entries
            .filter(function (entry) {
              return entry.isIntersecting;
            })
            .sort(function (a, b) {
              return b.intersectionRatio - a.intersectionRatio;
            });

          if (visible.length > 0) {
            setActive(visible[0].target.id);
          }
        },
        {
          rootMargin: "-15% 0px -65% 0px",
          threshold: [0.1, 0.3, 0.6]
        }
      );

      headings.forEach(function (heading) {
        observer.observe(heading);
      });
    } else {
      window.addEventListener("scroll", function () {
        var current = headings[0];
        headings.forEach(function (heading) {
          if (heading.getBoundingClientRect().top < 140) {
            current = heading;
          }
        });
        if (current) {
          setActive(current.id);
        }
      });
    }

    if (toggle) {
      toggle.addEventListener("click", function () {
        var collapsed = toc.hidden;
        toc.hidden = !collapsed;
        toggle.setAttribute("aria-expanded", String(collapsed));
        toggle.textContent = collapsed ? "Hide" : "Show";
      });
    }

    setActive(headings[0].id);
  }

  window.EarnThemeTOC = {
    init: buildToc
  };

  document.addEventListener("DOMContentLoaded", function () {
    buildToc();
  });
})();
