function setStatus(el, kind, msg) {
  el.classList.remove("cu-status--ok", "cu-status--error");
  if (kind === "ok") el.classList.add("cu-status--ok");
  if (kind === "error") el.classList.add("cu-status--error");
  el.textContent = msg;
}

function isPromiseLike(v) {
  return v && typeof v === "object" && typeof v.then === "function";
}

async function maybeAwait(v) {
  return isPromiseLike(v) ? await v : v;
}

function unwrapValue(v) {
  if (!v || typeof v !== "object") return v;

  // If it looks like { value: ... } (optionally with units), unwrap it.
  if ("value" in v) {
    const keys = Object.keys(v);
    const ok =
      keys.length === 1 ||
      (keys.length === 2 && keys.includes("value") && (keys.includes("units") || keys.includes("unit")));
    if (ok) return v.value;
  }

  return v;
}

function unwrapValue(v) {
  return (v && typeof v === "object" && "value" in v) ? v.value : v;
}

function asPointF(v) {
  v = unwrapValue(v);
  if (!v || typeof v !== "object") return null;
  if (typeof v.x === "number" && typeof v.y === "number") return { x: v.x, y: v.y };
  if (Array.isArray(v) && v.length >= 2 && typeof v[0] === "number" && typeof v[1] === "number") {
    return { x: v[0], y: v[1] };
  }
  return null;
}

function normalizePointFToPixelsIfNeeded(point, frameW, frameH) {
  if (!point || !frameW || !frameH) return null;
  const { x, y } = point;

  // Detect normalized coordinates purely by range.
  if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
    return { x: x * frameW, y: y * frameH };
  }
  return null;
}

function formatValueWithContext(rawValue, frameW, frameH) {
  const p = asPointF(rawValue);
  if (p) {
    const px = normalizePointFToPixelsIfNeeded(p, frameW, frameH) || p;
    return `${px.x}, ${px.y}`; // no rounding
  }

  const v = unwrapValue(rawValue);
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v;
  if (typeof v === "boolean") return v ? "true" : "false";
  if (v == null) return String(v);
  return String(v);
}

function formatAny(v) {
  v = unwrapValue(v);

  if (typeof v === "number") return String(v);  // full precision as JS gives it
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "string") return v;
  if (v == null) return String(v);

  // Common Premiere vector shapes
  if (typeof v === "object" && "x" in v && "y" in v) {
    return `${formatAny(v.x)}, ${formatAny(v.y)}`;
  }

  if (Array.isArray(v)) return v.map(formatAny).join(", ");

  // Fallback: compact-ish object print (but not crazy verbose)
  if (typeof v === "object") {
    const keys = Object.keys(v);
    if (keys.length <= 4) {
      return keys.map((k) => `${k}: ${formatAny(v[k])}`).join(", ");
    }
    return `(${keys.length} fields)`;
  }

  return String(v);
}

function formatTickTime(t) {
  if (!t) return "<unknown>";

  // TickTime has useful properties, but don’t assume all exist across versions.
  const secs =
    typeof t.seconds === "number"
      ? t.seconds
      : typeof t.getSeconds === "function"
        ? t.getSeconds()
        : undefined;

  const ticks =
    typeof t.ticksNumber === "number"
      ? t.ticksNumber
      : typeof t.ticks === "number"
        ? t.ticks
        : undefined;

  const parts = [];
  if (typeof secs === "number") parts.push(`${secs}s`);
  if (typeof ticks === "number") parts.push(`ticks=${ticks}`);
  return parts.length ? parts.join("  ") : String(t);
}

async function getExactlyOneSelectedVideoClipOrThrow(sequence) {
  // getSelection() returns TrackItemSelection :contentReference[oaicite:1]{index=1}
  const selection = await maybeAwait(sequence.getSelection());
  if (!selection || typeof selection.getTrackItems !== "function") {
    throw new Error("Could not read selection (no TrackItemSelection).");
  }

  // TrackItemSelection.getTrackItems() returns the selected Audio/Video track items :contentReference[oaicite:2]{index=2}
  const raw = await maybeAwait(selection.getTrackItems());

  // Normalize: could be Array, could be array-like
  const items = Array.isArray(raw) ? raw : Array.from(raw || []);

  // If a linked audio item is also selected, allow it — but require exactly 1 VIDEO clip
  const videoItems = items.filter((it) => it && typeof it.getComponentChain === "function");

  if (videoItems.length !== 1) {
    throw new Error(
      `Select exactly 1 video clip in the timeline (video selected: ${videoItems.length}, total selected: ${items.length}).`
    );
  }

  return videoItems[0];
}

