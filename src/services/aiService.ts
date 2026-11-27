import type {
  ChannelId,
  DepartmentId,
  EmployeeProfile,
  GroundingSource,
  TaskItem,
  TaskPriority,
  TokenUsagePolicy,
} from '../types/nexus';

export interface TokenUsageReport {
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
}

export interface NexusServerStatus {
  geminiConfigured: boolean;
  model: string;
  supabaseConfigured: boolean;
  channelAvailability: Record<ChannelId, boolean>;
}

export interface NexusCorePlanResult {
  reply: string;
  targetDepartment: DepartmentId;
  leadEmployeeId: string;
  requiresApproval: boolean;
  subtasks: Array<{
    title: string;
    description: string;
    assigneeId: string;
    priority: TaskPriority;
    requiredChannelIds: ChannelId[];
  }>;
  tokenUsage: TokenUsageReport;
  model: string;
}

export async function fetchNexusServerStatus(): Promise<NexusServerStatus> {
  try {
    const res = await fetch('/api/nexus/status');
    if (!res.ok) {
      return {
        geminiConfigured: false,
        model: 'gemini-4-hydrogen',
        supabaseConfigured: false,
        channelAvailability: {
          ch_google_search: false,
          ch_supabase: false,
          ch_google_ads: false,
          ch_meta_ads: false,
          ch_ecommerce: false,
          ch_whatsapp: false,
        },
      };
    }
    return (await res.json()) as NexusServerStatus;
  } catch {
    return {
      geminiConfigured: false,
      model: 'gemini-4-hydrogen',
      supabaseConfigured: false,
      channelAvailability: {
        ch_google_search: false,
        ch_supabase: false,
        ch_google_ads: false,
        ch_meta_ads: false,
        ch_ecommerce: false,
        ch_whatsapp: false,
      },
    };
  }
}

export async function verifyOfficialChannel(channelId: ChannelId): Promise<{
  ok: boolean;
  verifiedAt: string;
  accountLabel: string;
}> {
  const res = await fetch('/api/nexus/channels/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channelId }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      payload.message ?? 'Não foi possível verificar a conexão oficial do canal.'
    );
  }
  return {
    ok: true,
    verifiedAt: String(payload.verifiedAt ?? new Date().toISOString()),
    accountLabel: String(payload.accountLabel ?? 'Conexão Oficial Verificada'),
  };
}

export async function sendDirectiveToNexusCore(
  directive: string,
  employees: EmployeeProfile[],
  tasks: TaskItem[],
  tokenPolicy: TokenUsagePolicy
): Promise<NexusCorePlanResult> {
  const employeesSummary = employees
    .map(
      (e) =>
        `${e.id}: ${e.name} | ${e.role} | dept=${e.departmentId} (${e.floor}º Andar) | autonomia=${e.autonomyLevel}`
    )
    .join('\n');

  const recentTasksSummary = tasks
    .slice(0, 6)
    .map((t) => `${t.id}: ${t.title} [${t.status}] (${t.assigneeId})`)
    .join('\n');

  const res = await fetch('/api/nexus/core', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      directive,
      employeesSummary,
      recentTasksSummary,
      tokenPolicy,
    }),
  });

  if (!res.ok) {
    const errPayload = await res.json().catch(() => ({}));
    throw new Error(errPayload.message ?? 'Falha ao comunicar com o NEXUS CORE.');
  }

  const payload = await res.json();
  const data = payload.data ?? {};
  const targetDepartment: DepartmentId =
    data.targetDepartment === 'dept_marketing' ? 'dept_marketing' : 'dept_products';

  const validChannels: Set<string> = new Set([
    'ch_google_search',
    'ch_supabase',
    'ch_google_ads',
    'ch_meta_ads',
    'ch_ecommerce',
    'ch_whatsapp',
  ]);

  return {
    reply: String(data.reply ?? 'Diretriz processada pelo NEXUS CORE.'),
    targetDepartment,
    leadEmployeeId: String(
      data.leadEmployeeId ?? (targetDepartment === 'dept_marketing' ? 'emp_07' : 'emp_01')
    ),
    requiresApproval: Boolean(data.requiresApproval),
    subtasks: Array.isArray(data.subtasks)
      ? data.subtasks.map((st: Record<string, unknown>) => ({
          title: String(st.title ?? 'Subtarefa'),
          description: String(st.description ?? ''),
          assigneeId: String(
            st.assigneeId ?? (targetDepartment === 'dept_marketing' ? 'emp_08' : 'emp_02')
          ),
          priority:
            st.priority === 'critica' ||
            st.priority === 'alta' ||
            st.priority === 'media' ||
            st.priority === 'baixa'
              ? st.priority
              : 'media',
          requiredChannelIds: Array.isArray(st.requiredChannelIds)
            ? (st.requiredChannelIds.filter(
                (c): c is ChannelId => typeof c === 'string' && validChannels.has(c)
              ) as ChannelId[])
            : ['ch_google_search'],
        }))
      : [],
    tokenUsage: payload.tokenUsage ?? { promptTokens: 0, candidatesTokens: 0, totalTokens: 0 },
    model: String(payload.model ?? 'gemini-4-hydrogen'),
  };
}

