/* QuickTools24 inline tool workspace.
   Keeps the SEO landing page and URL intact while mounting the existing
   shared, fully functional tool workspace directly in the page. */
(() => {
  function mountInlineTool() {
    const link = document.querySelector('a.cta[href*="/tool.html?tool="]');
    if (!link || document.querySelector(".q24-inline-tool-frame")) return;

    let target;
    try { target = new URL(link.getAttribute("href"), window.location.origin); }
    catch (_) { return; }

    const toolId = target.searchParams.get("tool");
    if (!toolId) return;

    const heading = document.querySelector("h1");
    const toolName = heading ? heading.textContent.trim() : "QuickTools24";
    const wrapper = document.createElement("section");
    wrapper.className = "q24-inline-tool-shell";
    wrapper.setAttribute("aria-label", toolName + " workspace");

    const frame = document.createElement("iframe");
    frame.className = "q24-inline-tool-frame";
    frame.title = toolName + " — QuickTools24 online tool";
    frame.src = "/tool.html?tool=" + encodeURIComponent(toolId) + "&embed=1";
    frame.loading = "eager";
    frame.referrerPolicy = "same-origin";
    frame.setAttribute("allow", "clipboard-read; clipboard-write");
    frame.setAttribute("scrolling", "yes");

    wrapper.appendChild(frame);
    link.replaceWith(wrapper);

    const style = document.createElement("style");
    style.id = "q24-inline-tool-style";
    style.textContent = `
      .q24-inline-tool-shell {
        width: 100%;
        margin: 24px 0 8px;
        border: 1px solid #dfe5f1;
        border-radius: 18px;
        overflow: hidden;
        background: #f1f5f9;
        box-shadow: 0 12px 34px rgba(23,37,84,.08);
      }
      .q24-inline-tool-frame {
        display: block;
        width: 100%;
        height: 920px;
        border: 0;
        background: #f1f5f9;
      }
      @media (max-width: 640px) {
        .q24-inline-tool-shell { margin: 18px -2px 6px; width: calc(100% + 4px); border-radius: 14px; }
        .q24-inline-tool-frame { height: 980px; }
      }
    `;
    document.head.appendChild(style);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountInlineTool, { once: true });
  } else {
    mountInlineTool();
  }
})();