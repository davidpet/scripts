const { constants, core, app } = require("photoshop");

function humanizeCamelCase(str) {
  return String(str)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

function enumKeyFromValue(enumObj, value) {
  for (const [k, v] of Object.entries(enumObj)) {
    if (v === value) return k;
  }
  return null;
}

function documentModeToLabel(mode) {
  // PS can return string-ish values like "RGBCOLORMODE"
  if (typeof mode === "string") {
    // Normalize: remove separators, uppercase
    let s = mode.trim().toUpperCase().replace(/[\s_-]/g, "");

    // Common suffixes
    s = s.replace(/COLORMODE$/, "").replace(/MODE$/, "");

    const prettyByKey = {
      BITMAP: "Bitmap",
      GRAYSCALE: "Grayscale",
      INDEXED: "Indexed Color",
      INDEXEDCOLOR: "Indexed Color",
      MULTICHANNEL: "Multichannel",
      DUOTONE: "Duotone",
      LAB: "Lab",
      RGB: "RGB",
      CMYK: "CMYK",
    };

    if (prettyByKey[s]) return prettyByKey[s];

    // If something unexpected shows up, fall back to the normalized string
    return s;
  }

  // Enum-backed / numeric cases
  const { constants } = require("photoshop");
  const key = enumKeyFromValue(constants.DocumentMode, mode);
  if (!key) return String(mode);

  const pretty = {
    BITMAP: "Bitmap",
    GRAYSCALE: "Grayscale",
    INDEXEDCOLOR: "Indexed Color",
    MULTICHANNEL: "Multichannel",
    DUOTONE: "Duotone",
    LAB: "Lab",
    RGB: "RGB",
    CMYK: "CMYK",
  };

  return pretty[key] || key;
}

function layerKindToLabel(kind, amLayerKindIndex) {
  // If Action Manager tells us it's a vector shape, prefer that label.
  // Commonly, AM layerKind === 4 is a Shape layer.
  if (amLayerKindIndex === 4) {
    return "Shape Layer";
  }

  // String-ish cases (API can return "solidColor", etc.)
  if (typeof kind === "string") {
    const s = kind.trim().replace(/[\s_-]/g, "").toLowerCase();
    if (s === "solidcolor" || s === "solidfill") {
      return "Solid Color Fill";
    }
    return humanizeCamelCase(kind);
  }

  // Enum-backed / numeric cases
  const { constants } = require("photoshop");
  const key = enumKeyFromValue(constants.LayerKind, kind);
  if (!key) return String(kind);

  const pretty = {
    NORMAL: "Normal",
    TEXT: "Text",
    GROUP: "Group",
    SMARTOBJECT: "Smart Object",
    SOLIDFILL: "Solid Color Fill",
    GRADIENTFILL: "Gradient Fill",
    PATTERNFILL: "Pattern Fill",
  };

  return pretty[key] || key;
}

function bitsPerChannelToLabel(bitsPerChannel, constantsOverride) {
  const { constants } = constantsOverride
    ? { constants: constantsOverride }
    : require("photoshop");

  // Common cases: might already be a number like 8/16/32
  if (typeof bitsPerChannel === "number") {
    return `${bitsPerChannel} bpc`;
  }

  // Sometimes string-ish (defensive)
  const s = String(bitsPerChannel);

  // If it looks like "8" / "16" / "32"
  const asNum = Number(s);
  if (!Number.isNaN(asNum) && Number.isFinite(asNum)) {
    return `${asNum} bpc`;
  }

  // If it looks like "BitsPerChannelType.EIGHT"
  const dotted = s.split(".").pop();

  const prettyByKey = {
    ONE: "1 bpc",
    EIGHT: "8 bpc",
    SIXTEEN: "16 bpc",
    THIRTYTWO: "32 bpc",
  };

  if (prettyByKey[dotted]) {
    return prettyByKey[dotted];
  }

  // If it’s an enum value, recover its key from constants.BitsPerChannelType
  const key = enumKeyFromValue(constants.BitsPerChannelType, bitsPerChannel);
  if (key && prettyByKey[key]) {
    return prettyByKey[key];
  }

  return s;
}

function isAmbiguousSolidFillKind(kind) {
  if (typeof kind === "string") {
    const s = kind.trim().replace(/[\s_-]/g, "").toLowerCase();
    // handle "solidColor", "Solid Color", etc.
    return s === "solidcolor" || s === "solidfill" || s === "solidfilllayer";
  }

  const { constants } = require("photoshop");
  return kind === constants.LayerKind.SOLIDFILL;
}

async function getLayerKindIndex(layerId) {
  try {
    const { action } = require("photoshop");

    const result = await action.batchPlay(
      [
        {
          _obj: "get",
          _target: [
            { _ref: "property", _property: "layerKind" },
            { _ref: "layer", _id: layerId },
            { _ref: "document", _enum: "ordinal", _value: "targetEnum" },
          ],
          _options: { dialogOptions: "dontDisplay" },
        },
      ],
      { synchronousExecution: false, modalBehavior: "fail" }
    );

    const first = Array.isArray(result) ? result[0] : null;
    return first && typeof first.layerKind !== "undefined" ? first.layerKind : null;
  } catch (e) {
    return null;
  }
}

async function getLayerTypeLabel(layer) {
  if (!layer) return "(none selected)";

  let amLayerKindIndex = null;
  if (isAmbiguousSolidFillKind(layer.kind)) {
    amLayerKindIndex = await getLayerKindIndex(layer.id);
  }

  return layerKindToLabel(layer.kind, amLayerKindIndex);
}

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

function getActiveDocumentOrNull() {
  try {
    return app.activeDocument;
  } catch (e) {
    return null;
  }
}

function getEnumKey(enumObj, value) {
  if (!enumObj) return null;
  for (const k of Object.keys(enumObj)) {
    if (enumObj[k] === value) return k;
  }
  return null;
}

function getColorModeString(mode) {
  // Handles cases like "RGBCOLORMODE"
  if (typeof mode === "string") {
    return mode.toUpperCase().replace(/COLORMODE$/, "").replace(/COLOR$/, "");
  }
  const key =
    getEnumKey(constants.DocumentMode, mode) ||
    getEnumKey(constants.ChangeMode, mode);
  return key ? key : String(mode);
}

function getBitsPerChannelString(bitsPerChannel) {
  if (typeof bitsPerChannel === "number") return `${bitsPerChannel} bpc`;
  if (typeof bitsPerChannel === "string") {
    const s = bitsPerChannel.toUpperCase();
    
    // Handle tokens like "BITDEPTH16"
    const m = s.match(/BITDEPTH(\d+)/);
    if (m && m[1]) return `${m[1]} bpc`;


    if (s.includes("EIGHT") || s === "8") return "8 bpc";
    if (s.includes("SIXTEEN") || s === "16") return "16 bpc";
    if (s.includes("THIRTYTWO") || s === "32") return "32 bpc";
    return s;
  }

  const key = getEnumKey(constants.BitsPerChannelType, bitsPerChannel);
  if (key === "EIGHT") return "8 bpc";
  if (key === "SIXTEEN") return "16 bpc";
  if (key === "THIRTYTWO") return "32 bpc";
  return key ? key : String(bitsPerChannel);
}

function isPixelLayer(layer) {
  if (!layer) return false;
  if (layer.isBackgroundLayer) return true;
  return layer.kind === constants.LayerKind.NORMAL;
}

function getPixelLayerTypeString(layer) {
  if (layer && layer.isBackgroundLayer) return "Background Layer";
  return "Pixel Layer";
}

async function resolveTargetLayer(doc, createNewLayer, newLayerName) {
  const activeLayers = Array.from(doc.activeLayers || []);

  // Multiple selection is not supported in this simplified design
  if (activeLayers.length > 1) {
    throw new Error("Multiple layers selected. Please select exactly one layer.");
  }

  const selectedLayer = activeLayers.length === 1 ? activeLayers[0] : null;

  if (createNewLayer) {
    if (!selectedLayer) {
      // Create empty layer if nothing selected
      const newLayer = await doc.createLayer({ name: newLayerName });
      doc.activeLayers = [newLayer];
      return { targetLayer: newLayer, createdNewLayer: true };
    }

    // Selected layer must be pixel
    if (!isPixelLayer(selectedLayer)) {
      throw new Error("Selected layer is not a pixel layer.");
    }

    // Copy pixels by duplicating (does not modify original)
    const dup = await selectedLayer.duplicate();
    dup.name = newLayerName;
    doc.activeLayers = [dup];
    return { targetLayer: dup, createdNewLayer: true };
  }

  // createNewLayer == false (in-place target)
  if (!selectedLayer) {
    throw new Error('No layer selected. Enable "Create New Layer" or select a pixel layer.');
  }
  if (!isPixelLayer(selectedLayer)) {
    throw new Error("Selected layer is not a pixel layer.");
  }

  return { targetLayer: selectedLayer, createdNewLayer: false };
}

async function applyFilter({ createNewLayer, newLayerName = "Filter Script Layer" } = {}) {
  // Quick pre-check for nicer error message
  const doc = getActiveDocumentOrNull();
  if (!doc) throw new Error("No document open.");

  let result;

  await core.executeAsModal(
    async (executionContext, descriptor) => {
      const innerDoc = getActiveDocumentOrNull();
      if (!innerDoc) throw new Error("No document open.");

      const suspension = await executionContext.hostControl.suspendHistory({
        documentID: innerDoc.id,
        name: "Filter Script Apply",
      });

      try {
        const { targetLayer, createdNewLayer } = await resolveTargetLayer(
          innerDoc,
          !!descriptor.createNewLayer,
          descriptor.newLayerName
        );

        result = {
          documentSize: `${innerDoc.width} x ${innerDoc.height} px`,
          colorMode: getColorModeString(innerDoc.mode),
          bitDepth: getBitsPerChannelString(innerDoc.bitsPerChannel),
          layerName: targetLayer.name,
          layerType: getPixelLayerTypeString(targetLayer),
          createdNewLayer,
        };

        await executionContext.hostControl.resumeHistory(suspension);
      } catch (e) {
        // Roll back any partial changes made inside this suspended state
        try {
          await executionContext.hostControl.resumeHistory(suspension, false);
        } catch (_) {}
        throw e;
      }
    },
    {
      commandName: "Filter Script Apply",
      descriptor: {
        createNewLayer: !!createNewLayer,
        newLayerName,
      },
    }
  );

  return result;
}

module.exports = {
  humanizeCamelCase,
  enumKeyFromValue,
  documentModeToLabel,
  layerKindToLabel,
  bitsPerChannelToLabel,
  isAmbiguousSolidFillKind,
  getLayerKindIndex,
  getLayerTypeLabel,
  withBusyButton,
  applyFilter,
};
