'use strict';

const { compileWorkloadIdentity } = require('../../../src/compilers/workloadIdentity');

describe('WorkloadIdentity Compiler', () => {
  const baseContext = {
    serviceName: 'test-service',
    stage: 'dev',
    region: 'us-east-1',
    accountId: '123456789012',
    customConfig: {},
    defaultTags: {},
  };

  const baseTags = {
    'serverless:service': 'test-service',
    'serverless:stage': 'dev',
    'agentcore:resource': 'agentIdentity',
  };

  describe('compileWorkloadIdentity', () => {
    test('generates valid CloudFormation with minimal config', () => {
      const config = {
        type: 'workloadIdentity',
      };

      const result = compileWorkloadIdentity('agentIdentity', config, baseContext, baseTags);

      expect(result.Type).toBe('AWS::BedrockAgentCore::WorkloadIdentity');
      // Name uses hyphens instead of underscores for WorkloadIdentity
      expect(result.Properties.Name).toBe('test-service-agentIdentity-dev');
    });

    test('includes OAuth2 return URLs when provided', () => {
      const config = {
        type: 'workloadIdentity',
        oauth2ReturnUrls: ['https://example.com/callback', 'https://localhost:3000/auth/callback'],
      };

      const result = compileWorkloadIdentity('agentIdentity', config, baseContext, baseTags);

      expect(result.Properties.AllowedResourceOauth2ReturnUrls).toEqual([
        'https://example.com/callback',
        'https://localhost:3000/auth/callback',
      ]);
    });

    test('omits OAuth2 return URLs when not provided', () => {
      const config = {
        type: 'workloadIdentity',
      };

      const result = compileWorkloadIdentity('agentIdentity', config, baseContext, baseTags);

      expect(result.Properties.AllowedResourceOauth2ReturnUrls).toBeUndefined();
    });

    test('converts tags object to array format', () => {
      const result = compileWorkloadIdentity('agentIdentity', {}, baseContext, baseTags);

      expect(result.Properties.Tags).toEqual([
        { Key: 'serverless:service', Value: 'test-service' },
        { Key: 'serverless:stage', Value: 'dev' },
        { Key: 'agentcore:resource', Value: 'agentIdentity' },
      ]);
    });

    test('handles empty tags', () => {
      const result = compileWorkloadIdentity('agentIdentity', {}, baseContext, {});

      expect(result.Properties.Tags).toBeUndefined();
    });

    test('handles single OAuth2 return URL', () => {
      const config = {
        type: 'workloadIdentity',
        oauth2ReturnUrls: ['https://example.com/callback'],
      };

      const result = compileWorkloadIdentity('agentIdentity', config, baseContext, baseTags);

      expect(result.Properties.AllowedResourceOauth2ReturnUrls).toHaveLength(1);
    });

    test('replaces underscores with hyphens in resource name', () => {
      const context = {
        ...baseContext,
        serviceName: 'my_test_service',
      };

      const result = compileWorkloadIdentity('my_agent_identity', {}, context, {});

      // The name should have hyphens instead of underscores
      expect(result.Properties.Name).toBe('my-test-service-my-agent-identity-dev');
    });
  });
});
