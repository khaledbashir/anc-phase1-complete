"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import ControlsHUD, { type ViewMode } from "./ControlsHUD";

// ─── View camera positions ──────────────────────────────────────────────────
const VIEWS: Record<string, { pos: [number, number, number]; target: [number, number, number] }> = {
  all:        { pos: [22, 16, 28], target: [0, 6, 0] },
  scoreboard: { pos: [0, 12, 18],  target: [0, 14, 0] },
  ribbon:     { pos: [20, 12, 20], target: [0, 8, 0] },
  courtside:  { pos: [8, 3, 16],   target: [0, 0.6, 0] },
};

// ─── Canvas text texture ────────────────────────────────────────────────────
function makeTextTexture(text: string, w = 1024, h = 512): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  // Grid
  ctx.strokeStyle = "#0a0a1a";
  ctx.lineWidth = 0.5;
  for (let x = 0; x < w; x += 8) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += 8) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 72px sans-serif";
  ctx.fillStyle = "#0A52EF";
  ctx.fillText(text || "ANC PARTNER", w / 2, h / 2 - 30);
  ctx.font = "28px sans-serif";
  ctx.fillStyle = "#03B8FF";
  ctx.fillText("PREMIUM LED DISPLAY", w / 2, h / 2 + 40);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function makeLogoTexture(img: HTMLImageElement, multiply: boolean, w = 1024, h = 512): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  if (multiply) ctx.globalCompositeOperation = "screen";
  const scale = Math.min((w * 0.8) / img.width, (h * 0.8) / img.height);
  const dw = img.width * scale, dh = img.height * scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  ctx.globalCompositeOperation = "source-over";
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

// ─── Build the 3D scene ─────────────────────────────────────────────────────
function buildScene() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x050510, 20, 120);

  // Lights
  scene.add(new THREE.AmbientLight(0x1a1a3a, 0.15));
  const spot1 = new THREE.SpotLight(0x4488ff, 80, 0, 0.6, 0.8);
  spot1.position.set(0, 30, 0); spot1.castShadow = true; scene.add(spot1);
  const spot2 = new THREE.SpotLight(0x0A52EF, 60, 0, 0.5, 0.7);
  spot2.position.set(20, 25, -15); scene.add(spot2);
  const spot3 = new THREE.SpotLight(0x03B8FF, 40, 0, 0.4, 0.9);
  spot3.position.set(-20, 20, 15); scene.add(spot3);
  const p1 = new THREE.PointLight(0x0A52EF, 8, 60);
  p1.position.set(30, 5, 0); scene.add(p1);
  const p2 = new THREE.PointLight(0x03B8FF, 8, 60);
  p2.position.set(-30, 5, 0); scene.add(p2);

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x050510, metalness: 0.5, roughness: 0.8 })
  );
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  // Stadium bowl (lathe)
  const pts = [
    new THREE.Vector2(18, 0), new THREE.Vector2(20, 1), new THREE.Vector2(25, 4),
    new THREE.Vector2(28, 7), new THREE.Vector2(32, 11), new THREE.Vector2(35, 16),
    new THREE.Vector2(36, 18), new THREE.Vector2(35, 18.5),
  ];
  const bowlGeo = new THREE.LatheGeometry(pts, 64);
  bowlGeo.scale(1, 1, 0.7);
  const bowl = new THREE.Mesh(bowlGeo, new THREE.MeshStandardMaterial({ color: 0x0a0a1a, roughness: 0.95, side: THREE.BackSide }));
  scene.add(bowl);

  // Playing field
  const field = new THREE.Mesh(
    new THREE.CircleGeometry(14, 64),
    new THREE.MeshStandardMaterial({ color: 0x1a2f1a, roughness: 0.9 })
  );
  field.rotation.x = -Math.PI / 2; field.position.y = 0.01; scene.add(field);

  // Stars
  const starGeo = new THREE.BufferGeometry();
  const starVerts = new Float32Array(3000);
  for (let i = 0; i < 3000; i++) starVerts[i] = (Math.random() - 0.5) * 160;
  starGeo.setAttribute("position", new THREE.BufferAttribute(starVerts, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.3, transparent: true, opacity: 0.5 }));
  stars.position.y = 40;
  scene.add(stars);

  return { scene, spot1, spot2 };
}

