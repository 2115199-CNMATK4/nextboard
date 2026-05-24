export interface Viewport {
  scale: number;
  x: number;
  y: number;
}

export const DEFAULT_VIEWPORT: Viewport = { scale: 1, x: 0, y: 0 };
export const MIN_SCALE = 0.1;
export const MAX_SCALE = 4;

/** Screen px → canvas coordinate (inverse of stage transform). */
export function screenToCanvas(
  sx: number,
  sy: number,
  vp: Viewport
): { x: number; y: number } {
  return { x: (sx - vp.x) / vp.scale, y: (sy - vp.y) / vp.scale };
}

/** Canvas coordinate → screen px. */
export function canvasToScreen(
  cx: number,
  cy: number,
  vp: Viewport
): { x: number; y: number } {
  return { x: cx * vp.scale + vp.x, y: cy * vp.scale + vp.y };
}

/**
 * Compute new viewport when zooming toward a focal point (screen px).
 * Keeps the canvas point under the focal screen position fixed.
 */
export function zoomViewport(
  current: Viewport,
  newScale: number,
  focalScreenX: number,
  focalScreenY: number
): Viewport {
  const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
  const ratio = clamped / current.scale;
  return {
    scale: clamped,
    x: focalScreenX - (focalScreenX - current.x) * ratio,
    y: focalScreenY - (focalScreenY - current.y) * ratio,
  };
}
