'use strict';

const { runServerless, getLogicalId } = require('../utils/runServerless');

describe('Browser Integration Tests', () => {
  let cfTemplate;

  beforeAll(async () => {
    const result = await runServerless({
      fixture: 'browser',
      command: 'package',
    });
    cfTemplate = result.cfTemplate;
  });

  test('generates Browser resource with correct type', () => {
    const logicalId = getLogicalId('webBrowser', 'Browser');
    const resource = cfTemplate.Resources[logicalId];

    expect(resource).toBeDefined();
    expect(resource.Type).toBe('AWS::BedrockAgentCore::BrowserCustom');
  });

  test('generates Browser IAM Role', () => {
    const logicalId = getLogicalId('webBrowser', 'Browser') + 'Role';
    const role = cfTemplate.Resources[logicalId];

    expect(role).toBeDefined();
    expect(role.Type).toBe('AWS::IAM::Role');
  });

  test('Browser has correct properties', () => {
    const logicalId = getLogicalId('webBrowser', 'Browser');
    const resource = cfTemplate.Resources[logicalId];

    expect(resource.Properties).toMatchObject({
      Name: expect.stringContaining('webBrowser'),
      Description: 'Web browser for agent interactions',
    });
  });

  test('Browser has PUBLIC network configuration', () => {
    const logicalId = getLogicalId('webBrowser', 'Browser');
    const resource = cfTemplate.Resources[logicalId];

    expect(resource.Properties.NetworkConfiguration).toEqual({
      NetworkMode: 'PUBLIC',
    });
  });

  test('Browser has signing enabled', () => {
    const logicalId = getLogicalId('webBrowser', 'Browser');
    const resource = cfTemplate.Resources[logicalId];

    expect(resource.Properties.BrowserSigning).toEqual({
      Enabled: true,
    });
  });

  test('Browser has recording configuration', () => {
    const logicalId = getLogicalId('webBrowser', 'Browser');
    const resource = cfTemplate.Resources[logicalId];

    expect(resource.Properties.RecordingConfig).toEqual({
      Enabled: true,
      S3Location: {
        Bucket: 'my-recordings-bucket',
        Prefix: 'browser-sessions/',
      },
    });
  });

  test('Browser Role has correct assume role policy', () => {
    const logicalId = getLogicalId('webBrowser', 'Browser') + 'Role';
    const role = cfTemplate.Resources[logicalId];

    expect(role.Properties.AssumeRolePolicyDocument.Statement[0].Principal.Service).toBe(
      'bedrock-agentcore.amazonaws.com'
    );
  });

  test('generates CloudFormation outputs', () => {
    const browserArnOutput = Object.keys(cfTemplate.Outputs || {}).find((k) =>
      k.includes('BrowserArn')
    );

    expect(browserArnOutput).toBeDefined();
  });
});
