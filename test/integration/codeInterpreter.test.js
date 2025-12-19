'use strict';

const { runServerless, getLogicalId } = require('../utils/runServerless');

describe('CodeInterpreter Integration Tests', () => {
  let cfTemplate;

  beforeAll(async () => {
    const result = await runServerless({
      fixture: 'code-interpreter',
      command: 'package',
    });
    cfTemplate = result.cfTemplate;
  });

  test('generates CodeInterpreter resource with correct type', () => {
    const logicalId = getLogicalId('pythonExecutor', 'CodeInterpreter');
    const resource = cfTemplate.Resources[logicalId];

    expect(resource).toBeDefined();
    expect(resource.Type).toBe('AWS::BedrockAgentCore::CodeInterpreterCustom');
  });

  test('generates CodeInterpreter IAM Role', () => {
    const logicalId = getLogicalId('pythonExecutor', 'CodeInterpreter') + 'Role';
    const role = cfTemplate.Resources[logicalId];

    expect(role).toBeDefined();
    expect(role.Type).toBe('AWS::IAM::Role');
  });

  test('CodeInterpreter has correct properties', () => {
    const logicalId = getLogicalId('pythonExecutor', 'CodeInterpreter');
    const resource = cfTemplate.Resources[logicalId];

    expect(resource.Properties).toMatchObject({
      Name: expect.stringContaining('pythonExecutor'),
      Description: 'Python code execution sandbox',
    });
  });

  test('CodeInterpreter has SANDBOX network configuration', () => {
    const logicalId = getLogicalId('pythonExecutor', 'CodeInterpreter');
    const resource = cfTemplate.Resources[logicalId];

    expect(resource.Properties.NetworkConfiguration).toEqual({
      NetworkMode: 'SANDBOX',
    });
  });

  test('CodeInterpreter Role has correct assume role policy', () => {
    const logicalId = getLogicalId('pythonExecutor', 'CodeInterpreter') + 'Role';
    const role = cfTemplate.Resources[logicalId];

    expect(role.Properties.AssumeRolePolicyDocument.Statement[0].Principal.Service).toBe(
      'bedrock-agentcore.amazonaws.com'
    );
  });

  test('generates CloudFormation outputs', () => {
    const codeInterpreterArnOutput = Object.keys(cfTemplate.Outputs || {}).find((k) =>
      k.includes('CodeInterpreterArn')
    );

    expect(codeInterpreterArnOutput).toBeDefined();
  });
});
