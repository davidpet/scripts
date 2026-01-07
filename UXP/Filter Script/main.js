const { documentModeToLabel, layerKindToLabel, bitsPerChannelToLabel, isAmbiguousSolidFillKind, getLayerKindIndex, getLayerTypeLabel, withBusyButton } = require("./lib/utils");

const { entrypoints } = require("uxp");
const { app } = require("photoshop");

entrypoints.setup({
  panels: {
    vanilla: {
      show(node ) {
      }
    }
  }
});

async function showSelectionInfo() {
  const outEl = document.getElementById("data");

  let doc;
  try {
    doc = app.activeDocument;
  } catch (e) {
    outEl.textContent = "(no document open)";
    return;
  }

  if (!doc) {
    outEl.textContent = "(no document open)";
    return;
  }

  // Document.width / height are pixels per the DOM docs. :contentReference[oaicite:1]{index=1}
  const docSize = `${doc.width} x ${doc.height} px`;
  const docMode = documentModeToLabel(doc.mode); // Document.mode is DocumentMode :contentReference[oaicite:2]{index=2}
  const bitDepth = bitsPerChannelToLabel(doc.bitsPerChannel);


  // Selection is document.activeLayers. :contentReference[oaicite:3]{index=3}
  const selected = doc.activeLayers || [];

  let layerName = "(none selected)";
  let layerKind = "(none selected)";

  if (selected.length === 1) {
    const layer = selected[0];
    layerName = layer.name;
    layerKind = await getLayerTypeLabel(layer);
  } else if (selected.length > 1) {
    layerName = "(multiple selected)";
    layerKind = "(multiple selected)";
  }

  outEl.textContent =
    `Document size: ${docSize}\n` +
    `Color mode: ${docMode}\n` +
    `Bit depth: ${bitDepth}\n` +
    `Layer name: ${layerName}\n` +
    `Layer kind: ${layerKind}`;
}

const actionBtn = document.getElementById("action");
actionBtn.addEventListener(
  "click",
  withBusyButton(actionBtn, showSelectionInfo, { loadingLabel: "Loading…" })
);
