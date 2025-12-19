'use strict';

const {
  compileCodeInterpreter,
  buildCodeInterpreterNetworkConfiguration,
} = require('../../../src/compilers/codeInterpreter');

describe('CodeInterpreter Compiler', () => {
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
    'agentcore:resource': 'pythonExecutor',
  };

  describe('buildCodeInterpreterNetworkConfiguration', () => {
    test('defaults to SANDBOX mode', () => {
      const result = buildCodeInterpreterNetworkConfiguration();
      expect(result).toEqual({ NetworkMode: 'SANDBOX' });
    });

    test('supports PUBLIC mode', () => {
      const result = buildCodeInterpreterNetworkConfiguration({ networkMode: 'PUBLIC' });
      expect(result).toEqual({ NetworkMode: 'PUBLIC' });
    });

    test('supports SANDBOX mode explicitly', () => {
      const result = buildCodeInterpreterNetworkConfiguration({ networkMode: 'SANDBOX' });
      expect(result).toEqual({ NetworkMode: 'SANDBOX' });
    });

    test('supports VPC mode with configuration', () => {
      const network = {
        networkMode: 'VPC',
        vpcConfig: {
          subnetIds: ['subnet-123', 'subnet-456'],
          securityGroupIds: ['sg-789'],
        },
      };

      const result = buildCodeInterpreterNetworkConfiguration(network);

      expect(result).toEqual({
        NetworkMode: 'VPC',
        VpcConfig: {
          SubnetIds: ['subnet-123', 'subnet-456'],
          SecurityGroupIds: ['sg-789'],
        },
      });
    });

    test('ignores VpcConfig when not in VPC mode', () => {
      const network = {
        networkMode: 'SANDBOX',
        vpcConfig: {
          subnetIds: ['subnet-123'],
        },
      };

      const result = buildCodeInterpreterNetworkConfiguration(network);

      expect(result).toEqual({ NetworkMode: 'SANDBOX' });
      expect(result.VpcConfig).toBeUndefined();
    });

    test('handles partial VPC config', () => {
      const network = {
        networkMode: 'VPC',
        vpcConfig: {
          subnetIds: ['subnet-123'],
        },
      };

      const result = buildCodeInterpreterNetworkConfiguration(network);

      expect(result).toEqual({
        NetworkMode: 'VPC',
        VpcConfig: {
          SubnetIds: ['subnet-123'],
        },
      });
    });
  });

  describe('compileCodeInterpreter', () => {
    test('generates valid CloudFormation with minimal config', () => {
      const config = {
        type: 'codeInterpreter',
      };

      const result = compileCodeInterpreter('pythonExecutor', config, baseContext, baseTags);

      expect(result.Type).toBe('AWS::BedrockAgentCore::CodeInterpreterCustom');
      expect(result.Properties.Name).toBe('test_service_pythonExecutor_dev');
      expect(result.Properties.NetworkConfiguration).toEqual({ NetworkMode: 'SANDBOX' });
      expect(result.Properties.ExecutionRoleArn).toEqual({
        'Fn::GetAtt': ['PythonexecutorCodeInterpreterRole', 'Arn'],
      });
    });

    test('uses provided roleArn when specified', () => {
      const config = {
        type: 'codeInterpreter',
        roleArn: 'arn:aws:iam::123456789012:role/CustomRole',
      };

      const result = compileCodeInterpreter('pythonExecutor', config, baseContext, baseTags);

      expect(result.Properties.ExecutionRoleArn).toBe('arn:aws:iam::123456789012:role/CustomRole');
    });

    test('includes description when provided', () => {
      const config = {
        type: 'codeInterpreter',
        description: 'Python code executor',
      };

      const result = compileCodeInterpreter('pythonExecutor', config, baseContext, baseTags);

      expect(result.Properties.Description).toBe('Python code executor');
    });

    test('generates with VPC network configuration', () => {
      const config = {
        type: 'codeInterpreter',
        network: {
          networkMode: 'VPC',
          vpcConfig: {
            subnetIds: ['subnet-123'],
            securityGroupIds: ['sg-456'],
          },
        },
      };

      const result = compileCodeInterpreter('pythonExecutor', config, baseContext, baseTags);

      expect(result.Properties.NetworkConfiguration).toEqual({
        NetworkMode: 'VPC',
        VpcConfig: {
          SubnetIds: ['subnet-123'],
          SecurityGroupIds: ['sg-456'],
        },
      });
    });

    test('generates with PUBLIC network mode', () => {
      const config = {
        type: 'codeInterpreter',
        network: { networkMode: 'PUBLIC' },
      };

      const result = compileCodeInterpreter('pythonExecutor', config, baseContext, baseTags);

      expect(result.Properties.NetworkConfiguration).toEqual({ NetworkMode: 'PUBLIC' });
    });

    test('omits optional properties when not provided', () => {
      const config = {
        type: 'codeInterpreter',
      };

      const result = compileCodeInterpreter('pythonExecutor', config, baseContext, {});

      expect(result.Properties.Description).toBeUndefined();
      expect(result.Properties.Tags).toBeUndefined();
    });

    test('includes tags when provided', () => {
      const config = {
        type: 'codeInterpreter',
      };

      const result = compileCodeInterpreter('pythonExecutor', config, baseContext, baseTags);

      expect(result.Properties.Tags).toEqual(baseTags);
    });
  });
});
