import React, { useState } from 'react';
import { MessageCircle, Monitor, Users } from 'lucide-react';
import { formatEmployeeBubbleText } from '../../core/simulationRules';
import type { AutonomyLevel, EmployeeProfile, FloorNumber } from '../../types/nexus';

interface EmployeesViewProps {
  employees: EmployeeProfile[];
  onSelectEmployee: (id: string) => void;
  onChangeAutonomy: (id: string, level: AutonomyLevel) => void;
  onStartConversation: (empA: string, empB: string | null) => void;
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({
  employees,
  onSelectEmployee,
  onChangeAutonomy,
  onStartConversation,
}) => {
  const [floorFilter, setFloorFilter] = useState<'all' | FloorNumber>('all');

  const filtered = employees.filter(
    (e) => floorFilter === 'all' || e.floor === floorFilter
  );

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-50 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-400" />
            <span>12 Funcionários Inteligentes</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Identidade visual 3D automática e imutável. Controle autonomia, conversas e delegação.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-[#10151D] border border-slate-800 p-1">
            {(['all', 1, 2] as const).map((f) => (
              <button
                key={String(f)}
                type="button"
                onClick={() => setFloorFilter(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer ${
                  floorFilter === f
                    ? 'bg-emerald-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {f === 'all' ? 'Todos (12)' : `${f}º Andar (6)`}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onStartConversation('emp_01', 'emp_02')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-200 hover:bg-violet-500/30 text-xs font-medium cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>João &amp; Maria Conversar</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((emp) => {
          const bubbleText = formatEmployeeBubbleText(emp, employees);
          const isConversing = emp.animationState === 'conversing';

          return (
            <div
              key={emp.id}
              className="rounded-xl border border-slate-800 bg-[#10151D] p-4 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-display font-bold text-sm text-slate-950 shrink-0"
                      style={{ backgroundColor: emp.appearance.accentColor }}
                    >
                      {emp.name
                        .split(' ')
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-bold text-slate-100 truncate">
                        {emp.name}
                      </h2>
                      <p className="text-xs text-slate-400 truncate">
                        {emp.role} · {emp.floor}º Andar
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-emerald-400 tabular-nums shrink-0">
                    {emp.productivity}%
                  </span>
                </div>

                <p className="text-xs text-slate-300 mt-3">{emp.specialty}</p>
                <p className="text-[11px] text-cyan-300 mt-1.5">
                  Atividade atual: {bubbleText}
                </p>
                <p className="text-[11px] text-slate-500 mt-1 font-mono">
                  Modelo 3D: {emp.appearance.immutableId} (Imutável)
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <select
                  aria-label={`Autonomia de ${emp.name}`}
                  value={emp.autonomyLevel}
                  onChange={(e) =>
                    onChangeAutonomy(emp.id, Number(e.target.value) as AutonomyLevel)
                  }
                  className="rounded bg-[#0A0E14] border border-slate-700 px-2 py-1.5 text-xs text-slate-200"
                >
                  <option value={1}>Nível 1 · Assistido</option>
                  <option value={2}>Nível 2 · Semiautônomo</option>
                  <option value={3}>Nível 3 · Autônomo</option>
                </select>

                <div className="flex items-center gap-1.5">
                  {isConversing && (
                    <button
                      type="button"
                      onClick={() => onStartConversation(emp.id, null)}
                      title="Retornar ao computador"
                      className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1 cursor-pointer"
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      <span>PC</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onSelectEmployee(emp.id)}
                    className="px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs cursor-pointer"
                  >
                    Abrir Ficha
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
