function formatNumberFull(n) {
  if (!Number.isFinite(n)) return String(n);
  return n.toString();
}

function formatValueFull(v) {
  if (typeof v === "number") return formatNumberFull(v);
  if (typeof v === "string") return v;
  if (typeof v === "boolean") return v ? "true" : "false";
  if (v == null) return String(v);
  if (Array.isArray(v)) return `[${v.map(formatValueFull).join(", ")}]`;
  if (typeof v === "object") {
    const keys = Object.keys(v).sort();
    return `{ ${keys.map((k) => `${k}: ${formatValueFull(v[k])}`).join(", ")} }`;
  }
  return String(v);
}

module.exports = { formatNumberFull, formatValueFull };
