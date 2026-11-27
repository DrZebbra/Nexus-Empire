import React, { useState } from 'react';
import {
  BookOpen,
  Box,
  Database,
  DollarSign,
  FileText,
  Globe,
  Megaphone,
  Plus,
  RotateCcw,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Workflow,
} from 'lucide-react';
import { calculateFinancialSummary } from '../../core/simulationRules';
import {
  isSupabaseConfigured,
  SUPABASE_ENTITY_TABLES,
  SUPABASE_SCHEMA_SQL,
} from '../../services/supabaseService';
import type {
  CompanySettings,
  GraphicsQuality,
  NexusState,
  ProductItem,
} from '../../types/nexus';

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const ProductsView: React.FC<{
  state: NexusState;
  onAddProduct: (product: Omit<ProductItem, 'id' | 'marginPercent'>) => void;
}> = ({ state, onAddProduct }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Casa Inteligente');
  const [cost, setCost] = useState(110);
  const [price, setPrice] = useState(299);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddProduct({
      name: name.trim(),
      sku: `NEX-${Math.floor(100 + Math.random() * 899)}`,
      category,
      costPrice: Number(cost),
      salePrice: Number(price),
      supplierId: state.suppliers[0]?.id ?? 'sup_01',
      status: 'pesquisa',
      specialistId: 'emp_04',
      stock: 0,
    });
    setName('');
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="pb-4 border-b border-slate-800">
        <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-50 flex items-center gap-2">
          <Box className="w-6 h-6 text-emerald-400" />
          <span>Produtos &amp; Fornecedores (1º Andar)</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Gestão exclusiva do departamento de Produtos e Desenvolvimento.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-800 bg-[#10151D] p-5 space-y-3 h-fit"
        >
          <h2 className="font-display text-sm font-bold text-slate-100 flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Cadastrar Novo Produto</span>
          </h2>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do produto..."
            className="w-full rounded-lg bg-[#0A0E14] border border-slate-700 px-3 py-2 text-xs text-slate-100"
          />
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Categoria"
            className="w-full rounded-lg bg-[#0A0E14] border border-slate-700 px-3 py-2 text-xs text-slate-100"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                Custo (R$)
              </label>
              <input
                type="number"
                value={cost}
                onChange={(e) => setCost(Number(e.target.value))}
                className="w-full rounded-lg bg-[#0A0E14] border border-slate-700 px-3 py-2 text-xs text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                Venda (R$)
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full rounded-lg bg-[#0A0E14] border border-slate-700 px-3 py-2 text-xs text-slate-100 font-mono"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs cursor-pointer"
          >
            Adicionar ao Catálogo
          </button>
        </form>

        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {state.products.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-slate-800 bg-[#10151D] p-4 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-400">{p.sku}</span>
                  <span className="text-emerald-400 font-semibold">{p.status}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-100">{p.name}</h3>
                <p className="text-xs text-slate-400">{p.category}</p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs font-mono">
                  <span className="text-slate-300">{formatBRL(p.salePrice)}</span>
                  <span className="text-cyan-300">Margem {p.marginPercent}%</span>
                  <span className="text-slate-400">Est: {p.stock}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#10151D] p-4">
            <h3 className="text-xs font-bold text-slate-200 mb-3">
              Fornecedores Homologados ({state.suppliers.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              {state.suppliers.map((s) => (
                <div
                  key={s.id}
                  className="rounded-lg bg-[#0B0F14] border border-slate-800 p-3"
                >
                  <p className="font-semibold text-slate-100">{s.name}</p>
                  <p className="text-slate-400 mt-0.5">{s.region}</p>
                  <p className="font-mono text-emerald-300 mt-1">
                    SLA {s.leadTimeDays}d · {s.reliabilityScore}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const MarketingView: React.FC<{
  state: NexusState;
  onApproveCampaign: (campaignId: string) => void;
}> = ({ state, onApproveCampaign }) => (
  <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
    <div className="pb-4 border-b border-slate-800">
      <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-50 flex items-center gap-2">
        <Megaphone className="w-6 h-6 text-violet-400" />
        <span>Marketing &amp; Campanhas (2º Andar)</span>
      </h1>
      <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
        Publicações externas e liberações de orçamento exigem aprovação do CEO.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {state.campaigns.map((c) => {
        const manager = state.employees.find((e) => e.id === c.managerId);
        return (
          <div
            key={c.id}
            className="rounded-xl border border-slate-800 bg-[#10151D] p-4 space-y-3"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-violet-300 font-semibold">{c.channel}</span>
              <span className="font-mono text-slate-300">{c.status}</span>
            </div>
            <h2 className="text-sm font-bold text-slate-100">{c.name}</h2>
            <div className="text-xs text-slate-400 space-y-1 font-mono">
              <p>Orçamento: {formatBRL(c.budget)}</p>
              <p>Investido: {formatBRL(c.spent)}</p>
              <p>Conversões (Demo): {c.conversions}</p>
            </div>
            <p className="text-[11px] text-slate-500">Gestor: {manager?.name}</p>
            {c.status === 'aguardando_aprovacao' && (
              <button
                type="button"
                onClick={() => onApproveCampaign(c.id)}
                className="w-full py-2 rounded-lg bg-violet-500 hover:bg-violet-400 text-white font-semibold text-xs cursor-pointer"
              >
                Aprovar Publicação &amp; Verba
              </button>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

export const StoresView: React.FC<{
  state: NexusState;
  onToggleStoreStatus: (storeId: string) => void;
}> = ({ state, onToggleStoreStatus }) => (
  <div className="p-4 sm:p-6 space-y-5 max-w-6xl mx-auto">
    <div className="pb-4 border-b border-slate-800">
      <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-50 flex items-center gap-2">
        <ShoppingBag className="w-6 h-6 text-cyan-400" />
        <span>Lojas Online</span>
      </h1>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {state.stores.map((st) => (
        <div
          key={st.id}
          className="rounded-xl border border-slate-800 bg-[#10151D] p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-100">{st.name}</h2>
            <span
              className={`text-xs font-mono ${
                st.status === 'online' ? 'text-emerald-400' : 'text-amber-300'
              }`}
            >
              {st.status}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {st.domain} · {st.platform}
          </p>
          <p className="font-mono text-sm text-cyan-300">
            Receita mensal (Demo): {formatBRL(st.monthlyRevenue)}
          </p>
          <button
            type="button"
            onClick={() => onToggleStoreStatus(st.id)}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 cursor-pointer"
          >
            Alternar Status ({st.status === 'online' ? 'Pausar' : 'Ativar'})
          </button>
        </div>
      ))}
    </div>
  </div>
);

export const SitesView: React.FC<{
  state: NexusState;
  onPublishSite: (siteId: string) => void;
}> = ({ state, onPublishSite }) => (
  <div className="p-4 sm:p-6 space-y-5 max-w-6xl mx-auto">
    <div className="pb-4 border-b border-slate-800">
      <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-50 flex items-center gap-2">
        <Globe className="w-6 h-6 text-cyan-400" />
        <span>Sites &amp; Landing Pages</span>
      </h1>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {state.sites.map((site) => (
        <div
          key={site.id}
          className="rounded-xl border border-slate-800 bg-[#10151D] p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-100">{site.name}</h2>
            <span className="font-mono text-xs text-cyan-300">{site.status}</span>
          </div>
          <p className="text-xs text-slate-400">{site.purpose}</p>
          <p className="font-mono text-xs text-slate-300">
            URL: {site.url} · Conversão (Demo): {site.conversionRate}%
          </p>
          {site.status !== 'publicado' && (
            <button
              type="button"
              onClick={() => onPublishSite(site.id)}
              className="px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs cursor-pointer"
            >
              Aprovar Publicação
            </button>
          )}
        </div>
      ))}
    </div>
  </div>
);

export const AutomationsView: React.FC<{
  state: NexusState;
  onToggleAutomation: (id: string) => void;
}> = ({ state, onToggleAutomation }) => (
  <div className="p-4 sm:p-6 space-y-5 max-w-6xl mx-auto">
    <div className="pb-4 border-b border-slate-800">
      <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-50 flex items-center gap-2">
        <Workflow className="w-6 h-6 text-emerald-400" />
        <span>Automações Operacionais</span>
      </h1>
    </div>
    <div className="space-y-3">
      {state.automations.map((aut) => (
        <div
          key={aut.id}
          className="rounded-xl border border-slate-800 bg-[#10151D] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div>
            <h2 className="text-sm font-bold text-slate-100">{aut.name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Gatilho: {aut.trigger} · Execuções: {aut.runsCount}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onToggleAutomation(aut.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
              aut.active
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            {aut.active ? 'Ativa' : 'Pausada'}
          </button>
        </div>
      ))}
    </div>
  </div>
);

export const FinanceView: React.FC<{ state: NexusState }> = ({ state }) => {
  const summary = calculateFinancialSummary(state.financials);
  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-6xl mx-auto">
      <div className="pb-4 border-b border-slate-800">
        <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-50 flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-emerald-400" />
          <span>Financeiro (Registros de Demonstração)</span>
        </h1>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-800 bg-[#10151D] p-4">
          <span className="text-xs text-slate-400">Faturamento</span>
          <p className="font-mono text-2xl font-bold text-emerald-400 mt-1">
            {formatBRL(summary.revenue)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#10151D] p-4">
          <span className="text-xs text-slate-400">Despesas</span>
          <p className="font-mono text-2xl font-bold text-red-400 mt-1">
            {formatBRL(summary.expenses)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#10151D] p-4">
          <span className="text-xs text-slate-400">Lucro Líquido</span>
          <p className="font-mono text-2xl font-bold text-cyan-300 mt-1">
            {formatBRL(summary.profit)}
          </p>
        </div>
      </div>
      <div className="rounded-xl border border-slate-800 bg-[#10151D] p-4 space-y-2">
        {state.financials.map((f) => (
          <div
            key={f.id}
            className="flex items-center justify-between text-xs py-2 border-b border-slate-800/70 last:border-0"
          >
            <div>
              <p className="font-medium text-slate-100">{f.description}</p>
              <p className="text-slate-500 font-mono">{f.date}</p>
            </div>
            <span
              className={`font-mono font-semibold ${
                f.type === 'receita' ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {f.type === 'receita' ? '+' : '-'} {formatBRL(f.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ReportsView: React.FC<{
  state: NexusState;
  onOpenCoreComputer: () => void;
}> = ({ state, onOpenCoreComputer }) => (
  <div className="p-4 sm:p-6 space-y-5 max-w-6xl mx-auto">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
      <div>
        <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-50 flex items-center gap-2">
          <FileText className="w-6 h-6 text-cyan-400" />
          <span>Relatórios &amp; Livro Histórico</span>
        </h1>
      </div>
      <button
        type="button"
        onClick={onOpenCoreComputer}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-500/60 bg-[#101522] text-xs font-semibold text-slate-100 cursor-pointer"
      >
        <BookOpen className="w-4 h-4 text-blue-400" />
        <span>Abrir Computador Azul &amp; Vermelho</span>
      </button>
    </div>

    <div className="space-y-3">
      {state.historicalLedger.map((entry) => (
        <div
          key={entry.id}
          className="rounded-xl border border-slate-800 bg-[#10151D] p-4 space-y-1"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-100">{entry.taskTitle}</span>
            <span className="font-mono text-slate-400">
              {new Date(entry.recordedAt).toLocaleString('pt-BR')}
            </span>
          </div>
          <p className="text-xs text-slate-300">{entry.outcomeSummary}</p>
          <p className="text-[11px] text-slate-500">
            {entry.floor}º Andar · Executor: {entry.executedByEmployeeName} · Arquivado por: {entry.loggedByManagerName}
          </p>
        </div>
      ))}
    </div>
  </div>
);

export const SettingsView: React.FC<{
  settings: CompanySettings;
  geminiConfigured: boolean;
  onUpdateSettings: (patch: Partial<CompanySettings>) => void;
  onResetDemoData: () => void;
}> = ({ settings, geminiConfigured, onUpdateSettings, onResetDemoData }) => {
  const supabaseReady = isSupabaseConfigured();

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="pb-4 border-b border-slate-800">
        <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-50 flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-300" />
          <span>Configurações, Qualidade 3D &amp; Segurança</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-xl border border-slate-800 bg-[#10151D] p-5 space-y-4">
          <h2 className="font-display text-sm font-bold text-slate-100">
            Desempenho 3D &amp; Simulação
          </h2>
          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Qualidade Gráfica 3D (Mobile / Desktop)
            </label>
            <select
              value={settings.graphicsQuality}
              onChange={(e) =>
                onUpdateSettings({
                  graphicsQuality: e.target.value as GraphicsQuality,
                })
              }
              className="w-full rounded-lg bg-[#0A0E14] border border-slate-700 px-3 py-2 text-xs text-slate-100"
            >
              <option value="low">Econômica (Mobile / Bateria)</option>
              <option value="medium">Balanceada (Recomendada)</option>
              <option value="high">Alta Fidelidade (Retina / Desktop)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Velocidade da Simulação
            </label>
            <select
              value={settings.simulationSpeed}
              onChange={(e) =>
                onUpdateSettings({
                  simulationSpeed: Number(e.target.value) as 1 | 2,
                })
              }
              className="w-full rounded-lg bg-[#0A0E14] border border-slate-700 px-3 py-2 text-xs text-slate-100"
            >
              <option value={1}>1x Tempo Padrão</option>
              <option value={2}>2x Acelerado</option>
            </select>
          </div>
          <button
            type="button"
            onClick={onResetDemoData}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 hover:border-red-400 text-xs text-slate-200 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Dados de Demonstração</span>
          </button>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#10151D] p-5 space-y-3">
          <h2 className="font-display text-sm font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Governança &amp; Integrações</span>
          </h2>
          <div className="text-xs space-y-2 text-slate-300">
            <p>
              <strong>Gemini AI (Servidor):</strong>{' '}
              {geminiConfigured
                ? 'Conectado via ambiente seguro do servidor'
                : 'Modo de demonstração local ativo (configure GEMINI_API_KEY nos segredos do servidor)'}
            </p>
            <p>
              <strong>Supabase PostgreSQL + RLS:</strong>{' '}
              {supabaseReady
                ? 'Credenciais configuradas'
                : 'Persistência local ativa (defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para sincronização em nuvem)'}
            </p>
            <p className="text-slate-400">
              Identidade visual dos 12 personagens 3D bloqueada contra edições manuais. Operações financeiras e publicações externas exigem aprovação do CEO.
            </p>
          </div>
        </div>
      </div>

      {/* Supabase Schema Blueprint */}
      <div className="rounded-xl border border-slate-800 bg-[#10151D] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold text-slate-100 flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            <span>Estrutura Supabase ({SUPABASE_ENTITY_TABLES.length} Tabelas)</span>
          </h2>
        </div>
        <p className="text-xs text-slate-400">
          Entidades modeladas: {SUPABASE_ENTITY_TABLES.join(', ')}.
        </p>
        <pre className="rounded-lg bg-[#080B10] border border-slate-800 p-3 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-56">
          {SUPABASE_SCHEMA_SQL}
        </pre>
      </div>
    </div>
  );
};
