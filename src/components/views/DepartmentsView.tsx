import React, { useState } from 'react';
import { ArrowRightLeft, Building2, Check, Send, X } from 'lucide-react';
import type {
  Department,
  DepartmentId,
  EmployeeProfile,
  InterDepartmentRequest,
  TaskItem,
} from '../../types/nexus';

interface DepartmentsViewProps {
  departments: Department[];
  employees: EmployeeProfile[];
  tasks: TaskItem[];
  requests: InterDepartmentRequest[];
  onCreateRequest: (req: {
    fromDepartmentId: DepartmentId;
    toDepartmentId: DepartmentId;
    title: string;
    details: string;
  }) => void;
  onUpdateRequestStatus: (
    requestId: string,
    status: InterDepartmentRequest['status']
  ) => void;
  onFocusFloorIn3D: (floor: 1 | 2) => void;
}

export const DepartmentsView: React.FC<DepartmentsViewProps> = ({
  departments,
  employees,
  tasks,
  requests,
  onCreateRequest,
  onUpdateRequestStatus,
  onFocusFloorIn3D,
}) => {
  const [fromDept, setFromDept] = useState<DepartmentId>('dept_products');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreateRequest({
      fromDepartmentId: fromDept,
      toDepartmentId:
        fromDept === 'dept_products' ? 'dept_marketing' : 'dept_products',
      title: title.trim(),
      details:
        details.trim() ||
        'Solicitação interdepartamental coordenada via NEXUS CORE.',
    });
    setTitle('');
    setDetails('');
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="pb-4 border-b border-slate-800">
        <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-50 flex items-center gap-2">
          <Building2 className="w-6 h-6 text-cyan-400" />
          <span>Departamentos &amp; Comunicação Interna</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Dois andares independentes e integrados via solicitações coordenadas pelo NEXUS CORE.
        </p>
      </div>

      {/* Department Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {departments.map((dept) => {
          const deptEmps = employees.filter((e) => e.departmentId === dept.id);
          const manager = deptEmps.find((e) => e.isFloorManager);
          const deptTasks = tasks.filter((t) => t.departmentId === dept.id);
          const isProducts = dept.id === 'dept_products';

          return (
            <div
              key={dept.id}
              className="rounded-xl border border-slate-800 bg-[#10151D] p-5 space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span
                    className={`text-xs font-semibold ${
                      isProducts ? 'text-emerald-400' : 'text-violet-400'
                    }`}
                  >
                    {dept.floor}º Andar
                  </span>
                  <h2 className="font-display text-lg font-bold text-slate-100 mt-0.5">
                    {dept.name}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => onFocusFloorIn3D(dept.floor)}
                  className="px-3 py-1.5 rounded-lg bg-[#0A0E14] border border-slate-700 hover:border-cyan-400 text-xs font-medium text-slate-200 cursor-pointer"
                >
                  Ver Andar em 3D
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {dept.description}
              </p>

              <div className="grid grid-cols-3 gap-2.5 text-xs">
                <div className="rounded-lg bg-[#0A0E14] border border-slate-800 p-2.5">
                  <span className="text-slate-400 block">Gerente Geral</span>
                  <span className="font-semibold text-slate-100 truncate block mt-0.5">
                    {manager?.name ?? '—'}
                  </span>
                </div>
                <div className="rounded-lg bg-[#0A0E14] border border-slate-800 p-2.5">
                  <span className="text-slate-400 block">Especialistas</span>
                  <span className="font-mono font-bold text-slate-100 block mt-0.5">
                    {deptEmps.length}
                  </span>
                </div>
                <div className="rounded-lg bg-[#0A0E14] border border-slate-800 p-2.5">
                  <span className="text-slate-400 block">Tarefas no Quadro</span>
                  <span className="font-mono font-bold text-slate-100 block mt-0.5">
                    {deptTasks.length}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Ambientes do Andar
                </span>
                <p className="text-xs text-slate-400">
                  {dept.zones.join(' · ')}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Inter-Department Request Form & Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-800 bg-[#10151D] p-5 space-y-3"
        >
          <h2 className="font-display text-sm font-bold text-slate-100 flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
            <span>Nova Solicitação Entre Departamentos</span>
          </h2>
          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Departamento Solicitante
            </label>
            <select
              value={fromDept}
              onChange={(e) => setFromDept(e.target.value as DepartmentId)}
              className="w-full rounded-lg bg-[#0A0E14] border border-slate-700 px-3 py-2 text-xs text-slate-100"
            >
              <option value="dept_products">
                1º Andar (Produtos) → solicita ao 2º Andar (Marketing)
              </option>
              <option value="dept_marketing">
                2º Andar (Marketing) → solicita ao 1º Andar (Produtos)
              </option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Assunto da Demanda
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Enviar kit de imagens e margem do Produto X"
              className="w-full rounded-lg bg-[#0A0E14] border border-slate-700 px-3 py-2 text-xs text-slate-100"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Detalhes Técnicos
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Descreva os entregáveis esperados..."
              className="w-full rounded-lg bg-[#0A0E14] border border-slate-700 px-3 py-2 text-xs text-slate-100"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Enviar via NEXUS CORE</span>
          </button>
        </form>

        <div className="rounded-xl border border-slate-800 bg-[#10151D] p-5 space-y-3">
          <h2 className="font-display text-sm font-bold text-slate-100">
            Histórico de Solicitações Internas ({requests.length})
          </h2>
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {requests.map((req) => (
              <div
                key={req.id}
                className="rounded-lg border border-slate-800 bg-[#0B0F14] p-3 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-100">{req.title}</span>
                  <span className="font-mono text-[11px] text-cyan-300">
                    {req.status}
                  </span>
                </div>
                <p className="text-slate-400">{req.details}</p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500">
                    {req.fromDepartmentId === 'dept_products' ? '1º → 2º Andar' : '2º → 1º Andar'}
                  </span>
                  {req.status === 'pendente' && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onUpdateRequestStatus(req.id, 'aprovada')}
                        className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        <span>Aprovar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateRequestStatus(req.id, 'rejeitada')}
                        className="px-2 py-1 rounded bg-red-500/20 text-red-300 hover:bg-red-500/30 flex items-center gap-1 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                        <span>Recusar</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
