'use strict';

const { getResourceName } = require('../utils/naming');

/**
 * Compile a RuntimeEndpoint resource to CloudFormation
 *
 * @param {string} agentName - The parent agent name
 * @param {string} endpointName - The endpoint name
 * @param {Object} config - The endpoint configuration
 * @param {string} runtimeLogicalId - The logical ID of the parent Runtime resource
 * @param {Object} context - The compilation context
 * @param {Object} tags - The merged tags
 * @returns {Object} CloudFormation resource definition
 */
function compileRuntimeEndpoint(agentName, endpointName, config, runtimeLogicalId, context, tags) {
  const { serviceName, stage } = context;

  // Generate endpoint name: {service}_{agent}_{endpoint}_{stage}
  const resourceName = getResourceName(serviceName, `${agentName}_${endpointName}`, stage);

  return {
    Type: 'AWS::BedrockAgentCore::RuntimeEndpoint',
    DependsOn: [runtimeLogicalId],
    Properties: {
      Name: resourceName,
      AgentRuntimeId: { 'Fn::GetAtt': [runtimeLogicalId, 'AgentRuntimeId'] },
      ...(config.version && { AgentRuntimeVersion: config.version }),
      ...(config.description && { Description: config.description }),
      ...(Object.keys(tags).length > 0 && { Tags: tags }),
    },
  };
}

module.exports = {
  compileRuntimeEndpoint,
};
