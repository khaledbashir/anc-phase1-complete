"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import ControlsHUDV2 from "./ControlsHUDV2";
import { VENUE_ZONES, CAMERA_PRESETS, SCENE_MOODS, VENUE_TYPES, SERVICES_MULTIPLIER, DEFAULT_MARGIN } from "../data/venueZones";
import type { SceneMood, VenueType } from "../data/venueZones";

/* ═══════════════════════════════════════════════════════════════════════════
   TEXTURE FACTORIES
   ═══════════════════════════════════════════════════════════════════════════ */

function makeTextTexture(text: string, w = 1024, h = 512): THREE.CanvasTexture {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#030812"); grad.addColorStop(1, "#0a1628");
  ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(10,82,239,0.04)"; ctx.lineWidth = 0.5;
  for (let x = 0; x < w; x += 4) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += 4) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "bold 72px 'Work Sans', sans-serif"; ctx.fillStyle = "#0A52EF";
  ctx.shadowColor = "#0A52EF"; ctx.shadowBlur = 40;
  ctx.fillText(text || "ANC PARTNER", w / 2, h / 2 - 24); ctx.shadowBlur = 0;
  ctx.font = "300 24px 'Work Sans', sans-serif"; ctx.fillStyle = "#03B8FF";
  ctx.fillText("PREMIUM LED DISPLAY", w / 2, h / 2 + 36);
  ctx.strokeStyle = "#0A52EF"; ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, 60, 2); ctx.strokeRect(20, 20, 2, 40);
  ctx.strokeRect(w - 80, h - 22, 60, 2); ctx.strokeRect(w - 22, h - 60, 2, 40);
  const tex = new THREE.CanvasTexture(c); tex.needsUpdate = true; return tex;
}

function makeLogoTexture(img: HTMLImageElement, multiply: boolean, w = 1024, h = 512): THREE.CanvasTexture {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#030812"; ctx.fillRect(0, 0, w, h);
  if (multiply) ctx.globalCompositeOperation = "screen";
  const scale = Math.min((w * 0.75) / img.width, (h * 0.75) / img.height);
  const dw = img.width * scale, dh = img.height * scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  ctx.globalCompositeOperation = "source-over";
  const tex = new THREE.CanvasTexture(c); tex.needsUpdate = true; return tex;
}

/* ═══════════════════════════════════════════════════════════════════════════
   SCENE REFS
   ═══════════════════════════════════════════════════════════════════════════ */

interface SceneRefs {
  scene: THREE.Scene;
  ambient: THREE.AmbientLight;
  spots: THREE.SpotLight[];
  courtMesh: THREE.Mesh;
  hazeParticles: THREE.Points;
  lightCones: THREE.Mesh[];
  bloomPass: UnrealBloomPass;
}

/* ═══════════════════════════════════════════════════════════════════════════
   BUILD PREMIUM 3D SCENE
   ═══════════════════════════════════════════════════════════════════════════ */

