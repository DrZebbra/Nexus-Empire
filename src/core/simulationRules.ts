import type {
  AutonomyLevel,
  ChannelConnection,
  ChannelId,
  CharacterAnimationState,
  DepartmentId,
  EmployeeProfile,
  FinancialRecord,
  GroundingSource,
  HistoricalLedgerEntry,
  LibraryFunction,
  NexusState,
  TaskItem,
  TaskPermissionStatus,
  TaskPriority,
  TaskStatus,
  TokenUsageEntry,
} from '../types/nexus';

let _uniqueSeq = 0;
export function nextUniqueId(prefix: string): string {
  _uniqueSeq += 1;
  return `${prefix}_${Date.now().toString(36)}_${_uniqueSeq.toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

export interface DerivedDashboardMetrics {
  activeEmployeesCount: number;
  workingCount: number;
  conversingCount: number;
  tasksPending: number;
  tasksInProgress: number;
  tasksAwaitingApproval: number;
  tasksCompleted: number;
  totalProducts: number;
  activeCampaigns: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  productsDeptProductivity: number;
  marketingDeptProductivity: number;
  pendingApprovalsCount: number;
  historicalRecordsCount: number;
  tokensUsedTotal: number;
  dailyTokenLimit: number;
  connectedChannelsCount: number;
  totalChannelsCount: number;
}

export function getDefaultChannelsForEmployee(employeeId: string): ChannelId[] {
  switch (employeeId) {
    case 'emp_06':
    case 'emp_11':
      return ['ch_ecommerce'];
    case 'emp_08':
      return ['ch_meta_ads', 'ch_google_ads'];
    case 'emp_09':
      return ['ch_meta_ads'];
    case 'emp_12':
      return ['ch_whatsapp'];
    default:
      return ['ch_google_search'];
  }
}

/**
 * Computes all dashboard indicators strictly from registered system records.
 */
export function computeDashboardMetrics(state: NexusState): DerivedDashboardMetrics {
  const activeEmployeesCount = state.employees.filter(
    (e) => e.animationState !== 'resting' && e.animationState !== 'idle'
  ).length;
  const workingCount = state.employees.filter(
    (e) => e.animationState === 'working'
  ).length;
  const conversingCount = state.employees.filter(
    (e) => e.animationState === 'conversing'
  ).length;

  const tasksPending = state.tasks.filter(
    (t) => t.status === 'aguardando' || t.status === 'planejada'
  ).length;
  const tasksInProgress = state.tasks.filter(
    (t) => t.status === 'em_execucao'
  ).length;
  const tasksAwaitingApproval = state.tasks.filter(
    (t) => t.status === 'aguardando_aprovacao'
  ).length;
  const tasksCompleted = state.tasks.filter(
    (t) => t.status === 'concluida'
  ).length;

  const totalProducts = state.products.length;
  const activeCampaigns = state.campaigns.filter(
    (c) => c.status === 'ativa'
  ).length;

  const totalRevenue = state.financials
    .filter((f) => f.type === 'receita' && f.approved)
    .reduce((sum, f) => sum + f.amount, 0);
  const totalExpenses = state.financials
    .filter((f) => f.type === 'despesa' && f.approved)
    .reduce((sum, f) => sum + f.amount, 0);

  const prodEmployees = state.employees.filter(
    (e) => e.departmentId === 'dept_products'
  );
  const mktEmployees = state.employees.filter(
    (e) => e.departmentId === 'dept_marketing'
  );

  const productsDeptProductivity = prodEmployees.length
    ? Math.round(
        prodEmployees.reduce((acc, e) => acc + e.productivity, 0) /
          prodEmployees.length
      )
    : 0;
  const marketingDeptProductivity = mktEmployees.length
    ? Math.round(
        mktEmployees.reduce((acc, e) => acc + e.productivity, 0) /
          mktEmployees.length
      )
    : 0;

  return {
    activeEmployeesCount,
    workingCount,
    conversingCount,
    tasksPending,
    tasksInProgress,
    tasksAwaitingApproval,
    tasksCompleted,
    totalProducts,
    activeCampaigns,
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    productsDeptProductivity,
    marketingDeptProductivity,
    pendingApprovalsCount: state.approvals.filter((a) => a.status === 'pending')
      .length,
    historicalRecordsCount: state.historicalLedger.length,
    tokensUsedTotal: state.tokenPolicy.usedTotal,
    dailyTokenLimit: state.tokenPolicy.dailyLimit,
    connectedChannelsCount: state.channels.filter((c) => c.status === 'connected').length,
    totalChannelsCount: state.channels.length,
  };
}

/**
 * Formats the overhead 3D speech/activity bubble text.
 */
export function formatEmployeeBubbleText(
  employee: EmployeeProfile,
  allEmployees: EmployeeProfile[]
): string {
  if (employee.activeWorkflowAction === 'board_write') {
    return `${employee.name} escrevendo no Quadro de Tarefas`;
  }
  if (employee.activeWorkflowAction === 'board_complete') {
    return `${employee.name} marcando tarefa concluída no Quadro`;
  }
  if (employee.activeWorkflowAction === 'core_computer_log') {
    return `${employee.name} registrando no PC Azul & Vermelho`;
  }
  if (employee.animationState === 'conversing' && employee.conversingWithId) {
    const partner = allEmployees.find((e) => e.id === employee.conversingWithId);
    if (partner) {
      return `${employee.name} conversando com ${partner.name}`;
    }
  }
  return employee.currentActivityLabel;
}

/**
 * Computes the exact Y-axis facing angle (yaw in radians) for a 3D character.
 */
export function computeCharacterFacingYaw(
  selfPos: { x: number; z: number },
  deskYaw: number,
  state: CharacterAnimationState,
  partnerPos?: { x: number; z: number } | null
): number {
  if (state === 'conversing' && partnerPos) {
    const dx = partnerPos.x - selfPos.x;
    const dz = partnerPos.z - selfPos.z;
    if (Math.hypot(dx, dz) > 0.001) {
      return Math.atan2(dx, dz);
    }
  }
  return deskYaw;
}

/**
 * Determines whether an employee can execute an action autonomously or must request approval.
 */
export function requiresCEOApproval(
  autonomyLevel: AutonomyLevel,
  options: {
    isFinancialOrIrreversible: boolean;
    isExternalPublication?: boolean;
    hasAuthorizedTool: boolean;
  }
): { allowed: boolean; needsApproval: boolean; reason: string } {
  if (!options.hasAuthorizedTool) {
    return {
      allowed: false,
      needsApproval: true,
      reason: 'Funcionário não possui autorização para a ferramenta necessária.',
    };
  }
  if (options.isFinancialOrIrreversible || options.isExternalPublication) {
    return {
      allowed: true,
      needsApproval: true,
      reason: 'Operações financeiras, publicações externas ou irreversíveis exigem aprovação do CEO.',
    };
  }
  if (autonomyLevel === 1) {
    return {
      allowed: true,
      needsApproval: true,
      reason: 'Nível 1 (Assistido): prepara a atividade e aguarda aprovação.',
    };
  }
  if (autonomyLevel === 2) {
    return {
      allowed: true,
      needsApproval: false,
      reason: 'Nível 2 (Semiautônomo): autorizado para tarefas operacionais comuns.',
    };
  }
  return {
    allowed: true,
    needsApproval: false,
    reason: 'Nível 3 (Autônomo): autorizado para organizar e executar dentro das permissões.',
  };
}

/**
 * Evaluates whether a task is strictly eligible for real AI & channel execution.
 */
export function canExecuteTask(
  state: NexusState,
  task: TaskItem
): {
  allowed: boolean;
  missingPermission: boolean;
  missingChannels: ChannelConnection[];
  tokenLimitReached: boolean;
  reason: string;
} {
  const missingPermission = task.permissionStatus !== 'approved';
  const missingChannels = task.requiredChannelIds
    .map((id) => state.channels.find((c) => c.id === id))
    .filter((c): c is ChannelConnection => Boolean(c && c.status !== 'connected'));

  const tokenLimitReached =
    state.tokenPolicy.usedTotal >= state.tokenPolicy.dailyLimit;

  if (missingPermission) {
    return {
      allowed: false,
      missingPermission: true,
      missingChannels,
      tokenLimitReached,
      reason:
        task.permissionStatus === 'pending_supervisor'
          ? 'Aguardando permissão do superior do andar.'
          : task.permissionStatus === 'pending_ceo'
          ? 'Aguardando autorização final do CEO.'
          : 'Permissão recusada.',
    };
  }

  if (missingChannels.length > 0) {
    return {
      allowed: false,
      missingPermission: false,
      missingChannels,
      tokenLimitReached,
      reason: `Conecte oficialmente os canais obrigatórios: ${missingChannels
        .map((c) => c.name)
        .join(', ')}.`,
    };
  }

  if (tokenLimitReached) {
    return {
      allowed: false,
      missingPermission: false,
      missingChannels: [],
      tokenLimitReached: true,
      reason: `Limite diário de tokens IA atingido (${state.tokenPolicy.usedTotal}/${state.tokenPolicy.dailyLimit}).`,
    };
  }

  return {
    allowed: true,
    missingPermission: false,
    missingChannels: [],
    tokenLimitReached: false,
    reason: 'Autorizado para execução real.',
  };
}

/**
 * Creates a real task:
 * - Specialists request permission from their Floor Manager (Superior) first.
 * - Floor Managers request directly from the CEO.
 * - Floor Manager updates the visual Task Board.
 */
export function createTaskInState(
  state: NexusState,
  input: {
    title: string;
    description: string;
    assigneeId: string;
    departmentId: DepartmentId;
    priority: TaskPriority;
    dueDate: string;
    isFinancialOrIrreversible?: boolean;
    requiredChannelIds?: ChannelId[];
    steps?: string[];
  },
  nowIso: string
): NexusState {
  const title = input.title.trim();
  const description = input.description.trim();
  if (!title) {
    throw new Error('O título da tarefa é obrigatório.');
  }

  const assignee = state.employees.find((e) => e.id === input.assigneeId);
  if (!assignee) {
    throw new Error('Funcionário responsável não encontrado.');
  }

  const deptManager = state.employees.find(
    (e) => e.departmentId === input.departmentId && e.isFloorManager
  );
  const supervisorId =
    !assignee.isFloorManager && deptManager ? deptManager.id : 'ceo';
  const initialStage: 'supervisor' | 'ceo' =
    !assignee.isFloorManager && deptManager ? 'supervisor' : 'ceo';
  const initialPermissionStatus: TaskPermissionStatus =
    initialStage === 'supervisor' ? 'pending_supervisor' : 'pending_ceo';

  const requiredChannelIds: ChannelId[] =
    input.requiredChannelIds && input.requiredChannelIds.length > 0
      ? input.requiredChannelIds
      : getDefaultChannelsForEmployee(assignee.id);

  const taskId = nextUniqueId('task');

  const newTask: TaskItem = {
    id: taskId,
    title,
    description: description || `Execução real de: ${title}`,
    assigneeId: assignee.id,
    departmentId: input.departmentId,
    priority: input.priority,
    status: 'aguardando_aprovacao',
    createdAt: nowIso,
    dueDate: input.dueDate || nowIso.slice(0, 10),
    steps: (
      input.steps ?? [
        'Solicitar permissão ao superior',
        'Validar canais oficiais conectados',
        'Executar tarefa real e registrar entrega',
      ]
    ).map((s, idx) => ({
      id: `${taskId}_step_${idx + 1}`,
      title: s,
      completed: false,
      assigneeId: assignee.id,
    })),
    dependencies: [],
    result: null,
    requiresApproval: true,
    isFinancialOrIrreversible: Boolean(input.isFinancialOrIrreversible),
    requiredChannelIds,
    permissionStatus: initialPermissionStatus,
    supervisorId,
    history: [
      {
        timestamp: nowIso,
        actor: state.settings.ceoName,
        note: `Tarefa determinada para ${assignee.name}. Permissão solicitada a ${
          initialStage === 'supervisor' && deptManager
            ? deptManager.name
            : 'CEO'
        }.`,
      },
    ],
  };

  const updatedEmployees = state.employees.map((emp) => {
    if (emp.id === assignee.id) {
      return {
        ...emp,
        animationState: 'thinking' as CharacterAnimationState,
        conversingWithId: null,
        currentActivityLabel:
          initialStage === 'supervisor' && deptManager
            ? `Pedindo permissão a ${deptManager.name}`
            : 'Aguardando autorização do CEO',
      };
    }
    if (deptManager && emp.id === deptManager.id) {
      return {
        ...emp,
        animationState: 'walking' as CharacterAnimationState,
        conversingWithId: null,
        activeWorkflowAction: 'board_write' as const,
        currentActivityLabel: `Anotando no Quadro: ${title.slice(0, 26)}`,
      };
    }
    return emp;
  });

  const channelNames = requiredChannelIds
    .map((id) => state.channels.find((c) => c.id === id)?.name ?? id)
    .join(', ');

  const approvalItem = {
    id: nextUniqueId('apr'),
    title: `Permissão: ${title}`,
    description: `${assignee.name} solicita permissão para executar via canais [${channelNames}].`,
    requestedByEmployeeId: assignee.id,
    departmentId: input.departmentId,
    category: 'channel_permission' as const,
    relatedTaskId: taskId,
    stage: initialStage,
    supervisorId,
    supervisorApproved: initialStage === 'ceo',
    status: 'pending' as const,
    createdAt: nowIso,
  };

  return {
    ...state,
    tasks: [newTask, ...state.tasks],
    approvals: [approvalItem, ...state.approvals],
    employees: updatedEmployees,
    activityLogs: [
      {
        id: nextUniqueId('log'),
        timestamp: nowIso,
        actorName: assignee.name,
        departmentId: input.departmentId,
        action: 'Permissão solicitada ao superior',
        detail: `${assignee.name} pediu permissão para "${title}" (Canais: ${channelNames}). ${
          deptManager?.name ?? 'Diretoria'
        } anotou no Quadro Visual.`,
        source: 'system',
      },
      ...state.activityLogs,
    ],
  };
}

/**
 * Resolves permission in 2 stages: Supervisor -> CEO.
 */
export function approveTaskAtStage(
  state: NexusState,
  approvalId: string,
  stageActor: 'supervisor' | 'ceo',
  decision: 'approved' | 'rejected',
  comment: string | undefined,
  nowIso: string
): NexusState {
  const targetApr = state.approvals.find((a) => a.id === approvalId);
  if (!targetApr || targetApr.status !== 'pending') return state;

  const supervisorEmp = state.employees.find((e) => e.id === targetApr.supervisorId);
  const requester = state.employees.find(
    (e) => e.id === targetApr.requestedByEmployeeId
  );

  if (decision === 'rejected') {
    return {
      ...state,
      approvals: state.approvals.map((a) =>
        a.id === approvalId
          ? {
              ...a,
              status: 'rejected',
              supervisorComment: comment ?? a.supervisorComment,
            }
          : a
      ),
      tasks: state.tasks.map((t) =>
        t.id === targetApr.relatedTaskId
          ? {
              ...t,
              status: 'cancelada',
              permissionStatus: 'rejected',
              requiresApproval: false,
              history: [
                ...t.history,
                {
                  timestamp: nowIso,
                  actor:
                    stageActor === 'supervisor'
                      ? supervisorEmp?.name ?? 'Superior'
                      : state.settings.ceoName,
                  note: comment ?? 'Permissão recusada.',
                },
              ],
            }
          : t
      ),
      employees: state.employees.map((e) =>
        e.id === targetApr.requestedByEmployeeId
          ? {
              ...e,
              animationState: 'idle',
              currentActivityLabel: 'Aguardando nova diretriz',
            }
          : e
      ),
    };
  }

  if (stageActor === 'supervisor' && targetApr.stage === 'supervisor') {
    return {
      ...state,
      approvals: state.approvals.map((a) =>
        a.id === approvalId
          ? {
              ...a,
              stage: 'ceo',
              supervisorApproved: true,
              supervisorComment:
                comment ??
                `Aprovado pelo superior ${supervisorEmp?.name ?? ''}. Encaminhado ao CEO.`,
            }
          : a
      ),
      tasks: state.tasks.map((t) =>
        t.id === targetApr.relatedTaskId
          ? {
              ...t,
              permissionStatus: 'pending_ceo',
              supervisorNote: comment,
              steps: t.steps.map((s, idx) =>
                idx === 0 ? { ...s, completed: true } : s
              ),
              history: [
                ...t.history,
                {
                  timestamp: nowIso,
                  actor: supervisorEmp?.name ?? 'Superior',
                  note:
                    comment ??
                    'Superior aprovou a execução e encaminhou para autorização final do CEO.',
                },
              ],
            }
          : t
      ),
      employees: state.employees.map((e) =>
        e.id === targetApr.requestedByEmployeeId
          ? {
              ...e,
              animationState: 'thinking',
              currentActivityLabel: 'Superior aprovou · Aguardando CEO',
            }
          : e
      ),
      activityLogs: [
        {
          id: nextUniqueId('log_sup'),
          timestamp: nowIso,
          actorName: supervisorEmp?.name ?? 'Superior',
          departmentId: targetApr.departmentId,
          action: 'Parecer favorável do Superior',
          detail: `${supervisorEmp?.name ?? 'Diretor'} aprovou a solicitação de ${
            requester?.name ?? 'Especialista'
          } e submeteu ao CEO.`,
          source: 'system',
        },
        ...state.activityLogs,
      ],
    };
  }

  // CEO final authorization
  return {
    ...state,
    approvals: state.approvals.map((a) =>
      a.id === approvalId
        ? { ...a, status: 'approved', supervisorApproved: true }
        : a
    ),
    tasks: state.tasks.map((t) =>
      t.id === targetApr.relatedTaskId
        ? {
            ...t,
            status: 'planejada',
            permissionStatus: 'approved',
            requiresApproval: false,
            history: [
              ...t.history,
              {
                timestamp: nowIso,
                actor: state.settings.ceoName,
                note: 'Permissão final concedida pelo CEO.',
              },
            ],
          }
        : t
    ),
    employees: state.employees.map((e) =>
      e.id === targetApr.requestedByEmployeeId
        ? {
            ...e,
            animationState: 'working',
            currentActivityLabel: 'Autorizado · Pronto para canal oficial',
          }
        : e
    ),
    activityLogs: [
      {
        id: nextUniqueId('log_ceo'),
        timestamp: nowIso,
        actorName: state.settings.ceoName,
        departmentId: targetApr.departmentId,
        action: 'Autorização final do CEO',
        detail: `Permissão concedida para "${targetApr.title}".`,
        source: 'system',
      },
      ...state.activityLogs,
    ],
  };
}

/**
 * Updates token budget counters from real Gemini usageMetadata.
 */
export function recordTokenUsage(
  state: NexusState,
  entry: Omit<TokenUsageEntry, 'id'>
): NexusState {
  const newEntry: TokenUsageEntry = {
    ...entry,
    id: nextUniqueId('tok'),
  };
  return {
    ...state,
    tokenPolicy: {
      ...state.tokenPolicy,
      usedTotal: state.tokenPolicy.usedTotal + entry.totalTokens,
      promptTokensTotal: state.tokenPolicy.promptTokensTotal + entry.promptTokens,
      completionTokensTotal:
        state.tokenPolicy.completionTokensTotal + entry.candidatesTokens,
    },
    tokenLogs: [newEntry, ...state.tokenLogs].slice(0, 100),
  };
}

/**
 * Records a real AI + Channel task execution result, consumes real tokens,
 * completes the task, and triggers Floor Manager archival on the Red & Blue Core Computer.
 */
export function recordRealTaskExecution(
  state: NexusState,
  taskId: string,
  execution: {
    resultText: string;
    groundingSources: GroundingSource[];
    promptTokens: number;
    candidatesTokens: number;
    totalTokens: number;
    model: string;
  },
  nowIso: string
): NexusState {
  const targetTask = state.tasks.find((t) => t.id === taskId);
  if (!targetTask) return state;

  const gate = canExecuteTask(state, targetTask);
  if (!gate.allowed) {
    throw new Error(gate.reason);
  }

  const assignee = state.employees.find((e) => e.id === targetTask.assigneeId);
  const floorManager = state.employees.find(
    (e) => e.departmentId === targetTask.departmentId && e.isFloorManager
  );

  let next = recordTokenUsage(state, {
    timestamp: nowIso,
    actorName: assignee?.name ?? 'Especialista',
    taskId,
    action: 'task_execution',
    promptTokens: execution.promptTokens,
    candidatesTokens: execution.candidatesTokens,
    totalTokens: execution.totalTokens,
    model: execution.model,
  });

  next = {
    ...next,
    tasks: next.tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            status: 'concluida',
            result: execution.resultText,
            groundingSources: execution.groundingSources,
            tokensUsed: execution.totalTokens,
            executedAt: nowIso,
            steps: t.steps.map((s) => ({ ...s, completed: true })),
            history: [
              ...t.history,
              {
                timestamp: nowIso,
                actor: assignee?.name ?? 'Especialista',
                note: `Execução real concluída via IA (${execution.totalTokens} tokens, ${execution.groundingSources.length} fontes web).`,
              },
            ],
          }
        : t
    ),
  };

  if (floorManager) {
    const ledgerEntry: HistoricalLedgerEntry = {
      id: nextUniqueId('hist'),
      taskId: targetTask.id,
      taskTitle: targetTask.title,
      departmentId: targetTask.departmentId,
      floor: floorManager.floor,
      loggedByManagerId: floorManager.id,
      loggedByManagerName: floorManager.name,
      executedByEmployeeName: assignee?.name ?? 'Equipe Nexus',
      outcomeSummary: execution.resultText.slice(0, 220),
      tokensUsed: execution.totalTokens,
      sourcesCount: execution.groundingSources.length,
      recordedAt: nowIso,
    };

    next = {
      ...next,
      historicalLedger: [ledgerEntry, ...next.historicalLedger],
      employees: next.employees.map((emp) => {
        if (emp.id === floorManager.id) {
          return {
            ...emp,
            animationState: 'walking',
            conversingWithId: null,
            activeWorkflowAction: 'core_computer_log',
            currentActivityLabel: `Arquivando no PC Azul & Vermelho: ${targetTask.title.slice(0, 24)}`,
          };
        }
        if (assignee && emp.id === assignee.id) {
          const completedCount =
            next.tasks.filter(
              (t) => t.assigneeId === emp.id && t.status === 'concluida'
            ).length;
          return {
            ...emp,
            animationState: 'celebrating',
            conversingWithId: null,
            productivity: Math.min(100, Math.max(emp.productivity, completedCount * 25)),
            currentActivityLabel: `Concluiu: ${targetTask.title.slice(0, 30)}`,
          };
        }
        return emp;
      }),
      activityLogs: [
        {
          id: nextUniqueId('log_exec'),
          timestamp: nowIso,
          actorName: assignee?.name ?? 'Especialista',
          departmentId: targetTask.departmentId,
          action: 'Execução Real IA + Canais',
          detail: `${assignee?.name} concluiu "${targetTask.title}" (${execution.totalTokens} tokens). ${floorManager.name} arquivou no PC Azul & Vermelho.`,
          source: 'ai_execution',
        },
        ...next.activityLogs,
      ],
    };
  }

  return next;
}

/**
 * Transitions a task's status manually (e.g. cancel or conclude).
 */
export function transitionTaskStatus(
  state: NexusState,
  taskId: string,
  nextStatus: TaskStatus,
  resultSummary: string | undefined,
  actorName: string,
  nowIso: string
): NexusState {
  const targetTask = state.tasks.find((t) => t.id === taskId);
  if (!targetTask) return state;

  if (nextStatus === 'em_execucao') {
    const gate = canExecuteTask(state, targetTask);
    if (!gate.allowed) {
      throw new Error(gate.reason);
    }
  }

  const assignee = state.employees.find((e) => e.id === targetTask.assigneeId);
  const floorManager = state.employees.find(
    (e) => e.departmentId === targetTask.departmentId && e.isFloorManager
  );

  const updatedTasks = state.tasks.map((t) => {
    if (t.id !== taskId) return t;
    const isCompleted = nextStatus === 'concluida';
    return {
      ...t,
      status: nextStatus,
      result: resultSummary ?? t.result ?? (isCompleted ? 'Entrega concluída.' : null),
      steps: isCompleted
        ? t.steps.map((s) => ({ ...s, completed: true }))
        : t.steps,
      history: [
        ...t.history,
        {
          timestamp: nowIso,
          actor: actorName,
          note: `Estado alterado para "${nextStatus}".`,
        },
      ],
    };
  });

  let updatedLedger = state.historicalLedger;
  let updatedEmployees = state.employees;
  let updatedLogs = state.activityLogs;
  let updatedApprovals = state.approvals;

  if (nextStatus === 'concluida') {
    updatedApprovals = state.approvals.map((a) =>
      a.relatedTaskId === taskId ? { ...a, status: 'approved' as const } : a
    );

    if (floorManager) {
      const ledgerEntry: HistoricalLedgerEntry = {
        id: nextUniqueId('hist'),
        taskId: targetTask.id,
        taskTitle: targetTask.title,
        departmentId: targetTask.departmentId,
        floor: floorManager.floor,
        loggedByManagerId: floorManager.id,
        loggedByManagerName: floorManager.name,
        executedByEmployeeName: assignee?.name ?? 'Equipe Nexus',
        outcomeSummary:
          resultSummary ??
          targetTask.result ??
          'Concluída no Quadro de Tarefas e arquivada no Computador Azul & Vermelho.',
        recordedAt: nowIso,
      };
      updatedLedger = [ledgerEntry, ...state.historicalLedger];

      updatedEmployees = state.employees.map((emp) => {
        if (emp.id === floorManager.id) {
          return {
            ...emp,
            animationState: 'walking' as CharacterAnimationState,
            conversingWithId: null,
            activeWorkflowAction: 'core_computer_log' as const,
            currentActivityLabel: `Arquivando no PC Azul & Vermelho: ${targetTask.title.slice(0, 24)}`,
          };
        }
        if (assignee && emp.id === assignee.id) {
          const completedCount = updatedTasks.filter(
            (t) => t.assigneeId === emp.id && t.status === 'concluida'
          ).length;
          return {
            ...emp,
            animationState: 'celebrating' as CharacterAnimationState,
            conversingWithId: null,
            productivity: Math.min(100, Math.max(emp.productivity, completedCount * 25)),
            currentActivityLabel: `Concluiu: ${targetTask.title.slice(0, 30)}`,
          };
        }
        return emp;
      });

      updatedLogs = [
        {
          id: nextUniqueId('log_core'),
          timestamp: nowIso,
          actorName: floorManager.name,
          departmentId: targetTask.departmentId,
          action: 'Livro Histórico (PC Azul & Vermelho)',
          detail: `${floorManager.name} marcou "${targetTask.title}" como completada no Quadro e gravou no Computador Central Azul & Vermelho.`,
          source: 'system',
        },
        ...state.activityLogs,
      ];
    }
  } else if (nextStatus === 'em_execucao' && assignee) {
    updatedEmployees = state.employees.map((emp) =>
      emp.id === assignee.id
        ? {
            ...emp,
            animationState: 'working' as CharacterAnimationState,
            conversingWithId: null,
            activeWorkflowAction: 'none' as const,
            currentActivityLabel: `Executando: ${targetTask.title.slice(0, 32)}`,
          }
        : emp
    );
  }

  return {
    ...state,
    tasks: updatedTasks,
    historicalLedger: updatedLedger,
    employees: updatedEmployees,
    activityLogs: updatedLogs,
    approvals: updatedApprovals,
  };
}

/**
 * Sets a clean two-way conversation pair between two employees,
 * or ends their conversation and returns them to idle/working.
 */
export function setEmployeeConversationPair(
  employees: EmployeeProfile[],
  employeeAId: string,
  employeeBId: string | null
): EmployeeProfile[] {
  return employees.map((emp) => {
    const wasTalkingToTarget =
      emp.conversingWithId === employeeAId ||
      (employeeBId !== null && emp.conversingWithId === employeeBId);

    if (employeeBId && emp.id === employeeAId) {
      const partner = employees.find((e) => e.id === employeeBId);
      return {
        ...emp,
        animationState: 'conversing',
        conversingWithId: employeeBId,
        activeWorkflowAction: 'none',
        currentActivityLabel: partner
          ? `${emp.name} conversando com ${partner.name}`
          : 'Conversando',
      };
    }

    if (employeeBId && emp.id === employeeBId) {
      const partner = employees.find((e) => e.id === employeeAId);
      return {
        ...emp,
        animationState: 'conversing',
        conversingWithId: employeeAId,
        activeWorkflowAction: 'none',
        currentActivityLabel: partner
          ? `${emp.name} conversando com ${partner.name}`
          : 'Conversando',
      };
    }

    if (emp.id === employeeAId || wasTalkingToTarget) {
      return {
        ...emp,
        animationState: 'working',
        conversingWithId: null,
        activeWorkflowAction: 'none',
        currentActivityLabel: `Operando estação: ${emp.specialty}`,
      };
    }

    return emp;
  });
}

/**
 * Validates and registers a safe declarative function in the Function Library.
 */
export function validateAndRegisterFunction(
  functions: LibraryFunction[],
  payload: {
    name: string;
    description: string;
    category: string;
    departmentId: DepartmentId;
    responsibleEmployeeId: string;
    requiredSkillIds: string[];
    requiredToolIds: string[];
    minAutonomyLevel: AutonomyLevel;
  }
): LibraryFunction[] {
  const cleanName = payload.name.trim();
  const cleanDesc = payload.description.trim();
  if (!cleanName || cleanName.length < 3) {
    throw new Error('Nome da função deve ter pelo menos 3 caracteres.');
  }
  const forbiddenPattern = /(<script|eval\s*\(|new\s+Function|=>|function\s*\()/i;
  if (forbiddenPattern.test(cleanName) || forbiddenPattern.test(cleanDesc)) {
    throw new Error('Execução arbitrária de código não é permitida na Biblioteca de Funções.');
  }

  const newFn: LibraryFunction = {
    id: nextUniqueId('fn'),
    name: cleanName,
    description: cleanDesc || `Operação modular de ${payload.category}`,
    category: payload.category || 'Operações',
    departmentId: payload.departmentId,
    responsibleEmployeeId: payload.responsibleEmployeeId,
    requiredSkillIds: payload.requiredSkillIds,
    requiredToolIds: payload.requiredToolIds,
    parameters: [
      {
        name: 'objetivo',
        type: 'string',
        required: true,
        description: 'Escopo operacional da execução',
      },
    ],
    permissions: [`dept:${payload.departmentId}`, `autonomy:${payload.minAutonomyLevel}`],
    minAutonomyLevel: payload.minAutonomyLevel,
    active: true,
    executionCount: 0,
    lastExecutedAt: null,
  };

  return [newFn, ...functions];
}

export function calculateFinancialSummary(records: FinancialRecord[]) {
  const revenue = records
    .filter((r) => r.type === 'receita' && r.approved)
    .reduce((acc, r) => acc + r.amount, 0);
  const expenses = records
    .filter((r) => r.type === 'despesa' && r.approved)
    .reduce((acc, r) => acc + r.amount, 0);
  return {
    revenue,
    expenses,
    profit: revenue - expenses,
  };
}

export function setChannelConnectionStatus(
  state: NexusState,
  channelId: ChannelId,
  status: 'connected' | 'disconnected',
  accountLabel: string | undefined,
  nowIso: string
): NexusState {
  const updatedChannels = state.channels.map((ch) =>
    ch.id === channelId
      ? {
          ...ch,
          status,
          connectedAt: status === 'connected' ? nowIso : null,
          accountLabel: status === 'connected' ? accountLabel : undefined,
        }
      : ch
  );
  return {
    ...state,
    channels: updatedChannels,
    activityLogs: [
      {
        id: nextUniqueId('log_ch'),
        timestamp: nowIso,
        actorName: state.settings.ceoName,
        departmentId: 'nexus_core',
        action:
          status === 'connected'
            ? 'Conexão oficial ativada'
            : 'Canal desconectado',
        detail: `${
          state.channels.find((c) => c.id === channelId)?.name ?? channelId
        }: ${status === 'connected' ? 'Conectado com segurança' : 'Desconectado'}.`,
        source: 'system',
      },
      ...state.activityLogs,
    ],
  };
}
