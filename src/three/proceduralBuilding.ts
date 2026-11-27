import * as THREE from 'three';
import type { EmployeeProfile, FloorNumber, TaskItem } from '../types/nexus';

export interface BuildingHandles {
  root: THREE.Group;
  floor1Group: THREE.Group;
  floor2Group: THREE.Group;
  board1Texture: THREE.CanvasTexture;
  board2Texture: THREE.CanvasTexture;
  coreComputerTexture: THREE.CanvasTexture;
  coreComputerRing: THREE.Mesh;
  interactables: THREE.Object3D[];
}

export const FLOOR_2_Y = 5.5;
export const TASK_BOARD_POS = { x: -1.5, z: -7.15 };
export const CORE_COMPUTER_POS = { x: 0, z: 4.8 };

function createTileGridTexture(accentHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#151B23';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.10)';
  ctx.lineWidth = 2;
  const step = 64;
  for (let i = 0; i <= 512; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  ctx.fillStyle = accentHex;
  ctx.globalAlpha = 0.22;
  ctx.fillRect(0, 0, 12, 12);
  ctx.fillRect(500, 0, 12, 12);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 4);
  return tex;
}

export function drawTaskBoardCanvas(
  canvas: HTMLCanvasElement,
  floor: FloorNumber,
  tasks: TaskItem[]
) {
  const ctx = canvas.getContext('2d')!;
  const accent = floor === 1 ? '#10B981' : '#8B5CF6';
  const floorTasks = tasks.filter(
    (t) => t.departmentId === (floor === 1 ? 'dept_products' : 'dept_marketing')
  );

  ctx.fillStyle = '#0F141B';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Header bar
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, canvas.width, 54);
  ctx.fillStyle = '#090D12';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(
    floor === 1
      ? 'QUADRO DE TAREFAS — 1º ANDAR (PRODUTOS)'
      : 'QUADRO DE TAREFAS — 2º ANDAR (MARKETING)',
    18,
    35
  );

  let y = 84;
  const items = floorTasks.slice(0, 5);
  if (items.length === 0) {
    ctx.fillStyle = '#94A3B8';
    ctx.font = '18px sans-serif';
    ctx.fillText('Nenhuma tarefa registrada no quadro.', 20, y);
  } else {
    for (const t of items) {
      const isDone = t.status === 'concluida';
      ctx.fillStyle = isDone ? '#064E3B' : '#1E293B';
      ctx.fillRect(16, y - 22, canvas.width - 32, 40);

      ctx.fillStyle = isDone ? '#34D399' : '#38BDF8';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(isDone ? '[COMPLETADO]' : `[${t.status.toUpperCase()}]`, 24, y + 3);

      ctx.fillStyle = '#F8FAFC';
      ctx.font = '16px sans-serif';
      const label = t.title.length > 34 ? t.title.slice(0, 34) + '…' : t.title;
      ctx.fillText(label, 175, y + 3);
      y += 50;
    }
  }
}

export function drawCoreComputerCanvas(
  canvas: HTMLCanvasElement,
  totalLedgerCount: number,
  latestEntryTitle: string
) {
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, '#091534');
  grad.addColorStop(0.5, '#0B0F1A');
  grad.addColorStop(1, '#330A14');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#3B82F6';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

  ctx.fillStyle = '#60A5FA';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('CORAÇÃO DA OPERAÇÃO', 22, 42);

  ctx.fillStyle = '#F87171';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(`LIVRO HISTÓRICO: ${totalLedgerCount} REGISTROS`, 22, 74);

  ctx.fillStyle = '#E2E8F0';
  ctx.font = '15px sans-serif';
  const snippet =
    latestEntryTitle.length > 34
      ? latestEntryTitle.slice(0, 34) + '…'
      : latestEntryTitle;
  ctx.fillText(`Último: ${snippet}`, 22, 112);
}

