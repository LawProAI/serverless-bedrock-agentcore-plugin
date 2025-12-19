'use strict';

const {
  compileMemory,
  buildMemoryStrategies,
  isLegacyFormat,
  convertLegacyStrategy,
  resetDeprecationWarning,
} = require('../../../src/compilers/memory');

describe('Memory Compiler', () => {
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
    'agentcore:resource': 'conversationMemory',
  };

  describe('isLegacyFormat', () => {
    beforeEach(() => {
      resetDeprecationWarning();
    });

    test('detects legacy format with type property', () => {
      const strategy = { type: 'semantic', name: 'Test' };
      expect(isLegacyFormat(strategy)).toBe(true);
    });

    test('detects new format with SemanticMemoryStrategy', () => {
      const strategy = { SemanticMemoryStrategy: { Name: 'Test', Type: 'SEMANTIC' } };
      expect(isLegacyFormat(strategy)).toBe(false);
    });

    test('detects new format with SummaryMemoryStrategy', () => {
      const strategy = { SummaryMemoryStrategy: { Name: 'Test', Type: 'SUMMARIZATION' } };
      expect(isLegacyFormat(strategy)).toBe(false);
    });

    test('detects new format with UserPreferenceMemoryStrategy', () => {
      const strategy = { UserPreferenceMemoryStrategy: { Name: 'Test', Type: 'USER_PREFERENCE' } };
      expect(isLegacyFormat(strategy)).toBe(false);
    });

    test('detects new format with CustomMemoryStrategy', () => {
      const strategy = { CustomMemoryStrategy: { Name: 'Test', Type: 'CUSTOM' } };
      expect(isLegacyFormat(strategy)).toBe(false);
    });
  });

  describe('convertLegacyStrategy', () => {
    beforeEach(() => {
      resetDeprecationWarning();
    });

    test('converts semantic strategy', () => {
      const legacy = {
        type: 'semantic',
        name: 'SemanticSearch',
        description: 'Search memory',
        namespaces: ['/sessions/{sessionId}'],
      };

      const result = convertLegacyStrategy(legacy);

      // Note: Managed strategies don't require explicit Type or model configuration
      expect(result).toEqual({
        SemanticMemoryStrategy: {
          Name: 'SemanticSearch',
          Description: 'Search memory',
          Namespaces: ['/sessions/{sessionId}'],
        },
      });
    });

    test('converts summary strategy', () => {
      const legacy = {
        type: 'summary',
        name: 'Summary',
      };

      const result = convertLegacyStrategy(legacy);

      // Note: Managed strategies don't require explicit Type
      expect(result).toEqual({
        SummaryMemoryStrategy: {
          Name: 'Summary',
        },
      });
    });

    test('converts userpreference strategy', () => {
      const legacy = {
        type: 'userpreference',
        name: 'UserPrefs',
        namespaces: ['/users/{userId}'],
      };

      const result = convertLegacyStrategy(legacy);

      // Note: Managed strategies don't require explicit Type
      expect(result).toEqual({
        UserPreferenceMemoryStrategy: {
          Name: 'UserPrefs',
          Namespaces: ['/users/{userId}'],
        },
      });
    });

    test('converts user_preference strategy variant', () => {
      const legacy = { type: 'user_preference', name: 'Prefs' };
      const result = convertLegacyStrategy(legacy);
      expect(result.UserPreferenceMemoryStrategy).toBeDefined();
    });

    test('converts summarization strategy variant', () => {
      const legacy = { type: 'summarization', name: 'Summary' };
      const result = convertLegacyStrategy(legacy);
      expect(result.SummaryMemoryStrategy).toBeDefined();
    });

    test('converts custom strategy', () => {
      const legacy = {
        type: 'custom',
        name: 'CustomStrat',
        configuration: { customKey: 'customValue' },
      };

      const result = convertLegacyStrategy(legacy);

      expect(result).toEqual({
        CustomMemoryStrategy: {
          Name: 'CustomStrat',
          Configuration: { customKey: 'customValue' },
        },
      });
    });

    test('throws error for unknown strategy type', () => {
      const legacy = { type: 'unknown', name: 'Test' };
      expect(() => convertLegacyStrategy(legacy)).toThrow('Unknown memory strategy type: unknown');
    });
  });

  describe('buildMemoryStrategies', () => {
    beforeEach(() => {
      resetDeprecationWarning();
    });

    test('returns null for empty strategies', () => {
      expect(buildMemoryStrategies(null)).toBeNull();
      expect(buildMemoryStrategies([])).toBeNull();
    });

    // Test backward compatibility with legacy format
    describe('legacy format (backward compatibility)', () => {
      test('converts legacy semantic strategy', () => {
        const strategies = [
          {
            type: 'semantic',
            name: 'SemanticMemory',
            namespaces: ['/sessions/{sessionId}'],
          },
        ];

        const result = buildMemoryStrategies(strategies);

        expect(result).toHaveLength(1);
        expect(result[0].SemanticMemoryStrategy).toBeDefined();
        expect(result[0].SemanticMemoryStrategy.Name).toBe('SemanticMemory');
        expect(result[0].SemanticMemoryStrategy.Namespaces).toEqual(['/sessions/{sessionId}']);
      });

      test('converts legacy userPreference strategy', () => {
        const strategies = [
          {
            type: 'userPreference',
            name: 'UserPrefs',
            namespaces: ['/users/{actorId}'],
          },
        ];

        const result = buildMemoryStrategies(strategies);

        expect(result).toHaveLength(1);
        expect(result[0].UserPreferenceMemoryStrategy).toBeDefined();
        expect(result[0].UserPreferenceMemoryStrategy.Name).toBe('UserPrefs');
      });

      test('converts legacy summary strategy', () => {
        const strategies = [
          {
            type: 'summary',
            name: 'ConversationSummary',
          },
        ];

        const result = buildMemoryStrategies(strategies);

        expect(result).toHaveLength(1);
        expect(result[0].SummaryMemoryStrategy).toBeDefined();
        expect(result[0].SummaryMemoryStrategy.Name).toBe('ConversationSummary');
      });

      test('converts multiple legacy strategies', () => {
        const strategies = [
          { type: 'semantic', name: 'Semantic' },
          { type: 'userPreference', name: 'UserPrefs' },
        ];

        const result = buildMemoryStrategies(strategies);

        expect(result).toHaveLength(2);
        expect(result[0].SemanticMemoryStrategy).toBeDefined();
        expect(result[1].UserPreferenceMemoryStrategy).toBeDefined();
      });
    });

    // Test new typed union format
    describe('new typed union format', () => {
      test('passes through SemanticMemoryStrategy', () => {
        const strategies = [
          {
            SemanticMemoryStrategy: {
              Name: 'SemanticSearch',
              Type: 'SEMANTIC',
              Namespaces: ['/sessions/{sessionId}'],
            },
          },
        ];

        const result = buildMemoryStrategies(strategies);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(strategies[0]);
      });

      test('passes through SummaryMemoryStrategy', () => {
        const strategies = [
          {
            SummaryMemoryStrategy: {
              Name: 'Summary',
              Type: 'SUMMARIZATION',
            },
          },
        ];

        const result = buildMemoryStrategies(strategies);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(strategies[0]);
      });

      test('passes through mixed new format strategies', () => {
        const strategies = [
          { SemanticMemoryStrategy: { Name: 'Search', Type: 'SEMANTIC' } },
          { SummaryMemoryStrategy: { Name: 'Summary', Type: 'SUMMARIZATION' } },
          { UserPreferenceMemoryStrategy: { Name: 'Prefs', Type: 'USER_PREFERENCE' } },
        ];

        const result = buildMemoryStrategies(strategies);

        expect(result).toHaveLength(3);
        expect(result).toEqual(strategies);
      });
    });
  });

  describe('compileMemory', () => {
    test('generates valid CloudFormation with minimal config', () => {
      const config = {
        type: 'memory',
      };

      const result = compileMemory('conversationMemory', config, baseContext, baseTags);

      expect(result.Type).toBe('AWS::BedrockAgentCore::Memory');
      expect(result.Properties.Name).toBe('test_service_conversationMemory_dev');
      expect(result.Properties.EventExpiryDuration).toBe(30); // Default
      expect(result.Properties.MemoryExecutionRoleArn).toEqual({
        'Fn::GetAtt': ['ConversationmemoryMemoryRole', 'Arn'],
      });
    });

    test('includes optional properties when provided', () => {
      const config = {
        type: 'memory',
        description: 'Stores conversation history',
        eventExpiryDuration: 60,
        encryptionKeyArn:
          'arn:aws:kms:us-west-2:123456789012:key/12345678-1234-1234-1234-123456789012',
        strategies: [
          {
            type: 'semantic',
            name: 'SemanticMemory',
          },
        ],
      };

      const result = compileMemory('conversationMemory', config, baseContext, baseTags);

      expect(result.Properties.Description).toBe('Stores conversation history');
      expect(result.Properties.EventExpiryDuration).toBe(60);
      expect(result.Properties.EncryptionKeyArn).toBe(
        'arn:aws:kms:us-west-2:123456789012:key/12345678-1234-1234-1234-123456789012'
      );
      expect(result.Properties.MemoryStrategies).toHaveLength(1);
    });

    test('uses provided roleArn when specified', () => {
      const config = {
        type: 'memory',
        roleArn: 'arn:aws:iam::123456789012:role/MyCustomRole',
      };

      const result = compileMemory('conversationMemory', config, baseContext, baseTags);

      expect(result.Properties.MemoryExecutionRoleArn).toBe(
        'arn:aws:iam::123456789012:role/MyCustomRole'
      );
    });
  });
});
