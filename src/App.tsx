import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Cpu,
  Eye,
  EyeOff,
  Menu,
  MessageCircle,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  appendBrainThought,
  evaluateLocalThoughtImportance,
  incrementBrainFilteredOut,
  setBrainMaxConnections,
  type BrainThoughtCandidate,
} from './core/brainRules';
import {
  approveTaskAtStage,
  canExecuteTask,
  computeDashboardMetrics,
  createTaskInState,
  nextUniqueId,
  recordRealTaskExecution,
  recordTokenUsage,
  setChannelConnectionStatus,
  setEmployeeConversationPair,
  transitionTaskStatus,
  validateAndRegisterFunction,
} from './core/simulationRules';
import { INITIAL_NEXUS_STATE } from './data/seedData';
import {
  distillBrainThoughtWithAI,
  executeTaskWithRealAI,
  fetchNexusServerStatus,
  requestSupervisorAIReview,
  verifyOfficialChannel,
  type TokenUsageReport,
} from './services/aiService';
import {
  isSupabaseConfigured,
  loadCloudNexusState,
  loadPersistedNexusState,
  resetLocalNexusState,
  saveCloudNexusState,
  saveLocalNexusState,
} from './services/supabaseService';
import type {
  ApprovalItem,
  AutonomyLevel,
  ChannelId,
  CharacterAnimationState,
  CompanySettings,
  DepartmentId,
  FloorNumber,
  NavSectionId,
  NexusState,
  ProductItem,
  TaskItem,
  TaskPriority,
  TaskStatus,
  TokenUsagePolicy,
} from './types/nexus';
import { CoreComputerModal } from './components/CoreComputerModal';
import { EmployeeModal } from './components/EmployeeModal';
import { EntryScreen } from './components/EntryScreen';
import { NexusCoreDrawer } from './components/NexusCoreDrawer';
import { Office3DViewport, type FloorViewFilter } from './components/Office3DViewport';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/views/DashboardView';
import { DepartmentsView } from './components/views/DepartmentsView';
import { EmployeesView } from './components/views/EmployeesView';
import { FunctionLibraryView } from './components/views/FunctionLibraryView';
import {
  AutomationsView,
  FinanceView,
  MarketingView,
  ProductsView,
  ReportsView,
  SettingsView,
  SitesView,
  StoresView,
} from './components/views/OperationsViews';
import { TasksView } from './components/views/TasksView';
import { BrainView } from './components/views/BrainView';

