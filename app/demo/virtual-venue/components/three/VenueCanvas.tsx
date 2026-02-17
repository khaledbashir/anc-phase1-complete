"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import ControlsHUD from "./ControlsHUD";
import { VENUE_ZONES, CAMERA_PRESETS, SERVICES_MULTIPLIER, DEFAULT_MARGIN } from "../../data/venueZones";
import type { VenueZone } from "../../data/venueZones";

// ─── Canvas text texture ────────────────────────────────────────────────────
function makeTextTexture(text: string, w = 1024, h = 512): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  // Dark gradient background
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#030812"); grad.addColorStop(1, "#0a1628");
  ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
  // Subtle LED pixel grid
  ctx.strokeStyle = "rgba(10,82,239,0.03)"; ctx.lineWidth = 0.5;
  for (let x = 0; x < w; x += 6) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += 6) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  // Main text
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "bold 72px 'Work Sans', sans-serif";
  ctx.fillStyle = "#0A52EF";
  ctx.shadowColor = "#0A52EF"; ctx.shadowBlur = 30;
  ctx.fillText(text || "ANC PARTNER", w / 2, h / 2 - 24);
  ctx.shadowBlur = 0;
  // Subtitle
  ctx.font = "300 24px 'Work Sans', sans-serif";
  ctx.fillStyle = "#03B8FF";
  ctx.fillText("PREMIUM LED DISPLAY", w / 2, h / 2 + 36);
  // Corner accents
  ctx.strokeStyle = "#0A52EF"; ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, 60, 2); ctx.strokeRect(20, 20, 2, 40);
  ctx.strokeRect(w - 80, h - 22, 60, 2); ctx.strokeRect(w - 22, h - 60, 2, 40);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function makeLogoTexture(img: HTMLImageElement, multiply: boolean, w = 1024, h = 512): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#030812"; ctx.fillRect(0, 0, w, h);
  if (multiply) ctx.globalCompositeOperation = "screen";
  const scale = Math.min((w * 0.75) / img.width, (h * 0.75) / img.height);
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
  scene.fog = new THREE.Fog(0x030812, 30, 130);

  // Lights — dramatic arena lighting
  scene.add(new THREE.AmbientLight(0x0a0a2a, 0.2));
  const spot1 = new THREE.SpotLight(0x4488ff, 100, 0, 0.6, 0.8);
  spot1.position.set(0, 35, 0); spot1.castShadow = true; scene.add(spot1);
  const spot2 = new THREE.SpotLight(0x0A52EF, 70, 0, 0.5, 0.7);
  spot2.position.set(20, 28, -15); scene.add(spot2);
  const spot3 = new THREE.SpotLight(0x03B8FF, 50, 0, 0.4, 0.9);
  spot3.position.set(-20, 24, 15); scene.add(spot3);
  // Rim lights for atmosphere
  [30, -30].forEach(x => {
    const p = new THREE.PointLight(0x0A52EF, 12, 70);
    p.position.set(x, 5, 0); scene.add(p);
  });
  [0, 0].forEach((_, i) => {
    const p = new THREE.PointLight(0x03B8FF, 8, 50);
    p.position.set(0, 5, i === 0 ? 30 : -30); scene.add(p);
  });

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x030812, metalness: 0.6, roughness: 0.7 })
  );
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  // Stadium bowl (lathe) — more detailed
  const pts = [
    new THREE.Vector2(17, 0), new THREE.Vector2(19, 0.8), new THREE.Vector2(22, 3),
    new THREE.Vector2(25, 5.5), new THREE.Vector2(27, 7), new THREE.Vector2(29, 9.5),
    new THREE.Vector2(31, 12), new THREE.Vector2(33, 15), new THREE.Vector2(35, 17),
    new THREE.Vector2(36, 18.5), new THREE.Vector2(35.5, 19),
  ];
  const bowlGeo = new THREE.LatheGeometry(pts, 80);
  bowlGeo.scale(1, 1, 0.7);
  const bowl = new THREE.Mesh(bowlGeo, new THREE.MeshStandardMaterial({ color: 0x080818, roughness: 0.95, side: THREE.BackSide }));
  scene.add(bowl);

  // Seating tiers (concentric rings for depth)
  [6, 10, 14].forEach((y, i) => {
    const tierGeo = new THREE.TorusGeometry(22 + i * 4, 0.8, 4, 80);
    const tier = new THREE.Mesh(tierGeo, new THREE.MeshStandardMaterial({ color: 0x0c0c20, roughness: 0.9 }));
    tier.position.y = y; scene.add(tier);
  });

  // Playing court — basketball court shape
  const court = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 9),
    new THREE.MeshStandardMaterial({ color: 0x2a1f0a, roughness: 0.85, metalness: 0.05 })
  );
  court.rotation.x = -Math.PI / 2; court.position.y = 0.02; scene.add(court);
  // Court lines
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 });
  // Center circle
  const ccGeo = new THREE.TorusGeometry(1.5, 0.02, 8, 48);
  const cc = new THREE.Mesh(ccGeo, lineMat);
  cc.rotation.x = -Math.PI / 2; cc.position.y = 0.03; scene.add(cc);
  // Half court line
  const hcl = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 9), lineMat);
  hcl.rotation.x = -Math.PI / 2; hcl.position.y = 0.03; scene.add(hcl);
  // Three point arcs (simplified as circles)
  [-6, 6].forEach(x => {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.02, 8, 32), lineMat);
    arc.rotation.x = -Math.PI / 2; arc.position.set(x, 0.03, 0); scene.add(arc);
  });

  // Atmosphere particles
  const starGeo = new THREE.BufferGeometry();
  const starVerts = new Float32Array(4500);
  for (let i = 0; i < 4500; i++) starVerts[i] = (Math.random() - 0.5) * 160;
  starGeo.setAttribute("position", new THREE.BufferAttribute(starVerts, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x3366ff, size: 0.2, transparent: true, opacity: 0.3 }));
  stars.position.y = 40; scene.add(stars);

  // Catwalk / lighting rig
  const rigMat = new THREE.MeshStandardMaterial({ color: 0x0a0a12, metalness: 0.8, roughness: 0.3 });
  const rig = new THREE.Mesh(new THREE.TorusGeometry(10, 0.15, 6, 48), rigMat);
  rig.position.y = 22; scene.add(rig);

  return { scene };
}

