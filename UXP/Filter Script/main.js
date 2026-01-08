const { withBusyButton, applyFilter } = require("./lib/utils");

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

async function apply() {
  const dataEl = document.getElementById("data");

  try {
    const createNewLayer = document.getElementById("createLayer").checked;
    const info = await applyFilter({
      createNewLayer,
      newLayerName: "Filter Script Layer",
    });

    dataEl.textContent =
      `Document Size: ${info.documentSize}\n` +
      `Color Mode: ${info.colorMode}\n` +
      `Bit Depth: ${info.bitDepth}\n` +
      `Layer Name: ${info.layerName}\n` +
      `Layer Type: ${info.layerType}`;
  } catch (e) {
    let msg = (e && e.message) ? e.message : String(e);
    msg = msg.replace(/^Error:\s*/i, "");
    dataEl.textContent = `Error: ${msg}`;
  }
}

const actionBtn = document.getElementById("action");
actionBtn.addEventListener(
  "click",
  withBusyButton(actionBtn, apply, { loadingLabel: "Applying..." })
);
