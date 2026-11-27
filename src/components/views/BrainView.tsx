import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Brain, Cpu, Download, GitBranch, Layers, Lock, ShieldCheck } from 'lucide-react';
import {
  buildCompactMentalityMetadata,
  estimateMentalityBytes,
} from '../../core/brainRules';
import type { NexusState } from '../../types/nexus';
import { Brain3DViewport } from '../Brain3DViewport';

interface BrainViewProps {
  state: NexusState;
  onUpdateLimit: (nextLimit: number) => void;
}

export const BrainView: React.FC<BrainViewProps> = ({ state, onUpdateLimit }) => {
  const [selectedKey, setSelectedKey] = useState<string | null>('core');
  const [exportSuccessNotice, setExportSuccessNotice] = useState<string | null>(null);
  const [latestSurgeId, setLatestSurgeId] = useState<string | null>(null);
  const prevLenRef = useRef(state.brain.nodes.length);
  const lastSurgedIdRef = useRef<string | null>(null);

  useEffect(() => {
    const newest = state.brain.nodes[0];
    if (!newest) {
      prevLenRef.current = state.brain.nodes.length;
      return;
    }
    const grew = state.brain.nodes.length > prevLenRef.current;
    const isFresh = Date.now() - Date.parse(newest.createdAt) < 12000;
    if ((grew || isFresh) && lastSurgedIdRef.current !== newest.id) {
      lastSurgedIdRef.current = newest.id;
      setLatestSurgeId(newest.id);
      const timer = window.setTimeout(() => {
        setLatestSurgeId((cur) => (cur === newest.id ? null : cur));
      }, 2400);
      prevLenRef.current = state.brain.nodes.length;
      return () => window.clearTimeout(timer);
    }
    prevLenRef.current = state.brain.nodes.length;
  }, [state.brain.nodes]);

  const metadataBytes = useMemo(() => estimateMentalityBytes(state), [state]);
  const kbFormatted = (metadataBytes / 1024).toFixed(2);
  const reachedLimit = state.brain.nodes.length >= state.brain.maxConnections;
  const progressPct = Math.min(
    100,
    Math.round(
      (state.brain.nodes.length / Math.max(1, state.brain.maxConnections)) * 100
    )
  );

  const handleExportMentality = () => {
    const compact = buildCompactMentalityMetadata(state);
    const json = JSON.stringify(compact);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-mind-mentalidade-${state.brain.nodes.length}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    const exportedKb = (new TextEncoder().encode(json).length / 1024).toFixed(2);
    setExportSuccessNotice(
      `Mentalidade exportada em ${exportedKb} KB (${state.brain.nodes.length} sinapses compactadas).`
    );
  };

  const selectedSkill = useMemo(() => {
    if (!selectedKey?.startsWith('skill:')) return null;
    const id = selectedKey.slice('skill:'.length);
    return state.skills.find((s) => s.id === id) ?? null;
  }, [selectedKey, state.skills]);

  const selectedThought = useMemo(() => {
    if (!selectedKey?.startsWith('thought:')) return null;
    const id = selectedKey.slice('thought:'.length);
    return state.brain.nodes.find((n) => n.id === id) ?? null;
  }, [selectedKey, state.brain.nodes]);

  const selectedSkillOwners = useMemo(() => {
    if (!selectedSkill) return [];
    return state.employees.filter((e) => e.skillIds.includes(selectedSkill.id));
  }, [selectedSkill, state.employees]);

  const selectedSkillThoughts = useMemo(() => {
    if (!selectedSkill) return [];
    return state.brain.nodes.filter((n) => n.skillId === selectedSkill.id);
  }, [selectedSkill, state.brain.nodes]);

  const sourceLabel: Record<string, string> = {
    conversation: 'Diálogo entre Agentes',
    task_execution: 'Execução Real de Tarefa',
    core_directive: 'Diretriz NEXUS CORE',
    supervisor_review: 'Alinhamento & Permissão',
  };

  return (
    <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden bg-[#070A10]">
      {/* Interactive 3D Planetary Web */}
      <div className="relative flex-1 min-h-[380px] lg:min-h-0">
        <Brain3DViewport
          skills={state.skills}
          employees={state.employees}
          nodes={state.brain.nodes}
          maxConnections={state.brain.maxConnections}
          metadataBytes={metadataBytes}
          graphicsQuality={state.settings.graphicsQuality}
          selectedKey={selectedKey}
          onSelectKey={(k) => setSelectedKey(k)}
          onUpdateLimit={onUpdateLimit}
          onExportMentality={handleExportMentality}
        />
      </div>

      {/* Read-Only Inspector & Evolutionary Neural Ledger */}
      <aside className="w-full lg:w-96 shrink-0 border-t lg:border-t-0 lg:border-l border-slate-800 bg-[#0B0F17] flex flex-col max-h-[46vh] lg:max-h-none overflow-hidden">
        <div className="px-4 py-3.5 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center shrink-0">
              <Brain className="w-4 h-4 text-cyan-300" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display font-bold text-sm text-slate-100 truncate">
                Nexus Mind
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                Núcleo neural evolutivo autônomo
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-300 shrink-0">
            <Lock className="w-3 h-3" />
            Leitura
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Evolution Capacity & KB Footprint */}
          <div className="rounded-xl border border-slate-800 bg-[#0F141E] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Conexões Neurais</span>
              <motion.span
                key={state.brain.nodes.length}
                initial={{ scale: 1.18, color: '#22d3ee' }}
                animate={{ scale: 1, color: '#f1f5f9' }}
                transition={{ type: 'spring', stiffness: 340, damping: 22 }}
                className="font-mono font-semibold tabular-nums"
              >
                {state.brain.nodes.length} / {state.brain.maxConnections}
              </motion.span>
            </div>
            <div className="h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
              <motion.div
                className={`h-full ${
                  reachedLimit ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                initial={false}
                animate={{
                  width: `${progressPct}%`,
                  opacity: latestSurgeId ? [1, 0.72, 1] : 1,
                }}
                transition={{
                  width: { type: 'spring', stiffness: 180, damping: 24 },
                  opacity: { duration: 0.9, repeat: latestSurgeId ? 1 : 0 },
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="rounded-lg bg-[#090D14] border border-slate-800/80 px-2.5 py-2">
                <div className="text-slate-400">Metadado Compacto</div>
                <div className="font-mono font-semibold text-cyan-300 mt-0.5">
                  {kbFormatted} KB
                </div>
              </div>
              <div className="rounded-lg bg-[#090D14] border border-slate-800/80 px-2.5 py-2">
                <div className="text-slate-400">Ruído Filtrado</div>
                <div className="font-mono font-semibold text-slate-200 mt-0.5">
                  {state.brain.filteredOutCount} triviais
                </div>
              </div>
            </div>

            {reachedLimit && (
              <button
                type="button"
                onClick={handleExportMentality}
                className="w-full mt-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Exportar Mentalidade ({kbFormatted} KB)</span>
              </button>
            )}

            {exportSuccessNotice && (
              <p className="text-[11px] text-emerald-300">{exportSuccessNotice}</p>
            )}
          </div>

          {/* Selected Node Read-Only Inspector */}
          <motion.div
            key={selectedKey ?? 'core'}
            initial={{ opacity: 0.6, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl border border-slate-800 bg-[#0F141E] p-3.5 space-y-2.5"
          >
            {selectedThought ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                    Ramificação Neural
                  </span>
                  <span className="font-mono text-[11px] text-emerald-300">
                    {Math.round(selectedThought.importance * 100)}% relevância
                  </span>
                </div>
                <h3 className="font-semibold text-sm text-white">
                  {selectedThought.concept}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedThought.essence}
                </p>
                <div className="pt-2 border-t border-slate-800/80 space-y-1 text-[11px] text-slate-400">
                  <div>
                    Origem:{' '}
                    <span className="text-slate-200">
                      {sourceLabel[selectedThought.sourceType] ?? selectedThought.sourceType}
                    </span>
                  </div>
                  <div>
                    Habilidade raiz:{' '}
                    <span className="text-emerald-300">
                      {state.skills.find((s) => s.id === selectedThought.skillId)?.name ??
                        selectedThought.skillId}
                    </span>
                  </div>
                  <div>
                    Agentes:{' '}
                    <span className="text-slate-200">
                      {selectedThought.actorIds
                        .map(
                          (aid) =>
                            state.employees.find((e) => e.id === aid)?.name ?? aid
                        )
                        .join(' & ')}
                    </span>
                  </div>
                </div>
              </>
            ) : selectedSkill ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                    Nó de Habilidade
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">
                    {selectedSkillThoughts.length} ramificações
                  </span>
                </div>
                <h3 className="font-semibold text-sm text-white">
                  {selectedSkill.name}
                </h3>
                <p className="text-xs text-slate-300">{selectedSkill.description}</p>
                <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                  Especialistas:{' '}
                  <span className="text-slate-200">
                    {selectedSkillOwners.map((e) => e.name).join(', ') || 'Equipe'}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-cyan-300">
                  <Cpu className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Núcleo Central · Nexus Mind
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Esfera central conectada às {state.skills.length} habilidades reais dos
                  funcionários. Gire o planeta, dê zoom ou arraste qualquer bolinha para
                  reorganizar a teia 3D.
                </p>
                <div className="flex items-start gap-2 pt-1 text-[11px] text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Novas conexões surgem automaticamente quando agentes conversam sobre
                    habilidades, obtêm autorizações ou concluem tarefas reais. Conversas
                    vazias são descartadas.
                  </span>
                </div>
              </>
            )}
          </motion.div>

          {/* Read-Only Autonomous Ramifications Timeline */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-300">
                <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
                Ramificações Capturadas
              </span>
              <span className="inline-flex items-center gap-1 text-[11px]">
                <Layers className="w-3 h-3" />
                {state.brain.nodes.length}
              </span>
            </div>

            {state.brain.nodes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 bg-[#090D14] p-4 text-center text-xs text-slate-400">
                0 conexões geradas até o momento. Inicie uma conversa entre agentes ou
                execute uma tarefa real para o Nexus Mind criar ramificações
                autonomamente.
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  {state.brain.nodes.slice(0, 30).map((node) => {
                    const key = `thought:${node.id}`;
                    const active = selectedKey === key;
                    const isSurging = latestSurgeId === node.id;
                    return (
                      <motion.button
                        key={node.id}
                        layout
                        type="button"
                        initial={{ opacity: 0, y: -12, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.94 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                        onClick={() => setSelectedKey(key)}
                        className={`w-full text-left rounded-lg border p-2.5 transition-colors cursor-pointer ${
                          isSurging ? 'nexus-thought-surge' : ''
                        } ${
                          active
                            ? 'border-cyan-500/70 bg-cyan-500/10'
                            : 'border-slate-800 bg-[#0F141E] hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-100 truncate">
                            {node.concept}
                          </span>
                          <span className="font-mono text-[10px] text-emerald-300 shrink-0">
                            {Math.round(node.importance * 100)}%
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                          {node.essence}
                        </p>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};