function buildScene(scene: THREE.Scene): Omit<SceneRefs, "scene" | "bloomPass"> {
  scene.fog = new THREE.FogExp2(0x020510, 0.011);

  // ── LIGHTING ──────────────────────────────────────────────────────────────
  const ambient = new THREE.AmbientLight(0x080820, 0.15);
  scene.add(ambient);
  const spots: THREE.SpotLight[] = [];

  const mainSpot = new THREE.SpotLight(0x6699ff, 150, 80, 0.7, 0.6, 1);
  mainSpot.position.set(0, 38, 0);
  mainSpot.castShadow = true;
  mainSpot.shadow.mapSize.set(1024, 1024);
  mainSpot.shadow.bias = -0.001;
  scene.add(mainSpot); spots.push(mainSpot);

  const keySpot = new THREE.SpotLight(0x0A52EF, 100, 80, 0.5, 0.7, 1);
  keySpot.position.set(25, 30, -20);
  scene.add(keySpot); spots.push(keySpot);

  const fillSpot = new THREE.SpotLight(0x03B8FF, 60, 70, 0.4, 0.9, 1);
  fillSpot.position.set(-25, 26, 18);
  scene.add(fillSpot); spots.push(fillSpot);

  const backSpot = new THREE.SpotLight(0x9933ff, 40, 60, 0.3, 0.8, 1.5);
  backSpot.position.set(0, 20, -35);
  scene.add(backSpot); spots.push(backSpot);

  const rimColors = [0x0A52EF, 0x03B8FF, 0x0A52EF, 0x03B8FF, 0x6633cc, 0x0A52EF];
  rimColors.forEach((color, i) => {
    const angle = (i / rimColors.length) * Math.PI * 2;
    const p = new THREE.PointLight(color, 15, 60, 1.5);
    p.position.set(Math.sin(angle) * 32, 3, Math.cos(angle) * 32 * 0.7);
    scene.add(p);
  });

  const sbGlow = new THREE.PointLight(0x0A52EF, 25, 30, 2);
  sbGlow.position.set(0, 10, 0); scene.add(sbGlow);

  // ── GROUND ────────────────────────────────────────────────────────────────
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(250, 250),
    new THREE.MeshStandardMaterial({ color: 0x020510, metalness: 0.7, roughness: 0.5 })
  );
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  // ── STADIUM BOWL ──────────────────────────────────────────────────────────
  const pts = [
    new THREE.Vector2(16, 0), new THREE.Vector2(17.5, 0.5), new THREE.Vector2(19, 1.5),
    new THREE.Vector2(21, 3), new THREE.Vector2(23, 5), new THREE.Vector2(25, 7),
    new THREE.Vector2(26.5, 9), new THREE.Vector2(28, 11), new THREE.Vector2(30, 13.5),
    new THREE.Vector2(32, 16), new THREE.Vector2(34, 18), new THREE.Vector2(35.5, 19.5),
    new THREE.Vector2(36, 20), new THREE.Vector2(35.8, 20.3),
  ];
  const bowlGeo = new THREE.LatheGeometry(pts, 96);
  bowlGeo.scale(1, 1, 0.7);
  scene.add(new THREE.Mesh(bowlGeo, new THREE.MeshStandardMaterial({
    color: 0x06060f, roughness: 0.92, metalness: 0.1, side: THREE.BackSide,
  })));

  // ── SEATING TIERS ─────────────────────────────────────────────────────────
  [5, 8, 11, 14, 17].forEach((y, i) => {
    const b = 0.02 + i * 0.005;
    const tier = new THREE.Mesh(
      new THREE.TorusGeometry(20 + i * 3.2, 0.6 + i * 0.1, 6, 96),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(b, b, b + 0.01), roughness: 0.95 })
    );
    tier.position.y = y; scene.add(tier);
  });

  // ── RAILINGS ──────────────────────────────────────────────────────────────
  const railMat = new THREE.MeshStandardMaterial({ color: 0x222233, metalness: 0.9, roughness: 0.2 });
  [7.5, 13, 18.5].forEach((y, i) => {
    const rail = new THREE.Mesh(new THREE.TorusGeometry(21.5 + i * 5, 0.05, 6, 96), railMat);
    rail.position.set(0, y, 0);
    scene.add(rail);
  });

  // ── LUXURY SUITES ─────────────────────────────────────────────────────────
  const suiteMat = new THREE.MeshStandardMaterial({ color: 0x0a0a18, roughness: 0.6, metalness: 0.3 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x1a2a4a, roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.4 });
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const suite = new THREE.Group();
    suite.position.set(Math.sin(angle) * 33, 17, Math.cos(angle) * 33 * 0.7);
    suite.lookAt(0, 17, 0);
    suite.add(new THREE.Mesh(new THREE.BoxGeometry(3, 2.5, 2), suiteMat));
    const g = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2), glassMat);
    g.position.z = 1.01; suite.add(g);
    scene.add(suite);
  }

  // ── REFLECTIVE COURT ──────────────────────────────────────────────────────
  const courtMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 9),
    new THREE.MeshStandardMaterial({ color: 0x3a2a10, roughness: 0.25, metalness: 0.15 })
  );
  courtMesh.rotation.x = -Math.PI / 2; courtMesh.position.y = 0.02;
  courtMesh.receiveShadow = true; scene.add(courtMesh);

  // Court lines
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 });
  const ccMesh = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.03, 8, 64), lineMat);
  ccMesh.rotation.x = -Math.PI / 2; ccMesh.position.y = 0.03; scene.add(ccMesh);
  const hcl = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 9), lineMat);
  hcl.rotation.x = -Math.PI / 2; hcl.position.y = 0.03; scene.add(hcl);
  [-5.5, 5.5].forEach(x => {
    const ftc = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.03, 8, 32), lineMat);
    ftc.rotation.x = -Math.PI / 2; ftc.position.set(x, 0.03, 0); scene.add(ftc);
  });

  // ── LIGHTING RIG ──────────────────────────────────────────────────────────
  const rigMat = new THREE.MeshStandardMaterial({ color: 0x0a0a14, metalness: 0.85, roughness: 0.2 });
  const rigO = new THREE.Mesh(new THREE.TorusGeometry(12, 0.2, 8, 64), rigMat);
  rigO.position.y = 24; scene.add(rigO);
  const rigI = new THREE.Mesh(new THREE.TorusGeometry(8, 0.12, 6, 48), rigMat);
  rigI.position.y = 24; scene.add(rigI);
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4, 6), rigMat);
    bar.position.set(Math.sin(a) * 10, 24, Math.cos(a) * 10);
    bar.rotation.z = Math.PI / 2; bar.rotation.y = a; scene.add(bar);
  }

  // ── VOLUMETRIC LIGHT CONES ────────────────────────────────────────────────
  const lightCones: THREE.Mesh[] = [];
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0x4488ff, transparent: true, opacity: 0.015,
    side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(6, 24, 16, 1, true), coneMat.clone());
    cone.position.set(Math.sin(a) * 10, 12, Math.cos(a) * 10);
    cone.rotation.x = Math.PI; scene.add(cone); lightCones.push(cone);
  }

  // ── CROWD (8000 colored points) ───────────────────────────────────────────
  const N = 8000;
  const cPos = new Float32Array(N * 3);
  const cCol = new Float32Array(N * 3);
  const pal = [
    [0.04,0.32,0.94],[0.1,0.23,0.67],[0.13,0.27,0.8],[0.2,0.27,0.53],
    [0.13,0.2,0.4],[0.87,0.87,0.93],[0.73,0.8,0.87],[0.33,0.4,0.67],
    [0.47,0.53,0.6],[0.93,0.27,0.27],[1,0.8,0],[0.04,0.72,1],
  ];
  for (let i = 0; i < N; i++) {
    const ang = Math.random() * Math.PI * 2;
    const t = 0.05 + Math.random() * 0.9;
    const r = 17 + t * 17;
    const y = t * 19 + 0.5;
    const j = (Math.random() - 0.5) * 0.8;
    cPos[i*3] = Math.sin(ang) * (r+j);
    cPos[i*3+1] = y;
    cPos[i*3+2] = Math.cos(ang) * (r+j) * 0.7;
    const c = pal[Math.floor(Math.random() * pal.length)];
    const v = 0.7 + Math.random() * 0.3;
    cCol[i*3] = c[0]*v; cCol[i*3+1] = c[1]*v; cCol[i*3+2] = c[2]*v;
  }
  const cGeo = new THREE.BufferGeometry();
  cGeo.setAttribute("position", new THREE.BufferAttribute(cPos, 3));
  cGeo.setAttribute("color", new THREE.BufferAttribute(cCol, 3));
  scene.add(new THREE.Points(cGeo, new THREE.PointsMaterial({
    size: 0.35, vertexColors: true, transparent: true, opacity: 0.85,
    sizeAttenuation: true, depthWrite: false,
  })));

  // ── ATMOSPHERIC HAZE ──────────────────────────────────────────────────────
  const hN = 3000;
  const hPos = new Float32Array(hN * 3);
  for (let i = 0; i < hN; i++) {
    hPos[i*3] = (Math.random()-0.5)*80;
    hPos[i*3+1] = Math.random()*30;
    hPos[i*3+2] = (Math.random()-0.5)*80;
  }
  const hGeo = new THREE.BufferGeometry();
  hGeo.setAttribute("position", new THREE.BufferAttribute(hPos, 3));
  const hazeParticles = new THREE.Points(hGeo, new THREE.PointsMaterial({
    color: 0x3366ff, size: 0.15, transparent: true, opacity: 0.12,
    sizeAttenuation: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  scene.add(hazeParticles);

  // ── TUNNEL ENTRANCES ──────────────────────────────────────────────────────
  const tunnelMat = new THREE.MeshStandardMaterial({ color: 0x020208, roughness: 1 });
  [0, Math.PI/2, Math.PI, Math.PI*1.5].forEach(a => {
    const t = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3.5, 2.5), tunnelMat);
    t.position.set(Math.sin(a)*18, 1.75, Math.cos(a)*18*0.7);
    t.rotation.y = a; scene.add(t);
    const gl = new THREE.PointLight(0x0A52EF, 3, 8, 2);
    gl.position.set(Math.sin(a)*17, 1.5, Math.cos(a)*17*0.7); scene.add(gl);
  });

  // ── SCORER'S TABLE ────────────────────────────────────────────────────────
  const table = new THREE.Mesh(new THREE.BoxGeometry(8, 0.5, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x1a1a2a, roughness: 0.6, metalness: 0.3 }));
  table.position.set(0, 0.25, -5.5);
  scene.add(table);

  return { ambient, spots, courtMesh, hazeParticles, lightCones };
}