export default function App() {
  const [entered, setEntered] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('autostart') === '1';
  });

  const [state, setState] = useState<NexusState>(() =>
    loadPersistedNexusState(INITIAL_NEXUS_STATE)
  );
  const [geminiConfigured, setGeminiConfigured] = useState(false);
  const [supabaseConnected, setSupabaseConnected] = useState(() =>
    isSupabaseConfigured()
  );
  const [supabaseSyncMessage, setSupabaseSyncMessage] = useState<string | null>(
    null
  );
  const [channelVerifyError, setChannelVerifyError] = useState<string | null>(null);
  const [verifyingChannelId, setVerifyingChannelId] = useState<ChannelId | null>(
    null
  );
  const [executingTaskId, setExecutingTaskId] = useState<string | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  const [activeSection, setActiveSection] = useState<NavSectionId>('hq');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeFloor, setActiveFloor] = useState<FloorViewFilter>('all');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [nexusCoreOpen, setNexusCoreOpen] = useState(false);
  const [coreComputerOpen, setCoreComputerOpen] = useState(false);
  const [taskBoardInitialFloor, setTaskBoardInitialFloor] = useState<FloorNumber>(1);
  const [showBubbles, setShowBubbles] = useState(true);
  const [hudCollapsed, setHudCollapsed] = useState(false);
  const [cameraZoomSignal, setCameraZoomSignal] = useState<{
    type: 'in' | 'out' | 'reset';
    seq: number;
  } | null>(null);

  const cloudHydratedRef = useRef(false);

  // Sync body state attribute for accessibility & verification
  useEffect(() => {
    document.body.dataset.state = entered ? 'playing' : 'title';
  }, [entered]);

  // Probe server AI, official channels & Supabase cloud state
  useEffect(() => {
    let active = true;
    (async () => {
      const status = await fetchNexusServerStatus();
      if (!active) return;

      setGeminiConfigured(status.geminiConfigured);
      const canQueryCloud = status.supabaseConfigured || isSupabaseConfigured();
      if (!canQueryCloud) {
        setSupabaseConnected(false);
        cloudHydratedRef.current = true;
        return;
      }

      const cloud = await loadCloudNexusState(
        INITIAL_NEXUS_STATE.companyId,
        INITIAL_NEXUS_STATE
      );
      if (!active) return;

      const sbConnected = cloud.connected || status.supabaseConfigured || isSupabaseConfigured();
      setSupabaseConnected(sbConnected);

      if (cloud.state) {
        setState(() => {
          const loaded = cloud.state!;
          if (sbConnected) {
            const chSb = loaded.channels.find((c) => c.id === 'ch_supabase');
            if (chSb && chSb.status !== 'connected') {
              return setChannelConnectionStatus(
                loaded,
                'ch_supabase',
                'connected',
                'Supabase Cloud Conectado',
                new Date().toISOString()
              );
            }
          }
          return loaded;
        });
        setSupabaseSyncMessage('Estado real sincronizado a partir do Supabase.');
      } else if (sbConnected) {
        setState((prev) => {
          const chSb = prev.channels.find((c) => c.id === 'ch_supabase');
          if (chSb && chSb.status !== 'connected') {
            return setChannelConnectionStatus(
              prev,
              'ch_supabase',
              'connected',
              'Supabase Cloud Conectado',
              new Date().toISOString()
            );
          }
          return prev;
        });
        if (cloud.error) {
          setSupabaseSyncMessage(`Aviso Supabase: ${cloud.error}`);
        }
      }

      cloudHydratedRef.current = true;
    })();

    return () => {
      active = false;
    };
  }, []);

  // Persist changes locally and sync with Supabase when connected
  useEffect(() => {
    saveLocalNexusState(state);
    if (!cloudHydratedRef.current || !supabaseConnected) return;

    const timer = window.setTimeout(() => {
      saveCloudNexusState(state).then((res) => {
        if (res.ok) {
          setSupabaseSyncMessage(
            `Sincronizado com Supabase às ${new Date().toLocaleTimeString('pt-BR')}.`
          );
        } else if (res.error) {
          setSupabaseSyncMessage(`Falha ao sincronizar Supabase: ${res.error}`);
        }
      });
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [state, supabaseConnected]);

  const handleStart = useCallback(() => {
    document.body.dataset.state = 'playing';
    setEntered(true);
  }, []);

  const metrics = useMemo(() => computeDashboardMetrics(state), [state]);

  const selectedEmployee = useMemo(
    () => state.employees.find((e) => e.id === selectedEmployeeId) ?? null,
    [state.employees, selectedEmployeeId]
  );

  // Schedule Floor Manager return to desk after Task Board / Red-Blue Computer action
  const scheduleManagerReturn = useCallback((departmentId: DepartmentId) => {
    window.setTimeout(() => {
      setState((prev) => ({
        ...prev,
        employees: prev.employees.map((emp) => {
          const hasInProgress = prev.tasks.some(
            (t) => t.assigneeId === emp.id && t.status === 'em_execucao'
          );
          if (emp.departmentId === departmentId && emp.isFloorManager) {
            return {
              ...emp,
              animationState: hasInProgress ? 'working' : 'idle',
              activeWorkflowAction: 'none',
              currentActivityLabel: hasInProgress
                ? `Monitorando operações do ${emp.floor}º Andar`
                : 'Aguardando tarefa real do CEO',
            };
          }
          if (emp.animationState === 'celebrating') {
            return {
              ...emp,
              animationState: hasInProgress ? 'working' : 'idle',
              currentActivityLabel: hasInProgress
                ? `Operando estação: ${emp.specialty}`
                : 'Aguardando tarefa real',
            };
          }
          return emp;
        }),
      }));
    }, 5500);
  }, []);

  const handleCreateTask = useCallback(
    (input: {
      title: string;
      description: string;
      assigneeId: string;
      departmentId: DepartmentId;
      priority: TaskPriority;
      dueDate: string;
      isFinancialOrIrreversible?: boolean;
      requiredChannelIds?: ChannelId[];
    }) => {
      const nowIso = new Date().toISOString();
      setExecutionError(null);
      setState((prev) => createTaskInState(prev, input, nowIso));
      scheduleManagerReturn(input.departmentId);
    },
    [scheduleManagerReturn]
  );

  const handleTransitionTaskStatus = useCallback(
    (taskId: string, nextStatus: TaskStatus, resultSummary?: string) => {
      const nowIso = new Date().toISOString();
      let deptToReturn: DepartmentId | null = null;
      setExecutionError(null);
      setState((prev) => {
        try {
          const task = prev.tasks.find((t) => t.id === taskId);
          if (task && nextStatus === 'concluida') {
            deptToReturn = task.departmentId;
          }
          return transitionTaskStatus(
            prev,
            taskId,
            nextStatus,
            resultSummary,
            prev.settings.ceoName,
            nowIso
          );
        } catch (err) {
          setExecutionError(
            err instanceof Error ? err.message : 'Transição não autorizada.'
          );
          return prev;
        }
      });
      if (deptToReturn) {
        scheduleManagerReturn(deptToReturn);
      }
    },
    [scheduleManagerReturn]
  );

  const handleChangeAutonomy = useCallback(
    (employeeId: string, level: AutonomyLevel) => {
      setState((prev) => ({
        ...prev,
        employees: prev.employees.map((e) =>
          e.id === employeeId ? { ...e, autonomyLevel: level } : e
        ),
      }));
    },
    []
  );

  const handleSetAnimationState = useCallback(
    (employeeId: string, animState: CharacterAnimationState) => {
      const labelMap: Record<CharacterAnimationState, string> = {
        working: 'Trabalhando no computador',
        walking: 'Em deslocamento pelo andar',
        idle: 'Aguardando tarefa real',
        conversing: 'Em alinhamento com equipe',
        celebrating: 'Comemorando entrega concluída',
        thinking: 'Analisando estratégia',
        resting: 'Em pausa rápida',
      };
      setState((prev) => ({
        ...prev,
        employees: prev.employees.map((e) =>
          e.id === employeeId
            ? {
                ...e,
                animationState: animState,
                conversingWithId:
                  animState === 'conversing' ? e.conversingWithId : null,
                activeWorkflowAction: 'none',
                currentActivityLabel: labelMap[animState],
              }
            : e
        ),
      }));
    },
    []
  );

  const stateLatestRef = useRef(state);
  stateLatestRef.current = state;

  const distillAndAppendThought = useCallback(
    async (params: {
      text: string;
      actorIds: string[];
      sourceType: 'conversation' | 'task_execution' | 'core_directive' | 'supervisor_review';
      hasActiveTask?: boolean;
      useAiRefinement?: boolean;
    }) => {
      const snapshot = stateLatestRef.current;
      if (snapshot.brain.nodes.length >= snapshot.brain.maxConnections) {
        return;
      }

      const actors = snapshot.employees.filter((e) =>
        params.actorIds.includes(e.id)
      );
      if (actors.length === 0) return;

      const localEval = evaluateLocalThoughtImportance({
        text: params.text,
        actors,
        skills: snapshot.skills,
        sourceType: params.sourceType,
        hasActiveTask: params.hasActiveTask,
      });

      if (!localEval.important || !localEval.candidate) {
        setState((prev) => incrementBrainFilteredOut(prev));
        return;
      }

      let finalCandidate: BrainThoughtCandidate = localEval.candidate;
      let aiTokens: TokenUsageReport | null = null;
      let aiModel = 'gemini-4-hydrogen';

      const withinTokenBudget =
        snapshot.tokenPolicy.usedTotal < snapshot.tokenPolicy.dailyLimit;

      if (params.useAiRefinement && geminiConfigured && withinTokenBudget) {
        const aiDistill = await distillBrainThoughtWithAI({
          text: params.text,
          actors,
          skills: snapshot.skills,
          sourceType: params.sourceType,
          tokenPolicy: snapshot.tokenPolicy,
        });
        if (aiDistill) {
          aiTokens = aiDistill.tokenUsage;
          aiModel = aiDistill.model;
          if (!aiDistill.important || !aiDistill.candidate) {
            setState((prev) => incrementBrainFilteredOut(prev));
            return;
          }
          const validSkillId = snapshot.skills.some(
            (s) => s.id === aiDistill.candidate!.skillId
          )
            ? aiDistill.candidate.skillId
            : localEval.candidate.skillId;

          finalCandidate = {
            ...localEval.candidate,
            skillId: validSkillId,
            concept: aiDistill.candidate.concept || localEval.candidate.concept,
            essence: aiDistill.candidate.essence || localEval.candidate.essence,
            importance: Math.max(
              0.65,
              Math.min(1, Number(aiDistill.candidate.importance) || 0.78)
            ),
          };
        }
      }

      const nowIso = new Date().toISOString();
      setState((prev) => {
        let next = appendBrainThought(prev, finalCandidate, nowIso);
        if (aiTokens && aiTokens.totalTokens > 0) {
          next = recordTokenUsage(next, {
            timestamp: nowIso,
            actorName: 'Nexus Mind',
            action: 'brain_distill',
            promptTokens: aiTokens.promptTokens,
            candidatesTokens: aiTokens.candidatesTokens,
            totalTokens: aiTokens.totalTokens,
            model: aiModel,
          });
        }
        return next;
      });
    },
    [geminiConfigured]
  );

  const handleUpdateBrainLimit = useCallback((nextLimit: number) => {
    setState((prev) => setBrainMaxConnections(prev, nextLimit));
  }, []);

  const handleStartConversation = useCallback(
    (employeeAId: string, employeeBId: string | null) => {
      const snapshot = stateLatestRef.current;
      const empA = snapshot.employees.find((e) => e.id === employeeAId);
      const empB = employeeBId
        ? snapshot.employees.find((e) => e.id === employeeBId)
        : null;

      setState((prev) => ({
        ...prev,
        employees: setEmployeeConversationPair(
          prev.employees,
          employeeAId,
          employeeBId
        ),
      }));

      if (empA && empB) {
        const skillA =
          snapshot.skills.find((s) => empA.skillIds.includes(s.id))?.name ??
          empA.specialty;
        const skillB =
          snapshot.skills.find((s) => empB.skillIds.includes(s.id))?.name ??
          empB.specialty;
        const sharedTask = snapshot.tasks.find(
          (t) =>
            (t.assigneeId === empA.id || t.assigneeId === empB.id) &&
            t.status !== 'concluida'
        );
        const dialogueText = sharedTask
          ? `Alinhamento técnico entre ${empA.name} (${skillA}) e ${empB.name} (${skillB}) sobre a tarefa "${sharedTask.title}": critérios de execução e validação de canais.`
          : `Sinergia operacional entre ${empA.name} (${skillA}) e ${empB.name} (${skillB}) conectando estratégia do ${empA.floor}º andar e execução de ${skillB}.`;

        void distillAndAppendThought({
          text: dialogueText,
          actorIds: [empA.id, empB.id],
          sourceType: 'conversation',
          hasActiveTask: Boolean(sharedTask),
          useAiRefinement: false,
        });
      }
    },
    [distillAndAppendThought]
  );

  const handleAppendEmployeeChat = useCallback(
    (
      employeeId: string,
      ceoMsg: string,
      replyMsg: string,
      tokenUsage: TokenUsageReport,
      model: string
    ) => {
      const now = new Date().toISOString();
      setState((prev) => {
        const emp = prev.employees.find((e) => e.id === employeeId);
        let next: NexusState = {
          ...prev,
          employees: prev.employees.map((item) => {
            if (item.id !== employeeId) return item;
            return {
              ...item,
              conversationHistory: [
                ...item.conversationHistory,
                {
                  id: nextUniqueId('m_ceo'),
                  sender: 'ceo',
                  senderName: prev.settings.ceoName,
                  content: ceoMsg,
                  timestamp: now,
                },
                {
                  id: nextUniqueId('m_emp'),
                  sender: 'employee',
                  senderName: item.name,
                  content: replyMsg,
                  timestamp: now,
                  tokensUsed: tokenUsage.totalTokens,
                },
              ],
            };
          }),
        };
        if (tokenUsage.totalTokens > 0) {
          next = recordTokenUsage(next, {
            timestamp: now,
            actorName: emp?.name ?? 'Agente',
            action: 'agent_chat',
            promptTokens: tokenUsage.promptTokens,
            candidatesTokens: tokenUsage.candidatesTokens,
            totalTokens: tokenUsage.totalTokens,
            model,
          });
        }
        return next;
      });
      void distillAndAppendThought({
        text: `${ceoMsg} -> ${replyMsg}`,
        actorIds: [employeeId],
        sourceType: 'conversation',
        hasActiveTask: stateLatestRef.current.tasks.some(
          (t) => t.assigneeId === employeeId && t.status !== 'concluida'
        ),
        useAiRefinement: true,
      });
    },
    [distillAndAppendThought]
  );

  const handleRecordCoreExchange = useCallback(
    (
      ceoText: string,
      coreReply: string,
      tokenUsage: TokenUsageReport,
      model: string,
      plan: {
        targetDepartment: DepartmentId;
        assignedEmployeeId: string;
        subtasks: Array<{
          title: string;
          description: string;
          assigneeId: string;
          priority: TaskPriority;
          requiredChannelIds: ChannelId[];
        }>;
      }
    ) => {
      const now = new Date().toISOString();
      setState((prev) => {
        let next: NexusState = {
          ...prev,
          nexusCoreMessages: [
            ...prev.nexusCoreMessages,
            {
              id: nextUniqueId('nc_ceo'),
              sender: 'ceo' as const,
              senderName: prev.settings.ceoName,
              content: ceoText,
              timestamp: now,
            },
            {
              id: nextUniqueId('nc_core'),
              sender: 'nexus_core' as const,
              senderName: 'NEXUS CORE',
              content: coreReply,
              timestamp: now,
              tokensUsed: tokenUsage.totalTokens,
              structuredPlan: {
                targetDepartment: plan.targetDepartment,
                assignedEmployeeId: plan.assignedEmployeeId,
                subtasks: plan.subtasks.map((s) => ({
                  title: s.title,
                  assigneeId: s.assigneeId,
                  priority: s.priority,
                })),
              },
            },
          ],
        };

        if (tokenUsage.totalTokens > 0) {
          next = recordTokenUsage(next, {
            timestamp: now,
            actorName: 'NEXUS CORE',
            action: 'core',
            promptTokens: tokenUsage.promptTokens,
            candidatesTokens: tokenUsage.candidatesTokens,
            totalTokens: tokenUsage.totalTokens,
            model,
          });
        }

        for (const st of plan.subtasks) {
          const validAssignee = next.employees.some((e) => e.id === st.assigneeId)
            ? st.assigneeId
            : plan.assignedEmployeeId;
          next = createTaskInState(
            next,
            {
              title: st.title,
              description: st.description,
              assigneeId: validAssignee,
              departmentId: plan.targetDepartment,
              priority: st.priority,
              dueDate: new Date(Date.now() + 86400000 * 3)
                .toISOString()
                .slice(0, 10),
              requiredChannelIds: st.requiredChannelIds,
            },
            now
          );
        }
        return next;
      });
      scheduleManagerReturn(plan.targetDepartment);
      const subtaskNames = plan.subtasks.map((s) => s.title).join('; ');
      void distillAndAppendThought({
        text: `Diretriz NEXUS CORE "${ceoText}": ${coreReply}${
          subtaskNames ? ` | Subtarefas: ${subtaskNames}` : ''
        }`,
        actorIds: [plan.assignedEmployeeId],
        sourceType: 'core_directive',
        hasActiveTask: true,
        useAiRefinement: true,
      });
    },
    [scheduleManagerReturn, distillAndAppendThought]
  );

  const handleResolveApproval = useCallback(
    (
      approvalId: string,
      stageActor: 'supervisor' | 'ceo',
      decision: 'approved' | 'rejected',
      comment?: string,
      tokenUsage?: { usage: TokenUsageReport; actorName: string; model: string }
    ) => {
      const now = new Date().toISOString();
      setExecutionError(null);
      setState((prev) => {
        let next = approveTaskAtStage(
          prev,
          approvalId,
          stageActor,
          decision,
          comment,
          now
        );
        if (tokenUsage && tokenUsage.usage.totalTokens > 0) {
          next = recordTokenUsage(next, {
            timestamp: now,
            actorName: tokenUsage.actorName,
            action: 'supervisor_review',
            promptTokens: tokenUsage.usage.promptTokens,
            candidatesTokens: tokenUsage.usage.candidatesTokens,
            totalTokens: tokenUsage.usage.totalTokens,
            model: tokenUsage.model,
          });
        }
        return next;
      });

      if (decision === 'approved') {
        const apr = stateLatestRef.current.approvals.find((a) => a.id === approvalId);
        if (apr) {
          void distillAndAppendThought({
            text: `Permissão concedida (${stageActor === 'supervisor' ? 'Superior' : 'CEO'}) para "${apr.title}": ${comment ?? apr.description}`,
            actorIds: [apr.requestedByEmployeeId, apr.supervisorId],
            sourceType: 'supervisor_review',
            hasActiveTask: true,
            useAiRefinement: false,
          });
        }
      }
    },
    [distillAndAppendThought]
  );

  const handleSupervisorAIReview = useCallback(
    async (apr: ApprovalItem) => {
      const supervisor = state.employees.find((e) => e.id === apr.supervisorId);
      const requester = state.employees.find(
        (e) => e.id === apr.requestedByEmployeeId
      );
      const task = state.tasks.find((t) => t.id === apr.relatedTaskId);
      if (!supervisor || !requester || !task) {
        handleResolveApproval(apr.id, 'supervisor', 'approved');
        return;
      }
      setExecutionError(null);
      try {
        const reqChannelNames = task.requiredChannelIds.map(
          (id) => state.channels.find((c) => c.id === id)?.name ?? id
        );
        const res = await requestSupervisorAIReview(
          supervisor,
          requester,
          task,
          reqChannelNames,
          state.tokenPolicy
        );
        handleResolveApproval(apr.id, 'supervisor', 'approved', res.comment, {
          usage: res.tokenUsage,
          actorName: supervisor.name,
          model: res.model,
        });
      } catch (err) {
        setExecutionError(
          err instanceof Error
            ? err.message
            : 'Falha ao gerar parecer real do superior.'
        );
      }
    },
    [state.employees, state.tasks, state.channels, state.tokenPolicy, handleResolveApproval]
  );

  const handleExecuteTaskReal = useCallback(
    async (task: TaskItem) => {
      const gate = canExecuteTask(state, task);
      if (!gate.allowed) {
        setExecutionError(gate.reason);
        return;
      }
      const employee = state.employees.find((e) => e.id === task.assigneeId);
      if (!employee) {
        setExecutionError('Especialista executor não encontrado.');
        return;
      }

      setExecutionError(null);
      setExecutingTaskId(task.id);
      setState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === task.id ? { ...t, status: 'em_execucao' } : t
        ),
        employees: prev.employees.map((e) =>
          e.id === employee.id
            ? {
                ...e,
                animationState: 'working',
                activeWorkflowAction: 'none',
                currentActivityLabel: `Executando via canais oficiais: ${task.title.slice(0, 22)}`,
              }
            : e
        ),
      }));

      try {
        const connectedChannelIds = state.channels
          .filter((c) => c.status === 'connected')
          .map((c) => c.id);

        const res = await executeTaskWithRealAI(
          task,
          employee,
          connectedChannelIds,
          state.tokenPolicy
        );
        const nowIso = new Date().toISOString();
        setState((prev) =>
          recordRealTaskExecution(
            prev,
            task.id,
            {
              resultText: res.resultText,
              groundingSources: res.groundingSources,
              promptTokens: res.tokenUsage.promptTokens,
              candidatesTokens: res.tokenUsage.candidatesTokens,
              totalTokens: res.tokenUsage.totalTokens,
              model: res.model,
            },
            nowIso
          )
        );
        scheduleManagerReturn(task.departmentId);
        void distillAndAppendThought({
          text: `Entrega concluída "${task.title}": ${res.resultText.slice(0, 320)}`,
          actorIds: [employee.id],
          sourceType: 'task_execution',
          hasActiveTask: true,
          useAiRefinement: true,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erro na execução real da tarefa.';
        setExecutionError(message);
        setState((prev) => ({
          ...prev,
          tasks: prev.tasks.map((t) =>
            t.id === task.id ? { ...t, status: 'planejada' } : t
          ),
          employees: prev.employees.map((e) =>
            e.id === employee.id
              ? {
                  ...e,
                  animationState: 'idle',
                  currentActivityLabel: 'Execução interrompida — verificar erro',
                }
              : e
          ),
        }));
      } finally {
        setExecutingTaskId(null);
      }
    },
    [state, scheduleManagerReturn, distillAndAppendThought]
  );

  const handleConnectChannel = useCallback(async (channelId: ChannelId) => {
    setChannelVerifyError(null);
    setVerifyingChannelId(channelId);
    try {
      if (channelId === 'ch_supabase' && isSupabaseConfigured()) {
        const nowIso = new Date().toISOString();
        setSupabaseConnected(true);
        setState((prev) =>
          setChannelConnectionStatus(
            prev,
            'ch_supabase',
            'connected',
            'Supabase Client Oficial Conectado',
            nowIso
          )
        );
        return;
      }

      const res = await verifyOfficialChannel(channelId);
      setState((prev) =>
        setChannelConnectionStatus(
          prev,
          channelId,
          'connected',
          res.accountLabel,
          res.verifiedAt
        )
      );
      if (channelId === 'ch_supabase') {
        setSupabaseConnected(true);
      }
    } catch (err) {
      setChannelVerifyError(
        err instanceof Error
          ? err.message
          : 'Não foi possível verificar as credenciais oficiais deste canal.'
      );
    } finally {
      setVerifyingChannelId(null);
    }
  }, []);

  const handleDisconnectChannel = useCallback((channelId: ChannelId) => {
    setChannelVerifyError(null);
    setState((prev) =>
      setChannelConnectionStatus(
        prev,
        channelId,
        'disconnected',
        undefined,
        new Date().toISOString()
      )
    );
  }, []);

  const handleUpdateTokenPolicy = useCallback(
    (patch: Partial<TokenUsagePolicy>) => {
      setState((prev) => ({
        ...prev,
        tokenPolicy: { ...prev.tokenPolicy, ...patch },
      }));
    },
    []
  );

  const handleSyncSupabaseNow = useCallback(async () => {
    const res = await saveCloudNexusState(state);
    if (res.ok) {
      setSupabaseConnected(true);
      setSupabaseSyncMessage(
        `Sincronizado manualmente com Supabase às ${new Date().toLocaleTimeString('pt-BR')}.`
      );
    } else {
      setSupabaseSyncMessage(
        res.error ??
          'Supabase não configurado no ambiente atual (configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY).'
      );
    }
  }, [state]);

  const handleResetWorkspace = useCallback(() => {
    resetLocalNexusState();
    setExecutionError(null);
    setChannelVerifyError(null);
    setState(INITIAL_NEXUS_STATE);
  }, []);

  const joaoConversingWithMaria = useMemo(() => {
    const joao = state.employees.find((e) => e.id === 'emp_01');
    return joao?.animationState === 'conversing' && joao.conversingWithId === 'emp_02';
  }, [state.employees]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0B0F14] text-slate-100">
      {!entered && (
        <EntryScreen onStart={handleStart} geminiConfigured={geminiConfigured} />
      )}

      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        pendingApprovalsCount={metrics.pendingApprovalsCount}
        pendingTasksCount={metrics.tasksPending + metrics.tasksInProgress}
        brainConnectionsCount={state.brain.nodes.length}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Compact Top Command Bar */}
        <header className="h-14 shrink-0 px-3 sm:px-5 border-b border-slate-800 bg-[#0C1017] flex items-center justify-between gap-4 z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Abrir menu lateral"
              className="lg:hidden p-2 rounded-lg text-slate-300 hover:bg-slate-800 min-w-[40px] min-h-[40px] flex items-center justify-center"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-display font-bold text-sm sm:text-base text-slate-100 whitespace-nowrap truncate">
              {activeSection === 'hq'
                ? 'Sede 3D · NEXUS EMPIRE'
                : activeSection === 'brain'
                ? 'Cérebro Neural · Nexus Mind'
                : 'NEXUS EMPIRE'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setCoreComputerOpen(true)}
              aria-label="Abrir Livro Histórico Azul e Vermelho"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-500/50 bg-[#101524] hover:border-red-400 text-xs font-medium text-slate-100 cursor-pointer whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              <span>PC Azul &amp; Vermelho</span>
            </button>

            <button
              type="button"
              onClick={() => setNexusCoreOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs cursor-pointer whitespace-nowrap"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>NEXUS CORE</span>
              {metrics.pendingApprovalsCount > 0 && (
                <span className="inline-flex items-center gap-0.5 font-mono text-[11px] bg-slate-950/20 px-1.5 rounded">
                  <Bell className="w-3 h-3" />
                  {metrics.pendingApprovalsCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="flex-1 relative min-h-0 overflow-y-auto">
          {activeSection === 'hq' ? (
            <div className="relative w-full h-full">
              <Office3DViewport
                employees={state.employees}
                tasks={state.tasks}
                historicalLedger={state.historicalLedger}
                activeFloor={activeFloor}
                selectedEmployeeId={selectedEmployeeId}
                graphicsQuality={state.settings.graphicsQuality}
                simulationSpeed={state.settings.simulationSpeed}
                showBubbles={showBubbles}
                cameraZoomSignal={cameraZoomSignal}
                onSelectEmployee={(id) => setSelectedEmployeeId(id)}
                onOpenTaskBoard={(floor) => {
                  setTaskBoardInitialFloor(floor);
                  setActiveSection('tasks');
                }}
                onOpenCoreComputer={() => setCoreComputerOpen(true)}
              />

              {/* Top-left compact HUD status */}
              <div className="pointer-events-none absolute top-3 left-3 z-20 hidden sm:flex items-center gap-3 px-3.5 py-2 rounded-lg border border-slate-800 bg-[#0B0F14]/90 text-xs text-slate-300">
                <span>
                  Ativos:{' '}
                  <strong className="font-mono text-emerald-400">
                    {metrics.activeEmployeesCount}/12
                  </strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Tarefas:{' '}
                  <strong className="font-mono text-cyan-300">
                    {metrics.tasksInProgress + metrics.tasksPending + metrics.tasksAwaitingApproval}
                  </strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Canais:{' '}
                  <strong className="font-mono text-blue-300">
                    {metrics.connectedChannelsCount}/{metrics.totalChannelsCount}
                  </strong>
                </span>
              </div>

              {/* Unified Collapsible Bottom Dock */}
              <div className="pointer-events-none fixed lg:absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center max-w-[96vw]">
                <button
                  type="button"
                  onClick={() => setHudCollapsed((c) => !c)}
                  className="pointer-events-auto mb-1.5 inline-flex items-center gap-1 px-3 py-1 rounded-t-lg border border-slate-700 bg-[#0D1219]/95 text-[11px] font-medium text-slate-300 hover:text-white cursor-pointer"
                >
                  {hudCollapsed ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Mostrar Controles</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>Ocultar Controles</span>
                    </>
                  )}
                </button>

                {!hudCollapsed && (
                  <div className="pointer-events-auto flex flex-wrap sm:flex-nowrap items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-slate-700/90 bg-[#0D1219]/95 shadow-2xl">
                    {/* Floor Switcher */}
                    <div className="inline-flex rounded-lg bg-[#080B10] border border-slate-800 p-0.5">
                      {(
                        [
                          { id: 'all', label: '2 Andares' },
                          { id: 1, label: '1º Produtos' },
                          { id: 2, label: '2º Marketing' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={String(opt.id)}
                          type="button"
                          onClick={() => setActiveFloor(opt.id)}
                          className={`px-2 sm:px-2.5 py-1.5 rounded-md text-[11px] sm:text-xs font-medium cursor-pointer whitespace-nowrap ${
                            activeFloor === opt.id
                              ? opt.id === 2
                                ? 'bg-violet-500 text-white'
                                : 'bg-emerald-500 text-slate-950 font-semibold'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {/* Camera Controls */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Aproximar câmera"
                        onClick={() =>
                          setCameraZoomSignal((s) => ({
                            type: 'in',
                            seq: (s?.seq ?? 0) + 1,
                          }))
                        }
                        className="p-1.5 sm:p-2 rounded-lg bg-[#080B10] border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
                      >
                        <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Afastar câmera"
                        onClick={() =>
                          setCameraZoomSignal((s) => ({
                            type: 'out',
                            seq: (s?.seq ?? 0) + 1,
                          }))
                        }
                        className="p-1.5 sm:p-2 rounded-lg bg-[#080B10] border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
                      >
                        <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Resetar câmera isométrica"
                        onClick={() =>
                          setCameraZoomSignal((s) => ({
                            type: 'reset',
                            seq: (s?.seq ?? 0) + 1,
                          }))
                        }
                        className="p-1.5 sm:p-2 rounded-lg bg-[#080B10] border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>

                    {/* Toggle Bubbles & Direct 3D Conversation */}
                    <button
                      type="button"
                      onClick={() => setShowBubbles((b) => !b)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#080B10] border border-slate-800 text-[11px] sm:text-xs text-slate-200 hover:border-slate-600 cursor-pointer whitespace-nowrap"
                    >
                      {showBubbles ? (
                        <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <span>Balões</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleStartConversation(
                          'emp_01',
                          joaoConversingWithMaria ? null : 'emp_02'
                        )
                      }
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] sm:text-xs font-medium cursor-pointer whitespace-nowrap ${
                        joaoConversingWithMaria
                          ? 'bg-violet-500/25 border-violet-400 text-violet-200'
                          : 'bg-[#080B10] border-slate-800 text-slate-200 hover:border-cyan-500/60'
                      }`}
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-violet-400" />
                      <span>
                        {joaoConversingWithMaria ? 'Voltar ao PC' : 'João & Maria'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : activeSection === 'brain' ? (
            <BrainView state={state} onUpdateLimit={handleUpdateBrainLimit} />
          ) : activeSection === 'dashboard' ? (
            <DashboardView
              state={state}
              geminiConfigured={geminiConfigured}
              supabaseConnected={supabaseConnected}
              onSelectEmployee={(id) => setSelectedEmployeeId(id)}
              onOpenCoreComputer={() => setCoreComputerOpen(true)}
              onOpenNexusCore={() => setNexusCoreOpen(true)}
              onGoToSettings={() => setActiveSection('settings')}
            />
          ) : activeSection === 'employees' ? (
            <EmployeesView
              employees={state.employees}
              onSelectEmployee={(id) => setSelectedEmployeeId(id)}
              onChangeAutonomy={handleChangeAutonomy}
              onStartConversation={handleStartConversation}
            />
          ) : activeSection === 'departments' ? (
            <DepartmentsView
              departments={state.departments}
              employees={state.employees}
              tasks={state.tasks}
              requests={state.interDeptRequests}
              onCreateRequest={(req) => {
                const now = new Date().toISOString();
                setState((prev) => ({
                  ...prev,
                  interDeptRequests: [
                    {
                      id: nextUniqueId('idr'),
                      fromDepartmentId: req.fromDepartmentId,
                      toDepartmentId: req.toDepartmentId,
                      fromEmployeeId:
                        req.fromDepartmentId === 'dept_products' ? 'emp_01' : 'emp_07',
                      toEmployeeId:
                        req.toDepartmentId === 'dept_products' ? 'emp_01' : 'emp_07',
                      title: req.title,
                      details: req.details,
                      status: 'pendente',
                      createdAt: now,
                    },
                    ...prev.interDeptRequests,
                  ],
                }));
              }}
              onUpdateRequestStatus={(id, status) => {
                setState((prev) => ({
                  ...prev,
                  interDeptRequests: prev.interDeptRequests.map((r) =>
                    r.id === id ? { ...r, status } : r
                  ),
                }));
              }}
              onFocusFloorIn3D={(floor) => {
                setActiveFloor(floor);
                setActiveSection('hq');
              }}
            />
          ) : activeSection === 'products' ? (
            <ProductsView
              state={state}
              onAddProduct={(p: Omit<ProductItem, 'id' | 'marginPercent'>) => {
                const marginPercent =
                  p.salePrice > 0
                    ? Math.round(((p.salePrice - p.costPrice) / p.salePrice) * 100)
                    : 0;
                setState((prev) => ({
                  ...prev,
                  products: [
                    { ...p, id: nextUniqueId('prod'), marginPercent },
                    ...prev.products,
                  ],
                }));
              }}
            />
          ) : activeSection === 'marketing' ? (
            <MarketingView
              state={state}
              onApproveCampaign={(cmpId) =>
                setState((prev) => ({
                  ...prev,
                  campaigns: prev.campaigns.map((c) =>
                    c.id === cmpId ? { ...c, status: 'ativa' } : c
                  ),
                }))
              }
            />
          ) : activeSection === 'stores' ? (
            <StoresView
              state={state}
              onToggleStoreStatus={(storeId) =>
                setState((prev) => ({
                  ...prev,
                  stores: prev.stores.map((s) =>
                    s.id === storeId
                      ? {
                          ...s,
                          status: s.status === 'online' ? 'manutencao' : 'online',
                        }
                      : s
                  ),
                }))
              }
            />
          ) : activeSection === 'sites' ? (
            <SitesView
              state={state}
              onPublishSite={(siteId) =>
                setState((prev) => ({
                  ...prev,
                  sites: prev.sites.map((s) =>
                    s.id === siteId ? { ...s, status: 'publicado' } : s
                  ),
                }))
              }
            />
          ) : activeSection === 'tasks' ? (
            <TasksView
              state={state}
              initialBoardFloor={taskBoardInitialFloor}
              executingTaskId={executingTaskId}
              executionError={executionError}
              onCreateTask={handleCreateTask}
              onResolveApproval={handleResolveApproval}
              onSupervisorAIReview={handleSupervisorAIReview}
              onExecuteTaskReal={handleExecuteTaskReal}
              onTransitionStatus={handleTransitionTaskStatus}
              onOpenCoreComputer={() => setCoreComputerOpen(true)}
              onGoToSettings={() => setActiveSection('settings')}
            />
          ) : activeSection === 'automations' ? (
            <AutomationsView
              state={state}
              onToggleAutomation={(id) =>
                setState((prev) => ({
                  ...prev,
                  automations: prev.automations.map((a) =>
                    a.id === id ? { ...a, active: !a.active } : a
                  ),
                }))
              }
            />
          ) : activeSection === 'finance' ? (
            <FinanceView state={state} />
          ) : activeSection === 'functions' ? (
            <FunctionLibraryView
              functions={state.functions}
              skills={state.skills}
              tools={state.tools}
              employees={state.employees}
              onRegisterFunction={(payload) => {
                setState((prev) => ({
                  ...prev,
                  functions: validateAndRegisterFunction(prev.functions, payload),
                }));
              }}
              onToggleFunction={(fnId) => {
                setState((prev) => ({
                  ...prev,
                  functions: prev.functions.map((f) =>
                    f.id === fnId ? { ...f, active: !f.active } : f
                  ),
                }));
              }}
            />
          ) : activeSection === 'reports' ? (
            <ReportsView
              state={state}
              onOpenCoreComputer={() => setCoreComputerOpen(true)}
            />
          ) : (
            <SettingsView
              state={state}
              geminiConfigured={geminiConfigured}
              supabaseConnected={supabaseConnected}
              supabaseSyncMessage={supabaseSyncMessage}
              channelVerifyError={channelVerifyError}
              verifyingChannelId={verifyingChannelId}
              onUpdateSettings={(patch: Partial<CompanySettings>) =>
                setState((prev) => ({
                  ...prev,
                  settings: { ...prev.settings, ...patch },
                }))
              }
              onUpdateTokenPolicy={handleUpdateTokenPolicy}
              onConnectChannel={handleConnectChannel}
              onDisconnectChannel={handleDisconnectChannel}
              onSyncSupabaseNow={handleSyncSupabaseNow}
              onResetWorkspace={handleResetWorkspace}
            />
          )}
        </main>
      </div>

      {/* Interactive Employee Sheet Modal */}
      <EmployeeModal
        employee={selectedEmployee}
        allEmployees={state.employees}
        skills={state.skills}
        tools={state.tools}
        channels={state.channels}
        tokenPolicy={state.tokenPolicy}
        tasks={state.tasks}
        geminiConfigured={geminiConfigured}
        onClose={() => setSelectedEmployeeId(null)}
        onChangeAutonomy={handleChangeAutonomy}
        onSetAnimationState={handleSetAnimationState}
        onStartConversation={handleStartConversation}
        onDelegateTask={handleCreateTask}
        onAppendConversation={handleAppendEmployeeChat}
      />

      {/* NEXUS CORE Central AI Command Drawer */}
      <NexusCoreDrawer
        open={nexusCoreOpen}
        onClose={() => setNexusCoreOpen(false)}
        messages={state.nexusCoreMessages}
        employees={state.employees}
        tasks={state.tasks}
        approvals={state.approvals}
        channels={state.channels}
        tokenPolicy={state.tokenPolicy}
        geminiConfigured={geminiConfigured}
        onRecordCoreExchange={handleRecordCoreExchange}
        onResolveApproval={handleResolveApproval}
      />

      {/* Blue & Red Central Historical Core Computer Modal */}
      <CoreComputerModal
        open={coreComputerOpen}
        onClose={() => setCoreComputerOpen(false)}
        entries={state.historicalLedger}
      />
    </div>
  );
}
