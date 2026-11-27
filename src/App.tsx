import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  computeDashboardMetrics,
  createTaskInState,
  setEmployeeConversationPair,
  transitionTaskStatus,
  validateAndRegisterFunction,
} from './core/simulationRules';
import { INITIAL_NEXUS_STATE } from './data/seedData';
import { fetchNexusServerStatus } from './services/aiService';
import {
  loadPersistedNexusState,
  resetLocalNexusState,
  saveLocalNexusState,
} from './services/supabaseService';
import type {
  AutonomyLevel,
  CharacterAnimationState,
  CompanySettings,
  DepartmentId,
  FloorNumber,
  NavSectionId,
  NexusState,
  ProductItem,
  TaskPriority,
  TaskStatus,
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

export default function App() {
  const [entered, setEntered] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('autostart') === '1';
  });

  const [state, setState] = useState<NexusState>(() =>
    loadPersistedNexusState(INITIAL_NEXUS_STATE)
  );
  const [geminiConfigured, setGeminiConfigured] = useState(false);

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

  // Sync body state attribute for accessibility & verification
  useEffect(() => {
    document.body.dataset.state = entered ? 'playing' : 'title';
  }, [entered]);

  // Probe server AI & Supabase configuration status
  useEffect(() => {
    fetchNexusServerStatus().then((status) => {
      setGeminiConfigured(status.geminiConfigured);
    });
  }, []);

  // Persist changes locally
  useEffect(() => {
    saveLocalNexusState(state);
  }, [state]);

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
          if (emp.departmentId === departmentId && emp.isFloorManager) {
            return {
              ...emp,
              animationState: 'working',
              activeWorkflowAction: 'none',
              currentActivityLabel: `Monitorando operações do ${emp.floor}º Andar`,
            };
          }
          if (emp.animationState === 'celebrating') {
            return {
              ...emp,
              animationState: 'working',
              currentActivityLabel: `Operando estação: ${emp.specialty}`,
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
    }) => {
      const nowIso = new Date().toISOString();
      setState((prev) => createTaskInState(prev, input, nowIso));
      scheduleManagerReturn(input.departmentId);
    },
    [scheduleManagerReturn]
  );

  const handleTransitionTaskStatus = useCallback(
    (taskId: string, nextStatus: TaskStatus, resultSummary?: string) => {
      const nowIso = new Date().toISOString();
      let deptToReturn: DepartmentId | null = null;
      setState((prev) => {
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
        idle: 'Aguardando próxima instrução',
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
                conversingWithId: animState === 'conversing' ? e.conversingWithId : null,
                activeWorkflowAction: 'none',
                currentActivityLabel: labelMap[animState],
              }
            : e
        ),
      }));
    },
    []
  );

  const handleStartConversation = useCallback(
    (employeeAId: string, employeeBId: string | null) => {
      setState((prev) => ({
        ...prev,
        employees: setEmployeeConversationPair(prev.employees, employeeAId, employeeBId),
      }));
    },
    []
  );

  const handleAppendEmployeeChat = useCallback(
    (employeeId: string, ceoMsg: string, replyMsg: string, isDemo: boolean) => {
      const now = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        employees: prev.employees.map((emp) => {
          if (emp.id !== employeeId) return emp;
          return {
            ...emp,
            conversationHistory: [
              ...emp.conversationHistory,
              {
                id: `m_ceo_${Date.now()}`,
                sender: 'ceo',
                senderName: prev.settings.ceoName,
                content: ceoMsg,
                timestamp: now,
              },
              {
                id: `m_emp_${Date.now() + 1}`,
                sender: 'employee',
                senderName: emp.name,
                content: replyMsg,
                timestamp: now,
                isDemo,
              },
            ],
          };
        }),
      }));
    },
    []
  );

  const handleRecordCoreExchange = useCallback(
    (
      ceoText: string,
      coreReply: string,
      isDemo: boolean,
      plan: {
        targetDepartment: DepartmentId;
        assignedEmployeeId: string;
        subtasks: Array<{
          title: string;
          description: string;
          assigneeId: string;
          priority: TaskPriority;
        }>;
      }
    ) => {
      const now = new Date().toISOString();
      setState((prev) => {
        let next = {
          ...prev,
          nexusCoreMessages: [
            ...prev.nexusCoreMessages,
            {
              id: `nc_ceo_${Date.now()}`,
              sender: 'ceo' as const,
              senderName: prev.settings.ceoName,
              content: ceoText,
              timestamp: now,
            },
            {
              id: `nc_core_${Date.now() + 1}`,
              sender: 'nexus_core' as const,
              senderName: 'NEXUS CORE',
              content: coreReply,
              timestamp: now,
              isDemo,
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
              dueDate: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
            },
            now
          );
        }
        return next;
      });
      scheduleManagerReturn(plan.targetDepartment);
    },
    [scheduleManagerReturn]
  );

  const handleResolveApproval = useCallback(
    (approvalId: string, decision: 'approved' | 'rejected') => {
      const now = new Date().toISOString();
      setState((prev) => {
        const target = prev.approvals.find((a) => a.id === approvalId);
        let nextTasks = prev.tasks;
        if (target?.relatedTaskId) {
          nextTasks = prev.tasks.map((t) =>
            t.id === target.relatedTaskId
              ? {
                  ...t,
                  status: decision === 'approved' ? 'em_execucao' : 'cancelada',
                  requiresApproval: false,
                }
              : t
          );
        }
        return {
          ...prev,
          tasks: nextTasks,
          approvals: prev.approvals.map((a) =>
            a.id === approvalId ? { ...a, status: decision } : a
          ),
          activityLogs: [
            {
              id: `log_apr_${Date.now()}`,
              timestamp: now,
              actorName: prev.settings.ceoName,
              departmentId: target?.departmentId ?? 'nexus_core',
              action: decision === 'approved' ? 'Aprovação concedida' : 'Solicitação recusada',
              detail: target?.title ?? approvalId,
              isDemoData: true,
            },
            ...prev.activityLogs,
          ],
        };
      });
    },
    []
  );

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
              {activeSection === 'hq' ? 'Sede 3D · NEXUS EMPIRE' : 'NEXUS EMPIRE'}
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
                <span>Ativos: <strong className="font-mono text-emerald-400">{metrics.activeEmployeesCount}/12</strong></span>
                <span aria-hidden="true">·</span>
                <span>Tarefas: <strong className="font-mono text-cyan-300">{metrics.tasksInProgress + metrics.tasksPending}</strong></span>
                <span aria-hidden="true">·</span>
                <span>Histórico: <strong className="font-mono text-blue-300">{metrics.historicalRecordsCount}</strong></span>
              </div>

              {/* Unified Collapsible Bottom Dock (Zero Viewport Occlusion) */}
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

                    {/* Toggle Bubbles & Quick Conversation Demo */}
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
                        {joaoConversingWithMaria
                          ? 'Voltar ao PC'
                          : 'João & Maria'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : activeSection === 'dashboard' ? (
            <DashboardView
              state={state}
              geminiConfigured={geminiConfigured}
              onSelectEmployee={(id) => setSelectedEmployeeId(id)}
              onOpenCoreComputer={() => setCoreComputerOpen(true)}
              onOpenNexusCore={() => setNexusCoreOpen(true)}
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
                      id: `idr_${Date.now()}`,
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
                    { ...p, id: `prod_${Date.now()}`, marginPercent },
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
              tasks={state.tasks}
              employees={state.employees}
              initialBoardFloor={taskBoardInitialFloor}
              onCreateTask={handleCreateTask}
              onTransitionStatus={handleTransitionTaskStatus}
              onOpenCoreComputer={() => setCoreComputerOpen(true)}
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
              settings={state.settings}
              geminiConfigured={geminiConfigured}
              onUpdateSettings={(patch: Partial<CompanySettings>) =>
                setState((prev) => ({
                  ...prev,
                  settings: { ...prev.settings, ...patch },
                }))
              }
              onResetDemoData={() => {
                resetLocalNexusState();
                setState(INITIAL_NEXUS_STATE);
              }}
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
