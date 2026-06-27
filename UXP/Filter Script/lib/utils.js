const { app, core, imaging, constants } = require("photoshop");

function withBusyButton(buttonEl, asyncHandler, options) {
  const loadingLabel =
    options && typeof options.loadingLabel === "string"
      ? options.loadingLabel
      : "Loading…";

  return async function (...args) {
    const originalLabel = buttonEl.textContent;

    buttonEl.disabled = true;
    buttonEl.textContent = loadingLabel;

    try {
      return await asyncHandler(...args);
    } finally {
      buttonEl.textContent = originalLabel;
      buttonEl.disabled = false;
    }
  };
}

function getDocOrThrow() {
  const doc = app.activeDocument;
  if (!doc) throw new Error("No document open.");
  return doc;
}

function getBpcNumber(doc) {
  // doc.bitsPerChannel is Constants.BitsPerChannelType
  switch (doc.bitsPerChannel) {
    case constants.BitsPerChannelType.ONE:
      return 1;
    case constants.BitsPerChannelType.EIGHT:
      return 8;
    case constants.BitsPerChannelType.SIXTEEN:
      return 16;
    case constants.BitsPerChannelType.THIRTYTWO:
      return 32;
    default:
      return 0;
  }
}

function getColorSpaceOrThrow(doc) {
  switch (doc.mode) {
    case constants.DocumentMode.RGB:
      return "RGB";
    case constants.DocumentMode.GRAYSCALE:
      return "Grayscale";
    case constants.DocumentMode.LAB:
      return "LAB";
    default:
      throw new Error(
        "Unsupported document mode. Supported: RGB, Grayscale, Lab."
      );
  }
}

function isPixelLayer(layer) {
  // Simplified rule per your decision: only allow NORMAL pixel layers.
  // (Background layers may behave differently; keeping it strict avoids surprises.)
  return layer && layer.kind === constants.LayerKind.NORMAL;
}

function compileChunkProcessor({ colorSpace, hasAlpha, script }) {
  // Build a function that processes y in [yStart, yEnd), mutating buf in place.
  // Channel variables are normalized floats in [0..1].
  const channels = (() => {
    if (colorSpace === "RGB") return { names: ["r", "g", "b"], count: 3 };
    if (colorSpace === "Grayscale") return { names: ["g"], count: 1 };
    if (colorSpace === "LAB") return { names: ["l", "a", "b"], count: 3 };
    throw new Error("Unsupported colorSpace for compiler.");
  })();

  const alphaRead = hasAlpha
    ? "alpha = buf[idx + ALPHA_OFFSET] / denom;"
    : "alpha = 1;";
  const alphaWrite = hasAlpha
    ? "buf[idx + ALPHA_OFFSET] = Math.round(alpha * denom);"
    : "";

  const readChannels = channels.names
    .map((n, i) => `let ${n} = buf[idx + ${i}] / denom;`)
    .join("\n");

  const writeChannels = channels.names
    .map(
      (n, i) => `
      if (${n} < 0) ${n} = 0; else if (${n} > 1) ${n} = 1;
      buf[idx + ${i}] = Math.round(${n} * denom);
    `
    )
    .join("\n");

  const clampAlpha = `
    if (alpha < 0) alpha = 0; else if (alpha > 1) alpha = 1;
  `;

  // If we have alpha, its offset is channels.count
  const alphaOffsetLine = hasAlpha
    ? `const ALPHA_OFFSET = ${channels.count};`
    : "";

  const componentCount = channels.count + (hasAlpha ? 1 : 0);

  const body = `
    "use strict";
    const denom = steps - 1;
    ${alphaOffsetLine}

    for (let y = yStart; y < yEnd; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * ${componentCount};

        ${readChannels}
        let alpha;
        ${alphaRead}

        // user script (per-pixel):
        ${script || ""}

        ${writeChannels}
        ${clampAlpha}
        ${alphaWrite}
      }
    }
  `;

  // Parameters: buf, w, h, yStart, yEnd, bpc, steps
  return new Function("buf", "w", "h", "yStart", "yEnd", "bpc", "steps", body);
}