function buildWorkstationDesk(
  x: number,
  z: number,
  deskYaw: number,
  accentHex: string
): THREE.Group {
  const desk = new THREE.Group();
  desk.position.set(x, 0, z);
  desk.rotation.y = deskYaw;

  // Offset desk slightly in front of employee (+Z in desk local space because character faces +Z in local space)
  const deskOffsetZ = 0.88;

  const topMat = new THREE.MeshStandardMaterial({
    color: 0x1e2530,
    roughness: 0.42,
    metalness: 0.25,
  });
  const legMat = new THREE.MeshStandardMaterial({
    color: 0x0f141b,
    roughness: 0.3,
    metalness: 0.72,
  });
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x09131c,
    emissive: new THREE.Color(accentHex),
    emissiveIntensity: 0.45,
    roughness: 0.15,
    metalness: 0.2,
  });

  const tabletop = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.08, 0.85), topMat);
  tabletop.position.set(0, 0.74, deskOffsetZ);
  tabletop.castShadow = true;
  tabletop.receiveShadow = true;
  desk.add(tabletop);

  const legGeo = new THREE.BoxGeometry(0.08, 0.72, 0.08);
  for (const lx of [-0.78, 0.78]) {
    for (const lz of [deskOffsetZ - 0.34, deskOffsetZ + 0.34]) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lx, 0.36, lz);
      leg.castShadow = true;
      desk.add(leg);
    }
  }

  // Dual curved/angled monitors facing employee
  const monitorStand = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.24, 0.1), legMat);
  monitorStand.position.set(0, 0.88, deskOffsetZ + 0.18);
  desk.add(monitorStand);

  const monitorL = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.38, 0.04), screenMat);
  monitorL.position.set(-0.34, 1.06, deskOffsetZ + 0.14);
  monitorL.rotation.y = -0.18;
  const monitorR = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.38, 0.04), screenMat);
  monitorR.position.set(0.34, 1.06, deskOffsetZ + 0.14);
  monitorR.rotation.y = 0.18;
  desk.add(monitorL, monitorR);

  // Keyboard pad
  const kb = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.025, 0.16), legMat);
  kb.position.set(0, 0.795, deskOffsetZ - 0.16);
  desk.add(kb);

  // Ergonomic chair behind employee (-Z local)
  const chairMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.75,
    metalness: 0.1,
  });
  const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.5), chairMat);
  chairSeat.position.set(0, 0.44, -0.12);
  const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.56, 0.07), chairMat);
  chairBack.position.set(0, 0.76, -0.35);
  desk.add(chairSeat, chairBack);

  return desk;
}

function buildTaskBoardUnit(
  floor: FloorNumber,
  tasks: TaskItem[],
  maxAnisotropy: number
): { group: THREE.Group; texture: THREE.CanvasTexture; hitBox: THREE.Mesh } {
  const group = new THREE.Group();
  group.position.set(TASK_BOARD_POS.x, 0, TASK_BOARD_POS.z);

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.7,
    roughness: 0.28,
  });
  const accentHex = floor === 1 ? '#10B981' : '#8B5CF6';
  const trimMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: new THREE.Color(accentHex),
    emissiveIntensity: 0.35,
    roughness: 0.3,
  });

  const frame = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.35, 0.16), frameMat);
  frame.position.set(0, 1.75, 0);
  frame.castShadow = true;
  group.add(frame);

  const standL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.4, 0.2), frameMat);
  standL.position.set(-1.9, 0.7, 0);
  const standR = standL.clone();
  standR.position.set(1.9, 0.7, 0);
  group.add(standL, standR);

  const topRail = new THREE.Mesh(new THREE.BoxGeometry(4.48, 0.08, 0.2), trimMat);
  topRail.position.set(0, 2.95, 0);
  group.add(topRail);

  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 384;
  drawTaskBoardCanvas(canvas, floor, tasks);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;

  const boardFace = new THREE.Mesh(
    new THREE.PlaneGeometry(4.15, 2.08),
    new THREE.MeshBasicMaterial({ map: texture })
  );
  boardFace.position.set(0, 1.75, 0.09);
  group.add(boardFace);

  const hitBox = new THREE.Mesh(
    new THREE.BoxGeometry(4.4, 2.6, 0.6),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitBox.position.set(0, 1.6, 0.1);
  hitBox.userData.specialObject = floor === 1 ? 'board_1' : 'board_2';
  hitBox.layers.set(1);
  group.add(hitBox);

  return { group, texture, hitBox };
}

