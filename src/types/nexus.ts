export type DepartmentId = 'dept_products' | 'dept_marketing';

export type FloorNumber = 1 | 2;

export type AutonomyLevel = 1 | 2 | 3;

export type CharacterAnimationState =
  | 'working'
  | 'walking'
  | 'idle'
  | 'conversing'
  | 'celebrating'
  | 'thinking'
  | 'resting';

export type TaskStatus =
  | 'aguardando'
  | 'planejada'
  | 'em_execucao'
  | 'aguardando_aprovacao'
  | 'concluida'
  | 'falhou'
  | 'cancelada';

export type TaskPriority = 'baixa' | 'media' | 'alta' | 'critica';

export type GraphicsQuality = 'low' | 'medium' | 'high';

export type NavSectionId =
  | 'hq'
  | 'dashboard'
  | 'employees'
  | 'departments'
  | 'products'
  | 'marketing'
  | 'stores'
  | 'sites'
  | 'tasks'
  | 'automations'
  | 'finance'
  | 'functions'
  | 'reports'
  | 'brain'
  | 'settings';

export type ChannelId =
  | 'ch_google_search'
  | 'ch_supabase'
  | 'ch_google_ads'
  | 'ch_meta_ads'
  | 'ch_ecommerce'
  | 'ch_whatsapp';

export type TaskPermissionStatus =
  | 'pending_supervisor'
  | 'pending_ceo'
  | 'approved'
  | 'rejected';

export type HairStyle =
  | 'short_parted'
  | 'bob_cut'
  | 'curly_afro'
  | 'ponytail'
  | 'buzz'
  | 'long_wavy'
  | 'undercut'
  | 'bun'
  | 'spiky'
  | 'side_sweep'
  | 'shoulder_layers'
  | 'fade';

export type AccessoryType =
  | 'glasses'
  | 'headset'
  | 'watch'
  | 'tablet'
  | 'badge_lanyard'
  | 'cap'
  | 'scarf'
  | 'bowtie'
  | 'stylus'
  | 'visor_clip'
  | 'blazer_lapel'
  | 'earpiece';

export interface CharacterAppearanceSpec {
  readonly immutableId: string;
  readonly skinTone: string;
  readonly hairStyle: HairStyle;
  readonly hairColor: string;
  readonly heightScale: number;
  readonly shoulderScale: number;
  readonly outfitPrimary: string;
  readonly outfitSecondary: string;
  readonly pantsColor: string;
  readonly shoeColor: string;
  readonly accessory: AccessoryType;
  readonly accentColor: string;
}

export interface WorkstationLocation {
  floor: FloorNumber;
  x: number;
  z: number;
  deskYaw: number; // Facing angle toward computer monitor
  zoneLabel: string;
}

export interface ConversationMessage {
  id: string;
  sender: 'ceo' | 'employee' | 'nexus_core';
  senderName: string;
  content: string;
  timestamp: string;
  tokensUsed?: number;
  structuredPlan?: {
    targetDepartment: DepartmentId;
    assignedEmployeeId: string;
    subtasks: Array<{
      title: string;
      assigneeId: string;
      priority: TaskPriority;
      requiredChannelIds?: ChannelId[];
    }>;
  };
}

export interface EmployeeProfile {
  id: string;
  name: string;
  role: string;
  departmentId: DepartmentId;
  floor: FloorNumber;
  isFloorManager: boolean;
  personality: string;
  specialty: string;
  instructions: string;
  experienceLevel: number;
  productivity: number; // 0-100 derived strictly from real completed tasks
  autonomyLevel: AutonomyLevel;
  animationState: CharacterAnimationState;
  currentActivityLabel: string;
  conversingWithId: string | null;
  activeWorkflowAction: 'none' | 'board_write' | 'board_complete' | 'core_computer_log';
  workstation: WorkstationLocation;
  appearance: CharacterAppearanceSpec;
  skillIds: string[];
  authorizedToolIds: string[];
  workingMemory: string[];
  conversationHistory: ConversationMessage[];
}

export interface Department {
  id: DepartmentId;
  name: string;
  floor: FloorNumber;
  themeColor: string;
  secondaryColor: string;
  managerId: string;
  description: string;
  zones: string[];
}

export interface SkillDefinition {
  id: string;
  name: string;
  departmentId: DepartmentId;
  description: string;
}

export interface ToolDefinition {
  id: string;
  name: string;
  category: string;
  requiresApprovalForExternal: boolean;
  description: string;
}

export interface ChannelConnection {
  id: ChannelId;
  name: string;
  provider: string;
  description: string;
  status: 'disconnected' | 'connected';
  requiresServerSecret: string;
  officialAuthType: 'gemini_grounding' | 'supabase_rls' | 'oauth_or_api';
  connectedAt: string | null;
  accountLabel?: string;
}

export interface TokenUsagePolicy {
  dailyLimit: number;
  perTaskLimit: number;
  usedTotal: number;
  promptTokensTotal: number;
  completionTokensTotal: number;
  lastResetDate: string;
}

export interface TokenUsageEntry {
  id: string;
  timestamp: string;
  actorName: string;
  taskId?: string;
  action: 'core' | 'agent_chat' | 'task_execution' | 'supervisor_review' | 'brain_distill';
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
  model: string;
}

export interface FunctionParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  required: boolean;
  description: string;
}

export interface LibraryFunction {
  id: string;
  name: string;
  description: string;
  category: string;
  departmentId: DepartmentId;
  responsibleEmployeeId: string;
  requiredSkillIds: string[];
  requiredToolIds: string[];
  parameters: FunctionParameter[];
  permissions: string[];
  minAutonomyLevel: AutonomyLevel;
  active: boolean;
  executionCount: number;
  lastExecutedAt: string | null;
}

