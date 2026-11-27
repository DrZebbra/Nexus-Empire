import * as THREE from 'three';
import type {
  AccessoryType,
  CharacterAnimationState,
  EmployeeProfile,
  HairStyle,
} from '../types/nexus';

export interface CharacterRig {
  employeeId: string;
  root: THREE.Group;
  bodyPivot: THREE.Group;
  torso: THREE.Group;
  headGroup: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  selectionRing: THREE.Mesh;
  hitProxy: THREE.Mesh;
  headAnchorLocalY: number;
  currentX: number;
  currentY: number;
  currentZ: number;
  currentYaw: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  targetYaw: number;
}

const _sharedBox = new THREE.BoxGeometry(1, 1, 1);
const _sharedCyl = new THREE.CylinderGeometry(1, 1, 1, 14);
const _sharedSphere = new THREE.SphereGeometry(1, 16, 14);

function buildHairMesh(
  style: HairStyle,
  material: THREE.Material
): THREE.Group {
  const hair = new THREE.Group();

  const cap = new THREE.Mesh(_sharedSphere, material);
  cap.scale.set(0.245, 0.21, 0.245);
  cap.position.set(0, 0.08, -0.01);
  cap.castShadow = true;
  hair.add(cap);

  switch (style) {
    case 'short_parted': {
      const tuft = new THREE.Mesh(_sharedBox, material);
      tuft.scale.set(0.36, 0.1, 0.28);
      tuft.position.set(0.02, 0.2, 0.04);
      tuft.rotation.z = -0.08;
      hair.add(tuft);
      break;
    }
    case 'bob_cut': {
      const back = new THREE.Mesh(_sharedBox, material);
      back.scale.set(0.49, 0.34, 0.26);
      back.position.set(0, -0.04, -0.1);
      hair.add(back);
      break;
    }
    case 'curly_afro': {
      const puffs = [
        [0, 0.22, 0, 0.26],
        [-0.16, 0.14, -0.04, 0.16],
        [0.16, 0.14, -0.04, 0.16],
        [0, 0.12, -0.18, 0.18],
      ];
      for (const [px, py, pz, s] of puffs) {
        const m = new THREE.Mesh(_sharedSphere, material);
        m.scale.setScalar(s);
        m.position.set(px, py, pz);
        hair.add(m);
      }
      break;
    }
    case 'ponytail': {
      const tail = new THREE.Mesh(_sharedCyl, material);
      tail.scale.set(0.08, 0.36, 0.08);
      tail.position.set(0, -0.04, -0.26);
      tail.rotation.x = 0.45;
      hair.add(tail);
      break;
    }
    case 'long_wavy': {
      const drape = new THREE.Mesh(_sharedBox, material);
      drape.scale.set(0.5, 0.48, 0.22);
      drape.position.set(0, -0.12, -0.13);
      hair.add(drape);
      break;
    }
    case 'bun': {
      const bun = new THREE.Mesh(_sharedSphere, material);
      bun.scale.setScalar(0.13);
      bun.position.set(0, 0.27, -0.16);
      hair.add(bun);
      break;
    }
    case 'spiky': {
      for (let i = -1; i <= 1; i++) {
        const spike = new THREE.Mesh(_sharedBox, material);
        spike.scale.set(0.09, 0.17, 0.12);
        spike.position.set(i * 0.11, 0.25, 0.03);
        spike.rotation.z = -i * 0.22;
        hair.add(spike);
      }
      break;
    }
    case 'undercut': {
      const top = new THREE.Mesh(_sharedBox, material);
      top.scale.set(0.32, 0.13, 0.38);
      top.position.set(0, 0.22, 0.02);
      hair.add(top);
      break;
    }
    case 'side_sweep': {
      const sweep = new THREE.Mesh(_sharedBox, material);
      sweep.scale.set(0.4, 0.11, 0.3);
      sweep.position.set(0.05, 0.19, 0.05);
      sweep.rotation.z = -0.15;
      hair.add(sweep);
      break;
    }
    case 'shoulder_layers': {
      const leftSide = new THREE.Mesh(_sharedBox, material);
      leftSide.scale.set(0.12, 0.38, 0.24);
      leftSide.position.set(-0.22, -0.08, -0.04);
      const rightSide = new THREE.Mesh(_sharedBox, material);
      rightSide.scale.set(0.12, 0.38, 0.24);
      rightSide.position.set(0.22, -0.08, -0.04);
      hair.add(leftSide, rightSide);
      break;
    }
    case 'fade':
    case 'buzz':
    default: {
      cap.scale.set(0.235, 0.19, 0.235);
      break;
    }
  }

  return hair;
}

