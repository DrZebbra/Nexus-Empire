import React, { useState } from 'react';
import { Check, Cpu, Send, ShieldAlert, X, XCircle } from 'lucide-react';
import { sendDirectiveToNexusCore } from '../services/aiService';
import type {
  ApprovalItem,
  ConversationMessage,
  DepartmentId,
  EmployeeProfile,
  TaskItem,
  TaskPriority,
} from '../types/nexus';

interface NexusCoreDrawerProps {
  open: boolean;
  onClose: () => void;
  messages: ConversationMessage[];
  employees: EmployeeProfile[];
  tasks: TaskItem[];
  approvals: ApprovalItem[];
  geminiConfigured: boolean;
  onRecordCoreExchange: (
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
  ) => void;
  onResolveApproval: (approvalId: string, decision: 'approved' | 'rejected') => void;
}

export const NexusCoreDrawer: React.FC<NexusCoreDrawerProps> = ({
  open,
  onClose,
  messages,
  employees,
  tasks,
  approvals,
  geminiConfigured,
  onRecordCoreExchange,
  onResolveApproval,
}) => {
  const [directive, setDirective] = useState('');
  const [loading, setLoading] = useState(false);
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
      const result = await sendDirectiveToNexusCore(clean, employees, tasks);
      onRecordCoreExchange(clean, result.reply, result.mode === 'demo', {
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
                  ? 'Coordenação central conectada ao Gemini'
                  : 'Modo de Demonstração Ativo · Roteamento estruturado local'}
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

        {/* Pending Approvals Section */}
        {pendingApprovals.length > 0 && (
          <div className="px-5 py-3 border-b border-slate-800 bg-[#121622] space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
              <ShieldAlert className="w-4 h-4" />
              <span>Aprovações Pendentes do CEO ({pendingApprovals.length})</span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {pendingApprovals.map((apr) => (
                <div
                  key={apr.id}
                  className="rounded-lg border border-amber-500/30 bg-[#0D1119] p-2.5 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-100 truncate">
                      {apr.title}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {apr.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onResolveApproval(apr.id, 'approved')}
                      aria-label={`Aprovar ${apr.title}`}
                      className="p-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onResolveApproval(apr.id, 'rejected')}
                      aria-label={`Rejeitar ${apr.title}`}
                      className="p-1.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {messages.map((m) => (
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
                  {m.isDemo ? ' · Demonstração' : ''}
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
                    Subtarefas distribuídas no Quadro Visual:
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
          ))}
        </div>

        {/* Directive Input */}
        <div className="p-4 border-t border-slate-800 bg-[#0A0E14]">
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {[
              'Pesquise 3 produtos com potencial de venda no Brasil',
              'Estruture campanha de tráfego para Sensor Ambiental',
            ].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => setDirective(sample)}
                className="text-[11px] px-2.5 py-1 rounded bg-[#131A24] border border-slate-700/80 text-slate-300 hover:border-cyan-500/60 cursor-pointer"
              >
                {sample}
              </button>
            ))}
          </div>
          {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={directive}
              onChange={(e) => setDirective(e.target.value)}
              placeholder="Enviar ordem executiva ao NEXUS CORE..."
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
