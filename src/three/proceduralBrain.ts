import * as THREE from 'three';
import {
  SKILL_ANCHOR_RADIUS,
  computeFibonacciUnitDir,
} from '../core/brainRules';
import type {
  BrainThoughtNode,
  EmployeeProfile,
  SkillDefinition,
} from '../types/nexus';

export const BRAIN_CORE_RADIUS = 1.95;

export interface BrainSkillAnchorVisual {
  skillId: string;
  name: string;
  color: THREE.Color;
  orbitRadius: number;
  position: THREE.Vector3;
  group: THREE.Group;
  orbMesh: THREE.Mesh;
  ringMesh: THREE.Mesh;
  hitProxy: THREE.Mesh;
  lastPulseAt: number;
}

export interface BrainThoughtVisual {
  thoughtId: string;
  node: BrainThoughtNode;
  color: THREE.Color;
  orbitRadius: number;
  baseScale: number;
  bornAt: number;
  position: THREE.Vector3;
  group: THREE.Group;
  orbMesh: THREE.Mesh;
  ringMesh: THREE.Mesh;
  hitProxy: THREE.Mesh;
}

export interface BrainSceneHandles {
  root: THREE.Group;
  coreGroup: THREE.Group;
  innerCoreMesh: THREE.Mesh;
  geodesicShell: THREE.Mesh;
  orbitRingA: THREE.Mesh;
  orbitRingB: THREE.Mesh;
  coreHitProxy: THREE.Mesh;
  starField: THREE.Points;
  skillAnchors: Map<string, BrainSkillAnchorVisual>;
  thoughtNodes: Map<string, BrainThoughtVisual>;
  customPositions: Map<string, THREE.Vector3>;
  webLines: THREE.LineSegments;
  pulseParticles: THREE.Points;
  coreTexture: THREE.CanvasTexture;
  getInteractables: () => THREE.Object3D[];
  syncWithState: (
    skills: SkillDefinition[],
    employees: EmployeeProfile[],
    nodes: BrainThoughtNode[],
    selectedKey: string | null
  ) => void;
  setDraggedPosition: (nodeKey: string, worldPos: THREE.Vector3) => void;
  rebuildFilaments: () => void;
  animate: (elapsed: number, selectedKey: string | null) => void;
  dispose: () => void;
}

function createPlanetSurfaceTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Deep industrial obsidian gradient
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#091521');
    grad.addColorStop(0.5, '#0c1b29');
    grad.addColorStop(1, '#08121d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Latitude & Longitude planetary grid
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.22)';
    ctx.lineWidth = 1.25;
    for (let x = 0; x <= canvas.width; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Subtle cortical synaptic pathways across the globe
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.36)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 36; i++) {
      const sx = ((i * 173) % 980) + 20;
      const sy = ((i * 97) % 450) + 30;
      const ex = (sx + 110 + ((i * 41) % 140)) % canvas.width;
      const ey = Math.max(24, Math.min(488, sy + ((i % 2 === 0 ? 1 : -1) * 65)));
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      ctx.fillStyle = i % 3 === 0 ? '#22d3ee' : '#10b981';
      ctx.beginPath();
      ctx.arc(sx, sy, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Equatorial emerald band
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, Math.max(1, maxAnisotropy));
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function resolveSkillColor(
  skill: SkillDefinition,
  employees: EmployeeProfile[]
): THREE.Color {
  const owner = employees.find((e) => e.skillIds.includes(skill.id));
  if (owner?.floor === 2) {
    return owner.isFloorManager ? new THREE.Color(0xc084fc) : new THREE.Color(0xa855f7);
  }
  return owner?.isFloorManager ? new THREE.Color(0x22d3ee) : new THREE.Color(0x10b981);
}

export function buildProceduralBrainScene(
  skills: SkillDefinition[],
  employees: EmployeeProfile[],
  nodes: BrainThoughtNode[],
  maxAnisotropy: number
): BrainSceneHandles {
  const root = new THREE.Group();

  // Ambient deep orbital starfield
  const starCount = 220;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const u = ((i * 73) % 100) / 100;
    const v = ((i * 137) % 100) / 100;
    const theta = u * Math.PI * 2;
    const phi = Math.acos(2 * v - 1);
    const r = 24 + (i % 16);
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.cos(phi);
    starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0x67e8f9,
    size: 0.14,
    transparent: true,
    opacity: 0.45,
    sizeAttenuation: true,
  });
  const starField = new THREE.Points(starGeo, starMat);
  root.add(starField);

  // Composite Planetary Core: Nexus Mind
  const coreGroup = new THREE.Group();
  root.add(coreGroup);

  const innerCoreMesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.18, 2),
    new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.4,
      roughness: 0.2,
      metalness: 0.3,
    })
  );
  coreGroup.add(innerCoreMesh);

  const coreTexture = createPlanetSurfaceTexture(maxAnisotropy);
  const planetShell = new THREE.Mesh(
    new THREE.SphereGeometry(BRAIN_CORE_RADIUS, 48, 36),
    new THREE.MeshStandardMaterial({
      map: coreTexture,
      roughness: 0.36,
      metalness: 0.55,
      emissive: 0x064e3b,
      emissiveIntensity: 0.42,
      transparent: true,
      opacity: 0.92,
    })
  );
  coreGroup.add(planetShell);

  const geodesicShell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(BRAIN_CORE_RADIUS + 0.16, 2),
    new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      wireframe: true,
      transparent: true,
      opacity: 0.24,
    })
  );
  coreGroup.add(geodesicShell);

  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0891b2,
    emissiveIntensity: 0.75,
    roughness: 0.28,
    metalness: 0.85,
  });

  const orbitRingA = new THREE.Mesh(
    new THREE.TorusGeometry(2.52, 0.025, 12, 96),
    ringMat
  );
  orbitRingA.rotation.set(Math.PI * 0.36, Math.PI * 0.12, 0);
  coreGroup.add(orbitRingA);

  const orbitRingB = new THREE.Mesh(
    new THREE.TorusGeometry(2.82, 0.02, 12, 96),
    new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x059669,
      emissiveIntensity: 0.65,
      roughness: 0.3,
      metalness: 0.85,
    })
  );
  orbitRingB.rotation.set(-Math.PI * 0.28, Math.PI * 0.42, 0.3);
  coreGroup.add(orbitRingB);

  const coreHitProxy = new THREE.Mesh(
    new THREE.SphereGeometry(BRAIN_CORE_RADIUS + 0.3, 18, 14),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  coreHitProxy.layers.set(1);
  coreHitProxy.userData = { nodeKind: 'core', nodeKey: 'core' };
  coreGroup.add(coreHitProxy);

  // Shared geometries for skill & thought orbs
  const skillGeo = new THREE.SphereGeometry(0.32, 24, 18);
  const skillRingGeo = new THREE.TorusGeometry(0.46, 0.018, 8, 36);
  const skillHitGeo = new THREE.SphereGeometry(0.62, 14, 10);

  const thoughtGeo = new THREE.SphereGeometry(0.24, 20, 16);
  const thoughtRingGeo = new THREE.TorusGeometry(0.36, 0.016, 8, 32);
  const thoughtHitGeo = new THREE.SphereGeometry(0.5, 12, 10);
  const hitMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  const skillAnchors = new Map<string, BrainSkillAnchorVisual>();
  const thoughtNodes = new Map<string, BrainThoughtVisual>();
  const customPositions = new Map<string, THREE.Vector3>();

  // Neural Web LineSegments
  const webGeo = new THREE.BufferGeometry();
  webGeo.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(0), 3)
  );
  webGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(0), 3));
  const webMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.82,
  });
  const webLines = new THREE.LineSegments(webGeo, webMat);
  root.add(webLines);

  // Traveling Synaptic Pulse Particles gliding along connections
  interface ActiveFilamentPair {
    a: THREE.Vector3;
    b: THREE.Vector3;
    ca: THREE.Color;
    cb: THREE.Color;
    isThoughtEdge: boolean;
  }
  interface SynapticPulseTraveler {
    a: THREE.Vector3;
    b: THREE.Vector3;
    color: THREE.Color;
    progress: number;
    speed: number;
    repeating: boolean;
  }
  let filamentPairs: ActiveFilamentPair[] = [];
  const activePulses: SynapticPulseTraveler[] = [];
  const maxPulseParticles = 72;
  const pulsePosArr = new Float32Array(maxPulseParticles * 3);
  const pulseColArr = new Float32Array(maxPulseParticles * 3);
  const pulseGeo = new THREE.BufferGeometry();
  pulseGeo.setAttribute('position', new THREE.BufferAttribute(pulsePosArr, 3));
  pulseGeo.setAttribute('color', new THREE.BufferAttribute(pulseColArr, 3));
  pulseGeo.setDrawRange(0, 0);
  const pulseMat = new THREE.PointsMaterial({
    size: 0.24,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const pulseParticles = new THREE.Points(pulseGeo, pulseMat);
  root.add(pulseParticles);

  let currentElapsed = 0;
  let lastSurgeAt = -10;
  let initialSyncDone = false;

  const spawnSynapseBurst = (
    from: THREE.Vector3,
    to: THREE.Vector3,
    color: THREE.Color,
    speed = 0.85,
    repeating = false
  ) => {
    if (activePulses.length >= maxPulseParticles) {
      activePulses.shift();
    }
    activePulses.push({
      a: from,
      b: to,
      color,
      progress: 0,
      speed,
      repeating,
    });
  };

  const rebuildFilaments = () => {
    const pairs: ActiveFilamentPair[] = [];

    const coreCenter = new THREE.Vector3(0, 0, 0);
    const coreColor = new THREE.Color(0x22d3ee);

    // 1. Core -> Skill Anchor filaments
    for (const anchor of skillAnchors.values()) {
      pairs.push({
        a: coreCenter,
        b: anchor.position,
        ca: coreColor,
        cb: anchor.color,
        isThoughtEdge: false,
      });
    }

    // 2. Thought -> Parent Thought OR Skill Anchor
    const thoughtList = Array.from(thoughtNodes.values());
    for (const tv of thoughtList) {
      const parentThought = tv.node.parentId
        ? thoughtNodes.get(tv.node.parentId) ?? null
        : null;
      const skillAnchor = skillAnchors.get(tv.node.skillId) ?? null;

      if (parentThought) {
        pairs.push({
          a: parentThought.position,
          b: tv.position,
          ca: parentThought.color,
          cb: tv.color,
          isThoughtEdge: true,
        });
      } else if (skillAnchor) {
        pairs.push({
          a: skillAnchor.position,
          b: tv.position,
          ca: skillAnchor.color,
          cb: tv.color,
          isThoughtEdge: true,
        });
      } else {
        pairs.push({
          a: coreCenter,
          b: tv.position,
          ca: coreColor,
          cb: tv.color,
          isThoughtEdge: true,
        });
      }
    }

    // 3. Cross-synapse web links between thoughts sharing an employee actor
    // (capped cleanly to keep line count crisp even near 1000 connections)
    const maxCrossLinks = 180;
    let crossCount = 0;
    const subtleWhite = new THREE.Color(0x38bdf8);
    for (let i = 0; i < thoughtList.length && crossCount < maxCrossLinks; i++) {
      const a = thoughtList[i];
      for (
        let j = i + 1;
        j < Math.min(thoughtList.length, i + 10) && crossCount < maxCrossLinks;
        j++
      ) {
        const b = thoughtList[j];
        if (a.node.parentId === b.thoughtId || b.node.parentId === a.thoughtId) {
          continue;
        }
        const sharesActor = a.node.actorIds.some((id) =>
          b.node.actorIds.includes(id)
        );
        if (sharesActor) {
          pairs.push({
            a: a.position,
            b: b.position,
            ca: a.color.clone().lerp(subtleWhite, 0.4),
            cb: b.color.clone().lerp(subtleWhite, 0.4),
            isThoughtEdge: true,
          });
          crossCount++;
        }
      }
    }

    filamentPairs = pairs;

    const posArr = new Float32Array(pairs.length * 6);
    const colArr = new Float32Array(pairs.length * 6);
    for (let i = 0; i < pairs.length; i++) {
      const p = pairs[i];
      const offset = i * 6;
      posArr[offset] = p.a.x;
      posArr[offset + 1] = p.a.y;
      posArr[offset + 2] = p.a.z;
      posArr[offset + 3] = p.b.x;
      posArr[offset + 4] = p.b.y;
      posArr[offset + 5] = p.b.z;

      colArr[offset] = p.ca.r;
      colArr[offset + 1] = p.ca.g;
      colArr[offset + 2] = p.ca.b;
      colArr[offset + 3] = p.cb.r;
      colArr[offset + 4] = p.cb.g;
      colArr[offset + 5] = p.cb.b;
    }

    webGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    webGeo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
    webGeo.computeBoundingSphere();
  };

  const syncWithState = (
    nextSkills: SkillDefinition[],
    nextEmployees: EmployeeProfile[],
    nextNodes: BrainThoughtNode[],
    selectedKey: string | null
  ) => {
    // 1. Reconcile Skill Anchors
    const validSkillIds = new Set(nextSkills.map((s) => s.id));
    for (const [id, item] of skillAnchors.entries()) {
      if (!validSkillIds.has(id)) {
        root.remove(item.group);
        (item.orbMesh.material as THREE.Material).dispose();
        (item.ringMesh.material as THREE.Material).dispose();
        skillAnchors.delete(id);
      }
    }

    nextSkills.forEach((skill, idx) => {
      const color = resolveSkillColor(skill, nextEmployees);
      const nodeKey = `skill:${skill.id}`;
      let visual = skillAnchors.get(skill.id);

      if (!visual) {
        const dir = computeFibonacciUnitDir(idx, nextSkills.length);
        const defaultPos = new THREE.Vector3(
          dir[0] * SKILL_ANCHOR_RADIUS,
          dir[1] * SKILL_ANCHOR_RADIUS,
          dir[2] * SKILL_ANCHOR_RADIUS
        );
        const pos = customPositions.get(nodeKey)?.clone() ?? defaultPos;

        const group = new THREE.Group();
        group.position.copy(pos);

        const orbMesh = new THREE.Mesh(
          skillGeo,
          new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.68,
            roughness: 0.25,
            metalness: 0.5,
          })
        );
        group.add(orbMesh);

        const ringMesh = new THREE.Mesh(
          skillRingGeo,
          new THREE.MeshBasicMaterial({
            color: 0xe2e8f0,
            transparent: true,
            opacity: 0.38,
          })
        );
        ringMesh.rotation.x = Math.PI / 2;
        group.add(ringMesh);

        const hitProxy = new THREE.Mesh(skillHitGeo, hitMat);
        hitProxy.layers.set(1);
        hitProxy.userData = {
          nodeKind: 'skill',
          skillId: skill.id,
          nodeKey,
        };
        group.add(hitProxy);

        root.add(group);
        visual = {
          skillId: skill.id,
          name: skill.name,
          color,
          orbitRadius: SKILL_ANCHOR_RADIUS,
          position: pos,
          group,
          orbMesh,
          ringMesh,
          hitProxy,
          lastPulseAt: -10,
        };
        skillAnchors.set(skill.id, visual);
      }

      const isSelected = selectedKey === nodeKey;
      const orbMat = visual.orbMesh.material as THREE.MeshStandardMaterial;
      orbMat.emissiveIntensity = isSelected ? 1.35 : 0.72;
      const ringMatLocal = visual.ringMesh.material as THREE.MeshBasicMaterial;
      ringMatLocal.opacity = isSelected ? 0.92 : 0.35;
      visual.ringMesh.scale.setScalar(isSelected ? 1.25 : 1);
    });

    // 2. Reconcile Autonomous Thought Nodes
    const validThoughtIds = new Set(nextNodes.map((n) => n.id));
    for (const [id, tv] of thoughtNodes.entries()) {
      if (!validThoughtIds.has(id)) {
        root.remove(tv.group);
        (tv.orbMesh.material as THREE.Material).dispose();
        (tv.ringMesh.material as THREE.Material).dispose();
        thoughtNodes.delete(id);
      }
    }

    const newlyAddedThoughts: BrainThoughtVisual[] = [];

    for (const n of nextNodes) {
      const nodeKey = `thought:${n.id}`;
      const skillColor =
        skillAnchors.get(n.skillId)?.color ?? new THREE.Color(0x22d3ee);
      let tv = thoughtNodes.get(n.id);

      if (!tv) {
        const defaultPos = new THREE.Vector3(
          n.dir[0] * n.radius,
          n.dir[1] * n.radius,
          n.dir[2] * n.radius
        );
        const pos = customPositions.get(nodeKey)?.clone() ?? defaultPos;

        const group = new THREE.Group();
        group.position.copy(pos);

        const importanceScale = 0.78 + (n.importance - 0.65) * 1.15;
        const orbMesh = new THREE.Mesh(
          thoughtGeo,
          new THREE.MeshStandardMaterial({
            color: skillColor,
            emissive: skillColor,
            emissiveIntensity: 0.85,
            roughness: 0.22,
            metalness: 0.4,
          })
        );
        orbMesh.scale.setScalar(importanceScale);
        group.add(orbMesh);

        const ringMesh = new THREE.Mesh(
          thoughtRingGeo,
          new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.28,
          })
        );
        ringMesh.rotation.x = Math.PI / 2;
        group.add(ringMesh);

        const hitProxy = new THREE.Mesh(thoughtHitGeo, hitMat);
        hitProxy.layers.set(1);
        hitProxy.userData = {
          nodeKind: 'thought',
          thoughtId: n.id,
          nodeKey,
        };
        group.add(hitProxy);

        root.add(group);
        tv = {
          thoughtId: n.id,
          node: n,
          color: skillColor,
          orbitRadius: n.radius,
          baseScale: importanceScale,
          bornAt: initialSyncDone ? currentElapsed : -10,
          position: pos,
          group,
          orbMesh,
          ringMesh,
          hitProxy,
        };
        thoughtNodes.set(n.id, tv);
        if (initialSyncDone) {
          newlyAddedThoughts.push(tv);
        }
      } else {
        tv.node = n;
      }

      const isSelected = selectedKey === nodeKey;
      const orbMat = tv.orbMesh.material as THREE.MeshStandardMaterial;
      orbMat.emissiveIntensity = isSelected ? 1.5 : 0.85;
      const ringMatLocal = tv.ringMesh.material as THREE.MeshBasicMaterial;
      ringMatLocal.opacity = isSelected ? 0.95 : 0.22;
      tv.ringMesh.scale.setScalar(isSelected ? 1.3 : 1);
    }

    rebuildFilaments();

    // Emit traveling synaptic pulse waves whenever new thoughts connect
    if (newlyAddedThoughts.length > 0) {
      lastSurgeAt = currentElapsed;
      const coreOrigin = new THREE.Vector3(0, 0, 0);
      for (const tv of newlyAddedThoughts) {
        const anchor = skillAnchors.get(tv.node.skillId);
        if (anchor) {
          anchor.lastPulseAt = currentElapsed;
          spawnSynapseBurst(coreOrigin, anchor.position, tv.color, 1.15, false);
          spawnSynapseBurst(anchor.position, tv.position, new THREE.Color(0x67e8f9), 0.95, true);
        } else {
          spawnSynapseBurst(coreOrigin, tv.position, tv.color, 0.95, true);
        }
      }
    }
    initialSyncDone = true;
  };

  const setDraggedPosition = (nodeKey: string, worldPos: THREE.Vector3) => {
    customPositions.set(nodeKey, worldPos.clone());
    if (nodeKey.startsWith('skill:')) {
      const skillId = nodeKey.slice('skill:'.length);
      const anchor = skillAnchors.get(skillId);
      if (anchor) {
        anchor.position.copy(worldPos);
        anchor.group.position.copy(worldPos);
      }
    } else if (nodeKey.startsWith('thought:')) {
      const thoughtId = nodeKey.slice('thought:'.length);
      const tv = thoughtNodes.get(thoughtId);
      if (tv) {
        tv.position.copy(worldPos);
        tv.group.position.copy(worldPos);
      }
    }
    rebuildFilaments();
  };

  syncWithState(skills, employees, nodes, null);

  let prevElapsed = 0;

  return {
    root,
    coreGroup,
    innerCoreMesh,
    geodesicShell,
    orbitRingA,
    orbitRingB,
    coreHitProxy,
    starField,
    skillAnchors,
    thoughtNodes,
    customPositions,
    webLines,
    pulseParticles,
    coreTexture,
    getInteractables: () => [
      coreHitProxy,
      ...Array.from(skillAnchors.values()).map((s) => s.hitProxy),
      ...Array.from(thoughtNodes.values()).map((t) => t.hitProxy),
    ],
    syncWithState,
    setDraggedPosition,
    rebuildFilaments,
    animate: (elapsed, selectedKey) => {
      currentElapsed = elapsed;
      const dt = Math.min(0.1, Math.max(0.008, elapsed - prevElapsed));
      prevElapsed = elapsed;

      coreGroup.rotation.y = elapsed * 0.14;
      geodesicShell.rotation.y = -elapsed * 0.18;
      geodesicShell.rotation.x = Math.sin(elapsed * 0.25) * 0.08;
      orbitRingA.rotation.z = elapsed * 0.28;
      orbitRingB.rotation.z = -elapsed * 0.22;

      const surgeAge = elapsed - lastSurgeAt;
      const surgeFactor =
        surgeAge >= 0 && surgeAge < 2.8
          ? Math.sin((surgeAge / 2.8) * Math.PI) * (1 - surgeAge / 2.8)
          : 0;

      const coreGlow =
        (selectedKey === 'core' ? 1.65 : 1.25 + Math.sin(elapsed * 2.2) * 0.2) +
        surgeFactor * 0.95;
      (innerCoreMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = coreGlow;

      // Subtle breathing + new-thought surge pulse on synaptic web filaments
      webMat.opacity = Math.min(
        1,
        0.72 + Math.sin(elapsed * 2.4) * 0.09 + surgeFactor * 0.28
      );

      let idx = 0;
      for (const anchor of skillAnchors.values()) {
        anchor.ringMesh.rotation.z = elapsed * 0.55;
        const pulseAge = elapsed - anchor.lastPulseAt;
        const anchorBoost =
          pulseAge >= 0 && pulseAge < 2.6
            ? Math.sin(pulseAge * 6.5) * 0.5 + 0.5
            : 0;
        const breath = 1 + Math.sin(elapsed * 2.0 + idx * 0.65) * 0.06;
        const selected = selectedKey === `skill:${anchor.skillId}`;
        anchor.orbMesh.scale.setScalar(breath + anchorBoost * 0.26);
        (anchor.orbMesh.material as THREE.MeshStandardMaterial).emissiveIntensity =
          (selected ? 1.35 : 0.72) + anchorBoost * 0.95;
        idx++;
      }

      let tIdx = 0;
      for (const tv of thoughtNodes.values()) {
        tv.ringMesh.rotation.z = -elapsed * 0.7;
        const birthAge = elapsed - tv.bornAt;
        const birthWave =
          birthAge >= 0 && birthAge < 3.4
            ? Math.exp(-birthAge * 0.95) * (0.45 + 0.55 * Math.abs(Math.sin(birthAge * 5.2)))
            : 0;
        const breath = 1 + Math.sin(elapsed * 2.6 + tIdx * 0.85) * 0.085;
        const selected = selectedKey === `thought:${tv.thoughtId}`;

        tv.orbMesh.scale.setScalar(tv.baseScale * (breath + birthWave * 0.55));
        (tv.orbMesh.material as THREE.MeshStandardMaterial).emissiveIntensity =
          (selected ? 1.5 : 0.85) + birthWave * 1.45 + surgeFactor * 0.35;
        (tv.ringMesh.material as THREE.MeshBasicMaterial).opacity = Math.min(
          1,
          (selected ? 0.92 : 0.26) + birthWave * 0.7
        );
        tIdx++;
      }

      // Advance traveling synaptic pulses along filament pairs
      // Keep ambient traveling signals on active thought edges as well
      const ambientCount = Math.min(8, filamentPairs.filter((p) => p.isThoughtEdge).length);
      if (activePulses.length < ambientCount && filamentPairs.length > 0) {
        for (const p of filamentPairs) {
          if (p.isThoughtEdge && activePulses.length < ambientCount) {
            spawnSynapseBurst(p.a, p.b, p.cb, 0.45 + Math.random() * 0.25, true);
          }
        }
      }

      const posAttr = pulseGeo.getAttribute('position') as THREE.BufferAttribute;
      const colAttr = pulseGeo.getAttribute('color') as THREE.BufferAttribute;
      let writeIdx = 0;
      for (let i = activePulses.length - 1; i >= 0; i--) {
        const pulse = activePulses[i];
        pulse.progress += dt * pulse.speed;
        if (pulse.progress >= 1) {
          if (pulse.repeating && writeIdx < maxPulseParticles) {
            pulse.progress = 0;
          } else {
            activePulses.splice(i, 1);
            continue;
          }
        }
        if (writeIdx < maxPulseParticles) {
          const px = THREE.MathUtils.lerp(pulse.a.x, pulse.b.x, pulse.progress);
          const py = THREE.MathUtils.lerp(pulse.a.y, pulse.b.y, pulse.progress);
          const pz = THREE.MathUtils.lerp(pulse.a.z, pulse.b.z, pulse.progress);
          posAttr.setXYZ(writeIdx, px, py, pz);
          colAttr.setXYZ(writeIdx, pulse.color.r, pulse.color.g, pulse.color.b);
          writeIdx++;
        }
      }
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
      pulseGeo.setDrawRange(0, writeIdx);
    },
    dispose: () => {
      starGeo.dispose();
      starMat.dispose();
      pulseGeo.dispose();
      pulseMat.dispose();
      coreTexture.dispose();
      skillGeo.dispose();
      skillRingGeo.dispose();
      skillHitGeo.dispose();
      thoughtGeo.dispose();
      thoughtRingGeo.dispose();
      thoughtHitGeo.dispose();
      hitMat.dispose();
      webGeo.dispose();
      webMat.dispose();
      coreGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose?.();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose?.();
          }
        }
      });
    },
  };
}
