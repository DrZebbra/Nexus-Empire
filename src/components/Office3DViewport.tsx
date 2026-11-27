import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  computeCharacterFacingYaw,
  formatEmployeeBubbleText,
} from '../core/simulationRules';
import type {
  EmployeeProfile,
  FloorNumber,
  GraphicsQuality,
  HistoricalLedgerEntry,
  TaskItem,
} from '../types/nexus';
import {
  buildCorporateBuilding,
  CORE_COMPUTER_POS,
  drawCoreComputerCanvas,
  drawTaskBoardCanvas,
  FLOOR_2_Y,
  TASK_BOARD_POS,
  type BuildingHandles,
} from '../three/proceduralBuilding';
import {
  createProceduralCharacterRig,
  updateCharacterRigAnimation,
  type CharacterRig,
} from '../three/proceduralCharacters';

export type FloorViewFilter = 'all' | 1 | 2;

interface Office3DViewportProps {
  employees: EmployeeProfile[];
  tasks: TaskItem[];
  historicalLedger: HistoricalLedgerEntry[];
  activeFloor: FloorViewFilter;
  selectedEmployeeId: string | null;
  graphicsQuality: GraphicsQuality;
  simulationSpeed: 1 | 2;
  showBubbles: boolean;
  cameraZoomSignal: { type: 'in' | 'out' | 'reset'; seq: number } | null;
  onSelectEmployee: (employeeId: string) => void;
  onOpenTaskBoard: (floor: FloorNumber) => void;
  onOpenCoreComputer: () => void;
}

const _projVec = new THREE.Vector3();

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

