import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_NEXUS_STATE } from '../data/seedData';
import {
  approveTaskAtStage,
  canExecuteTask,
  computeCharacterFacingYaw,
  computeDashboardMetrics,
  createTaskInState,
  formatEmployeeBubbleText,
  recordRealTaskExecution,
  requiresCEOApproval,
  setChannelConnectionStatus,
  setEmployeeConversationPair,
  validateAndRegisterFunction,
} from './simulationRules';
import {
  appendBrainThought,
  buildCompactMentalityMetadata,
  estimateMentalityBytes,
  evaluateLocalThoughtImportance,
  setBrainMaxConnections,
} from './brainRules';

test('seed data contains 12 immutable employees with skills preserved and zero fictitious tasks/records', () => {
  assert.equal(INITIAL_NEXUS_STATE.employees.length, 12);
  assert.equal(INITIAL_NEXUS_STATE.employees.filter((e) => e.floor === 1).length, 6);
  assert.equal(INITIAL_NEXUS_STATE.employees.filter((e) => e.floor === 2).length, 6);

  const visualIds = new Set(
    INITIAL_NEXUS_STATE.employees.map((e) => e.appearance.immutableId)
  );
  assert.equal(visualIds.size, 12);

  // Skills & tools are preserved
  assert.ok(INITIAL_NEXUS_STATE.skills.length >= 12);
  assert.ok(INITIAL_NEXUS_STATE.tools.length >= 8);
  for (const emp of INITIAL_NEXUS_STATE.employees) {
    assert.ok(emp.skillIds.length > 0, `${emp.name} must keep skills`);
    assert.equal(emp.animationState, 'idle');
    assert.equal(emp.productivity, 0);
    assert.equal(emp.conversationHistory.length, 0);
  }

  // Zero fictitious operational data
  assert.equal(INITIAL_NEXUS_STATE.tasks.length, 0);
  assert.equal(INITIAL_NEXUS_STATE.approvals.length, 0);
  assert.equal(INITIAL_NEXUS_STATE.historicalLedger.length, 0);
  assert.equal(INITIAL_NEXUS_STATE.products.length, 0);
  assert.equal(INITIAL_NEXUS_STATE.suppliers.length, 0);
  assert.equal(INITIAL_NEXUS_STATE.campaigns.length, 0);
  assert.equal(INITIAL_NEXUS_STATE.stores.length, 0);
  assert.equal(INITIAL_NEXUS_STATE.sites.length, 0);
  assert.equal(INITIAL_NEXUS_STATE.financials.length, 0);
  assert.equal(INITIAL_NEXUS_STATE.activityLogs.length, 0);
});

test('working characters face their computer desk while conversing characters turn toward each other', () => {
  const deskYaw = Math.PI;
  const workingYaw = computeCharacterFacingYaw(
    { x: -3.2, z: -2.0 },
    deskYaw,
    'working',
    { x: 2.8, z: -2.0 }
  );
  assert.equal(workingYaw, deskYaw);

  const conversingYawA = computeCharacterFacingYaw(
    { x: 0, z: 0 },
    deskYaw,
    'conversing',
    { x: 2, z: 0 }
  );
  const conversingYawB = computeCharacterFacingYaw(
    { x: 2, z: 0 },
    deskYaw,
    'conversing',
    { x: 0, z: 0 }
  );
  assert.ok(Math.abs(conversingYawA - Math.PI / 2) < 0.001);
  assert.ok(Math.abs(conversingYawB + Math.PI / 2) < 0.001);
});

test('overhead bubble formats conversing pair explicitly as "<Nome A> conversando com <Nome B>"', () => {
  const updated = setEmployeeConversationPair(
    INITIAL_NEXUS_STATE.employees,
    'emp_01',
    'emp_02'
  );
  const joao = updated.find((e) => e.id === 'emp_01')!;
  const maria = updated.find((e) => e.id === 'emp_02')!;

  assert.equal(
    formatEmployeeBubbleText(joao, updated),
    'João Mendes conversando com Maria Clara'
  );
  assert.equal(
    formatEmployeeBubbleText(maria, updated),
    'Maria Clara conversando com João Mendes'
  );

  const reset = setEmployeeConversationPair(updated, 'emp_01', null);
  assert.equal(reset.find((e) => e.id === 'emp_01')!.animationState, 'working');
});

