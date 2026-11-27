import React, { useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Box,
  CheckCircle2,
  Cpu,
  Database,
  DollarSign,
  FileText,
  Globe,
  Link2,
  Megaphone,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Unplug,
  Workflow,
} from 'lucide-react';
import { calculateFinancialSummary } from '../../core/simulationRules';
import {
  SUPABASE_ENTITY_TABLES,
  SUPABASE_SCHEMA_SQL,
} from '../../services/supabaseService';
import type {
  ChannelId,
  CompanySettings,
  GraphicsQuality,
  NexusState,
  ProductItem,
  TokenUsagePolicy,
} from '../../types/nexus';

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const ProductsView: React.FC<{
  state: NexusState;
  onAddProduct: (product: Omit<ProductItem, 'id' | 'marginPercent'>) => void;
}> = ({ state, onAddProduct }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [cost, setCost] = useState(0);
  const [price, setPrice] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddProduct({
      name: name.trim(),
      sku: `NEX-${Date.now().toString().slice(-5)}`,
      category: category.trim() || 'Geral',
      costPrice: Number(cost),
      salePrice: Number(price),
      supplierId: state.suppliers[0]?.id ?? '',
      status: 'pesquisa',
      specialistId: 'emp_04',
      stock: 0,
    });
    setName('');
    setCategory('');
    setCost(0);
    setPrice(0);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="pb-4 border-b border-slate-800">
        <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-50 flex items-center gap-2">
          <Box className="w-6 h-6 text-emerald-400" />
          <span>Produtos &amp; Fornecedores (1º Andar)</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Catálogo e fornecedores reais cadastrados a partir de pesquisas e homologações.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-800 bg-[#10151D] p-5 space-y-3 h-fit"
        >
          <h2 className="font-display text-sm font-bold text-slate-100 flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Cadastrar Produto Real</span>
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
            placeholder="Categoria..."
            className="w-full rounded-lg bg-[#0A0E14] border border-slate-700 px-3 py-2 text-xs text-slate-100"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                Custo (R$)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
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
                min={0}
                step="0.01"
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
          {state.products.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-[#10151D] p-8 text-center text-xs text-slate-400">
              Nenhum produto real cadastrado ainda. Cadastre ao lado ou solicite uma pesquisa de mercado em Tarefas.
            </div>
          ) : (
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
          )}

          <div className="rounded-xl border border-slate-800 bg-[#10151D] p-4">
            <h3 className="text-xs font-bold text-slate-200 mb-3">
              Fornecedores Homologados ({state.suppliers.length})
            </h3>
            {state.suppliers.length === 0 ? (
              <p className="text-xs text-slate-500">
                Nenhum fornecedor homologado ainda.
              </p>
            ) : (
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
            )}
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
        Campanhas reais dependem da conexão oficial dos canais Meta Ads / Google Ads e aprovação do CEO.
      </p>
    </div>

    {state.campaigns.length === 0 ? (
      <div className="rounded-xl border border-slate-800 bg-[#10151D] p-8 text-center text-xs text-slate-400">
        Nenhuma campanha real criada. Conecte os canais oficiais de mídia em Configurações antes de iniciar campanhas.
      </div>
    ) : (
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
                <p>Conversões: {c.conversions}</p>
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
    )}
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
    {state.stores.length === 0 ? (
      <div className="rounded-xl border border-slate-800 bg-[#10151D] p-8 text-center text-xs text-slate-400">
        Nenhuma loja conectada ainda. Configure o canal oficial Loja Online &amp; Gateway E-commerce em Configurações.
      </div>
    ) : (
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
              Receita mensal: {formatBRL(st.monthlyRevenue)}
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
    )}
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
    {state.sites.length === 0 ? (
      <div className="rounded-xl border border-slate-800 bg-[#10151D] p-8 text-center text-xs text-slate-400">
        Nenhum site ou landing page publicado ainda.
      </div>
    ) : (
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
              URL: {site.url} · Conversão: {site.conversionRate}%
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
    )}
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
    {state.automations.length === 0 ? (
      <div className="rounded-xl border border-slate-800 bg-[#10151D] p-8 text-center text-xs text-slate-400">
        Nenhuma automação configurada ainda.
      </div>
    ) : (
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
    )}
  </div>
);

export const FinanceView: React.FC<{ state: NexusState }> = ({ state }) => {
  const summary = calculateFinancialSummary(state.financials);
  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-6xl mx-auto">
      <div className="pb-4 border-b border-slate-800">
        <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-50 flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-emerald-400" />
          <span>Financeiro Real</span>
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
        {state.financials.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            Nenhum lançamento financeiro real registrado até o momento.
          </p>
        ) : (
          state.financials.map((f) => (
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
          ))
        )}
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
          <span>Relatórios &amp; Livro Histórico Real</span>
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

    {state.historicalLedger.length === 0 ? (
      <div className="rounded-xl border border-slate-800 bg-[#10151D] p-8 text-center text-xs text-slate-400">
        Nenhum registro histórico ainda. Quando uma tarefa real for concluída, o gerente do andar arquivará aqui.
      </div>
    ) : (
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
              {typeof entry.tokensUsed === 'number' && entry.tokensUsed > 0
                ? ` · ${entry.tokensUsed} tokens`
                : ''}
            </p>
          </div>
        ))}
      </div>
    )}
  </div>
);

