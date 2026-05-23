// =====================================================================
// Detect tên + loại device từ navigator.userAgent (client-side).
// Đủ tốt cho mục đích hiển thị presence panel; không phục vụ analytics.
// =====================================================================

export interface DetectedDevice {
  name: string;
  type: "desktop" | "mobile" | "tablet" | "unknown";
}

export function detectDevice(): DetectedDevice {
  if (typeof navigator === "undefined") {
    return { name: "Unknown", type: "unknown" };
  }
  const ua = navigator.userAgent || "";

  let type: DetectedDevice["type"] = "desktop";
  if (/tablet|ipad/i.test(ua)) type = "tablet";
  else if (/mobile|iphone|android/i.test(ua) && !/ipad/i.test(ua)) type = "mobile";

  let browser = "Browser";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/opr\//i.test(ua)) browser = "Opera";
  else if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) browser = "Chrome";
  else if (/firefox\//i.test(ua)) browser = "Firefox";
  else if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) browser = "Safari";

  let os = "OS";
  if (/windows nt/i.test(ua)) os = "Windows";
  else if (/mac os x/i.test(ua)) os = "macOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/linux/i.test(ua)) os = "Linux";

  return { name: `${browser} • ${os}`, type };
}
