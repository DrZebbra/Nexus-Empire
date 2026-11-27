import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Cpu,
  MessageSquare,
  Send,
  Shield,
  Wrench,
  X,
} from 'lucide-react';
import {
  formatEmployeeBubbleText,
  getDefaultChannelsForEmployee,
} from '../core/simulationRules';
import {
  sendMessageToEmployeeAgent,
  type TokenUsageReport,
} from '../services/aiService';
import type {
  AutonomyLevel,
  ChannelConnection,
  ChannelId,
  CharacterAnimationState,
  EmployeeProfile,
  SkillDefinition,
  TaskItem,
  TaskPriority,
  TokenUsagePolicy,
  ToolDefinition,
} from '../types/nexus';

interface EmployeeModalProps {
  employee: EmployeeProfile | null;
  allEmployees: EmployeeProfile[];
  skills: SkillDefinition[];
  tools: ToolDefinition[];
  channels: ChannelConnection[];
  tokenPolicy: TokenUsagePolicy;
  tasks: TaskItem[];
  geminiConfigured: boolean;
  onClose: () => void;
  onChangeAutonomy: (employeeId: string, level: AutonomyLevel) => void;
  onSetAnimationState: (employeeId: string, state: CharacterAnimationState) => void;
  onStartConversation: (employeeAId: string, employeeBId: string | null) => void;
  onDelegateTask: (payload: {
    title: string;
    description: string;
    assigneeId: string;
    departmentId: EmployeeProfile['departmentId'];
    priority: TaskPriority;
    dueDate: string;
    requiredChannelIds: ChannelId[];
  }) => void;
  onAppendConversation: (
    employeeId: string,
    ceoMsg: string,
    replyMsg: string,
    tokenUsage: TokenUsageReport,
    model: string
  ) => void;
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  employee,
  allEmployees,
  skills,
  tools,
  channels,
  tokenPolicy,
  tasks,
  geminiConfigured,
  onClose,
  onChangeAutonomy,
  onSetAnimationState,
  onStartConversation,
  onDelegateTask,
  onAppendConversation,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'tasks' | 'capabilities'>('chat');
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const [partnerId, setPartnerId] = useState<string>('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('media');
  const [selectedChannelId, setSelectedChannelId] = useState<ChannelId | ''>('');

  if (!employee) return null;

  const sameFloorPeers = allEmployees.filter(
    (e) => e.id !== employee.id && e.floor === employee.floor
  );
  const empTasks = tasks.filter((t) => t.assigneeId === employee.id);
  const empSkills = skills.filter((s) => employee.skillIds.includes(s.id));
  const empTools = tools.filter((t) => employee.authorizedToolIds.includes(t.id));
  const bubbleStatus = formatEmployeeBubbleText(employee, allEmployees);
  const defaultChannel = getDefaultChannelsForEmployee(employee.id)[0];
  const effectiveChannelId = (selectedChannelId || defaultChannel) as ChannelId;

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatError(null);
    setChatLoading(true);
    try {
      const res = await sendMessageToEmployeeAgent(
        employee,
        msg,
        empTasks,
        tokenPolicy
      );
      onAppendConversation(
        employee.id,
        msg,
        res.reply,
        res.tokenUsage,
        res.model
      );
      setChatInput('');
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Erro ao enviar mensagem.');
    } finally {
      setChatLoading(false);
    }
  };