// ─── Build LED screen meshes ────────────────────────────────────────────────
function buildScreens(scene: THREE.Scene, texture: THREE.Texture) {
  const mat = () => new THREE.MeshStandardMaterial({
    map: texture, emissiveMap: texture,
    emissive: new THREE.Color("#ffffff"), emissiveIntensity: 3, toneMapped: false,
  });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.7, roughness: 0.4 });
  const screens: THREE.Mesh[] = [];

  // ── Scoreboard ──
  const sbGroup = new THREE.Group(); sbGroup.position.set(0, 14, 0);
  // Housing
  const housing = new THREE.Mesh(new THREE.BoxGeometry(8, 4.5, 5), frameMat);
  sbGroup.add(housing);
  // Cables
  [[-3, 0, -2], [3, 0, -2], [-3, 0, 2], [3, 0, 2]].forEach(p => {
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 10, 6), new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.3 }));
    cable.position.set(p[0], 5, p[2]); sbGroup.add(cable);
  });
  // Front/back faces
  [1, -1].forEach(dir => {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 4.1), mat());
    face.position.set(0, 0, dir * 2.51);
    if (dir === -1) face.rotation.y = Math.PI;
    sbGroup.add(face); screens.push(face);
  });
  // Left/right faces
  [1, -1].forEach(dir => {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.1), mat());
    face.position.set(dir * 4.01, 0, 0);
    face.rotation.y = dir * Math.PI / 2;
    sbGroup.add(face); screens.push(face);
  });
  // Bottom
  const btm = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 4.6), mat());
  btm.position.set(0, -2.26, 0); btm.rotation.x = Math.PI / 2;
  sbGroup.add(btm); screens.push(btm);
  scene.add(sbGroup);

  // ── Ribbon (cylinder ring, inside face) ──
  const ribGeo = new THREE.CylinderGeometry(25.5, 25.5, 1.2, 64, 1, true);
  const ribTex = texture.clone();
  ribTex.wrapS = THREE.RepeatWrapping; ribTex.repeat.set(4, 1); ribTex.needsUpdate = true;
  const ribMat = new THREE.MeshStandardMaterial({
    map: ribTex, emissiveMap: ribTex,
    emissive: new THREE.Color("#ffffff"), emissiveIntensity: 3, toneMapped: false, side: THREE.BackSide,
  });
  const ribbon = new THREE.Mesh(ribGeo, ribMat);
  ribbon.position.set(0, 8, 0); scene.add(ribbon); screens.push(ribbon);
  // Ring frames
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.6, roughness: 0.5 });
  [0, 1.6].forEach(y => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(26, y === 0 ? 0.5 : 0.3, 8, 64), ringMat);
    ring.position.y = 8 + y; scene.add(ring);
  });

  // ── Courtside boards ──
  const csConfigs = [
    { pos: [0, 0.6, -12], rot: 0, w: 16 },
    { pos: [0, 0.6, 12], rot: Math.PI, w: 16 },
    { pos: [-14, 0.6, 0], rot: Math.PI / 2, w: 10 },
    { pos: [14, 0.6, 0], rot: -Math.PI / 2, w: 10 },
  ];
  csConfigs.forEach(cfg => {
    const g = new THREE.Group();
    g.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
    g.rotation.y = cfg.rot;
    // Frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(cfg.w + 0.3, 1.2, 0.15), frameMat);
    frame.position.z = -0.08; g.add(frame);
    // LED face
    const face = new THREE.Mesh(new THREE.PlaneGeometry(cfg.w, 1), mat());
    face.position.z = 0.01; g.add(face); screens.push(face);
    // Legs
    [-cfg.w / 2 + 0.5, cfg.w / 2 - 0.5].forEach(x => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.2), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
      leg.position.set(x, -0.4, -0.15); g.add(leg);
    });
    scene.add(g);
  });

  return screens;
}

