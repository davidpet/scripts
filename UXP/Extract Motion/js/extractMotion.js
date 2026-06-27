const ppro = require("premierepro");
const {
  getActiveProjectAndSequence,
  getSelectedTrackItems,
  validateSelectionAllStills,
  resolveTransformMatchName,
  findComponentByNames,
  findParamByDisplayRegex,
  ensurePointF,
  ensurePrimitiveValue,
  getCenterPointForValue,
  secondsToTickTime
} = require("/js/premiereUtils");

function getMaybeAsyncValue(v) {
  return Promise.resolve(v);
}

function createAppendLikeAction(chain, component) {
  if (typeof chain?.createAppendComponentAction === "function") {
    return chain.createAppendComponentAction(component);
  }

  if (
    typeof chain?.createInsertComponentAction === "function" &&
    typeof chain?.getComponentCount === "function"
  ) {
    return chain.createInsertComponentAction(
      component,
      chain.getComponentCount()
    );
  }

  throw new Error("ComponentChain missing append/insert methods.");
}

function assertUsableVideoChain(chain, clipName) {
  if (!chain) {
    throw new Error(`Clip "${clipName}": getComponentChain() returned nothing.`);
  }

  const ok =
    typeof chain.getComponentCount === "function" &&
    typeof chain.getComponentAtIndex === "function" &&
    (
      typeof chain.createAppendComponentAction === "function" ||
      typeof chain.createInsertComponentAction === "function"
    );

  if (!ok) {
    throw new Error(`Clip "${clipName}": component chain does not expose expected methods.`);
  }
}

function appendTransformsOrThrow(project, appendOps) {
  const actions = appendOps.map((op) =>
    createAppendLikeAction(op.chain, op.transformHandle)
  );

  const ok = project.executeTransaction((compound) => {
    for (const action of actions) {
      compound.addAction(action);
    }
  }, "ExtractMotion: Append Transform");

  if (ok === false) {
    throw new Error("Premiere returned false from append transaction.");
  }
}

function dumpComponentParams(component) {
  const names = [];
  const count = component.getParamCount();

  for (let i = 0; i < count; i++) {
    const p = component.getParam(i);
    names.push(String(p.displayName || `(param ${i})`));
  }

  return names;
}

function resolveTransformParams(transform) {
  const allNames = dumpComponentParams(transform);
  const byRe = (re) => findParamByDisplayRegex(transform, re);

  const uniformScale = byRe(/^uniform\s*scale$/i) || byRe(/uniform.*scale/i);
  const singleScale = byRe(/^scale$/i) || byRe(/^scale\s*%?$/i);
  const scaleWidth = byRe(/^scale\s*width$/i) || byRe(/^width\s*scale$/i);
  const scaleHeight = byRe(/^scale\s*height$/i) || byRe(/^height\s*scale$/i);

  const position = byRe(/^position$/i);
  const anchor = byRe(/^anchor\s*point$/i);

  const useCompShutter = byRe(/use\s*composition.*shutter/i);
  const shutter = byRe(/^shutter\s*angle$/i);

  const hasSingle = !!singleScale;
  const hasSplit = !!scaleWidth && !!scaleHeight;

  if (!position || !anchor || (!hasSingle && !hasSplit)) {
    throw new Error(`Appended Transform params missing. Saw: ${allNames.join(" | ")}`);
  }

  return {
    allNames,
    uniformScale,
    singleScale,
    scaleWidth,
    scaleHeight,
    position,
    anchor,
    useCompShutter,
    shutter,
    hasSingle,
    hasSplit
  };
}

function tryCreateSetTimeVaryingAction(param, value) {
  if (!param || typeof param.createSetTimeVaryingAction !== "function") {
    return null;
  }

  try {
    return param.createSetTimeVaryingAction(value);
  } catch (_) {
    return null;
  }
}

function pointToString(p) {
  return `(${Number(p.x).toFixed(2)}, ${Number(p.y).toFixed(2)})`;
}

function approx(a, b, eps = 1e-2) {
  return Math.abs(a - b) <= eps;
}