test('real task requires superior permission, CEO authorization, and official channel connection before execution', () => {
  const now = '2026-11-26T17:00:00';
  const afterCreate = createTaskInState(
    INITIAL_NEXUS_STATE,
    {
      title: 'Pesquisar fornecedores de energia solar no Brasil',
      description: 'Usar Pesquisa Google para mapear distribuidores reais.',
      assigneeId: 'emp_02', // Maria Clara -> supervisor is emp_01 (João Mendes)
      departmentId: 'dept_products',
      priority: 'alta',
      dueDate: '2026-11-30',
      requiredChannelIds: ['ch_google_search'],
    },
    now
  );

  const task = afterCreate.tasks[0];
  const approval = afterCreate.approvals[0];
  assert.equal(task.permissionStatus, 'pending_supervisor');
  assert.equal(approval.stage, 'supervisor');
  assert.equal(approval.supervisorId, 'emp_01');

  // Blocked before supervisor approval
  let gate = canExecuteTask(afterCreate, task);
  assert.equal(gate.allowed, false);
  assert.equal(gate.missingPermission, true);

  // Step 1: Supervisor (João Mendes) approves -> escalates to CEO
  const afterSup = approveTaskAtStage(
    afterCreate,
    approval.id,
    'supervisor',
    'approved',
    'Escopo validado pelo Diretor de Produtos.',
    now
  );
  assert.equal(afterSup.tasks[0].permissionStatus, 'pending_ceo');
  assert.equal(afterSup.approvals[0].stage, 'ceo');

  // Step 2: CEO authorizes -> still blocked until ch_google_search is connected!
  const afterCeo = approveTaskAtStage(
    afterSup,
    approval.id,
    'ceo',
    'approved',
    undefined,
    now
  );
  assert.equal(afterCeo.tasks[0].permissionStatus, 'approved');
  gate = canExecuteTask(afterCeo, afterCeo.tasks[0]);
  assert.equal(gate.allowed, false);
  assert.equal(gate.missingPermission, false);
  assert.equal(gate.missingChannels.length, 1);
  assert.equal(gate.missingChannels[0].id, 'ch_google_search');

  // Step 3: Official channel connection enabled -> execution allowed!
  const withChannel = setChannelConnectionStatus(
    afterCeo,
    'ch_google_search',
    'connected',
    'Gemini Search Grounding',
    now
  );
  gate = canExecuteTask(withChannel, withChannel.tasks[0]);
  assert.equal(gate.allowed, true);

  // Step 4: Record real execution + token usage + Red/Blue Core Computer archival
  const afterExec = recordRealTaskExecution(
    withChannel,
    withChannel.tasks[0].id,
    {
      resultText: '3 distribuidores identificados com fontes verificadas.',
      groundingSources: [{ title: 'Portal Solar', uri: 'https://www.portalsolar.com.br' }],
      promptTokens: 420,
      candidatesTokens: 180,
      totalTokens: 600,
      model: 'gemini-4-hydrogen',
    },
    now
  );

  assert.equal(afterExec.tasks[0].status, 'concluida');
  assert.equal(afterExec.tokenPolicy.usedTotal, 600);
  assert.equal(afterExec.historicalLedger.length, 1);
  assert.equal(afterExec.employees.find((e) => e.id === 'emp_01')!.activeWorkflowAction, 'core_computer_log');
  assert.ok(afterExec.employees.find((e) => e.id === 'emp_02')!.productivity > 0);
});

test('token limit enforcement blocks execution when dailyLimit is exhausted', () => {
  const now = '2026-11-26T17:10:00';
  let state = setChannelConnectionStatus(
    INITIAL_NEXUS_STATE,
    'ch_google_search',
    'connected',
    'Gemini',
    now
  );
  state = {
    ...state,
    tokenPolicy: {
      ...state.tokenPolicy,
      dailyLimit: 500,
      usedTotal: 500,
    },
  };
  state = createTaskInState(
    state,
    {
      title: 'Auditoria rápida',
      description: 'Teste de limite de tokens',
      assigneeId: 'emp_01', // Floor manager goes straight to pending_ceo
      departmentId: 'dept_products',
      priority: 'media',
      dueDate: '2026-11-30',
      requiredChannelIds: ['ch_google_search'],
    },
    now
  );
  state = approveTaskAtStage(state, state.approvals[0].id, 'ceo', 'approved', undefined, now);

  const gate = canExecuteTask(state, state.tasks[0]);
  assert.equal(gate.allowed, false);
  assert.equal(gate.tokenLimitReached, true);
});

test('autonomy rules enforce CEO approval on Level 1, financial/irreversible actions, and unauthorized tools', () => {
  const lvl1 = requiresCEOApproval(1, {
    isFinancialOrIrreversible: false,
    hasAuthorizedTool: true,
  });
  assert.equal(lvl1.needsApproval, true);

  const lvl3Financial = requiresCEOApproval(3, {
    isFinancialOrIrreversible: true,
    hasAuthorizedTool: true,
  });
  assert.equal(lvl3Financial.needsApproval, true);

  const unauthorized = requiresCEOApproval(3, {
    isFinancialOrIrreversible: false,
    hasAuthorizedTool: false,
  });
  assert.equal(unauthorized.allowed, false);
});

