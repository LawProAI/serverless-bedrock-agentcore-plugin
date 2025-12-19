'use strict';

const {
  compileGateway,
  buildGatewayAuthorizerConfiguration,
  buildGatewayProtocolConfiguration,
} = require('../../../src/compilers/gateway');

describe('Gateway Compiler', () => {
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
    'agentcore:resource': 'toolGateway',
  };

  describe('buildGatewayAuthorizerConfiguration', () => {
    test('returns null for empty config', () => {
      expect(buildGatewayAuthorizerConfiguration(null)).toBeNull();
    });

    test('builds authorizer configuration', () => {
      const authConfig = {
        allowedAudiences: ['api://my-api'],
        allowedClients: ['client-123'],
        allowedIssuers: ['https://auth.example.com'],
      };

      const result = buildGatewayAuthorizerConfiguration(authConfig);

      expect(result).toEqual({
        AllowedAudiences: ['api://my-api'],
        AllowedClients: ['client-123'],
        AllowedIssuers: ['https://auth.example.com'],
      });
    });
  });

  describe('buildGatewayProtocolConfiguration', () => {
    test('returns null for empty config', () => {
      expect(buildGatewayProtocolConfiguration(null)).toBeNull();
    });

    test('builds MCP protocol configuration', () => {
      const protocolConfig = {
        mcpConfiguration: {
          instructions: 'Use these tools to interact with the system',
          supportedVersions: ['2024-11-05'],
        },
      };

      const result = buildGatewayProtocolConfiguration(protocolConfig);

      expect(result).toEqual({
        McpConfiguration: {
          Instructions: 'Use these tools to interact with the system',
          SupportedVersions: ['2024-11-05'],
        },
      });
    });
  });

  describe('compileGateway', () => {
    test('generates valid CloudFormation with minimal config', () => {
      const config = {
        type: 'gateway',
      };

      const result = compileGateway('toolGateway', config, baseContext, baseTags);

      expect(result.Type).toBe('AWS::BedrockAgentCore::Gateway');
      expect(result.Properties.Name).toBe('test-service-toolGateway-dev');
      expect(result.Properties.AuthorizerType).toBe('AWS_IAM'); // Default
      expect(result.Properties.ProtocolType).toBe('MCP'); // Default
      expect(result.Properties.RoleArn).toEqual({
        'Fn::GetAtt': ['ToolgatewayGatewayRole', 'Arn'],
      });
    });

    test('includes optional properties when provided', () => {
      const config = {
        type: 'gateway',
        description: 'Gateway for agent tools',
        authorizerType: 'CUSTOM_JWT',
        kmsKeyArn: 'arn:aws:kms:us-west-2:123456789012:key/12345678',
        exceptionLevel: 'DEBUG',
        authorizerConfiguration: {
          allowedIssuers: ['https://auth.example.com'],
        },
      };

      const result = compileGateway('toolGateway', config, baseContext, baseTags);

      expect(result.Properties.Description).toBe('Gateway for agent tools');
      expect(result.Properties.AuthorizerType).toBe('CUSTOM_JWT');
      expect(result.Properties.KmsKeyArn).toBe('arn:aws:kms:us-west-2:123456789012:key/12345678');
      expect(result.Properties.ExceptionLevel).toBe('DEBUG');
      expect(result.Properties.AuthorizerConfiguration).toEqual({
        AllowedIssuers: ['https://auth.example.com'],
      });
    });

    test('uses provided roleArn when specified', () => {
      const config = {
        type: 'gateway',
        roleArn: 'arn:aws:iam::123456789012:role/MyCustomRole',
      };

      const result = compileGateway('toolGateway', config, baseContext, baseTags);

      expect(result.Properties.RoleArn).toBe('arn:aws:iam::123456789012:role/MyCustomRole');
    });
  });
});