function approxPointEq(a, b, eps = 1e-2) {
  return a && b && approx(a.x, b.x, eps) && approx(a.y, b.y, eps);
}

function setPointValueOnExistingKeyframe(startKey, targetPoint) {
  const v = startKey?.value;

  // PointF-like object
  if (v && typeof v.x === "number" && typeof v.y === "number") {
    v.x = targetPoint.x;
    v.y = targetPoint.y;
    return;
  }

  // Wrapped array: { value: [x, y] }
  if (v && Array.isArray(v.value) && v.value.length >= 2) {
    v.value[0] = targetPoint.x;
    v.value[1] = targetPoint.y;
    return;
  }

  // Raw array: [x, y]
  if (Array.isArray(v) && v.length >= 2) {
    v[0] = targetPoint.x;
    v[1] = targetPoint.y;
    return;
  }

  // Fallback
  startKey.value = ppro.PointF(targetPoint.x, targetPoint.y);
}

async function createSetScalarValueAction(param, value, label) {
  try {
    const startKey = await getMaybeAsyncValue(param.getStartValue());
    if (startKey && typeof startKey === "object") {
      startKey.value = value;
      return param.createSetValueAction(startKey, true);
    }

    const k = param.createKeyframe(value);
    return param.createSetValueAction(k, true);
  } catch (e) {
    throw new Error(
      `${label}: failed to build scalar set-value action with ${JSON.stringify(value)} - ` +
      (e?.message || String(e))
    );
  }
}

async function createSetPointValueAction(param, point, label) {
  try {
    const startKey = await getMaybeAsyncValue(param.getStartValue());
    setPointValueOnExistingKeyframe(startKey, point);
    return param.createSetValueAction(startKey, true);
  } catch (e) {
    throw new Error(
      `${label}: failed to build point set-value action with ${pointToString(point)} - ` +
      (e?.message || String(e))
    );
  }
}

function buildUniqueKeyframeSecs(durSec) {
  const firstSec = Math.min(1, Math.max(0, durSec));
  const secondSec = Math.max(0, durSec - 1);

  const map = new Map();
  map.set(String(firstSec), firstSec);
  map.set(String(secondSec), secondSec);

  return Array.from(map.values()).sort((a, b) => a - b);
}

function paramSupportsKeyframes(param) {
  if (!param || typeof param.areKeyframesSupported !== "function") {
    return true;
  }

  try {
    return !!param.areKeyframesSupported();
  } catch (_) {
    return true;
  }
}

function buildKenBurnsKeyframeActions(op) {
  const actions = [];
  const times = op.keyframeSecs.map((sec) => secondsToTickTime(sec));

  if (op.tp.hasSingle) {
    if (!paramSupportsKeyframes(op.tp.singleScale)) return actions;

    for (const t of times) {
      const k = op.tp.singleScale.createKeyframe(op.motionScaleVal);
      k.position = t;
      actions.push(op.tp.singleScale.createAddKeyframeAction(k));
    }

    return actions;
  }

  const canW = paramSupportsKeyframes(op.tp.scaleWidth);
  const canH = paramSupportsKeyframes(op.tp.scaleHeight);

  for (const t of times) {
    if (canW) {
      const kw = op.tp.scaleWidth.createKeyframe(op.motionScaleVal);
      kw.position = t;
      actions.push(op.tp.scaleWidth.createAddKeyframeAction(kw));
    }

    if (canH) {
      const kh = op.tp.scaleHeight.createKeyframe(op.motionScaleVal);
      kh.position = t;
      actions.push(op.tp.scaleHeight.createAddKeyframeAction(kh));
    }
  }

  return actions;
}

