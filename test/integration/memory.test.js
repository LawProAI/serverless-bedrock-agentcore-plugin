'use strict';

const { runServerless, getLogicalId } = require('../utils/runServerless');

describe('Memory Integration Tests', () => {
  let cfTemplate;

  beforeAll(async () => {
    const result = await runServerless({
      fixture: 'memory',
      command: 'package',
    });
    cfTemplate = result.cfTemplate;
  });

  test('generates Memory resource with correct type', () => {
    const logicalId = getLogicalId('conversationMemory', 'Memory');
    const resource = cfTemplate.Resources[logicalId];

    expect(resource).toBeDefined();
    expect(resource.Type).toBe('AWS::BedrockAgentCore::Memory');
  });

  test('generates Memory IAM Role', () => {
    const logicalId = getLogicalId('conversationMemory', 'Memory') + 'Role';
    const role = cfTemplate.Resources[logicalId];

    expect(role).toBeDefined();
    expect(role.Type).toBe('AWS::IAM::Role');
  });

  test('Memory has correct properties', () => {
    const logicalId = getLogicalId('conversationMemory', 'Memory');
    const resource = cfTemplate.Resources[logicalId];

    expect(resource.Properties).toMatchObject({
      Name: expect.stringContaining('conversationMemory'),
      Description: 'Conversation memory for agent',
      EventExpiryDuration: 30,
    });
  });

  test('Memory has strategies configured', () => {
    const logicalId = getLogicalId('conversationMemory', 'Memory');
    const resource = cfTemplate.Resources[logicalId];

    expect(resource.Properties.MemoryStrategies).toBeDefined();
    expect(resource.Properties.MemoryStrategies).toHaveLength(2);
  });

  test('Memory has semantic strategy', () => {
    const logicalId = getLogicalId('conversationMemory', 'Memory');
    const resource = cfTemplate.Resources[logicalId];
    const strategies = resource.Properties.MemoryStrategies;

    // New typed union format uses SemanticMemoryStrategy wrapper
    const semanticStrategyWrapper = strategies.find((s) => s.SemanticMemoryStrategy !== undefined);
    expect(semanticStrategyWrapper).toBeDefined();

    const semanticStrategy = semanticStrategyWrapper.SemanticMemoryStrategy;
    expect(semanticStrategy.Name).toBe('ConversationSearch');
    expect(semanticStrategy.Namespaces).toContain('conversations');
  });

  test('Memory has summary strategy', () => {
    const logicalId = getLogicalId('conversationMemory', 'Memory');
    const resource = cfTemplate.Resources[logicalId];
    const strategies = resource.Properties.MemoryStrategies;

    // New typed union format uses SummaryMemoryStrategy wrapper
    const summaryStrategyWrapper = strategies.find((s) => s.SummaryMemoryStrategy !== undefined);
    expect(summaryStrategyWrapper).toBeDefined();

    const summaryStrategy = summaryStrategyWrapper.SummaryMemoryStrategy;
    expect(summaryStrategy.Name).toBe('ConversationSummary');
  });

  test('Memory Role has Bedrock permissions', () => {
    const logicalId = getLogicalId('conversationMemory', 'Memory') + 'Role';
    const role = cfTemplate.Resources[logicalId];
    const statements = role.Properties.Policies[0].PolicyDocument.Statement;

    const bedrockStatement = statements.find((s) =>
      s.Resource?.['Fn::Sub']?.includes('foundation-model')
    );
    expect(bedrockStatement).toBeDefined();
  });

  test('Memory Role has inference profile permissions', () => {
    const logicalId = getLogicalId('conversationMemory', 'Memory') + 'Role';
    const role = cfTemplate.Resources[logicalId];
    const statements = role.Properties.Policies[0].PolicyDocument.Statement;

    const inferenceProfileStatement = statements.find(
      (s) => Array.isArray(s.Action) && s.Action.includes('bedrock:GetInferenceProfile')
    );
    expect(inferenceProfileStatement).toBeDefined();
  });

  test('generates CloudFormation outputs', () => {
    const memoryArnOutput = Object.keys(cfTemplate.Outputs || {}).find((k) =>
      k.includes('MemoryArn')
    );

    expect(memoryArnOutput).toBeDefined();
  });
});