function addAccessory(
  type: AccessoryType,
  headGroup: THREE.Group,
  torso: THREE.Group,
  rightArmPivot: THREE.Group,
  accentColor: string
) {
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0xd1d5db,
    metalness: 0.75,
    roughness: 0.25,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    metalness: 0.3,
    roughness: 0.35,
    emissive: new THREE.Color(accentColor),
    emissiveIntensity: 0.25,
  });

  switch (type) {
    case 'glasses': {
      const frameMat = new THREE.MeshStandardMaterial({
        color: 0x111827,
        metalness: 0.6,
        roughness: 0.25,
      });
      const leftRim = new THREE.Mesh(_sharedBox, frameMat);
      leftRim.scale.set(0.12, 0.08, 0.03);
      leftRim.position.set(-0.09, 0.03, 0.23);
      const rightRim = new THREE.Mesh(_sharedBox, frameMat);
      rightRim.scale.set(0.12, 0.08, 0.03);
      rightRim.position.set(0.09, 0.03, 0.23);
      const bridge = new THREE.Mesh(_sharedBox, frameMat);
      bridge.scale.set(0.06, 0.02, 0.02);
      bridge.position.set(0, 0.03, 0.23);
      headGroup.add(leftRim, rightRim, bridge);
      break;
    }
    case 'headset': {
      const band = new THREE.Mesh(_sharedBox, metalMat);
      band.scale.set(0.5, 0.04, 0.06);
      band.position.set(0, 0.26, 0);
      const earL = new THREE.Mesh(_sharedCyl, accentMat);
      earL.scale.set(0.06, 0.07, 0.06);
      earL.rotation.z = Math.PI / 2;
      earL.position.set(-0.24, 0.02, 0);
      const earR = earL.clone();
      earR.position.set(0.24, 0.02, 0);
      headGroup.add(band, earL, earR);
      break;
    }
    case 'cap': {
      const crown = new THREE.Mesh(_sharedCyl, accentMat);
      crown.scale.set(0.25, 0.12, 0.25);
      crown.position.set(0, 0.21, 0);
      const brim = new THREE.Mesh(_sharedBox, accentMat);
      brim.scale.set(0.32, 0.03, 0.22);
      brim.position.set(0, 0.16, 0.22);
      headGroup.add(crown, brim);
      break;
    }
    case 'bowtie': {
      const tie = new THREE.Mesh(_sharedBox, accentMat);
      tie.scale.set(0.16, 0.07, 0.05);
      tie.position.set(0, 0.3, 0.19);
      torso.add(tie);
      break;
    }
    case 'badge_lanyard': {
      const badge = new THREE.Mesh(_sharedBox, accentMat);
      badge.scale.set(0.11, 0.14, 0.03);
      badge.position.set(0.11, 0.14, 0.19);
      torso.add(badge);
      break;
    }
    case 'scarf': {
      const scarf = new THREE.Mesh(_sharedCyl, accentMat);
      scarf.scale.set(0.22, 0.09, 0.19);
      scarf.position.set(0, 0.31, 0);
      torso.add(scarf);
      break;
    }
    case 'tablet': {
      const tab = new THREE.Mesh(_sharedBox, metalMat);
      tab.scale.set(0.2, 0.02, 0.26);
      tab.position.set(0, -0.42, 0.16);
      rightArmPivot.add(tab);
      break;
    }
    case 'watch': {
      const band = new THREE.Mesh(_sharedCyl, accentMat);
      band.scale.set(0.08, 0.04, 0.08);
      band.position.set(0, -0.36, 0);
      rightArmPivot.add(band);
      break;
    }
    case 'stylus': {
      const pen = new THREE.Mesh(_sharedCyl, accentMat);
      pen.scale.set(0.018, 0.2, 0.018);
      pen.rotation.x = Math.PI / 2;
      pen.position.set(0, -0.43, 0.1);
      rightArmPivot.add(pen);
      break;
    }
    case 'earpiece':
    case 'visor_clip':
    case 'blazer_lapel':
    default: {
      const pin = new THREE.Mesh(_sharedSphere, accentMat);
      pin.scale.setScalar(0.035);
      pin.position.set(-0.12, 0.22, 0.18);
      torso.add(pin);
      break;
    }
  }
}