async function reacquireClipParams(ti, insertIndex) {
  const chain = await getMaybeAsyncValue(ti.getComponentChain());

  if (chain.getComponentCount() <= insertIndex) {
    throw new Error("Transform was not appended successfully.");
  }

  const transform = chain.getComponentAtIndex(insertIndex);
  if (!transform || typeof transform.getParamCount !== "function") {
    throw new Error("Appended Transform is not exposed as a Component.");
  }

  const tp = resolveTransformParams(transform);

  const motion = await findComponentByNames(chain, ["Motion", "ADBE Motion"]);
  if (!motion) {
    throw new Error("Motion component missing after append.");
  }

  const motionScale = findParamByDisplayRegex(motion, /^scale$/i);
  const motionPos = findParamByDisplayRegex(motion, /^position$/i);
  const motionAnchor = findParamByDisplayRegex(motion, /^anchor\s*point$/i);

  if (!motionScale || !motionPos || !motionAnchor) {
    throw new Error("Motion params missing after append.");
  }

  return {
    chain,
    tp,
    motionScale,
    motionPos,
    motionAnchor
  };
}

async function applySinglePointWrite(project, param, targetPoint, label) {
  const off = tryCreateSetTimeVaryingAction(param, false);
  const setAction = await createSetPointValueAction(param, targetPoint, label);

  const ok = project.executeTransaction((compound) => {
    if (off) compound.addAction(off);
    compound.addAction(setAction);
  }, label);

  if (ok === false) {
    throw new Error(`${label}: Premiere returned false from point-write transaction.`);
  }
}

