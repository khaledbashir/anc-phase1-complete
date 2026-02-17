"use client";

/**
 * EstimatorVenuePanel — Live 3D arena preview inside the Estimator.
 *
 * Shows which arena zones light up based on the displays being configured.
 * Same Three.js pattern as VenueCanvas but stripped down — no HUD, no brand tab,
 * no moods. Just the arena + active zones + legend.
 */

import { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { X } from "lucide-react";
import type { DisplayAnswers } from "./questions";
import { mapDisplaysToZones, type ZoneMapping } from "@/services/estimator/displayToZoneMapper";

interface EstimatorVenuePanelProps {
  displays: DisplayAnswers[];
  onClose: () => void;
}

// ─── Colors ──────────────────────────────────────────────────────────────────
const ACTIVE_HEX = 0x0a52ef;
const INACTIVE_HEX = 0x111118;
const FRAME_HEX = 0x111111;

// ─── Zone label lookup ───────────────────────────────────────────────────────
const ZONE_LABELS: Record<string, string> = {
  scoreboard: "Scoreboard",
  "ribbon-north": "Ribbon North",
  "ribbon-south": "Ribbon South",
  fascia: "Fascia",
  vomitory: "Vomitory",
  concourse: "Concourse",
  marquee: "Marquee",
};

// ─── LED texture ─────────────────────────────────────────────────────────────
function makeLedTexture(w = 512, h = 256): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#030812");
  grad.addColorStop(1, "#0a1628");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  // LED pixel grid
  ctx.strokeStyle = "rgba(10,82,239,0.04)";
  ctx.lineWidth = 0.5;
  for (let x = 0; x < w; x += 4) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 48px 'Work Sans', sans-serif";
  ctx.fillStyle = "#0A52EF";
  ctx.shadowColor = "#0A52EF";
  ctx.shadowBlur = 20;
  ctx.fillText("ANC", w / 2, h / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

// ─── Build arena scene ───────────────────────────────────────────────────────
function buildArena(scene: THREE.Scene) {
  scene.fog = new THREE.Fog(0x030812, 30, 120);

  // Lights
  const ambient = new THREE.AmbientLight(0x0a0a2a, 0.3);
  scene.add(ambient);
  const spot = new THREE.SpotLight(0x4488ff, 80, 0, 0.6, 0.8);
  spot.position.set(0, 35, 0);
  spot.castShadow = true;
  scene.add(spot);
  const spot2 = new THREE.SpotLight(0x0a52ef, 50, 0, 0.5, 0.7);
  spot2.position.set(20, 28, -15);
  scene.add(spot2);

  // Rim lights
  [30, -30].forEach((x) => {
    const p = new THREE.PointLight(0x0a52ef, 10, 60);
    p.position.set(x, 5, 0);
    scene.add(p);
  });

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x030812, metalness: 0.6, roughness: 0.7 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Stadium bowl
  const pts = [
    new THREE.Vector2(17, 0),
    new THREE.Vector2(19, 0.8),
    new THREE.Vector2(22, 3),
    new THREE.Vector2(25, 5.5),
    new THREE.Vector2(27, 7),
    new THREE.Vector2(29, 9.5),
    new THREE.Vector2(31, 12),
    new THREE.Vector2(33, 15),
    new THREE.Vector2(35, 17),
    new THREE.Vector2(36, 18.5),
    new THREE.Vector2(35.5, 19),
  ];
  const bowlGeo = new THREE.LatheGeometry(pts, 64);
  bowlGeo.scale(1, 1, 0.7);
  const bowl = new THREE.Mesh(
    bowlGeo,
    new THREE.MeshStandardMaterial({ color: 0x080818, roughness: 0.95, side: THREE.BackSide })
  );
  scene.add(bowl);

  // Seating tiers
  [6, 10, 14].forEach((y, i) => {
    const tierGeo = new THREE.TorusGeometry(22 + i * 4, 0.8, 4, 64);
    const tier = new THREE.Mesh(
      tierGeo,
      new THREE.MeshStandardMaterial({ color: 0x0c0c20, roughness: 0.9 })
    );
    tier.position.y = y;
    scene.add(tier);
  });

  // Court
  const court = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 9),
    new THREE.MeshStandardMaterial({ color: 0x2a1f0a, roughness: 0.5, metalness: 0.15 })
  );
  court.rotation.x = -Math.PI / 2;
  court.position.y = 0.02;
  scene.add(court);

  // Court lines
  const lineMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.15,
  });
  const cc = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.02, 8, 48), lineMat);
  cc.rotation.x = -Math.PI / 2;
  cc.position.y = 0.03;
  scene.add(cc);
  const hcl = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 9), lineMat);
  hcl.rotation.x = -Math.PI / 2;
  hcl.position.y = 0.03;
  scene.add(hcl);

  // Lighting rig
  const rig = new THREE.Mesh(
    new THREE.TorusGeometry(10, 0.15, 6, 48),
    new THREE.MeshStandardMaterial({ color: 0x0a0a12, metalness: 0.8, roughness: 0.3 })
  );
  rig.position.y = 22;
  scene.add(rig);

  // Atmosphere particles
  const starGeo = new THREE.BufferGeometry();
  const starVerts = new Float32Array(3000);
  for (let i = 0; i < 3000; i++) starVerts[i] = (Math.random() - 0.5) * 140;
  starGeo.setAttribute("position", new THREE.BufferAttribute(starVerts, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: 0x3366ff, size: 0.15, transparent: true, opacity: 0.25 })
  );
  stars.position.y = 40;
  scene.add(stars);
}

