import type {
  BrainThoughtNode,
  EmployeeProfile,
  NexusState,
  SkillDefinition,
} from '../types/nexus';

export const SKILL_ANCHOR_RADIUS = 4.2;
export const THOUGHT_BASE_RADIUS = 5.65;
export const THOUGHT_STEP_RADIUS = 0.52;
export const THOUGHT_MAX_RADIUS = 8.4;

let _mindSeq = 0;

/**
 * Deterministic Fibonacci sphere unit vector for anchoring each employee skill
 * evenly around the spherical Nexus Mind planet.
 */
export function computeFibonacciUnitDir(
  index: number,
  total: number
): [number, number, number] {
  const safeTotal = Math.max(1, total);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const y = safeTotal === 1 ? 0 : 1 - (index / (safeTotal - 1)) * 2;
  const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = goldenAngle * index;
  const x = Math.cos(theta) * radiusAtY;
  const z = Math.sin(theta) * radiusAtY;
  const len = Math.hypot(x, y, z) || 1;
  return [x / len, y / len, z / len];
}

/**
 * Computes a deterministic branching unit vector near a parent unit vector,
 * forming a neural web around the spherical planet.
 */
export function computeBranchUnitDir(
  parentDir: [number, number, number],
  branchIndex: number
): [number, number, number] {
  const [px, py, pz] = parentDir;
  // Construct tangent basis (t1, t2) orthogonal to parentDir
  const refX = Math.abs(py) < 0.9 ? 0 : 1;
  const refY = Math.abs(py) < 0.9 ? 1 : 0;
  const refZ = 0;

  // t1 = normalize(cross(ref, parent))
  let t1x = refY * pz - refZ * py;
  let t1y = refZ * px - refX * pz;
  let t1z = refX * py - refY * px;
  const t1Len = Math.hypot(t1x, t1y, t1z) || 1;
  t1x /= t1Len;
  t1y /= t1Len;
  t1z /= t1Len;

  // t2 = cross(parent, t1)
  const t2x = py * t1z - pz * t1y;
  const t2y = pz * t1x - px * t1z;
  const t2z = px * t1y - py * t1x;

  const angle = branchIndex * 2.399963229728653; // golden angle radians
  const spread = 0.24 + (branchIndex % 4) * 0.06;

  const nx = px + (Math.cos(angle) * t1x + Math.sin(angle) * t2x) * spread;
  const ny = py + (Math.cos(angle) * t1y + Math.sin(angle) * t2y) * spread;
  const nz = pz + (Math.cos(angle) * t1z + Math.sin(angle) * t2z) * spread;
  const len = Math.hypot(nx, ny, nz) || 1;
  return [nx / len, ny / len, nz / len];
}

const TRIVIAL_PATTERNS = /^(oi|ol[aá]|ok|blz|beleza|certo|entendido|obrigado|valeu|sim|n[aã]o|tudo bem|bom dia|boa tarde|boa noite)[!.\s]*$/i;

export interface BrainThoughtCandidate {
  skillId: string;
  actorIds: string[];
  concept: string;
  essence: string;
  importance: number;
  sourceType: BrainThoughtNode['sourceType'];
  preferredParentId?: string | null;
}

export function evaluateLocalThoughtImportance(input: {
  text: string;
  actors: EmployeeProfile[];
  skills: SkillDefinition[];
  sourceType: BrainThoughtNode['sourceType'];
  hasActiveTask?: boolean;
}): { important: boolean; candidate: BrainThoughtCandidate | null } {
  const clean = input.text.replace(/\s+/g, ' ').trim();
  if (!clean || clean.length < 18 || TRIVIAL_PATTERNS.test(clean)) {
    return { important: false, candidate: null };
  }

  const primaryActor = input.actors[0];
  const candidateSkillIds = input.actors.flatMap((a) => a.skillIds);
  const matchedSkill =
    input.skills.find(
      (s) =>
        candidateSkillIds.includes(s.id) &&
        clean.toLowerCase().includes(s.name.split(' ')[0].toLowerCase())
    ) ??
    input.skills.find((s) => candidateSkillIds.includes(s.id)) ??
    input.skills[0];

  if (!matchedSkill) {
    return { important: false, candidate: null };
  }

  const keywords =
    /(estrat[eé]g|margem|pre[cç]o|fornecedor|pesquisa|campanha|convers[aã]o|roas|cpa|cat[aá]logo|produto|funil|lan[cç]amento|mercado|meta|google|whatsapp|site|checkout|alinhamento|tarefa|aprova[cç][aã]o)/i;
  const hasDomainSignal = keywords.test(clean);
  const importance = Math.min(
    0.98,
    0.6 +
      (hasDomainSignal ? 0.16 : 0) +
      (input.hasActiveTask ? 0.1 : 0) +
      (input.actors.length > 1 ? 0.08 : 0) +
      (clean.length > 80 ? 0.06 : 0)
  );

  if (importance < 0.65) {
    return { important: false, candidate: null };
  }

  const concept =
    clean.length > 48 ? `${clean.slice(0, 45).trim()}...` : clean;
  const essence =
    clean.length > 136 ? `${clean.slice(0, 133).trim()}...` : clean;

  return {
    important: true,
    candidate: {
      skillId: matchedSkill.id,
      actorIds: input.actors.map((a) => a.id),
      concept,
      essence,
      importance: Number(importance.toFixed(2)),
      sourceType: input.sourceType,
    },
  };
}