async function runExtractMotion({ addKenBurns, log }) {
  const { project, sequence } = await getActiveProjectAndSequence();
  const selected = await getSelectedTrackItems(sequence);
  const stillItems = await validateSelectionAllStills(selected);

  const transformMatchName = await resolveTransformMatchName();
  const frameSize = await getMaybeAsyncValue(sequence.getFrameSize());
  const t0 = ppro.TickTime.TIME_ZERO || secondsToTickTime(0);

  // Phase 1: read Motion and prepare append
  const appendOps = [];

  for (const ti of stillItems) {
    const name = await ti.getName();
    const chain = await getMaybeAsyncValue(ti.getComponentChain());
    assertUsableVideoChain(chain, name);

    const motion = await findComponentByNames(chain, ["Motion", "ADBE Motion"]);
    if (!motion) throw new Error(`Clip "${name}": could not find Motion component.`);

    const motionScale = findParamByDisplayRegex(motion, /^scale$/i);
    const motionPos = findParamByDisplayRegex(motion, /^position$/i);
    const motionAnchor = findParamByDisplayRegex(motion, /^anchor\s*point$/i);

    if (!motionScale || !motionPos || !motionAnchor) {
      throw new Error(`Clip "${name}": Motion params missing (Scale/Position/Anchor Point).`);
    }

    const motionScaleVal = ensurePrimitiveValue(
      await getMaybeAsyncValue(motionScale.getValueAtTime(t0))
    );
    const motionPosVal = ensurePointF(
      await getMaybeAsyncValue(motionPos.getValueAtTime(t0))
    );
    const motionAnchorVal = ensurePointF(
      await getMaybeAsyncValue(motionAnchor.getValueAtTime(t0))
    );

    const motionPosCenter = getCenterPointForValue(frameSize, motionPosVal);
    const motionAnchorCenter = getCenterPointForValue(frameSize, motionAnchorVal);

    const duration = await ti.getDuration();
    const durSec = typeof duration?.seconds === "number" ? duration.seconds : 0;

    const insertIndex = chain.getComponentCount();
    const transformHandle = await ppro.VideoFilterFactory.createComponent(transformMatchName);

    appendOps.push({
      name,
      ti,
      chain,
      insertIndex,
      transformHandle,
      motionScaleVal,
      motionPosVal,
      motionAnchorVal,
      motionPosCenter,
      motionAnchorCenter,
      keyframeSecs: buildUniqueKeyframeSecs(durSec),
      kf2Sec: Math.max(0, durSec - 1)
    });
  }

  // Phase 2: append Transform
  appendTransformsOrThrow(project, appendOps);

  // Phase 3: reacquire params after append
  const ops = [];

  for (const op of appendOps) {
    const reacquired = await reacquireClipParams(op.ti, op.insertIndex);
    ops.push({ ...op, ...reacquired });
  }

  // Phase 4A: do scalar/static setup in one batch (this part already works)
  const scalarActions = [];

  for (const op of ops) {
    // Motion scale -> 100
    const msOff = tryCreateSetTimeVaryingAction(op.motionScale, false);
    if (msOff) scalarActions.push(msOff);

    scalarActions.push(
      await createSetScalarValueAction(
        op.motionScale,
        100,
        `${op.name} / Motion Scale`
      )
    );

    // Transform scale -> literal Motion scale
    if (op.tp.hasSingle) {
      const off = tryCreateSetTimeVaryingAction(op.tp.singleScale, false);
      if (off) scalarActions.push(off);

      scalarActions.push(
        await createSetScalarValueAction(
          op.tp.singleScale,
          op.motionScaleVal,
          `${op.name} / Transform Scale`
        )
      );
    } else {
      if (op.tp.uniformScale) {
        const uOff = tryCreateSetTimeVaryingAction(op.tp.uniformScale, false);
        if (uOff) scalarActions.push(uOff);

        scalarActions.push(
          await createSetScalarValueAction(
            op.tp.uniformScale,
            true,
            `${op.name} / Transform Uniform Scale`
          )
        );
      }

      const wOff = tryCreateSetTimeVaryingAction(op.tp.scaleWidth, false);
      const hOff = tryCreateSetTimeVaryingAction(op.tp.scaleHeight, false);
      if (wOff) scalarActions.push(wOff);
      if (hOff) scalarActions.push(hOff);

      scalarActions.push(
        await createSetScalarValueAction(
          op.tp.scaleWidth,
          op.motionScaleVal,
          `${op.name} / Transform Scale Width`
        )
      );
      scalarActions.push(
        await createSetScalarValueAction(
          op.tp.scaleHeight,
          op.motionScaleVal,
          `${op.name} / Transform Scale Height`
        )
      );
    }

    if (op.tp.useCompShutter) {
      const off = tryCreateSetTimeVaryingAction(op.tp.useCompShutter, false);
      if (off) scalarActions.push(off);

      scalarActions.push(
        await createSetScalarValueAction(
          op.tp.useCompShutter,
          false,
          `${op.name} / Transform Use Composition Shutter`
        )
      );
    }

    if (op.tp.shutter) {
      const off = tryCreateSetTimeVaryingAction(op.tp.shutter, false);
      if (off) scalarActions.push(off);

      scalarActions.push(
        await createSetScalarValueAction(
          op.tp.shutter,
          360,
          `${op.name} / Transform Shutter`
        )
      );
    }
  }

  if (scalarActions.length) {
    const ok = project.executeTransaction((compound) => {
      for (const action of scalarActions) {
        compound.addAction(action);
      }
    }, "ExtractMotion: Set Scalar Values");

    if (ok === false) {
      throw new Error("Premiere returned false from scalar-values transaction.");
    }
  }

  // Phase 4B: POINT WRITES ONE-BY-ONE WITH REACQUIRE IN BETWEEN
  // This is intentionally less elegant to avoid batched point-value interference.
  for (const op of ops) {
    // Transform Position = literal raw Motion Position
    {
      const r = await reacquireClipParams(op.ti, op.insertIndex);
      await applySinglePointWrite(
        project,
        r.tp.position,
        op.motionPosVal,
        `${op.name} / Set Transform Position`
      );
    }

    // Transform Anchor = literal raw Motion Anchor
    {
      const r = await reacquireClipParams(op.ti, op.insertIndex);
      await applySinglePointWrite(
        project,
        r.tp.anchor,
        op.motionAnchorVal,
        `${op.name} / Set Transform Anchor`
      );
    }

    // Motion Position = sequence center
    {
      const r = await reacquireClipParams(op.ti, op.insertIndex);
      await applySinglePointWrite(
        project,
        r.motionPos,
        op.motionPosCenter,
        `${op.name} / Set Motion Position`
      );
    }

    // Motion Anchor = sequence center
    {
      const r = await reacquireClipParams(op.ti, op.insertIndex);
      await applySinglePointWrite(
        project,
        r.motionAnchor,
        op.motionAnchorCenter,
        `${op.name} / Set Motion Anchor`
      );
    }
  }

  // Reacquire final handles for verification + optional keyframes
  const finalOps = [];
  for (const op of ops) {
    const r = await reacquireClipParams(op.ti, op.insertIndex);
    finalOps.push({ ...op, ...r });
  }

  // Verify the priority issues (#1-#3)
  let bad = 0;

  for (const op of finalOps) {
    const tPosAfter = ensurePointF(
      await getMaybeAsyncValue(op.tp.position.getValueAtTime(t0))
    );
    const tAnchorAfter = ensurePointF(
      await getMaybeAsyncValue(op.tp.anchor.getValueAtTime(t0))
    );
    const mPosAfter = ensurePointF(
      await getMaybeAsyncValue(op.motionPos.getValueAtTime(t0))
    );
    const mAnchorAfter = ensurePointF(
      await getMaybeAsyncValue(op.motionAnchor.getValueAtTime(t0))
    );

    const ok =
      approxPointEq(tPosAfter, op.motionPosVal) &&
      approxPointEq(tAnchorAfter, op.motionAnchorVal) &&
      approxPointEq(mPosAfter, op.motionPosCenter) &&
      approxPointEq(mAnchorAfter, op.motionAnchorCenter);

    if (!ok) {
      bad++;
      log(`Verify "${op.name}":`);
      if (!approxPointEq(tPosAfter, op.motionPosVal)) {
        log(`  Transform Position after ${pointToString(tPosAfter)} expected ${pointToString(op.motionPosVal)}`);
      }
      if (!approxPointEq(tAnchorAfter, op.motionAnchorVal)) {
        log(`  Transform Anchor after ${pointToString(tAnchorAfter)} expected ${pointToString(op.motionAnchorVal)}`);
      }
      if (!approxPointEq(mPosAfter, op.motionPosCenter)) {
        log(`  Motion Position after ${pointToString(mPosAfter)} expected ${pointToString(op.motionPosCenter)}`);
      }
      if (!approxPointEq(mAnchorAfter, op.motionAnchorCenter)) {
        log(`  Motion Anchor after ${pointToString(mAnchorAfter)} expected ${pointToString(op.motionAnchorCenter)}`);
      }
    }
  }

  // Phase 5: Ken Burns (still secondary)
  if (addKenBurns) {
    const tvOnActions = [];

    for (const op of finalOps) {
      if (op.tp.hasSingle) {
        const a = tryCreateSetTimeVaryingAction(op.tp.singleScale, true);
        if (a) tvOnActions.push(a);
      } else {
        const aw = tryCreateSetTimeVaryingAction(op.tp.scaleWidth, true);
        const ah = tryCreateSetTimeVaryingAction(op.tp.scaleHeight, true);
        if (aw) tvOnActions.push(aw);
        if (ah) tvOnActions.push(ah);
      }
    }

    if (tvOnActions.length) {
      project.executeTransaction((compound) => {
        for (const action of tvOnActions) {
          compound.addAction(action);
        }
      }, "ExtractMotion: Enable Ken Burns Scale Animation");
    }

    const keyActions = [];
    for (const op of finalOps) {
      keyActions.push(...buildKenBurnsKeyframeActions(op));
    }

    if (keyActions.length) {
      project.executeTransaction((compound) => {
        for (const action of keyActions) {
          compound.addAction(action);
        }
      }, "ExtractMotion: Add Ken Burns Keyframes");
    }
  }

  log(`Processed ${finalOps.length} still clip(s).`);
  if (bad) {
    log(`Verification: ${bad} clip(s) still have point-value mismatches.`);
  }

  if (addKenBurns && finalOps.length === 1) {
    const op = finalOps[0];
    const startTime = await getMaybeAsyncValue(op.ti.getStartTime());
    const seekTime = startTime.add(secondsToTickTime(op.kf2Sec));
    await getMaybeAsyncValue(sequence.setPlayerPosition(seekTime));
    log(`Playhead moved to (clip start + ${op.kf2Sec.toFixed(3)}s).`);
  }
}

module.exports = { runExtractMotion };