function buildRedBlueCoreComputer(
  ledgerCount: number,
  latestTitle: string,
  maxAnisotropy: number
): {
  group: THREE.Group;
  texture: THREE.CanvasTexture;
  ring: THREE.Mesh;
  hitBox: THREE.Mesh;
} {
  const group = new THREE.Group();
  group.position.set(CORE_COMPUTER_POS.x, 0, CORE_COMPUTER_POS.z);

  const plinthMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.78,
    roughness: 0.25,
  });
  const blueMat = new THREE.MeshStandardMaterial({
    color: 0x2563eb,
    emissive: new THREE.Color(0x1d4ed8),
    emissiveIntensity: 0.65,
    metalness: 0.45,
    roughness: 0.22,
  });
  const redMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: new THREE.Color(0xdc2626),
    emissiveIntensity: 0.65,
    metalness: 0.45,
    roughness: 0.22,
  });

  // Base platform
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.72, 0.22, 24), plinthMat);
  base.position.y = 0.11;
  base.receiveShadow = true;
  group.add(base);

  // Dual Blue & Red Twin Core Towers
  const blueTower = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.95, 0.55), blueMat);
  blueTower.position.set(-0.56, 1.1, 0);
  blueTower.castShadow = true;
  const redTower = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.95, 0.55), redMat);
  redTower.position.set(0.56, 1.1, 0);
  redTower.castShadow = true;
  group.add(blueTower, redTower);

  // Console Desk
  const desk = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 0.72), plinthMat);
  desk.position.set(0, 0.92, -0.58);
  group.add(desk);

  // Main Screen Canvas
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  drawCoreComputerCanvas(canvas, ledgerCount, latestTitle);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.55, 0.82),
    new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide })
  );
  screen.position.set(0, 1.62, -0.35);
  group.add(screen);

  // Rotating holographic ring above core
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.88, 0.045, 12, 36),
    new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      emissive: new THREE.Color(0xef4444),
      emissiveIntensity: 0.55,
      metalness: 0.8,
      roughness: 0.2,
    })
  );
  ring.position.set(0, 2.38, 0);
  ring.rotation.x = Math.PI / 2.4;
  group.add(ring);

  const hitBox = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 2.6, 2.2),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitBox.position.set(0, 1.3, 0);
  hitBox.userData.specialObject = 'core_computer';
  hitBox.layers.set(1);
  group.add(hitBox);

  return { group, texture, ring, hitBox };
}

