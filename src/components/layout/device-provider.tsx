"use client";

import { createContext, useContext } from "react";
import { useDeviceProfile } from "@/hooks/use-device-profile";
import type { DeviceProfile, Profile } from "@/types/database";

interface DeviceContextValue {
  profile: Profile;
  device: DeviceProfile | null;
}

const Ctx = createContext<DeviceContextValue | null>(null);

export function DeviceProvider({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const device = useDeviceProfile(profile.id);
  return (
    <Ctx.Provider value={{ profile, device }}>{children}</Ctx.Provider>
  );
}

export function useDevice(): DeviceContextValue {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error("useDevice() phải được dùng bên trong <DeviceProvider>.");
  return ctx;
}
