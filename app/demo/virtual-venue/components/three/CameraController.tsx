"use client";

import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface CameraControllerProps {
  activeView: "scoreboard" | "ribbon" | "courtside" | "all";
}

const VIEW_POSITIONS: Record<string, { pos: THREE.Vector3; target: THREE.Vector3 }> = {
  scoreboard: {
    pos: new THREE.Vector3(0, 12, 18),
    target: new THREE.Vector3(0, 14, 0),
  },
  ribbon: {
    pos: new THREE.Vector3(20, 12, 20),
    target: new THREE.Vector3(0, 8, 0),
  },
  courtside: {
    pos: new THREE.Vector3(8, 3, 16),
    target: new THREE.Vector3(0, 0.6, 0),
  },
  all: {
    pos: new THREE.Vector3(22, 16, 28),
    target: new THREE.Vector3(0, 6, 0),
  },
};

export default function CameraController({ activeView }: CameraControllerProps) {
  const { camera } = useThree();
  const currentPos = useRef(new THREE.Vector3(22, 16, 28));
  const currentTarget = useRef(new THREE.Vector3(0, 6, 0));
  const targetPos = useRef(new THREE.Vector3(22, 16, 28));
  const targetLookAt = useRef(new THREE.Vector3(0, 6, 0));

  useEffect(() => {
    const view = VIEW_POSITIONS[activeView] || VIEW_POSITIONS.all;
    targetPos.current.copy(view.pos);
    targetLookAt.current.copy(view.target);
  }, [activeView]);

  useFrame((_, delta) => {
    const lerpSpeed = 1.5 * delta;

    // Smooth position lerp
    currentPos.current.lerp(targetPos.current, Math.min(lerpSpeed, 1));
    currentTarget.current.lerp(targetLookAt.current, Math.min(lerpSpeed, 1));

    camera.position.copy(currentPos.current);
    camera.lookAt(currentTarget.current);
  });

  return null;
}
