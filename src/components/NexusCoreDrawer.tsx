import React, { useState } from 'react';
import { Check, Cpu, Send, ShieldAlert, Sparkles, X, XCircle } from 'lucide-react';
import {
  requestSupervisorAIReview,
  sendDirectiveToNexusCore,
  type TokenUsageReport,
} from '../services/aiService';
import type {
  ApprovalItem,
  ChannelConnection,
  ChannelId,
  ConversationMessage,
  DepartmentId,
  EmployeeProfile,
  TaskItem,
  TaskPriority,
  TokenUsagePolicy,
} from '../types/nexus';

interface NexusCoreDrawerProps {
  open: boolean;
  onClose: () => void;
  messages: ConversationMessage[];
  employees: EmployeeProfile[];
  tasks: TaskItem[];
  approvals: ApprovalItem[];
  channels: ChannelConnection[];
  tokenPolicy: TokenUsagePolicy;
  geminiConfigured: boolean;
  onRecordCoreExchange: (
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
  ) => void;
  onResolveApproval: (
    approvalId: string,
    stageActor: 'supervisor' | 'ceo',
    decision: 'approved' | 'rejected',
    comment?: string,
    tokenUsage?: { usage: TokenUsageReport; actorName: string; model: string }
  ) => void;
}

export const NexusCoreDrawer: React.FC<NexusCoreDrawerProps> = ({
  open,
  onClose,
  messages,
  employees,
  tasks,
  approvals,
  channels,
  tokenPolicy,
  geminiConfigured,
  onRecordCoreExchange,
  onResolveApproval,
}) => {
  const [directive, setDirective] = useState('');
  const [loading, setLoading] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const pendingApprovals = approvals.filter((a) => a.status === 'pending');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = directive.trim();
    if (!clean || loading) return;
    setError(null);
    setLoading(true);
    try {
      const result = await sendDirectiveToNexusCore(
        clean,
        employees,
        tasks,
        tokenPolicy
      );
      onRecordCoreExchange(clean, result.reply, result.tokenUsage, result.model, {
        targetDepartment: result.targetDepartment,
        assignedEmployeeId: result.leadEmployeeId,
        subtasks: result.subtasks,
      });
      setDirective('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar diretriz.');
    } finally {
      setLoading(false);
    }
  };

  const handleSupervisorAIApprove = async (apr: ApprovalItem) => {
    const supervisor = employees.find((e) => e.id === apr.supervisorId);
    const requester = employees.find((e) => e.id === apr.requestedByEmployeeId);
    const task = tasks.find((t) => t.id === apr.relatedTaskId);
    if (!supervisor || !requester || !task) {
      onResolveApproval(apr.id, 'supervisor', 'approved');
      return;
    }
    setReviewingId(apr.id);
    setError(null);
    try {
      const reqChannelNames = task.requiredChannelIds.map(
        (id) => channels.find((c) => c.id === id)?.name ?? id
      );
      const res = await requestSupervisorAIReview(
        supervisor,
        requester,
        task,
        reqChannelNames,
        tokenPolicy
      );
      onResolveApproval(apr.id, 'supervisor', 'approved', res.comment, {
        usage: res.tokenUsage,
        actorName: supervisor.name,
        model: res.model,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no parecer do superior.');
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nexus-core-title"
    >
      <div className="w-full max-w-lg h-full flex flex-col bg-[#0C1017] border-l border-slate-800 shadow-2xl">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2
                id="nexus-core-title"
                className="font-display text-base font-bold text-slate-100"
              >
                NEXUS CORE
              </h2>
              <p className="text-[11px] text-slate-400">
                {geminiConfigured
                  ? `IA Real Ativa · Tokens: ${tokenPolicy.usedTotal.toLocaleString('pt-BR')} / ${tokenPolicy.dailyLimit.toLocaleString('pt-BR')}`
                  : 'GEMINI_API_KEY ausente no servidor · Execução real indisponível'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar NEXUS CORE"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2-Stage Permission & Approval Queue */}
        {pendingApprovals.length > 0 && (
          <div className="px-5 py-3 border-b border-slate-800 bg-[#121622] space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
              <ShieldAlert className="w-4 h-4" />
              <span>Solicitações de Permissão ({pendingApprovals.length})</span>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {pendingApprovals.map((apr) => {
                const supervisor = employees.find((e) => e.id === apr.supervisorId);
                return (
                  <div
                    key={apr.id}
                    className="rounded-lg border border-amber-500/30 bg-[#0D1119] p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-100 truncate">
                          {apr.title}
                        </p>
                        <p className="text-[11px] text-slate-400">{apr.description}</p>
                        <p className="text-[11px] text-cyan-300 mt-1">
                          {apr.stage === 'supervisor'
                            ? `Etapa 1: Aguardando superior (${supervisor?.name ?? 'Diretor'})`
                            : 'Etapa 2: Superior aprovou · Aguardando autorização do CEO'}
                        </p>
                        {apr.supervisorComment && (
                          <p className="text-[11px] text-emerald-300 mt-0.5 italic">
                            &ldquo;{apr.supervisorComment}&rdquo;
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => onResolveApproval(apr.id, apr.stage, 'rejected')}
                        aria-label={`Rejeitar ${apr.title}`}
                        className="p-1.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 cursor-pointer shrink-0"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {apr.stage === 'supervisor' ? (
                        <>
                          <button
                            type="button"
                            disabled={reviewingId === apr.id}
                            onClick={() => handleSupervisorAIApprove(apr)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-violet-500/20 border border-violet-500/40 hover:bg-violet-500/30 text-[11px] font-medium text-violet-200 cursor-pointer disabled:opacity-50"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>
                              {reviewingId === apr.id
                                ? 'Gerando parecer...'
                                : `Parecer IA (${supervisor?.name.split(' ')[0] ?? 'Diretor'})`}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onResolveApproval(apr.id, 'supervisor', 'approved')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-[11px] font-medium text-emerald-300 cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                            <span>Aprovar como Superior</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onResolveApproval(apr.id, 'ceo', 'approved')}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-[11px] font-semibold text-slate-950 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Conceder Permissão Final (CEO)</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Real Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {messages.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-[#101620] p-4 text-xs text-slate-400 space-y-2">
              <p className="font-semibold text-slate-200">
                Nenhuma diretriz enviada ainda.
              </p>
              <p>
                Envie uma ordem real abaixo. O NEXUS CORE distribuirá as tarefas aos especialistas, que solicitarão permissão ao superior e aguardarão seus canais oficiais conectados para executar.
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`rounded-lg p-3.5 text-xs leading-relaxed ${
                  m.sender === 'ceo'
                    ? 'bg-emerald-950/35 border border-emerald-500/30 text-slate-100 ml-6'
                    : 'bg-[#121824] border border-slate-800 text-slate-200 mr-6'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span className="font-semibold text-cyan-300">
                    {m.senderName}
                    {typeof m.tokensUsed === 'number' && m.tokensUsed > 0
                      ? ` · ${m.tokensUsed} tokens`
                      : ''}
                  </span>
                  <span className="font-mono">
                    {new Date(m.timestamp).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="whitespace-pre-wrap">{m.content}</p>
                {m.structuredPlan && m.structuredPlan.subtasks.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-700/70 space-y-1">
                    <span className="text-[11px] font-semibold text-emerald-300 block">
                      Subtarefas enviadas para permissão:
                    </span>
                    {m.structuredPlan.subtasks.map((st, idx) => (
                      <div
                        key={idx}
                        className="text-[11px] text-slate-300 flex items-center justify-between gap-2"
                      >
                        <span className="truncate">• {st.title}</span>
                        <span className="font-mono text-slate-400 shrink-0">
                          {st.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Directive Input */}
        <div className="p-4 border-t border-slate-800 bg-[#0A0E14]">
          {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={directive}
              onChange={(e) => setDirective(e.target.value)}
              placeholder="Determinar tarefa real ao NEXUS CORE..."
              className="flex-1 rounded-lg bg-[#111722] border border-slate-700 px-3 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              disabled={loading || !directive.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold text-xs cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? 'Orquestrando' : 'Enviar'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
