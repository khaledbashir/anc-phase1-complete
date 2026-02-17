"use client";

import React, { useRef, useMemo, useEffect, Suspense, Component } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three/examples/jsm/controls/OrbitControls.js";
import { CAMERA_PRESETS, SCENE_MOODS, VENUE_TYPES } from "../data/venueZones";
import type { SceneMood, VenueType } from "../data/venueZones";

// ─── Types ───────────────────────────────────────────────────────────────────
interface ArenaSceneProps {
  texture: THREE.CanvasTexture | null;
  activeZoneIds: Set<string>;
  beforeAfter: boolean;
  sceneMoodId: string;
  venueTypeId: string;
  activeCameraId: string;
  brightness: number;
  autoTour: boolean;
  setAutoTour: (v: boolean) => void;
  setActiveCameraId: (id: string) => void;
  presentationMode: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const CROWD_COUNT = 4000;
const CROWD_PALETTE = [0x0A52EF, 0x1a3aaa, 0x2244cc, 0x334488, 0x223366, 0xddddee, 0xbbccdd, 0x5566aa, 0x778899, 0xee4444, 0xffcc00];
const AUTO_TOUR_INTERVAL = 6;
const GLB_PATH = "/models/arena.glb";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeScreenMaterial(texture: THREE.CanvasTexture | null, intensity: number, side: THREE.Side = THREE.FrontSide): THREE.MeshStandardMaterial {
  const t = texture || new THREE.CanvasTexture(document.createElement("canvas"));
  return new THREE.MeshStandardMaterial({
    map: t,
    emissiveMap: t,
    emissive: new THREE.Color("#ffffff"),
    emissiveIntensity: intensity,
    toneMapped: false,
    side,
  });
}

function makeWrappedScreenMaterial(texture: THREE.CanvasTexture | null, repeatX: number, intensity: number, side: THREE.Side = THREE.BackSide): THREE.MeshStandardMaterial {
  const t = texture ? texture.clone() : new THREE.CanvasTexture(document.createElement("canvas"));
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(repeatX, 1);
  t.needsUpdate = true;
  return new THREE.MeshStandardMaterial({
    map: t,
    emissiveMap: t,
    emissive: new THREE.Color("#ffffff"),
    emissiveIntensity: intensity,
    toneMapped: false,
    side,
  });
}

const FRAME_MAT = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.7, roughness: 0.4 });

// ─── GLB Arena Shell ─────────────────────────────────────────────────────────
// Uses useGLTF which suspends while loading. If the file doesn't exist (404),
// the ErrorBoundary below catches it silently — no crash, just procedural arena.
function GLBModel() {
  const { scene } = useGLTF(GLB_PATH);
  return <primitive object={scene} />;
}

// Error boundary that silently swallows GLB load failures (404, parse errors)
class GLBErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? null : this.props.children; }
}

