import React from 'react';
import {
  Activity,
  BarChart3,
  Bot,
  Box,
  Brain,
  Building2,
  CheckSquare,
  Cpu,
  DollarSign,
  FileText,
  Globe,
  Megaphone,
  Settings,
  ShoppingBag,
  Users,
  Workflow,
  X,
} from 'lucide-react';
import type { NavSectionId } from '../types/nexus';

interface SidebarProps {
  activeSection: NavSectionId;
  onSelectSection: (id: NavSectionId) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  pendingApprovalsCount: number;
  pendingTasksCount: number;
  brainConnectionsCount?: number;
}

export const NAV_ITEMS: Array<{
  id: NavSectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'hq', label: 'Painel Principal', icon: Building2 },
  { id: 'brain', label: 'Cérebro', icon: Brain },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'employees', label: 'Funcionários', icon: Users },
  { id: 'departments', label: 'Departamentos', icon: Activity },
  { id: 'products', label: 'Produtos', icon: Box },
  { id: 'marketing', label: 'Marketing', icon: Megaphone },
  { id: 'stores', label: 'Lojas Online', icon: ShoppingBag },
  { id: 'sites', label: 'Sites', icon: Globe },
  { id: 'tasks', label: 'Central de Tarefas', icon: CheckSquare },
  { id: 'automations', label: 'Automações', icon: Workflow },
  { id: 'finance', label: 'Financeiro', icon: DollarSign },
  { id: 'functions', label: 'Biblioteca de Funções', icon: Cpu },
  { id: 'reports', label: 'Relatórios', icon: FileText },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  mobileOpen,
  onCloseMobile,
  pendingApprovalsCount,
  pendingTasksCount,
  brainConnectionsCount = 0,
}) => {
  const handleSelect = (id: NavSectionId) => {
    onSelectSection(id);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex flex-col h-full bg-[#0C1016] border-r border-slate-800/90 w-64">
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="font-display font-bold text-sm tracking-tight text-slate-100 whitespace-nowrap truncate">
            NEXUS EMPIRE
          </span>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Fechar menu lateral"
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 min-w-[40px] min-h-[40px] flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav
        aria-label="Navegação principal"
        className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          const badgeCount =
            item.id === 'tasks'
              ? pendingTasksCount
              : item.id === 'dashboard'
              ? pendingApprovalsCount
              : item.id === 'brain'
              ? brainConnectionsCount
              : 0;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left min-h-[42px] cursor-pointer ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/35'
                  : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/70 border border-transparent'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </span>
              {badgeCount > 0 && (
                <span className="font-mono text-[11px] tabular-nums text-cyan-300 shrink-0">
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop persistent sidebar */}
      <aside className="hidden lg:block shrink-0 h-full">{navContent}</aside>

      {/* Mobile collapsible drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <button
            type="button"
            aria-label="Fechar fundo do menu"
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/70"
          />
          <aside className="relative z-10 h-full">{navContent}</aside>
        </div>
      )}
    </>
  );
};