/* ═══════════════════════════════════════════════════════════════════════════
   BUILD ZONE-GROUPED LED SCREENS
   ═══════════════════════════════════════════════════════════════════════════ */

function buildZoneGroups(scene: THREE.Scene, texture: THREE.Texture): Map<string, THREE.Group> {
  const zones = new Map<string, THREE.Group>();
  const mat = () => new THREE.MeshStandardMaterial({
    map: texture, emissiveMap: texture,
    emissive: new THREE.Color("#ffffff"), emissiveIntensity: 5, toneMapped: false,
  });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x111118, metalness: 0.8, roughness: 0.3 });
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.6, roughness: 0.5 });

  // ── Scoreboard ──
  const sb = new THREE.Group(); sb.name = "scoreboard"; sb.position.set(0, 14, 0);
  sb.add(new THREE.Mesh(new THREE.BoxGeometry(8, 4.5, 5), frameMat));
  [[-3,0,-2],[3,0,-2],[-3,0,2],[3,0,2]].forEach(p => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,10,6), new THREE.MeshStandardMaterial({color:0x222222,metalness:0.8}));
    c.position.set(p[0],5,p[2]); sb.add(c);
  });
  [1,-1].forEach(d => { const f = new THREE.Mesh(new THREE.PlaneGeometry(7.6,4.1), mat()); f.position.set(0,0,d*2.51); if(d===-1)f.rotation.y=Math.PI; sb.add(f); });
  [1,-1].forEach(d => { const f = new THREE.Mesh(new THREE.PlaneGeometry(4.6,4.1), mat()); f.position.set(d*4.01,0,0); f.rotation.y=d*Math.PI/2; sb.add(f); });
  const btm = new THREE.Mesh(new THREE.PlaneGeometry(7.6,4.6), mat()); btm.position.set(0,-2.26,0); btm.rotation.x=Math.PI/2; sb.add(btm);
  scene.add(sb); zones.set("scoreboard", sb);

  // ── Ribbon North ──
  const rnG = new THREE.Group(); rnG.name = "ribbon-north";
  const rnTex = texture.clone(); rnTex.wrapS = THREE.RepeatWrapping; rnTex.repeat.set(2,1); rnTex.needsUpdate = true;
  const rnMat = new THREE.MeshStandardMaterial({ map:rnTex, emissiveMap:rnTex, emissive:new THREE.Color("#ffffff"), emissiveIntensity:5, toneMapped:false, side:THREE.BackSide });
  const rn = new THREE.Mesh(new THREE.CylinderGeometry(25.5,25.5,1.2,64,1,true,0,Math.PI), rnMat);
  rn.position.set(0,8,0); rnG.add(rn);
  [0,1.5].forEach(dy => { const r = new THREE.Mesh(new THREE.TorusGeometry(26, dy===0?0.4:0.25, 8, 32, Math.PI), ringMat); r.position.y = 8+dy; rnG.add(r); });
  scene.add(rnG); zones.set("ribbon-north", rnG);

  // ── Ribbon South ──
  const rsG = new THREE.Group(); rsG.name = "ribbon-south";
  const rsTex = texture.clone(); rsTex.wrapS = THREE.RepeatWrapping; rsTex.repeat.set(2,1); rsTex.needsUpdate = true;
  const rsMat = new THREE.MeshStandardMaterial({ map:rsTex, emissiveMap:rsTex, emissive:new THREE.Color("#ffffff"), emissiveIntensity:5, toneMapped:false, side:THREE.BackSide });
  const rs = new THREE.Mesh(new THREE.CylinderGeometry(25.5,25.5,1.2,64,1,true,Math.PI,Math.PI), rsMat);
  rs.position.set(0,8,0); rsG.add(rs);
  [0,1.5].forEach(dy => { const r = new THREE.Mesh(new THREE.TorusGeometry(26, dy===0?0.4:0.25, 8, 32, Math.PI), ringMat); r.rotation.y=Math.PI; r.position.y=8+dy; rsG.add(r); });
  scene.add(rsG); zones.set("ribbon-south", rsG);

  // ── Fascia ──
  const faG = new THREE.Group(); faG.name = "fascia";
  const faTex = texture.clone(); faTex.wrapS = THREE.RepeatWrapping; faTex.repeat.set(6,1); faTex.needsUpdate = true;
  const faMat = new THREE.MeshStandardMaterial({ map:faTex, emissiveMap:faTex, emissive:new THREE.Color("#ffffff"), emissiveIntensity:3, toneMapped:false, side:THREE.BackSide });
  const fa = new THREE.Mesh(new THREE.CylinderGeometry(33,33,0.8,80,1,true), faMat);
  fa.position.y = 15; faG.add(fa);
  scene.add(faG); zones.set("fascia", faG);

  // ── Vomitory ──
  const voG = new THREE.Group(); voG.name = "vomitory";
  [0,Math.PI/3,(2*Math.PI)/3,Math.PI,(4*Math.PI)/3,(5*Math.PI)/3].forEach(a => {
    const r = 22, x = Math.sin(a)*r, z = Math.cos(a)*r*0.7;
    const g = new THREE.Group(); g.position.set(x,4,z); g.lookAt(0,4,0);
    g.add(new THREE.Mesh(new THREE.PlaneGeometry(2.5,1.5), mat()));
    const fr = new THREE.Mesh(new THREE.BoxGeometry(2.7,1.7,0.1), frameMat); fr.position.z=-0.06; g.add(fr);
    voG.add(g);
  });
  scene.add(voG); zones.set("vomitory", voG);

  // ── Concourse ──
  const coG = new THREE.Group(); coG.name = "concourse";
  ([[28,3,10,-0.3],[28,3,-10,-0.3],[-28,3,10,Math.PI+0.3],[-28,3,-10,Math.PI+0.3]] as [number,number,number,number][]).forEach(([x,y,z,rot]) => {
    const g = new THREE.Group(); g.position.set(x,y,z); g.rotation.y = rot;
    g.add(new THREE.Mesh(new THREE.PlaneGeometry(4,2.5), mat()));
    const fr = new THREE.Mesh(new THREE.BoxGeometry(4.2,2.7,0.15), frameMat); fr.position.z=-0.08; g.add(fr);
    coG.add(g);
  });
  scene.add(coG); zones.set("concourse", coG);

  // ── Marquee ──
  const maG = new THREE.Group(); maG.name = "marquee"; maG.position.set(0,6,40);
  maG.add(new THREE.Mesh(new THREE.PlaneGeometry(12,5), mat()));
  const mfr = new THREE.Mesh(new THREE.BoxGeometry(12.4,5.4,0.3), frameMat); mfr.position.z=-0.16; maG.add(mfr);
  [-6,6].forEach(x => { const col = new THREE.Mesh(new THREE.BoxGeometry(0.3,8,0.3), new THREE.MeshStandardMaterial({color:0x111111,metalness:0.7})); col.position.set(x,-2,-0.16); maG.add(col); });
  scene.add(maG); zones.set("marquee", maG);

  // ── Courtside boards ──
  const csG = new THREE.Group(); csG.name = "courtside-boards";
  [{pos:[0,0.6,-10],rot:0,w:14},{pos:[0,0.6,10],rot:Math.PI,w:14},{pos:[-12,0.6,0],rot:Math.PI/2,w:8},{pos:[12,0.6,0],rot:-Math.PI/2,w:8}].forEach(cfg => {
    const g = new THREE.Group(); g.position.set(cfg.pos[0],cfg.pos[1],cfg.pos[2]); g.rotation.y=cfg.rot;
    const fr = new THREE.Mesh(new THREE.BoxGeometry(cfg.w+0.3,1.1,0.15), frameMat); fr.position.z=-0.08; g.add(fr);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(cfg.w,0.9), mat()); f.position.z=0.01; g.add(f);
    [-cfg.w/2+0.5, cfg.w/2-0.5].forEach(x => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08,0.5,0.15), new THREE.MeshStandardMaterial({color:0x111111}));
      leg.position.set(x,-0.35,-0.1); g.add(leg);
    });
    csG.add(g);
  });
  scene.add(csG);

  return zones;
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOADING OVERLAY
   ═══════════════════════════════════════════════════════════════════════════ */