// ─── Build zone-grouped LED screen meshes ───────────────────────────────────
function buildZoneGroups(scene: THREE.Scene, texture: THREE.Texture): Map<string, THREE.Group> {
  const zones = new Map<string, THREE.Group>();
  const mat = () => new THREE.MeshStandardMaterial({
    map: texture, emissiveMap: texture,
    emissive: new THREE.Color("#ffffff"), emissiveIntensity: 3.5, toneMapped: false,
  });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.7, roughness: 0.4 });

  // ── Scoreboard ──
  const sbGroup = new THREE.Group(); sbGroup.name = "scoreboard";
  sbGroup.position.set(0, 14, 0);
  const housing = new THREE.Mesh(new THREE.BoxGeometry(8, 4.5, 5), frameMat);
  sbGroup.add(housing);
  [[-3, 0, -2], [3, 0, -2], [-3, 0, 2], [3, 0, 2]].forEach(p => {
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 10, 6), new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 }));
    cable.position.set(p[0], 5, p[2]); sbGroup.add(cable);
  });
  [1, -1].forEach(dir => {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 4.1), mat());
    face.position.set(0, 0, dir * 2.51);
    if (dir === -1) face.rotation.y = Math.PI;
    sbGroup.add(face);
  });
  [1, -1].forEach(dir => {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.1), mat());
    face.position.set(dir * 4.01, 0, 0); face.rotation.y = dir * Math.PI / 2;
    sbGroup.add(face);
  });
  const btm = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 4.6), mat());
  btm.position.set(0, -2.26, 0); btm.rotation.x = Math.PI / 2;
  sbGroup.add(btm);
  scene.add(sbGroup); zones.set("scoreboard", sbGroup);

  // ── Ribbon North (upper half of ring) ──
  const ribNGroup = new THREE.Group(); ribNGroup.name = "ribbon-north";
  const ribNGeo = new THREE.CylinderGeometry(25.5, 25.5, 1.2, 64, 1, true, 0, Math.PI);
  const ribTex = texture.clone();
  ribTex.wrapS = THREE.RepeatWrapping; ribTex.repeat.set(2, 1); ribTex.needsUpdate = true;
  const ribNMat = new THREE.MeshStandardMaterial({
    map: ribTex, emissiveMap: ribTex,
    emissive: new THREE.Color("#ffffff"), emissiveIntensity: 3.5, toneMapped: false, side: THREE.BackSide,
  });
  const ribN = new THREE.Mesh(ribNGeo, ribNMat);
  ribN.position.set(0, 8, 0); ribNGroup.add(ribN);
  // Frame rings
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.6, roughness: 0.5 });
  [0, 1.5].forEach(dy => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(26, dy === 0 ? 0.4 : 0.25, 8, 32, Math.PI), ringMat);
    ring.position.y = 8 + dy; ribNGroup.add(ring);
  });
  scene.add(ribNGroup); zones.set("ribbon-north", ribNGroup);

  // ── Ribbon South ──
  const ribSGroup = new THREE.Group(); ribSGroup.name = "ribbon-south";
  const ribSGeo = new THREE.CylinderGeometry(25.5, 25.5, 1.2, 64, 1, true, Math.PI, Math.PI);
  const ribTex2 = texture.clone();
  ribTex2.wrapS = THREE.RepeatWrapping; ribTex2.repeat.set(2, 1); ribTex2.needsUpdate = true;
  const ribSMat = new THREE.MeshStandardMaterial({
    map: ribTex2, emissiveMap: ribTex2,
    emissive: new THREE.Color("#ffffff"), emissiveIntensity: 3.5, toneMapped: false, side: THREE.BackSide,
  });
  const ribS = new THREE.Mesh(ribSGeo, ribSMat);
  ribS.position.set(0, 8, 0); ribSGroup.add(ribS);
  [0, 1.5].forEach(dy => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(26, dy === 0 ? 0.4 : 0.25, 8, 32, Math.PI), ringMat);
    ring.rotation.y = Math.PI; ring.position.y = 8 + dy; ribSGroup.add(ring);
  });
  scene.add(ribSGroup); zones.set("ribbon-south", ribSGroup);

  // ── Fascia (upper ring) ──
  const fasciaGroup = new THREE.Group(); fasciaGroup.name = "fascia";
  const fGeo = new THREE.CylinderGeometry(33, 33, 0.8, 80, 1, true);
  const fTex = texture.clone();
  fTex.wrapS = THREE.RepeatWrapping; fTex.repeat.set(6, 1); fTex.needsUpdate = true;
  const fMat = new THREE.MeshStandardMaterial({
    map: fTex, emissiveMap: fTex,
    emissive: new THREE.Color("#ffffff"), emissiveIntensity: 2.5, toneMapped: false, side: THREE.BackSide,
  });
  const fascia = new THREE.Mesh(fGeo, fMat);
  fascia.position.y = 15; fasciaGroup.add(fascia);
  scene.add(fasciaGroup); zones.set("fascia", fasciaGroup);

  // ── Vomitory signs ──
  const vomGroup = new THREE.Group(); vomGroup.name = "vomitory";
  const vomAngles = [0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3];
  vomAngles.forEach(angle => {
    const r = 22;
    const x = Math.sin(angle) * r;
    const z = Math.cos(angle) * r * 0.7;
    const g = new THREE.Group();
    g.position.set(x, 4, z);
    g.lookAt(0, 4, 0);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.5), mat());
    g.add(face);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.7, 0.1), frameMat);
    frame.position.z = -0.06; g.add(frame);
    vomGroup.add(g);
  });
  scene.add(vomGroup); zones.set("vomitory", vomGroup);

  // ── Concourse displays ──
  const conGroup = new THREE.Group(); conGroup.name = "concourse";
  const conPositions: [number, number, number, number][] = [
    [28, 3, 10, -0.3], [28, 3, -10, -0.3], [-28, 3, 10, Math.PI + 0.3], [-28, 3, -10, Math.PI + 0.3],
  ];
  conPositions.forEach(([x, y, z, rot]) => {
    const g = new THREE.Group();
    g.position.set(x, y, z); g.rotation.y = rot;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.5), mat());
    g.add(face);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.7, 0.15), frameMat);
    frame.position.z = -0.08; g.add(frame);
    conGroup.add(g);
  });
  scene.add(conGroup); zones.set("concourse", conGroup);

  // ── Marquee / Entrance ──
  const marGroup = new THREE.Group(); marGroup.name = "marquee";
  marGroup.position.set(0, 6, 40);
  const marFace = new THREE.Mesh(new THREE.PlaneGeometry(12, 5), mat());
  marGroup.add(marFace);
  const marFrame = new THREE.Mesh(new THREE.BoxGeometry(12.4, 5.4, 0.3), frameMat);
  marFrame.position.z = -0.16; marGroup.add(marFrame);
  // Support columns
  [-6, 6].forEach(x => {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.3, 8, 0.3), new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.7 }));
    col.position.set(x, -2, -0.16); marGroup.add(col);
  });
  scene.add(marGroup); zones.set("marquee", marGroup);

  // ── Courtside boards (mapped to vomitory zone for simplicity, or add as sub-zone) ──
  const csGroup = new THREE.Group(); csGroup.name = "courtside-boards";
  const csConfigs = [
    { pos: [0, 0.6, -10], rot: 0, w: 14 },
    { pos: [0, 0.6, 10], rot: Math.PI, w: 14 },
    { pos: [-12, 0.6, 0], rot: Math.PI / 2, w: 8 },
    { pos: [12, 0.6, 0], rot: -Math.PI / 2, w: 8 },
  ];
  csConfigs.forEach(cfg => {
    const g = new THREE.Group();
    g.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]); g.rotation.y = cfg.rot;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(cfg.w + 0.3, 1.1, 0.15), frameMat);
    frame.position.z = -0.08; g.add(frame);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(cfg.w, 0.9), mat());
    face.position.z = 0.01; g.add(face);
    [-cfg.w / 2 + 0.5, cfg.w / 2 - 0.5].forEach(x => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.15), new THREE.MeshStandardMaterial({ color: 0x111111 }));
      leg.position.set(x, -0.35, -0.1); g.add(leg);
    });
    csGroup.add(g);
  });
  scene.add(csGroup);
  // Courtside boards are always visible (part of scoreboard zone visually, separate in 3D)

  return zones;
}