// ─── Build zone groups ───────────────────────────────────────────────────────
function buildZoneGroups(
  scene: THREE.Scene,
  texture: THREE.Texture
): Map<string, THREE.Group> {
  const zones = new Map<string, THREE.Group>();
  const mat = () =>
    new THREE.MeshStandardMaterial({
      map: texture,
      emissiveMap: texture,
      emissive: new THREE.Color("#ffffff"),
      emissiveIntensity: 3.5,
      toneMapped: false,
    });
  const frameMat = new THREE.MeshStandardMaterial({
    color: FRAME_HEX,
    metalness: 0.7,
    roughness: 0.4,
  });

  // ── Scoreboard ──
  const sbGroup = new THREE.Group();
  sbGroup.name = "scoreboard";
  sbGroup.position.set(0, 14, 0);
  const housing = new THREE.Mesh(new THREE.BoxGeometry(8, 4.5, 5), frameMat);
  sbGroup.add(housing);
  [1, -1].forEach((dir) => {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 4.1), mat());
    face.position.set(0, 0, dir * 2.51);
    if (dir === -1) face.rotation.y = Math.PI;
    sbGroup.add(face);
  });
  [1, -1].forEach((dir) => {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.1), mat());
    face.position.set(dir * 4.01, 0, 0);
    face.rotation.y = (dir * Math.PI) / 2;
    sbGroup.add(face);
  });
  scene.add(sbGroup);
  zones.set("scoreboard", sbGroup);

  // ── Ribbon North ──
  const ribNGroup = new THREE.Group();
  ribNGroup.name = "ribbon-north";
  const ribNGeo = new THREE.CylinderGeometry(25.5, 25.5, 1.2, 64, 1, true, 0, Math.PI);
  const ribTex = texture.clone();
  ribTex.wrapS = THREE.RepeatWrapping;
  ribTex.repeat.set(2, 1);
  ribTex.needsUpdate = true;
  const ribNMat = new THREE.MeshStandardMaterial({
    map: ribTex,
    emissiveMap: ribTex,
    emissive: new THREE.Color("#ffffff"),
    emissiveIntensity: 3.5,
    toneMapped: false,
    side: THREE.BackSide,
  });
  const ribN = new THREE.Mesh(ribNGeo, ribNMat);
  ribN.position.set(0, 8, 0);
  ribNGroup.add(ribN);
  scene.add(ribNGroup);
  zones.set("ribbon-north", ribNGroup);

  // ── Ribbon South ──
  const ribSGroup = new THREE.Group();
  ribSGroup.name = "ribbon-south";
  const ribSGeo = new THREE.CylinderGeometry(
    25.5,
    25.5,
    1.2,
    64,
    1,
    true,
    Math.PI,
    Math.PI
  );
  const ribTex2 = texture.clone();
  ribTex2.wrapS = THREE.RepeatWrapping;
  ribTex2.repeat.set(2, 1);
  ribTex2.needsUpdate = true;
  const ribSMat = new THREE.MeshStandardMaterial({
    map: ribTex2,
    emissiveMap: ribTex2,
    emissive: new THREE.Color("#ffffff"),
    emissiveIntensity: 3.5,
    toneMapped: false,
    side: THREE.BackSide,
  });
  const ribS = new THREE.Mesh(ribSGeo, ribSMat);
  ribS.position.set(0, 8, 0);
  ribSGroup.add(ribS);
  scene.add(ribSGroup);
  zones.set("ribbon-south", ribSGroup);

  // ── Fascia ──
  const fasciaGroup = new THREE.Group();
  fasciaGroup.name = "fascia";
  const fGeo = new THREE.CylinderGeometry(33, 33, 0.8, 64, 1, true);
  const fTex = texture.clone();
  fTex.wrapS = THREE.RepeatWrapping;
  fTex.repeat.set(6, 1);
  fTex.needsUpdate = true;
  const fMat = new THREE.MeshStandardMaterial({
    map: fTex,
    emissiveMap: fTex,
    emissive: new THREE.Color("#ffffff"),
    emissiveIntensity: 2.5,
    toneMapped: false,
    side: THREE.BackSide,
  });
  const fascia = new THREE.Mesh(fGeo, fMat);
  fascia.position.y = 15;
  fasciaGroup.add(fascia);
  scene.add(fasciaGroup);
  zones.set("fascia", fasciaGroup);

  // ── Vomitory signs ──
  const vomGroup = new THREE.Group();
  vomGroup.name = "vomitory";
  const vomAngles = [
    0,
    Math.PI / 3,
    (2 * Math.PI) / 3,
    Math.PI,
    (4 * Math.PI) / 3,
    (5 * Math.PI) / 3,
  ];
  vomAngles.forEach((angle) => {
    const r = 22;
    const x = Math.sin(angle) * r;
    const z = Math.cos(angle) * r * 0.7;
    const g = new THREE.Group();
    g.position.set(x, 4, z);
    g.lookAt(0, 4, 0);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.5), mat());
    g.add(face);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.7, 0.1), frameMat);
    frame.position.z = -0.06;
    g.add(frame);
    vomGroup.add(g);
  });
  scene.add(vomGroup);
  zones.set("vomitory", vomGroup);

  // ── Concourse displays ──
  const conGroup = new THREE.Group();
  conGroup.name = "concourse";
  const conPositions: [number, number, number, number][] = [
    [28, 3, 10, -0.3],
    [28, 3, -10, -0.3],
    [-28, 3, 10, Math.PI + 0.3],
    [-28, 3, -10, Math.PI + 0.3],
  ];
  conPositions.forEach(([x, y, z, rot]) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rot;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.5), mat());
    g.add(face);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.7, 0.15), frameMat);
    frame.position.z = -0.08;
    g.add(frame);
    conGroup.add(g);
  });
  scene.add(conGroup);
  zones.set("concourse", conGroup);

  // ── Marquee ──
  const marGroup = new THREE.Group();
  marGroup.name = "marquee";
  marGroup.position.set(0, 6, 40);
  const marFace = new THREE.Mesh(new THREE.PlaneGeometry(12, 5), mat());
  marGroup.add(marFace);
  const marFrame = new THREE.Mesh(new THREE.BoxGeometry(12.4, 5.4, 0.3), frameMat);
  marFrame.position.z = -0.16;
  marGroup.add(marFrame);
  [-6, 6].forEach((x) => {
    const col = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 8, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.7 })
    );
    col.position.set(x, -2, -0.16);
    marGroup.add(col);
  });
  scene.add(marGroup);
  zones.set("marquee", marGroup);

  return zones;
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function EstimatorVenuePanel({
  displays,
  onClose,
}: EstimatorVenuePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const zoneGroupsRef = useRef<Map<string, THREE.Group>>(new Map());
  const animIdRef = useRef(0);

  // Map displays → zones
  const zoneMappings = useMemo(() => mapDisplaysToZones(displays), [displays]);
  const activeZoneIds = useMemo(
    () => new Set(zoneMappings.map((m) => m.zoneId)),
    [zoneMappings]
  );

  // Initialize Three.js
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      200
    );
    camera.position.set(22, 16, 28);

    const scene = new THREE.Scene();
    buildArena(scene);

    const tex = makeLedTexture();
    const zoneGroups = buildZoneGroups(scene, tex);
    zoneGroupsRef.current = zoneGroups;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = 8;
    controls.maxDistance = 60;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 6, 0);

    function animate() {
      animIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

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
      if (container.contains(renderer.domElement))
        container.removeChild(renderer.domElement);
    };
  }, []);

  // Sync zone visibility whenever displays change
  useEffect(() => {
    const ALL_ZONE_IDS = [
      "scoreboard",
      "ribbon-north",
      "ribbon-south",
      "fascia",
      "vomitory",
      "concourse",
      "marquee",
    ];

    zoneGroupsRef.current.forEach((group, zoneId) => {
      const isActive = activeZoneIds.has(zoneId);
      group.visible = true; // Always visible, but dim inactive ones

      group.traverse((child: THREE.Object3D) => {
        if (
          child instanceof THREE.Mesh &&
          child.material instanceof THREE.MeshStandardMaterial
        ) {
          if (child.material.emissiveMap) {
            // LED screen face — glow or dim
            child.material.emissiveIntensity = isActive ? 3.5 : 0;
            child.material.opacity = isActive ? 1 : 0.15;
            child.material.transparent = !isActive;
            child.material.needsUpdate = true;
          }
        }
      });
    });
  }, [activeZoneIds]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#0A52EF] animate-pulse" />
          <span className="text-sm font-semibold">3D Arena Preview</span>
          <span className="text-[10px] text-muted-foreground">
            {displays.length} display{displays.length !== 1 ? "s" : ""} →{" "}
            {activeZoneIds.size} zone{activeZoneIds.size !== 1 ? "s" : ""}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 3D Canvas */}
      <div ref={containerRef} className="flex-1 min-h-0 bg-[#030812]" />

      {/* Legend — which display maps to which zone */}
      {zoneMappings.length > 0 && (
        <div className="px-4 py-2.5 border-t border-border bg-background/80 backdrop-blur-sm">
          <div className="flex flex-wrap gap-3">
            {zoneMappings.map((m) => (
              <div
                key={m.zoneId}
                className="flex items-center gap-1.5 text-[10px]"
              >
                <div className="w-2 h-2 rounded-full bg-[#0A52EF]" />
                <span className="text-muted-foreground">
                  {ZONE_LABELS[m.zoneId] || m.zoneId}
                </span>
                <span className="text-foreground font-medium">
                  ← {m.displayName}
                </span>
                <span className="text-muted-foreground/60">
                  {m.widthFt}×{m.heightFt}ft
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {displays.length === 0 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-sm text-muted-foreground font-medium">
              No displays configured yet
            </p>
            <p className="text-[11px] text-muted-foreground/60 mt-1">
              Add displays in the questionnaire to see them light up
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
