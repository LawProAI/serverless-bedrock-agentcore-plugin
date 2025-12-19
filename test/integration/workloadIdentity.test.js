'use strict';

const { runServerless, getLogicalId } = require('../utils/runServerless');

describe('WorkloadIdentity Integration Tests', () => {
  let cfTemplate;

  beforeAll(async () => {
    const result = await runServerless({
      fixture: 'workload-identity',
      command: 'package',
    });
    cfTemplate = result.cfTemplate;
  });

  test('generates WorkloadIdentity resource with correct type', () => {
    const logicalId = getLogicalId('agentIdentity', 'WorkloadIdentity');
    const resource = cfTemplate.Resources[logicalId];

    expect(resource).toBeDefined();
    expect(resource.Type).toBe('AWS::BedrockAgentCore::WorkloadIdentity');
  });

  test('WorkloadIdentity does not generate an IAM Role', () => {
    const roleLogicalId = getLogicalId('agentIdentity', 'WorkloadIdentity') + 'Role';
    const role = cfTemplate.Resources[roleLogicalId];

    expect(role).toBeUndefined();
  });

  test('WorkloadIdentity has correct name with hyphens', () => {
    const logicalId = getLogicalId('agentIdentity', 'WorkloadIdentity');
    const resource = cfTemplate.Resources[logicalId];

    // WorkloadIdentity uses hyphens in names instead of underscores
    expect(resource.Properties.Name).toBe('test-workload-identity-agentIdentity-dev');
  });

  test('WorkloadIdentity has OAuth2 return URLs', () => {
    const logicalId = getLogicalId('agentIdentity', 'WorkloadIdentity');
    const resource = cfTemplate.Resources[logicalId];

    expect(resource.Properties.AllowedResourceOauth2ReturnUrls).toEqual([
      'https://example.com/callback',
      'https://localhost:3000/auth/callback',
    ]);
  });

  test('WorkloadIdentity has tags in array format', () => {
    const logicalId = getLogicalId('agentIdentity', 'WorkloadIdentity');
    const resource = cfTemplate.Resources[logicalId];

    // Tags should be in array format for WorkloadIdentity
    expect(resource.Properties.Tags).toBeInstanceOf(Array);
    expect(resource.Properties.Tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ Key: 'serverless:service', Value: 'test-workload-identity' }),
        expect.objectContaining({ Key: 'serverless:stage', Value: 'dev' }),
      ])
    );
  });

  test('generates CloudFormation outputs', () => {
    const workloadIdentityArnOutput = Object.keys(cfTemplate.Outputs || {}).find((k) =>
      k.includes('WorkloadIdentityArn')
    );

    expect(workloadIdentityArnOutput).toBeDefined();
  });
});
