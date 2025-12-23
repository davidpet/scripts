// Paste this into DevTools Console once per page load (or save as a snippet).
// It installs window.autoScroll with start/stop/setSpeed and a .speed property.
(() => {
  const KEY = "__AUTO_SCROLL_CONTROLLER__";

  // If an old one exists, clean it up first.
  if (window[KEY]?.destroy) window[KEY].destroy();

  let speedPxPerSec = 40;   // default speed
  let running = false;
  let rafId = null;
  let lastTs = null;

  const scrollingEl = () => document.scrollingElement || document.documentElement;

  const maxScrollY = () => {
    // Use scrolling element height; clamp with viewport height.
    const el = scrollingEl();
    return Math.max(0, el.scrollHeight - window.innerHeight);
  };

  const atBottom = (eps = 2) => window.scrollY >= (maxScrollY() - eps);

  const tick = (ts) => {
    if (!running) return;

    if (lastTs == null) lastTs = ts;
    const dt = (ts - lastTs) / 1000;
    lastTs = ts;

    // Scroll by time-based delta for consistent speed across frame rates.
    const dy = speedPxPerSec * dt;
    window.scrollBy(0, dy);

    if (atBottom()) {
      window.scrollTo(0, maxScrollY());
      running = false;
      rafId = null;
      lastTs = null;
      console.log("[autoScroll] Reached bottom, stopped.");
      return;
    }

    rafId = requestAnimationFrame(tick);
  };

  const start = () => {
    if (running) return;
    if (atBottom()) {
      console.log("[autoScroll] Already at bottom.");
      return;
    }
    running = true;
    lastTs = null;
    rafId = requestAnimationFrame(tick);
  };

  const stop = () => {
    if (!running) return;
    running = false;
    if (rafId != null) cancelAnimationFrame(rafId);
    rafId = null;
    lastTs = null;
    console.log("[autoScroll] Stopped (can resume with start()).");
  };

  const setSpeed = (pxPerSec) => {
    const v = Number(pxPerSec);
    if (!Number.isFinite(v)) throw new Error("setSpeed(pxPerSec): must be a finite number.");
    speedPxPerSec = v;
    return speedPxPerSec;
  };

  const status = () => ({
    running,
    speedPxPerSec,
    scrollY: window.scrollY,
    maxScrollY: maxScrollY(),
  });

  const destroy = () => {
    stop();
    delete window[KEY];
    if (window.autoScroll === api) delete window.autoScroll;
  };

  const api = { start, stop, setSpeed, status, destroy };

  // Allow changing speed via variable assignment: autoScroll.speed = 800
  Object.defineProperty(api, "speed", {
    get: () => speedPxPerSec,
    set: (v) => setSpeed(v),
    enumerable: true,
  });

  window[KEY] = api;
  window.autoScroll = api;

  console.log("[autoScroll] Loaded. Usage:");
  console.log("  autoScroll.speed = 40        // or autoScroll.setSpeed(40)");
  console.log("  // speed is in px per second");
  console.log("  autoScroll.start()");
  console.log("  autoScroll.stop()");
  console.log("  autoScroll.status()");
})();