export function appendBrainThought(
  state: NexusState,
  candidate: BrainThoughtCandidate,
  nowIso: string
): NexusState {
  const { brain, skills } = state;
  if (brain.nodes.length >= brain.maxConnections) {
    return state;
  }

  const normalizedConcept = candidate.concept.trim().toLowerCase();
  const duplicate = brain.nodes.some(
    (n) =>
      n.skillId === candidate.skillId &&
      n.concept.trim().toLowerCase() === normalizedConcept
  );
  if (duplicate) {
    return state;
  }

  const skillIndex = Math.max(
    0,
    skills.findIndex((s) => s.id === candidate.skillId)
  );
  const skillAnchorDir = computeFibonacciUnitDir(skillIndex, skills.length);

  // Branch off the most recent thought in the same skill if one exists,
  // creating progressive neural ramifications (max chain depth ~5)
  const sameSkillNodes = brain.nodes.filter(
    (n) => n.skillId === candidate.skillId
  );
  const explicitParent = candidate.preferredParentId
    ? brain.nodes.find((n) => n.id === candidate.preferredParentId) ?? null
    : null;
  const autoParent =
    explicitParent ??
    (sameSkillNodes.length > 0 && sameSkillNodes.length % 3 !== 0
      ? sameSkillNodes[0]
      : null);

  const parentDir = autoParent ? autoParent.dir : skillAnchorDir;
  const dir = computeBranchUnitDir(parentDir, brain.nodes.length + sameSkillNodes.length);
  const parentRadius = autoParent ? autoParent.radius : SKILL_ANCHOR_RADIUS;
  const radius = Math.min(
    THOUGHT_MAX_RADIUS,
    Number((Math.max(THOUGHT_BASE_RADIUS, parentRadius + THOUGHT_STEP_RADIUS)).toFixed(2))
  );

  _mindSeq += 1;
  const newNode: BrainThoughtNode = {
    id: `mind_${brain.nodes.length + 1}_${Date.now().toString(36)}_${_mindSeq.toString(36)}`,
    parentId: autoParent ? autoParent.id : null,
    skillId: candidate.skillId,
    actorIds: candidate.actorIds.slice(0, 2),
    concept: candidate.concept.trim().slice(0, 64),
    essence: candidate.essence.trim().slice(0, 148),
    importance: Math.max(0.65, Math.min(1, candidate.importance)),
    sourceType: candidate.sourceType,
    createdAt: nowIso,
    dir,
    radius,
  };

  return {
    ...state,
    brain: {
      ...brain,
      nodes: [newNode, ...brain.nodes],
      lastEvolvedAt: nowIso,
    },
  };
}

export function incrementBrainFilteredOut(state: NexusState): NexusState {
  return {
    ...state,
    brain: {
      ...state.brain,
      filteredOutCount: state.brain.filteredOutCount + 1,
    },
  };
}

export function setBrainMaxConnections(
  state: NexusState,
  maxConnections: number
): NexusState {
  const safeLimit = Math.max(1, Math.min(5000, Math.round(maxConnections)));
  return {
    ...state,
    brain: {
      ...state.brain,
      maxConnections: safeLimit,
    },
  };
}

export interface CompactMentalityExport {
  v: 1;
  core: 'Nexus Mind';
  company: string;
  exportedAt: string;
  limit: number;
  count: number;
  skills: Record<string, string>;
  employees: Record<string, [string, number, string[]]>;
  // Compact tuple format for ultra-low KB AI consumption:
  // [id, parentId, skillId, actorIds, weightPct, sourceCode, concept, essence, epochSec]
  synapses: Array<
    [string, string | null, string, string[], number, string, string, string, number]
  >;
}

export function buildCompactMentalityMetadata(
  state: NexusState,
  nowIso = new Date().toISOString()
): CompactMentalityExport {
  return {
    v: 1,
    core: 'Nexus Mind',
    company: state.settings.companyName,
    exportedAt: nowIso,
    limit: state.brain.maxConnections,
    count: state.brain.nodes.length,
    skills: Object.fromEntries(state.skills.map((s) => [s.id, s.name])),
    employees: Object.fromEntries(
      state.employees.map((e) => [e.id, [e.name, e.floor, e.skillIds]])
    ),
    synapses: state.brain.nodes.map((n) => [
      n.id,
      n.parentId,
      n.skillId,
      n.actorIds,
      Math.round(n.importance * 100),
      n.sourceType[0],
      n.concept,
      n.essence,
      Math.floor(new Date(n.createdAt).getTime() / 1000),
    ]),
  };
}

export function estimateMentalityBytes(state: NexusState): number {
  const payload = buildCompactMentalityMetadata(state, '2026-01-01T00:00:00.000Z');
  const json = JSON.stringify(payload);
  return new TextEncoder().encode(json).length;
}
