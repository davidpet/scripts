const { fromTransform, mul, decomposeNoShear } = require("../lib/matrix2d");
const {
  execActions,
  getActiveSequenceOrThrow,
  getPlayheadTickTimeOrThrow,
  getSelectedSingleTrackItemOrThrow,
  getVideoComponentChainOrThrow,
  getComponentDisplayName,
  getComponentMatchName,
  getComponentParams,
  findParamByDisplayName,
  makeKeyframe
} = require("../lib/ppro.js");
const { VideoFilterFactory } = require("premierepro");

function getTransformMatchNameOrThrow() {
  const names = VideoFilterFactory.getDisplayNames?.() ?? [];
  const matches = VideoFilterFactory.getMatchNames?.() ?? [];
  const idx = names.findIndex((n) => String(n).toLowerCase() === "transform");
  if (idx < 0 || !matches[idx]) throw new Error("Could not resolve Transform matchName.");
  return matches[idx];
}

function isTransformComponent(component, transformMatchName) {
  const mn = getComponentMatchName(component);
  const dn = getComponentDisplayName(component);
  return mn === transformMatchName || String(dn).toLowerCase() === "transform";
}

function hasKeyframes(component) {
  const params = getComponentParams(component);
  return params.some((p) => p.isTimeVarying?.());
}

function getNumericParam(component, t, displayNameCandidates) {
  for (const name of displayNameCandidates) {
    const p = findParamByDisplayName(component, name);
    if (!p) continue;
    const v = p.getValueAtTime(t);
    if (typeof v === "number" && Number.isFinite(v)) return { param: p, value: v };
  }
  return null;
}

function findBlurParams(component) {
  const params = getComponentParams(component);
  const lower = (s) => String(s || "").toLowerCase();

  const shutter = params.find((p) => lower(p.displayName || p.getDisplayName?.()).includes("shutter") && lower(p.displayName || p.getDisplayName?.()).includes("angle"));
  const samples = params.find((p) => lower(p.displayName || p.getDisplayName?.()).includes("sample"));

  return { shutter, samples };
}

function readTransformLike(component, t) {
  const pos = findParamByDisplayName(component, "Position");
  const anchor = findParamByDisplayName(component, "Anchor Point");
  const rot = findParamByDisplayName(component, "Rotation");

  // Scale can be one param (Scale) or split; we prefer Scale if present.
  const scale = findParamByDisplayName(component, "Scale");
  const scaleW = findParamByDisplayName(component, "Scale Width");
  const scaleH = findParamByDisplayName(component, "Scale Height");

  if (!pos || !anchor || !rot) {
    throw new Error("Transform missing Position/Anchor Point/Rotation.");
  }

  const position = pos.getValueAtTime(t);
  const anch = anchor.getValueAtTime(t);
  const rotation = rot.getValueAtTime(t);

  let sxPct = null;
  let syPct = null;

  if (scale) {
    const s = scale.getValueAtTime(t);
    if (typeof s !== "number") throw new Error("Unexpected Scale value type.");
    sxPct = s;
    syPct = s;
  } else if (scaleW && scaleH) {
    const sw = scaleW.getValueAtTime(t);
    const sh = scaleH.getValueAtTime(t);
    if (typeof sw !== "number" || typeof sh !== "number") throw new Error("Unexpected Scale Width/Height value type.");
    sxPct = sw;
    syPct = sh;
  } else {
    throw new Error("Transform missing Scale (or Scale Width/Height).");
  }

  return {
    posParam: pos,
    anchorParam: anchor,
    rotParam: rot,
    scaleParam: scale,
    scaleWParam: scaleW,
    scaleHParam: scaleH,
    position,
    anchor: anch,
    rotation,
    scaleXPct: sxPct,
    scaleYPct: syPct
  };
}

