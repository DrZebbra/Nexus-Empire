import React, { useState } from 'react';
import { BookOpen, CheckCircle2, ClipboardList, Plus, Play, XCircle } from 'lucide-react';
import type {
  DepartmentId,
  EmployeeProfile,
  FloorNumber,
  TaskItem,
  TaskPriority,
  TaskStatus,
} from '../../types/nexus';

interface TasksViewProps {
  tasks: TaskItem[];
  employees: EmployeeProfile[];
  initialBoardFloor?: FloorNumber;
  onCreateTask: (input: {
    title: string;
    description: string;
    assigneeId: string;
    departmentId: DepartmentId;
    priority: TaskPriority;
    dueDate: string;
    isFinancialOrIrreversible: boolean;
  }) => void;
  onTransitionStatus: (
    taskId: string,
    status: TaskStatus,
    resultSummary?: string
  ) => void;
  onOpenCoreComputer: () => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  employees,
  initialBoardFloor = 1,
  onCreateTask,
  onTransitionStatus,
  onOpenCoreComputer,
}) => {
  const [boardFloor, setBoardFloor] = useState<FloorNumber>(initialBoardFloor);
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState(employees[1]?.id ?? 'emp_02');
  const [priority, setPriority] = useState<TaskPriority>('alta');
  const [isFinancial, setIsFinancial] = useState(false);

  const selectedEmployee = employees.find((e) => e.id === assigneeId);

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

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-50 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-emerald-400" />
            <span>Central de Tarefas &amp; Quadro Visual</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Ao criar ou concluir tarefas, o gerente do andar atualiza o Quadro Visual e registra no Computador Azul &amp; Vermelho.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenCoreComputer}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-blue-500/60 bg-[#101422] hover:border-red-400 text-xs font-semibold text-slate-100 cursor-pointer shrink-0"
        >
          <BookOpen className="w-4 h-4 text-blue-400" />
          <span>Livro Histórico (PC Azul &amp; Vermelho)</span>
        </button>
      </div>

      {/* Visual Floor Kanban Board mirroring the 3D Wall Boards */}
      <div className="rounded-xl border border-slate-800 bg-[#0F141C] p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-slate-100">
              Quadro Visual de Tarefas — {boardFloor}º Andar
            </h2>
            <p className="text-xs text-slate-400">
              Gerente responsável: <strong className="text-slate-200">{boardManager?.name}</strong> ({boardManager?.role})
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
                label: 'Para Fazer (Anotadas)',
                items: boardTasks.filter(
                  (t) =>
                    t.status === 'aguardando' ||
                    t.status === 'planejada' ||
                    t.status === 'aguardando_aprovacao'
                ),
              },
              {
                label: 'Em Execução',
                items: boardTasks.filter((t) => t.status === 'em_execucao'),
              },
              {
                label: 'Completadas (No PC Azul & Vermelho)',
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
                <p className="text-[11px] text-slate-500 py-3">Sem itens nesta coluna.</p>
              ) : (
                col.items.map((t) => (
                  <div
                    key={t.id}
                    className="rounded border border-slate-800 bg-[#111722] p-2.5 text-xs space-y-1"
                  >
                    <p className="font-semibold text-slate-100">{t.title}</p>
                    <p className="text-[11px] text-slate-400">
                      {employees.find((e) => e.id === t.assigneeId)?.name} · {t.priority}
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
            <span>Nova Tarefa Corporativa</span>
          </h2>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Título</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Pesquisar fornecedor de embalagens"
              className="w-full rounded-lg bg-[#0A0E14] border border-slate-700 px-3 py-2 text-xs text-slate-100"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Descrição</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes e critérios de entrega..."
              className="w-full rounded-lg bg-[#0A0E14] border border-slate-700 px-3 py-2 text-xs text-slate-100"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Responsável</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
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
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isFinancial}
              onChange={(e) => setIsFinancial(e.target.checked)}
              className="rounded border-slate-600"
            />
            <span>Envolve verba financeira ou publicação externa (requer aprovação)</span>
          </label>
          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs cursor-pointer"
          >
            Criar e Registrar no Quadro
          </button>
        </form>

        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-[#10151D] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-sm font-bold text-slate-100">
              Todas as Tarefas ({filteredTasks.length})
            </h2>
            <select
              aria-label="Filtrar tarefas por estado"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | TaskStatus)}
              className="rounded-lg bg-[#0A0E14] border border-slate-700 px-3 py-1.5 text-xs text-slate-200"
            >
              <option value="all">Todos os estados</option>
              <option value="aguardando">Aguardando</option>
              <option value="planejada">Planejada</option>
              <option value="em_execucao">Em execução</option>
              <option value="aguardando_aprovacao">Aguardando aprovação</option>
              <option value="concluida">Concluída</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>

          <div className="space-y-3">
            {filteredTasks.map((task) => {
              const assignee = employees.find((e) => e.id === task.assigneeId);
              return (
                <div
                  key={task.id}
                  className="rounded-lg border border-slate-800 bg-[#0B0F14] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-slate-100">
                        {task.title}
                      </h3>
                      <span className="font-mono text-[11px] text-cyan-300">
                        {task.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{task.description}</p>
                    <p className="text-[11px] text-slate-500">
                      Responsável: {assignee?.name} · Prioridade: {task.priority} · Prazo: {task.dueDate}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {task.status !== 'em_execucao' && task.status !== 'concluida' && (
                      <button
                        type="button"
                        onClick={() => onTransitionStatus(task.id, 'em_execucao')}
                        className="px-2.5 py-1.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-xs font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="w-3 h-3" />
                        <span>Executar</span>
                      </button>
                    )}
                    {task.status !== 'concluida' && (
                      <button
                        type="button"
                        onClick={() =>
                          onTransitionStatus(
                            task.id,
                            'concluida',
                            'Concluída e arquivada no Computador Azul & Vermelho.'
                          )
                        }
                        className="px-2.5 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Concluir</span>
                      </button>
                    )}
                    {task.status !== 'cancelada' && task.status !== 'concluida' && (
                      <button
                        type="button"
                        onClick={() => onTransitionStatus(task.id, 'cancelada')}
                        aria-label={`Cancelar ${task.title}`}
                        className="p-1.5 rounded bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-300 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
