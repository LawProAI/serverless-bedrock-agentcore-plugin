'use strict';

const { compileRuntimeEndpoint } = require('../../../src/compilers/runtimeEndpoint');

describe('RuntimeEndpoint Compiler', () => {
  const baseContext = {
    serviceName: 'test-service',
    stage: 'dev',
    region: 'us-west-2',
    accountId: '123456789012',
    customConfig: {},
    defaultTags: {},
  };

  const baseTags = {
    'serverless:service': 'test-service',
    'serverless:stage': 'dev',
    'agentcore:resource': 'myAgent',
  };

  describe('compileRuntimeEndpoint', () => {
    test('generates valid CloudFormation resource', () => {
      const config = {};
      const result = compileRuntimeEndpoint(
        'myAgent',
        'default',
        config,
        'MyagentRuntime',
        baseContext,
        baseTags
      );

      expect(result.Type).toBe('AWS::BedrockAgentCore::RuntimeEndpoint');
      expect(result.DependsOn).toEqual(['MyagentRuntime']);
      expect(result.Properties.Name).toBe('test_service_myAgent_default_dev');
      expect(result.Properties.AgentRuntimeId).toEqual({
        'Fn::GetAtt': ['MyagentRuntime', 'AgentRuntimeId'],
      });
    });

    test('includes version when provided', () => {
      const config = { version: 'v1.0.0' };
      const result = compileRuntimeEndpoint(
        'myAgent',
        'default',
        config,
        'MyagentRuntime',
        baseContext,
        baseTags
      );

      expect(result.Properties.AgentRuntimeVersion).toBe('v1.0.0');
    });

    test('excludes version when not provided', () => {
      const config = {};
      const result = compileRuntimeEndpoint(
        'myAgent',
        'default',
        config,
        'MyagentRuntime',
        baseContext,
        baseTags
      );

      expect(result.Properties.AgentRuntimeVersion).toBeUndefined();
    });

    test('includes description when provided', () => {
      const config = { description: 'Production endpoint' };
      const result = compileRuntimeEndpoint(
        'myAgent',
        'prod',
        config,
        'MyagentRuntime',
        baseContext,
        baseTags
      );

      expect(result.Properties.Description).toBe('Production endpoint');
    });

    test('excludes description when not provided', () => {
      const config = {};
      const result = compileRuntimeEndpoint(
        'myAgent',
        'default',
        config,
        'MyagentRuntime',
        baseContext,
        baseTags
      );

      expect(result.Properties.Description).toBeUndefined();
    });

    test('includes tags when provided', () => {
      const config = {};
      const result = compileRuntimeEndpoint(
        'myAgent',
        'default',
        config,
        'MyagentRuntime',
        baseContext,
        baseTags
      );

      expect(result.Properties.Tags).toEqual(baseTags);
    });

    test('excludes tags when empty', () => {
      const config = {};
      const result = compileRuntimeEndpoint(
        'myAgent',
        'default',
        config,
        'MyagentRuntime',
        baseContext,
        {}
      );

      expect(result.Properties.Tags).toBeUndefined();
    });

    test('generates correct name format with different endpoint names', () => {
      const config = {};
      const result = compileRuntimeEndpoint(
        'myAgent',
        'v2',
        config,
        'MyagentRuntime',
        baseContext,
        {}
      );

      expect(result.Properties.Name).toBe('test_service_myAgent_v2_dev');
    });

    test('handles stage in name generation', () => {
      const prodContext = { ...baseContext, stage: 'production' };
      const config = {};
      const result = compileRuntimeEndpoint(
        'myAgent',
        'default',
        config,
        'MyagentRuntime',
        prodContext,
        {}
      );

      expect(result.Properties.Name).toBe('test_service_myAgent_default_production');
    });
  });
});
