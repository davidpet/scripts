const { withBusyButton, applyFilter } = require("./lib/utils");

const { entrypoints } = require("uxp");

entrypoints.setup({
  panels: {
    vanilla: {
      show(node ) {
      }
    }
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const actionBtn = document.getElementById("action");
  const createNewLayerEl = document.getElementById("createNewLayer");
  const scriptEl = document.getElementById("script");
  const statusEl = document.getElementById("status");

  // Ensure the script editor is not capped by a default/accidental maxlength.
  if (scriptEl) {
    scriptEl.maxLength = 1000000;
  }
  setupCustomScrollbars(scriptEl);

  // Reference toggles
  document.querySelectorAll(".refToggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const panel = document.getElementById(targetId);
      const isHidden = panel.classList.contains("hidden");

      panel.classList.toggle("hidden", !isHidden);
      btn.setAttribute("aria-expanded", String(isHidden));
    });
  });

  function clearStatus() {
    statusEl.textContent = "";
    statusEl.classList.add("hidden");
  }

  function showError(err) {
    let msg = (err && err.message) ? err.message : String(err);
    msg = msg.replace(/^Error:\s*/i, "");
    statusEl.textContent = msg;
    statusEl.classList.remove("hidden");
  }

  actionBtn.addEventListener(
    "click",
    withBusyButton(actionBtn, "Applying…", async () => {
      clearStatus();
      try {
        await applyFilter({
          createNewLayer: !!createNewLayerEl.checked,
          script: scriptEl.value || "",
        });
      } catch (e) {
        showError(e);
      }
    })
  );
});

