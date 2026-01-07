// Best-effort extraction of source dimensions for computing “default” Motion anchor point.
// If we fail to parse, we throw with a helpful message.

const { Metadata } = require("premierepro");

function parseWxH(text) {
  // Common patterns: "1920 x 1080", "1920x1080"
  const m = text.match(/(\d{2,6})\s*[x×]\s*(\d{2,6})/i);
  if (!m) return null;
  const w = Number(m[1]);
  const h = Number(m[2]);
  if (!Number.isFinite(w) || !Number.isFinite(h)) return null;
  return { width: w, height: h };
}

function parseXmpDims(xmp) {
  // Common XMP fields (best-effort)
  const w = xmp.match(/(?:tiff:ImageWidth|exif:PixelXDimension|xmpDM:videoFrameSize[^>]*w=)"?(\d{2,6})"?/i);
  const h = xmp.match(/(?:tiff:ImageLength|exif:PixelYDimension|xmpDM:videoFrameSize[^>]*h=)"?(\d{2,6})"?/i);

  const width = w ? Number(w[1]) : NaN;
  const height = h ? Number(h[1]) : NaN;

  if (Number.isFinite(width) && Number.isFinite(height)) return { width, height };
  return null;
}

async function getProjectItemDimensions(projectItem) {
  // 1) Project columns metadata (often includes “Video Info”)
  try {
    const cols = Metadata.getProjectColumnsMetadata(projectItem);
    const dims = cols && parseWxH(cols);
    if (dims) return dims;
  } catch {
    // ignore
  }

  // 2) XMP metadata
  try {
    const xmp = Metadata.getXMPMetadata(projectItem);
    const dims = xmp && (parseXmpDims(xmp) || parseWxH(xmp));
    if (dims) return dims;
  } catch {
    // ignore
  }

  throw new Error(
    "Unable to determine source dimensions for this clip (needed to compute default Motion Anchor Point). " +
    "Try a normal media clip (not generated) or ensure metadata is available."
  );
}

module.exports = { getProjectItemDimensions };
