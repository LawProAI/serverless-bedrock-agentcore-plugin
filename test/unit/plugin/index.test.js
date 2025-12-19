'use strict';

const ServerlessBedrockAgentCore = require('../../../src/index');

describe('ServerlessBedrockAgentCore', () => {
  let mockServerless;
  let mockOptions;
  let mockUtils;
  let plugin;

  beforeEach(() => {
    mockServerless = {
      service: {
        service: 'test-service',
        agents: {},
        provider: {
          compiledCloudFormationTemplate: {
            Resources: {},
            Outputs: {},
          },
          stage: 'dev',
          region: 'us-east-1',
        },
        custom: {},
        initialServerlessConfig: {},
      },
      getProvider: jest.fn().mockReturnValue({
        getStage: jest.fn().mockReturnValue('dev'),
        getRegion: jest.fn().mockReturnValue('us-east-1'),
        getAccountId: jest.fn().mockResolvedValue('123456789012'),
        naming: {
          getStackName: jest.fn().mockReturnValue('test-service-dev'),
        },
        request: jest.fn(),
      }),
      configSchemaHandler: {
        defineTopLevelProperty: jest.fn(),
        defineCustomProperties: jest.fn(),
      },
      classes: {
        Error: class ServerlessError extends Error {
          constructor(message) {
            super(message);
            this.name = 'ServerlessError';
          }
        },
      },
      configurationInput: {},
    };

    mockOptions = {};
    mockUtils = {
      log: {
        debug: jest.fn(),
        info: jest.fn(),
        notice: jest.fn(),
        warning: jest.fn(),
        error: jest.fn(),
      },
      progress: {},
      writeText: jest.fn(),
    };
  });

  describe('constructor', () => {
    test('initializes plugin with serverless instance', () => {
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);

      expect(plugin.serverless).toBe(mockServerless);
      expect(plugin.options).toBe(mockOptions);
      expect(plugin.log).toBe(mockUtils.log);
      expect(plugin.pluginName).toBe('serverless-bedrock-agentcore');
    });

    test('registers lifecycle hooks', () => {
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);

      expect(plugin.hooks).toHaveProperty('initialize');
      expect(plugin.hooks).toHaveProperty('before:package:initialize');
      expect(plugin.hooks).toHaveProperty('before:package:createDeploymentArtifacts');
      expect(plugin.hooks).toHaveProperty('package:compileEvents');
      expect(plugin.hooks).toHaveProperty('after:deploy:deploy');
    });

    test('defines agentcore commands', () => {
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);

      expect(plugin.commands.agentcore).toBeDefined();
      expect(plugin.commands.agentcore.commands.info).toBeDefined();
      expect(plugin.commands.agentcore.commands.build).toBeDefined();
      expect(plugin.commands.agentcore.commands.invoke).toBeDefined();
      expect(plugin.commands.agentcore.commands.logs).toBeDefined();
    });

    test('calls defineAgentsSchema', () => {
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);

      expect(mockServerless.configSchemaHandler.defineTopLevelProperty).toHaveBeenCalledWith(
        'agents',
        expect.any(Object)
      );
    });
  });

  describe('init', () => {
    test('logs debug message on init', () => {
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);
      plugin.init();

      expect(mockUtils.log.debug).toHaveBeenCalledWith('serverless-bedrock-agentcore initialized');
    });
  });

  describe('getContext', () => {
    test('returns correct context', () => {
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);

      const context = plugin.getContext();

      expect(context.serviceName).toBe('test-service');
      expect(context.stage).toBe('dev');
      expect(context.region).toBe('us-east-1');
      expect(context.accountId).toBe('${AWS::AccountId}');
    });

    test('includes custom config when present', () => {
      mockServerless.service.custom = {
        agentCore: {
          defaultTags: { Project: 'test' },
        },
      };
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);

      const context = plugin.getContext();

      expect(context.customConfig).toEqual({ defaultTags: { Project: 'test' } });
      expect(context.defaultTags).toEqual({ Project: 'test' });
    });
  });

  describe('getAgentsConfig', () => {
    test('returns null when no agents defined', () => {
      // Remove all possible agent sources
      delete mockServerless.service.agents;
      delete mockServerless.service.initialServerlessConfig;
      mockServerless.service.custom = {};
      mockServerless.configurationInput = {};
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);

      const agents = plugin.getAgentsConfig();

      expect(agents).toBeNull();
    });

    test('returns agents from service.agents', () => {
      mockServerless.service.agents = { myAgent: { type: 'runtime' } };
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);

      const agents = plugin.getAgentsConfig();

      expect(agents).toEqual({ myAgent: { type: 'runtime' } });
    });

    test('returns agents from initialServerlessConfig when service.agents not set', () => {
      delete mockServerless.service.agents;
      mockServerless.service.initialServerlessConfig = {
        agents: { myAgent: { type: 'memory' } },
      };
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);

      const agents = plugin.getAgentsConfig();

      expect(agents).toEqual({ myAgent: { type: 'memory' } });
    });

    test('returns agents from custom.agents when other sources not set', () => {
      delete mockServerless.service.agents;
      delete mockServerless.service.initialServerlessConfig;
      mockServerless.service.custom = {
        agents: { myAgent: { type: 'gateway' } },
      };
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);

      const agents = plugin.getAgentsConfig();

      expect(agents).toEqual({ myAgent: { type: 'gateway' } });
    });

    test('returns agents from configurationInput when other sources not set', () => {
      delete mockServerless.service.agents;
      delete mockServerless.service.initialServerlessConfig;
      mockServerless.service.custom = {};
      mockServerless.configurationInput = {
        agents: { myAgent: { type: 'browser' } },
      };
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);

      const agents = plugin.getAgentsConfig();

      expect(agents).toEqual({ myAgent: { type: 'browser' } });
    });

    test('prioritizes service.agents over other sources', () => {
      mockServerless.service.agents = { fromService: { type: 'runtime' } };
      mockServerless.service.initialServerlessConfig = {
        agents: { fromInitial: { type: 'memory' } },
      };
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);

      const agents = plugin.getAgentsConfig();

      expect(agents).toEqual({ fromService: { type: 'runtime' } });
    });
  });

  describe('validateConfig', () => {
    test('skips validation when no agents defined', () => {
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);

      expect(() => plugin.validateConfig()).not.toThrow();
      expect(mockUtils.log.debug).toHaveBeenCalledWith(
        'No agents defined, skipping AgentCore compilation'
      );
    });

    test('validates all agents when defined', () => {
      mockServerless.service.agents = {
        myRuntime: {
          type: 'runtime',
          artifact: { containerImage: 'test:latest' },
        },
      };
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);

      expect(() => plugin.validateConfig()).not.toThrow();
      expect(mockUtils.log.info).toHaveBeenCalledWith('Validating 1 agent(s)...');
    });
  });

  describe('validateAgent', () => {
    beforeEach(() => {
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);
    });

    test('throws error when type is missing', () => {
      expect(() => plugin.validateAgent('myAgent', {})).toThrow(
        "Agent 'myAgent' must have a 'type' property"
      );
    });

    test('throws error for invalid type', () => {
      expect(() => plugin.validateAgent('myAgent', { type: 'invalid' })).toThrow(
        "Agent 'myAgent' has invalid type 'invalid'"
      );
    });

    test('accepts valid runtime type', () => {
      expect(() =>
        plugin.validateAgent('myAgent', {
          type: 'runtime',
          artifact: { containerImage: 'test:latest' },
        })
      ).not.toThrow();
    });

    test('accepts valid memory type', () => {
      expect(() => plugin.validateAgent('myAgent', { type: 'memory' })).not.toThrow();
    });

    test('accepts valid gateway type', () => {
      expect(() => plugin.validateAgent('myAgent', { type: 'gateway' })).not.toThrow();
    });

    test('accepts valid browser type', () => {
      expect(() => plugin.validateAgent('myAgent', { type: 'browser' })).not.toThrow();
    });

    test('accepts valid codeInterpreter type', () => {
      expect(() => plugin.validateAgent('myAgent', { type: 'codeInterpreter' })).not.toThrow();
    });

    test('accepts valid workloadIdentity type', () => {
      expect(() => plugin.validateAgent('myAgent', { type: 'workloadIdentity' })).not.toThrow();
    });
  });

  describe('validateRuntime', () => {
    beforeEach(() => {
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);
    });

    test('throws error when neither image nor artifact is specified', () => {
      expect(() => plugin.validateRuntime('myAgent', { type: 'runtime' })).toThrow(
        "Runtime 'myAgent' must have either 'image'"
      );
    });

    test('accepts artifact.containerImage', () => {
      expect(() =>
        plugin.validateRuntime('myAgent', {
          type: 'runtime',
          artifact: { containerImage: 'test:latest' },
        })
      ).not.toThrow();
    });

    test('accepts artifact.s3', () => {
      expect(() =>
        plugin.validateRuntime('myAgent', {
          type: 'runtime',
          artifact: { s3: { bucket: 'my-bucket', key: 'agent.zip' } },
        })
      ).not.toThrow();
    });

    test('accepts artifact.docker', () => {
      expect(() =>
        plugin.validateRuntime('myAgent', {
          type: 'runtime',
          artifact: { docker: { path: '.' } },
        })
      ).not.toThrow();
    });

    test('accepts image config', () => {
      expect(() =>
        plugin.validateRuntime('myAgent', {
          type: 'runtime',
          image: { path: '.', file: 'Dockerfile' },
        })
      ).not.toThrow();
    });

    test('throws error for invalid artifact config', () => {
      expect(() =>
        plugin.validateRuntime('myAgent', {
          type: 'runtime',
          artifact: {},
        })
      ).toThrow("Runtime 'myAgent' artifact must specify either");
    });

    test('validates requestHeaders.allowlist is array', () => {
      expect(() =>
        plugin.validateRuntime('myAgent', {
          type: 'runtime',
          artifact: { containerImage: 'test:latest' },
          requestHeaders: { allowlist: 'not-an-array' },
        })
      ).toThrow("Runtime 'myAgent' requestHeaders.allowlist must be an array");
    });

    test('validates requestHeaders.allowlist max length', () => {
      const headers = Array.from({ length: 21 }, (_, i) => `Header-${i}`);
      expect(() =>
        plugin.validateRuntime('myAgent', {
          type: 'runtime',
          artifact: { containerImage: 'test:latest' },
          requestHeaders: { allowlist: headers },
        })
      ).toThrow('cannot exceed 20 headers');
    });

    test('validates requestHeaders.allowlist header names', () => {
      expect(() =>
        plugin.validateRuntime('myAgent', {
          type: 'runtime',
          artifact: { containerImage: 'test:latest' },
          requestHeaders: { allowlist: ['Valid-Header', ''] },
        })
      ).toThrow('contains invalid header name');
    });
  });

  describe('validateMemory', () => {
    beforeEach(() => {
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);
    });

    test('accepts valid memory config', () => {
      expect(() => plugin.validateMemory('myMemory', { type: 'memory' })).not.toThrow();
    });

    test('throws error for invalid eventExpiryDuration (too low)', () => {
      expect(() =>
        plugin.validateMemory('myMemory', { type: 'memory', eventExpiryDuration: 5 })
      ).toThrow('must be a number between 7 and 365 days');
    });

    test('throws error for invalid eventExpiryDuration (too high)', () => {
      expect(() =>
        plugin.validateMemory('myMemory', { type: 'memory', eventExpiryDuration: 400 })
      ).toThrow('must be a number between 7 and 365 days');
    });

    test('accepts valid eventExpiryDuration', () => {
      expect(() =>
        plugin.validateMemory('myMemory', { type: 'memory', eventExpiryDuration: 30 })
      ).not.toThrow();
    });
  });

  describe('validateGateway', () => {
    beforeEach(() => {
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);
    });

    test('accepts valid gateway config', () => {
      expect(() => plugin.validateGateway('myGateway', { type: 'gateway' })).not.toThrow();
    });

    test('throws error for invalid authorizerType', () => {
      expect(() =>
        plugin.validateGateway('myGateway', { type: 'gateway', authorizerType: 'INVALID' })
      ).toThrow("has invalid authorizerType 'INVALID'");
    });

    test('accepts AWS_IAM authorizerType', () => {
      expect(() =>
        plugin.validateGateway('myGateway', { type: 'gateway', authorizerType: 'AWS_IAM' })
      ).not.toThrow();
    });

    test('throws error for invalid protocolType', () => {
      expect(() =>
        plugin.validateGateway('myGateway', { type: 'gateway', protocolType: 'HTTP' })
      ).toThrow("has invalid protocolType 'HTTP'");
    });

    test('accepts MCP protocolType', () => {
      expect(() =>
        plugin.validateGateway('myGateway', { type: 'gateway', protocolType: 'MCP' })
      ).not.toThrow();
    });
  });

  describe('validateBrowser', () => {
    beforeEach(() => {
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);
    });

    test('accepts valid browser config', () => {
      expect(() => plugin.validateBrowser('myBrowser', { type: 'browser' })).not.toThrow();
    });

    test('throws error for invalid networkMode', () => {
      expect(() =>
        plugin.validateBrowser('myBrowser', {
          type: 'browser',
          network: { networkMode: 'PRIVATE' },
        })
      ).toThrow("has invalid networkMode 'PRIVATE'");
    });

    test('accepts PUBLIC networkMode', () => {
      expect(() =>
        plugin.validateBrowser('myBrowser', {
          type: 'browser',
          network: { networkMode: 'PUBLIC' },
        })
      ).not.toThrow();
    });

    test('accepts VPC networkMode', () => {
      expect(() =>
        plugin.validateBrowser('myBrowser', {
          type: 'browser',
          network: { networkMode: 'VPC' },
        })
      ).not.toThrow();
    });

    test('throws error for recording without bucket', () => {
      expect(() =>
        plugin.validateBrowser('myBrowser', {
          type: 'browser',
          recording: { s3Location: {} },
        })
      ).toThrow("recording.s3Location must have a 'bucket' property");
    });

    test('accepts valid recording config', () => {
      expect(() =>
        plugin.validateBrowser('myBrowser', {
          type: 'browser',
          recording: { s3Location: { bucket: 'my-bucket' } },
        })
      ).not.toThrow();
    });
  });

  describe('validateCodeInterpreter', () => {
    beforeEach(() => {
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);
    });

    test('accepts valid codeInterpreter config', () => {
      expect(() =>
        plugin.validateCodeInterpreter('myCI', { type: 'codeInterpreter' })
      ).not.toThrow();
    });

    test('throws error for invalid networkMode', () => {
      expect(() =>
        plugin.validateCodeInterpreter('myCI', {
          type: 'codeInterpreter',
          network: { networkMode: 'INVALID' },
        })
      ).toThrow("has invalid networkMode 'INVALID'");
    });

    test('accepts SANDBOX networkMode', () => {
      expect(() =>
        plugin.validateCodeInterpreter('myCI', {
          type: 'codeInterpreter',
          network: { networkMode: 'SANDBOX' },
        })
      ).not.toThrow();
    });

    test('throws error for VPC mode without vpcConfig', () => {
      expect(() =>
        plugin.validateCodeInterpreter('myCI', {
          type: 'codeInterpreter',
          network: { networkMode: 'VPC' },
        })
      ).toThrow('requires vpcConfig when networkMode is VPC');
    });

    test('throws error for VPC mode without subnetIds', () => {
      expect(() =>
        plugin.validateCodeInterpreter('myCI', {
          type: 'codeInterpreter',
          network: { networkMode: 'VPC', vpcConfig: {} },
        })
      ).toThrow('vpcConfig must have at least one subnetId');
    });

    test('accepts valid VPC config', () => {
      expect(() =>
        plugin.validateCodeInterpreter('myCI', {
          type: 'codeInterpreter',
          network: {
            networkMode: 'VPC',
            vpcConfig: { subnetIds: ['subnet-123'] },
          },
        })
      ).not.toThrow();
    });
  });

  describe('validateWorkloadIdentity', () => {
    beforeEach(() => {
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);
    });

    test('accepts valid workloadIdentity config', () => {
      expect(() =>
        plugin.validateWorkloadIdentity('myWI', { type: 'workloadIdentity' })
      ).not.toThrow();
    });

    test('throws error for name too long', () => {
      const longName = 'a'.repeat(256);
      expect(() => plugin.validateWorkloadIdentity(longName, { type: 'workloadIdentity' })).toThrow(
        'name must be between 1 and 255 characters'
      );
    });

    test('throws error for oauth2ReturnUrls not array', () => {
      expect(() =>
        plugin.validateWorkloadIdentity('myWI', {
          type: 'workloadIdentity',
          oauth2ReturnUrls: 'not-an-array',
        })
      ).toThrow('oauth2ReturnUrls must be an array');
    });

    test('throws error for invalid oauth2ReturnUrl', () => {
      expect(() =>
        plugin.validateWorkloadIdentity('myWI', {
          type: 'workloadIdentity',
          oauth2ReturnUrls: ['http://example.com'],
        })
      ).toThrow('must contain valid HTTPS URLs');
    });

    test('accepts https oauth2ReturnUrls', () => {
      expect(() =>
        plugin.validateWorkloadIdentity('myWI', {
          type: 'workloadIdentity',
          oauth2ReturnUrls: ['https://example.com/callback'],
        })
      ).not.toThrow();
    });

    test('accepts localhost oauth2ReturnUrls', () => {
      expect(() =>
        plugin.validateWorkloadIdentity('myWI', {
          type: 'workloadIdentity',
          oauth2ReturnUrls: ['http://localhost:3000/callback'],
        })
      ).not.toThrow();
    });
  });

  describe('resolveContainerImage', () => {
    beforeEach(() => {
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);
    });

    test('returns artifact.containerImage when specified', () => {
      const config = { artifact: { containerImage: 'test:latest' } };
      const result = plugin.resolveContainerImage('myAgent', config);
      expect(result).toBe('test:latest');
    });

    test('returns built image for artifact.docker', () => {
      plugin.builtImages = { myAgent: 'built:image' };
      const config = { artifact: { docker: { path: '.' } } };
      const result = plugin.resolveContainerImage('myAgent', config);
      expect(result).toBe('built:image');
    });

    test('returns built image for string image reference', () => {
      plugin.builtImages = { myImage: 'built:image' };
      const config = { image: 'myImage' };
      const result = plugin.resolveContainerImage('myAgent', config);
      expect(result).toBe('built:image');
    });

    test('returns ECR URI from provider.ecr.images', () => {
      mockServerless.service.provider.ecr = {
        images: {
          myImage: { uri: 'ecr:uri' },
        },
      };
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);
      const config = { image: 'myImage' };
      const result = plugin.resolveContainerImage('myAgent', config);
      expect(result).toBe('ecr:uri');
    });

    test('returns null when no image found', () => {
      const config = {};
      const result = plugin.resolveContainerImage('myAgent', config);
      expect(result).toBeNull();
    });
  });

  describe('compileAgentCoreResources', () => {
    beforeEach(() => {
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);
    });

    test('returns early when no agents defined', () => {
      plugin.compileAgentCoreResources();

      expect(mockUtils.log.info).not.toHaveBeenCalledWith(
        expect.stringContaining('Compiled AgentCore resources')
      );
    });

    test('returns early when no compiled template', () => {
      mockServerless.service.agents = { myAgent: { type: 'memory' } };
      mockServerless.service.provider.compiledCloudFormationTemplate = null;
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);

      plugin.compileAgentCoreResources();

      expect(plugin.resourcesCompiled).toBe(false);
    });

    test('compiles resources only once (idempotent)', () => {
      mockServerless.service.agents = {
        myMemory: { type: 'memory' },
      };
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);

      plugin.compileAgentCoreResources();
      plugin.compileAgentCoreResources();

      expect(mockUtils.log.info).toHaveBeenCalledTimes(1);
    });

    test('compiles runtime resources', () => {
      mockServerless.service.agents = {
        myAgent: {
          type: 'runtime',
          artifact: { containerImage: 'test:latest' },
        },
      };
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);

      plugin.compileAgentCoreResources();

      const template = mockServerless.service.provider.compiledCloudFormationTemplate;
      expect(template.Resources).toHaveProperty('MyagentRuntime');
      expect(template.Resources).toHaveProperty('MyagentRuntimeRole');
      expect(template.Outputs).toHaveProperty('MyagentRuntimeArn');
    });

    test('compiles memory resources', () => {
      mockServerless.service.agents = {
        myMemory: { type: 'memory' },
      };
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);

      plugin.compileAgentCoreResources();

      const template = mockServerless.service.provider.compiledCloudFormationTemplate;
      expect(template.Resources).toHaveProperty('MymemoryMemory');
      expect(template.Resources).toHaveProperty('MymemoryMemoryRole');
    });

    test('compiles gateway resources', () => {
      mockServerless.service.agents = {
        myGateway: { type: 'gateway' },
      };
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);

      plugin.compileAgentCoreResources();

      const template = mockServerless.service.provider.compiledCloudFormationTemplate;
      expect(template.Resources).toHaveProperty('MygatewayGateway');
      expect(template.Outputs).toHaveProperty('MygatewayGatewayUrl');
    });

    test('compiles browser resources', () => {
      mockServerless.service.agents = {
        myBrowser: { type: 'browser' },
      };
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);

      plugin.compileAgentCoreResources();

      const template = mockServerless.service.provider.compiledCloudFormationTemplate;
      expect(template.Resources).toHaveProperty('MybrowserBrowser');
    });

    test('compiles codeInterpreter resources', () => {
      mockServerless.service.agents = {
        myCI: { type: 'codeInterpreter' },
      };
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);

      plugin.compileAgentCoreResources();

      const template = mockServerless.service.provider.compiledCloudFormationTemplate;
      expect(template.Resources).toHaveProperty('MyciCodeInterpreter');
    });

    test('compiles workloadIdentity resources', () => {
      mockServerless.service.agents = {
        myWI: { type: 'workloadIdentity' },
      };
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);

      plugin.compileAgentCoreResources();

      const template = mockServerless.service.provider.compiledCloudFormationTemplate;
      expect(template.Resources).toHaveProperty('MywiWorkloadIdentity');
    });

    test('compiles runtime with endpoints', () => {
      mockServerless.service.agents = {
        myAgent: {
          type: 'runtime',
          artifact: { containerImage: 'test:latest' },
          endpoints: [{ name: 'v1', description: 'Version 1' }],
        },
      };
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);

      plugin.compileAgentCoreResources();

      const template = mockServerless.service.provider.compiledCloudFormationTemplate;
      expect(template.Resources).toHaveProperty('Myagentv1Endpoint');
    });

    test('compiles gateway with targets', () => {
      mockServerless.service.agents = {
        myGateway: {
          type: 'gateway',
          targets: [{ name: 'myLambda', type: 'lambda', functionName: 'myFunc' }],
        },
      };
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);

      plugin.compileAgentCoreResources();

      const template = mockServerless.service.provider.compiledCloudFormationTemplate;
      expect(template.Resources).toHaveProperty('MygatewaymyLambdaTarget');
    });

    test('throws error for gateway target without name', () => {
      // Note: The validation for target name happens in compileGatewayResources
      // We need to use a roleArn to skip role generation which would fail first
      mockServerless.service.agents = {
        myGateway: {
          type: 'gateway',
          roleArn: 'arn:aws:iam::123456789012:role/ExistingRole',
          targets: [{ description: 'missing name' }],
        },
      };
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);

      expect(() => plugin.compileAgentCoreResources()).toThrow(
        "Gateway 'myGateway' target must have a 'name' property"
      );
    });

    test('uses provided roleArn instead of generating role', () => {
      mockServerless.service.agents = {
        myMemory: {
          type: 'memory',
          roleArn: 'arn:aws:iam::123456789012:role/CustomRole',
        },
      };
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);

      plugin.compileAgentCoreResources();

      const template = mockServerless.service.provider.compiledCloudFormationTemplate;
      expect(template.Resources).not.toHaveProperty('MymemoryMemoryRole');
    });

    test('logs resource summary', () => {
      mockServerless.service.agents = {
        myRuntime: { type: 'runtime', artifact: { containerImage: 'test:latest' } },
        myMemory: { type: 'memory' },
      };
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);

      plugin.compileAgentCoreResources();

      expect(mockUtils.log.info).toHaveBeenCalledWith(expect.stringContaining('runtime(s)'));
    });
  });

  describe('displayDeploymentInfo', () => {
    test('returns early when no agents', async () => {
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);

      await plugin.displayDeploymentInfo();

      expect(mockUtils.log.notice).not.toHaveBeenCalled();
    });

    test('displays deployed resources', async () => {
      mockServerless.service.agents = {
        myAgent: { type: 'runtime' },
      };
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);

      await plugin.displayDeploymentInfo();

      expect(mockUtils.log.notice).toHaveBeenCalledWith('AgentCore Resources Deployed:');
      expect(mockUtils.log.notice).toHaveBeenCalledWith('  myAgent (Runtime)');
    });
  });

  describe('showInfo', () => {
    test('shows message when no agents defined', async () => {
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);

      await plugin.showInfo();

      expect(mockUtils.log.notice).toHaveBeenCalledWith(
        'No AgentCore resources defined in this service.'
      );
    });

    test('shows agent information', async () => {
      mockServerless.service.agents = {
        myAgent: { type: 'runtime', description: 'Test agent' },
      };
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);

      await plugin.showInfo();

      expect(mockUtils.log.notice).toHaveBeenCalledWith('AgentCore Resources:');
      expect(mockUtils.log.notice).toHaveBeenCalledWith('  myAgent:');
      expect(mockUtils.log.notice).toHaveBeenCalledWith('    Type: Runtime');
      expect(mockUtils.log.notice).toHaveBeenCalledWith('    Description: Test agent');
    });

    test('shows verbose output when option set', async () => {
      mockServerless.service.agents = {
        myAgent: { type: 'runtime' },
      };
      mockOptions.verbose = true;
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);

      await plugin.showInfo();

      expect(mockUtils.log.notice).toHaveBeenCalledWith(expect.stringContaining('Config:'));
    });
  });

  describe('getFirstRuntimeAgent', () => {
    test('returns null when no agents', () => {
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);

      const result = plugin.getFirstRuntimeAgent();

      expect(result).toBeNull();
    });

    test('returns first runtime agent name', () => {
      mockServerless.service.agents = {
        myMemory: { type: 'memory' },
        myRuntime: { type: 'runtime' },
        anotherRuntime: { type: 'runtime' },
      };
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);

      const result = plugin.getFirstRuntimeAgent();

      expect(result).toBe('myRuntime');
    });
  });

  describe('parseTimeAgo', () => {
    beforeEach(() => {
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);
      jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test('returns default 1 hour for null', () => {
      const result = plugin.parseTimeAgo(null);
      expect(result).toBe(1700000000000 - 60 * 60 * 1000);
    });

    test('parses minutes', () => {
      const result = plugin.parseTimeAgo('30m');
      expect(result).toBe(1700000000000 - 30 * 60 * 1000);
    });

    test('parses hours', () => {
      const result = plugin.parseTimeAgo('2h');
      expect(result).toBe(1700000000000 - 2 * 60 * 60 * 1000);
    });

    test('parses days', () => {
      const result = plugin.parseTimeAgo('1d');
      expect(result).toBe(1700000000000 - 24 * 60 * 60 * 1000);
    });

    test('parses date string', () => {
      const result = plugin.parseTimeAgo('2024-01-01');
      expect(result).toBe(new Date('2024-01-01').getTime());
    });

    test('returns default for invalid string', () => {
      const result = plugin.parseTimeAgo('invalid');
      expect(result).toBe(1700000000000 - 60 * 60 * 1000);
    });
  });

  describe('invokeAgent', () => {
    beforeEach(() => {
      mockOptions.message = 'test message';
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);
    });

    test('throws error when no runtime agents found', async () => {
      await expect(plugin.invokeAgent()).rejects.toThrow(
        'No runtime agents found in configuration'
      );
    });

    test('throws error when message not provided', async () => {
      mockServerless.service.agents = {
        myAgent: { type: 'runtime' },
      };
      mockOptions.message = undefined;
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);

      await expect(plugin.invokeAgent()).rejects.toThrow('Message is required');
    });
  });

  describe('fetchLogs', () => {
    beforeEach(() => {
      plugin = new ServerlessBedrockAgentCore(mockServerless, mockOptions, mockUtils);
    });

    test('throws error when no runtime agents found', async () => {
      await expect(plugin.fetchLogs()).rejects.toThrow('No runtime agents found in configuration');
    });
  });
});
