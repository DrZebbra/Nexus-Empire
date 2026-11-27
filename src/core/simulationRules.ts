import type {
  AutonomyLevel,
  CharacterAnimationState,
  DepartmentId,
  EmployeeProfile,
  FinancialRecord,
  HistoricalLedgerEntry,
  LibraryFunction,
  NexusState,
  TaskItem,
  TaskPriority,
  TaskStatus,
} from '../types/nexus';

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
}

/**
 * Computes all dashboard indicators strictly from registered system records.
 */
export function computeDashboardMetrics(state: NexusState): DerivedDashboardMetrics {
  const activeEmployeesCount = state.employees.filter(
    (e) => e.animationState !== 'resting'
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
  };
}

/**
 * Formats the overhead 3D speech/activity bubble text.
 * Enforces explicit "<Nome A> conversando com <Nome B>" format when conversing,
 * and shows the current active task/action when working or performing manager duties.
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
 * - Working characters face their computer desk (`workstation.deskYaw`).
 * - Conversing characters turn toward their partner's world XZ coordinates.
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
 * Determines whether an employee can execute an action autonomously or must request CEO approval.
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
 * Creates a structured task and updates the Floor Manager's workflow flag to write it on the Task Board.
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

  const approvalCheck = requiresCEOApproval(assignee.autonomyLevel, {
    isFinancialOrIrreversible: Boolean(input.isFinancialOrIrreversible),
    hasAuthorizedTool: true,
  });

  const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const initialStatus: TaskStatus = approvalCheck.needsApproval
    ? 'aguardando_aprovacao'
    : 'planejada';

  const newTask: TaskItem = {
    id: taskId,
    title,
    description: description || `Execução de ${title}`,
    assigneeId: assignee.id,
    departmentId: input.departmentId,
    priority: input.priority,
    status: initialStatus,
    createdAt: nowIso,
    dueDate: input.dueDate || nowIso.slice(0, 10),
    steps: (input.steps ?? ['Analisar requisitos', 'Executar entrega', 'Validar resultado']).map(
      (s, idx) => ({
        id: `${taskId}_step_${idx + 1}`,
        title: s,
        completed: false,
        assigneeId: assignee.id,
      })
    ),
    dependencies: [],
    result: null,
    requiresApproval: approvalCheck.needsApproval,
    isFinancialOrIrreversible: Boolean(input.isFinancialOrIrreversible),
    history: [
      {
        timestamp: nowIso,
        actor: state.settings.ceoName,
        note: `Tarefa criada e atribuída a ${assignee.name}.`,
      },
    ],
  };

  const deptManager = state.employees.find(
    (e) => e.departmentId === input.departmentId && e.isFloorManager
  );

  const updatedEmployees = state.employees.map((emp) => {
    if (emp.id === assignee.id) {
      return {
        ...emp,
        animationState: 'working' as CharacterAnimationState,
        conversingWithId: null,
        currentActivityLabel: `Trabalhando: ${title.slice(0, 34)}`,
      };
    }
    if (deptManager && emp.id === deptManager.id) {
      return {
        ...emp,
        animationState: 'walking' as CharacterAnimationState,
        conversingWithId: null,
        activeWorkflowAction: 'board_write' as const,
        currentActivityLabel: `Registrando no Quadro: ${title.slice(0, 26)}`,
      };
    }
    return emp;
  });

  const nextApprovals = approvalCheck.needsApproval
    ? [
        {
          id: `apr_${Date.now()}`,
          title: `Aprovar tarefa: ${title}`,
          description: approvalCheck.reason,
          requestedByEmployeeId: assignee.id,
          departmentId: input.departmentId,
          category: input.isFinancialOrIrreversible
            ? ('finance' as const)
            : ('task_result' as const),
          relatedTaskId: taskId,
          status: 'pending' as const,
          createdAt: nowIso,
        },
        ...state.approvals,
      ]
    : state.approvals;

  return {
    ...state,
    tasks: [newTask, ...state.tasks],
    approvals: nextApprovals,
    employees: updatedEmployees,
    activityLogs: [
      {
        id: `log_${Date.now()}`,
        timestamp: nowIso,
        actorName: deptManager ? deptManager.name : assignee.name,
        departmentId: input.departmentId,
        action: 'Quadro de Tarefas atualizado',
        detail: `${deptManager?.name ?? assignee.name} anotou "${title}" no Quadro Visual do ${
          input.departmentId === 'dept_products' ? '1º Andar' : '2º Andar'
        }.`,
        isDemoData: true,
      },
      ...state.activityLogs,
    ],
  };
}

/**
 * Transitions a task's status. When marked 'concluida':
 * 1. Floor Manager marks it completed on the visual Task Board.
 * 2. Floor Manager records the permanent completion entry on the Blue & Red Core Computer.
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
      result: resultSummary ?? t.result ?? (isCompleted ? 'Entrega concluída e validada.' : null),
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
        id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
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
          return {
            ...emp,
            animationState: 'celebrating' as CharacterAnimationState,
            conversingWithId: null,
            productivity: Math.min(100, emp.productivity + 1),
            currentActivityLabel: `Concluiu: ${targetTask.title.slice(0, 30)}`,
          };
        }
        return emp;
      });

      updatedLogs = [
        {
          id: `log_core_${Date.now()}`,
          timestamp: nowIso,
          actorName: floorManager.name,
          departmentId: targetTask.departmentId,
          action: 'Livro Histórico (PC Azul & Vermelho)',
          detail: `${floorManager.name} marcou "${targetTask.title}" como completada no Quadro e gravou no Computador Central Azul & Vermelho.`,
          isDemoData: true,
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
 * or ends their conversation and returns them to working at their computers.
 */
export function setEmployeeConversationPair(
  employees: EmployeeProfile[],
  employeeAId: string,
  employeeBId: string | null
): EmployeeProfile[] {
  return employees.map((emp) => {
    // Clear any stale partner pointing to employeeAId or employeeBId
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
 * Explicitly blocks arbitrary executable code strings.
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
    id: `fn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
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
