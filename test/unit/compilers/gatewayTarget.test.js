'use strict';

const {
  compileGatewayTarget,
  buildCredentialProviderConfigurations,
  buildTargetConfiguration,
  buildLambdaTargetConfiguration,
  buildOpenApiTargetConfiguration,
  buildSmithyTargetConfiguration,
} = require('../../../src/compilers/gatewayTarget');

describe('GatewayTarget Compiler', () => {
  const baseContext = {
    serviceName: 'test-service',
    stage: 'dev',
    region: 'us-west-2',
    accountId: '123456789012',
    customConfig: {},
    defaultTags: {},
  };

  describe('buildCredentialProviderConfigurations', () => {
    test('defaults to GATEWAY_IAM_ROLE', () => {
      const result = buildCredentialProviderConfigurations(null);

      expect(result).toEqual([{ CredentialProviderType: 'GATEWAY_IAM_ROLE' }]);
    });

    test('builds OAuth configuration', () => {
      const credProvider = {
        type: 'OAUTH',
        oauthConfig: {
          secretArn: 'arn:aws:secretsmanager:us-west-2:123456789012:secret:my-secret',
          tokenUrl: 'https://auth.example.com/oauth/token',
          scopes: ['read', 'write'],
        },
      };

      const result = buildCredentialProviderConfigurations(credProvider);

      expect(result).toEqual([
        {
          CredentialProviderType: 'OAUTH',
          OauthCredentialProviderConfiguration: {
            CredentialsSecretArn: 'arn:aws:secretsmanager:us-west-2:123456789012:secret:my-secret',
            OauthTokenEndpoint: 'https://auth.example.com/oauth/token',
            Scopes: ['read', 'write'],
          },
        },
      ]);
    });

    test('builds API Key configuration', () => {
      const credProvider = {
        type: 'API_KEY',
        apiKeyConfig: {
          secretArn: 'arn:aws:secretsmanager:us-west-2:123456789012:secret:api-key',
        },
      };

      const result = buildCredentialProviderConfigurations(credProvider);

      expect(result).toEqual([
        {
          CredentialProviderType: 'API_KEY',
          ApiKeyCredentialProviderConfiguration: {
            ApiKeySecretArn: 'arn:aws:secretsmanager:us-west-2:123456789012:secret:api-key',
          },
        },
      ]);
    });
  });

  describe('buildLambdaTargetConfiguration', () => {
    test('builds with functionArn', () => {
      const target = {
        type: 'lambda',
        functionArn: 'arn:aws:lambda:us-west-2:123456789012:function:my-function',
      };

      const result = buildLambdaTargetConfiguration(target, baseContext);

      expect(result).toEqual({
        Mcp: {
          Lambda: {
            LambdaArn: 'arn:aws:lambda:us-west-2:123456789012:function:my-function',
          },
        },
      });
    });

    test('builds with functionName reference', () => {
      const target = {
        type: 'lambda',
        functionName: 'my-function',
      };

      const result = buildLambdaTargetConfiguration(target, baseContext);

      expect(result).toEqual({
        Mcp: {
          Lambda: {
            LambdaArn: { 'Fn::GetAtt': ['MyFunctionLambdaFunction', 'Arn'] },
          },
        },
      });
    });

    test('includes tool schema when provided', () => {
      const target = {
        type: 'lambda',
        functionArn: 'arn:aws:lambda:us-west-2:123456789012:function:my-function',
        toolSchema: {
          inlinePayload: [
            {
              name: 'myTool',
              description: 'A tool',
              inputSchema: { type: 'object' },
            },
          ],
        },
      };

      const result = buildLambdaTargetConfiguration(target, baseContext);

      expect(result.Mcp.Lambda.ToolSchema).toEqual({
        InlinePayload: [
          {
            Name: 'myTool',
            Description: 'A tool',
            InputSchema: { Type: 'object' },
          },
        ],
      });
    });
  });

  describe('buildOpenApiTargetConfiguration', () => {
    test('builds with S3 configuration', () => {
      const target = {
        type: 'openapi',
        s3: {
          bucket: 'my-bucket',
          key: 'specs/openapi.yaml',
        },
      };

      const result = buildOpenApiTargetConfiguration(target);

      expect(result).toEqual({
        Mcp: {
          OpenApiSchema: {
            S3: {
              Uri: 's3://my-bucket/specs/openapi.yaml',
            },
          },
        },
      });
    });

    test('builds with inline document', () => {
      const target = {
        type: 'openapi',
        inline: 'openapi: 3.0.0\ninfo:\n  title: My API',
      };

      const result = buildOpenApiTargetConfiguration(target);

      expect(result.Mcp.OpenApiSchema.InlinePayload).toBe('openapi: 3.0.0\ninfo:\n  title: My API');
    });

    test('builds with S3 URI directly', () => {
      const target = {
        type: 'openapi',
        s3: { uri: 's3://my-bucket/api.yaml' },
      };

      const result = buildOpenApiTargetConfiguration(target);

      expect(result.Mcp.OpenApiSchema.S3.Uri).toBe('s3://my-bucket/api.yaml');
    });
  });

  describe('buildSmithyTargetConfiguration', () => {
    test('builds with S3 configuration', () => {
      const target = {
        type: 'smithy',
        s3: {
          bucket: 'my-bucket',
          key: 'models/service.smithy',
        },
      };

      const result = buildSmithyTargetConfiguration(target);

      expect(result).toEqual({
        Mcp: {
          SmithyModel: {
            S3: {
              Uri: 's3://my-bucket/models/service.smithy',
            },
          },
        },
      });
    });

    test('builds with inline model', () => {
      const target = {
        type: 'smithy',
        inline: 'namespace com.example\nservice MyService {}',
      };

      const result = buildSmithyTargetConfiguration(target);

      expect(result.Mcp.SmithyModel.InlinePayload).toBe(
        'namespace com.example\nservice MyService {}'
      );
    });
  });

  describe('compileGatewayTarget', () => {
    test('generates valid CloudFormation for Lambda target', () => {
      const config = {
        name: 'order-api',
        type: 'lambda',
        functionArn: 'arn:aws:lambda:us-west-2:123456789012:function:my-function',
        description: 'Order API tool',
      };

      const result = compileGatewayTarget(
        'toolGateway',
        'order-api',
        config,
        'ToolgatewayGateway',
        baseContext
      );

      expect(result.Type).toBe('AWS::BedrockAgentCore::GatewayTarget');
      expect(result.DependsOn).toEqual(['ToolgatewayGateway']);
      expect(result.Properties.Name).toBe('order-api');
      expect(result.Properties.GatewayIdentifier).toEqual({
        'Fn::GetAtt': ['ToolgatewayGateway', 'GatewayIdentifier'],
      });
      expect(result.Properties.Description).toBe('Order API tool');
      expect(result.Properties.CredentialProviderConfigurations).toHaveLength(1);
      expect(result.Properties.TargetConfiguration).toHaveProperty('Mcp');
      expect(result.Properties.TargetConfiguration.Mcp).toHaveProperty('Lambda');
    });

    test('generates valid CloudFormation for OpenAPI target', () => {
      const config = {
        name: 'rest-api',
        type: 'openapi',
        s3: {
          bucket: 'my-bucket',
          key: 'openapi.yaml',
        },
      };

      const result = compileGatewayTarget(
        'toolGateway',
        'rest-api',
        config,
        'ToolgatewayGateway',
        baseContext
      );

      expect(result.Properties.TargetConfiguration).toHaveProperty('Mcp');
      expect(result.Properties.TargetConfiguration.Mcp).toHaveProperty('OpenApiSchema');
    });
  });
});
