import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { NexusState } from '../types/nexus';

const LOCAL_STORAGE_KEY = 'nexus_empire_state_v1';

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

export function loadPersistedNexusState(fallback: NexusState): NexusState {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<NexusState>;
    if (!parsed || !Array.isArray(parsed.employees) || parsed.employees.length !== 12) {
      return fallback;
    }
    return {
      ...fallback,
      ...parsed,
      // Enforce immutable 3D character visual specs from seedData
      employees: fallback.employees.map((seedEmp) => {
        const saved = parsed.employees?.find((e) => e.id === seedEmp.id);
        if (!saved) return seedEmp;
        return {
          ...seedEmp,
          ...saved,
          appearance: seedEmp.appearance, // Always immutable
        };
      }),
    };
  } catch {
    return fallback;
  }
}

export function saveLocalNexusState(state: NexusState): void {
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function resetLocalNexusState(): void {
  try {
    window.localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export const SUPABASE_ENTITY_TABLES = [
  'companies',
  'profiles',
  'departments',
  'employees',
  'agent_profiles',
  'skills',
  'employee_skills',
  'functions',
  'tools',
  'tasks',
  'task_steps',
  'approvals',
  'conversations',
  'messages',
  'products',
  'suppliers',
  'campaigns',
  'integrations',
  'activity_logs',
  'company_settings',
] as const;

export const SUPABASE_SCHEMA_SQL = `-- NEXUS EMPIRE — Schema PostgreSQL + RLS preparado para Supabase
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

create table if not exists tasks (
  id text primary key,
  company_id uuid references companies(id) on delete cascade,
  title text not null,
  description text,
  assignee_id text references employees(id),
  department_id text references departments(id),
  priority text not null,
  status text not null,
  requires_approval boolean default false,
  created_at timestamptz default now()
);

-- Habilitar Row Level Security (RLS) por empresa em todas as tabelas
alter table companies enable row level security;
alter table employees enable row level security;
alter table tasks enable row level security;
`;