// ─── Procedural Arena Shell ──────────────────────────────────────────────────
function ProceduralArena({ venueTypeId }: { venueTypeId: string }) {
  const courtRef = useRef<THREE.Mesh>(null!);
  const courtLinesRef = useRef<THREE.Group>(null!);

  const vt = VENUE_TYPES.find(v => v.id === venueTypeId) || VENUE_TYPES[0];

  useEffect(() => {
    if (!courtRef.current) return;
    const mat = courtRef.current.material as THREE.MeshStandardMaterial;
    mat.color.setHex(vt.courtColor);
    // Adjust surface feel per sport
    if (vt.id === "nhl") { mat.roughness = 0.15; mat.metalness = 0.4; }
    else if (vt.id === "nfl" || vt.id === "mls") { mat.roughness = 0.8; mat.metalness = 0.05; }
    else if (vt.id === "concert") { mat.roughness = 0.8; mat.metalness = 0.05; }
    else { mat.roughness = 0.5; mat.metalness = 0.15; }
    mat.needsUpdate = true;
    // Resize court
    courtRef.current.geometry.dispose();
    courtRef.current.geometry = new THREE.PlaneGeometry(vt.courtW, vt.courtH);
  }, [vt]);

  // Bowl lathe profile
  const bowlGeo = useMemo(() => {
    const pts = [
      new THREE.Vector2(17, 0), new THREE.Vector2(19, 0.8), new THREE.Vector2(22, 3),
      new THREE.Vector2(25, 5.5), new THREE.Vector2(27, 7), new THREE.Vector2(29, 9.5),
      new THREE.Vector2(31, 12), new THREE.Vector2(33, 15), new THREE.Vector2(35, 17),
      new THREE.Vector2(36, 18.5), new THREE.Vector2(35.5, 19),
    ];
    const geo = new THREE.LatheGeometry(pts, 80);
    geo.scale(1, 1, 0.7);
    return geo;
  }, []);

  // Atmosphere particles
  const particlesGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const verts = new Float32Array(4500);
    for (let i = 0; i < 4500; i++) verts[i] = (Math.random() - 0.5) * 160;
    geo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
    return geo;
  }, []);

  // Volumetric cone angles
  const coneAngles = useMemo(() => {
    const angles: number[] = [];
    for (let a = 0; a < Math.PI * 2; a += 0.7) angles.push(a);
    return angles;
  }, []);

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color={0x030812} metalness={0.6} roughness={0.7} />
      </mesh>

      {/* Stadium Bowl */}
      <mesh geometry={bowlGeo}>
        <meshStandardMaterial color={0x080818} roughness={0.95} side={THREE.BackSide} />
      </mesh>

      {/* Seating Tiers */}
      {[6, 10, 14].map((y, i) => (
        <mesh key={`tier-${i}`} position={[0, y, 0]}>
          <torusGeometry args={[22 + i * 4, 0.8, 4, 80]} />
          <meshStandardMaterial color={0x0c0c20} roughness={0.9} />
        </mesh>
      ))}

      {/* Playing Court */}
      <mesh ref={courtRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[vt.courtW, vt.courtH]} />
        <meshStandardMaterial color={vt.courtColor} roughness={0.5} metalness={0.15} />
      </mesh>

      {/* Court Lines */}
      <group ref={courtLinesRef}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <torusGeometry args={[1.5, 0.02, 8, 48]} />
          <meshBasicMaterial color={0xffffff} transparent opacity={0.15} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <planeGeometry args={[0.04, 9]} />
          <meshBasicMaterial color={0xffffff} transparent opacity={0.15} />
        </mesh>
        {[-6, 6].map(x => (
          <mesh key={`arc-${x}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.03, 0]}>
            <torusGeometry args={[2.5, 0.02, 8, 32]} />
            <meshBasicMaterial color={0xffffff} transparent opacity={0.15} />
          </mesh>
        ))}
      </group>

      {/* Atmosphere Particles */}
      <points geometry={particlesGeo} position={[0, 40, 0]}>
        <pointsMaterial color={0x3366ff} size={0.2} transparent opacity={0.3} />
      </points>

      {/* Catwalk / Lighting Rig */}
      <mesh position={[0, 22, 0]}>
        <torusGeometry args={[10, 0.15, 6, 48]} />
        <meshStandardMaterial color={0x0a0a12} metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Volumetric Light Cones */}
      {coneAngles.map((a, i) => (
        <mesh
          key={`cone-${i}`}
          position={[Math.sin(a) * 8, 11, Math.cos(a) * 8]}
          rotation={[Math.PI, 0, 0]}
        >
          <coneGeometry args={[5, 22, 12, 1, true]} />
          <meshBasicMaterial
            color={0x4488ff}
            transparent
            opacity={0.025}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}

      {/* Arena Tunnel Entrances */}
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((a, i) => (
        <mesh
          key={`tunnel-${i}`}
          position={[Math.sin(a) * 19, 1.5, Math.cos(a) * 19 * 0.7]}
          rotation={[0, a, 0]}
        >
          <boxGeometry args={[2.5, 3, 2.5]} />
          <meshStandardMaterial color={0x020208} roughness={1} />
        </mesh>
      ))}

      {/* Scorer's Table */}
      <mesh position={[0, 0.25, -5.5]}>
        <boxGeometry args={[8, 0.5, 0.8]} />
        <meshStandardMaterial color={0x1a1a2a} roughness={0.7} metalness={0.3} />
      </mesh>
    </group>
  );
}

// ─── Instanced Crowd ─────────────────────────────────────────────────────────
function Crowd() {
  const meshRef = useRef<THREE.InstancedMesh>(null!);

  useEffect(() => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < CROWD_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const t = 0.05 + Math.random() * 0.88;
      const baseR = 18 + t * 16;
      const y = t * 17 + 0.3;
      const jitter = (Math.random() - 0.5) * 1.0;
      dummy.position.set(
        Math.sin(angle) * (baseR + jitter),
        y,
        Math.cos(angle) * (baseR + jitter) * 0.7
      );
      dummy.rotation.y = angle + Math.PI;
      dummy.scale.setScalar(0.65 + Math.random() * 0.5);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      color.setHex(CROWD_PALETTE[Math.floor(Math.random() * CROWD_PALETTE.length)]);
      color.r = Math.min(1, Math.max(0, color.r + (Math.random() - 0.5) * 0.12));
      color.g = Math.min(1, Math.max(0, color.g + (Math.random() - 0.5) * 0.12));
      color.b = Math.min(1, Math.max(0, color.b + (Math.random() - 0.5) * 0.12));
      mesh.setColorAt(i, color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, CROWD_COUNT]} castShadow={false} receiveShadow={false}>
      <boxGeometry args={[0.25, 0.45, 0.25]} />
      <meshStandardMaterial roughness={0.95} metalness={0} />
    </instancedMesh>
  );
}

// ─── LED Screen Zones ────────────────────────────────────────────────────────

function Scoreboard({ texture, visible, intensity }: { texture: THREE.CanvasTexture | null; visible: boolean; intensity: number }) {
  const groupRef = useRef<THREE.Group>(null!);
  const matsRef = useRef<THREE.MeshStandardMaterial[]>([]);

  useEffect(() => {
    matsRef.current.forEach(m => {
      if (!texture) return;
      m.map = texture;
      m.emissiveMap = texture;
      m.emissiveIntensity = intensity;
      m.needsUpdate = true;
    });
  }, [texture, intensity]);

  const mat = useMemo(() => {
    const m = makeScreenMaterial(texture, intensity);
    matsRef.current.push(m);
    return m;
  }, []);

  const mat2 = useMemo(() => { const m = makeScreenMaterial(texture, intensity); matsRef.current.push(m); return m; }, []);
  const mat3 = useMemo(() => { const m = makeScreenMaterial(texture, intensity); matsRef.current.push(m); return m; }, []);
  const mat4 = useMemo(() => { const m = makeScreenMaterial(texture, intensity); matsRef.current.push(m); return m; }, []);
  const mat5 = useMemo(() => { const m = makeScreenMaterial(texture, intensity); matsRef.current.push(m); return m; }, []);

  return (
    <group ref={groupRef} position={[0, 14, 0]} visible={visible}>
      {/* Housing */}
      <mesh material={FRAME_MAT}>
        <boxGeometry args={[8, 4.5, 5]} />
      </mesh>
      {/* Cables */}
      {[[-3, 0, -2], [3, 0, -2], [-3, 0, 2], [3, 0, 2]].map((p, i) => (
        <mesh key={`cable-${i}`} position={[p[0], 5, p[2]]}>
          <cylinderGeometry args={[0.03, 0.03, 10, 6]} />
          <meshStandardMaterial color={0x222222} metalness={0.8} />
        </mesh>
      ))}
      {/* Front/Back faces */}
      <mesh position={[0, 0, 2.51]} material={mat}>
        <planeGeometry args={[7.6, 4.1]} />
      </mesh>
      <mesh position={[0, 0, -2.51]} rotation={[0, Math.PI, 0]} material={mat2}>
        <planeGeometry args={[7.6, 4.1]} />
      </mesh>
      {/* Side faces */}
      <mesh position={[4.01, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={mat3}>
        <planeGeometry args={[4.6, 4.1]} />
      </mesh>
      <mesh position={[-4.01, 0, 0]} rotation={[0, -Math.PI / 2, 0]} material={mat4}>
        <planeGeometry args={[4.6, 4.1]} />
      </mesh>
      {/* Bottom face */}
      <mesh position={[0, -2.26, 0]} rotation={[Math.PI / 2, 0, 0]} material={mat5}>
        <planeGeometry args={[7.6, 4.6]} />
      </mesh>
    </group>
  );
}

function RibbonBoard({ zoneId, texture, visible, intensity, startAngle }: {
  zoneId: string; texture: THREE.CanvasTexture | null; visible: boolean; intensity: number; startAngle: number;
}) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);

  const screenMat = useMemo(() => {
    const m = makeWrappedScreenMaterial(texture, 2, intensity);
    matRef.current = m;
    return m;
  }, []);

  // Animate scroll + update texture
  useFrame((_, delta) => {
    if (!matRef.current || !visible) return;
    if (matRef.current.map) {
      matRef.current.map.offset.x += delta * 0.03;
    }
  });

  useEffect(() => {
    if (!matRef.current || !texture) return;
    const cloned = texture.clone();
    cloned.wrapS = THREE.RepeatWrapping;
    cloned.repeat.set(2, 1);
    cloned.needsUpdate = true;
    matRef.current.map = cloned;
    matRef.current.emissiveMap = cloned;
    matRef.current.emissiveIntensity = intensity;
    matRef.current.needsUpdate = true;
  }, [texture, intensity]);

  const ringMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.6, roughness: 0.5 }), []);

  return (
    <group visible={visible}>
      <mesh position={[0, 8, 0]} material={screenMat}>
        <cylinderGeometry args={[25.5, 25.5, 1.2, 64, 1, true, startAngle, Math.PI]} />
      </mesh>
      {[0, 1.5].map(dy => (
        <mesh key={`ring-${dy}`} position={[0, 8 + dy, 0]} rotation={startAngle === Math.PI ? [0, Math.PI, 0] : [0, 0, 0]} material={ringMat}>
          <torusGeometry args={[26, dy === 0 ? 0.4 : 0.25, 8, 32, Math.PI]} />
        </mesh>
      ))}
    </group>
  );
}

function FasciaRing({ texture, visible, intensity }: { texture: THREE.CanvasTexture | null; visible: boolean; intensity: number }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);

  const screenMat = useMemo(() => {
    const m = makeWrappedScreenMaterial(texture, 6, 2.5, THREE.BackSide);
    matRef.current = m;
    return m;
  }, []);

  useFrame((_, delta) => {
    if (!matRef.current || !visible) return;
    if (matRef.current.map) {
      matRef.current.map.offset.x += delta * 0.03;
    }
  });

  useEffect(() => {
    if (!matRef.current || !texture) return;
    const cloned = texture.clone();
    cloned.wrapS = THREE.RepeatWrapping;
    cloned.repeat.set(6, 1);
    cloned.needsUpdate = true;
    matRef.current.map = cloned;
    matRef.current.emissiveMap = cloned;
    matRef.current.emissiveIntensity = intensity;
    matRef.current.needsUpdate = true;
  }, [texture, intensity]);

  return (
    <group visible={visible}>
      <mesh position={[0, 15, 0]} material={screenMat}>
        <cylinderGeometry args={[33, 33, 0.8, 80, 1, true]} />
      </mesh>
    </group>
  );
}

function VomitorySigns({ texture, visible, intensity }: { texture: THREE.CanvasTexture | null; visible: boolean; intensity: number }) {
  const matsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const angles = useMemo(() => [0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3], []);

  useEffect(() => {
    matsRef.current.forEach(m => {
      if (!texture) return;
      m.map = texture;
      m.emissiveMap = texture;
      m.emissiveIntensity = intensity;
      m.needsUpdate = true;
    });
  }, [texture, intensity]);

  return (
    <group visible={visible}>
      {angles.map((angle, i) => {
        const r = 22;
        const x = Math.sin(angle) * r;
        const z = Math.cos(angle) * r * 0.7;
        return (
          <group key={`vom-${i}`} position={[x, 4, z]} onUpdate={(self) => self.lookAt(0, 4, 0)}>
            <mesh
              ref={(mesh) => {
                if (mesh) {
                  const mat = mesh.material as THREE.MeshStandardMaterial;
                  if (mat && !matsRef.current.includes(mat)) matsRef.current.push(mat);
                }
              }}
            >
              <planeGeometry args={[2.5, 1.5]} />
              {(() => { const m = makeScreenMaterial(texture, intensity); return <primitive object={m} attach="material" />; })()}
            </mesh>
            <mesh position={[0, 0, -0.06]} material={FRAME_MAT}>
              <boxGeometry args={[2.7, 1.7, 0.1]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function ConcourseDisplays({ texture, visible, intensity }: { texture: THREE.CanvasTexture | null; visible: boolean; intensity: number }) {
  const matsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const positions: [number, number, number, number][] = useMemo(() => [
    [28, 3, 10, -0.3], [28, 3, -10, -0.3], [-28, 3, 10, Math.PI + 0.3], [-28, 3, -10, Math.PI + 0.3],
  ], []);

  useEffect(() => {
    matsRef.current.forEach(m => {
      if (!texture) return;
      m.map = texture;
      m.emissiveMap = texture;
      m.emissiveIntensity = intensity;
      m.needsUpdate = true;
    });
  }, [texture, intensity]);

  return (
    <group visible={visible}>
      {positions.map(([x, y, z, rot], i) => (
        <group key={`con-${i}`} position={[x, y, z]} rotation={[0, rot, 0]}>
          <mesh
            ref={(mesh) => {
              if (mesh) {
                const mat = mesh.material as THREE.MeshStandardMaterial;
                if (mat && !matsRef.current.includes(mat)) matsRef.current.push(mat);
              }
            }}
          >
            <planeGeometry args={[4, 2.5]} />
            {(() => { const m = makeScreenMaterial(texture, intensity); return <primitive object={m} attach="material" />; })()}
          </mesh>
          <mesh position={[0, 0, -0.08]} material={FRAME_MAT}>
            <boxGeometry args={[4.2, 2.7, 0.15]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Marquee({ texture, visible, intensity }: { texture: THREE.CanvasTexture | null; visible: boolean; intensity: number }) {
  const matRef = useRef<THREE.MeshStandardMaterial | null>(null);

  useEffect(() => {
    if (!matRef.current || !texture) return;
    matRef.current.map = texture;
    matRef.current.emissiveMap = texture;
    matRef.current.emissiveIntensity = intensity;
    matRef.current.needsUpdate = true;
  }, [texture, intensity]);

  return (
    <group position={[0, 6, 40]} visible={visible}>
      <mesh
        ref={(mesh) => {
          if (mesh) matRef.current = mesh.material as THREE.MeshStandardMaterial;
        }}
      >
        <planeGeometry args={[12, 5]} />
        {(() => { const m = makeScreenMaterial(texture, intensity); return <primitive object={m} attach="material" />; })()}
      </mesh>
      <mesh position={[0, 0, -0.16]} material={FRAME_MAT}>
        <boxGeometry args={[12.4, 5.4, 0.3]} />
      </mesh>
      {/* Support columns */}
      {[-6, 6].map(x => (
        <mesh key={`col-${x}`} position={[x, -2, -0.16]}>
          <boxGeometry args={[0.3, 8, 0.3]} />
          <meshStandardMaterial color={0x111111} metalness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function CourtsideBoards({ texture, intensity }: { texture: THREE.CanvasTexture | null; intensity: number }) {
  const matsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const configs = useMemo(() => [
    { pos: [0, 0.6, -10] as [number, number, number], rot: 0, w: 14 },
    { pos: [0, 0.6, 10] as [number, number, number], rot: Math.PI, w: 14 },
    { pos: [-12, 0.6, 0] as [number, number, number], rot: Math.PI / 2, w: 8 },
    { pos: [12, 0.6, 0] as [number, number, number], rot: -Math.PI / 2, w: 8 },
  ], []);

  useEffect(() => {
    matsRef.current.forEach(m => {
      if (!texture) return;
      m.map = texture;
      m.emissiveMap = texture;
      m.emissiveIntensity = intensity;
      m.needsUpdate = true;
    });
  }, [texture, intensity]);

  return (
    <group>
      {configs.map((cfg, i) => (
        <group key={`cs-${i}`} position={cfg.pos} rotation={[0, cfg.rot, 0]}>
          <mesh position={[0, 0, -0.08]} material={FRAME_MAT}>
            <boxGeometry args={[cfg.w + 0.3, 1.1, 0.15]} />
          </mesh>
          <mesh
            position={[0, 0, 0.01]}
            ref={(mesh) => {
              if (mesh) {
                const mat = mesh.material as THREE.MeshStandardMaterial;
                if (mat && !matsRef.current.includes(mat)) matsRef.current.push(mat);
              }
            }}
          >
            <planeGeometry args={[cfg.w, 0.9]} />
            {(() => { const m = makeScreenMaterial(texture, intensity); return <primitive object={m} attach="material" />; })()}
          </mesh>
          {[-cfg.w / 2 + 0.5, cfg.w / 2 - 0.5].map(x => (
            <mesh key={`leg-${x}`} position={[x, -0.35, -0.1]}>
              <boxGeometry args={[0.08, 0.5, 0.15]} />
              <meshStandardMaterial color={0x111111} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// ─── Lighting Rig ────────────────────────────────────────────────────────────
function ArenaLighting({ sceneMoodId }: { sceneMoodId: string }) {
  const ambientRef = useRef<THREE.AmbientLight>(null!);
  const spot1Ref = useRef<THREE.SpotLight>(null!);
  const spot2Ref = useRef<THREE.SpotLight>(null!);
  const spot3Ref = useRef<THREE.SpotLight>(null!);
  const { gl, scene } = useThree();

  useEffect(() => {
    const mood = SCENE_MOODS.find(m => m.id === sceneMoodId) || SCENE_MOODS[0];
    if (ambientRef.current) ambientRef.current.intensity = mood.ambientIntensity;
    if (spot1Ref.current) spot1Ref.current.intensity = mood.spotIntensity;
    if (spot2Ref.current) spot2Ref.current.intensity = mood.spotIntensity * 0.7;
    if (spot3Ref.current) spot3Ref.current.intensity = mood.spotIntensity * 0.5;
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.near = mood.fogNear;
      scene.fog.far = mood.fogFar;
      scene.fog.color.setHex(mood.fogColor);
    }
    gl.toneMappingExposure = mood.exposure;
  }, [sceneMoodId, gl, scene]);

  return (
    <>
      <ambientLight ref={ambientRef} color={0x0a0a2a} intensity={0.2} />
      <spotLight ref={spot1Ref} position={[0, 35, 0]} intensity={100} angle={0.6} penumbra={0.8} castShadow />
      <spotLight ref={spot2Ref} position={[20, 28, -15]} color={0x0A52EF} intensity={70} angle={0.5} penumbra={0.7} />
      <spotLight ref={spot3Ref} position={[-20, 24, 15]} color={0x03B8FF} intensity={50} angle={0.4} penumbra={0.9} />
      {/* Rim lights */}
      <pointLight position={[30, 5, 0]} color={0x0A52EF} intensity={12} distance={70} />
      <pointLight position={[-30, 5, 0]} color={0x0A52EF} intensity={12} distance={70} />
      <pointLight position={[0, 5, 30]} color={0x03B8FF} intensity={8} distance={50} />
      <pointLight position={[0, 5, -30]} color={0x03B8FF} intensity={8} distance={50} />
    </>
  );
}

// ─── Camera Controller ───────────────────────────────────────────────────────
function CameraController({ activeCameraId, autoTour, setAutoTour, setActiveCameraId }: {
  activeCameraId: string; autoTour: boolean; setAutoTour: (v: boolean) => void; setActiveCameraId: (id: string) => void;
}) {
  const controlsRef = useRef<OrbitControlsImpl>(null!);
  const camTargetPos = useRef(new THREE.Vector3(22, 16, 28));
  const camTargetLook = useRef(new THREE.Vector3(0, 6, 0));
  const autoTourTimer = useRef(0);
  const autoTourIndex = useRef(0);
  const autoTourRef = useRef(autoTour);
  const { camera } = useThree();

  useEffect(() => { autoTourRef.current = autoTour; }, [autoTour]);

  useEffect(() => {
    const preset = CAMERA_PRESETS.find(p => p.id === activeCameraId) || CAMERA_PRESETS[0];
    camTargetPos.current.set(...preset.pos);
    camTargetLook.current.set(...preset.target);
    if (controlsRef.current) {
      controlsRef.current.autoRotate = preset.autoRotate;
    }
  }, [activeCameraId]);

  useFrame((_, delta) => {
    // Smooth camera lerp
    camera.position.lerp(camTargetPos.current, Math.min(2 * delta, 1));
    if (controlsRef.current) {
      controlsRef.current.target.lerp(camTargetLook.current, Math.min(2 * delta, 1));
      controlsRef.current.update();
    }

    // Auto-tour cycling
    if (autoTourRef.current) {
      autoTourTimer.current += delta;
      if (autoTourTimer.current >= AUTO_TOUR_INTERVAL) {
        autoTourTimer.current = 0;
        autoTourIndex.current = (autoTourIndex.current + 1) % CAMERA_PRESETS.length;
        const next = CAMERA_PRESETS[autoTourIndex.current];
        camTargetPos.current.set(...next.pos);
        camTargetLook.current.set(...next.target);
        setActiveCameraId(next.id);
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      minDistance={5}
      maxDistance={70}
      maxPolarAngle={Math.PI / 2 - 0.05}
      autoRotate
      autoRotateSpeed={0.25}
      enableDamping
      dampingFactor={0.05}
    />
  );
}

// ─── Main Scene Export ───────────────────────────────────────────────────────
export default function ArenaScene(props: ArenaSceneProps) {
  const {
    texture, activeZoneIds, beforeAfter, sceneMoodId, venueTypeId,
    activeCameraId, brightness, autoTour, setAutoTour, setActiveCameraId,
    presentationMode,
  } = props;

  const screenIntensity = brightness * 3.5;

  // Zone visibility helper
  const zoneVisible = (id: string) => beforeAfter ? false : activeZoneIds.has(id);

  // Apply fog on mount
  const { scene } = useThree();
  useEffect(() => {
    scene.fog = new THREE.Fog(0x030812, 30, 130);
  }, [scene]);

  return (
    <>
      <ArenaLighting sceneMoodId={sceneMoodId} />
      <CameraController
        activeCameraId={activeCameraId}
        autoTour={autoTour}
        setAutoTour={setAutoTour}
        setActiveCameraId={setActiveCameraId}
      />

      {/* Procedural arena (always renders — this is the real geometry) */}
      <ProceduralArena venueTypeId={venueTypeId} />

      {/* GLB model overlay — loads if /models/arena.glb exists, silently skipped if not */}
      <GLBErrorBoundary>
        <Suspense fallback={null}>
          <GLBModel />
        </Suspense>
      </GLBErrorBoundary>

      <Crowd />

      {/* LED Screen Zones */}
      <Scoreboard texture={texture} visible={zoneVisible("scoreboard")} intensity={screenIntensity} />
      <RibbonBoard zoneId="ribbon-north" texture={texture} visible={zoneVisible("ribbon-north")} intensity={screenIntensity} startAngle={0} />
      <RibbonBoard zoneId="ribbon-south" texture={texture} visible={zoneVisible("ribbon-south")} intensity={screenIntensity} startAngle={Math.PI} />
      <FasciaRing texture={texture} visible={zoneVisible("fascia")} intensity={screenIntensity} />
      <VomitorySigns texture={texture} visible={zoneVisible("vomitory")} intensity={screenIntensity} />
      <ConcourseDisplays texture={texture} visible={zoneVisible("concourse")} intensity={screenIntensity} />
      <Marquee texture={texture} visible={zoneVisible("marquee")} intensity={screenIntensity} />
      <CourtsideBoards texture={texture} intensity={screenIntensity} />

      {/* HDRI environment for realistic reflections (subtle) */}
      <Environment preset="night" background={false} />
    </>
  );
}
