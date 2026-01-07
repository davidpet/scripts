const { entrypoints } = require("uxp");

const { mountEffectDumpPanel } = require("./js/features/effectDump");

// Offstage wrappers in index.html
const effectDumpWrapper = document.querySelector("#cu-effectdump-panel");
const anchorNudgeWrapper = document.querySelector("#cu-anchornudge-panel");

let effectDumpMounted = false;

function showWrapper(panelBody, wrapperEl) {
  // Premiere multi-panel pattern: append correct wrapper on show. :contentReference[oaicite:4]{index=4}
  panelBody.innerHTML = "";
  wrapperEl.classList.remove("cu-offstage");
  panelBody.appendChild(wrapperEl);
}

entrypoints.setup({
  plugin: {
    create() {
      // no-op
    }
  },

  panels: {
    effectDumpPanel: {
      create() {
        if (!effectDumpMounted) {
          mountEffectDumpPanel(effectDumpWrapper);
          effectDumpMounted = true;
        }
      },
      show(panelBody) {
        showWrapper(panelBody, effectDumpWrapper);
      }
    },

    anchorNudgePanel: {
      create() {
        // unchanged in this patch
      },
      show(panelBody) {
        showWrapper(panelBody, anchorNudgeWrapper);
      }
    }
  },

  commands: {
  extractMotion() {
    console.log("Extract Motion invoked (implementation unchanged).");
  },
  collapseMotion() {
    console.log("Collapse Motion invoked (implementation unchanged).");
  }
}
});