export const SettingsView: React.FC<{
  state: NexusState;
  geminiConfigured: boolean;
  supabaseConnected: boolean;
  supabaseSyncMessage: string | null;
  channelVerifyError: string | null;
  verifyingChannelId: ChannelId | null;
  onUpdateSettings: (patch: Partial<CompanySettings>) => void;
  onUpdateTokenPolicy: (patch: Partial<TokenUsagePolicy>) => void;
  onConnectChannel: (channelId: ChannelId) => void;
  onDisconnectChannel: (channelId: ChannelId) => void;
  onSyncSupabaseNow: () => void;
  onResetWorkspace: () => void;
}> = ({
  state,
  geminiConfigured,
  supabaseConnected,
  supabaseSyncMessage,
  channelVerifyError,
  verifyingChannelId,
  onUpdateSettings,
  onUpdateTokenPolicy,
  onConnectChannel,
  onDisconnectChannel,
  onSyncSupabaseNow,
  onResetWorkspace,
}) => {
  const { settings, channels, tokenPolicy, tokenLogs } = state;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="pb-4 border-b border-slate-800">
        <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-50 flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-300" />
          <span>Conexões Oficiais, Limites de Tokens &amp; Configurações</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          As tarefas só podem ser executadas após a conexão oficial e segura de seus respectivos canais.
        </p>
      </div>

      {/* Official Secure Channels Section */}
      <div className="rounded-xl border border-slate-800 bg-[#10151D] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-sm font-bold text-slate-100 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-cyan-400" />
              <span>Conexões Seguras e Oficiais de Canais</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Verificação real no servidor. Nenhum canal externo é simulado sem credenciais oficiais.
            </p>
          </div>
          <button
            type="button"
            onClick={onSyncSupabaseNow}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-cyan-500/40 bg-[#0A0E14] hover:border-cyan-400 text-xs font-medium text-cyan-200 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sincronizar Supabase</span>
          </button>
        </div>

        {supabaseSyncMessage && (
          <p className="text-xs text-cyan-300 bg-cyan-950/30 border border-cyan-500/30 rounded-lg px-3 py-2">
            {supabaseSyncMessage}
          </p>
        )}

        {channelVerifyError && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{channelVerifyError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {channels.map((ch) => {
            const isConnected = ch.status === 'connected';
            const isVerifying = verifyingChannelId === ch.id;
            return (
              <div
                key={ch.id}
                className="rounded-lg border border-slate-800 bg-[#0A0E14] p-4 flex flex-col justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-100">
                      {ch.name}
                    </span>
                    <span
                      className={`font-mono text-[10px] px-2 py-0.5 rounded ${
                        isConnected
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isConnected ? 'CONECTADO' : 'DESCONECTADO'}
                    </span>
                  </div>
                  <p className="text-[11px] text-cyan-300">{ch.provider}</p>
                  <p className="text-xs text-slate-400">{ch.description}</p>
                  <p className="text-[10px] font-mono text-slate-500">
                    Requer segredo de servidor: {ch.requiresServerSecret}
                  </p>
                  {ch.accountLabel && (
                    <p className="text-[11px] text-emerald-300 flex items-center gap-1 pt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{ch.accountLabel}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <button
                      type="button"
                      onClick={() => onDisconnectChannel(ch.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-red-950/60 text-xs text-slate-200 hover:text-red-200 cursor-pointer"
                    >
                      <Unplug className="w-3.5 h-3.5" />
                      <span>Desconectar</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isVerifying}
                      onClick={() => onConnectChannel(ch.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-xs cursor-pointer"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>
                        {isVerifying
                          ? 'Verificando...'
                          : 'Conectar Oficialmente'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Token Limits & Logs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-xl border border-slate-800 bg-[#10151D] p-5 space-y-4">
          <h2 className="font-display text-sm font-bold text-slate-100 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>Limites de Tokens de IA</span>
          </h2>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">
                Limite Diário de Tokens
              </label>
              <input
                type="number"
                min={5000}
                step={5000}
                value={tokenPolicy.dailyLimit}
                onChange={(e) =>
                  onUpdateTokenPolicy({
                    dailyLimit: Math.max(1000, Number(e.target.value) || 1000),
                  })
                }
                className="w-full rounded-lg bg-[#0A0E14] border border-slate-700 px-3 py-2 text-xs font-mono text-slate-100"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">
                Limite por Tarefa
              </label>
              <input
                type="number"
                min={1000}
                step={1000}
                value={tokenPolicy.perTaskLimit}
                onChange={(e) =>
                  onUpdateTokenPolicy({
                    perTaskLimit: Math.max(1000, Number(e.target.value) || 1000),
                  })
                }
                className="w-full rounded-lg bg-[#0A0E14] border border-slate-700 px-3 py-2 text-xs font-mono text-slate-100"
              />
            </div>
          </div>
          <div className="rounded-lg bg-[#0A0E14] border border-slate-800 p-3 text-xs space-y-1 font-mono">
            <p className="text-slate-200">
              Consumidos hoje: {tokenPolicy.usedTotal.toLocaleString('pt-BR')} /{' '}
              {tokenPolicy.dailyLimit.toLocaleString('pt-BR')}
            </p>
            <p className="text-slate-400 text-[11px]">
              Prompt: {tokenPolicy.promptTokensTotal.toLocaleString('pt-BR')} · Resposta:{' '}
              {tokenPolicy.completionTokensTotal.toLocaleString('pt-BR')}
            </p>
          </div>
          {tokenLogs.length > 0 && (
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {tokenLogs.slice(0, 6).map((tl) => (
                <div
                  key={tl.id}
                  className="flex items-center justify-between text-[11px] font-mono text-slate-400 bg-[#0A0E14] px-2.5 py-1.5 rounded border border-slate-800"
                >
                  <span className="truncate">{tl.actorName} ({tl.action})</span>
                  <span className="text-cyan-300 shrink-0">{tl.totalTokens} tok</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#10151D] p-5 space-y-4">
          <h2 className="font-display text-sm font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>3D, Governança &amp; Estado</span>
          </h2>
          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Qualidade Gráfica 3D
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
          <div className="text-xs space-y-1 text-slate-400">
            <p>
              <strong className="text-slate-200">Gemini Servidor:</strong>{' '}
              {geminiConfigured ? 'Ativo' : 'Aguardando GEMINI_API_KEY'}
            </p>
            <p>
              <strong className="text-slate-200">Supabase:</strong>{' '}
              {supabaseConnected ? 'Conectado' : 'Aguardando variáveis Supabase'}
            </p>
          </div>
          <button
            type="button"
            onClick={onResetWorkspace}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 hover:border-red-400 text-xs text-slate-200 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Zerar Operações (Manter Habilidades &amp; Equipe)</span>
          </button>
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
