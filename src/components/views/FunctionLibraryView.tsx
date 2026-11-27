import React, { useState } from 'react';
import { Cpu, Layers, Plus, Power, Wrench } from 'lucide-react';
import type {
  AutonomyLevel,
  DepartmentId,
  EmployeeProfile,
  LibraryFunction,
  SkillDefinition,
  ToolDefinition,
} from '../../types/nexus';

interface FunctionLibraryViewProps {
  functions: LibraryFunction[];
  skills: SkillDefinition[];
  tools: ToolDefinition[];
  employees: EmployeeProfile[];
  onRegisterFunction: (payload: {
    name: string;
    description: string;
    category: string;
    departmentId: DepartmentId;
    responsibleEmployeeId: string;
    requiredSkillIds: string[];
    requiredToolIds: string[];
    minAutonomyLevel: AutonomyLevel;
  }) => void;
  onToggleFunction: (fnId: string) => void;
}

export const FunctionLibraryView: React.FC<FunctionLibraryViewProps> = ({
  functions,
  skills,
  tools,
  employees,
  onRegisterFunction,
  onToggleFunction,
}) => {
  const [tierView, setTierView] = useState<'actions' | 'skills' | 'tools'>('actions');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Marketing Digital');
  const [departmentId, setDepartmentId] = useState<DepartmentId>('dept_marketing');
  const [responsibleId, setResponsibleId] = useState('emp_08');
  const [minAutonomy, setMinAutonomy] = useState<AutonomyLevel>(2);
  const [builderError, setBuilderError] = useState<string | null>(null);

  const categories = Array.from(new Set(functions.map((f) => f.category)));
  const filteredFunctions = functions.filter(
    (f) => categoryFilter === 'all' || f.category === categoryFilter
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setBuilderError(null);
    try {
      const deptSkills = skills
        .filter((s) => s.departmentId === departmentId)
        .slice(0, 1)
        .map((s) => s.id);
      const defaultTool = tools[0]?.id ? [tools[0].id] : [];

      onRegisterFunction({
        name,
        description,
        category,
        departmentId,
        responsibleEmployeeId: responsibleId,
        requiredSkillIds: deptSkills,
        requiredToolIds: defaultTool,
        minAutonomyLevel: minAutonomy,
      });
      setName('');
      setDescription('');
    } catch (err) {
      setBuilderError(
        err instanceof Error ? err.message : 'Falha ao cadastrar função.'
      );
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-50 flex items-center gap-2">
            <Cpu className="w-6 h-6 text-cyan-400" />
            <span>Biblioteca Modular de Funções</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Arquitetura em 3 níveis (Competências → Ferramentas → Ações) preparada para expansão progressiva. Execução arbitrária de código bloqueada.
          </p>
        </div>

        <div className="inline-flex rounded-lg bg-[#10151D] border border-slate-800 p-1">
          <button
            type="button"
            onClick={() => setTierView('actions')}
            className={`px-3 py-1.5 rounded text-xs font-medium cursor-pointer ${
              tierView === 'actions'
                ? 'bg-emerald-500 text-slate-950 font-semibold'
                : 'text-slate-300'
            }`}
          >
            Ações ({functions.length})
          </button>
          <button
            type="button"
            onClick={() => setTierView('skills')}
            className={`px-3 py-1.5 rounded text-xs font-medium cursor-pointer ${
              tierView === 'skills'
                ? 'bg-emerald-500 text-slate-950 font-semibold'
                : 'text-slate-300'
            }`}
          >
            Competências ({skills.length})
          </button>
          <button
            type="button"
            onClick={() => setTierView('tools')}
            className={`px-3 py-1.5 rounded text-xs font-medium cursor-pointer ${
              tierView === 'tools'
                ? 'bg-emerald-500 text-slate-950 font-semibold'
                : 'text-slate-300'
            }`}
          >
            Ferramentas ({tools.length})
          </button>
        </div>
      </div>

      {tierView === 'actions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Administrative Function Builder */}
          <form
            onSubmit={handleCreate}
            className="rounded-xl border border-slate-800 bg-[#10151D] p-5 space-y-3 h-fit"
          >
            <h2 className="font-display text-sm font-bold text-slate-100 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Construtor Administrativo</span>
            </h2>
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Nome da Função
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Comparar Anúncios A/B"
                className="w-full rounded-lg bg-[#0A0E14] border border-slate-700 px-3 py-2 text-xs text-slate-100"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Descrição Operacional
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o objetivo estruturado da ação..."
                className="w-full rounded-lg bg-[#0A0E14] border border-slate-700 px-3 py-2 text-xs text-slate-100"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Categoria
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg bg-[#0A0E14] border border-slate-700 px-3 py-2 text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Departamento
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value as DepartmentId)}
                  className="w-full rounded-lg bg-[#0A0E14] border border-slate-700 px-2.5 py-2 text-xs text-slate-100"
                >
                  <option value="dept_products">1º Andar · Produtos</option>
                  <option value="dept_marketing">2º Andar · Marketing</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Responsável
                </label>
                <select
                  value={responsibleId}
                  onChange={(e) => setResponsibleId(e.target.value)}
                  className="w-full rounded-lg bg-[#0A0E14] border border-slate-700 px-2.5 py-2 text-xs text-slate-100"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Autonomia Mínima
                </label>
                <select
                  value={minAutonomy}
                  onChange={(e) =>
                    setMinAutonomy(Number(e.target.value) as AutonomyLevel)
                  }
                  className="w-full rounded-lg bg-[#0A0E14] border border-slate-700 px-2.5 py-2 text-xs text-slate-100"
                >
                  <option value={1}>Nível 1</option>
                  <option value={2}>Nível 2</option>
                  <option value={3}>Nível 3</option>
                </select>
              </div>
            </div>
            {builderError && (
              <p className="text-xs text-red-400">{builderError}</p>
            )}
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs cursor-pointer"
            >
              Cadastrar Função
            </button>
          </form>

          {/* Functions Catalog */}
          <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-[#10151D] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-sm font-bold text-slate-100">
                Ações Registradas ({filteredFunctions.length})
              </h2>
              <select
                aria-label="Filtrar por categoria"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg bg-[#0A0E14] border border-slate-700 px-3 py-1.5 text-xs text-slate-200"
              >
                <option value="all">Todas as categorias</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              {filteredFunctions.map((fn) => {
                const owner = employees.find(
                  (e) => e.id === fn.responsibleEmployeeId
                );
                return (
                  <div
                    key={fn.id}
                    className="rounded-lg border border-slate-800 bg-[#0B0F14] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] text-slate-500">
                          {fn.id}
                        </span>
                        <h3 className="text-sm font-semibold text-slate-100">
                          {fn.name}
                        </h3>
                        <span className="text-[11px] text-cyan-300">
                          {fn.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{fn.description}</p>
                      <p className="text-[11px] text-slate-500">
                        Responsável: {owner?.name} · Autonomia mín: Nível {fn.minAutonomyLevel} · Execuções: {fn.executionCount}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleFunction(fn.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer shrink-0 ${
                        fn.active
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{fn.active ? 'Ativa' : 'Inativa'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tierView === 'skills' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((sk) => (
            <div
              key={sk.id}
              className="rounded-xl border border-slate-800 bg-[#10151D] p-4 space-y-1.5"
            >
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <Layers className="w-4 h-4" />
                <span>{sk.departmentId === 'dept_products' ? '1º Andar · Produtos' : '2º Andar · Marketing'}</span>
              </div>
              <h3 className="text-sm font-bold text-slate-100">{sk.name}</h3>
              <p className="text-xs text-slate-400">{sk.description}</p>
            </div>
          ))}
        </div>
      )}

      {tierView === 'tools' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tl) => (
            <div
              key={tl.id}
              className="rounded-xl border border-slate-800 bg-[#10151D] p-4 space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-violet-300 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5" />
                  <span>{tl.category}</span>
                </span>
                {tl.requiresApprovalForExternal && (
                  <span className="text-[11px] text-amber-300">Exige aprovação</span>
                )}
              </div>
              <h3 className="text-sm font-bold text-slate-100">{tl.name}</h3>
              <p className="text-xs text-slate-400">{tl.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
