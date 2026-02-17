"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface LEDScreensProps {
  activeView: "scoreboard" | "ribbon" | "courtside" | "all";
  logoTexture: THREE.Texture | null;
  brightness: number;
  multiplyBlend: boolean;
  clientName: string;
}

/** Generate a canvas texture with text (fallback when no logo uploaded) */
function createTextTexture(text: string, width = 1024, height = 512): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Black LED background
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  // LED grid effect
  ctx.strokeStyle = "#0a0a1a";
  ctx.lineWidth = 0.5;
  for (let x = 0; x < width; x += 8) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 8) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Text
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Main text
  ctx.font = "bold 72px 'Work Sans', sans-serif";
  ctx.fillStyle = "#0A52EF";
  ctx.fillText(text || "ANC PARTNER", width / 2, height / 2 - 30);

  // Subtitle
  ctx.font = "28px 'Work Sans', sans-serif";
  ctx.fillStyle = "#03B8FF";
  ctx.fillText("PREMIUM LED DISPLAY", width / 2, height / 2 + 40);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** Create a logo texture with optional multiply blend (makes white transparent) */
function createLogoTexture(
  logo: THREE.Texture,
  multiply: boolean,
  width = 1024,
  height = 512
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Black background (for LED screen)
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  if (multiply) {
    ctx.globalCompositeOperation = "screen";
  }

  // Draw logo centered and scaled
  const img = logo.image as HTMLImageElement;
  if (img) {
    const scale = Math.min((width * 0.8) / img.width, (height * 0.8) / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
  }

  ctx.globalCompositeOperation = "source-over";

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export default function LEDScreens({
  activeView,
  logoTexture,
  brightness,
  multiplyBlend,
  clientName,
}: LEDScreensProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Build the display texture
  const displayTexture = useMemo(() => {
    if (logoTexture) {
      return createLogoTexture(logoTexture, multiplyBlend);
    }
    return createTextTexture(clientName);
  }, [logoTexture, multiplyBlend, clientName]);

  // Ribbon-specific wide texture
  const ribbonTexture = useMemo(() => {
    if (logoTexture) {
      return createLogoTexture(logoTexture, multiplyBlend, 2048, 256);
    }
    return createTextTexture(clientName, 2048, 256);
  }, [logoTexture, multiplyBlend, clientName]);

  const emissiveIntensity = brightness * 3;

  return (
    <group ref={groupRef}>
      {/* ===== CENTER-HUNG SCOREBOARD ===== */}
      <CenterHungScoreboard
        texture={displayTexture}
        emissiveIntensity={emissiveIntensity}
        visible={activeView === "scoreboard" || activeView === "all"}
        highlighted={activeView === "scoreboard"}
      />

      {/* ===== RIBBON BOARD (360 ring) ===== */}
      <RibbonBoard
        texture={ribbonTexture}
        emissiveIntensity={emissiveIntensity}
        visible={activeView === "ribbon" || activeView === "all"}
        highlighted={activeView === "ribbon"}
      />

      {/* ===== COURTSIDE BOARDS ===== */}
      <CourtsideBoards
        texture={displayTexture}
        emissiveIntensity={emissiveIntensity}
        visible={activeView === "courtside" || activeView === "all"}
        highlighted={activeView === "courtside"}
      />
    </group>
  );
}

// ─── CENTER-HUNG SCOREBOARD ─────────────────────────────────────────────

function CenterHungScoreboard({
  texture,
  emissiveIntensity,
  visible,
  highlighted,
}: {
  texture: THREE.Texture;
  emissiveIntensity: number;
  visible: boolean;
  highlighted: boolean;
}) {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    // Very subtle sway
    ref.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.1) * 0.02;
  });

  if (!visible) return null;

  const scale = highlighted ? 1.0 : 0.95;

  return (
    <group ref={ref} position={[0, 14, 0]} scale={scale}>
      {/* Support cables (visual) */}
      {[[-3, 0, -2], [3, 0, -2], [-3, 0, 2], [3, 0, 2]].map((pos, i) => (
        <mesh key={`cable-${i}`} position={[pos[0], 5, pos[2]]}>
          <cylinderGeometry args={[0.03, 0.03, 10, 6]} />
          <meshStandardMaterial color="#222" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}

      {/* Main housing (dark frame) */}
      <mesh castShadow>
        <boxGeometry args={[8, 4.5, 5]} />
        <meshStandardMaterial color="#111" metalness={0.7} roughness={0.4} />
      </mesh>

      {/* LED faces — front & back */}
      {[1, -1].map((dir) => (
        <mesh key={`face-fb-${dir}`} position={[0, 0, dir * 2.51]}>
          <planeGeometry args={[7.6, 4.1]} />
          <meshStandardMaterial
            map={texture}
            emissiveMap={texture}
            emissive={new THREE.Color("#ffffff")}
            emissiveIntensity={emissiveIntensity}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* LED faces — left & right */}
      {[1, -1].map((dir) => (
        <mesh
          key={`face-lr-${dir}`}
          position={[dir * 4.01, 0, 0]}
          rotation={[0, dir * Math.PI / 2, 0]}
        >
          <planeGeometry args={[4.6, 4.1]} />
          <meshStandardMaterial
            map={texture}
            emissiveMap={texture}
            emissive={new THREE.Color("#ffffff")}
            emissiveIntensity={emissiveIntensity}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* Bottom screen */}
      <mesh position={[0, -2.26, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7.6, 4.6]} />
        <meshStandardMaterial
          map={texture}
          emissiveMap={texture}
          emissive={new THREE.Color("#ffffff")}
          emissiveIntensity={emissiveIntensity * 0.6}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

// ─── RIBBON BOARD (360 RING) ────────────────────────────────────────────

function RibbonBoard({
  texture,
  emissiveIntensity,
  visible,
  highlighted,
}: {
  texture: THREE.Texture;
  emissiveIntensity: number;
  visible: boolean;
  highlighted: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);

  // Wrap texture around the cylinder
  useEffect(() => {
    if (texture) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(4, 1); // Repeat logo 4x around
      texture.needsUpdate = true;
    }
  }, [texture]);

  if (!visible) return null;

  return (
    <group position={[0, 8, 0]}>
      {/* Support ring (dark frame) */}
      <mesh>
        <torusGeometry args={[26, 0.5, 8, 64]} />
        <meshStandardMaterial color="#111" metalness={0.6} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.6, 0]}>
        <torusGeometry args={[26, 0.3, 8, 64]} />
        <meshStandardMaterial color="#111" metalness={0.6} roughness={0.5} />
      </mesh>

      {/* LED ribbon — inner face of the ring */}
      <mesh ref={ref}>
        <cylinderGeometry args={[25.5, 25.5, 1.2, 64, 1, true]} />
        <meshStandardMaterial
          map={texture}
          emissiveMap={texture}
          emissive={new THREE.Color("#ffffff")}
          emissiveIntensity={emissiveIntensity}
          toneMapped={false}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

// ─── COURTSIDE / FIELD-LEVEL BOARDS ─────────────────────────────────────

function CourtsideBoards({
  texture,
  emissiveIntensity,
  visible,
  highlighted,
}: {
  texture: THREE.Texture;
  emissiveIntensity: number;
  visible: boolean;
  highlighted: boolean;
}) {
  if (!visible) return null;

  // 4 courtside boards around the playing surface
  const boards = [
    { pos: [0, 0.6, -12] as [number, number, number], rot: [0, 0, 0] as [number, number, number], width: 16 },
    { pos: [0, 0.6, 12] as [number, number, number], rot: [0, Math.PI, 0] as [number, number, number], width: 16 },
    { pos: [-14, 0.6, 0] as [number, number, number], rot: [0, Math.PI / 2, 0] as [number, number, number], width: 10 },
    { pos: [14, 0.6, 0] as [number, number, number], rot: [0, -Math.PI / 2, 0] as [number, number, number], width: 10 },
  ];

  return (
    <group>
      {boards.map((board, i) => (
        <group key={`cs-${i}`} position={board.pos} rotation={board.rot}>
          {/* Frame */}
          <mesh position={[0, 0, -0.08]}>
            <boxGeometry args={[board.width + 0.3, 1.2, 0.15]} />
            <meshStandardMaterial color="#111" metalness={0.6} roughness={0.4} />
          </mesh>
          {/* LED face */}
          <mesh position={[0, 0, 0.01]}>
            <planeGeometry args={[board.width, 1]} />
            <meshStandardMaterial
              map={texture}
              emissiveMap={texture}
              emissive={new THREE.Color("#ffffff")}
              emissiveIntensity={emissiveIntensity}
              toneMapped={false}
            />
          </mesh>
          {/* Support legs */}
          {[-board.width / 2 + 0.5, board.width / 2 - 0.5].map((x, j) => (
            <mesh key={`leg-${j}`} position={[x, -0.4, -0.15]}>
              <boxGeometry args={[0.1, 0.6, 0.2]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.6} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
