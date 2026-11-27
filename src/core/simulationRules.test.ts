import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_NEXUS_STATE } from '../data/seedData';
import {
  computeCharacterFacingYaw,
  computeDashboardMetrics,
  createTaskInState,
  formatEmployeeBubbleText,
  requiresCEOApproval,
  setEmployeeConversationPair,
  transitionTaskStatus,
  validateAndRegisterFunction,
} from './simulationRules';

test('seed data contains exactly 12 unique immutable characters split 6 per floor', () => {
  assert.equal(INITIAL_NEXUS_STATE.employees.length, 12);
  const floor1 = INITIAL_NEXUS_STATE.employees.filter((e) => e.floor === 1);
  const floor2 = INITIAL_NEXUS_STATE.employees.filter((e) => e.floor === 2);
  assert.equal(floor1.length, 6);
  assert.equal(floor2.length, 6);

  const visualIds = new Set(
    INITIAL_NEXUS_STATE.employees.map((e) => e.appearance.immutableId)
  );
  assert.equal(visualIds.size, 12);
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
    'emp_01', // João Mendes
    'emp_02'  // Maria Clara
  );
  const joao = updated.find((e) => e.id === 'emp_01')!;
  const maria = updated.find((e) => e.id === 'emp_02')!;

  assert.equal(joao.animationState, 'conversing');
  assert.equal(maria.animationState, 'conversing');
  assert.equal(
    formatEmployeeBubbleText(joao, updated),
    'João Mendes conversando com Maria Clara'
  );
  assert.equal(
    formatEmployeeBubbleText(maria, updated),
    'Maria Clara conversando com João Mendes'
  );

  // Ending conversation returns both to working at their stations
  const reset = setEmployeeConversationPair(updated, 'emp_01', null);
  assert.equal(reset.find((e) => e.id === 'emp_01')!.animationState, 'working');
  assert.equal(reset.find((e) => e.id === 'emp_02')!.animationState, 'working');
});

test('creating and completing a task triggers Floor Manager board write and Red-Blue Core Computer log', () => {
  const now = '2026-11-26T15:00:00';
  const afterCreate = createTaskInState(
    INITIAL_NEXUS_STATE,
    {
      title: 'Validar embalagem sustentável',
      description: 'Testar resistência da nova caixa reciclável.',
      assigneeId: 'emp_04',
      departmentId: 'dept_products',
      priority: 'alta',
      dueDate: '2026-11-30',
    },
    now
  );

  const created = afterCreate.tasks[0];
  assert.equal(created.title, 'Validar embalagem sustentável');
  const managerAfterCreate = afterCreate.employees.find((e) => e.id === 'emp_01')!;
  assert.equal(managerAfterCreate.activeWorkflowAction, 'board_write');
  assert.ok(
    formatEmployeeBubbleText(managerAfterCreate, afterCreate.employees).includes(
      'Quadro de Tarefas'
    )
  );

  const initialLedgerCount = afterCreate.historicalLedger.length;
  const afterComplete = transitionTaskStatus(
    afterCreate,
    created.id,
    'concluida',
    'Embalagem aprovada com 18% menos peso.',
    'João Mendes',
    '2026-11-26T16:00:00'
  );

  assert.equal(afterComplete.historicalLedger.length, initialLedgerCount + 1);
  assert.equal(afterComplete.historicalLedger[0].taskId, created.id);
  const managerAfterComplete = afterComplete.employees.find((e) => e.id === 'emp_01')!;
  assert.equal(managerAfterComplete.activeWorkflowAction, 'core_computer_log');
  assert.ok(
    formatEmployeeBubbleText(managerAfterComplete, afterComplete.employees).includes(
      'PC Azul & Vermelho'
    )
  );
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

  const lvl2Normal = requiresCEOApproval(2, {
    isFinancialOrIrreversible: false,
    hasAuthorizedTool: true,
  });
  assert.equal(lvl2Normal.allowed, true);
  assert.equal(lvl2Normal.needsApproval, false);

  const unauthorized = requiresCEOApproval(3, {
    isFinancialOrIrreversible: false,
    hasAuthorizedTool: false,
  });
  assert.equal(unauthorized.allowed, false);
});

test('dashboard metrics derive strictly from state records', () => {
  const metrics = computeDashboardMetrics(INITIAL_NEXUS_STATE);
  assert.equal(metrics.totalProducts, INITIAL_NEXUS_STATE.products.length);
  assert.equal(metrics.netProfit, metrics.totalRevenue - metrics.totalExpenses);
  assert.equal(metrics.historicalRecordsCount, INITIAL_NEXUS_STATE.historicalLedger.length);
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