function setupCustomScrollbars(scriptEl) {
  const vTop = document.getElementById("vTop");
  const vUp = document.getElementById("vUp");
  const vDown = document.getElementById("vDown");
  const vBottom = document.getElementById("vBottom");
  const vTrack = document.getElementById("vTrack");
  const vThumb = document.getElementById("vThumb");

  const hLeft = document.getElementById("hLeft");
  const hLeftMost = document.getElementById("hLeftMost");
  const hRight = document.getElementById("hRight");
  const hRightMost = document.getElementById("hRightMost");
  const hTrack = document.getElementById("hTrack");
  const hThumb = document.getElementById("hThumb");

  const minThumb = 24;

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  function updateV() {
    const trackH = vTrack.clientHeight;
    const viewH = scriptEl.clientHeight;
    const contentH = scriptEl.scrollHeight;

    if (contentH <= viewH || trackH <= 0) {
      vThumb.style.height = `${trackH}px`;
      vThumb.style.top = `0px`;
      return;
    }

    const thumbH = clamp(Math.round(trackH * (viewH / contentH)), minThumb, trackH);
    const maxScroll = contentH - viewH;
    const maxTop = trackH - thumbH;
    const top = Math.round((scriptEl.scrollTop / maxScroll) * maxTop);

    vThumb.style.height = `${thumbH}px`;
    vThumb.style.top = `${top}px`;
  }

  function updateH() {
    const trackW = hTrack.clientWidth;
    const viewW = scriptEl.clientWidth;
    const contentW = scriptEl.scrollWidth;

    if (contentW <= viewW || trackW <= 0) {
      hThumb.style.width = `${trackW}px`;
      hThumb.style.left = `0px`;
      return;
    }

    const thumbW = clamp(Math.round(trackW * (viewW / contentW)), minThumb, trackW);
    const maxScroll = contentW - viewW;
    const maxLeft = trackW - thumbW;
    const left = Math.round((scriptEl.scrollLeft / maxScroll) * maxLeft);

    hThumb.style.width = `${thumbW}px`;
    hThumb.style.left = `${left}px`;
  }

  function updateAll() {
    updateV();
    updateH();
  }

  // Buttons
  vTop.addEventListener("click", () => { scriptEl.scrollTop = 0; updateV(); });
  vBottom.addEventListener("click", () => { scriptEl.scrollTop = scriptEl.scrollHeight; updateV(); });

  const linePx = () => {
    const lh = parseFloat(getComputedStyle(scriptEl).lineHeight);
    return Number.isFinite(lh) ? lh : 16;
  };

  vUp.addEventListener("click", () => { scriptEl.scrollTop -= linePx() * 3; updateV(); });
  vDown.addEventListener("click", () => { scriptEl.scrollTop += linePx() * 3; updateV(); });

  hLeftMost.addEventListener("click", () => { scriptEl.scrollLeft = 0; updateH(); });
  hRightMost.addEventListener("click", () => { scriptEl.scrollLeft = scriptEl.scrollWidth; updateH(); });
  hLeft.addEventListener("click", () => { scriptEl.scrollLeft -= 80; updateH(); });
  hRight.addEventListener("click", () => { scriptEl.scrollLeft += 80; updateH(); });

  // Track click = page scroll
  vTrack.addEventListener("mousedown", (e) => {
    if (e.target === vThumb) return;
    const rect = vTrack.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const thumbH = vThumb.getBoundingClientRect().height;
    const targetTop = clickY - thumbH / 2;

    const trackH = vTrack.clientHeight;
    const viewH = scriptEl.clientHeight;
    const contentH = scriptEl.scrollHeight;
    const maxScroll = Math.max(1, contentH - viewH);
    const maxTop = Math.max(1, trackH - thumbH);

    scriptEl.scrollTop = clamp((targetTop / maxTop) * maxScroll, 0, maxScroll);
    updateV();
  });

  hTrack.addEventListener("mousedown", (e) => {
    if (e.target === hThumb) return;
    const rect = hTrack.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const thumbW = hThumb.getBoundingClientRect().width;
    const targetLeft = clickX - thumbW / 2;

    const trackW = hTrack.clientWidth;
    const viewW = scriptEl.clientWidth;
    const contentW = scriptEl.scrollWidth;
    const maxScroll = Math.max(1, contentW - viewW);
    const maxLeft = Math.max(1, trackW - thumbW);

    scriptEl.scrollLeft = clamp((targetLeft / maxLeft) * maxScroll, 0, maxScroll);
    updateH();
  });

  // Drag thumb
  let dragV = null;
  vThumb.addEventListener("mousedown", (e) => {
    e.preventDefault();
    const trackH = vTrack.clientHeight;
    const thumbH = vThumb.getBoundingClientRect().height;
    const maxTop = Math.max(1, trackH - thumbH);
    const viewH = scriptEl.clientHeight;
    const contentH = scriptEl.scrollHeight;
    const maxScroll = Math.max(1, contentH - viewH);

    dragV = {
      startY: e.clientY,
      startTop: parseFloat(vThumb.style.top || "0"),
      maxTop,
      maxScroll,
    };
  });

  let dragH = null;
  hThumb.addEventListener("mousedown", (e) => {
    e.preventDefault();
    const trackW = hTrack.clientWidth;
    const thumbW = hThumb.getBoundingClientRect().width;
    const maxLeft = Math.max(1, trackW - thumbW);
    const viewW = scriptEl.clientWidth;
    const contentW = scriptEl.scrollWidth;
    const maxScroll = Math.max(1, contentW - viewW);

    dragH = {
      startX: e.clientX,
      startLeft: parseFloat(hThumb.style.left || "0"),
      maxLeft,
      maxScroll,
    };
  });

  window.addEventListener("mousemove", (e) => {
    if (dragV) {
      const dy = e.clientY - dragV.startY;
      const top = clamp(dragV.startTop + dy, 0, dragV.maxTop);
      scriptEl.scrollTop = (top / dragV.maxTop) * dragV.maxScroll;
      updateV();
    }
    if (dragH) {
      const dx = e.clientX - dragH.startX;
      const left = clamp(dragH.startLeft + dx, 0, dragH.maxLeft);
      scriptEl.scrollLeft = (left / dragH.maxLeft) * dragH.maxScroll;
      updateH();
    }
  });

  window.addEventListener("mouseup", () => {
    dragV = null;
    dragH = null;
  });

  // Keep thumbs synced
  scriptEl.addEventListener("scroll", updateAll);

  // Resize observer keeps thumbs correct when panel resizes
  const ro = new ResizeObserver(updateAll);
  ro.observe(scriptEl);

  // Initial layout
  updateAll();
}
