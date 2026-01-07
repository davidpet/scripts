// 2D affine matrix represented as { a, b, c, d, tx, ty } matching:
// [ a  b  tx ]
// [ c  d  ty ]
// [ 0  0  1  ]

function mul(m2, m1) {
  return {
    a: m2.a * m1.a + m2.b * m1.c,
    b: m2.a * m1.b + m2.b * m1.d,
    c: m2.c * m1.a + m2.d * m1.c,
    d: m2.c * m1.b + m2.d * m1.d,
    tx: m2.a * m1.tx + m2.b * m1.ty + m2.tx,
    ty: m2.c * m1.tx + m2.d * m1.ty + m2.ty
  };
}

function fromTransform({ position, anchor, scaleX, scaleY, rotationDeg }) {
  const rad = (rotationDeg * Math.PI) / 180.0;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // R * S where S is diagonal (scaleX, scaleY)
  const a = cos * scaleX;
  const b = -sin * scaleY;
  const c = sin * scaleX;
  const d = cos * scaleY;

  // translation = position - (R*S)*anchor
  const tx = position.x - (a * anchor.x + b * anchor.y);
  const ty = position.y - (c * anchor.x + d * anchor.y);

  return { a, b, c, d, tx, ty };
}

// Decompose to (position, scaleX, scaleY, rotationDeg) assuming no shear.
// Anchor will be set to (0,0) by caller.
function decomposeNoShear(m, shearTolerance = 1e-6) {
  const scaleX = Math.hypot(m.a, m.c);
  const scaleY = Math.hypot(m.b, m.d);

  if (scaleX === 0 || scaleY === 0) {
    throw new Error("Cannot decompose: zero scale encountered.");
  }

  // Shear test: columns should be orthogonal if it's pure rotation+scale.
  const dot = m.a * m.b + m.c * m.d;
  const denom = scaleX * scaleY;
  const shear = Math.abs(dot) / denom;

  if (shear > shearTolerance) {
    throw new Error(
      `Cannot collapse exactly: transform chain introduces shear (shear=${shear}). ` +
      `Try uniform scales (or zero rotations) before collapsing.`
    );
  }

  const rotationRad = Math.atan2(m.c, m.a);
  const rotationDeg = (rotationRad * 180.0) / Math.PI;

  return {
    position: { x: m.tx, y: m.ty },
    scaleX,
    scaleY,
    rotationDeg
  };
}

module.exports = { mul, fromTransform, decomposeNoShear };
