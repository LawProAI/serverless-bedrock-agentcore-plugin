'use strict';

const { runServerless, getLogicalId } = require('../utils/runServerless');

describe('Runtime Integration Tests', () => {
  describe('Basic Runtime Configuration', () => {
    let cfTemplate;

    beforeAll(async () => {
      const result = await runServerless({
        fixture: 'runtime-basic',
        command: 'package',
      });
      cfTemplate = result.cfTemplate;
    });

    test('generates Runtime resource with correct type', () => {
      const logicalId = getLogicalId('myAgent', 'Runtime');
      const resource = cfTemplate.Resources[logicalId];

      expect(resource).toBeDefined();
      expect(resource.Type).toBe('AWS::BedrockAgentCore::Runtime');
    });

    test('generates Runtime IAM Role', () => {
      const logicalId = getLogicalId('myAgent', 'Runtime') + 'Role';
      const role = cfTemplate.Resources[logicalId];

      expect(role).toBeDefined();
      expect(role.Type).toBe('AWS::IAM::Role');
    });

    test('Runtime has correct properties', () => {
      const logicalId = getLogicalId('myAgent', 'Runtime');
      const resource = cfTemplate.Resources[logicalId];

      expect(resource.Properties).toMatchObject({
        AgentRuntimeName: expect.stringContaining('myAgent'),
        Description: 'Basic test agent',
        ProtocolConfiguration: 'HTTP',
        NetworkConfiguration: {
          NetworkMode: 'PUBLIC',
        },
        AgentRuntimeArtifact: {
          ContainerConfiguration: {
            ContainerUri: '123456789.dkr.ecr.us-east-1.amazonaws.com/my-agent:latest',
          },
        },
      });
    });

    test('Runtime Role has correct assume role policy', () => {
      const logicalId = getLogicalId('myAgent', 'Runtime') + 'Role';
      const role = cfTemplate.Resources[logicalId];

      expect(role.Properties.AssumeRolePolicyDocument.Statement[0]).toMatchObject({
        Effect: 'Allow',
        Principal: {
          Service: 'bedrock-agentcore.amazonaws.com',
        },
        Action: 'sts:AssumeRole',
      });
    });

    test('Runtime Role has ECR permissions for container image', () => {
      const logicalId = getLogicalId('myAgent', 'Runtime') + 'Role';
      const role = cfTemplate.Resources[logicalId];
      const statements = role.Properties.Policies[0].PolicyDocument.Statement;

      const ecrAuthStatement = statements.find(
        (s) => Array.isArray(s.Action) && s.Action.includes('ecr:GetAuthorizationToken')
      );
      expect(ecrAuthStatement).toBeDefined();
    });

    test('Runtime Role has cross-region Bedrock permissions', () => {
      const logicalId = getLogicalId('myAgent', 'Runtime') + 'Role';
      const role = cfTemplate.Resources[logicalId];
      const statements = role.Properties.Policies[0].PolicyDocument.Statement;

      // Check foundation model permissions use wildcard region
      const foundationModelStatement = statements.find((s) =>
        s.Resource?.['Fn::Sub']?.includes('foundation-model')
      );
      expect(foundationModelStatement).toBeDefined();
      expect(foundationModelStatement.Resource['Fn::Sub']).toBe(
        'arn:${AWS::Partition}:bedrock:*::foundation-model/*'
      );
    });

    test('Runtime Role has inference profile permissions', () => {
      const logicalId = getLogicalId('myAgent', 'Runtime') + 'Role';
      const role = cfTemplate.Resources[logicalId];
      const statements = role.Properties.Policies[0].PolicyDocument.Statement;

      const inferenceProfileStatement = statements.find(
        (s) => Array.isArray(s.Action) && s.Action.includes('bedrock:GetInferenceProfile')
      );
      expect(inferenceProfileStatement).toBeDefined();
      expect(inferenceProfileStatement.Resource).toContain(
        'arn:aws:bedrock:*:*:inference-profile/us.*'
      );
    });

    test('generates CloudFormation outputs', () => {
      const runtimeArnOutput = Object.keys(cfTemplate.Outputs || {}).find((k) =>
        k.includes('RuntimeArn')
      );
      const runtimeIdOutput = Object.keys(cfTemplate.Outputs || {}).find((k) =>
        k.includes('RuntimeId')
      );

      expect(runtimeArnOutput).toBeDefined();
      expect(runtimeIdOutput).toBeDefined();
    });
  });

  describe('Full Runtime Configuration', () => {
    let cfTemplate;

    beforeAll(async () => {
      const result = await runServerless({
        fixture: 'runtime-full',
        command: 'package',
      });
      cfTemplate = result.cfTemplate;
    });

    test('generates Runtime with VPC configuration', () => {
      const logicalId = getLogicalId('productionAgent', 'Runtime');
      const resource = cfTemplate.Resources[logicalId];

      expect(resource.Properties.NetworkConfiguration).toMatchObject({
        NetworkMode: 'VPC',
        VpcConfiguration: {
          SubnetIds: ['subnet-12345', 'subnet-67890'],
          SecurityGroupIds: ['sg-abcdef'],
        },
      });
    });

    test('generates Runtime with MCP protocol', () => {
      const logicalId = getLogicalId('productionAgent', 'Runtime');
      const resource = cfTemplate.Resources[logicalId];

      expect(resource.Properties.ProtocolConfiguration).toBe('MCP');
    });

    test('generates Runtime with authorizer configuration', () => {
      const logicalId = getLogicalId('productionAgent', 'Runtime');
      const resource = cfTemplate.Resources[logicalId];

      expect(resource.Properties.AuthorizerConfiguration).toMatchObject({
        CustomJWTAuthorizer: {
          DiscoveryUrl: 'https://auth.example.com/.well-known/openid-configuration',
          AllowedAudience: ['api://my-api'],
        },
      });
    });

    test('generates Runtime with lifecycle configuration', () => {
      const logicalId = getLogicalId('productionAgent', 'Runtime');
      const resource = cfTemplate.Resources[logicalId];

      expect(resource.Properties.LifecycleConfiguration).toMatchObject({
        IdleTimeoutSeconds: 600,
        MaxConcurrency: 50,
      });
    });

    test('generates Runtime with environment variables', () => {
      const logicalId = getLogicalId('productionAgent', 'Runtime');
      const resource = cfTemplate.Resources[logicalId];

      expect(resource.Properties.EnvironmentVariables).toMatchObject({
        MODEL_ID: 'anthropic.claude-sonnet-4-20250514',
        LOG_LEVEL: 'INFO',
      });
    });

    test('generates Runtime with custom tags', () => {
      const logicalId = getLogicalId('productionAgent', 'Runtime');
      const resource = cfTemplate.Resources[logicalId];

      expect(resource.Properties.Tags).toMatchObject({
        Project: 'test-project',
        Environment: 'production',
      });
    });

    test('Runtime Role has VPC permissions', () => {
      const logicalId = getLogicalId('productionAgent', 'Runtime') + 'Role';
      const role = cfTemplate.Resources[logicalId];
      const statements = role.Properties.Policies[0].PolicyDocument.Statement;

      const vpcStatement = statements.find(
        (s) => Array.isArray(s.Action) && s.Action.includes('ec2:CreateNetworkInterface')
      );
      expect(vpcStatement).toBeDefined();
    });
  });
});
