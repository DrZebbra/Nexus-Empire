import type { DepartmentId, EmployeeProfile, TaskItem, TaskPriority } from '../types/nexus';

export interface NexusServerStatus {
  geminiConfigured: boolean;
  model: string;
  supabaseConfigured: boolean;
}

export interface NexusCorePlanResult {
  mode: 'live' | 'demo';
  reply: string;
  targetDepartment: DepartmentId;
  leadEmployeeId: string;
  requiresApproval: boolean;
  subtasks: Array<{
    title: string;
    description: string;
    assigneeId: string;
    priority: TaskPriority;
  }>;
}

export async function fetchNexusServerStatus(): Promise<NexusServerStatus> {
  try {
    const res = await fetch('/api/nexus/status');
    if (!res.ok) {
      return { geminiConfigured: false, model: 'gemini-4-hydrogen', supabaseConfigured: false };
    }
    return (await res.json()) as NexusServerStatus;
  } catch {
    return { geminiConfigured: false, model: 'gemini-4-hydrogen', supabaseConfigured: false };
  }
}

export async function sendDirectiveToNexusCore(
  directive: string,
  employees: EmployeeProfile[],
  tasks: TaskItem[]
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
    body: JSON.stringify({ directive, employeesSummary, recentTasksSummary }),
  });

  if (res.status === 503) {
    // Explicit Demo Mode notice (never masquerading as live AI)
    const lower = directive.toLowerCase();
    const isMarketing =
      lower.includes('marketing') ||
      lower.includes('campanha') ||
      lower.includes('anúncio') ||
      lower.includes('anuncio') ||
      lower.includes('site') ||
      lower.includes('venda') ||
      lower.includes('tráfego') ||
      lower.includes('social');

    const targetDepartment: DepartmentId = isMarketing ? 'dept_marketing' : 'dept_products';
    const leadEmployeeId = isMarketing ? 'emp_07' : 'emp_01';
    const specialistId = isMarketing ? 'emp_08' : 'emp_02';

    return {
      mode: 'demo',
      reply:
        `[Modo de Demonstração Ativo — GEMINI_API_KEY não configurada no servidor]\n` +
        `Entendi sua diretriz: "${directive}". Encaminhei a demanda para o departamento de ${
          isMarketing ? 'Marketing e Comercial (2º Andar)' : 'Produtos e Desenvolvimento (1º Andar)'
        }, estruturando tarefas iniciais no Quadro Visual para coordenação do gerente do andar.`,
      targetDepartment,
      leadEmployeeId,
      requiresApproval: lower.includes('pagar') || lower.includes('publicar') || lower.includes('orçamento'),
      subtasks: [
        {
          title: `Diagnóstico inicial: ${directive.slice(0, 42)}`,
          description: `Levantamento estruturado solicitado pelo CEO: ${directive}`,
          assigneeId: specialistId,
          priority: 'alta',
        },
        {
          title: `Consolidação executiva e plano de ação`,
          description: `Revisão gerencial e preparação de entrega ao NEXUS CORE.`,
          assigneeId: leadEmployeeId,
          priority: 'media',
        },
      ],
    };
  }

  if (!res.ok) {
    const errPayload = await res.json().catch(() => ({}));
    throw new Error(errPayload.message ?? 'Falha ao comunicar com o NEXUS CORE.');
  }

  const payload = await res.json();
  const data = payload.data ?? {};
  const targetDepartment: DepartmentId =
    data.targetDepartment === 'dept_marketing' ? 'dept_marketing' : 'dept_products';

  return {
    mode: 'live',
    reply: String(data.reply ?? 'Diretriz processada pelo NEXUS CORE.'),
    targetDepartment,
    leadEmployeeId: String(data.leadEmployeeId ?? (targetDepartment === 'dept_marketing' ? 'emp_07' : 'emp_01')),
    requiresApproval: Boolean(data.requiresApproval),
    subtasks: Array.isArray(data.subtasks)
      ? data.subtasks.map((st: Record<string, unknown>) => ({
          title: String(st.title ?? 'Subtarefa'),
          description: String(st.description ?? ''),
          assigneeId: String(st.assigneeId ?? (targetDepartment === 'dept_marketing' ? 'emp_08' : 'emp_02')),
          priority:
            st.priority === 'critica' ||
            st.priority === 'alta' ||
            st.priority === 'media' ||
            st.priority === 'baixa'
              ? st.priority
              : 'media',
        }))
      : [],
  };
}

export async function sendMessageToEmployeeAgent(
  employee: EmployeeProfile,
  message: string,
  activeTasks: TaskItem[]
): Promise<{ mode: 'live' | 'demo'; reply: string }> {
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
    }),
  });

  if (res.status === 503) {
    return {
      mode: 'demo',
      reply:
        `[Modo de Demonstração Ativo] Olá CEO, sou ${employee.name} (${employee.role}). ` +
        `Recebi sua mensagem sobre "${message}". Como a chave Gemini ainda não está ativa no servidor, estou operando no modo local de demonstração com foco em ${employee.specialty}.`,
    };
  }

  if (!res.ok) {
    const errPayload = await res.json().catch(() => ({}));
    throw new Error(errPayload.message ?? 'Erro na comunicação com o agente.');
  }

  const data = await res.json();
  return {
    mode: 'live',
    reply: String(data.reply ?? ''),
  };
}