export function createProceduralCharacterRig(
  employee: EmployeeProfile,
  floorY: number
): CharacterRig {
  const { appearance, workstation } = employee;

  const root = new THREE.Group();
  root.position.set(workstation.x, floorY, workstation.z);
  root.rotation.y = workstation.deskYaw;

  // Contact shadow disc grounded at floor level
  const shadowGeo = new THREE.CircleGeometry(0.42, 20);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.015;
  root.add(contactShadow);

  // Selection highlight ring
  const ringGeo = new THREE.RingGeometry(0.45, 0.56, 28);
  const ringMat = new THREE.MeshBasicMaterial({
    color: appearance.accentColor,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const selectionRing = new THREE.Mesh(ringGeo, ringMat);
  selectionRing.rotation.x = -Math.PI / 2;
  selectionRing.position.y = 0.022;
  root.add(selectionRing);

  const bodyPivot = new THREE.Group();
  bodyPivot.scale.set(
    appearance.shoulderScale,
    appearance.heightScale,
    appearance.shoulderScale
  );
  root.add(bodyPivot);

  // Materials with calibrated roughness contrast (>= 0.25 variance)
  const skinMat = new THREE.MeshStandardMaterial({
    color: appearance.skinTone,
    roughness: 0.68,
    metalness: 0.04,
  });
  const outfitMat = new THREE.MeshStandardMaterial({
    color: appearance.outfitPrimary,
    roughness: 0.78,
    metalness: 0.08,
  });
  const outfitTrimMat = new THREE.MeshStandardMaterial({
    color: appearance.outfitSecondary,
    roughness: 0.35,
    metalness: 0.28,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: appearance.pantsColor,
    roughness: 0.82,
    metalness: 0.05,
  });
  const shoeMat = new THREE.MeshStandardMaterial({
    color: appearance.shoeColor,
    roughness: 0.32,
    metalness: 0.2,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: appearance.hairColor,
    roughness: 0.75,
    metalness: 0.05,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.2,
    metalness: 0.1,
  });

  // Legs + Shoes (bottom-center grounded at y = 0)
  const buildLeg = (xOffset: number): THREE.Group => {
    const legPivot = new THREE.Group();
    legPivot.position.set(xOffset, 0.62, 0);

    const legMesh = new THREE.Mesh(_sharedCyl, pantsMat);
    legMesh.scale.set(0.095, 0.56, 0.095);
    legMesh.position.set(0, -0.28, 0);
    legMesh.castShadow = true;
    legPivot.add(legMesh);

    const shoeMesh = new THREE.Mesh(_sharedBox, shoeMat);
    shoeMesh.scale.set(0.13, 0.09, 0.23);
    shoeMesh.position.set(0, -0.575, 0.04);
    shoeMesh.castShadow = true;
    legPivot.add(shoeMesh);

    return legPivot;
  };

  const leftLegPivot = buildLeg(-0.12);
  const rightLegPivot = buildLeg(0.12);
  bodyPivot.add(leftLegPivot, rightLegPivot);

  // Torso (waist at y = 0.62 to shoulders at y = 1.24)
  const torso = new THREE.Group();
  torso.position.set(0, 0.62, 0);
  bodyPivot.add(torso);

  const jacket = new THREE.Mesh(_sharedBox, outfitMat);
  jacket.scale.set(0.46, 0.62, 0.28);
  jacket.position.set(0, 0.31, 0);
  jacket.castShadow = true;
  torso.add(jacket);

  const chestStripe = new THREE.Mesh(_sharedBox, outfitTrimMat);
  chestStripe.scale.set(0.48, 0.08, 0.295);
  chestStripe.position.set(0, 0.44, 0);
  torso.add(chestStripe);

  const collar = new THREE.Mesh(_sharedCyl, outfitTrimMat);
  collar.scale.set(0.14, 0.08, 0.14);
  collar.position.set(0, 0.63, 0);
  torso.add(collar);

  // Arms pivoted at shoulders
  const buildArm = (xOffset: number): THREE.Group => {
    const armPivot = new THREE.Group();
    armPivot.position.set(xOffset, 0.56, 0);

    const sleeve = new THREE.Mesh(_sharedCyl, outfitMat);
    sleeve.scale.set(0.075, 0.42, 0.075);
    sleeve.position.set(0, -0.21, 0);
    sleeve.castShadow = true;
    armPivot.add(sleeve);

    const hand = new THREE.Mesh(_sharedSphere, skinMat);
    hand.scale.setScalar(0.068);
    hand.position.set(0, -0.45, 0);
    armPivot.add(hand);

    return armPivot;
  };

  const leftArmPivot = buildArm(-0.3);
  const rightArmPivot = buildArm(0.3);
  torso.add(leftArmPivot, rightArmPivot);

  // Head group
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.84, 0);
  torso.add(headGroup);

  const headSphere = new THREE.Mesh(_sharedSphere, skinMat);
  headSphere.scale.set(0.22, 0.24, 0.22);
  headSphere.castShadow = true;
  headGroup.add(headSphere);

  // Facial eyes (gives clear front-facing readability!)
  const leftEye = new THREE.Mesh(_sharedSphere, eyeMat);
  leftEye.scale.set(0.028, 0.036, 0.02);
  leftEye.position.set(-0.075, 0.03, 0.205);
  const rightEye = new THREE.Mesh(_sharedSphere, eyeMat);
  rightEye.scale.set(0.028, 0.036, 0.02);
  rightEye.position.set(0.075, 0.03, 0.205);
  headGroup.add(leftEye, rightEye);

  const hairMesh = buildHairMesh(appearance.hairStyle, hairMat);
  headGroup.add(hairMesh);

  addAccessory(
    appearance.accessory,
    headGroup,
    torso,
    rightArmPivot,
    appearance.accentColor
  );

  // Invisible simplified proxy for fast raycasting
  const hitProxy = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 1.95, 0.75),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitProxy.position.set(0, 0.98, 0);
  hitProxy.userData.employeeId = employee.id;
  hitProxy.layers.set(1);
  root.add(hitProxy);

  return {
    employeeId: employee.id,
    root,
    bodyPivot,
    torso,
    headGroup,
    leftArmPivot,
    rightArmPivot,
    leftLegPivot,
    rightLegPivot,
    selectionRing,
    hitProxy,
    headAnchorLocalY: 2.08 * appearance.heightScale,
    currentX: workstation.x,
    currentY: floorY,
    currentZ: workstation.z,
    currentYaw: workstation.deskYaw,
    targetX: workstation.x,
    targetY: floorY,
    targetZ: workstation.z,
    targetYaw: workstation.deskYaw,
  };
}

