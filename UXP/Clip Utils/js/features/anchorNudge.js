const {
  execActions,
  getActiveSequenceOrThrow,
  getPlayheadTickTimeOrThrow,
  getSelectedSingleTrackItemOrThrow,
  getVideoComponentChainOrThrow,
  getComponentDisplayName,
  getComponentMatchName,
  findParamByDisplayName,
  makeKeyframe
} = require("../lib/ppro");

function showStatus(root, msg, isError) {
  const el = root.querySelector("#cu-nudge-status");
  el.style.display = "block";
  el.value = msg;
  el.classList.toggle("cu-error", !!isError);
  el.classList.toggle("cu-ok", !isError);
}

function parseStep(root) {
  const nf = root.querySelector("#cu-step");
  const v = Number(nf.value);
  if (!Number.isFinite(v) || v < 0) throw new Error("Step must be a non-negative number.");
  return v;
}

function isPoint(v) {
  return v && typeof v === "object" && Number.isFinite(v.x) && Number.isFinite(v.y);
}

async function refreshEffectList(root) {
  const picker = root.querySelector("#cu-effect-picker");
  picker.innerHTML = "";

  try {
    const seq = await getActiveSequenceOrThrow();
    const item = await getSelectedSingleTrackItemOrThrow(seq);
    const chain = getVideoComponentChainOrThrow(item);
    const count = chain.getComponentCount?.() ?? 0;

    for (let i = 0; i < count; i++) {
      const comp = chain.getComponentAtIndex(i);
      const name = getComponentDisplayName(comp);
      const match = getComponentMatchName(comp);

      // Only show effects that appear to have Anchor Point + Position
      const anchor = findParamByDisplayName(comp, "Anchor Point") || findParamByDisplayName(comp, "Anchor Point (Center)");
      const pos = findParamByDisplayName(comp, "Position");

      if (!anchor || !pos) continue;

      const itemEl = document.createElement("sp-menu-item");
      itemEl.value = String(i);
      itemEl.textContent = match ? `${name} (${match})` : name;
      picker.appendChild(itemEl);
    }

    if (picker.children.length === 0) {
      const empty = document.createElement("sp-menu-item");
      empty.value = "";
      empty.textContent = "(No effects with Anchor Point + Position found)";
      picker.appendChild(empty);
    }

    showStatus(root, "Effect list refreshed.", false);
  } catch (e) {
    const itemEl = document.createElement("sp-menu-item");
    itemEl.value = "";
    itemEl.textContent = "(select exactly 1 clip first)";
    picker.appendChild(itemEl);
    showStatus(root, e?.message ?? String(e), true);
  }
}

async function applyNudge(root, dx, dy) {
  const seq = await getActiveSequenceOrThrow();
  const playhead = await getPlayheadTickTimeOrThrow(seq);

  const item = await getSelectedSingleTrackItemOrThrow(seq);
  const chain = getVideoComponentChainOrThrow(item);

  const picker = root.querySelector("#cu-effect-picker");
  const idx = Number(picker.value);
  if (!Number.isFinite(idx)) throw new Error("Select an effect in the picker first.");

  const comp = chain.getComponentAtIndex(idx);
  const anchorParam = findParamByDisplayName(comp, "Anchor Point");
  const posParam = findParamByDisplayName(comp, "Position");

  if (!anchorParam || !posParam) throw new Error("Selected effect is missing Anchor Point or Position.");

  if (anchorParam.isTimeVarying?.() || posParam.isTimeVarying?.()) {
    throw new Error("Anchor Nudge is currently restricted to non-keyframed Anchor/Position (remove keyframes first).");
  }

  const anchor = anchorParam.getValueAtTime(playhead);
  const pos = posParam.getValueAtTime(playhead);

  if (!isPoint(anchor) || !isPoint(pos)) {
    throw new Error("Unexpected Anchor/Position value shape (expected {x,y}).");
  }

  const newAnchor = { x: anchor.x + dx, y: anchor.y + dy };
  const newPos = { x: pos.x - dx, y: pos.y - dy };

  const actions = [
    anchorParam.createSetValueAction(makeKeyframe(playhead, newAnchor)),
    posParam.createSetValueAction(makeKeyframe(playhead, newPos))
  ];

  await execActions(actions);

  showStatus(
    root,
    `Applied: Anchor += (${dx}, ${dy}), Position += (${ -dx }, ${ -dy }) at playhead.`,
    false
  );
}

function mountAnchorNudgePanel(rootNode) {
  const refreshBtn = rootNode.querySelector("#cu-refresh-effects");
  const applyBtn = rootNode.querySelector("#cu-nudge-apply");

  const up = rootNode.querySelector("#cu-up");
  const down = rootNode.querySelector("#cu-down");
  const left = rootNode.querySelector("#cu-left");
  const right = rootNode.querySelector("#cu-right");

  let lastDxDy = { dx: 0, dy: 0 };

  refreshBtn.addEventListener("click", async () => {
    await refreshEffectList(rootNode);
  });

  up.addEventListener("click", () => (lastDxDy = { dx: 0, dy: -parseStep(rootNode) }));
  down.addEventListener("click", () => (lastDxDy = { dx: 0, dy: parseStep(rootNode) }));
  left.addEventListener("click", () => (lastDxDy = { dx: -parseStep(rootNode), dy: 0 }));
  right.addEventListener("click", () => (lastDxDy = { dx: parseStep(rootNode), dy: 0 }));

  applyBtn.addEventListener("click", async () => {
    try {
      await applyNudge(rootNode, lastDxDy.dx, lastDxDy.dy);
    } catch (e) {
      showStatus(rootNode, e?.message ?? String(e), true);
    }
  });

  // Initial population
  refreshEffectList(rootNode).catch(() => {});
}

module.exports = { mountAnchorNudgePanel };