async function dumpEffectPropertiesAtPlayhead() {
  const app = require("premierepro"); // Premiere module access pattern :contentReference[oaicite:9]{index=9}

  const project = await maybeAwait(app.Project.getActiveProject());
  if (!project) throw new Error("No active project.");

  const sequence = await maybeAwait(project.getActiveSequence());
  if (!sequence) throw new Error("No active sequence.");

  const playhead = await maybeAwait(sequence.getPlayerPosition()); // :contentReference[oaicite:10]{index=10}

  const clip = await getExactlyOneSelectedVideoClipOrThrow(sequence);

  const clipName = typeof clip.getName === "function" ? await maybeAwait(clip.getName()) : "<unknown>";
  const clipMatchName = typeof clip.getMatchName === "function" ? await maybeAwait(clip.getMatchName()) : "<unknown>";

  const chain = await maybeAwait(clip.getComponentChain()); // :contentReference[oaicite:11]{index=11}
  const componentCount = chain.getComponentCount(); // :contentReference[oaicite:12]{index=12}

  const frame = await maybeAwait(sequence.getFrameSize()); // RectF :contentReference[oaicite:2]{index=2}
  const frameW = frame.width;
  const frameH = frame.height;
   
  const lines = [];
  lines.push(`Clip Utils — Effect Dump`);
  lines.push(`Clip: ${clipName}`);
  lines.push(`Clip MatchName: ${clipMatchName}`);
  lines.push(`Playhead: ${formatTickTime(playhead)}`);
  lines.push(`Components: ${componentCount}`);
  lines.push("");

  for (let i = 0; i < componentCount; i++) {
    const comp = chain.getComponentAtIndex(i); // :contentReference[oaicite:13]{index=13}

    const compName = await maybeAwait(comp.getDisplayName()); // :contentReference[oaicite:14]{index=14}
    const compMatch = await maybeAwait(comp.getMatchName()); // :contentReference[oaicite:15]{index=15}

    lines.push(`[${i}] ${compName}`);
    lines.push(`    matchName: ${compMatch}`);

    const paramCount = await maybeAwait(comp.getParamCount()); // :contentReference[oaicite:16]{index=16}
    lines.push(`    params: ${paramCount}`);

     for (let p = 0; p < paramCount; p++) {
      const param = comp.getParam(p); // :contentReference[oaicite:17]{index=17}

      const name = param.displayName || `Param ${p}`; // :contentReference[oaicite:18]{index=18}
      const { value, note } = await getParamValueAtTimeOrFallback(param, playhead);

      lines.push(`      - ${name}: ${formatValueWithContext(value, frameW, frameH)}`);

    }

    lines.push("");
  }

  return {
    summary: `Dumped ${componentCount} components at ${formatTickTime(playhead)}`,
    text: lines.join("\n")
  };
}

async function copyTextToClipboard(text) {
  await navigator.clipboard.write({ "text/plain": text });
}

async function getParamValueAtTimeOrFallback(param, time) {
  // 1) Best: interpolated value at time (works for many types)
  try {
    return { value: await maybeAwait(param.getValueAtTime(time)), note: "" }; // :contentReference[oaicite:1]{index=1}
  } catch (e1) {
    // 2) Next: if playhead is exactly on a keyframe (for types that require keyframe object)
    try {
      if (typeof param.getKeyframePtr === "function") {
        const kf = await maybeAwait(param.getKeyframePtr(time)); // :contentReference[oaicite:2]{index=2}
        if (kf && "value" in kf) return { value: kf.value, note: " (keyframe@playhead)" }; // :contentReference[oaicite:3]{index=3}
      }
    } catch (_) {}

    // 3) Next: nearest keyframe (so we still dump something useful)
    try {
      if (typeof param.findNearestKeyframe === "function") {
        const kf = await maybeAwait(param.findNearestKeyframe(time, time)); // :contentReference[oaicite:4]{index=4}
        if (kf && "value" in kf) return { value: kf.value, note: " (nearest keyframe)" }; // :contentReference[oaicite:5]{index=5}
      }
    } catch (_) {}

    // 4) Last: start value (non-time-varying fallback)
    try {
      if (typeof param.getStartValue === "function") {
        const kf0 = await maybeAwait(param.getStartValue()); // :contentReference[oaicite:6]{index=6}
        if (kf0 && "value" in kf0) return { value: kf0.value, note: " (start)" }; // :contentReference[oaicite:7]{index=7}
      }
    } catch (_) {}

    // 5) If all fail: return an inline error string instead of throwing
    const msg = (e1 && e1.message) ? e1.message : String(e1);
    return { value: `<<ERROR: ${msg}>>`, note: "" };
  }
}

function mountEffectDumpPanel(wrapperEl) {
  const runBtn = wrapperEl.querySelector("#cu-dump-run");
  const clearBtn = wrapperEl.querySelector("#cu-dump-clear");
  const copySelBtn = wrapperEl.querySelector("#cu-dump-copy-selection");
  const copyAllBtn = wrapperEl.querySelector("#cu-dump-copy-all");

  const statusEl = wrapperEl.querySelector("#cu-dump-status");
  const outEl = wrapperEl.querySelector("#cu-dump-output");

  function setOutput(text) {
    outEl.value = text;
  }

  runBtn.addEventListener("click", async () => {
    try {
      setStatus(statusEl, "ok", "Working…");
      setOutput("");

      const { summary, text } = await dumpEffectPropertiesAtPlayhead();

      setOutput(text);
      setStatus(statusEl, "ok", summary);
    } catch (err) {
      const msg = err && err.stack ? String(err.stack) : String(err);
      setOutput(msg); // put errors in the textarea so they’re easy to copy
      setStatus(statusEl, "error", "Error (details in output)");
    }
  });

  clearBtn.addEventListener("click", () => {
    setOutput("");
    setStatus(statusEl, "ok", "Cleared.");
  });

  copyAllBtn.addEventListener("click", async () => {
    try {
      await copyTextToClipboard(outEl.value || "");
      setStatus(statusEl, "ok", "Copied all output to clipboard.");
    } catch (err) {
      setStatus(statusEl, "error", `Copy failed: ${String(err)}`);
    }
  });

  copySelBtn.addEventListener("click", async () => {
    try {
      const start = outEl.selectionStart ?? 0;
      const end = outEl.selectionEnd ?? 0;
      const hasSelection = end > start;

      if (!hasSelection) {
        setStatus(statusEl, "error", "No selection. Highlight some text in the output first.");
        return;
      }

      const selected = outEl.value.slice(start, end);
      await copyTextToClipboard(selected);
      setStatus(statusEl, "ok", "Copied selection to clipboard.");
    } catch (err) {
      setStatus(statusEl, "error", `Copy failed: ${String(err)}`);
    }
  });

  // Initial state
  setStatus(statusEl, "ok", "Ready.");
  setOutput("");
}

module.exports = { mountEffectDumpPanel };
