'use strict';

const {
  generateRuntimeRole,
  generateMemoryRole,
  generateGatewayRole,
  getS3PermissionsForTargets,
  getSecretsManagerPermissions,
} = require('../../../src/iam/policies');

describe('IAM Policies', () => {
  const baseContext = {
    serviceName: 'test-service',
    stage: 'dev',
    region: 'us-west-2',
    accountId: '123456789012',
  };

  describe('generateRuntimeRole', () => {
    test('generates role with correct assume role policy', () => {
      const config = {
        artifact: {
          containerImage: '123456789.dkr.ecr.us-west-2.amazonaws.com/my-agent:latest',
        },
      };

      const result = generateRuntimeRole('myAgent', config, baseContext);

      expect(result.Type).toBe('AWS::IAM::Role');
      expect(result.Properties.AssumeRolePolicyDocument.Statement[0].Principal.Service).toBe(
        'bedrock-agentcore.amazonaws.com'
      );
      expect(result.Properties.AssumeRolePolicyDocument.Statement[0].Action).toBe('sts:AssumeRole');
    });

    test('includes CloudWatch Logs permissions', () => {
      const config = {
        artifact: {
          containerImage: '123456789.dkr.ecr.us-west-2.amazonaws.com/my-agent:latest',
        },
      };

      const result = generateRuntimeRole('myAgent', config, baseContext);
      const statements = result.Properties.Policies[0].PolicyDocument.Statement;

      const logsStatement = statements.find((s) => s.Action.includes('logs:CreateLogGroup'));
      expect(logsStatement).toBeDefined();
      expect(logsStatement.Resource['Fn::Sub']).toContain('/aws/bedrock-agentcore/*');
    });

    test('includes ECR permissions for container image artifact', () => {
      const config = {
        artifact: {
          containerImage: '123456789.dkr.ecr.us-west-2.amazonaws.com/my-agent:latest',
        },
      };

      const result = generateRuntimeRole('myAgent', config, baseContext);
      const statements = result.Properties.Policies[0].PolicyDocument.Statement;

      const ecrAuthStatement = statements.find(
        (s) => Array.isArray(s.Action) && s.Action.includes('ecr:GetAuthorizationToken')
      );
      expect(ecrAuthStatement).toBeDefined();

      const ecrImageStatement = statements.find(
        (s) => Array.isArray(s.Action) && s.Action.includes('ecr:BatchGetImage')
      );
      expect(ecrImageStatement).toBeDefined();
    });

    test('includes S3 permissions for S3 artifact', () => {
      const config = {
        artifact: {
          s3: {
            bucket: 'my-bucket',
            key: 'agents/my-agent.zip',
          },
        },
      };

      const result = generateRuntimeRole('myAgent', config, baseContext);
      const statements = result.Properties.Policies[0].PolicyDocument.Statement;

      const s3Statement = statements.find(
        (s) => Array.isArray(s.Action) && s.Action.includes('s3:GetObject')
      );
      expect(s3Statement).toBeDefined();
      expect(s3Statement.Resource['Fn::Sub']).toContain('my-bucket');
    });

    test('includes cross-region Bedrock model invocation permissions', () => {
      const config = {
        artifact: {
          containerImage: '123456789.dkr.ecr.us-west-2.amazonaws.com/my-agent:latest',
        },
      };

      const result = generateRuntimeRole('myAgent', config, baseContext);
      const statements = result.Properties.Policies[0].PolicyDocument.Statement;

      // Check foundation model permissions use wildcard region for cross-region inference
      const foundationModelStatement = statements.find(
        (s) =>
          Array.isArray(s.Action) &&
          s.Action.includes('bedrock:InvokeModel') &&
          s.Resource?.['Fn::Sub']?.includes('foundation-model')
      );
      expect(foundationModelStatement).toBeDefined();
      expect(foundationModelStatement.Resource['Fn::Sub']).toBe(
        'arn:${AWS::Partition}:bedrock:*::foundation-model/*'
      );
    });

    test('includes inference profile permissions for cross-region inference', () => {
      const config = {
        artifact: {
          containerImage: '123456789.dkr.ecr.us-west-2.amazonaws.com/my-agent:latest',
        },
      };

      const result = generateRuntimeRole('myAgent', config, baseContext);
      const statements = result.Properties.Policies[0].PolicyDocument.Statement;

      // Check inference profile permissions
      const inferenceProfileStatement = statements.find(
        (s) => Array.isArray(s.Action) && s.Action.includes('bedrock:GetInferenceProfile')
      );
      expect(inferenceProfileStatement).toBeDefined();
      expect(inferenceProfileStatement.Resource).toContain(
        'arn:aws:bedrock:*:*:inference-profile/us.*'
      );
      expect(inferenceProfileStatement.Resource).toContain(
        'arn:aws:bedrock:*:*:inference-profile/eu.*'
      );
      expect(inferenceProfileStatement.Resource).toContain(
        'arn:aws:bedrock:*:*:inference-profile/global.*'
      );
    });

    test('includes VPC permissions when networkMode is VPC', () => {
      const config = {
        artifact: {
          containerImage: '123456789.dkr.ecr.us-west-2.amazonaws.com/my-agent:latest',
        },
        network: {
          networkMode: 'VPC',
        },
      };

      const result = generateRuntimeRole('myAgent', config, baseContext);
      const statements = result.Properties.Policies[0].PolicyDocument.Statement;

      const vpcStatement = statements.find(
        (s) => Array.isArray(s.Action) && s.Action.includes('ec2:CreateNetworkInterface')
      );
      expect(vpcStatement).toBeDefined();
    });

    test('includes proper tags', () => {
      const config = {
        artifact: {
          containerImage: '123456789.dkr.ecr.us-west-2.amazonaws.com/my-agent:latest',
        },
      };

      const result = generateRuntimeRole('myAgent', config, baseContext);

      expect(result.Properties.Tags).toContainEqual({
        Key: 'serverless:service',
        Value: 'test-service',
      });
      expect(result.Properties.Tags).toContainEqual({
        Key: 'agentcore:type',
        Value: 'runtime-role',
      });
    });
  });

  describe('generateMemoryRole', () => {
    test('generates role with correct structure', () => {
      const config = {};

      const result = generateMemoryRole('myMemory', config, baseContext);

      expect(result.Type).toBe('AWS::IAM::Role');
      expect(result.Properties.RoleName).toContain('myMemory');
      expect(result.Properties.RoleName).toContain('memory_role');
    });

    test('includes cross-region Bedrock permissions', () => {
      const config = {};

      const result = generateMemoryRole('myMemory', config, baseContext);
      const statements = result.Properties.Policies[0].PolicyDocument.Statement;

      // Check foundation model permissions use wildcard region
      const foundationModelStatement = statements.find((s) =>
        s.Resource?.['Fn::Sub']?.includes('foundation-model')
      );
      expect(foundationModelStatement).toBeDefined();
      expect(foundationModelStatement.Resource['Fn::Sub']).toBe(
        'arn:${AWS::Partition}:bedrock:*::foundation-model/*'
      );
    });

    test('includes inference profile permissions', () => {
      const config = {};

      const result = generateMemoryRole('myMemory', config, baseContext);
      const statements = result.Properties.Policies[0].PolicyDocument.Statement;

      const inferenceProfileStatement = statements.find(
        (s) => Array.isArray(s.Action) && s.Action.includes('bedrock:GetInferenceProfile')
      );
      expect(inferenceProfileStatement).toBeDefined();
    });

    test('includes KMS permissions when encryptionKeyArn is specified', () => {
      const config = {
        encryptionKeyArn:
          'arn:aws:kms:us-west-2:123456789012:key/12345678-1234-1234-1234-123456789012',
      };

      const result = generateMemoryRole('myMemory', config, baseContext);
      const statements = result.Properties.Policies[0].PolicyDocument.Statement;

      const kmsStatement = statements.find(
        (s) => Array.isArray(s.Action) && s.Action.includes('kms:Decrypt')
      );
      expect(kmsStatement).toBeDefined();
      expect(kmsStatement.Resource).toBe(config.encryptionKeyArn);
    });
  });

  describe('generateGatewayRole', () => {
    test('generates role with correct structure', () => {
      const config = {};

      const result = generateGatewayRole('myGateway', config, baseContext);

      expect(result.Type).toBe('AWS::IAM::Role');
      expect(result.Properties.RoleName).toContain('gateway_role');
    });

    test('includes Lambda invocation permissions for Lambda targets', () => {
      const config = {
        targets: [
          {
            type: 'lambda',
            functionArn: 'arn:aws:lambda:us-west-2:123456789012:function:myFunction',
          },
        ],
      };

      const result = generateGatewayRole('myGateway', config, baseContext);
      const statements = result.Properties.Policies[0].PolicyDocument.Statement;

      const lambdaStatement = statements.find(
        (s) => Array.isArray(s.Action) && s.Action.includes('lambda:InvokeFunction')
      );
      expect(lambdaStatement).toBeDefined();
    });
  });

  describe('getS3PermissionsForTargets', () => {
    test('returns empty array when no S3 targets', () => {
      const targets = [{ type: 'lambda', functionArn: 'arn:aws:lambda:...' }];

      const result = getS3PermissionsForTargets(targets);
      expect(result).toEqual([]);
    });

    test('returns S3 permissions for S3 targets', () => {
      const targets = [
        {
          s3: {
            bucket: 'my-bucket',
            key: 'specs/openapi.yaml',
          },
        },
      ];

      const result = getS3PermissionsForTargets(targets);

      expect(result).toHaveLength(1);
      expect(result[0].Action).toContain('s3:GetObject');
    });
  });

  describe('getSecretsManagerPermissions', () => {
    test('returns empty array when no credential providers', () => {
      const targets = [{ type: 'lambda', functionArn: 'arn:aws:lambda:...' }];

      const result = getSecretsManagerPermissions(targets);
      expect(result).toEqual([]);
    });

    test('returns Secrets Manager permissions for OAuth config', () => {
      const targets = [
        {
          credentialProvider: {
            oauthConfig: {
              secretArn: 'arn:aws:secretsmanager:us-west-2:123456789012:secret:my-oauth-secret',
            },
          },
        },
      ];

      const result = getSecretsManagerPermissions(targets);

      expect(result).toHaveLength(1);
      expect(result[0].Action).toContain('secretsmanager:GetSecretValue');
      expect(result[0].Resource).toContain(targets[0].credentialProvider.oauthConfig.secretArn);
    });

    test('returns Secrets Manager permissions for API key config', () => {
      const targets = [
        {
          credentialProvider: {
            apiKeyConfig: {
              secretArn: 'arn:aws:secretsmanager:us-west-2:123456789012:secret:my-api-key',
            },
          },
        },
      ];

      const result = getSecretsManagerPermissions(targets);

      expect(result).toHaveLength(1);
      expect(result[0].Resource).toContain(targets[0].credentialProvider.apiKeyConfig.secretArn);
    });
  });
});
