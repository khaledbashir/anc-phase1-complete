"use client";

import { useState, useCallback } from "react";

export interface SponsorLogo {
  id: string;
  name: string;
  dataUrl: string;
  assignedZone: string | null;
}

export interface SponsorLogosState {
  logos: SponsorLogo[];
  addLogo: (file: File) => void;
  removeLogo: (id: string) => void;
  assignToZone: (logoId: string, zoneId: string) => void;
  unassignFromZone: (zoneId: string) => void;
  getLogoForZone: (zoneId: string) => SponsorLogo | undefined;
}

export function useSponsorLogos(): SponsorLogosState {
  const [logos, setLogos] = useState<SponsorLogo[]>([]);

  const addLogo = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLogos((prev) => [
        ...prev,
        {
          id: `logo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name.replace(/\.[^.]+$/, ""),
          dataUrl,
          assignedZone: null,
        },
      ]);
    };
    reader.readAsDataURL(file);
  }, []);

  const removeLogo = useCallback((id: string) => {
    setLogos((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const assignToZone = useCallback((logoId: string, zoneId: string) => {
    setLogos((prev) =>
      prev.map((l) => {
        // Unassign any logo already on this zone
        if (l.assignedZone === zoneId && l.id !== logoId) {
          return { ...l, assignedZone: null };
        }
        // Assign the selected logo
        if (l.id === logoId) {
          return { ...l, assignedZone: zoneId };
        }
        return l;
      })
    );
  }, []);

  const unassignFromZone = useCallback((zoneId: string) => {
    setLogos((prev) =>
      prev.map((l) => (l.assignedZone === zoneId ? { ...l, assignedZone: null } : l))
    );
  }, []);

  const getLogoForZone = useCallback(
    (zoneId: string) => logos.find((l) => l.assignedZone === zoneId),
    [logos]
  );

  return { logos, addLogo, removeLogo, assignToZone, unassignFromZone, getLogoForZone };
}
