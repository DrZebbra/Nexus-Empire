import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { NexusState } from '../types/nexus';

const LOCAL_STORAGE_KEY = 'nexus_empire_real_v2';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let supabaseClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      supabaseUrl.startsWith('http') &&
      supabaseAnonKey.length > 20
  );
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!supabaseClient && supabaseUrl && supabaseAnonKey) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseClient;
}

function ensureUniqueIds<T extends { id: string }>(
  items: T[] | undefined,
  fallback: T[]
): T[] {
  if (!Array.isArray(items)) return fallback;
  const seen = new Set<string>();
  return items.map((item, idx) => {
    const rawId = typeof item?.id === 'string' && item.id ? item.id : `item_${idx}`;
    if (!seen.has(rawId)) {
      seen.add(rawId);
      return item;
    }
    let candidate = `${rawId}_u${idx}`;
    let n = idx + 1;
    while (seen.has(candidate)) {
      candidate = `${rawId}_u${n++}`;
    }
    seen.add(candidate);
    return { ...item, id: candidate };
  });
}

export function mergeWithImmutableSeed(
  parsed: Partial<NexusState>,
  fallback: NexusState
): NexusState {
  return {
    ...fallback,
    ...parsed,
    settings: {
      ...fallback.settings,
      ...(parsed.settings ?? {}),
    },
    tokenPolicy: {
      ...fallback.tokenPolicy,
      ...(parsed.tokenPolicy ?? {}),
    },
    channels: fallback.channels.map((seedCh) => {
      const savedCh = parsed.channels?.find((c) => c.id === seedCh.id);
      return savedCh ? { ...seedCh, ...savedCh } : seedCh;
    }),
    tasks: ensureUniqueIds(parsed.tasks, fallback.tasks),
    approvals: ensureUniqueIds(parsed.approvals, fallback.approvals),
    tokenLogs: ensureUniqueIds(parsed.tokenLogs, fallback.tokenLogs),
    historicalLedger: ensureUniqueIds(parsed.historicalLedger, fallback.historicalLedger),
    activityLogs: ensureUniqueIds(parsed.activityLogs, fallback.activityLogs),
    nexusCoreMessages: ensureUniqueIds(parsed.nexusCoreMessages, fallback.nexusCoreMessages),
    interDeptRequests: ensureUniqueIds(parsed.interDeptRequests, fallback.interDeptRequests),
    products: ensureUniqueIds(parsed.products, fallback.products),
    brain: {
      ...fallback.brain,
      ...(parsed.brain ?? {}),
      nodes: ensureUniqueIds(parsed.brain?.nodes, fallback.brain.nodes),
    },
    // Preserve skills, tools & immutable 3D character visual specs
    skills: fallback.skills,
    tools: fallback.tools,
    employees: fallback.employees.map((seedEmp) => {
      const saved = parsed.employees?.find((e) => e.id === seedEmp.id);
      if (!saved) return seedEmp;
      return {
        ...seedEmp,
        ...saved,
        conversationHistory: ensureUniqueIds(
          saved.conversationHistory,
          seedEmp.conversationHistory
        ),
        skillIds: seedEmp.skillIds,
        authorizedToolIds: seedEmp.authorizedToolIds,
        appearance: seedEmp.appearance, // Always immutable
      };
    }),
  };
}

export function loadPersistedNexusState(fallback: NexusState): NexusState {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<NexusState>;
    if (!parsed || !Array.isArray(parsed.employees) || parsed.employees.length !== 12) {
      return fallback;
    }
    return mergeWithImmutableSeed(parsed, fallback);
  } catch {
    return fallback;
  }
}

