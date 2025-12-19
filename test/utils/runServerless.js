'use strict';

const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

// Import plugin components directly for testing
const { compileRuntime } = require('../../src/compilers/runtime');
const { compileMemory } = require('../../src/compilers/memory');
const { compileGateway } = require('../../src/compilers/gateway');
const { compileBrowser } = require('../../src/compilers/browser');
const { compileCodeInterpreter } = require('../../src/compilers/codeInterpreter');
const { compileWorkloadIdentity } = require('../../src/compilers/workloadIdentity');
const {
  generateRuntimeRole,
  generateMemoryRole,
  generateGatewayRole,
  generateBrowserRole,
  generateCodeInterpreterRole,
} = require('../../src/iam/policies');
const { mergeTags } = require('../../src/utils/tags');
const { getLogicalId } = require('../../src/utils/naming');

const fixturesPath = path.resolve(__dirname, '../fixtures');

/**
 * Load and compile a serverless.yml fixture into CloudFormation resources
 * This simulates what the plugin does during `sls package`
 *
 * @param {Object} options - Options for running serverless
 * @param {string} options.fixture - Name of the fixture directory
 * @returns {Object} Result containing cfTemplate with Resources and Outputs
 */
function runServerless(options = {}) {
  const { fixture } = options;
  const fixturePath = path.join(fixturesPath, fixture);
  const configPath = path.join(fixturePath, 'serverless.yml');

  // Load and parse serverless.yml
  const configContent = fs.readFileSync(configPath, 'utf-8');
  const config = yaml.load(configContent);

  // Build context from config
  const context = {
    serviceName: config.service,
    stage: config.provider?.stage || 'dev',
    region: config.provider?.region || 'us-east-1',
    accountId: '123456789012',
    customConfig: config.custom?.agentCore || {},
    defaultTags: config.custom?.agentCore?.defaultTags || {},
  };

  const cfTemplate = {
    Resources: {},
    Outputs: {},
  };

  // Process agents
  const agents = config.agents || {};

  for (const [name, agentConfig] of Object.entries(agents)) {
    // mergeTags signature: (defaultTags, resourceTags, serviceName, stage, resourceName)
    const tags = mergeTags(
      context.defaultTags,
      agentConfig.tags || {},
      context.serviceName,
      context.stage,
      name
    );

    if (agentConfig.type === 'runtime') {
      // Generate Runtime Role
      const roleLogicalId = getLogicalId(name, 'Runtime') + 'Role';
      cfTemplate.Resources[roleLogicalId] = generateRuntimeRole(name, agentConfig, context);

      // Generate Runtime resource
      const runtimeLogicalId = getLogicalId(name, 'Runtime');
      cfTemplate.Resources[runtimeLogicalId] = compileRuntime(name, agentConfig, context, tags);

      // Add outputs
      cfTemplate.Outputs[`${runtimeLogicalId}Arn`] = {
        Description: `ARN of ${name} AgentCore Runtime`,
        Value: { 'Fn::GetAtt': [runtimeLogicalId, 'AgentRuntimeArn'] },
      };
      cfTemplate.Outputs[`${runtimeLogicalId}Id`] = {
        Description: `ID of ${name} AgentCore Runtime`,
        Value: { 'Fn::GetAtt': [runtimeLogicalId, 'AgentRuntimeId'] },
      };
    } else if (agentConfig.type === 'memory') {
      // Generate Memory Role
      const roleLogicalId = getLogicalId(name, 'Memory') + 'Role';
      cfTemplate.Resources[roleLogicalId] = generateMemoryRole(name, agentConfig, context);

      // Generate Memory resource
      const memoryLogicalId = getLogicalId(name, 'Memory');
      cfTemplate.Resources[memoryLogicalId] = compileMemory(name, agentConfig, context, tags);

      // Add outputs
      cfTemplate.Outputs[`${memoryLogicalId}Arn`] = {
        Description: `ARN of ${name} AgentCore Memory`,
        Value: { 'Fn::GetAtt': [memoryLogicalId, 'MemoryArn'] },
      };
    } else if (agentConfig.type === 'gateway') {
      // Generate Gateway Role
      const roleLogicalId = getLogicalId(name, 'Gateway') + 'Role';
      cfTemplate.Resources[roleLogicalId] = generateGatewayRole(name, agentConfig, context);

      // Generate Gateway resource
      const gatewayLogicalId = getLogicalId(name, 'Gateway');
      cfTemplate.Resources[gatewayLogicalId] = compileGateway(name, agentConfig, context, tags);

      // Add outputs
      cfTemplate.Outputs[`${gatewayLogicalId}Arn`] = {
        Description: `ARN of ${name} AgentCore Gateway`,
        Value: { 'Fn::GetAtt': [gatewayLogicalId, 'GatewayArn'] },
      };
    } else if (agentConfig.type === 'browser') {
      // Generate Browser Role (if not using custom roleArn)
      if (!agentConfig.roleArn) {
        const roleLogicalId = getLogicalId(name, 'Browser') + 'Role';
        cfTemplate.Resources[roleLogicalId] = generateBrowserRole(name, agentConfig, context);
      }

      // Generate Browser resource
      const browserLogicalId = getLogicalId(name, 'Browser');
      cfTemplate.Resources[browserLogicalId] = compileBrowser(name, agentConfig, context, tags);

      // Add outputs
      cfTemplate.Outputs[`${browserLogicalId}Arn`] = {
        Description: `ARN of ${name} AgentCore Browser`,
        Value: { 'Fn::GetAtt': [browserLogicalId, 'BrowserArn'] },
      };
    } else if (agentConfig.type === 'codeInterpreter') {
      // Generate CodeInterpreter Role (if not using custom roleArn)
      if (!agentConfig.roleArn) {
        const roleLogicalId = getLogicalId(name, 'CodeInterpreter') + 'Role';
        cfTemplate.Resources[roleLogicalId] = generateCodeInterpreterRole(
          name,
          agentConfig,
          context
        );
      }

      // Generate CodeInterpreter resource
      const codeInterpreterLogicalId = getLogicalId(name, 'CodeInterpreter');
      cfTemplate.Resources[codeInterpreterLogicalId] = compileCodeInterpreter(
        name,
        agentConfig,
        context,
        tags
      );

      // Add outputs
      cfTemplate.Outputs[`${codeInterpreterLogicalId}Arn`] = {
        Description: `ARN of ${name} AgentCore CodeInterpreter`,
        Value: { 'Fn::GetAtt': [codeInterpreterLogicalId, 'CodeInterpreterArn'] },
      };
    } else if (agentConfig.type === 'workloadIdentity') {
      // WorkloadIdentity doesn't require a role

      // Generate WorkloadIdentity resource
      const workloadIdentityLogicalId = getLogicalId(name, 'WorkloadIdentity');
      cfTemplate.Resources[workloadIdentityLogicalId] = compileWorkloadIdentity(
        name,
        agentConfig,
        context,
        tags
      );

      // Add outputs
      cfTemplate.Outputs[`${workloadIdentityLogicalId}Arn`] = {
        Description: `ARN of ${name} AgentCore WorkloadIdentity`,
        Value: { 'Fn::GetAtt': [workloadIdentityLogicalId, 'WorkloadIdentityArn'] },
      };
    }
  }

  return { cfTemplate };
}

module.exports = {
  runServerless,
  getLogicalId,
  fixturesPath,
};
