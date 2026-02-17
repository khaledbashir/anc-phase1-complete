"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import {
  MeshReflectorMaterial,
  Environment,
  Stars,
} from "@react-three/drei";
import * as THREE from "three";

/**
 * The arena environment: dark moody floor, atmospheric fog, dynamic lighting.
 */
export default function ArenaScene() {
  const spotRef1 = useRef<THREE.SpotLight>(null);
  const spotRef2 = useRef<THREE.SpotLight>(null);

  // Subtle spotlight breathing
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (spotRef1.current) spotRef1.current.intensity = 80 + Math.sin(t * 0.3) * 10;
    if (spotRef2.current) spotRef2.current.intensity = 60 + Math.cos(t * 0.4) * 8;
  });

  return (
    <>
      {/* Fog for depth */}
      <fog attach="fog" args={["#050510", 20, 120]} />

      {/* Ambient base */}
      <ambientLight intensity={0.15} color="#1a1a3a" />

      {/* Primary spots */}
      <spotLight
        ref={spotRef1}
        position={[0, 30, 0]}
        angle={0.6}
        penumbra={0.8}
        intensity={80}
        color="#4488ff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <spotLight
        ref={spotRef2}
        position={[20, 25, -15]}
        angle={0.5}
        penumbra={0.7}
        intensity={60}
        color="#0A52EF"
      />
      <spotLight
        position={[-20, 20, 15]}
        angle={0.4}
        penumbra={0.9}
        intensity={40}
        color="#03B8FF"
      />

      {/* Fill lights from sides */}
      <pointLight position={[30, 5, 0]} intensity={8} color="#0A52EF" distance={60} />
      <pointLight position={[-30, 5, 0]} intensity={8} color="#03B8FF" distance={60} />

      {/* Reflective arena floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <MeshReflectorMaterial
          blur={[300, 100]}
          resolution={1024}
          mixBlur={1}
          mixStrength={40}
          roughness={0.8}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#050510"
          metalness={0.5}
          mirror={0.5}
        />
      </mesh>

      {/* Stadium bowl (simplified curved seating tiers) */}
      <StadiumBowl />

      {/* Stars for atmosphere */}
      <Stars radius={80} depth={60} count={1500} factor={3} fade speed={0.5} />
    </>
  );
}

/** Simplified stadium bowl — dark seating tiers surrounding the court */
function StadiumBowl() {
  const bowlGeometry = useMemo(() => {
    // Create an oval bowl using lathe geometry
    const points: THREE.Vector2[] = [];
    // Floor level to upper deck
    points.push(new THREE.Vector2(18, 0));   // Court edge
    points.push(new THREE.Vector2(20, 1));   // Lower seating start
    points.push(new THREE.Vector2(25, 4));   // Lower bowl
    points.push(new THREE.Vector2(28, 7));   // Mid section
    points.push(new THREE.Vector2(32, 11));  // Upper bowl
    points.push(new THREE.Vector2(35, 16));  // Upper deck
    points.push(new THREE.Vector2(36, 18));  // Top rail
    points.push(new THREE.Vector2(35, 18.5));// Lip
    const geo = new THREE.LatheGeometry(points, 64);
    // Scale to make it oval
    geo.scale(1, 1, 0.7);
    return geo;
  }, []);

  return (
    <mesh geometry={bowlGeometry} position={[0, 0, 0]}>
      <meshStandardMaterial
        color="#0a0a1a"
        roughness={0.95}
        metalness={0.1}
        side={THREE.BackSide}
      />
    </mesh>
  );
}
