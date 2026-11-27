import React from 'react';
import { BookOpen, CheckCircle2, Cpu, X } from 'lucide-react';
import type { HistoricalLedgerEntry } from '../types/nexus';

interface CoreComputerModalProps {
  open: boolean;
  onClose: () => void;
  entries: HistoricalLedgerEntry[];
}

export const CoreComputerModal: React.FC<CoreComputerModalProps> = ({
  open,
  onClose,
  entries,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75"
      role="dialog"
      aria-modal="true"
      aria-labelledby="core-computer-title"
    >
      <div className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-xl border border-blue-500/50 bg-[#0C1018] shadow-2xl overflow-hidden">
        {/* Dual Red & Blue Header representing the Heart of the Operation */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-800 bg-gradient-to-r from-blue-950/70 via-[#0F141E] to-red-950/70">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 p-2 rounded-lg bg-[#090D14] border border-blue-500/40">
              <span className="w-2.5 h-5 rounded-xs bg-blue-500" />
              <span className="w-2.5 h-5 rounded-xs bg-red-500" />
            </div>
            <div>
              <h2
                id="core-computer-title"
                className="font-display text-base sm:text-lg font-bold text-slate-100"
              >
                Computador Central Azul &amp; Vermelho — Livro Histórico
              </h2>
              <p className="text-xs text-slate-300">
                Coração da operação Nexus · Registro definitivo de todas as entregas concluídas pelos gerentes de andar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar Livro Histórico"
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
            <span className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              <span>Registros arquivados: <strong className="font-mono text-slate-200">{entries.length}</strong></span>
            </span>
            <span className="flex items-center gap-1.5 text-red-300">
              <Cpu className="w-3.5 h-3.5" />
              <span>Memória Permanente do Escritório</span>
            </span>
          </div>

          {entries.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              Nenhuma entrega registrada no Computador Central ainda. Conclua uma tarefa para que o gerente do andar grave aqui.
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-slate-800 bg-[#111722] p-4 flex flex-col gap-1.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <h3 className="text-sm font-semibold text-slate-100">
                      {entry.taskTitle}
                    </h3>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">
                    {new Date(entry.recordedAt).toLocaleString('pt-BR')}
                  </span>
                </div>
                <p className="text-xs text-slate-300">{entry.outcomeSummary}</p>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                  <span>{entry.floor}º Andar</span>
                  <span aria-hidden="true">·</span>
                  <span>Executado por: {entry.executedByEmployeeName}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-blue-300">
                    Arquivado por: {entry.loggedByManagerName}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