function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * (1 - Math.exp(-lambda * dt));
}

export function updateCharacterRigAnimation(
  rig: CharacterRig,
  state: CharacterAnimationState,
  isSelected: boolean,
  dt: number,
  elapsedTime: number
) {
  // Smooth position & yaw interpolation
  rig.currentX = THREE.MathUtils.damp(rig.currentX, rig.targetX, 6, dt);
  rig.currentY = THREE.MathUtils.damp(rig.currentY, rig.targetY, 6, dt);
  rig.currentZ = THREE.MathUtils.damp(rig.currentZ, rig.targetZ, 6, dt);
  rig.currentYaw = dampAngle(rig.currentYaw, rig.targetYaw, 8, dt);

  rig.root.position.set(rig.currentX, rig.currentY, rig.currentZ);
  rig.root.rotation.y = rig.currentYaw;

  const distToTarget = Math.hypot(rig.targetX - rig.currentX, rig.targetZ - rig.currentZ);
  const effectiveState: CharacterAnimationState =
    distToTarget > 0.18 ? 'walking' : state;

  // Selection ring opacity
  const ringMat = rig.selectionRing.material as THREE.MeshBasicMaterial;
  ringMat.opacity = isSelected ? 0.85 : 0;

  // Reset baseline transforms gently
  let lArmX = 0;
  let rArmX = 0;
  let lArmZ = 0.08;
  let rArmZ = -0.08;
  let lLegX = 0;
  let rLegX = 0;
  let headX = 0;
  let headY = 0;
  let torsoBob = 0;
  let torsoLean = 0;

  const phase = elapsedTime + rig.employeeId.charCodeAt(rig.employeeId.length - 1) * 0.7;

  switch (effectiveState) {
    case 'working': {
      // Facing monitor, hands typing rapidly on keyboard
      torsoLean = 0.09;
      lArmX = -1.05 + Math.sin(phase * 11) * 0.14;
      rArmX = -1.05 + Math.cos(phase * 11) * 0.14;
      headX = 0.08 + Math.sin(phase * 2.1) * 0.04;
      headY = Math.sin(phase * 1.1) * 0.07;
      break;
    }
    case 'walking': {
      const stride = Math.sin(phase * 7.5);
      lLegX = stride * 0.55;
      rLegX = -stride * 0.55;
      lArmX = -stride * 0.45;
      rArmX = stride * 0.45;
      torsoBob = Math.abs(Math.cos(phase * 7.5)) * 0.04;
      break;
    }
    case 'conversing': {
      // Turned toward partner, expressive gestures
      lArmX = -0.55 + Math.sin(phase * 4.2) * 0.28;
      rArmX = -0.7 + Math.cos(phase * 3.8) * 0.32;
      lArmZ = 0.22;
      rArmZ = -0.22;
      headX = Math.sin(phase * 3.0) * 0.08;
      headY = Math.sin(phase * 2.2) * 0.14;
      break;
    }
    case 'celebrating': {
      lArmX = -2.6 + Math.sin(phase * 8) * 0.18;
      rArmX = -2.6 + Math.cos(phase * 8) * 0.18;
      lArmZ = 0.35;
      rArmZ = -0.35;
      torsoBob = Math.abs(Math.sin(phase * 6)) * 0.14;
      break;
    }
    case 'thinking': {
      rArmX = -1.35;
      rArmZ = 0.2;
      headX = -0.14;
      headY = Math.sin(phase * 1.2) * 0.18;
      break;
    }
    case 'resting': {
      torsoBob = -0.05;
      headX = 0.18;
      lArmX = 0.05;
      rArmX = 0.05;
      break;
    }
    case 'idle':
    default: {
      torsoBob = Math.sin(phase * 1.8) * 0.015;
      headY = Math.sin(phase * 0.9) * 0.1;
      break;
    }
  }

  rig.torso.position.y = THREE.MathUtils.damp(rig.torso.position.y, 0.62 + torsoBob, 10, dt);
  rig.torso.rotation.x = THREE.MathUtils.damp(rig.torso.rotation.x, torsoLean, 10, dt);
  rig.leftArmPivot.rotation.x = THREE.MathUtils.damp(rig.leftArmPivot.rotation.x, lArmX, 12, dt);
  rig.rightArmPivot.rotation.x = THREE.MathUtils.damp(rig.rightArmPivot.rotation.x, rArmX, 12, dt);
  rig.leftArmPivot.rotation.z = THREE.MathUtils.damp(rig.leftArmPivot.rotation.z, lArmZ, 12, dt);
  rig.rightArmPivot.rotation.z = THREE.MathUtils.damp(rig.rightArmPivot.rotation.z, rArmZ, 12, dt);
  rig.leftLegPivot.rotation.x = THREE.MathUtils.damp(rig.leftLegPivot.rotation.x, lLegX, 12, dt);
  rig.rightLegPivot.rotation.x = THREE.MathUtils.damp(rig.rightLegPivot.rotation.x, rLegX, 12, dt);
  rig.headGroup.rotation.x = THREE.MathUtils.damp(rig.headGroup.rotation.x, headX, 10, dt);
  rig.headGroup.rotation.y = THREE.MathUtils.damp(rig.headGroup.rotation.y, headY, 10, dt);
}
