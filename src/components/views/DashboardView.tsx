import React from 'react';
import {
  Activity,
  BarChart3,
  BookOpen,
  Box,
  CheckCircle2,
  Clock,
  Cpu,
  DollarSign,
  Link2,
  Megaphone,
  Users,
} from 'lucide-react';
import { computeDashboardMetrics } from '../../core/simulationRules';
import type { NexusState } from '../../types/nexus';

interface DashboardViewProps {
  state: NexusState;
  geminiConfigured: boolean;
  supabaseConnected: boolean;
  onSelectEmployee: (id: string) => void;
  onOpenCoreComputer: () => void;
  onOpenNexusCore: () => void;
  onGoToSettings: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  state,
  geminiConfigured,
  supabaseConnected,
  onSelectEmployee,
  onOpenCoreComputer,
  onOpenNexusCore,
  onGoToSettings,
}) => {
  const m = computeDashboardMetrics(state);

  const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const tokenPercent =
    m.dailyTokenLimit > 0
      ? Math.min(100, Math.round((m.tokensUsedTotal / m.dailyTokenLimit) * 100))
      : 0;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-50">
            Dashboard Executivo — Dados Reais
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Todos os indicadores refletem exclusivamente execuções reais, permissões aprovadas e canais oficiais conectados.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onGoToSettings}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-700 bg-[#101522] hover:border-cyan-400 text-xs font-semibold text-slate-100 cursor-pointer"
          >
            <Link2 className="w-4 h-4 text-cyan-400" />
            <span>Canais ({m.connectedChannelsCount}/{m.totalChannelsCount})</span>
          </button>
          <button
            type="button"
            onClick={onOpenCoreComputer}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-blue-500/50 bg-[#101522] hover:border-red-400 text-xs font-semibold text-slate-100 cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-blue-400" />
            <span>PC Azul &amp; Vermelho ({m.historicalRecordsCount})</span>
          </button>
          <button
            type="button"
            onClick={onOpenNexusCore}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-xs font-semibold text-slate-950 cursor-pointer"
          >
            <span>Abrir NEXUS CORE</span>
          </button>
        </div>
      </div>

      {/* Real Connection & Token Status Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-800 bg-[#10151D] p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Banco em Nuvem (Supabase)</p>
            <p className="text-sm font-semibold text-slate-100 mt-0.5">
              {supabaseConnected ? 'Conectado e sincronizado' : 'Aguardando credenciais'}
            </p>
          </div>
          <span
            className={`font-mono text-[11px] px-2 py-1 rounded ${
              supabaseConnected
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'bg-amber-500/15 text-amber-300'
            }`}
          >
            {supabaseConnected ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#10151D] p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Motor de IA (Gemini Servidor)</p>
            <p className="text-sm font-semibold text-slate-100 mt-0.5">
              {geminiConfigured ? 'Ativo para execução real' : 'Chave não configurada'}
            </p>
          </div>
          <span
            className={`font-mono text-[11px] px-2 py-1 rounded ${
              geminiConfigured
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'bg-red-500/15 text-red-300'
            }`}
          >
            {geminiConfigured ? 'ATIVO' : 'INATIVO'}
          </span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#10151D] p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Limite de Tokens IA</span>
            </span>
            <span className="font-mono text-slate-200 tabular-nums">
              {m.tokensUsedTotal.toLocaleString('pt-BR')} / {m.dailyTokenLimit.toLocaleString('pt-BR')}
            </span>
          </div>
          <div className="h-2 rounded bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-all"
              style={{ width: `${tokenPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl border border-slate-800 bg-[#10151D] p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Em Execução</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="font-mono text-2xl font-bold text-slate-50 tabular-nums">
            {m.activeEmployeesCount} / {state.employees.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {m.workingCount} operando · {m.conversingCount} em conversa
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#10151D] p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Tarefas Reais</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="font-mono text-2xl font-bold text-slate-50 tabular-nums">
            {state.tasks.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {m.tasksAwaitingApproval} permissões · {m.tasksCompleted} concluídas
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#10151D] p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Produtos &amp; Campanhas</span>
            <Box className="w-4 h-4 text-violet-400" />
          </div>
          <p className="font-mono text-2xl font-bold text-slate-50 tabular-nums">
            {m.totalProducts} / {m.activeCampaigns}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {m.totalProducts} produtos · {m.activeCampaigns} campanhas ativas
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#10151D] p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Resultado Financeiro</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="font-mono text-xl sm:text-2xl font-bold text-emerald-400 tabular-nums">
            {formatBRL(m.netProfit)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Rec: {formatBRL(m.totalRevenue)} · Desp: {formatBRL(m.totalExpenses)}
          </p>
        </div>
      </div>

      {/* Department Productivity & Individual Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-800 bg-[#10151D] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span>Produtividade Real por Departamento</span>
            </h2>
            <span className="text-[11px] text-slate-400">Baseada em entregas reais</span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-emerald-300 font-medium">
                  1º Andar — Produtos e Desenvolvimento
                </span>
                <span className="font-mono text-slate-200 tabular-nums">
                  {m.productsDeptProductivity}%
                </span>
              </div>
              <div className="h-3 rounded bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${m.productsDeptProductivity}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-violet-300 font-medium">
                  2º Andar — Marketing e Comercial
                </span>
                <span className="font-mono text-slate-200 tabular-nums">
                  {m.marketingDeptProductivity}%
                </span>
              </div>
              <div className="h-3 rounded bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-violet-500 transition-all"
                  style={{ width: `${m.marketingDeptProductivity}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800">
            <p className="text-xs font-semibold text-slate-300 mb-3">
              Distribuição de Tarefas no Quadro
            </p>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="rounded-lg bg-[#0B0F14] border border-slate-800 p-2.5">
                <span className="font-mono text-lg font-bold text-slate-200 block tabular-nums">
                  {m.tasksPending}
                </span>
                <span className="text-[11px] text-slate-400">Prontas</span>
              </div>
              <div className="rounded-lg bg-[#0B0F14] border border-slate-800 p-2.5">
                <span className="font-mono text-lg font-bold text-cyan-300 block tabular-nums">
                  {m.tasksInProgress}
                </span>
                <span className="text-[11px] text-slate-400">Execução</span>
              </div>
              <div className="rounded-lg bg-[#0B0F14] border border-slate-800 p-2.5">
                <span className="font-mono text-lg font-bold text-amber-300 block tabular-nums">
                  {m.tasksAwaitingApproval}
                </span>
                <span className="text-[11px] text-slate-400">Permissões</span>
              </div>
              <div className="rounded-lg bg-[#0B0F14] border border-slate-800 p-2.5">
                <span className="font-mono text-lg font-bold text-emerald-400 block tabular-nums">
                  {m.tasksCompleted}
                </span>
                <span className="text-[11px] text-slate-400">Concluídas</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#10151D] p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-sm font-bold text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Equipe (12 Especialistas)</span>
            </h2>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {state.employees.map((emp) => (
              <button
                key={emp.id}
                type="button"
                onClick={() => onSelectEmployee(emp.id)}
                className="w-full flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-lg hover:bg-slate-800/70 text-left cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-200 truncate">
                      {emp.name} · <span className="text-slate-400">{emp.role}</span>
                    </span>
                    <span className="font-mono text-xs text-slate-300 tabular-nums ml-2">
                      {emp.productivity}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded bg-slate-800 mt-1 overflow-hidden">
                    <div
                      className="h-full"
                      style={{
                        width: `${emp.productivity}%`,
                        backgroundColor: emp.appearance.accentColor,
                      }}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Real Activity & Real Campaigns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-800 bg-[#10151D] p-5">
          <h2 className="font-display text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Registros de Atividade Real</span>
          </h2>
          {state.activityLogs.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              Nenhuma atividade executada ainda. Determine uma tarefa real para iniciar o histórico.
            </p>
          ) : (
            <div className="space-y-2.5 max-h-60 overflow-y-auto">
              {state.activityLogs.slice(0, 8).map((log) => (
                <div
                  key={log.id}
                  className="rounded-lg border border-slate-800/80 bg-[#0B0F14] p-3 text-xs"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span className="font-semibold text-slate-200">
                      {log.actorName} · {log.action}
                    </span>
                    <span className="font-mono">
                      {new Date(log.timestamp).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-slate-300">{log.detail}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#10151D] p-5">
          <h2 className="font-display text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-violet-400" />
            <span>Campanhas Conectadas</span>
          </h2>
          {state.campaigns.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              Nenhuma campanha ativa. Conecte oficialmente Meta Ads / Google Ads e aprove uma campanha real.
            </p>
          ) : (
            <div className="space-y-2.5">
              {state.campaigns.map((cmp) => (
                <div
                  key={cmp.id}
                  className="rounded-lg border border-slate-800/80 bg-[#0B0F14] p-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-100 truncate">{cmp.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {cmp.channel} · Estado: {cmp.status}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono font-semibold text-violet-300 tabular-nums">
                      {formatBRL(cmp.budget)}
                    </p>
                    <p className="font-mono text-[11px] text-slate-400 tabular-nums">
                      {cmp.conversions} conv.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
