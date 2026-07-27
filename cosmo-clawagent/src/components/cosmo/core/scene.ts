// The COSMO core: a settlement rail in three dimensions.
//
// Deliberately imperative three.js — no react-three-fiber. This file is
// loaded lazily and is the only place in the bundle that touches three, so
// keeping it free of a second abstraction keeps the chunk small and the
// lifecycle (create → animate → dispose) explicit.
//
// Everything is unlit MeshBasicMaterial. Two reasons: no light means no
// per-fragment lighting cost, and an unlit palette reads as instrumentation
// rather than as a rendered product shot.

import {
  AdditiveBlending,
  CatmullRomCurve3,
  Color,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  OctahedronGeometry,
  PerspectiveCamera,
  RingGeometry,
  Scene,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  WebGLRenderer,
} from 'three';
import { PHASE_INT } from '@/design/tokens';
import { PHASES } from '../phases';

const NODES = PHASES.length;
const PACKETS = 12;

// Control points of the rail. A gentle three-dimensional S — enough depth to
// read as space, flat enough to stay legible behind text.
const CONTROL: [number, number, number][] = [
  [-7.2, -0.55, -1.4],
  [-4.3, 0.4, 0.7],
  [-1.4, -0.3, -0.6],
  [1.4, 0.45, 0.8],
  [4.3, -0.35, -0.5],
  [7.2, 0.5, 1.0],
];

const TONE_ORDER = PHASES.map((p) => PHASE_INT[p.tone]);

export interface CoreHandle {
  setPhase(index: number): void;
  dispose(): void;
}

