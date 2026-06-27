const { entrypoints } = require("uxp");
const { initUI } = require("/js/ui");

entrypoints.setup({
  panels: {
    extractmotionpanel: {
      show() {
        initUI();
      }
    }
  }
});