export function saveLocalNexusState(state: NexusState): void {
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export function resetLocalNexusState(): void {
  try {
    window.localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export async function loadCloudNexusState(
  companyId: string,
  fallback: NexusState
): Promise<{
  connected: boolean;
  state: NexusState | null;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('nexus_workspace_state')
        .select('state_json')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) {
        return { connected: true, state: null, error: error.message };
      }
      if (data?.state_json) {
        return {
          connected: true,
          state: mergeWithImmutableSeed(data.state_json as Partial<NexusState>, fallback),
        };
      }
      return { connected: true, state: null };
    } catch (err) {
      return {
        connected: true,
        state: null,
        error: err instanceof Error ? err.message : 'Erro ao ler Supabase.',
      };
    }
  }

  // Fallback to server-side Supabase proxy if configured via SUPABASE_URL
  try {
    const res = await fetch(`/api/nexus/supabase/state/${encodeURIComponent(companyId)}`);
    if (res.status === 404) {
      return { connected: false, state: null };
    }
    const payload = await res.json();
    if (payload.configured === false) {
      return { connected: false, state: null };
    }
    if (!res.ok) {
      return { connected: true, state: null, error: payload.message };
    }
    if (payload.data) {
      return {
        connected: true,
        state: mergeWithImmutableSeed(payload.data as Partial<NexusState>, fallback),
      };
    }
    return { connected: true, state: null };
  } catch {
    return { connected: false, state: null };
  }
}

export async function saveCloudNexusState(
  state: NexusState
): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { error } = await client.from('nexus_workspace_state').upsert(
        {
          company_id: state.companyId,
          state_json: state,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'company_id' }
      );
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Erro ao salvar no Supabase.',
      };
    }
  }

  try {
    const res = await fetch('/api/nexus/supabase/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId: state.companyId, state }),
    });
    if (res.status === 404) {
      return { ok: false };
    }
    const payload = await res.json();
    if (payload.configured === false) {
      return { ok: false };
    }
    if (!res.ok) {
      return { ok: false, error: payload.message };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Erro de rede ao salvar no Supabase.',
    };
  }
}

export const SUPABASE_ENTITY_TABLES = [
  'nexus_workspace_state',
  'companies',
  'profiles',
  'departments',
  'employees',
  'skills',
  'functions',
  'tools',
  'channel_connections',
  'token_usage_logs',
  'tasks',
  'task_steps',
  'approvals',
  'historical_ledger',
  'conversations',
  'messages',
  'products',
  'suppliers',
  'campaigns',
  'activity_logs',
  'brain_nodes',
] as const;

export const SUPABASE_SCHEMA_SQL = `-- NEXUS EMPIRE — Schema PostgreSQL + RLS para Supabase (Dados Reais)
create table if not exists nexus_workspace_state (
  company_id text primary key,
  state_json jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id),
  company_id uuid references companies(id) on delete cascade,
  full_name text not null,
  role text default 'ceo'
);

create table if not exists departments (
  id text primary key,
  company_id uuid references companies(id) on delete cascade,
  name text not null,
  floor int not null,
  theme_color text not null
);

create table if not exists employees (
  id text primary key,
  company_id uuid references companies(id) on delete cascade,
  department_id text references departments(id),
  name text not null,
  role text not null,
  floor int not null,
  is_floor_manager boolean default false,
  autonomy_level int default 2,
  immutable_visual_id text not null
);

create table if not exists channel_connections (
  id text primary key,
  company_id text not null,
  name text not null,
  status text not null default 'disconnected',
  connected_at timestamptz
);

create table if not exists tasks (
  id text primary key,
  company_id text not null,
  title text not null,
  description text,
  assignee_id text references employees(id),
  department_id text references departments(id),
  priority text not null,
  status text not null,
  permission_status text not null,
  required_channel_ids text[] default '{}',
  tokens_used int default 0,
  created_at timestamptz default now()
);

create table if not exists token_usage_logs (
  id text primary key,
  company_id text not null,
  actor_name text not null,
  task_id text,
  prompt_tokens int not null,
  candidates_tokens int not null,
  total_tokens int not null,
  created_at timestamptz default now()
);

create table if not exists brain_nodes (
  id text primary key,
  company_id text not null,
  parent_id text,
  skill_id text not null,
  actor_ids text[] default '{}',
  concept text not null,
  essence text not null,
  importance numeric not null,
  created_at timestamptz default now()
);

-- Habilitar Row Level Security (RLS)
alter table nexus_workspace_state enable row level security;
alter table companies enable row level security;
alter table employees enable row level security;
alter table tasks enable row level security;
alter table brain_nodes enable row level security;
`;