export const Office3DViewport: React.FC<Office3DViewportProps> = ({
  employees,
  tasks,
  historicalLedger,
  activeFloor,
  selectedEmployeeId,
  graphicsQuality,
  simulationSpeed,
  showBubbles,
  cameraZoomSignal,
  onSelectEmployee,
  onOpenTaskBoard,
  onOpenCoreComputer,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const bubbleRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const landmarkBoardRef = useRef<HTMLButtonElement | null>(null);
  const landmarkCoreRef = useRef<HTMLButtonElement | null>(null);

  // Mutable refs so React updates never tear down WebGL
  const stateRef = useRef({
    employees,
    tasks,
    historicalLedger,
    activeFloor,
    selectedEmployeeId,
    graphicsQuality,
    simulationSpeed,
    showBubbles,
  });
  stateRef.current = {
    employees,
    tasks,
    historicalLedger,
    activeFloor,
    selectedEmployeeId,
    graphicsQuality,
    simulationSpeed,
    showBubbles,
  };

  const callbacksRef = useRef({
    onSelectEmployee,
    onOpenTaskBoard,
    onOpenCoreComputer,
  });
  callbacksRef.current = {
    onSelectEmployee,
    onOpenTaskBoard,
    onOpenCoreComputer,
  };

  const buildingRef = useRef<BuildingHandles | null>(null);
  const cameraApiRef = useRef<{
    setFloorTarget: (floor: FloorViewFilter) => void;
    zoomBy: (factor: number) => void;
    resetView: () => void;
  } | null>(null);

  // Update dynamic canvas textures whenever tasks or ledger change
  useEffect(() => {
    const b = buildingRef.current;
    if (!b) return;
    const c1 = b.board1Texture.image as HTMLCanvasElement;
    drawTaskBoardCanvas(c1, 1, tasks);
    b.board1Texture.needsUpdate = true;

    const c2 = b.board2Texture.image as HTMLCanvasElement;
    drawTaskBoardCanvas(c2, 2, tasks);
    b.board2Texture.needsUpdate = true;

    const cc = b.coreComputerTexture.image as HTMLCanvasElement;
    const latest = historicalLedger[0]?.taskTitle ?? 'Aguardando primeiro registro';
    drawCoreComputerCanvas(cc, historicalLedger.length, latest);
    b.coreComputerTexture.needsUpdate = true;
  }, [tasks, historicalLedger]);

  // Smoothly focus floor when activeFloor changes
  useEffect(() => {
    cameraApiRef.current?.setFloorTarget(activeFloor);
  }, [activeFloor]);

  // Respond to HUD zoom/reset clicks
  useEffect(() => {
    if (!cameraZoomSignal) return;
    if (cameraZoomSignal.type === 'in') cameraApiRef.current?.zoomBy(1.22);
    else if (cameraZoomSignal.type === 'out') cameraApiRef.current?.zoomBy(0.82);
    else cameraApiRef.current?.resetView();
  }, [cameraZoomSignal]);

  // Mount Three.js scene once
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 240);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(width, height);

    const getQualityPixelRatio = (q: GraphicsQuality) => {
      if (isSoftwareGl) return 1;
      if (q === 'low') return 1;
      if (q === 'medium') return Math.min(window.devicePixelRatio, 1.5);
      return Math.min(window.devicePixelRatio, 2);
    };
    renderer.setPixelRatio(getQualityPixelRatio(stateRef.current.graphicsQuality));
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0f14);
    scene.fog = new THREE.FogExp2(0x0b0f14, 0.011);

    // Procedural Studio Environment Reflection
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmremGenerator.dispose();

    // True Isometric Orthographic Camera
    const frustumSize = 20;
    const aspect = width / height;
    const camera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      160
    );
    camera.position.set(24, 21, 26);
    camera.zoom = width < 640 ? 0.68 : 0.96;
    camera.updateProjectionMatrix();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.minZoom = 0.52;
    controls.maxZoom = 2.4;
    controls.minPolarAngle = Math.PI / 6;
    controls.maxPolarAngle = Math.PI / 2.25;
    controls.target.set(0, 2.75, 0);
    controls.update();

    // 3-Point Warm/Cool Studio Lighting
    const hemiLight = new THREE.HemisphereLight(0xa5f3fc, 0x0f172a, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e0, 1.85);
    keyLight.position.set(16, 26, 14);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -16;
    keyLight.shadow.camera.right = 16;
    keyLight.shadow.camera.top = 16;
    keyLight.shadow.camera.bottom = -16;
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 55;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.65);
    rimLight.position.set(-18, 12, -16);
    scene.add(rimLight);

    // Subtle ground exterior apron around building
    const apron = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshStandardMaterial({
        color: 0x090d12,
        roughness: 0.92,
        metalness: 0.05,
      })
    );
    apron.rotation.x = -Math.PI / 2;
    apron.position.y = -0.37;
    apron.receiveShadow = true;
    scene.add(apron);

    // Build 2-story Corporate Structure
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const building = buildCorporateBuilding(
      stateRef.current.employees,
      stateRef.current.tasks,
      stateRef.current.historicalLedger.length,
      stateRef.current.historicalLedger[0]?.taskTitle ?? 'Sistema Inicializado',
      maxAnisotropy,
      isSoftwareGl
    );
    scene.add(building.root);
    buildingRef.current = building;

    // Build 12 Immutable Procedural Characters
    const rigs: CharacterRig[] = stateRef.current.employees.map((emp) => {
      const floorY = emp.floor === 1 ? 0 : FLOOR_2_Y;
      const rig = createProceduralCharacterRig(emp, floorY);
      scene.add(rig.root);
      return rig;
    });

    const raycastTargets: THREE.Object3D[] = [
      ...rigs.map((r) => r.hitProxy),
      ...building.interactables,
    ];

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Smooth camera preset gliding
    let cameraGlideActive = false;
    const desiredTarget = new THREE.Vector3(0, 2.75, 0);
    const desiredCamPos = new THREE.Vector3(24, 21, 26);
    let desiredZoom = width < 640 ? 0.68 : 0.96;

    const cancelGlide = () => {
      cameraGlideActive = false;
    };
    controls.addEventListener('start', cancelGlide);

    cameraApiRef.current = {
      setFloorTarget: (floor) => {
        if (floor === 1) {
          desiredTarget.set(0, 0.9, 0);
          desiredCamPos.set(20, 16.5, 22);
          desiredZoom = container.clientWidth < 640 ? 0.82 : 1.15;
        } else if (floor === 2) {
          desiredTarget.set(0, FLOOR_2_Y + 0.9, 0);
          desiredCamPos.set(20, FLOOR_2_Y + 16.5, 22);
          desiredZoom = container.clientWidth < 640 ? 0.82 : 1.15;
        } else {
          desiredTarget.set(0, 2.75, 0);
          desiredCamPos.set(24, 21, 26);
          desiredZoom = container.clientWidth < 640 ? 0.68 : 0.96;
        }
        cameraGlideActive = true;
      },
      zoomBy: (factor) => {
        cameraGlideActive = false;
        camera.zoom = THREE.MathUtils.clamp(camera.zoom * factor, 0.52, 2.4);
        camera.updateProjectionMatrix();
      },
      resetView: () => {
        const f = stateRef.current.activeFloor;
        cameraApiRef.current?.setFloorTarget(f);
      },
    };

    // Raycasting on tap/click (distinguishing from orbit drag)
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointerNdc = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist > 8) return; // Was a camera drag

      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(raycastTargets, false);
      if (hits.length > 0) {
        const hitData = hits[0].object.userData;
        if (hitData.employeeId) {
          callbacksRef.current.onSelectEmployee(hitData.employeeId);
        } else if (hitData.specialObject === 'board_1') {
          callbacksRef.current.onOpenTaskBoard(1);
        } else if (hitData.specialObject === 'board_2') {
          callbacksRef.current.onOpenTaskBoard(2);
        } else if (hitData.specialObject === 'core_computer') {
          callbacksRef.current.onOpenCoreComputer();
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // ResizeObserver keeps projection sharp on mobile orientation & drawer resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(entry.contentRect.width, 280);
        const h = Math.max(entry.contentRect.height, 220);
        const asp = w / h;
        camera.left = (-frustumSize * asp) / 2;
        camera.right = (frustumSize * asp) / 2;
        camera.top = frustumSize / 2;
        camera.bottom = -frustumSize / 2;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    // Software WebGL loop pacing
    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let elapsed = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (status === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 6);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 6);
    }

    function updateBubbleElement(
      el: HTMLButtonElement | null,
      worldX: number,
      worldY: number,
      worldZ: number,
      visible: boolean,
      w: number,
      h: number
    ) {
      if (!el) return;
      if (!visible) {
        el.style.display = 'none';
        return;
      }
      _projVec.set(worldX, worldY, worldZ).project(camera);
      if (_projVec.z < -1 || _projVec.z > 1) {
        el.style.display = 'none';
        return;
      }
      const sx = ((_projVec.x + 1) / 2) * w;
      const sy = ((-_projVec.y + 1) / 2) * h;
      if (sx < -60 || sx > w + 60 || sy < -30 || sy > h + 30) {
        el.style.display = 'none';
        return;
      }
      el.style.display = 'flex';
      el.style.transform = `translate3d(${Math.round(sx)}px, ${Math.round(sy)}px, 0) translate(-50%, -100%)`;
    }

    function tick() {
      if (disposed) return;
      const now = performance.now();
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05) * stateRef.current.simulationSpeed;
      elapsed += dt;

      const {
        employees: currentEmps,
        activeFloor: floorFilter,
        selectedEmployeeId: selId,
        graphicsQuality: quality,
        showBubbles: bubblesOn,
      } = stateRef.current;

      renderer.setPixelRatio(getQualityPixelRatio(quality));

      // Floor visibility
      building.floor1Group.visible = floorFilter === 'all' || floorFilter === 1;
      building.floor2Group.visible = floorFilter === 'all' || floorFilter === 2;

      // Rotate Core Computer Holographic Ring
      building.coreComputerRing.rotation.z = elapsed * 0.85;

      // Smooth camera floor preset glide
      if (cameraGlideActive) {
        controls.target.lerp(desiredTarget, 1 - Math.exp(-6 * dt));
        camera.position.lerp(desiredCamPos, 1 - Math.exp(-6 * dt));
        camera.zoom = THREE.MathUtils.damp(camera.zoom, desiredZoom, 6, dt);
        camera.updateProjectionMatrix();
        if (
          controls.target.distanceTo(desiredTarget) < 0.04 &&
          camera.position.distanceTo(desiredCamPos) < 0.08
        ) {
          cameraGlideActive = false;
        }
      }
      controls.update();

      const viewW = container?.clientWidth ?? width;
      const viewH = container?.clientHeight ?? height;

      // Compute targets and animate all 12 characters
      for (let i = 0; i < rigs.length; i++) {
        const rig = rigs[i];
        const emp = currentEmps.find((e) => e.id === rig.employeeId);
        if (!emp) continue;

        const floorVisible = floorFilter === 'all' || emp.floor === floorFilter;
        rig.root.visible = floorVisible;
        const floorY = emp.floor === 1 ? 0 : FLOOR_2_Y;

        // Determine spatial target based on workflow action or conversation
        if (
          emp.activeWorkflowAction === 'board_write' ||
          emp.activeWorkflowAction === 'board_complete'
        ) {
          rig.targetX = TASK_BOARD_POS.x + (emp.floor === 1 ? -0.4 : 0.4);
          rig.targetY = floorY;
          rig.targetZ = TASK_BOARD_POS.z + 1.25;
          rig.targetYaw = Math.PI; // Face the wall board (-Z)
        } else if (emp.activeWorkflowAction === 'core_computer_log') {
          rig.targetX = CORE_COMPUTER_POS.x + (emp.floor === 1 ? -0.6 : 0.6);
          rig.targetY = 0; // Core computer is on Floor 1 Atrium
          rig.targetZ = CORE_COMPUTER_POS.z - 1.55;
          rig.targetYaw = 0; // Face the Blue & Red Core Computer (+Z)
        } else if (emp.animationState === 'conversing' && emp.conversingWithId) {
          const partner = currentEmps.find((p) => p.id === emp.conversingWithId);
          if (partner) {
            // Stand in a clear conversation pair midpoint near the meeting lounge or between desks
            const midX = (emp.workstation.x + partner.workstation.x) * 0.5;
            const midZ = (emp.workstation.z + partner.workstation.z) * 0.5;
            const isFirst = emp.id < partner.id;
            const selfSpotX = midX + (isFirst ? -1.45 : 1.45);
            const partnerSpotX = midX + (isFirst ? 1.45 : -1.45);
            rig.targetX = selfSpotX;
            rig.targetY = floorY;
            rig.targetZ = midZ;
            rig.targetYaw = computeCharacterFacingYaw(
              { x: selfSpotX, z: midZ },
              emp.workstation.deskYaw,
              'conversing',
              { x: partnerSpotX, z: midZ }
            );
          }
        } else {
          // Working/idle/thinking/celebrating/resting at own computer workstation
          rig.targetX = emp.workstation.x;
          rig.targetY = floorY;
          rig.targetZ = emp.workstation.z;
          rig.targetYaw = emp.workstation.deskYaw;
        }

        updateCharacterRigAnimation(
          rig,
          emp.animationState,
          selId === emp.id,
          dt,
          elapsed
        );

        updateBubbleElement(
          bubbleRefs.current[emp.id] ?? null,
          rig.currentX,
          rig.currentY + rig.headAnchorLocalY + 0.25,
          rig.currentZ,
          bubblesOn && floorVisible,
          viewW,
          viewH
        );
      }

      // Landmark bubbles (Task Board + Red/Blue Core Computer)
      const activeBoardFloor = floorFilter === 2 ? 2 : 1;
      const boardWorldY = activeBoardFloor === 2 ? FLOOR_2_Y + 3.25 : 3.25;
      updateBubbleElement(
        landmarkBoardRef.current,
        TASK_BOARD_POS.x,
        boardWorldY,
        TASK_BOARD_POS.z,
        bubblesOn,
        viewW,
        viewH
      );
      updateBubbleElement(
        landmarkCoreRef.current,
        CORE_COMPUTER_POS.x,
        0.2,
        CORE_COMPUTER_POS.z + 1.55,
        bubblesOn && (floorFilter === 'all' || floorFilter === 1),
        viewW,
        viewH
      );

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', cancelGlide);
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      envRT.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-[#0B0F14]">
      {/* Dedicated isolated WebGL canvas container */}
      <div
        ref={canvasMountRef}
        data-testid="nexus-3d-canvas"
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* 3D Projected Overhead Activity Bubbles (Zero-filter solid dark surfaces) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
        {employees.map((emp) => {
          const isSelected = selectedEmployeeId === emp.id;
          const isConversing = emp.animationState === 'conversing';
          const isWorkflow = emp.activeWorkflowAction !== 'none';
          const bubbleText = formatEmployeeBubbleText(emp, employees);
          const deptBorder =
            emp.departmentId === 'dept_products'
              ? 'border-emerald-500/60'
              : 'border-violet-500/60';

          return (
            <button
              key={emp.id}
              ref={(el) => {
                bubbleRefs.current[emp.id] = el;
              }}
              type="button"
              onClick={() => onSelectEmployee(emp.id)}
              aria-label={`Inspecionar ${emp.name} (${emp.role})`}
              className={`pointer-events-auto absolute top-0 left-0 hidden flex-col items-start gap-0.5 px-2 py-1 rounded-md border text-left shadow-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                isSelected
                  ? 'bg-[#0F172A] border-cyan-400 z-30'
                  : isWorkflow
                  ? 'bg-[#17121E] border-amber-400/80 z-20'
                  : isConversing
                  ? 'bg-[#141A29] border-cyan-400/75 z-20'
                  : `bg-[#0D131B]/95 ${deptBorder} hover:border-slate-300 z-10`
              }`}
              style={{ maxWidth: '165px' }}
            >
              <div className="flex items-center gap-1 w-full">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-xs shrink-0"
                  style={{ backgroundColor: emp.appearance.accentColor }}
                />
                <span className="text-[10px] font-semibold text-slate-100 truncate">
                  {emp.name}
                </span>
                <span className="text-[9px] text-slate-400 ml-auto shrink-0">
                  {emp.floor}ºA
                </span>
              </div>
              <span className="text-[9px] leading-tight text-slate-300 line-clamp-2">
                {bubbleText}
              </span>
            </button>
          );
        })}

        {/* Task Board Overhead Landmark */}
        <button
          ref={landmarkBoardRef}
          type="button"
          onClick={() => onOpenTaskBoard(activeFloor === 2 ? 2 : 1)}
          aria-label="Abrir Quadro Visual de Tarefas"
          className="pointer-events-auto absolute top-0 left-0 hidden items-center gap-1.5 px-2.5 py-1 rounded-md border border-emerald-400/60 bg-[#0B1219]/95 text-[11px] font-medium text-emerald-200 shadow-md hover:border-emerald-300"
        >
          <span>Quadro de Tarefas</span>
        </button>

        {/* Blue & Red Core Computer Overhead Landmark */}
        <button
          ref={landmarkCoreRef}
          type="button"
          onClick={onOpenCoreComputer}
          aria-label="Abrir Computador Azul e Vermelho — Livro Histórico"
          className="pointer-events-auto absolute top-0 left-0 hidden items-center gap-1.5 px-2.5 py-1 rounded-md border border-blue-500/80 bg-[#110D1B]/95 text-[11px] font-semibold text-slate-100 shadow-md hover:border-red-400"
        >
          <span className="inline-block w-2 h-2 bg-blue-500" />
          <span className="inline-block w-2 h-2 bg-red-500" />
          <span>PC Azul & Vermelho · Livro Histórico ({historicalLedger.length})</span>
        </button>
      </div>
    </div>
  );
};
