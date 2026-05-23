// localStorage key cho device_profile_id, namespace theo user để switching
// account không nhặt nhầm device profile cũ.

const KEY_PREFIX = "nextboard.device.id.v1.";

export function getStoredDeviceId(userId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY_PREFIX + userId);
  } catch {
    return null;
  }
}

export function setStoredDeviceId(userId: string, deviceId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY_PREFIX + userId, deviceId);
  } catch {
    /* no-op */
  }
}

export function clearStoredDeviceId(userId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY_PREFIX + userId);
  } catch {
    /* no-op */
  }
}