test('dashboard metrics derive strictly from real state records', () => {
  const metrics = computeDashboardMetrics(INITIAL_NEXUS_STATE);
  assert.equal(metrics.totalProducts, 0);
  assert.equal(metrics.netProfit, 0);
  assert.equal(metrics.historicalRecordsCount, 0);
  assert.equal(metrics.tokensUsedTotal, 0);
  assert.equal(metrics.connectedChannelsCount, 0);
});

test('function library blocks arbitrary code execution strings', () => {
  assert.throws(() => {
    validateAndRegisterFunction(INITIAL_NEXUS_STATE.functions, {
      name: 'eval("hack")',
      description: 'function() { return 1; }',
      category: 'Marketing',
      departmentId: 'dept_marketing',
      responsibleEmployeeId: 'emp_08',
      requiredSkillIds: [],
      requiredToolIds: [],
      minAutonomyLevel: 2,
    });
  }, /Execução arbitrária/);
});

test('Nexus Mind brain starts at 0/1000, filters trivial chatter, branches on important thoughts, and respects connection barrier', () => {
  assert.equal(INITIAL_NEXUS_STATE.brain.nodes.length, 0);
  assert.equal(INITIAL_NEXUS_STATE.brain.maxConnections, 1000);

  const joao = INITIAL_NEXUS_STATE.employees.find((e) => e.id === 'emp_01')!;
  const maria = INITIAL_NEXUS_STATE.employees.find((e) => e.id === 'emp_02')!;

  // Trivial messages must be filtered out
  const trivial = evaluateLocalThoughtImportance({
    text: 'Oi, tudo bem?',
    actors: [joao, maria],
    skills: INITIAL_NEXUS_STATE.skills,
    sourceType: 'conversation',
  });
  assert.equal(trivial.important, false);

  // Substantive skill/task insight must pass
  const strategic = evaluateLocalThoughtImportance({
    text: 'Alinhamento sobre pesquisa de mercado e precificação competitiva com margem alvo de 42% para novos fornecedores.',
    actors: [joao, maria],
    skills: INITIAL_NEXUS_STATE.skills,
    sourceType: 'conversation',
    hasActiveTask: true,
  });
  assert.equal(strategic.important, true);
  assert.ok(strategic.candidate !== null);

  // Enforce barrier limit = 2
  let state = setBrainMaxConnections(INITIAL_NEXUS_STATE, 2);
  const now = '2026-11-26T18:00:00';
  state = appendBrainThought(state, strategic.candidate!, now);
  assert.equal(state.brain.nodes.length, 1);

  // Second thought on same skill branches off first thought
  state = appendBrainThought(
    state,
    {
      ...strategic.candidate!,
      concept: 'Validação de fornecedores via Pesquisa Google',
      essence: 'Cruzar CNPJ e preço médio de atacado antes da compra.',
    },
    now
  );
  assert.equal(state.brain.nodes.length, 2);
  assert.equal(state.brain.nodes[0].parentId, state.brain.nodes[1].id);

  // Third thought must be blocked once maxConnections barrier (2) is reached
  state = appendBrainThought(
    state,
    {
      ...strategic.candidate!,
      concept: 'Terceiro pensamento excedente',
      essence: 'Não deve ultrapassar a barreira definida.',
    },
    now
  );
  assert.equal(state.brain.nodes.length, 2);

  // Compact KB export remains lightweight
  const compact = buildCompactMentalityMetadata(state, now);
  assert.equal(compact.core, 'Nexus Mind');
  assert.equal(compact.count, 2);
  assert.equal(compact.synapses.length, 2);
  const bytes = estimateMentalityBytes(state);
  assert.ok(bytes > 200 && bytes < 8192, `Expected compact KB metadata, got ${bytes} bytes`);
});

test('batch synchronous task creation generates strictly unique task, approval, and activityLog IDs', () => {
  const now = '2026-11-27T09:30:00';
  let state = INITIAL_NEXUS_STATE;
  for (let i = 0; i < 5; i++) {
    state = createTaskInState(
      state,
      {
        title: `Subtarefa simultânea ${i + 1}`,
        description: 'Teste de criação síncrona no mesmo milissegundo',
        assigneeId: 'emp_02',
        departmentId: 'dept_products',
        priority: 'media',
        dueDate: '2026-11-30',
      },
      now
    );
  }
  const taskIds = new Set(state.tasks.map((t) => t.id));
  const approvalIds = new Set(state.approvals.map((a) => a.id));
  const logIds = new Set(state.activityLogs.map((l) => l.id));
  assert.equal(taskIds.size, 5);
  assert.equal(approvalIds.size, 5);
  assert.equal(logIds.size, 5);
});
