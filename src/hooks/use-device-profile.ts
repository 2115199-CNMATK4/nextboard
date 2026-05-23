"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getStoredDeviceId,
  setStoredDeviceId,
  clearStoredDeviceId,
} from "@/lib/device/storage";
import { detectDevice } from "@/lib/device/detect";
import { pickRandomDeviceColor } from "@/lib/device/colors";
import type { DeviceProfile } from "@/types/database";

// Tần suất ping last_seen_at (60s) — đủ để admin dashboard biết device
// nào còn online nhưng không spam DB.
const PING_INTERVAL_MS = 60_000;

async function loadOrCreateDevice(userId: string): Promise<DeviceProfile | null> {
  const supabase = createClient();
  const storedId = getStoredDeviceId(userId);

  if (storedId) {
    const { data } = await supabase
      .from("device_profiles")
      .select("*")
      .eq("id", storedId)
      .maybeSingle<DeviceProfile>();

    if (data && data.user_id === userId) {
      // touch last_seen_at — không cần await.
      void supabase
        .from("device_profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", data.id);
      return data;
    }
    // Stale (device đã bị xóa hoặc khác user) — invalidate.
    clearStoredDeviceId(userId);
  }

  const detected = detectDevice();
  const color = pickRandomDeviceColor();
  const { data, error } = await supabase
    .from("device_profiles")
    .insert({
      user_id: userId,
      device_name: detected.name,
      device_type: detected.type,
      color,
    })
    .select("*")
    .single<DeviceProfile>();

  if (error || !data) {
    console.error("[device-profile] create failed", error);
    return null;
  }
  setStoredDeviceId(userId, data.id);
  return data;
}

export function useDeviceProfile(userId: string): DeviceProfile | null {
  const [device, setDevice] = useState<DeviceProfile | null>(null);
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Init / re-init khi đổi user.
  useEffect(() => {
    let mounted = true;
    loadOrCreateDevice(userId).then((d) => {
      if (mounted) setDevice(d);
    });
    return () => {
      mounted = false;
    };
  }, [userId]);

  // Periodic ping last_seen_at + on focus.
  useEffect(() => {
    if (!device) return;
    const supabase = createClient();
    const touch = () => {
      void supabase
        .from("device_profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", device.id);
    };

    pingTimer.current = setInterval(touch, PING_INTERVAL_MS);
    const onFocus = () => touch();
    window.addEventListener("focus", onFocus);

    return () => {
      if (pingTimer.current) clearInterval(pingTimer.current);
      window.removeEventListener("focus", onFocus);
    };
  }, [device]);

  return device;
}
