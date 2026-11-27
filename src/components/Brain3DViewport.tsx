import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ChevronDown,
  ChevronUp,
  Download,
  Lock,
  Pause,
  Play,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  buildProceduralBrainScene,
  type BrainSceneHandles,
} from '../three/proceduralBrain';
import type {
  BrainThoughtNode,
  EmployeeProfile,
  GraphicsQuality,
  SkillDefinition,
} from '../types/nexus';

interface Brain3DViewportProps {
  skills: SkillDefinition[];
  employees: EmployeeProfile[];
  nodes: BrainThoughtNode[];
  maxConnections: number;
  metadataBytes: number;
  graphicsQuality: GraphicsQuality;
  selectedKey: string | null;
  onSelectKey: (key: string) => void;
  onUpdateLimit: (nextLimit: number) => void;
  onExportMentality: () => void;
}

const _projVec = new THREE.Vector3();
const _dragSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 4.2);
const _camPlane = new THREE.Plane();
const _camNormal = new THREE.Vector3();
const _hitPoint = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export const Brain3DViewport: React.FC<Brain3DViewportProps> = ({
  skills,
  employees,
  nodes,
  maxConnections,
  metadataBytes,
  graphicsQuality,
  selectedKey,
  onSelectKey,
  onUpdateLimit,
  onExportMentality,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const coreLabelRef = useRef<HTMLButtonElement | null>(null);
  const latestThoughtLabelRef = useRef<HTMLButtonElement | null>(null);
  const pulseRingRef = useRef<HTMLDivElement | null>(null);
  const skillLabelRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [hudCollapsed, setHudCollapsed] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );
  const [autoRotate, setAutoRotate] = useState(false);
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [limitDraft, setLimitDraft] = useState(String(maxConnections));
  const [pulseEvent, setPulseEvent] = useState<{
    seq: number;
    skillId: string;
    thoughtId: string;
    concept: string;
  } | null>(null);

  const prevNodesCountRef = useRef(nodes.length);
  const lastPulsedIdRef = useRef<string | null>(null);

  useEffect(() => {
    setLimitDraft(String(maxConnections));
  }, [maxConnections]);

  useEffect(() => {
    const newest = nodes[0];
    if (!newest) {
      prevNodesCountRef.current = nodes.length;
      return;
    }
    const isNewCount = nodes.length > prevNodesCountRef.current;
    const isRecentlyBorn = Date.now() - Date.parse(newest.createdAt) < 12000;

    if ((isNewCount || isRecentlyBorn) && lastPulsedIdRef.current !== newest.id) {
      lastPulsedIdRef.current = newest.id;
      setPulseEvent((prev) => ({
        seq: (prev?.seq ?? 0) + 1,
        skillId: newest.skillId,
        thoughtId: newest.id,
        concept: newest.concept,
      }));
      const timer = window.setTimeout(() => {
        setPulseEvent((cur) => (cur?.thoughtId === newest.id ? null : cur));
      }, 3200);
      prevNodesCountRef.current = nodes.length;
      return () => window.clearTimeout(timer);
    }
    prevNodesCountRef.current = nodes.length;
  }, [nodes]);

  const stateRef = useRef({
    skills,
    employees,
    nodes,
    graphicsQuality,
    selectedKey,
    autoRotate,
  });
  stateRef.current = {
    skills,
    employees,
    nodes,
    graphicsQuality,
    selectedKey,
    autoRotate,
  };

  const onSelectRef = useRef(onSelectKey);
  onSelectRef.current = onSelectKey;

  const brainRef = useRef<BrainSceneHandles | null>(null);
  const cameraApiRef = useRef<{
    zoomBy: (factor: number) => void;
    resetView: () => void;
  } | null>(null);

  // Sync dynamic thought ramifications & skill states into WebGL without rebuilding renderer
  useEffect(() => {
    brainRef.current?.syncWithState(skills, employees, nodes, selectedKey);
  }, [skills, employees, nodes, selectedKey]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 260);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setSize(width, height);

    const q = stateRef.current.graphicsQuality;
    const pixelRatio = isSoftwareGl
      ? 1
      : q === 'low'
      ? 1
      : q === 'medium'
      ? Math.min(window.devicePixelRatio, 1.5)
      : Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070a10);
    scene.fog = new THREE.FogExp2(0x070a10, 0.014);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 140);
    camera.position.set(0, 4.4, width < 640 ? 21.5 : 17.5);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.enablePan = false;
    controls.minDistance = 6.2;
    controls.maxDistance = 30;
    controls.autoRotateSpeed = 0.7;
    controls.target.set(0, 0, 0);
    controls.update();

    const hemiLight = new THREE.HemisphereLight(0x67e8f9, 0x090d16, 0.9);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xe0f2fe, 1.75);
    keyLight.position.set(14, 18, 14);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xa855f7, 0.8);
    rimLight.position.set(-14, -8, -12);
    scene.add(rimLight);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const brain = buildProceduralBrainScene(
      stateRef.current.skills,
      stateRef.current.employees,
      stateRef.current.nodes,
      maxAnisotropy
    );
    scene.add(brain.root);
    brainRef.current = brain;

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    cameraApiRef.current = {
      zoomBy: (factor) => {
        const dir = camera.position.clone().sub(controls.target);
        const nextDist = THREE.MathUtils.clamp(dir.length() * factor, 6.2, 30);
        dir.normalize().multiplyScalar(nextDist);
        camera.position.copy(controls.target).add(dir);
        controls.update();
      },
      resetView: () => {
        const w = container.clientWidth || width;
        camera.position.set(0, 4.4, w < 640 ? 21.5 : 17.5);
        controls.target.set(0, 0, 0);
        controls.update();
      },
    };

    // Raycaster for clicking & dragging individual neuron spheres along their orbit
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointerNdc = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };
    let activeDragKey: string | null = null;
    let activeDragRadius = 4.2;

    const updatePointerNdc = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
      updatePointerNdc(e.clientX, e.clientY);
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(brain.getInteractables(), false);
      if (hits.length > 0) {
        const data = hits[0].object.userData as {
          nodeKind?: 'core' | 'skill' | 'thought';
          nodeKey?: string;
        };
        if (data.nodeKey && (data.nodeKind === 'skill' || data.nodeKind === 'thought')) {
          activeDragKey = data.nodeKey;
          if (data.nodeKind === 'skill') {
            const anchor = brain.skillAnchors.get(data.nodeKey.slice('skill:'.length));
            activeDragRadius = anchor?.orbitRadius ?? 4.2;
          } else {
            const tv = brain.thoughtNodes.get(data.nodeKey.slice('thought:'.length));
            activeDragRadius = tv?.orbitRadius ?? 5.8;
          }
          _dragSphere.radius = activeDragRadius;
          controls.enabled = false;
          setIsDraggingNode(true);
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!activeDragKey) return;
      updatePointerNdc(e.clientX, e.clientY);
      raycaster.setFromCamera(pointerNdc, camera);
      let intersected = raycaster.ray.intersectSphere(_dragSphere, _hitPoint);
      if (!intersected) {
        camera.getWorldDirection(_camNormal);
        _camPlane.setFromNormalAndCoplanarPoint(_camNormal, _dragSphere.center);
        if (raycaster.ray.intersectPlane(_camPlane, _hitPoint)) {
          _hitPoint.normalize().multiplyScalar(activeDragRadius);
          intersected = _hitPoint;
        }
      }
      if (intersected) {
        brain.setDraggedPosition(activeDragKey, intersected);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(
        e.clientX - pointerDownPos.x,
        e.clientY - pointerDownPos.y
      );

      if (activeDragKey) {
        if (dist < 6) {
          onSelectRef.current(activeDragKey);
        }
        activeDragKey = null;
        controls.enabled = true;
        setIsDraggingNode(false);
        return;
      }

      if (dist >= 7) return;
      updatePointerNdc(e.clientX, e.clientY);
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(brain.getInteractables(), false);
      if (hits.length > 0) {
        const key = String(hits[0].object.userData?.nodeKey ?? 'core');
        onSelectRef.current(key);
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(entry.contentRect.width, 280);
        const h = Math.max(entry.contentRect.height, 240);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    const updateProjectedLabel = (
      el: HTMLButtonElement | null,
      worldPos: THREE.Vector3,
      viewW: number,
      viewH: number
    ) => {
      if (!el) return;
      _projVec.copy(worldPos).project(camera);
      if (_projVec.z < -1 || _projVec.z > 1) {
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        return;
      }
      const sx = (_projVec.x * 0.5 + 0.5) * viewW;
      const sy = (-_projVec.y * 0.5 + 0.5) * viewH;
      if (sx < 24 || sx > viewW - 24 || sy < 24 || sy > viewH - 24) {
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        return;
      }
      el.style.opacity = '1';
      el.style.pointerEvents = 'auto';
      el.style.transform = `translate3d(${Math.round(sx)}px, ${Math.round(sy)}px, 0) translate(-50%, -125%)`;
    };

    let disposed = false;
    let frameId = 0;
    const clock = new THREE.Clock();

    const afterDraw = (cb: () => void) => {
      frameId = window.setTimeout(() => {
        if (!disposed) requestAnimationFrame(cb);
      }, 80);
    };

    const tick = () => {
      if (disposed) return;
      const elapsed = clock.getElapsedTime();

      controls.autoRotate = stateRef.current.autoRotate && !activeDragKey;
      controls.update();

      brain.animate(elapsed, stateRef.current.selectedKey);

      const viewW = container.clientWidth || width;
      const viewH = container.clientHeight || height;
      updateProjectedLabel(
        coreLabelRef.current,
        new THREE.Vector3(0, 2.25, 0),
        viewW,
        viewH
      );

      if (pulseRingRef.current) {
        _projVec.set(0, 0, 0).project(camera);
        if (_projVec.z >= -1 && _projVec.z <= 1) {
          const cx = (_projVec.x * 0.5 + 0.5) * viewW;
          const cy = (-_projVec.y * 0.5 + 0.5) * viewH;
          pulseRingRef.current.style.transform = `translate3d(${Math.round(cx)}px, ${Math.round(cy)}px, 0) translate(-50%, -50%)`;
          pulseRingRef.current.style.opacity = '1';
        } else {
          pulseRingRef.current.style.opacity = '0';
        }
      }

      for (const anchor of brain.skillAnchors.values()) {
        const el = skillLabelRefs.current[anchor.skillId] ?? null;
        updateProjectedLabel(el, anchor.position, viewW, viewH);
      }

      const newestThought = stateRef.current.nodes[0];
      if (newestThought) {
        const tv = brain.thoughtNodes.get(newestThought.id);
        if (tv) {
          updateProjectedLabel(
            latestThoughtLabelRef.current,
            tv.position,
            viewW,
            viewH
          );
        }
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      brain.dispose();
      envRT.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const reachedLimit = nodes.length >= maxConnections;
  const kbSize = (metadataBytes / 1024).toFixed(2);

  const handleApplyLimit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(limitDraft);
    if (Number.isFinite(parsed)) {
      onUpdateLimit(parsed);
    }
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-[#070A10]">
      <div
        ref={mountRef}
        data-testid="nexus-brain-3d-canvas"
        className={`w-full h-full ${
          isDraggingNode ? 'cursor-grabbing' : 'cursor-grab active:cursor-grabbing'
        }`}
      />

      {/* Projected 3D labels & Framer Motion synaptic pulse shockwave */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
        <div
          ref={pulseRingRef}
          style={{ left: '50%', top: '50%', opacity: 0 }}
          className="pointer-events-none absolute"
        >
          <AnimatePresence>
            {pulseEvent && (
              <motion.div
                key={`wave-${pulseEvent.seq}`}
                initial={{ width: 64, height: 64, opacity: 0.88 }}
                animate={{ width: 320, height: 320, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.45, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-full border-2 border-cyan-400/80 shadow-[0_0_28px_rgba(34,211,238,0.45)]"
              />
            )}
          </AnimatePresence>
        </div>

        <button
          ref={coreLabelRef}
          type="button"
          onClick={() => onSelectKey('core')}
          style={{ left: 0, top: 0, opacity: 0 }}
          className={`pointer-events-auto absolute px-2.5 py-1 rounded-md border text-[11px] font-display font-bold tracking-wider cursor-pointer whitespace-nowrap shadow-lg transition-all ${
            pulseEvent ? 'nexus-neuron-pulsing' : ''
          } ${
            selectedKey === 'core'
              ? 'bg-[#0C1824] border-cyan-400 text-cyan-300'
              : 'bg-[#091018]/90 border-emerald-500/60 text-emerald-300'
          }`}
        >
          NEXUS MIND
        </button>

        {skills.map((skill) => {
          const key = `skill:${skill.id}`;
          const isSelected = selectedKey === key;
          const isPulsingSkill = pulseEvent?.skillId === skill.id;
          const shortName =
            skill.name.length > 22 ? `${skill.name.slice(0, 20)}...` : skill.name;
          return (
            <button
              key={skill.id}
              ref={(el) => {
                skillLabelRefs.current[skill.id] = el;
              }}
              type="button"
              onClick={() => onSelectKey(key)}
              style={{ left: 0, top: 0, opacity: 0 }}
              className={`pointer-events-auto absolute px-2 py-0.5 rounded border text-[10px] font-medium cursor-pointer whitespace-nowrap transition-shadow ${
                isPulsingSkill ? 'nexus-neuron-pulsing' : ''
              } ${
                isSelected || isPulsingSkill
                  ? 'inline-flex bg-[#101A29] border-cyan-400 text-white'
                  : 'hidden sm:inline-flex bg-[#090D15]/85 border-slate-700/80 text-slate-300 hover:border-cyan-500/60'
              }`}
            >
              {shortName}
            </button>
          );
        })}

        {nodes[0] && (
          <button
            ref={latestThoughtLabelRef}
            type="button"
            onClick={() => onSelectKey(`thought:${nodes[0].id}`)}
            style={{ left: 0, top: 0, opacity: 0 }}
            className={`pointer-events-auto absolute px-2 py-0.5 rounded border text-[10px] font-medium cursor-pointer whitespace-nowrap ${
              pulseEvent?.thoughtId === nodes[0].id
                ? 'nexus-neuron-pulsing bg-[#0E1E2B] border-emerald-400 text-emerald-200'
                : 'hidden sm:inline-flex bg-[#091018]/85 border-cyan-500/50 text-cyan-200'
            }`}
          >
            {nodes[0].concept.length > 26
              ? `${nodes[0].concept.slice(0, 24)}...`
              : nodes[0].concept}
          </button>
        )}
      </div>

      {/* Top-Left Read-Only Telemetry */}
      <div className="pointer-events-none absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2.5 px-3 py-2 rounded-lg border border-slate-800 bg-[#090D14]/92 text-xs text-slate-300 max-w-[92vw]">
        <span className="inline-flex items-center gap-1.5 font-semibold text-cyan-300 whitespace-nowrap">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          Somente Leitura
        </span>
        <span aria-hidden="true" className="text-slate-600">
          ·
        </span>
        <span className="font-mono tabular-nums whitespace-nowrap inline-flex items-center">
          <motion.strong
            key={nodes.length}
            initial={{ scale: 1.32, color: '#22d3ee' }}
            animate={{ scale: 1, color: reachedLimit ? '#fcd34d' : '#34d399' }}
            transition={{ type: 'spring', stiffness: 360, damping: 20 }}
            className="inline-block"
          >
            {nodes.length}
          </motion.strong>
          /{maxConnections} conexões
        </span>
        <span aria-hidden="true" className="text-slate-600">
          ·
        </span>
        <span className="font-mono tabular-nums text-slate-400 whitespace-nowrap">
          {kbSize} KB
        </span>
      </div>

      {/* Collapsible Bottom Control Dock */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center max-w-[96vw]">
        <button
          type="button"
          onClick={() => setHudCollapsed((c) => !c)}
          className="pointer-events-auto mb-1.5 inline-flex items-center gap-1 px-3 py-1 rounded-t-lg border border-slate-700 bg-[#0B1018]/95 text-[11px] font-medium text-slate-300 hover:text-white cursor-pointer"
        >
          {hudCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Controles do Cérebro</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Ocultar Controles</span>
            </>
          )}
        </button>

        {!hudCollapsed && (
          <div className="pointer-events-auto flex flex-wrap sm:flex-nowrap items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-slate-700/90 bg-[#0B1018]/95 shadow-2xl">
            <button
              type="button"
              onClick={() => setAutoRotate((r) => !r)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] sm:text-xs font-medium cursor-pointer whitespace-nowrap ${
                autoRotate
                  ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-200'
                  : 'bg-[#080B10] border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              {autoRotate ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              <span>Órbita</span>
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Aproximar cérebro 3D"
                onClick={() => cameraApiRef.current?.zoomBy(0.82)}
                className="p-1.5 rounded-lg bg-[#080B10] border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                aria-label="Afastar cérebro 3D"
                onClick={() => cameraApiRef.current?.zoomBy(1.22)}
                className="p-1.5 rounded-lg bg-[#080B10] border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                aria-label="Resetar visão do planeta"
                onClick={() => cameraApiRef.current?.resetView()}
                className="p-1.5 rounded-lg bg-[#080B10] border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleApplyLimit} className="flex items-center gap-1">
              <label
                htmlFor="brain-limit-input"
                className="text-[11px] text-slate-400 whitespace-nowrap"
              >
                Barreira:
              </label>
              <input
                id="brain-limit-input"
                type="number"
                min={1}
                max={5000}
                value={limitDraft}
                onChange={(e) => setLimitDraft(e.target.value)}
                className="w-16 px-2 py-1 rounded-md bg-[#080B10] border border-slate-700 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 cursor-pointer whitespace-nowrap"
              >
                Definir
              </button>
            </form>

            {reachedLimit && (
              <button
                type="button"
                onClick={onExportMentality}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs cursor-pointer whitespace-nowrap shadow-lg"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar Mentalidade</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
