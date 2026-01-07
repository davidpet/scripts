const { getProjectItemDimensions } = require("../lib/metadata");
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

function findComponentByName(chain, displayName) {
  const count = chain.getComponentCount?.() ?? 0;
  for (let i = 0; i < count; i++) {
    const c = chain.getComponentAtIndex(i);
    if (getComponentDisplayName(c) === displayName) return c;
  }
  return null;
}

function hasAnyKeyframesOnComponent(component) {
  const params = getComponentParams(component);
  return params.some((p) => p.isTimeVarying?.());
}

function getTransformMatchNameOrThrow() {
  const names = VideoFilterFactory.getDisplayNames?.() ?? [];
  const matches = VideoFilterFactory.getMatchNames?.() ?? [];
  const idx = names.findIndex((n) => String(n).toLowerCase() === "transform");
  if (idx < 0 || !matches[idx]) {
    throw new Error("Could not find the built-in 'Transform' effect via VideoFilterFactory.");
  }
  return matches[idx];
}

function readMotionValues(motion, t) {
  const pos = findParamByDisplayName(motion, "Position");
  const scale = findParamByDisplayName(motion, "Scale");
  const anchor = findParamByDisplayName(motion, "Anchor Point");
  const rot = findParamByDisplayName(motion, "Rotation");

  if (!pos || !scale || !anchor || !rot) {
    throw new Error("Could not locate Motion params (Position/Scale/Anchor Point/Rotation).");
  }

  return {
    posParam: pos,
    scaleParam: scale,
    anchorParam: anchor,
    rotParam: rot,
    position: pos.getValueAtTime(t),
    scale: scale.getValueAtTime(t),
    anchor: anchor.getValueAtTime(t),
    rotation: rot.getValueAtTime(t)
  };
}

function writeTransformValues(transform, t, motionValues) {
  const pos = findParamByDisplayName(transform, "Position");
  const scale = findParamByDisplayName(transform, "Scale");
  const anchor = findParamByDisplayName(transform, "Anchor Point");
  const rot = findParamByDisplayName(transform, "Rotation");

  if (!pos || !scale || !anchor || !rot) {
    throw new Error("Could not locate Transform params (Position/Scale/Anchor Point/Rotation).");
  }

  if (pos.isTimeVarying?.() || scale.isTimeVarying?.() || anchor.isTimeVarying?.() || rot.isTimeVarying?.()) {
    throw new Error("Transform has keyframes. Remove keyframes before running Extract Motion.");
  }

  return [
    pos.createSetValueAction(makeKeyframe(t, motionValues.position)),
    scale.createSetValueAction(makeKeyframe(t, motionValues.scale)),
    anchor.createSetValueAction(makeKeyframe(t, motionValues.anchor)),
    rot.createSetValueAction(makeKeyframe(t, motionValues.rotation))
  ];
}

async function resetMotionToDefaults(sequence, trackItem, motion, t) {
  const frameRect = sequence.getFrameSize?.();
  if (!frameRect) throw new Error("Could not read sequence frame size.");

  const seqW = frameRect.right - frameRect.left;
  const seqH = frameRect.bottom - frameRect.top;

  const projectItem = trackItem.getProjectItem?.();
  if (!projectItem) throw new Error("Could not read projectItem for selected clip.");

  const { width: clipW, height: clipH } = await getProjectItemDimensions(projectItem);

  const defaultPosition = { x: seqW / 2, y: seqH / 2 };
  const defaultAnchor = { x: clipW / 2, y: clipH / 2 };
  const defaultRotation = 0;
  const defaultScale = 100;

  const pos = findParamByDisplayName(motion, "Position");
  const scale = findParamByDisplayName(motion, "Scale");
  const anchor = findParamByDisplayName(motion, "Anchor Point");
  const rot = findParamByDisplayName(motion, "Rotation");

  if (!pos || !scale || !anchor || !rot) {
    throw new Error("Could not locate Motion params to reset.");
  }

  if (pos.isTimeVarying?.() || scale.isTimeVarying?.() || anchor.isTimeVarying?.() || rot.isTimeVarying?.()) {
    throw new Error("Motion has keyframes. Remove keyframes before running Extract Motion.");
  }

  return [
    pos.createSetValueAction(makeKeyframe(t, defaultPosition)),
    anchor.createSetValueAction(makeKeyframe(t, defaultAnchor)),
    scale.createSetValueAction(makeKeyframe(t, defaultScale)),
    rot.createSetValueAction(makeKeyframe(t, defaultRotation))
  ];
}

async function runExtractMotion() {
  const seq = await getActiveSequenceOrThrow();
  const t = await getPlayheadTickTimeOrThrow(seq);

  const trackItem = await getSelectedSingleTrackItemOrThrow(seq);
  const chain = getVideoComponentChainOrThrow(trackItem);

  const motion = findComponentByName(chain, "Motion");
  if (!motion) throw new Error("Could not find the fixed 'Motion' component on the selected clip.");

  if (hasAnyKeyframesOnComponent(motion)) {
    throw new Error("Motion has keyframes. This command is restricted to static (non-keyframed) Motion.");
  }

  // Create Transform and append it to the end of the component chain (end of Standard effects list).
  const transformMatchName = getTransformMatchNameOrThrow();
  const transformComponent = VideoFilterFactory.createComponent(transformMatchName);
  if (!transformComponent) throw new Error("Failed to create Transform component.");

  const appendAction = chain.createAppendComponentAction(transformComponent);

  // Apply append first, then set params.
  await execActions([appendAction]);

  // Re-fetch the last component as the appended Transform (more robust).
  const lastIdx = (chain.getComponentCount?.() ?? 1) - 1;
  const transform = chain.getComponentAtIndex(lastIdx);

  const motionValues = readMotionValues(motion, t);
  const transformMatch = getComponentMatchName(transform);
  if (!String(transformMatch).includes("Transform") && getComponentDisplayName(transform) !== "Transform") {
    // Not fatal, but helpful.
    // (In some builds, matchName differs; display name should still be Transform.)
  }

  if (hasAnyKeyframesOnComponent(transform)) {
    throw new Error("Transform has keyframes. Remove them before running Extract Motion.");
  }

  const actions = [];

  // Move Motion values into Transform
  actions.push(...writeTransformValues(transform, t, motionValues));

  // Reset Motion to defaults (centered / 100% / clip-center anchor)
  actions.push(...(await resetMotionToDefaults(seq, trackItem, motion, t)));

  await execActions(actions);
}

module.exports = { runExtractMotion };