// ─── Loading overlay ────────────────────────────────────────────────────────
function LoadingOverlay() {
  return (
    <div className="absolute inset-0 z-30 bg-[#030812] flex flex-col items-center justify-center">
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-full border-2 border-[#0A52EF]/20 animate-ping" />
        <div className="absolute inset-2 rounded-full border-2 border-t-[#0A52EF] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        <div className="absolute inset-4 rounded-full border border-[#03B8FF]/30 animate-pulse" />
      </div>
      <p className="text-sm text-slate-300 font-semibold tracking-wide">Loading Arena</p>
      <p className="text-[10px] text-slate-500 mt-1.5">Initializing 3D environment</p>
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
  const zoneGroupsRef = useRef<Map<string, THREE.Group>>(new Map());
  const animIdRef = useRef<number>(0);

  const [activeCameraId, setActiveCameraId] = useState("overview");
  const [brightness, setBrightness] = useState(1.0);
  const [multiplyBlend, setMultiplyBlend] = useState(false);
  const [clientName, setClientName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [activeZoneIds, setActiveZoneIds] = useState<Set<string>>(() => new Set(VENUE_ZONES.map(z => z.id)));

  // Camera lerp targets
  const camTarget = useRef({ pos: new THREE.Vector3(22, 16, 28), look: new THREE.Vector3(0, 6, 0) });
  const camCurrent = useRef({ pos: new THREE.Vector3(22, 16, 28), look: new THREE.Vector3(0, 6, 0) });

  // Zone toggle
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

  // Screenshot
  const takeScreenshot = useCallback(() => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer || !scene || !camera) return;
    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    const name = clientName || "ANC_Arena";
    a.download = `${name.replace(/[^a-zA-Z0-9]/g, "_")}_Visualizer.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }, [clientName]);

  // Initialize Three.js scene once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 200);
    camera.position.set(22, 16, 28);
    cameraRef.current = camera;

    const { scene } = buildScene();
    sceneRef.current = scene;

    const tex = makeTextTexture("");
    const zoneGroups = buildZoneGroups(scene, tex);
    zoneGroupsRef.current = zoneGroups;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = 5;
    controls.maxDistance = 70;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.25;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    const clock = new THREE.Clock();
    function animate() {
      animIdRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      camCurrent.current.pos.lerp(camTarget.current.pos, Math.min(2 * delta, 1));
      camCurrent.current.look.lerp(camTarget.current.look, Math.min(2 * delta, 1));
      camera.position.copy(camCurrent.current.pos);
      controls.target.copy(camCurrent.current.look);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();
    setIsReady(true);

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
      controls.dispose(); renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  // Sync zone visibility with 3D
  useEffect(() => {
    zoneGroupsRef.current.forEach((group, zoneId) => {
      group.visible = activeZoneIds.has(zoneId);
    });
  }, [activeZoneIds]);

  // Update camera
  useEffect(() => {
    const preset = CAMERA_PRESETS.find(p => p.id === activeCameraId) || CAMERA_PRESETS[0];
    camTarget.current.pos.set(...preset.pos);
    camTarget.current.look.set(...preset.target);
    if (controlsRef.current) {
      controlsRef.current.autoRotate = preset.autoRotate;
    }
  }, [activeCameraId]);

  // Update textures when logo/name/brightness/blend changes
  useEffect(() => {
    const updateGroupTextures = (tex: THREE.Texture) => {
      zoneGroupsRef.current.forEach(group => {
        group.traverse(child => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            if (child.material.emissiveMap) {
              child.material.map = tex;
              child.material.emissiveMap = tex;
              child.material.emissiveIntensity = brightness * 3.5;
              child.material.needsUpdate = true;
            }
          }
        });
      });
    };

    if (logoFile) {
      const url = URL.createObjectURL(logoFile);
      setLogoPreviewUrl(url);
      const img = new Image();
      img.onload = () => {
        const tex = makeLogoTexture(img, multiplyBlend);
        updateGroupTextures(tex);
      };
      img.src = url;
      return () => URL.revokeObjectURL(url);
    } else {
      setLogoPreviewUrl(null);
      const tex = makeTextTexture(clientName);
      updateGroupTextures(tex);
    }
  }, [logoFile, clientName, brightness, multiplyBlend]);

  // Compute pricing from active zones
  const activeZoneData = VENUE_ZONES.filter(z => activeZoneIds.has(z.id));
  const totalHardware = activeZoneData.reduce((s, z) => s + z.defaultWidthFt * z.defaultHeightFt * z.costPerSqFt * z.quantity, 0);
  const totalProject = totalHardware * (1 + SERVICES_MULTIPLIER);
  const totalSell = totalProject > 0 ? totalProject / (1 - DEFAULT_MARGIN) : 0;
  const totalAnnualRevenue = activeZoneData.reduce((s, z) => s + z.annualSponsorRevenue, 0);

  return (
    <div className="relative w-full h-screen bg-[#030812] overflow-hidden">
      {!isReady && <LoadingOverlay />}

      <ControlsHUD
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
      />

      <div ref={containerRef} className="absolute inset-0 pl-[380px]" />

      {/* Bottom status bar */}
      <div className="absolute bottom-0 left-[380px] right-0 z-10 bg-gradient-to-t from-black/80 to-transparent px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6 text-[11px] text-slate-400">
          <span><strong className="text-white">{activeZoneData.length}</strong> / {VENUE_ZONES.length} zones active</span>
          <span>Hardware: <strong className="text-blue-400">${(totalHardware / 1000).toFixed(0)}K</strong></span>
          <span>Sell: <strong className="text-emerald-400">${(totalSell / 1000).toFixed(0)}K</strong></span>
          <span>Sponsor Rev: <strong className="text-amber-400">${(totalAnnualRevenue / 1000000).toFixed(1)}M</strong>/yr</span>
        </div>
        <span className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">ANC Sports · Virtual Venue Visualizer</span>
      </div>
    </div>
  );
}