// ─── Loading overlay ────────────────────────────────────────────────────────
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

// ─── Main component ─────────────────────────────────────────────────────────
export default function VenueCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const screensRef = useRef<THREE.Mesh[]>([]);
  const animIdRef = useRef<number>(0);

  const [activeView, setActiveView] = useState<ViewMode>("all");
  const [brightness, setBrightness] = useState(1.0);
  const [multiplyBlend, setMultiplyBlend] = useState(false);
  const [clientName, setClientName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Camera lerp targets
  const camTarget = useRef({ pos: new THREE.Vector3(22, 16, 28), look: new THREE.Vector3(0, 6, 0) });
  const camCurrent = useRef({ pos: new THREE.Vector3(22, 16, 28), look: new THREE.Vector3(0, 6, 0) });

  // Initialize Three.js scene once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 200);
    camera.position.set(22, 16, 28);
    cameraRef.current = camera;

    // Scene
    const { scene } = buildScene();
    sceneRef.current = scene;

    // Initial screens with placeholder text
    const tex = makeTextTexture("");
    const screens = buildScreens(scene, tex);
    screensRef.current = screens;

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = 8;
    controls.maxDistance = 60;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.3;
    controlsRef.current = controls;

    // Animation loop
    const clock = new THREE.Clock();
    function animate() {
      animIdRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Smooth camera lerp
      camCurrent.current.pos.lerp(camTarget.current.pos, Math.min(1.5 * delta, 1));
      camCurrent.current.look.lerp(camTarget.current.look, Math.min(1.5 * delta, 1));
      camera.position.copy(camCurrent.current.pos);
      controls.target.copy(camCurrent.current.look);
      controls.update();

      renderer.render(scene, camera);
    }
    animate();
    setIsReady(true);

    // Resize handler
    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animIdRef.current);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  // Update camera view
  useEffect(() => {
    const view = VIEWS[activeView] || VIEWS.all;
    camTarget.current.pos.set(...view.pos);
    camTarget.current.look.set(...view.target);
    if (controlsRef.current) {
      controlsRef.current.autoRotate = activeView === "all";
    }
  }, [activeView]);

  // Update textures when logo/name/brightness/blend changes
  useEffect(() => {
    const updateScreenTextures = (tex: THREE.Texture) => {
      screensRef.current.forEach(mesh => {
        const m = mesh.material as THREE.MeshStandardMaterial;
        m.map = tex;
        m.emissiveMap = tex;
        m.emissiveIntensity = brightness * 3;
        m.needsUpdate = true;
      });
    };

    if (logoFile) {
      const url = URL.createObjectURL(logoFile);
      setLogoPreviewUrl(url);
      const img = new Image();
      img.onload = () => {
        const tex = makeLogoTexture(img, multiplyBlend);
        updateScreenTextures(tex);
        // Also make ribbon version
        const ribTex = makeLogoTexture(img, multiplyBlend, 2048, 256);
        ribTex.wrapS = THREE.RepeatWrapping; ribTex.repeat.set(4, 1); ribTex.needsUpdate = true;
        // Find ribbon mesh (the cylinder) and update it
        screensRef.current.forEach(mesh => {
          if (mesh.geometry instanceof THREE.CylinderGeometry) {
            const m = mesh.material as THREE.MeshStandardMaterial;
            m.map = ribTex;
            m.emissiveMap = ribTex;
            m.needsUpdate = true;
          }
        });
      };
      img.src = url;
      return () => URL.revokeObjectURL(url);
    } else {
      setLogoPreviewUrl(null);
      const tex = makeTextTexture(clientName);
      updateScreenTextures(tex);
    }
  }, [logoFile, clientName, brightness, multiplyBlend]);

  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden">
      {!isReady && <LoadingOverlay />}

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

      <div ref={containerRef} className="absolute inset-0 pl-[320px]" />

      <div className="absolute bottom-4 right-4 z-10 text-[10px] text-slate-600">
        ANC Sponsor Visualizer
      </div>
    </div>
  );
}
