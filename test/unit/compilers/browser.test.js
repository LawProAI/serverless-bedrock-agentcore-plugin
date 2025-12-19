'use strict';

const {
  compileBrowser,
  buildBrowserNetworkConfiguration,
  buildRecordingConfig,
  buildBrowserSigning,
} = require('../../../src/compilers/browser');

describe('Browser Compiler', () => {
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
    'agentcore:resource': 'webBrowser',
  };

  describe('buildBrowserNetworkConfiguration', () => {
    test('defaults to PUBLIC mode', () => {
      const result = buildBrowserNetworkConfiguration();
      expect(result).toEqual({ NetworkMode: 'PUBLIC' });
    });

    test('handles PUBLIC mode explicitly', () => {
      const network = { networkMode: 'PUBLIC' };
      const result = buildBrowserNetworkConfiguration(network);
      expect(result).toEqual({ NetworkMode: 'PUBLIC' });
    });

    test('builds VPC configuration', () => {
      const network = {
        networkMode: 'VPC',
        vpcConfig: {
          subnetIds: ['subnet-123', 'subnet-456'],
          securityGroupIds: ['sg-123'],
        },
      };

      const result = buildBrowserNetworkConfiguration(network);

      expect(result).toEqual({
        NetworkMode: 'VPC',
        VpcConfig: {
          SubnetIds: ['subnet-123', 'subnet-456'],
          SecurityGroupIds: ['sg-123'],
        },
      });
    });

    test('ignores VpcConfig when not in VPC mode', () => {
      const network = {
        networkMode: 'PUBLIC',
        vpcConfig: {
          subnetIds: ['subnet-123'],
        },
      };

      const result = buildBrowserNetworkConfiguration(network);

      expect(result).toEqual({ NetworkMode: 'PUBLIC' });
      expect(result.VpcConfig).toBeUndefined();
    });
  });

  describe('buildRecordingConfig', () => {
    test('returns null when not provided', () => {
      expect(buildRecordingConfig(null)).toBeNull();
      expect(buildRecordingConfig(undefined)).toBeNull();
    });

    test('returns null for empty config', () => {
      expect(buildRecordingConfig({})).toBeNull();
    });

    test('builds recording config with enabled flag', () => {
      const recording = { enabled: true };
      const result = buildRecordingConfig(recording);
      expect(result).toEqual({ Enabled: true });
    });

    test('builds recording config with S3 location', () => {
      const recording = {
        enabled: true,
        s3Location: {
          bucket: 'my-recordings',
          prefix: 'browser-sessions/',
        },
      };

      const result = buildRecordingConfig(recording);

      expect(result).toEqual({
        Enabled: true,
        S3Location: {
          Bucket: 'my-recordings',
          Prefix: 'browser-sessions/',
        },
      });
    });

    test('builds recording config with bucket only', () => {
      const recording = {
        s3Location: {
          bucket: 'my-recordings',
        },
      };

      const result = buildRecordingConfig(recording);

      expect(result).toEqual({
        S3Location: {
          Bucket: 'my-recordings',
        },
      });
    });
  });

  describe('buildBrowserSigning', () => {
    test('returns null when not provided', () => {
      expect(buildBrowserSigning(null)).toBeNull();
      expect(buildBrowserSigning(undefined)).toBeNull();
    });

    test('builds signing config with enabled true', () => {
      const result = buildBrowserSigning({ enabled: true });
      expect(result).toEqual({ Enabled: true });
    });

    test('builds signing config with enabled false', () => {
      const result = buildBrowserSigning({ enabled: false });
      expect(result).toEqual({ Enabled: false });
    });

    test('defaults to false when enabled not specified', () => {
      const result = buildBrowserSigning({});
      expect(result).toEqual({ Enabled: false });
    });
  });

  describe('compileBrowser', () => {
    test('generates valid CloudFormation with minimal config', () => {
      const config = {
        type: 'browser',
        network: { networkMode: 'PUBLIC' },
      };

      const result = compileBrowser('webBrowser', config, baseContext, baseTags);

      expect(result.Type).toBe('AWS::BedrockAgentCore::BrowserCustom');
      expect(result.Properties.Name).toBe('test_service_webBrowser_dev');
      expect(result.Properties.NetworkConfiguration).toEqual({ NetworkMode: 'PUBLIC' });
      expect(result.Properties.ExecutionRoleArn).toEqual({
        'Fn::GetAtt': ['WebbrowserBrowserRole', 'Arn'],
      });
    });

    test('uses provided roleArn when specified', () => {
      const config = {
        type: 'browser',
        roleArn: 'arn:aws:iam::123456789012:role/CustomRole',
      };

      const result = compileBrowser('webBrowser', config, baseContext, baseTags);

      expect(result.Properties.ExecutionRoleArn).toBe('arn:aws:iam::123456789012:role/CustomRole');
    });

    test('includes description when provided', () => {
      const config = {
        type: 'browser',
        description: 'Web browser for scraping',
      };

      const result = compileBrowser('webBrowser', config, baseContext, baseTags);

      expect(result.Properties.Description).toBe('Web browser for scraping');
    });

    test('includes all optional properties', () => {
      const config = {
        type: 'browser',
        description: 'Full browser config',
        network: {
          networkMode: 'VPC',
          vpcConfig: {
            subnetIds: ['subnet-123'],
            securityGroupIds: ['sg-123'],
          },
        },
        signing: { enabled: true },
        recording: {
          enabled: true,
          s3Location: { bucket: 'recordings', prefix: 'sessions/' },
        },
      };

      const result = compileBrowser('webBrowser', config, baseContext, baseTags);

      expect(result.Properties.Description).toBe('Full browser config');
      expect(result.Properties.NetworkConfiguration.NetworkMode).toBe('VPC');
      expect(result.Properties.BrowserSigning).toEqual({ Enabled: true });
      expect(result.Properties.RecordingConfig).toEqual({
        Enabled: true,
        S3Location: { Bucket: 'recordings', Prefix: 'sessions/' },
      });
    });

    test('omits optional properties when not provided', () => {
      const config = {
        type: 'browser',
      };

      const result = compileBrowser('webBrowser', config, baseContext, {});

      expect(result.Properties.Description).toBeUndefined();
      expect(result.Properties.BrowserSigning).toBeUndefined();
      expect(result.Properties.RecordingConfig).toBeUndefined();
      expect(result.Properties.Tags).toBeUndefined();
    });

    test('includes tags when provided', () => {
      const config = {
        type: 'browser',
      };

      const result = compileBrowser('webBrowser', config, baseContext, baseTags);

      expect(result.Properties.Tags).toEqual(baseTags);
    });
  });
});
