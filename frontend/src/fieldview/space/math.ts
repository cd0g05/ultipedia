// Pure math helpers for the space model. All soft thresholds in the model use
// ss() — the standard smoothstep (clamped Hermite); there are no hard cutoffs
// anywhere (brief §4.2). Everything here is scalar-in/scalar-out so the
// per-cell inner loop allocates nothing.

export function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

// ss(e0, e1, x): standard smoothstep (clamped Hermite).
export function ss(e0: number, e1: number, x: number): number {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

// Wrap an angle into (−π, π].
export function wrap(a: number): number {
  const TWO_PI = 2 * Math.PI;
  let r = a % TWO_PI;
  if (r <= -Math.PI) r += TWO_PI;
  else if (r > Math.PI) r -= TWO_PI;
  return r;
}

// Bearing of the vector from (fromX, fromY) to (toX, toY), radians.
export function bearing(fromX: number, fromY: number, toX: number, toY: number): number {
  return Math.atan2(toY - fromY, toX - fromX);
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

// Projection parameter t of point p onto the segment a→b (unclamped:
// t = 0 at a, t = 1 at b). Degenerate zero-length segments return NaN-safe 0.
export function segProjectionT(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby;
  if (len2 === 0) return 0;
  return ((px - ax) * abx + (py - ay) * aby) / len2;
}

// Distance from point p to its (unclamped) projection on the line through
// a→b — the d⊥ of the lane layer. Callers gate on segProjectionT first.
export function segPerpDistance(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const t = segProjectionT(px, py, ax, ay, bx, by);
  const qx = ax + t * (bx - ax);
  const qy = ay + t * (by - ay);
  return dist(px, py, qx, qy);
}