export function buildCorporateBuilding(
  employees: EmployeeProfile[],
  tasks: TaskItem[],
  ledgerCount: number,
  latestLedgerTitle: string,
  maxAnisotropy: number,
  isSoftwareGl: boolean
): BuildingHandles {
  const root = new THREE.Group();
  const interactables: THREE.Object3D[] = [];

  const floor1Group = new THREE.Group();
  floor1Group.position.y = 0;
  const floor2Group = new THREE.Group();
  floor2Group.position.y = FLOOR_2_Y;
  root.add(floor1Group, floor2Group);

  const buildFloorStructure = (
    targetGroup: THREE.Group,
    floor: FloorNumber,
    primaryHex: string,
    secondaryHex: string
  ) => {
    const slabMat = new THREE.MeshStandardMaterial({
      color: 0x161c24,
      roughness: 0.82,
      metalness: 0.15,
    });
    const gridTex = createTileGridTexture(primaryHex);
    gridTex.anisotropy = maxAnisotropy;
    const floorTopMat = new THREE.MeshStandardMaterial({
      map: gridTex,
      color: 0xffffff,
      roughness: 0.72,
      metalness: 0.12,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    // Main floor slab
    const slab = new THREE.Mesh(new THREE.BoxGeometry(24, 0.36, 16), slabMat);
    slab.position.set(0, -0.18, 0);
    slab.receiveShadow = true;
    targetGroup.add(slab);

    const floorSurface = new THREE.Mesh(new THREE.PlaneGeometry(23.6, 15.6), floorTopMat);
    floorSurface.rotation.x = -Math.PI / 2;
    floorSurface.position.y = 0.005;
    floorSurface.receiveShadow = true;
    targetGroup.add(floorSurface);

    // Back and left structural walls (cutaway front/right for clear isometric view)
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x111720,
      roughness: 0.8,
      metalness: 0.2,
    });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(24, 3.8, 0.32), wallMat);
    backWall.position.set(0, 1.9, -7.84);
    backWall.receiveShadow = true;
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.8, 16), wallMat);
    leftWall.position.set(-11.84, 1.9, 0);
    leftWall.receiveShadow = true;
    targetGroup.add(backWall, leftWall);

    // Accent neon structural trim along wall base
    const trimMat = new THREE.MeshStandardMaterial({
      color: primaryHex,
      emissive: new THREE.Color(primaryHex),
      emissiveIntensity: 0.5,
      roughness: 0.3,
    });
    const backTrim = new THREE.Mesh(new THREE.BoxGeometry(23.6, 0.1, 0.08), trimMat);
    backTrim.position.set(0, 0.08, -7.65);
    const leftTrim = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 15.6), trimMat);
    leftTrim.position.set(-11.65, 0.08, 0);
    targetGroup.add(backTrim, leftTrim);

    // Glass partition for Meeting Room (right-back zone)
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: secondaryHex,
      transparent: true,
      opacity: isSoftwareGl ? 0.24 : 0.2,
      roughness: 0.15,
      metalness: 0.1,
      depthWrite: false,
    });
    const glassWall = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.9, 6.2), glassMat);
    glassWall.position.set(5.4, 1.45, -4.5);
    targetGroup.add(glassWall);

    // Meeting table inside meeting zone
    const mTableMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.38,
      metalness: 0.3,
    });
    const meetingTable = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.15, 0.08, 20),
      mTableMat
    );
    meetingTable.position.set(8.3, 0.74, -1.2);
    const mLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 0.72, 12), wallMat);
    mLeg.position.set(8.3, 0.36, -1.2);
    targetGroup.add(meetingTable, mLeg);

    // Floor-specific environment props
    if (floor === 1) {
      // Product showcase pedestals near Camila Rocha
      for (let i = 0; i < 3; i++) {
        const ped = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.7), mTableMat);
        ped.position.set(-10.4, 0.45, 0.2 + i * 2.1);
        const proto = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.24, 0),
          new THREE.MeshStandardMaterial({
            color: i === 1 ? 0x06b6d4 : 0x10b981,
            emissive: new THREE.Color(i === 1 ? 0x06b6d4 : 0x10b981),
            emissiveIntensity: 0.35,
            roughness: 0.25,
            metalness: 0.65,
          })
        );
        proto.position.set(-10.4, 1.16, 0.2 + i * 2.1);
        targetGroup.add(ped, proto);
      }
    } else {
      // Marketing Creative Studio Ring Light & Backdrop near Thiago Alves
      const backdrop = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.5, 3.2), mTableMat);
      backdrop.position.set(-11.2, 1.25, 2.2);
      const ringLight = new THREE.Mesh(
        new THREE.TorusGeometry(0.42, 0.05, 10, 24),
        new THREE.MeshStandardMaterial({
          color: 0xc084fc,
          emissive: new THREE.Color(0xc084fc),
          emissiveIntensity: 0.8,
        })
      );
      ringLight.position.set(-10.2, 1.75, 2.2);
      ringLight.rotation.y = Math.PI / 2;
      targetGroup.add(backdrop, ringLight);
    }

    // Desks for this floor's 6 employees
    const floorEmployees = employees.filter((e) => e.floor === floor);
    for (const emp of floorEmployees) {
      const desk = buildWorkstationDesk(
        emp.workstation.x,
        emp.workstation.z,
        emp.workstation.deskYaw,
        primaryHex
      );
      targetGroup.add(desk);
    }
  };

  buildFloorStructure(floor1Group, 1, '#10B981', '#06B6D4');
  buildFloorStructure(floor2Group, 2, '#8B5CF6', '#3B82F6');

  // Structural corner pillars connecting Floor 1 and Floor 2
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.72,
    roughness: 0.3,
  });
  for (const [px, pz] of [
    [-11.6, -7.6],
    [11.6, -7.6],
    [-11.6, 7.6],
    [11.6, 7.6],
  ]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.42, 9.5, 0.42), pillarMat);
    pillar.position.set(px, 4.75, pz);
    pillar.castShadow = true;
    root.add(pillar);
  }

  // Balanced interior fill lights per floor so Floor 1 stays bright under Floor 2
  const floor1Light = new THREE.PointLight(0xa7f3d0, 1.5, 28, 1.2);
  floor1Light.position.set(-1, 3.6, 1);
  floor1Group.add(floor1Light);

  const floor2Light = new THREE.PointLight(0xddd6fe, 1.4, 28, 1.2);
  floor2Light.position.set(-1, 3.6, 1);
  floor2Group.add(floor2Light);

  // Visual Task Boards on each floor
  const board1 = buildTaskBoardUnit(1, tasks, maxAnisotropy);
  floor1Group.add(board1.group);
  interactables.push(board1.hitBox);

  const board2 = buildTaskBoardUnit(2, tasks, maxAnisotropy);
  floor2Group.add(board2.group);
  interactables.push(board2.hitBox);

  // Iconic Blue & Red Central Historical Core Computer on Floor 1 Atrium
  const coreComputer = buildRedBlueCoreComputer(
    ledgerCount,
    latestLedgerTitle,
    maxAnisotropy
  );
  floor1Group.add(coreComputer.group);
  interactables.push(coreComputer.hitBox);

  // Connecting holographic stair ramp on the right wing
  const stairMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.6,
    roughness: 0.35,
  });
  for (let s = 0; s < 11; s++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.14, 0.52), stairMat);
    step.position.set(10.3, 0.25 + s * 0.5, 5.2 - s * 0.48);
    root.add(step);
  }

  return {
    root,
    floor1Group,
    floor2Group,
    board1Texture: board1.texture,
    board2Texture: board2.texture,
    coreComputerTexture: coreComputer.texture,
    coreComputerRing: coreComputer.ring,
    interactables,
  };
}
