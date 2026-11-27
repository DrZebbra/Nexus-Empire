import React, { useEffect } from 'react';
import { ArrowRight, Building2, Cpu, Layers } from 'lucide-react';

interface EntryScreenProps {
  onStart: () => void;
  geminiConfigured: boolean;
}

export const EntryScreen: React.FC<EntryScreenProps> = ({
  onStart,
  geminiConfigured,
}) => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onStart]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-[#070A0F]/85"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nexus-entry-title"
    >
      <div className="w-full max-w-2xl rounded-xl border border-slate-700/80 bg-[#0D1219] p-6 sm:p-10 shadow-2xl">
        {/* Custom Inline SVG Title Lockup */}
        <div className="flex items-center gap-4 mb-6">
          <svg
            viewBox="0 0 56 56"
            className="w-12 h-12 shrink-0"
            aria-hidden="true"
          >
            <rect
              x="2"
              y="2"
              width="52"
              height="52"
              rx="10"
              fill="#0B131D"
              stroke="#10B981"
              strokeWidth="2"
            />
            <polygon
              points="28,10 44,19 44,37 28,46 12,37 12,19"
              fill="none"
              stroke="#06B6D4"
              strokeWidth="2"
            />
            <polygon points="28,17 37,22 37,34 28,39 19,34 19,22" fill="#8B5CF6" opacity="0.85" />
            <circle cx="28" cy="28" r="4" fill="#10B981" />
          </svg>
          <div>
            <h1
              id="nexus-entry-title"
              className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-50"
            >
              NEXUS EMPIRE
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Construa. Gerencie. Evolua.
            </p>
          </div>
        </div>

        <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-6">
          Assuma o comando como CEO de uma corporação 3D isométrica de dois andares.
          Coordene 12 especialistas autônomos entre Produtos &amp; Desenvolvimento (1º Andar)
          e Marketing &amp; Comercial (2º Andar) através do núcleo central NEXUS CORE.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-7 text-xs text-slate-300">
          <div className="rounded-lg border border-slate-800 bg-[#111822] p-3">
            <div className="flex items-center gap-2 font-semibold text-emerald-400 mb-1">
              <Building2 className="w-4 h-4" />
              <span>2 Andares 3D</span>
            </div>
            <p className="text-slate-400">
              Prédio interativo com Quadro Visual de Tarefas e PC Histórico Azul &amp; Vermelho.
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-[#111822] p-3">
            <div className="flex items-center gap-2 font-semibold text-cyan-400 mb-1">
              <Layers className="w-4 h-4" />
              <span>12 Avatares Únicos</span>
            </div>
            <p className="text-slate-400">
              Modelos 3D automáticos com identidade imutável, trabalho e conversação direcionada.
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-[#111822] p-3">
            <div className="flex items-center gap-2 font-semibold text-violet-400 mb-1">
              <Cpu className="w-4 h-4" />
              <span>NEXUS CORE</span>
            </div>
            <p className="text-slate-400">
              {geminiConfigured
                ? 'IA Gemini ativa no servidor com Pesquisa Google, permissões hierárquicas e controle de tokens.'
                : 'Conecte GEMINI_API_KEY e canais oficiais para executar tarefas reais com governança.'}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            type="button"
            data-start="true"
            onClick={onStart}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>Entrar no Escritório 3D</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-500">
            Atalho: Enter ou Espaço para iniciar · Arraste para girar · Toque nos avatares
          </span>
        </div>
      </div>
    </div>
  );
};