function writeCollapsedTransformParams(component, t, collapsed, blurMax) {
  const pos = findParamByDisplayName(component, "Position");
  const anchor = findParamByDisplayName(component, "Anchor Point");
  const rot = findParamByDisplayName(component, "Rotation");
  const scale = findParamByDisplayName(component, "Scale");
  const scaleW = findParamByDisplayName(component, "Scale Width");
  const scaleH = findParamByDisplayName(component, "Scale Height");

  if (!pos || !anchor || !rot) throw new Error("Target Transform missing Position/Anchor/Rotation.");

  const actions = [];

  // Anchor set to (0,0) for a stable decomposition
  actions.push(anchor.createSetValueAction(makeKeyframe(t, { x: 0, y: 0 })));
  actions.push(pos.createSetValueAction(makeKeyframe(t, collapsed.position)));
  actions.push(rot.createSetValueAction(makeKeyframe(t, collapsed.rotationDeg)));

  const sxPct = collapsed.scaleX * 100.0;
  const syPct = collapsed.scaleY * 100.0;

  if (scale) {
    // If we have a single Scale param but sx!=sy, this is an approximation.
    // We keep it exact only when uniform; otherwise prefer Width/Height if available.
    if (Math.abs(sxPct - syPct) < 1e-9) {
      actions.push(scale.createSetValueAction(makeKeyframe(t, sxPct)));
    } else if (scaleW && scaleH) {
      actions.push(scaleW.createSetValueAction(makeKeyframe(t, sxPct)));
      actions.push(scaleH.createSetValueAction(makeKeyframe(t, syPct)));
    } else {
      throw new Error("Non-uniform scale collapse requires Scale Width/Height support on this Transform.");
    }
  } else if (scaleW && scaleH) {
    actions.push(scaleW.createSetValueAction(makeKeyframe(t, sxPct)));
    actions.push(scaleH.createSetValueAction(makeKeyframe(t, syPct)));
  } else {
    throw new Error("Target Transform missing Scale controls.");
  }

  // Blur settings: keep max within the adjacent group (as requested)
  const { shutter, samples } = findBlurParams(component);

  if (shutter && typeof blurMax.shutterAngle === "number") {
    if (shutter.isTimeVarying?.()) throw new Error("Shutter Angle has keyframes; not supported in Collapse Motion.");
    actions.push(shutter.createSetValueAction(makeKeyframe(t, blurMax.shutterAngle)));
  }

  if (samples && typeof blurMax.samples === "number") {
    if (samples.isTimeVarying?.()) throw new Error("Samples has keyframes; not supported in Collapse Motion.");
    actions.push(samples.createSetValueAction(makeKeyframe(t, blurMax.samples)));
  }

  return actions;
}

 async function runCollapseMotion() {
  const seq = await getActiveSequenceOrThrow();
  const t = await getPlayheadTickTimeOrThrow(seq);

  const trackItem = await getSelectedSingleTrackItemOrThrow(seq);
  const chain = getVideoComponentChainOrThrow(trackItem);

  const transformMatchName = getTransformMatchNameOrThrow();

  const count = chain.getComponentCount?.() ?? 0;
  const transforms = [];
  for (let i = 0; i < count; i++) {
    const c = chain.getComponentAtIndex(i);
    if (isTransformComponent(c, transformMatchName)) transforms.push({ idx: i, comp: c });
  }

  if (transforms.length < 2) {
    throw new Error("No adjacent Transform effects to collapse (need at least 2 Transform effects on the clip).");
  }

  // Find groups of truly adjacent Transform components (no other effects between)
  const groups = [];
  let current = [transforms[0]];

  for (let i = 1; i < transforms.length; i++) {
    const prev = transforms[i - 1];
    const cur = transforms[i];
    if (cur.idx === prev.idx + 1) {
      current.push(cur);
    } else {
      if (current.length > 1) groups.push(current);
      current = [cur];
    }
  }
  if (current.length > 1) groups.push(current);

  if (groups.length === 0) {
    throw new Error("No adjacent Transform effects to collapse (Transforms exist but are not adjacent).");
  }

  // For each group: collapse into the first Transform, remove the rest.
  for (const group of groups) {
    // Keyframe restriction
    for (const { comp } of group) {
      if (hasKeyframes(comp)) {
        throw new Error("Collapse Motion is restricted to static (non-keyframed) Transform effects. Remove keyframes first.");
      }
    }

    // Compose matrices in processing order (top-to-bottom), so total = M_last * ... * M_first
    let total = null;

    // Also compute max blur params across the group
    let maxShutter = -Infinity;
    let maxSamples = -Infinity;

    for (const { comp } of group) {
      const tr = readTransformLike(comp, t);

      const position = tr.position;
      const anchor = tr.anchor;
      const rotationDeg = tr.rotation;

      const scaleX = tr.scaleXPct / 100.0;
      const scaleY = tr.scaleYPct / 100.0;

      const m = fromTransform({
        position,
        anchor,
        scaleX,
        scaleY,
        rotationDeg
      });

      total = total ? mul(m, total) : m;

      const blur = findBlurParams(comp);
      if (blur.shutter) {
        const v = blur.shutter.getValueAtTime(t);
        if (typeof v === "number" && Number.isFinite(v)) maxShutter = Math.max(maxShutter, v);
      }
      if (blur.samples) {
        const v = blur.samples.getValueAtTime(t);
        if (typeof v === "number" && Number.isFinite(v)) maxSamples = Math.max(maxSamples, v);
      }
    }

    const collapsed = decomposeNoShear(total);

    const blurMax = {
      shutterAngle: Number.isFinite(maxShutter) ? maxShutter : undefined,
      samples: Number.isFinite(maxSamples) ? maxSamples : undefined
    };

    const target = group[0].comp;
    const actions = [];

    actions.push(...writeCollapsedTransformParams(target, t, collapsed, blurMax));

    // Remove the remaining components in reverse order (safer)
    const toRemove = group.slice(1).map((x) => x.comp).reverse();
    for (const comp of toRemove) {
      actions.push(chain.createRemoveComponentAction(comp));
    }

    await execActions(actions);
  }
}

module.exports = { runCollapseMotion };
