const { runExtractMotion } = require("/js/extractMotion");

let initialized = false;

function $(id) {
  return document.getElementById(id);
}

function setLog(text) {
  const el = $("log");
  el.value = text || "";
  el.scrollTop = el.scrollHeight;
}

function appendLog(line) {
  const el = $("log");
  el.value = (el.value ? el.value + "\n" : "") + line;
  el.scrollTop = el.scrollHeight;
}

function initUI() {
  if (initialized) return;
  initialized = true;

  const runBtn = $("runBtn");
  runBtn.addEventListener("click", async () => {
    setLog("");
    const addKenBurns = $("kenBurns").checked === true;

    try {
      await runExtractMotion({
        addKenBurns,
        log: appendLog
      });
    } catch (err) {
      appendLog("ERROR: " + (err?.message || String(err)));
      console.error(err);
    }
  });
}

module.exports = { initUI };
