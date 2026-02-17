"use client";

import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Preload } from "@react-three/drei";
import * as THREE from "three";
import ArenaScene from "./ArenaScene";
import LEDScreens from "./LEDScreens";
import CameraController from "./CameraController";
import ControlsHUD, { type ViewMode } from "./ControlsHUD";

/** Loading screen while 3D assets initialize */
function LoadingOverlay() {
  return (
    <div className="absolute inset-0 z-30 bg-slate-950 flex flex-col items-center justify-center">
      <div className="relative w-16 h-16 mb-6">
        <div className="absolute inset-0 rounded-full border-2 border-blue-500/20 animate-ping" />
        <div className="absolute inset-2 rounded-full border-2 border-t-blue-500 animate-spin" />
      </div>
      <p className="text-sm text-slate-400 font-medium">Loading Arena...</p>
      <p className="text-[10px] text-slate-600 mt-1">Initializing 3D environment</p>
    </div>
  );
}

export default function VenueCanvas() {
  const [activeView, setActiveView] = useState<ViewMode>("all");
  const [brightness, setBrightness] = useState(1.0);
  const [multiplyBlend, setMultiplyBlend] = useState(false);
  const [clientName, setClientName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoTexture, setLogoTexture] = useState<THREE.Texture | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Process uploaded logo into a Three.js texture
  useEffect(() => {
    if (!logoFile) {
      setLogoTexture(null);
      setLogoPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(logoFile);
    setLogoPreviewUrl(url);

    const loader = new THREE.TextureLoader();
    loader.load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      setLogoTexture(tex);
    });

    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  // Mark ready after first render
  useEffect(() => {
    const t = setTimeout(() => setIsReady(true), 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden">
      {!isReady && <LoadingOverlay />}

      {/* HUD Controls */}
      <ControlsHUD
        activeView={activeView}
        setActiveView={setActiveView}
        brightness={brightness}
        setBrightness={setBrightness}
        multiplyBlend={multiplyBlend}
        setMultiplyBlend={setMultiplyBlend}
        clientName={clientName}
        setClientName={setClientName}
        logoFile={logoFile}
        setLogoFile={setLogoFile}
        logoPreviewUrl={logoPreviewUrl}
      />

      {/* 3D Canvas */}
      <div className="absolute inset-0 pl-[320px]">
        <Canvas
          shadows
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.2,
          }}
          camera={{
            fov: 50,
            near: 0.1,
            far: 200,
            position: [22, 16, 28],
          }}
          onCreated={() => setIsReady(true)}
        >
          <Suspense fallback={null}>
            <CameraController activeView={activeView} />
            <ArenaScene />
            <LEDScreens
              activeView={activeView}
              logoTexture={logoTexture}
              brightness={brightness}
              multiplyBlend={multiplyBlend}
              clientName={clientName}
            />

            {/* Orbit controls for manual camera adjustment */}
            <OrbitControls
              enablePan={false}
              enableZoom={true}
              enableRotate={true}
              minDistance={8}
              maxDistance={60}
              maxPolarAngle={Math.PI / 2 - 0.05}
              autoRotate={activeView === "all"}
              autoRotateSpeed={0.3}
            />

            <Preload all />
          </Suspense>
        </Canvas>
      </div>

      {/* Watermark */}
      <div className="absolute bottom-4 right-4 z-10 text-[10px] text-slate-600">
        ANC Sponsor Visualizer &middot; Powered by Three.js
      </div>
    </div>
  );
}
