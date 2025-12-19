'use strict';

const {
  getResourceName,
  getLogicalId,
  getNestedLogicalId,
  sanitizeName,
} = require('../../../src/utils/naming');

describe('Naming Utilities', () => {
  describe('getResourceName', () => {
    test('generates resource name with service, name, and stage', () => {
      const result = getResourceName('my-service', 'myAgent', 'dev');
      expect(result).toBe('my_service_myAgent_dev');
    });

    test('replaces hyphens with underscores', () => {
      const result = getResourceName('my-app', 'customer-support', 'prod');
      expect(result).toBe('my_app_customer_support_prod');
    });

    test('removes invalid characters', () => {
      const result = getResourceName('my.service', 'agent@1', 'dev');
      expect(result).toBe('myservice_agent1_dev');
    });

    test('ensures name starts with a letter', () => {
      const result = getResourceName('123service', 'agent', 'dev');
      expect(result).toBe('A123service_agent_dev');
    });

    test('truncates to 48 characters', () => {
      const longName = 'a'.repeat(50);
      const result = getResourceName('service', longName, 'dev');
      expect(result.length).toBeLessThanOrEqual(48);
    });
  });

  describe('getLogicalId', () => {
    test('converts to PascalCase', () => {
      const result = getLogicalId('my-agent', 'Runtime');
      expect(result).toBe('MyAgentRuntime');
    });

    test('handles underscores', () => {
      const result = getLogicalId('customer_support', 'Memory');
      expect(result).toBe('CustomerSupportMemory');
    });

    test('handles mixed separators', () => {
      const result = getLogicalId('my-agent_v2', 'Gateway');
      expect(result).toBe('MyAgentV2Gateway');
    });
  });

  describe('getNestedLogicalId', () => {
    test('combines parent and child names', () => {
      const result = getNestedLogicalId('myAgent', 'production', 'Endpoint');
      expect(result).toBe('MyagentProductionEndpoint');
    });
  });

  describe('sanitizeName', () => {
    test('removes non-alphanumeric characters', () => {
      const result = sanitizeName('my-agent_v2.0');
      expect(result).toBe('myagentv20');
    });
  });
});