async function applyFilter({ createNewLayer, script }) {
  const doc = getDocOrThrow();

  const bpc = getBpcNumber(doc);
  if (bpc !== 8 && bpc !== 16) {
    throw new Error("Unsupported bit depth. Supported: 8bpc and 16bpc.");
  }
  const steps = bpc === 8 ? 256 : 65536;

  const colorSpace = getColorSpaceOrThrow(doc);

  // Compile once (syntax errors should show immediately)
  // Note: hasAlpha is determined after getPixels; we recompile if needed inside modal.

  await core.executeAsModal(
    async (executionContext) => {
      const hostControl = executionContext.hostControl;
      const suspensionID = await hostControl.suspendHistory({
        documentID: doc.id,
        name: "Filter Script",
      });

      try {
        // ---- establish target layer (selected or new/duplicate) ----
        const selected = doc.activeLayers || [];
        let targetLayer = null;

        if (createNewLayer) {
          executionContext.reportProgress({
            value: 0,
            commandName: "Preparing layer...",
          });

          if (selected.length === 1) {
            const sourceLayer = selected[0];
            if (!isPixelLayer(sourceLayer)) {
              throw new Error(
                "Selected layer must be a pixel layer (normal) to duplicate."
              );
            }
            targetLayer = await sourceLayer.duplicate();
            targetLayer.name = "Filter Script Layer";
            doc.activeLayers = [targetLayer];
          } else if (selected.length === 0) {
            targetLayer = await doc.createPixelLayer({
              name: "Filter Script Layer",
            });
            doc.activeLayers = [targetLayer];
          } else {
            throw new Error(
              "Multiple layers selected. Please select a single pixel layer."
            );
          }
        } else {
          if (selected.length === 0) {
            throw new Error(
              "No layer selected. Enable “Create New Layer” or select a single pixel layer."
            );
          }
          if (selected.length > 1) {
            throw new Error(
              "Multiple layers selected. Please select a single pixel layer."
            );
          }
          targetLayer = selected[0];
          if (!isPixelLayer(targetLayer)) {
            throw new Error("Selected layer must be a pixel layer (normal).");
          }
        }

        // ---- pixel I/O ----
        const w = Number(doc.width);
        const h = Number(doc.height);

        executionContext.reportProgress({
          value: 0,
          commandName: "Reading pixels...",
        });

        const imageObj = await imaging.getPixels({
          documentID: doc.id,
          layerID: targetLayer.id,
          sourceBounds: { left: 0, top: 0, right: w, bottom: h },
        });

        const imageData = imageObj.imageData;
        const trimmed = imageObj.sourceBounds; // may be smaller than requested
        const hasAlpha = !!imageData.hasAlpha;

        // Ensure we process in "full range" for 16bpc so steps=65536 matches the buffer.
        const srcBuf = await imageData.getData({ fullRange: bpc === 16 });

        // Create a full-document buffer (missing areas treated as 0 / transparent)
        const components = imageData.components; // includes alpha if present
        const fullLen = w * h * components;

        const fullBuf =
          bpc === 16 ? new Uint16Array(fullLen) : new Uint8Array(fullLen);

        // Copy trimmed region into the full buffer at the correct offset
        const srcW = Math.max(0, (trimmed.right - trimmed.left) | 0);
        const srcH = Math.max(0, (trimmed.bottom - trimmed.top) | 0);

        if (srcW > 0 && srcH > 0) {
          for (let row = 0; row < srcH; row++) {
            const srcRowStart = row * srcW * components;
            const dstRowStart =
              ((trimmed.top + row) * w + trimmed.left) * components;
            fullBuf.set(
              srcBuf.subarray(srcRowStart, srcRowStart + srcW * components),
              dstRowStart
            );
          }
        }

        // Compile a chunk processor now that we know hasAlpha.
        const processChunk = compileChunkProcessor({
          colorSpace,
          hasAlpha,
          script,
        });

        // ---- process pixels with progress ----
        const totalPixels = w * h;
        const CHUNK_ROWS = 32;

        executionContext.reportProgress({
          value: 0,
          commandName: `Processing 0 / ${totalPixels}`,
        });

        for (let yStart = 0; yStart < h; yStart += CHUNK_ROWS) {
          if (executionContext.isCancelled) throw new Error("Cancelled.");

          const yEnd = Math.min(h, yStart + CHUNK_ROWS);

          processChunk(fullBuf, w, h, yStart, yEnd, bpc, steps);

          const donePixels = yEnd * w;
          const value = donePixels / totalPixels;

          executionContext.reportProgress({
            value,
            commandName: `Processing ${donePixels} / ${totalPixels}`,
          });

          // yield so cancellation/progress UI has a chance to breathe
          await new Promise((r) => setTimeout(r, 0));
        }

        // ---- write back ----
        executionContext.reportProgress({
          value: 1,
          commandName: "Writing pixels...",
        });

        const outImageData = await imaging.createImageDataFromBuffer(fullBuf, {
          width: w,
          height: h,
          components,
          chunky: true,
          colorSpace,
          pixelFormat: imageData.pixelFormat,
          fullRange: bpc === 16,
        });

        await imaging.putPixels({
          documentID: doc.id,
          layerID: targetLayer.id,
          imageData: outImageData,
          targetBounds: { left: 0, top: 0 },
          replace: true,
        });

        imageData.dispose();
        outImageData.dispose();
      } finally {
        await hostControl.resumeHistory(suspensionID);
      }
    },
    { commandName: "Filter Script" }
  );
}

module.exports = {
  withBusyButton,
  applyFilter,
};
