import React, { useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  ClipboardList,
  Cpu,
  ExternalLink,
  Link2,
  Plus,
  Sparkles,
  XCircle,
} from 'lucide-react';
import {
  canExecuteTask,
  getDefaultChannelsForEmployee,
} from '../../core/simulationRules';
import type {
  ApprovalItem,
  ChannelConnection,
  ChannelId,
  DepartmentId,
  EmployeeProfile,
  FloorNumber,
  NexusState,
  TaskItem,
  TaskPriority,
  TaskStatus,
} from '../../types/nexus';

interface TasksViewProps {
  state: NexusState;
  initialBoardFloor?: FloorNumber;
  executingTaskId: string | null;
  executionError: string | null;
  onCreateTask: (input: {
    title: string;
    description: string;
    assigneeId: string;
    departmentId: DepartmentId;
    priority: TaskPriority;
    dueDate: string;
    isFinancialOrIrreversible: boolean;
    requiredChannelIds: ChannelId[];
  }) => void;
  onResolveApproval: (
    approvalId: string,
    stageActor: 'supervisor' | 'ceo',
    decision: 'approved' | 'rejected'
  ) => void;
  onSupervisorAIReview: (approval: ApprovalItem) => void;
  onExecuteTaskReal: (task: TaskItem) => void;
  onTransitionStatus: (
    taskId: string,
    status: TaskStatus,
    resultSummary?: string
  ) => void;
  onOpenCoreComputer: () => void;
  onGoToSettings: () => void;
}

