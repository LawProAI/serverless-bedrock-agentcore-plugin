'use strict';

const {
  compileRuntime,
  buildArtifact,
  buildNetworkConfiguration,
  buildAuthorizerConfiguration,
  buildLifecycleConfiguration,
  buildProtocolConfiguration,
  buildEnvironmentVariables,
  buildRequestHeaderConfiguration,
} = require('../../../src/compilers/runtime');

describe('Runtime Compiler', () => {
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

  describe('buildArtifact', () => {
    test('builds container image artifact', () => {
      const artifact = {
        containerImage: '123456789.dkr.ecr.us-west-2.amazonaws.com/my-agent:latest',
      };

      const result = buildArtifact(artifact);

      expect(result).toEqual({
        ContainerConfiguration: {
          ContainerUri: '123456789.dkr.ecr.us-west-2.amazonaws.com/my-agent:latest',
        },
      });
    });

    test('builds S3 artifact', () => {
      const artifact = {
        s3: {
          bucket: 'my-bucket',
          key: 'agents/my-agent.zip',
        },
      };

      const result = buildArtifact(artifact);

      expect(result).toEqual({
        S3Configuration: {
          S3BucketName: 'my-bucket',
          S3ObjectKey: 'agents/my-agent.zip',
        },
      });
    });

    test('throws error when neither containerImage nor s3 is specified', () => {
      const artifact = {};

      expect(() => buildArtifact(artifact)).toThrow(
        'Artifact must specify either containerImage or s3 configuration'
      );
    });
  });

  describe('buildNetworkConfiguration', () => {
    test('defaults to PUBLIC network mode', () => {
      const result = buildNetworkConfiguration();

      expect(result).toEqual({
        NetworkMode: 'PUBLIC',
      });
    });

    test('handles VPC mode with configuration', () => {
      const network = {
        networkMode: 'VPC',
        vpcConfig: {
          subnetIds: ['subnet-123', 'subnet-456'],
          securityGroupIds: ['sg-789'],
        },
      };

      const result = buildNetworkConfiguration(network);

      expect(result).toEqual({
        NetworkMode: 'VPC',
        VpcConfiguration: {
          SubnetIds: ['subnet-123', 'subnet-456'],
          SecurityGroupIds: ['sg-789'],
        },
      });
    });
  });

  describe('buildAuthorizerConfiguration', () => {
    test('returns null when no authorizer', () => {
      const result = buildAuthorizerConfiguration(null);
      expect(result).toBeNull();
    });

    test('returns null for NONE authorizer type', () => {
      const authorizer = { type: 'NONE' };
      const result = buildAuthorizerConfiguration(authorizer);
      expect(result).toBeNull();
    });

    test('returns null for AWS_IAM authorizer type', () => {
      const authorizer = { type: 'AWS_IAM' };
      const result = buildAuthorizerConfiguration(authorizer);
      expect(result).toBeNull();
    });

    test('builds CustomJWTAuthorizer with new format', () => {
      const authorizer = {
        customJwtAuthorizer: {
          discoveryUrl:
            'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_abc123/.well-known/openid-configuration',
          allowedAudience: ['my-app-client-id'],
          allowedClients: ['client-1', 'client-2'],
        },
      };

      const result = buildAuthorizerConfiguration(authorizer);

      expect(result).toEqual({
        CustomJWTAuthorizer: {
          DiscoveryUrl:
            'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_abc123/.well-known/openid-configuration',
          AllowedAudience: ['my-app-client-id'],
          AllowedClients: ['client-1', 'client-2'],
        },
      });
    });

    test('builds CustomJWTAuthorizer with only required discoveryUrl', () => {
      const authorizer = {
        customJwtAuthorizer: {
          discoveryUrl: 'https://auth.example.com/.well-known/openid-configuration',
        },
      };

      const result = buildAuthorizerConfiguration(authorizer);

      expect(result).toEqual({
        CustomJWTAuthorizer: {
          DiscoveryUrl: 'https://auth.example.com/.well-known/openid-configuration',
        },
      });
    });

    test('throws error when customJwtAuthorizer missing discoveryUrl', () => {
      const authorizer = {
        customJwtAuthorizer: {
          allowedAudience: ['my-app'],
        },
      };

      expect(() => buildAuthorizerConfiguration(authorizer)).toThrow(
        'CustomJWTAuthorizer requires discoveryUrl'
      );
    });

    test('builds CustomJWTAuthorizer from legacy format with discoveryUrl', () => {
      const authorizer = {
        type: 'CUSTOM_JWT',
        jwtConfiguration: {
          discoveryUrl: 'https://auth.example.com/.well-known/openid-configuration',
          allowedAudience: ['api://my-api'],
        },
      };

      const result = buildAuthorizerConfiguration(authorizer);

      expect(result).toEqual({
        CustomJWTAuthorizer: {
          DiscoveryUrl: 'https://auth.example.com/.well-known/openid-configuration',
          AllowedAudience: ['api://my-api'],
        },
      });
    });

    test('builds CustomJWTAuthorizer from legacy format using issuer as discoveryUrl', () => {
      const authorizer = {
        type: 'CUSTOM_JWT',
        jwtConfiguration: {
          issuer: 'https://auth.example.com/.well-known/openid-configuration',
          audience: ['api://my-api'],
        },
      };

      const result = buildAuthorizerConfiguration(authorizer);

      expect(result).toEqual({
        CustomJWTAuthorizer: {
          DiscoveryUrl: 'https://auth.example.com/.well-known/openid-configuration',
          AllowedAudience: ['api://my-api'],
        },
      });
    });

    test('throws error for legacy CUSTOM_JWT without discoveryUrl or issuer', () => {
      const authorizer = {
        type: 'CUSTOM_JWT',
        jwtConfiguration: {
          audience: ['api://my-api'],
        },
      };

      expect(() => buildAuthorizerConfiguration(authorizer)).toThrow(
        'CustomJWTAuthorizer requires discoveryUrl or issuer'
      );
    });
  });

  describe('buildLifecycleConfiguration', () => {
    test('returns null when no lifecycle config', () => {
      const result = buildLifecycleConfiguration(null);
      expect(result).toBeNull();
    });

    test('builds lifecycle configuration', () => {
      const lifecycle = {
        idleTimeout: 300,
        maxConcurrency: 10,
      };

      const result = buildLifecycleConfiguration(lifecycle);

      expect(result).toEqual({
        IdleTimeoutSeconds: 300,
        MaxConcurrency: 10,
      });
    });
  });

  describe('buildProtocolConfiguration', () => {
    test('returns null when no protocol', () => {
      const result = buildProtocolConfiguration(null);
      expect(result).toBeNull();
    });

    test('returns protocol string directly (CloudFormation expects string, not object)', () => {
      const result = buildProtocolConfiguration('MCP');
      expect(result).toBe('MCP');
    });

    test('handles HTTP protocol', () => {
      const result = buildProtocolConfiguration('HTTP');
      expect(result).toBe('HTTP');
    });

    test('handles A2A protocol', () => {
      const result = buildProtocolConfiguration('A2A');
      expect(result).toBe('A2A');
    });
  });

  describe('buildEnvironmentVariables', () => {
    test('returns null when no environment', () => {
      const result = buildEnvironmentVariables(null);
      expect(result).toBeNull();
    });

    test('returns null for empty environment', () => {
      const result = buildEnvironmentVariables({});
      expect(result).toBeNull();
    });

    test('returns environment variables', () => {
      const env = {
        MODEL_ID: 'anthropic.claude-sonnet-4-20250514',
        LOG_LEVEL: 'INFO',
      };

      const result = buildEnvironmentVariables(env);

      expect(result).toEqual(env);
    });
  });

  describe('compileRuntime', () => {
    test('generates valid CloudFormation with minimal config', () => {
      const config = {
        type: 'runtime',
        artifact: {
          containerImage: '123456789.dkr.ecr.us-west-2.amazonaws.com/my-agent:latest',
        },
      };

      const result = compileRuntime('myAgent', config, baseContext, baseTags);

      expect(result.Type).toBe('AWS::BedrockAgentCore::Runtime');
      expect(result.Properties.AgentRuntimeName).toBe('test_service_myAgent_dev');
      expect(result.Properties.AgentRuntimeArtifact).toEqual({
        ContainerConfiguration: {
          ContainerUri: '123456789.dkr.ecr.us-west-2.amazonaws.com/my-agent:latest',
        },
      });
      expect(result.Properties.NetworkConfiguration).toEqual({
        NetworkMode: 'PUBLIC',
      });
      expect(result.Properties.RoleArn).toEqual({
        'Fn::GetAtt': ['MyagentRuntimeRole', 'Arn'],
      });
    });

    test('includes optional properties when provided', () => {
      const config = {
        type: 'runtime',
        description: 'Test agent',
        protocol: 'MCP',
        artifact: {
          containerImage: '123456789.dkr.ecr.us-west-2.amazonaws.com/my-agent:latest',
        },
        environment: {
          MODEL_ID: 'anthropic.claude-sonnet-4-20250514',
        },
      };

      const result = compileRuntime('myAgent', config, baseContext, baseTags);

      expect(result.Properties.Description).toBe('Test agent');
      expect(result.Properties.ProtocolConfiguration).toBe('MCP');
      expect(result.Properties.EnvironmentVariables).toEqual({
        MODEL_ID: 'anthropic.claude-sonnet-4-20250514',
      });
    });

    test('uses provided roleArn when specified', () => {
      const config = {
        type: 'runtime',
        roleArn: 'arn:aws:iam::123456789012:role/MyCustomRole',
        artifact: {
          containerImage: '123456789.dkr.ecr.us-west-2.amazonaws.com/my-agent:latest',
        },
      };

      const result = compileRuntime('myAgent', config, baseContext, baseTags);

      expect(result.Properties.RoleArn).toBe('arn:aws:iam::123456789012:role/MyCustomRole');
    });

    test('includes RequestHeaderConfiguration when requestHeaders is provided', () => {
      const config = {
        type: 'runtime',
        artifact: {
          containerImage: '123456789.dkr.ecr.us-west-2.amazonaws.com/my-agent:latest',
        },
        requestHeaders: {
          allowlist: ['X-Custom-Header', 'Authorization', 'X-Correlation-ID'],
        },
      };

      const result = compileRuntime('myAgent', config, baseContext, baseTags);

      expect(result.Properties.RequestHeaderConfiguration).toEqual({
        RequestHeaderAllowlist: ['X-Custom-Header', 'Authorization', 'X-Correlation-ID'],
      });
    });

    test('omits RequestHeaderConfiguration when requestHeaders is not provided', () => {
      const config = {
        type: 'runtime',
        artifact: {
          containerImage: '123456789.dkr.ecr.us-west-2.amazonaws.com/my-agent:latest',
        },
      };

      const result = compileRuntime('myAgent', config, baseContext, baseTags);

      expect(result.Properties.RequestHeaderConfiguration).toBeUndefined();
    });
  });

  describe('buildRequestHeaderConfiguration', () => {
    test('returns null when requestHeaders is null', () => {
      const result = buildRequestHeaderConfiguration(null);
      expect(result).toBeNull();
    });

    test('returns null when requestHeaders is undefined', () => {
      const result = buildRequestHeaderConfiguration(undefined);
      expect(result).toBeNull();
    });

    test('returns null when allowlist is empty', () => {
      const result = buildRequestHeaderConfiguration({ allowlist: [] });
      expect(result).toBeNull();
    });

    test('returns null when allowlist is not provided', () => {
      const result = buildRequestHeaderConfiguration({});
      expect(result).toBeNull();
    });

    test('builds RequestHeaderConfiguration with allowlist', () => {
      const requestHeaders = {
        allowlist: ['X-Custom-Header', 'Authorization', 'X-Correlation-ID'],
      };

      const result = buildRequestHeaderConfiguration(requestHeaders);

      expect(result).toEqual({
        RequestHeaderAllowlist: ['X-Custom-Header', 'Authorization', 'X-Correlation-ID'],
      });
    });

    test('builds RequestHeaderConfiguration with single header', () => {
      const requestHeaders = {
        allowlist: ['Authorization'],
      };

      const result = buildRequestHeaderConfiguration(requestHeaders);

      expect(result).toEqual({
        RequestHeaderAllowlist: ['Authorization'],
      });
    });

    test('builds RequestHeaderConfiguration with maximum 20 headers', () => {
      const allowlist = Array.from({ length: 20 }, (_, i) => `Header-${i + 1}`);
      const requestHeaders = { allowlist };

      const result = buildRequestHeaderConfiguration(requestHeaders);

      expect(result).toEqual({
        RequestHeaderAllowlist: allowlist,
      });
      expect(result.RequestHeaderAllowlist).toHaveLength(20);
    });
  });
});
