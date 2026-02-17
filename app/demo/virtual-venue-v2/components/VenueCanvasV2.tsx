"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import ArenaScene from "./ArenaScene";
import ControlsHUDV2 from "./ControlsHUDV2";
import { makeTextTexture, makeLogoTexture } from "../lib/textures";
import { VENUE_ZONES, CAMERA_PRESETS, SERVICES_MULTIPLIER, DEFAULT_MARGIN } from "../data/venueZones";

// ─── Screenshot helper (reaches into the R3F Canvas) ─────────────────────────
function ScreenshotHelper({ screenshotRef }: { screenshotRef: React.MutableRefObject<(() => string | null) | null> }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    screenshotRef.current = () => {
      gl.render(scene, camera);
      return gl.domElement.toDataURL("image/png");
    };
  }, [gl, scene, camera, screenshotRef]);
  return null;
}

// ─── Loading overlay ─────────────────────────────────────────────────────────
function LoadingOverlay() {
  return (
    <div className="absolute inset-0 z-30 bg-[#030812] flex flex-col items-center justify-center">
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-full border-2 border-[#0A52EF]/20 animate-ping" />
        <div className="absolute inset-2 rounded-full border-2 border-t-[#0A52EF] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        <div className="absolute inset-4 rounded-full border border-[#03B8FF]/30 animate-pulse" />
      </div>
      <p className="text-sm text-slate-300 font-semibold tracking-wide">Loading Arena</p>
      <p className="text-[10px] text-slate-500 mt-1.5">Initializing 3D environment · React Three Fiber</p>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function VenueCanvasV2() {
  // ── State ──
  const [activeCameraId, setActiveCameraId] = useState("overview");
  const [brightness, setBrightness] = useState(1.0);
  const [multiplyBlend, setMultiplyBlend] = useState(false);
  const [clientName, setClientName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [activeZoneIds, setActiveZoneIds] = useState<Set<string>>(() => new Set(VENUE_ZONES.map(z => z.id)));
  const [sceneMoodId, setSceneMoodId] = useState("game-night");
  const [venueTypeId, setVenueTypeId] = useState("nba");
  const [beforeAfter, setBeforeAfter] = useState(false);
  const [autoTour, setAutoTour] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);

  const screenshotRef = useRef<(() => string | null) | null>(null);
  const prevUrlRef = useRef<string | null>(null);

  // ── Zone toggle ──
  const toggleZone = useCallback((zoneId: string) => {
    setActiveZoneIds(prev => {
      const next = new Set(prev);
      if (next.has(zoneId)) next.delete(zoneId); else next.add(zoneId);
      return next;
    });
  }, []);

  const setZoneSet = useCallback((ids: string[]) => {
    setActiveZoneIds(new Set(ids));
  }, []);

  // ── Screenshot ──
  const takeScreenshot = useCallback(() => {
    if (!screenshotRef.current) return;
    const dataUrl = screenshotRef.current();
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    const name = clientName || "ANC_Arena";
    a.download = `${name.replace(/[^a-zA-Z0-9]/g, "_")}_Visualizer_V2.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }, [clientName]);

  // ── Presentation mode ──
  const enterPresentationMode = useCallback(() => {
    setPresentationMode(true);
    setAutoTour(true);
  }, []);

  const exitPresentationMode = useCallback(() => {
    setPresentationMode(false);
    setAutoTour(false);
  }, []);

  // ESC key to exit presentation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && presentationMode) {
        exitPresentationMode();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [presentationMode, exitPresentationMode]);

  // ── Texture generation ──
  useEffect(() => {
    if (prevUrlRef.current) {
      URL.revokeObjectURL(prevUrlRef.current);
      prevUrlRef.current = null;
    }

    if (logoFile) {
      const url = URL.createObjectURL(logoFile);
      prevUrlRef.current = url;
      setLogoPreviewUrl(url);
      const img = new Image();
      img.onload = () => {
        const tex = makeLogoTexture(img, multiplyBlend);
        setTexture(tex);
      };
      img.src = url;
    } else {
      setLogoPreviewUrl(null);
      const tex = makeTextTexture(clientName);
      setTexture(tex);
    }
  }, [logoFile, clientName, multiplyBlend]);

  // Generate initial texture on mount
  useEffect(() => {
    setTexture(makeTextTexture(""));
  }, []);

  // ── Pricing ──
  const activeZoneData = VENUE_ZONES.filter(z => activeZoneIds.has(z.id));
  const totalHardware = activeZoneData.reduce((s, z) => s + z.defaultWidthFt * z.defaultHeightFt * z.costPerSqFt * z.quantity, 0);
  const totalProject = totalHardware * (1 + SERVICES_MULTIPLIER);
  const totalSell = totalProject > 0 ? totalProject / (1 - DEFAULT_MARGIN) : 0;
  const totalAnnualRevenue = activeZoneData.reduce((s, z) => s + z.annualSponsorRevenue, 0);

  return (
    <div className="relative w-full h-screen bg-[#030812] overflow-hidden">
      {!isReady && <LoadingOverlay />}

      {/* ── Controls HUD (hidden in presentation mode) ── */}
      {!presentationMode && (
        <ControlsHUDV2
          activeCameraId={activeCameraId}
          setActiveCameraId={setActiveCameraId}
          brightness={brightness}
          setBrightness={setBrightness}
          multiplyBlend={multiplyBlend}
          setMultiplyBlend={setMultiplyBlend}
          clientName={clientName}
          setClientName={setClientName}
          logoFile={logoFile}
          setLogoFile={setLogoFile}
          logoPreviewUrl={logoPreviewUrl}
          activeZoneIds={activeZoneIds}
          toggleZone={toggleZone}
          setZoneSet={setZoneSet}
          totalHardware={totalHardware}
          totalSell={totalSell}
          totalAnnualRevenue={totalAnnualRevenue}
          activeZoneCount={activeZoneData.length}
          takeScreenshot={takeScreenshot}
          sceneMoodId={sceneMoodId}
          setSceneMoodId={setSceneMoodId}
          venueTypeId={venueTypeId}
          setVenueTypeId={setVenueTypeId}
          beforeAfter={beforeAfter}
          setBeforeAfter={setBeforeAfter}
          autoTour={autoTour}
          setAutoTour={setAutoTour}
          onPresentationMode={enterPresentationMode}
        />
      )}

      {/* ── 3D Canvas ── */}
      <div className={presentationMode ? "absolute inset-0" : "absolute inset-0 pl-[380px]"}>
        <Canvas
          gl={{
            antialias: true,
            preserveDrawingBuffer: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.4,
          }}
          shadows
          camera={{ fov: 50, near: 0.1, far: 200, position: [22, 16, 28] }}
          onCreated={() => setIsReady(true)}
          style={{ width: "100%", height: "100%" }}
          dpr={[1, 2]}
        >
          <ScreenshotHelper screenshotRef={screenshotRef} />
          <ArenaScene
            texture={texture}
            activeZoneIds={activeZoneIds}
            beforeAfter={beforeAfter}
            sceneMoodId={sceneMoodId}
            venueTypeId={venueTypeId}
            activeCameraId={activeCameraId}
            brightness={brightness}
            autoTour={autoTour}
            setAutoTour={setAutoTour}
            setActiveCameraId={setActiveCameraId}
            presentationMode={presentationMode}
          />
        </Canvas>
      </div>

      {/* ── Presentation Mode Overlay ── */}
      {presentationMode && (
        <>
          {/* ANC Watermark */}
          <div className="absolute top-6 right-6 z-10 opacity-[0.07] pointer-events-none select-none">
            <p className="text-3xl font-black text-white tracking-[0.3em] uppercase">ANC Sports</p>
          </div>
          {clientName && (
            <div className="absolute top-6 left-6 z-10 opacity-20 pointer-events-none select-none">
              <p className="text-xl font-bold text-white">{clientName}</p>
            </div>
          )}
          {/* Live stats */}
          <div className="absolute bottom-16 left-6 z-10 opacity-20 pointer-events-none select-none">
            <p className="text-xs text-white font-mono">
              {activeZoneData.length} zones · ${(totalSell / 1000).toFixed(0)}K · ${(totalAnnualRevenue / 1_000_000).toFixed(1)}M/yr
            </p>
          </div>
          {/* Exit button */}
          <button
            onClick={exitPresentationMode}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 text-[10px] text-slate-600 hover:text-slate-400 transition-colors px-4 py-2"
          >
            Press ESC or click to exit presentation
          </button>
        </>
      )}

      {/* ── Bottom Status Bar (hidden in presentation mode) ── */}
      {!presentationMode && (
        <div className="absolute bottom-0 left-[380px] right-0 z-10 bg-gradient-to-t from-black/80 to-transparent px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6 text-[11px] text-slate-400">
            <span><strong className="text-white">{activeZoneData.length}</strong> / {VENUE_ZONES.length} zones active</span>
            <span>Hardware: <strong className="text-blue-400">${(totalHardware / 1000).toFixed(0)}K</strong></span>
            <span>Sell: <strong className="text-emerald-400">${(totalSell / 1000).toFixed(0)}K</strong></span>
            <span>Sponsor Rev: <strong className="text-amber-400">${(totalAnnualRevenue / 1_000_000).toFixed(1)}M</strong>/yr</span>
          </div>
          <span className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">ANC Sports · Virtual Venue Visualizer V2 · R3F</span>
        </div>
      )}
    </div>
  );
}