export interface TaskStep {
  id: string;
  title: string;
  completed: boolean;
  assigneeId: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  assigneeId: string;
  departmentId: DepartmentId;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: string;
  dueDate: string;
  steps: TaskStep[];
  dependencies: string[];
  result: string | null;
  requiresApproval: boolean;
  isFinancialOrIrreversible: boolean;
  requiredChannelIds: ChannelId[];
  permissionStatus: TaskPermissionStatus;
  supervisorId: string;
  supervisorNote?: string;
  tokensUsed?: number;
  groundingSources?: GroundingSource[];
  executedAt?: string;
  history: Array<{ timestamp: string; actor: string; note: string }>;
}

export interface ApprovalItem {
  id: string;
  title: string;
  description: string;
  requestedByEmployeeId: string;
  departmentId: DepartmentId;
  category: 'finance' | 'publication' | 'task_result' | 'irreversible' | 'channel_permission';
  relatedTaskId?: string;
  stage: 'supervisor' | 'ceo';
  supervisorId: string;
  supervisorApproved: boolean;
  supervisorComment?: string;
  amount?: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface HistoricalLedgerEntry {
  id: string;
  taskId: string;
  taskTitle: string;
  departmentId: DepartmentId;
  floor: FloorNumber;
  loggedByManagerId: string;
  loggedByManagerName: string;
  executedByEmployeeName: string;
  outcomeSummary: string;
  tokensUsed?: number;
  sourcesCount?: number;
  recordedAt: string;
}

export interface ProductItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  costPrice: number;
  salePrice: number;
  marginPercent: number;
  supplierId: string;
  status: 'pesquisa' | 'validado' | 'ativo' | 'pausado';
  specialistId: string;
  stock: number;
}

export interface SupplierItem {
  id: string;
  name: string;
  region: string;
  leadTimeDays: number;
  reliabilityScore: number;
  category: string;
}

export interface CampaignItem {
  id: string;
  name: string;
  channel: string;
  budget: number;
  spent: number;
  conversions: number;
  status: 'rascunho' | 'aguardando_aprovacao' | 'ativa' | 'concluida';
  managerId: string;
  productId?: string;
}

export interface StoreItem {
  id: string;
  name: string;
  domain: string;
  platform: string;
  activeProductsCount: number;
  monthlyRevenue: number;
  status: 'online' | 'manutencao';
  managerId: string;
}

export interface SiteItem {
  id: string;
  name: string;
  url: string;
  purpose: string;
  conversionRate: number;
  status: 'publicado' | 'homologacao';
  developerId: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  actionFunctionId: string;
  departmentId: DepartmentId;
  active: boolean;
  runsCount: number;
  requiresApproval: boolean;
}

export interface FinancialRecord {
  id: string;
  type: 'receita' | 'despesa';
  description: string;
  amount: number;
  departmentId: DepartmentId;
  date: string;
  approved: boolean;
}

export interface InterDepartmentRequest {
  id: string;
  fromDepartmentId: DepartmentId;
  toDepartmentId: DepartmentId;
  fromEmployeeId: string;
  toEmployeeId: string;
  title: string;
  details: string;
  status: 'pendente' | 'aprovada' | 'em_andamento' | 'concluida' | 'rejeitada';
  createdAt: string;
}

export interface IntegrationConfig {
  id: string;
  name: string;
  provider: string;
  category: 'ai' | 'database' | 'commerce' | 'marketing' | 'automation';
  configured: boolean;
  mode: 'disconnected' | 'connected';
  description: string;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  departmentId: DepartmentId | 'nexus_core';
  action: string;
  detail: string;
  source: 'system' | 'ai_execution';
}

export interface CompanySettings {
  companyName: string;
  ceoName: string;
  graphicsQuality: GraphicsQuality;
  simulationSpeed: 1 | 2;
  requireApprovalForFinancial: boolean;
  requireApprovalForExternalPublish: boolean;
}

export interface BrainThoughtNode {
  id: string;
  parentId: string | null;
  skillId: string;
  actorIds: string[];
  concept: string;
  essence: string;
  importance: number;
  sourceType: 'conversation' | 'task_execution' | 'core_directive' | 'supervisor_review';
  createdAt: string;
  dir: [number, number, number];
  radius: number;
}

export interface NexusBrainState {
  maxConnections: number;
  nodes: BrainThoughtNode[];
  filteredOutCount: number;
  lastEvolvedAt: string | null;
}

export interface NexusState {
  companyId: string;
  settings: CompanySettings;
  departments: Department[];
  employees: EmployeeProfile[];
  skills: SkillDefinition[];
  tools: ToolDefinition[];
  channels: ChannelConnection[];
  tokenPolicy: TokenUsagePolicy;
  tokenLogs: TokenUsageEntry[];
  functions: LibraryFunction[];
  tasks: TaskItem[];
  approvals: ApprovalItem[];
  historicalLedger: HistoricalLedgerEntry[];
  products: ProductItem[];
  suppliers: SupplierItem[];
  campaigns: CampaignItem[];
  stores: StoreItem[];
  sites: SiteItem[];
  automations: AutomationRule[];
  financials: FinancialRecord[];
  interDeptRequests: InterDepartmentRequest[];
  integrations: IntegrationConfig[];
  activityLogs: ActivityLogEntry[];
  nexusCoreMessages: ConversationMessage[];
  brain: NexusBrainState;
}