export async function sendMessageToEmployeeAgent(
  employee: EmployeeProfile,
  message: string,
  activeTasks: TaskItem[],
  tokenPolicy: TokenUsagePolicy
): Promise<{ reply: string; tokenUsage: TokenUsageReport; model: string }> {
  const res = await fetch('/api/nexus/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employee: {
        id: employee.id,
        name: employee.name,
        role: employee.role,
        departmentId: employee.departmentId,
        floor: employee.floor,
        personality: employee.personality,
        specialty: employee.specialty,
        instructions: employee.instructions,
        autonomyLevel: employee.autonomyLevel,
      },
      message,
      activeTasks: activeTasks.map((t) => ({
        title: t.title,
        status: t.status,
        priority: t.priority,
      })),
      tokenPolicy,
    }),
  });

  if (!res.ok) {
    const errPayload = await res.json().catch(() => ({}));
    throw new Error(errPayload.message ?? 'Erro na comunicação com o agente.');
  }

  const data = await res.json();
  return {
    reply: String(data.reply ?? ''),
    tokenUsage: data.tokenUsage ?? { promptTokens: 0, candidatesTokens: 0, totalTokens: 0 },
    model: String(data.model ?? 'gemini-4-hydrogen'),
  };
}

export async function requestSupervisorAIReview(
  supervisor: EmployeeProfile,
  requester: EmployeeProfile,
  task: TaskItem,
  requiredChannelNames: string[],
  tokenPolicy: TokenUsagePolicy
): Promise<{ comment: string; tokenUsage: TokenUsageReport; model: string }> {
  const res = await fetch('/api/nexus/supervisor-review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      supervisor: { id: supervisor.id, name: supervisor.name, role: supervisor.role },
      requester: { id: requester.id, name: requester.name, role: requester.role },
      task: { id: task.id, title: task.title, description: task.description },
      requiredChannelNames,
      tokenPolicy,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message ?? 'Erro ao solicitar parecer do superior.');
  }
  return {
    comment: String(data.comment ?? ''),
    tokenUsage: data.tokenUsage ?? { promptTokens: 0, candidatesTokens: 0, totalTokens: 0 },
    model: String(data.model ?? 'gemini-4-hydrogen'),
  };
}

export async function executeTaskWithRealAI(
  task: TaskItem,
  employee: EmployeeProfile,
  connectedChannelIds: ChannelId[],
  tokenPolicy: TokenUsagePolicy
): Promise<{
  resultText: string;
  groundingSources: GroundingSource[];
  tokenUsage: TokenUsageReport;
  model: string;
}> {
  const res = await fetch('/api/nexus/execute-task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        permissionStatus: task.permissionStatus,
        requiredChannelIds: task.requiredChannelIds,
      },
      employee: {
        id: employee.id,
        name: employee.name,
        role: employee.role,
        floor: employee.floor,
        specialty: employee.specialty,
      },
      connectedChannelIds,
      tokenPolicy,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message ?? 'Erro ao executar tarefa com IA.');
  }
  return {
    resultText: String(data.resultText ?? ''),
    groundingSources: Array.isArray(data.groundingSources) ? data.groundingSources : [],
    tokenUsage: data.tokenUsage ?? { promptTokens: 0, candidatesTokens: 0, totalTokens: 0 },
    model: String(data.model ?? 'gemini-4-hydrogen'),
  };
}

export async function distillBrainThoughtWithAI(input: {
  text: string;
  actors: EmployeeProfile[];
  skills: Array<{ id: string; name: string }>;
  sourceType: 'conversation' | 'task_execution' | 'core_directive' | 'supervisor_review';
  tokenPolicy: TokenUsagePolicy;
}): Promise<{
  important: boolean;
  candidate: {
    concept: string;
    essence: string;
    skillId: string;
    importance: number;
  } | null;
  tokenUsage: TokenUsageReport;
  model: string;
} | null> {
  try {
    const res = await fetch('/api/nexus/brain/distill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: input.text,
        actors: input.actors.map((a) => ({ id: a.id, name: a.name, role: a.role })),
        skills: input.skills.map((s) => ({ id: s.id, name: s.name })),
        sourceType: input.sourceType,
        tokenPolicy: input.tokenPolicy,
      }),
    });
    if (!res.ok) {
      return null;
    }
    const payload = await res.json();
    return {
      important: Boolean(payload.important),
      candidate: payload.candidate ?? null,
      tokenUsage: payload.tokenUsage ?? { promptTokens: 0, candidatesTokens: 0, totalTokens: 0 },
      model: String(payload.model ?? 'gemini-4-hydrogen'),
    };
  } catch {
    return null;
  }
}