function LoadingOverlay() {
  return (
    <div className="absolute inset-0 z-30 bg-[#030812] flex flex-col items-center justify-center">
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-full border-2 border-[#0A52EF]/20 animate-ping" />
        <div className="absolute inset-2 rounded-full border-2 border-t-[#0A52EF] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        <div className="absolute inset-4 rounded-full border border-[#03B8FF]/30 animate-pulse" />
      </div>
      <p className="text-sm text-slate-300 font-semibold tracking-wide">Loading Arena</p>
      <p className="text-[10px] text-slate-500 mt-1.5">Initializing premium 3D environment</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function VenueCanvasV2() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const bloomRef = useRef<UnrealBloomPass | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const zoneGroupsRef = useRef<Map<string, THREE.Group>>(new Map());
  const sceneRefsRef = useRef<Omit<SceneRefs, "scene" | "bloomPass"> | null>(null);
  const animIdRef = useRef<number>(0);

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
  const autoTourRef = useRef(false);
  const autoTourTimerRef = useRef(0);
  const autoTourIndexRef = useRef(0);

  const camTarget = useRef({ pos: new THREE.Vector3(22, 16, 28), look: new THREE.Vector3(0, 6, 0) });
  const camCurrent = useRef({ pos: new THREE.Vector3(22, 16, 28), look: new THREE.Vector3(0, 6, 0) });

  const toggleZone = useCallback((zoneId: string) => {
    setActiveZoneIds(prev => { const n = new Set(prev); if (n.has(zoneId)) n.delete(zoneId); else n.add(zoneId); return n; });
  }, []);
  const setZoneSet = useCallback((ids: string[]) => { setActiveZoneIds(new Set(ids)); }, []);

  const takeScreenshot = useCallback(() => {
    const r = rendererRef.current, s = sceneRef.current, c = cameraRef.current;
    if (!r || !s || !c) return;
    r.render(s, c);
    const url = r.domElement.toDataURL("image/png");
    const a = document.createElement("a"); a.href = url;
    a.download = `${(clientName || "ANC_Arena").replace(/[^a-zA-Z0-9]/g, "_")}_V2.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }, [clientName]);

  // ── INIT THREE.JS + POST-PROCESSING ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 200);
    camera.position.set(22, 16, 28);
    cameraRef.current = camera;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const refs = buildScene(scene);
    sceneRefsRef.current = refs;

    // LED screens
    const tex = makeTextTexture("");
    const zoneGroups = buildZoneGroups(scene, tex);
    zoneGroupsRef.current = zoneGroups;

    // ── POST-PROCESSING: the killer feature ──
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0.8,   // strength — LED glow intensity
      0.4,   // radius — how far glow spreads
      0.85   // threshold — only bright things bloom
    );
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());
    composerRef.current = composer;
    bloomRef.current = bloomPass;

    // Controls
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

    // ── ANIMATION LOOP ──
    const clock = new THREE.Clock();
    let elapsed = 0;
    function animate() {
      animIdRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      elapsed += delta;

      // Smooth camera
      camCurrent.current.pos.lerp(camTarget.current.pos, Math.min(2 * delta, 1));
      camCurrent.current.look.lerp(camTarget.current.look, Math.min(2 * delta, 1));
      camera.position.copy(camCurrent.current.pos);
      controls.target.copy(camCurrent.current.look);
      controls.update();

      // Animate ribbon/fascia scroll
      zoneGroupsRef.current.forEach(group => {
        if (!group.visible) return;
        group.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            const t = child.material.map;
            if (t && t.wrapS === THREE.RepeatWrapping) t.offset.x += delta * 0.03;
          }
        });
      });

      // Animate haze drift
      if (refs.hazeParticles) {
        refs.hazeParticles.rotation.y += delta * 0.008;
        refs.hazeParticles.position.y = Math.sin(elapsed * 0.3) * 0.3;
      }

      // Animate light cone opacity pulse
      refs.lightCones.forEach((cone, i) => {
        const m = cone.material as THREE.MeshBasicMaterial;
        m.opacity = 0.01 + Math.sin(elapsed * 0.8 + i * 0.7) * 0.008;
      });

      // LED screen pulse (subtle emissive breathing)
      const pulse = 1 + Math.sin(elapsed * 1.5) * 0.08;
      zoneGroupsRef.current.forEach(group => {
        if (!group.visible) return;
        group.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial && child.material.emissiveMap) {
            child.material.emissiveIntensity = 5 * pulse;
          }
        });
      });

      // Auto-tour
      if (autoTourRef.current) {
        autoTourTimerRef.current += delta;
        if (autoTourTimerRef.current > 6) {
          autoTourTimerRef.current = 0;
          autoTourIndexRef.current = (autoTourIndexRef.current + 1) % CAMERA_PRESETS.length;
          const p = CAMERA_PRESETS[autoTourIndexRef.current];
          camTarget.current.pos.set(...p.pos);
          camTarget.current.look.set(...p.target);
        }
      }

      // Render through post-processing pipeline
      composer.render();
    }
    animate();
    setIsReady(true);

    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
      composer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animIdRef.current);
      controls.dispose(); renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  // Sync autoTour ref
  useEffect(() => { autoTourRef.current = autoTour; }, [autoTour]);

  // Zone visibility
  useEffect(() => {
    zoneGroupsRef.current.forEach((group, zoneId) => {
      group.visible = beforeAfter ? false : activeZoneIds.has(zoneId);
    });
  }, [activeZoneIds, beforeAfter]);

  // Scene mood
  useEffect(() => {
    const refs = sceneRefsRef.current;
    const renderer = rendererRef.current;
    const bloom = bloomRef.current;
    if (!refs || !renderer) return;
    const mood = SCENE_MOODS.find(m => m.id === sceneMoodId) || SCENE_MOODS[0];
    refs.ambient.intensity = mood.ambientIntensity;
    refs.spots.forEach(s => { s.intensity = mood.spotIntensity; });
    if (sceneRef.current?.fog instanceof THREE.FogExp2) {
      sceneRef.current.fog.color.setHex(mood.fogColor);
    }
    renderer.toneMappingExposure = mood.exposure;
    // Adjust bloom per mood
    if (bloom) {
      bloom.strength = mood.screenGlow > 4 ? 1.2 : mood.screenGlow > 3 ? 0.9 : 0.6;
    }
    zoneGroupsRef.current.forEach(group => {
      group.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial && child.material.emissiveMap) {
          child.material.emissiveIntensity = mood.screenGlow;
          child.material.needsUpdate = true;
        }
      });
    });
  }, [sceneMoodId]);

  // Venue type
  useEffect(() => {
    const refs = sceneRefsRef.current;
    if (!refs) return;
    const vt = VENUE_TYPES.find(v => v.id === venueTypeId) || VENUE_TYPES[0];
    const m = refs.courtMesh.material as THREE.MeshStandardMaterial;
    m.color.setHex(vt.courtColor);
    m.roughness = vt.id === "nhl" ? 0.1 : vt.id === "nba" ? 0.25 : 0.7;
    m.metalness = vt.id === "nhl" ? 0.5 : vt.id === "nba" ? 0.15 : 0.05;
    m.needsUpdate = true;
    refs.courtMesh.geometry.dispose();
    refs.courtMesh.geometry = new THREE.PlaneGeometry(vt.courtW, vt.courtH);
  }, [venueTypeId]);

  // Presentation mode resize
  useEffect(() => {
    const container = containerRef.current, camera = cameraRef.current, renderer = rendererRef.current, composer = composerRef.current;
    if (!container || !camera || !renderer || !composer) return;
    requestAnimationFrame(() => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
      composer.setSize(container.clientWidth, container.clientHeight);
    });
  }, [presentationMode]);

  // ESC to exit presentation
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && presentationMode) { setPresentationMode(false); setAutoTour(false); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [presentationMode]);

  // Camera preset
  useEffect(() => {
    const p = CAMERA_PRESETS.find(p => p.id === activeCameraId) || CAMERA_PRESETS[0];
    camTarget.current.pos.set(...p.pos);
    camTarget.current.look.set(...p.target);
    if (controlsRef.current) controlsRef.current.autoRotate = p.autoRotate;
  }, [activeCameraId]);

  // Texture update
  useEffect(() => {
    const updateGroupTextures = (baseTex: THREE.Texture) => {
      zoneGroupsRef.current.forEach(group => {
        group.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial && child.material.emissiveMap) {
            const old = child.material.map;
            let t = baseTex;
            if (old && old.wrapS === THREE.RepeatWrapping) {
              t = baseTex.clone(); t.wrapS = THREE.RepeatWrapping; t.repeat.copy(old.repeat); t.needsUpdate = true;
            }
            child.material.map = t;
            child.material.emissiveMap = t;
            child.material.emissiveIntensity = brightness * 5;
            child.material.needsUpdate = true;
          }
        });
      });
    };
    if (logoFile) {
      const url = URL.createObjectURL(logoFile);
      setLogoPreviewUrl(url);
      const img = new Image();
      img.onload = () => updateGroupTextures(makeLogoTexture(img, multiplyBlend));
      img.src = url;
      return () => URL.revokeObjectURL(url);
    } else {
      setLogoPreviewUrl(null);
      updateGroupTextures(makeTextTexture(clientName));
    }
  }, [logoFile, clientName, brightness, multiplyBlend]);

  // Pricing
  const activeZoneData = VENUE_ZONES.filter(z => activeZoneIds.has(z.id));
  const totalHardware = activeZoneData.reduce((s, z) => s + z.defaultWidthFt * z.defaultHeightFt * z.costPerSqFt * z.quantity, 0);
  const totalProject = totalHardware * (1 + SERVICES_MULTIPLIER);
  const totalSell = totalProject > 0 ? totalProject / (1 - DEFAULT_MARGIN) : 0;
  const totalAnnualRevenue = activeZoneData.reduce((s, z) => s + z.annualSponsorRevenue, 0);

  return (
    <div className="relative w-full h-screen bg-[#030812] overflow-hidden">
      {!isReady && <LoadingOverlay />}

      {!presentationMode && (
        <ControlsHUDV2
          activeCameraId={activeCameraId} setActiveCameraId={setActiveCameraId}
          brightness={brightness} setBrightness={setBrightness}
          multiplyBlend={multiplyBlend} setMultiplyBlend={setMultiplyBlend}
          clientName={clientName} setClientName={setClientName}
          logoFile={logoFile} setLogoFile={setLogoFile} logoPreviewUrl={logoPreviewUrl}
          activeZoneIds={activeZoneIds} toggleZone={toggleZone} setZoneSet={setZoneSet}
          totalHardware={totalHardware} totalSell={totalSell} totalAnnualRevenue={totalAnnualRevenue}
          activeZoneCount={activeZoneData.length} takeScreenshot={takeScreenshot}
          sceneMoodId={sceneMoodId} setSceneMoodId={setSceneMoodId}
          venueTypeId={venueTypeId} setVenueTypeId={setVenueTypeId}
          beforeAfter={beforeAfter} setBeforeAfter={setBeforeAfter}
          autoTour={autoTour} setAutoTour={setAutoTour}
          onPresentationMode={() => { setPresentationMode(true); setAutoTour(true); }}
        />
      )}

      <div ref={containerRef} className={`absolute inset-0 ${presentationMode ? "" : "pl-[380px]"}`} />

      {presentationMode && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          <div className="absolute top-8 right-8 text-right pointer-events-auto">
            <p className="text-2xl font-bold text-white/[0.07] uppercase tracking-[0.3em]">ANC Sports</p>
            {clientName && <p className="text-lg text-white/[0.05] mt-1 tracking-widest">{clientName}</p>}
          </div>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto">
            <button
              onClick={() => { setPresentationMode(false); setAutoTour(false); }}
              className="px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-[11px] text-white/30 hover:text-white/70 transition-all border border-white/[0.04] hover:border-white/[0.1] backdrop-blur-sm"
            >Press ESC or click to exit presentation</button>
          </div>
          <div className="absolute bottom-8 left-8">
            <div className="flex items-center gap-5 text-[11px] text-white/20">
              <span><strong className="text-white/30">{activeZoneData.length}</strong>/{VENUE_ZONES.length} zones</span>
              <span>Sell: <strong className="text-emerald-400/40">${(totalSell / 1000).toFixed(0)}K</strong></span>
              <span>Rev: <strong className="text-amber-400/40">${(totalAnnualRevenue / 1000000).toFixed(1)}M</strong>/yr</span>
            </div>
          </div>
        </div>
      )}

      {!presentationMode && (
        <div className="absolute bottom-0 left-[380px] right-0 z-10 bg-gradient-to-t from-black/80 to-transparent px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6 text-[11px] text-slate-400">
            <span><strong className="text-white">{activeZoneData.length}</strong> / {VENUE_ZONES.length} zones active</span>
            <span>Hardware: <strong className="text-blue-400">${(totalHardware / 1000).toFixed(0)}K</strong></span>
            <span>Sell: <strong className="text-emerald-400">${(totalSell / 1000).toFixed(0)}K</strong></span>
            <span>Sponsor Rev: <strong className="text-amber-400">${(totalAnnualRevenue / 1000000).toFixed(1)}M</strong>/yr</span>
          </div>
          <span className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">ANC Sports · Virtual Venue V2 · Bloom Engine</span>
        </div>
      )}
    </div>
  );
}
