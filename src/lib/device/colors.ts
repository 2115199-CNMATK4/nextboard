// =====================================================================
// Bảng màu đại diện cho device profile.
// Chọn các màu cách xa nhau trên hue để dễ phân biệt presence cursor.
// =====================================================================

export const DEVICE_COLOR_PALETTE = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#84cc16", // lime
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f43f5e", // rose
  "#14b8a6", // teal
];

export function pickRandomDeviceColor(): string {
  const i = Math.floor(Math.random() * DEVICE_COLOR_PALETTE.length);
  return DEVICE_COLOR_PALETTE[i];
}

// Cho phép pick deterministic theo seed (vd: device.id) để màu ổn định
// dù không lưu cũng tái tạo được — dùng làm fallback nếu color null.
export function deterministicDeviceColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % DEVICE_COLOR_PALETTE.length;
  return DEVICE_COLOR_PALETTE[idx];
}