  const handleDelegate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    onDelegateTask({
      title: newTaskTitle.trim(),
      description: `Tarefa real determinada pelo CEO para ${employee.name}. Requer permissão do superior e canal oficial conectado.`,
      assigneeId: employee.id,
      departmentId: employee.departmentId,
      priority: newTaskPriority,
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
      requiredChannelIds: [effectiveChannelId],
    });
    setNewTaskTitle('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/75"
      role="dialog"
      aria-modal="true"
      aria-labelledby="emp-modal-title"
    >
      <div className="w-full sm:max-w-2xl max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-xl border border-slate-700 bg-[#0D1219] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-4 sm:p-5 border-b border-slate-800">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className="w-11 h-11 rounded-lg border flex items-center justify-center font-display font-bold text-base text-slate-950 shrink-0"
              style={{
                backgroundColor: employee.appearance.accentColor,
                borderColor: employee.appearance.outfitSecondary,
              }}
            >
              {employee.name
                .split(' ')
                .slice(0, 2)
                .map((n) => n[0])
                .join('')}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="emp-modal-title"
                  className="font-display text-base sm:text-lg font-bold text-slate-50 truncate"
                >
                  {employee.name}
                </h2>
                {employee.isFloorManager && (
                  <span className="text-[11px] font-medium text-amber-300">
                    Gerente do {employee.floor}º Andar
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {employee.role} · {employee.floor}º Andar · ID Visual {employee.appearance.immutableId} (Imutável)
              </p>
              <p className="text-xs text-cyan-300 mt-1">{bubbleStatus}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={`Fechar ficha de ${employee.name}`}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 min-w-[40px] min-h-[40px] flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status & Controls Bar */}
        <div className="px-4 sm:px-5 py-3 bg-[#111722] border-b border-slate-800 flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block">Experiência</span>
              <span className="font-mono font-semibold text-slate-100">
                Nível {employee.experienceLevel}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Produtividade Real</span>
              <span className="font-mono font-semibold text-emerald-400">
                {employee.productivity}%
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Autonomia</span>
              <select
                aria-label="Nível de autonomia"
                value={employee.autonomyLevel}
                onChange={(e) =>
                  onChangeAutonomy(employee.id, Number(e.target.value) as AutonomyLevel)
                }
                className="mt-0.5 w-full rounded bg-[#0B0F14] border border-slate-700 px-2 py-1 text-xs text-slate-100"
              >
                <option value={1}>1 · Assistido</option>
                <option value={2}>2 · Semiautônomo</option>
                <option value={3}>3 · Autônomo</option>
              </select>
            </div>
          </div>

          {/* Animation & Conversation Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onStartConversation(employee.id, null)}
              className={`px-2.5 py-1.5 rounded text-xs font-medium border cursor-pointer ${
                employee.animationState === 'working'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-[#0B0F14] border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              Trabalhar no PC
            </button>
            <button
              type="button"
              onClick={() => onSetAnimationState(employee.id, 'thinking')}
              className={`px-2.5 py-1.5 rounded text-xs font-medium border cursor-pointer ${
                employee.animationState === 'thinking'
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                  : 'bg-[#0B0F14] border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              Pensar
            </button>
            <button
              type="button"
              onClick={() => onSetAnimationState(employee.id, 'resting')}
              className={`px-2.5 py-1.5 rounded text-xs font-medium border cursor-pointer ${
                employee.animationState === 'resting'
                  ? 'bg-slate-600/30 border-slate-400 text-slate-200'
                  : 'bg-[#0B0F14] border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              Descansar
            </button>

            <div className="flex items-center gap-1.5 ml-auto">
              <select
                aria-label="Selecionar colega para conversar"
                value={partnerId || sameFloorPeers[0]?.id || ''}
                onChange={(e) => setPartnerId(e.target.value)}
                className="rounded bg-[#0B0F14] border border-slate-700 px-2 py-1.5 text-xs text-slate-200"
              >
                {sameFloorPeers.map((peer) => (
                  <option key={peer.id} value={peer.id}>
                    {peer.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  onStartConversation(
                    employee.id,
                    partnerId || sameFloorPeers[0]?.id || null
                  )
                }
                className="px-2.5 py-1.5 rounded bg-violet-500/20 border border-violet-500/50 text-violet-200 hover:bg-violet-500/30 text-xs font-medium cursor-pointer whitespace-nowrap"
              >
                Conversar
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-4 sm:px-5 pt-3 border-b border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'chat'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Conversar com Agente
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'tasks'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Tarefas &amp; Delegação ({empTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('capabilities')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'capabilities'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Habilidades &amp; Canais
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {activeTab === 'chat' && (
            <div className="flex flex-col h-full gap-3">
              {!geminiConfigured && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>
                    Configure GEMINI_API_KEY nos segredos do servidor para conversar em tempo real com este agente.
                  </span>
                </div>
              )}

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {employee.conversationHistory.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    Nenhuma conversa registrada. Envie uma instrução real para {employee.name}.
                  </p>
                ) : (
                  employee.conversationHistory.map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-lg p-3 text-xs leading-relaxed ${
                        m.sender === 'ceo'
                          ? 'bg-emerald-950/40 border border-emerald-500/30 text-slate-100 ml-8'
                          : 'bg-[#121824] border border-slate-800 text-slate-200 mr-8'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span className="font-semibold text-slate-300">
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
                    </div>
                  ))
                )}
              </div>

              {chatError && (
                <p className="text-xs text-red-400">{chatError}</p>
              )}

              <form onSubmit={handleSendChat} className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={`Falar com ${employee.name}...`}
                  className="flex-1 rounded-lg bg-[#090D12] border border-slate-700 px-3 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-xs cursor-pointer shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{chatLoading ? 'Enviando' : 'Enviar'}</span>
                </button>
              </form>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <form
                onSubmit={handleDelegate}
                className="rounded-lg border border-slate-800 bg-[#111722] p-3 space-y-2.5"
              >
                <span className="text-xs font-semibold text-slate-200 block">
                  Determinar tarefa real para {employee.name}
                </span>
                <p className="text-[11px] text-slate-400">
                  O funcionário solicitará permissão ao superior e aguardará o canal oficial conectado antes de executar.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Título da tarefa..."
                    className="flex-1 rounded bg-[#090D12] border border-slate-700 px-3 py-2 text-xs text-slate-100"
                  />
                  <select
                    value={effectiveChannelId}
                    onChange={(e) => setSelectedChannelId(e.target.value as ChannelId)}
                    aria-label="Canal exigido"
                    className="rounded bg-[#090D12] border border-slate-700 px-2.5 py-2 text-xs text-slate-100"
                  >
                    {channels.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.status === 'connected' ? 'Conectado' : 'Off'})
                      </option>
                    ))}
                  </select>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                    aria-label="Prioridade da tarefa"
                    className="rounded bg-[#090D12] border border-slate-700 px-2.5 py-2 text-xs text-slate-100"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                  </select>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs cursor-pointer whitespace-nowrap"
                  >
                    Determinar
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                {empTasks.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    Nenhuma tarefa real atribuída no momento.
                  </p>
                ) : (
                  empTasks.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-lg border border-slate-800 bg-[#111722] p-3 flex items-start justify-between gap-3"
                    >
                      <div>
                        <p className="text-xs font-semibold text-slate-100">{t.title}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Estado: {t.status} · Permissão: {t.permissionStatus} · Prazo: {t.dueDate}
                        </p>
                      </div>
                      <CheckCircle2
                        className={`w-4 h-4 shrink-0 ${
                          t.status === 'concluida' ? 'text-emerald-400' : 'text-slate-600'
                        }`}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'capabilities' && (
            <div className="space-y-4 text-xs">
              <div className="rounded-lg border border-slate-800 bg-[#111722] p-3">
                <p className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Personalidade &amp; Instruções</span>
                </p>
                <p className="text-slate-300">{employee.personality}</p>
                <p className="text-slate-400 mt-1.5">{employee.instructions}</p>
              </div>

              <div>
                <p className="font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Habilidades Mantidas ({empSkills.length})</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {empSkills.map((sk) => (
                    <div
                      key={sk.id}
                      className="rounded-lg border border-slate-800 bg-[#111722] p-2.5"
                    >
                      <p className="font-semibold text-emerald-300">{sk.name}</p>
                      <p className="text-slate-400 mt-0.5">{sk.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-violet-400" />
                  <span>Ferramentas Autorizadas ({empTools.length})</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {empTools.map((tl) => (
                    <div
                      key={tl.id}
                      className="rounded-lg border border-slate-800 bg-[#111722] p-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-slate-100">{tl.name}</p>
                        {tl.requiresApprovalForExternal && (
                          <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-slate-400 mt-0.5">{tl.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