function safeHref(uri: string): string | null {
  try {
    const u = new URL(uri);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

export const TasksView: React.FC<TasksViewProps> = ({
  state,
  initialBoardFloor = 1,
  executingTaskId,
  executionError,
  onCreateTask,
  onResolveApproval,
  onSupervisorAIReview,
  onExecuteTaskReal,
  onTransitionStatus,
  onOpenCoreComputer,
  onGoToSettings,
}) => {
  const { tasks, employees, approvals, channels, tokenPolicy } = state;

  const [boardFloor, setBoardFloor] = useState<FloorNumber>(initialBoardFloor);
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState(employees[1]?.id ?? 'emp_02');
  const [priority, setPriority] = useState<TaskPriority>('alta');
  const [isFinancial, setIsFinancial] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<ChannelId[]>(() =>
    getDefaultChannelsForEmployee(employees[1]?.id ?? 'emp_02')
  );

  const selectedEmployee = employees.find((e) => e.id === assigneeId);

  const handleAssigneeChange = (newId: string) => {
    setAssigneeId(newId);
    setSelectedChannels(getDefaultChannelsForEmployee(newId));
  };

  const toggleChannel = (id: ChannelId) => {
    setSelectedChannels((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedEmployee) return;
    onCreateTask({
      title: title.trim(),
      description: description.trim(),
      assigneeId: selectedEmployee.id,
      departmentId: selectedEmployee.departmentId,
      priority,
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
      isFinancialOrIrreversible: isFinancial,
      requiredChannelIds:
        selectedChannels.length > 0
          ? selectedChannels
          : getDefaultChannelsForEmployee(selectedEmployee.id),
    });
    setTitle('');
    setDescription('');
    setIsFinancial(false);
  };

  const boardDeptId: DepartmentId =
    boardFloor === 1 ? 'dept_products' : 'dept_marketing';
  const boardTasks = tasks.filter((t) => t.departmentId === boardDeptId);
  const boardManager = employees.find(
    (e) => e.departmentId === boardDeptId && e.isFloorManager
  );

  const filteredTasks = tasks.filter(
    (t) => statusFilter === 'all' || t.status === statusFilter
  );

  const selectableChannels: ChannelConnection[] = channels.filter(
    (c) => c.id !== 'ch_supabase'
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-50 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-emerald-400" />
            <span>Central de Tarefas Reais &amp; Permissões</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Fluxo obrigatório: 1) Permissão do Superior &amp; CEO → 2) Canais Oficiais Conectados → 3) Execução Real com IA &amp; Tokens.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs px-3 py-2 rounded-lg border border-slate-800 bg-[#0F141C] text-cyan-300">
            Tokens: {tokenPolicy.usedTotal.toLocaleString('pt-BR')} / {tokenPolicy.dailyLimit.toLocaleString('pt-BR')}
          </span>
          <button
            type="button"
            onClick={onOpenCoreComputer}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-blue-500/60 bg-[#101422] hover:border-red-400 text-xs font-semibold text-slate-100 cursor-pointer shrink-0"
          >
            <BookOpen className="w-4 h-4 text-blue-400" />
            <span>Livro Histórico (PC Azul &amp; Vermelho)</span>
          </button>
        </div>
      </div>

      {/* Visual Floor Kanban Board */}
      <div className="rounded-xl border border-slate-800 bg-[#0F141C] p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-slate-100">
              Quadro Visual de Tarefas — {boardFloor}º Andar
            </h2>
            <p className="text-xs text-slate-400">
              Superior do andar: <strong className="text-slate-200">{boardManager?.name}</strong> ({boardManager?.role})
            </p>
          </div>
          <div className="inline-flex rounded-lg bg-[#0A0E14] border border-slate-800 p-1">
            <button
              type="button"
              onClick={() => setBoardFloor(1)}
              className={`px-3 py-1.5 rounded text-xs font-medium cursor-pointer ${
                boardFloor === 1
                  ? 'bg-emerald-500 text-slate-950 font-semibold'
                  : 'text-slate-300'
              }`}
            >
              1º Andar (Produtos)
            </button>
            <button
              type="button"
              onClick={() => setBoardFloor(2)}
              className={`px-3 py-1.5 rounded text-xs font-medium cursor-pointer ${
                boardFloor === 2
                  ? 'bg-violet-500 text-white font-semibold'
                  : 'text-slate-300'
              }`}
            >
              2º Andar (Marketing)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(
            [
              {
                label: 'Aguardando Permissão / Canais',
                items: boardTasks.filter(
                  (t) =>
                    t.status === 'aguardando' ||
                    t.status === 'planejada' ||
                    t.status === 'aguardando_aprovacao'
                ),
              },
              {
                label: 'Em Execução Real',
                items: boardTasks.filter((t) => t.status === 'em_execucao'),
              },
              {
                label: 'Concluídas (No PC Azul & Vermelho)',
                items: boardTasks.filter((t) => t.status === 'concluida'),
              },
            ] as const
          ).map((col) => (
            <div
              key={col.label}
              className="rounded-lg border border-slate-800 bg-[#0A0E14] p-3 space-y-2"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300 pb-1.5 border-b border-slate-800">
                <span>{col.label}</span>
                <span className="font-mono text-slate-400">{col.items.length}</span>
              </div>
              {col.items.length === 0 ? (
                <p className="text-[11px] text-slate-500 py-3">
                  Nenhuma tarefa real nesta coluna.
                </p>
              ) : (
                col.items.map((t) => (
                  <div
                    key={t.id}
                    className="rounded border border-slate-800 bg-[#111722] p-2.5 text-xs space-y-1"
                  >
                    <p className="font-semibold text-slate-100">{t.title}</p>
                    <p className="text-[11px] text-slate-400">
                      {employees.find((e) => e.id === t.assigneeId)?.name} · {t.permissionStatus}
                    </p>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Create Task Form + Complete List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-slate-800 bg-[#10151D] p-5 space-y-3 h-fit"
        >
          <h2 className="font-display text-sm font-bold text-slate-100 flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Determinar Nova Tarefa Real</span>
          </h2>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Título</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Pesquisar fornecedores de embalagens no Brasil"
              className="w-full rounded-lg bg-[#0A0E14] border border-slate-700 px-3 py-2 text-xs text-slate-100"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Descrição</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Critérios reais e resultado esperado..."
              className="w-full rounded-lg bg-[#0A0E14] border border-slate-700 px-3 py-2 text-xs text-slate-100"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Especialista Responsável</label>
            <select
              value={assigneeId}
              onChange={(e) => handleAssigneeChange(e.target.value)}
              className="w-full rounded-lg bg-[#0A0E14] border border-slate-700 px-3 py-2 text-xs text-slate-100"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} — {e.role} ({e.floor}ºA)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Prioridade</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full rounded-lg bg-[#0A0E14] border border-slate-700 px-3 py-2 text-xs text-slate-100"
            >
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
              <option value="critica">Crítica</option>
            </select>
          </div>

          <div className="space-y-1.5 pt-1">
            <span className="text-xs text-slate-400 block">
              Canais Oficiais Necessários
            </span>
            {selectableChannels.map((ch) => (
              <label
                key={ch.id}
                className="flex items-center justify-between gap-2 text-xs text-slate-300 cursor-pointer rounded bg-[#0A0E14] border border-slate-800 px-2.5 py-1.5"
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedChannels.includes(ch.id)}
                    onChange={() => toggleChannel(ch.id)}
                  />
                  <span>{ch.name}</span>
                </span>
                <span
                  className={`font-mono text-[10px] ${
                    ch.status === 'connected' ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {ch.status === 'connected' ? 'CONECTADO' : 'OFF'}
                </span>
              </label>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isFinancial}
              onChange={(e) => setIsFinancial(e.target.checked)}
              className="rounded border-slate-600"
            />
            <span>Envolve verba financeira ou publicação externa</span>
          </label>
          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs cursor-pointer"
          >
            Determinar e Solicitar Permissão
          </button>
        </form>

        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-[#10151D] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-sm font-bold text-slate-100">
              Tarefas Reais ({filteredTasks.length})
            </h2>
            <select
              aria-label="Filtrar tarefas por estado"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | TaskStatus)}
              className="rounded-lg bg-[#0A0E14] border border-slate-700 px-3 py-1.5 text-xs text-slate-200"
            >
              <option value="all">Todos os estados</option>
              <option value="aguardando_aprovacao">Aguardando permissão</option>
              <option value="planejada">Autorizada (pronta)</option>
              <option value="em_execucao">Em execução</option>
              <option value="concluida">Concluída</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>

          {executionError && (
            <div className="rounded-lg border border-red-500/40 bg-red-950/30 p-3 text-xs text-red-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{executionError}</span>
            </div>
          )}

          {filteredTasks.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-[#0B0F14] p-8 text-center text-xs text-slate-400 space-y-2">
              <p className="font-semibold text-slate-200">
                Nenhuma tarefa fictícia — ambiente limpo para dados reais.
              </p>
              <p>
                Determine uma nova tarefa ao lado ou pelo NEXUS CORE. O especialista pedirá permissão ao superior antes de usar canais conectados e tokens de IA.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const assignee = employees.find((e) => e.id === task.assigneeId);
                const supervisor = employees.find((e) => e.id === task.supervisorId);
                const relatedApr = approvals.find(
                  (a) => a.relatedTaskId === task.id && a.status === 'pending'
                );
                const gate = canExecuteTask(state, task);
                const isRunning = executingTaskId === task.id;

                return (
                  <div
                    key={task.id}
                    className="rounded-lg border border-slate-800 bg-[#0B0F14] p-4 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-slate-100">
                            {task.title}
                          </h3>
                          <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
                            {task.status}
                          </span>
                          <span
                            className={`font-mono text-[11px] px-2 py-0.5 rounded ${
                              task.permissionStatus === 'approved'
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : task.permissionStatus === 'rejected'
                                ? 'bg-red-500/15 text-red-300'
                                : 'bg-amber-500/15 text-amber-300'
                            }`}
                          >
                            {task.permissionStatus === 'pending_supervisor'
                              ? `Pedindo a ${supervisor?.name ?? 'Superior'}`
                              : task.permissionStatus === 'pending_ceo'
                              ? 'Aguardando CEO'
                              : task.permissionStatus === 'approved'
                              ? 'Permissão Aprovada'
                              : 'Recusada'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{task.description}</p>
                        <p className="text-[11px] text-slate-500">
                          Executor: {assignee?.name} · Prioridade: {task.priority} · Prazo: {task.dueDate}
                          {typeof task.tokensUsed === 'number' && task.tokensUsed > 0
                            ? ` · Tokens gastos: ${task.tokensUsed}`
                            : ''}
                        </p>
                      </div>

                      {task.status !== 'cancelada' && task.status !== 'concluida' && (
                        <button
                          type="button"
                          onClick={() => onTransitionStatus(task.id, 'cancelada')}
                          aria-label={`Cancelar ${task.title}`}
                          className="p-1.5 rounded bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-300 cursor-pointer self-start"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Required Official Channels Status */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="text-slate-400">Canais exigidos:</span>
                      {task.requiredChannelIds.map((chId) => {
                        const ch = channels.find((c) => c.id === chId);
                        const ok = ch?.status === 'connected';
                        return (
                          <span
                            key={chId}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${
                              ok
                                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                                : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                            }`}
                          >
                            <Link2 className="w-3 h-3" />
                            <span>
                              {ch?.name ?? chId}: {ok ? 'Conectado' : 'Desconectado'}
                            </span>
                          </span>
                        );
                      })}
                    </div>

                    {task.supervisorNote && (
                      <p className="text-xs text-emerald-300 bg-emerald-950/25 border border-emerald-500/30 rounded px-3 py-2">
                        Parecer do Superior ({supervisor?.name}): {task.supervisorNote}
                      </p>
                    )}

                    {/* Permission & Real Execution Controls */}
                    {task.status !== 'concluida' && task.status !== 'cancelada' && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {relatedApr && relatedApr.stage === 'supervisor' && (
                          <>
                            <button
                              type="button"
                              onClick={() => onSupervisorAIReview(relatedApr)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-violet-500/20 border border-violet-500/40 hover:bg-violet-500/30 text-violet-200 text-xs font-medium cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>1. Parecer IA ({supervisor?.name.split(' ')[0]})</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onResolveApproval(relatedApr.id, 'supervisor', 'approved')
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 text-emerald-300 text-xs font-medium cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>1. Aprovar como Superior</span>
                            </button>
                          </>
                        )}

                        {relatedApr && relatedApr.stage === 'ceo' && (
                          <button
                            type="button"
                            onClick={() =>
                              onResolveApproval(relatedApr.id, 'ceo', 'approved')
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>2. Conceder Permissão Final (CEO)</span>
                          </button>
                        )}

                        {task.permissionStatus === 'approved' && (
                          <>
                            <button
                              type="button"
                              disabled={!gate.allowed || isRunning}
                              onClick={() => onExecuteTaskReal(task)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 disabled:opacity-45 text-slate-950 font-semibold text-xs cursor-pointer"
                            >
                              <Cpu className="w-3.5 h-3.5" />
                              <span>
                                {isRunning
                                  ? 'Executando com IA & Canais...'
                                  : 'Executar Tarefa (IA Real)'}
                              </span>
                            </button>

                            {!gate.allowed && gate.missingChannels.length > 0 && (
                              <button
                                type="button"
                                onClick={onGoToSettings}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-amber-500/50 bg-amber-950/30 hover:border-amber-400 text-amber-200 text-xs font-medium cursor-pointer"
                              >
                                <Link2 className="w-3.5 h-3.5" />
                                <span>Conectar Canais Oficiais</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* Real Execution Output & Verified Google Search Sources */}
                    {task.result && (
                      <div className="rounded-lg border border-cyan-500/30 bg-[#0F1724] p-3.5 space-y-2">
                        <p className="text-[11px] font-semibold text-cyan-300">
                          Entrega Real Executada
                        </p>
                        <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {task.result}
                        </p>
                        {task.groundingSources && task.groundingSources.length > 0 && (
                          <div className="pt-2 border-t border-slate-800 space-y-1">
                            <p className="text-[11px] font-semibold text-emerald-300">
                              Fontes Reais da Pesquisa Google:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {task.groundingSources.map((src, i) => {
                                const validHref = safeHref(src.uri);
                                if (!validHref) return null;
                                return (
                                  <a
                                    key={i}
                                    href={validHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] text-cyan-300 hover:underline bg-[#090D14] border border-slate-800 px-2 py-1 rounded"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span className="truncate max-w-[220px]">
                                      {src.title}
                                    </span>
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
