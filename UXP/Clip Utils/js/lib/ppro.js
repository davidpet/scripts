// js/lib/ppro.js
const ppro = require("premierepro");

// Some Premiere UXP APIs return Promises; some builds may return direct values.
// This helper normalizes both.
async function awaitMaybe(v) {
  return v && typeof v.then === "function" ? await v : v;
}

function assertNonNull(v, msg) {
  if (v == null) throw new Error(msg);
  return v;
}

async function getActiveProjectOrThrow() {
  const project = await awaitMaybe(ppro.Project.getActiveProject());
  if (!project) throw new Error("No active project. Open a project first.");
  return project;
}

async function getActiveSequenceOrThrow() {
  const project = await getActiveProjectOrThrow();
  const seq = await awaitMaybe(project.getActiveSequence());
  if (!seq) throw new Error("No active sequence. Open a sequence first.");
  return seq;
}

async function getPlayheadTickTimeOrThrow(sequence) {
  const t = await awaitMaybe(sequence.getPlayerPosition());
  if (!t) throw new Error("Could not read playhead position.");
  return t;
}

async function getSelectedSingleTrackItemOrThrow(sequence) {
  const selection = await awaitMaybe(sequence.getSelection());
  if (!selection) throw new Error("Could not read selection.");

  const items = await awaitMaybe(selection.getTrackItems?.());
  const list = Array.isArray(items) ? items : (items || []);

  if (list.length !== 1) {
    throw new Error(`Expected exactly 1 selected clip, but found ${list.length}.`);
  }
  return list[0];
}

// Component chain access varies a bit across builds.
function getVideoComponentChainOrThrow(trackItem) {
  const chain =
    trackItem.getVideoComponentChain?.() ||
    trackItem.getComponentChain?.() ||
    trackItem.videoComponents?.();

  if (!chain) throw new Error("Could not access video component chain for selected item.");
  return chain;
}

function execAction(action) {
  if (ppro.core && typeof ppro.core.executeAction === "function") {
    return ppro.core.executeAction(action);
  }
  if (typeof ppro.executeAction === "function") {
    return ppro.executeAction(action);
  }
  if (action && typeof action.execute === "function") {
    return action.execute();
  }
  throw new Error("No known way to execute Action objects in this Premiere UXP environment.");
}

async function execActions(actions) {
  for (const a of actions) await execAction(a);
}

function getComponentParams(component) {
  const count = component.getParamCount?.() ?? 0;
  const params = [];
  for (let i = 0; i < count; i++) params.push(component.getParamAtIndex(i));
  return params;
}

function findParamByDisplayName(component, name) {
  const params = getComponentParams(component);
  return params.find((p) => (p.displayName || p.getDisplayName?.()) === name) || null;
}

function getComponentDisplayName(component) {
  return component.displayName || component.getDisplayName?.() || "(Unnamed Component)";
}

function getComponentMatchName(component) {
  return component.matchName || component.getMatchName?.() || "";
}

function makeKeyframe(time, value) {
  return { time, value };
}

module.exports = {
  ppro,
  awaitMaybe,
  assertNonNull,

  getActiveProjectOrThrow,
  getActiveSequenceOrThrow,
  getPlayheadTickTimeOrThrow,
  getSelectedSingleTrackItemOrThrow,
  getVideoComponentChainOrThrow,

  execActions,

  getComponentParams,
  findParamByDisplayName,
  getComponentDisplayName,
  getComponentMatchName,
  makeKeyframe
};
