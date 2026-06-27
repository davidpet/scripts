const ppro = require("premierepro");
const { STILL_EXTS } = require("/js/constants");

function ensurePrimitiveValue(v) {
  if (
    typeof v === "number" ||
    typeof v === "string" ||
    typeof v === "boolean"
  ) {
    return v;
  }

  if (
    v &&
    Object.prototype.hasOwnProperty.call(v, "value") &&
    (
      typeof v.value === "number" ||
      typeof v.value === "string" ||
      typeof v.value === "boolean"
    )
  ) {
    return v.value;
  }

  throw new Error("Expected a primitive param value but got: " + JSON.stringify(v));
}

function normName(s) {
  return String(s || "").trim().toLowerCase();
}

async function getActiveProjectAndSequence() {
  const project = await ppro.Project.getActiveProject();
  if (!project) throw new Error("No active project.");

  const sequence = await project.getActiveSequence();
  if (!sequence) throw new Error("No active sequence.");

  return { project, sequence };
}

async function getSelectedTrackItems(sequence) {
  const selection = await sequence.getSelection();
  if (!selection) return [];

  const itemsMaybe = selection.getTrackItems();
  const items = await Promise.resolve(itemsMaybe);
  return items || [];
}

async function getClipPathAndExt(trackItem) {
  const projectItem = await trackItem.getProjectItem();
  const clipPI = ppro.ClipProjectItem.cast(projectItem);
  const filePath = await clipPI.getMediaFilePath();
  const ext = (filePath.split(".").pop() || "").toLowerCase();

  return { filePath, ext };
}

async function safeGetName(trackItem) {
  try {
    if (typeof trackItem.getName === "function") {
      return await trackItem.getName();
    }
  } catch (_) {}
  return "";
}

async function validateSelectionAllStills(selectedTrackItems) {
  if (!selectedTrackItems.length) {
    throw new Error("Select one or more STILL IMAGE clips (and nothing else).");
  }

  const nonStill = [];
  const stills = [];

  for (const ti of selectedTrackItems) {
    if (typeof ti.getComponentChain !== "function") {
      const name = (await safeGetName(ti)) || "(unknown item)";
      nonStill.push(`${name} (not a video clip track item)`);
      continue;
    }

    try {
      const { filePath, ext } = await getClipPathAndExt(ti);

      if (!filePath) {
        const name = (await safeGetName(ti)) || "(unknown clip)";
        nonStill.push(`${name} (no media file path — likely generated/sequence/adjustment)`);
        continue;
      }

      if (!STILL_EXTS.has(ext)) {
        const name = (await safeGetName(ti)) || "(unknown clip)";
        nonStill.push(`${name} (${ext || "no ext"}): ${filePath}`);
        continue;
      }

      stills.push(ti);
    } catch (e) {
      const name = (await safeGetName(ti)) || "(unknown item)";
      nonStill.push(`${name} (not a still-image ClipProjectItem)`);
    }
  }

  if (nonStill.length) {
    throw new Error(
      "Selection contains non-still items. Please select ONLY still-image clips.\n" +
      nonStill.map((s) => " - " + s).join("\n")
    );
  }

  return stills;
}

async function resolveTransformMatchName() {
  const displayNames = await ppro.VideoFilterFactory.getDisplayNames();
  const matchNames = await ppro.VideoFilterFactory.getMatchNames();

  const idx = displayNames.findIndex((n) => normName(n) === "transform");
  if (idx >= 0 && matchNames[idx]) {
    return matchNames[idx];
  }

  const candidates = matchNames.filter((n) => /transform/i.test(n));
  if (!candidates.length) {
    throw new Error("Could not locate Transform effect matchName.");
  }

  candidates.sort((a, b) => {
    const score = (s) =>
      (s.startsWith("PR.") ? 5 : 0) +
      (/ADBE/i.test(s) ? 2 : 0) +
      (/transform/i.test(s) ? 1 : 0);
    return score(b) - score(a);
  });

  return candidates[0];
}

async function findComponentByNames(chain, wanted) {
  const count = chain.getComponentCount();

  for (let i = 0; i < count; i++) {
    const comp = chain.getComponentAtIndex(i);
    const display = normName(await comp.getDisplayName());
    const match = normName(await comp.getMatchName());

    for (const w of wanted) {
      const wn = normName(w);
      if (display === wn || match === wn || display.includes(wn) || match.includes(wn)) {
        return comp;
      }
    }
  }

  return null;
}

function findParamByDisplayRegex(component, re) {
  const count = component.getParamCount();

  for (let i = 0; i < count; i++) {
    const p = component.getParam(i);
    if (re.test(String(p.displayName || ""))) {
      return p;
    }
  }

  return null;
}

function looksNormalizedPoint(pt) {
  return (
    pt &&
    typeof pt.x === "number" &&
    typeof pt.y === "number" &&
    Math.abs(pt.x) <= 2 &&
    Math.abs(pt.y) <= 2
  );
}

function ensurePointF(v) {
  if (v && typeof v.x === "number" && typeof v.y === "number") {
    return ppro.PointF(v.x, v.y);
  }

  if (
    v &&
    Array.isArray(v.value) &&
    v.value.length >= 2 &&
    typeof v.value[0] === "number" &&
    typeof v.value[1] === "number"
  ) {
    return ppro.PointF(v.value[0], v.value[1]);
  }

  if (
    Array.isArray(v) &&
    v.length >= 2 &&
    typeof v[0] === "number" &&
    typeof v[1] === "number"
  ) {
    return ppro.PointF(v[0], v[1]);
  }

  throw new Error("Expected a PointF-like value but got: " + JSON.stringify(v));
}

function getCenterPointForValue(frameSize, samplePoint) {
  if (looksNormalizedPoint(samplePoint)) {
    return ppro.PointF(0.5, 0.5);
  }

  return ppro.PointF(frameSize.width / 2, frameSize.height / 2);
}

function convertPointToTargetSpace(frameSize, sourcePoint, targetSamplePoint) {
  const sourceIsNorm = looksNormalizedPoint(sourcePoint);
  const targetIsNorm = looksNormalizedPoint(targetSamplePoint);

  if (sourceIsNorm === targetIsNorm) {
    return ppro.PointF(sourcePoint.x, sourcePoint.y);
  }

  if (sourceIsNorm && !targetIsNorm) {
    return ppro.PointF(
      sourcePoint.x * frameSize.width,
      sourcePoint.y * frameSize.height
    );
  }

  return ppro.PointF(
    sourcePoint.x / frameSize.width,
    sourcePoint.y / frameSize.height
  );
}

function secondsToTickTime(sec) {
  return ppro.TickTime.createWithSeconds(sec);
}

module.exports = {
  getActiveProjectAndSequence,
  getSelectedTrackItems,
  validateSelectionAllStills,
  resolveTransformMatchName,
  findComponentByNames,
  findParamByDisplayRegex,
  ensurePointF,
  ensurePrimitiveValue,
  getCenterPointForValue,
  convertPointToTargetSpace,
  secondsToTickTime
};