export function createCore(canvas: HTMLCanvasElement, initialPhase = 0): CoreHandle {
  const scene = new Scene();
  const camera = new PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0.9, 9.2);

  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setClearAlpha(0);

  const curve = new CatmullRomCurve3(CONTROL.map(([x, y, z]) => new Vector3(x, y, z)));
  const nodeAt = (i: number) => curve.getPointAt(i / (NODES - 1));

  // ── the rail itself ────────────────────────────────────────────────
  const railGeo = new TubeGeometry(curve, 220, 0.013, 8, false);
  const railMat = new MeshBasicMaterial({
    color: PHASE_INT.idle,
    transparent: true,
    opacity: 0.55,
  });
  const rail = new Mesh(railGeo, railMat);
  scene.add(rail);

  // A second, brighter tube covering only the on-chain stretch: the trust
  // boundary is visible in the geometry, not just in the copy.
  const firstOnchain = PHASES.findIndex((p) => p.onchain);
  const onchainPoints: Vector3[] = [];
  for (let i = 0; i <= 60; i++) {
    const t = (firstOnchain / (NODES - 1)) * (1 - i / 60) + (i / 60) * 1;
    onchainPoints.push(curve.getPointAt(t));
  }
  const onchainGeo = new TubeGeometry(new CatmullRomCurve3(onchainPoints), 120, 0.02, 8, false);
  const onchainMat = new MeshBasicMaterial({
    color: PHASE_INT.settled,
    transparent: true,
    opacity: 0.22,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  scene.add(new Mesh(onchainGeo, onchainMat));

  // ── phase nodes ────────────────────────────────────────────────────
  const ringGeo = new TorusGeometry(0.17, 0.012, 8, 48);
  const haloGeo = new RingGeometry(0.24, 0.34, 48);
  const coreGeo = new OctahedronGeometry(0.062, 0);

  const nodes: {
    group: Group;
    ring: MeshBasicMaterial;
    halo: MeshBasicMaterial;
    core: MeshBasicMaterial;
    pulse: number;
  }[] = [];

  for (let i = 0; i < NODES; i++) {
    const group = new Group();
    group.position.copy(nodeAt(i));

    const ringMat = new MeshBasicMaterial({ color: PHASE_INT.idle, transparent: true, opacity: 0.6 });
    const haloMat = new MeshBasicMaterial({
      color: TONE_ORDER[i],
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    const coreMat = new MeshBasicMaterial({ color: PHASE_INT.idle, transparent: true, opacity: 0.9 });

    group.add(new Mesh(ringGeo, ringMat));
    group.add(new Mesh(haloGeo, haloMat));
    group.add(new Mesh(coreGeo, coreMat));
    scene.add(group);
    nodes.push({ group, ring: ringMat, halo: haloMat, core: coreMat, pulse: 0 });
  }

  // ── the core object ────────────────────────────────────────────────
  // One slow wireframe icosahedron behind the rail: the settlement engine
  // the rail runs through. Low opacity — it is atmosphere, not a logo.
  const coreShellGeo = new IcosahedronGeometry(2.35, 1);
  const coreShellMat = new MeshBasicMaterial({
    color: PHASE_INT.active,
    wireframe: true,
    transparent: true,
    opacity: 0.07,
    depthWrite: false,
  });
  const coreShell = new Mesh(coreShellGeo, coreShellMat);
  coreShell.position.set(0, 0, -1.6);
  scene.add(coreShell);

  // ── job packets ────────────────────────────────────────────────────
  const packetGeo = new OctahedronGeometry(0.055, 0);
  const packetMat = new MeshBasicMaterial({ transparent: true, opacity: 0.95 });
  const packets = new InstancedMesh(packetGeo, packetMat, PACKETS);
  scene.add(packets);

  const dummy = new Object3D();
  const tint = new Color();
  const offsets = Array.from({ length: PACKETS }, (_, i) => i / PACKETS);
  const speeds = Array.from({ length: PACKETS }, (_, i) => 0.021 + ((i * 7) % 5) * 0.0032);
  const lastT = new Float32Array(PACKETS);

  for (let i = 0; i < PACKETS; i++) packets.setColorAt(i, tint.setHex(PHASE_INT.idle));

  // ── interaction: damped pointer parallax ───────────────────────────
  let pointerX = 0;
  let pointerY = 0;
  let camX = 0;
  let camY = 0;
  const onPointer = (e: PointerEvent) => {
    pointerX = (e.clientX / window.innerWidth - 0.5) * 2;
    pointerY = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  // ── phase state ────────────────────────────────────────────────────
  let phase = initialPhase;
  let phaseX = nodeAt(initialPhase).x * 0.28;

  // ── resize ─────────────────────────────────────────────────────────
  const resize = () => {
    const parent = canvas.parentElement;
    if (!parent) return;
    const { clientWidth: w, clientHeight: h } = parent;
    if (w === 0 || h === 0) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Keep the full rail in frame on narrow viewports.
    camera.position.z = w / h < 1.5 ? 12.5 : 9.2;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  if (canvas.parentElement) ro.observe(canvas.parentElement);
  resize();

  // ── render loop, paused when off-screen or backgrounded ────────────
  let raf = 0;
  let running = false;
  let elapsed = 0;
  let last = 0;

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    elapsed += dt;

    // packets travel; crossing a node fires that node's event pulse
    for (let i = 0; i < PACKETS; i++) {
      const t = (elapsed * speeds[i] + offsets[i]) % 1;
      const p = curve.getPointAt(t);
      dummy.position.copy(p);
      dummy.rotation.set(elapsed * 0.6 + i, elapsed * 0.45 + i, 0);
      const near = 1 - Math.min(1, Math.abs(t - phase / (NODES - 1)) * 6);
      dummy.scale.setScalar(0.85 + near * 0.5);
      dummy.updateMatrix();
      packets.setMatrixAt(i, dummy.matrix);

      const seg = Math.min(NODES - 1, Math.floor(t * (NODES - 1) + 0.5));
      packets.setColorAt(i, tint.setHex(TONE_ORDER[seg]));

      // node crossing
      const prev = lastT[i];
      if (t < prev) lastT[i] = t; // wrapped
      else {
        for (let n = 0; n < NODES; n++) {
          const nt = n / (NODES - 1);
          if (prev < nt && t >= nt) nodes[n].pulse = 1;
        }
        lastT[i] = t;
      }
    }
    packets.instanceMatrix.needsUpdate = true;
    if (packets.instanceColor) packets.instanceColor.needsUpdate = true;

    // nodes: reached phases carry their own tone, the active one breathes
    for (let n = 0; n < NODES; n++) {
      const node = nodes[n];
      const reached = n <= phase;
      const isActive = n === phase;
      node.pulse = Math.max(0, node.pulse - dt * 2.2);

      node.ring.color.setHex(reached ? TONE_ORDER[n] : PHASE_INT.idle);
      node.ring.opacity = reached ? 0.85 : 0.35;
      node.core.color.setHex(reached ? TONE_ORDER[n] : PHASE_INT.idle);
      node.core.opacity = reached ? 1 : 0.5;

      const breathe = isActive ? 0.16 + Math.sin(elapsed * 2.1) * 0.06 : 0;
      node.halo.opacity = Math.min(0.5, breathe + node.pulse * 0.34);
      node.group.scale.setScalar(1 + (isActive ? 0.14 : 0) + node.pulse * 0.16);
      node.group.quaternion.copy(camera.quaternion);
    }

    coreShell.rotation.y += dt * 0.055;
    coreShell.rotation.x += dt * 0.021;

    // camera drifts toward the active phase, plus damped pointer parallax
    const targetX = phaseX + pointerX * 0.5;
    const targetY = 0.9 - pointerY * 0.28;
    camX += (targetX - camX) * Math.min(1, dt * 2.4);
    camY += (targetY - camY) * Math.min(1, dt * 2.4);
    camera.position.x = camX;
    camera.position.y = camY;
    camera.lookAt(phaseX * 0.6, 0, 0);

    renderer.render(scene, camera);
  };

  const start = () => {
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  const io = new IntersectionObserver(
    ([entry]) => (entry.isIntersecting && !document.hidden ? start() : stop()),
    { threshold: 0 },
  );
  io.observe(canvas);

  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVisibility);

  return {
    setPhase(index: number) {
      phase = Math.min(NODES - 1, Math.max(0, index));
      phaseX = nodeAt(phase).x * 0.28;
    },
    dispose() {
      stop();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
      railGeo.dispose();
      onchainGeo.dispose();
      ringGeo.dispose();
      haloGeo.dispose();
      coreGeo.dispose();
      coreShellGeo.dispose();
      packetGeo.dispose();
      railMat.dispose();
      onchainMat.dispose();
      coreShellMat.dispose();
      packetMat.dispose();
      nodes.forEach((n) => {
        n.ring.dispose();
        n.halo.dispose();
        n.core.dispose();
      });
      packets.dispose();
      renderer.dispose();
    },
  };
}
