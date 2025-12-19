'use strict';

const { getResourceName, getLogicalId } = require('../utils/naming');

/**
 * Build network configuration for CodeInterpreterCustom
 * Supports PUBLIC, SANDBOX, and VPC modes
 *
 * @param {Object} network - The network configuration from serverless.yml
 * @returns {Object} CloudFormation NetworkConfiguration
 */
function buildCodeInterpreterNetworkConfiguration(network = {}) {
  const networkMode = network.networkMode || 'SANDBOX';

  const config = {
    NetworkMode: networkMode, // PUBLIC, SANDBOX, or VPC
  };

  if (networkMode === 'VPC' && network.vpcConfig) {
    config.VpcConfig = {
      ...(network.vpcConfig.subnetIds && { SubnetIds: network.vpcConfig.subnetIds }),
      ...(network.vpcConfig.securityGroupIds && {
        SecurityGroupIds: network.vpcConfig.securityGroupIds,
      }),
    };
  }

  return config;
}

/**
 * Compile a CodeInterpreterCustom resource to CloudFormation
 *
 * @param {string} name - The code interpreter name
 * @param {Object} config - The code interpreter configuration
 * @param {Object} context - The compilation context
 * @param {Object} tags - The merged tags
 * @returns {Object} CloudFormation resource definition
 */
function compileCodeInterpreter(name, config, context, tags) {
  const { serviceName, stage } = context;
  const resourceName = getResourceName(serviceName, name, stage);
  const roleLogicalId = `${getLogicalId(name, 'CodeInterpreter')}Role`;

  const networkConfig = buildCodeInterpreterNetworkConfiguration(config.network);

  return {
    Type: 'AWS::BedrockAgentCore::CodeInterpreterCustom',
    Properties: {
      Name: resourceName,
      NetworkConfiguration: networkConfig,
      ...(config.roleArn
        ? { ExecutionRoleArn: config.roleArn }
        : { ExecutionRoleArn: { 'Fn::GetAtt': [roleLogicalId, 'Arn'] } }),
      ...(config.description && { Description: config.description }),
      ...(Object.keys(tags).length > 0 && { Tags: tags }),
    },
  };
}

module.exports = {
  compileCodeInterpreter,
  buildCodeInterpreterNetworkConfiguration,
};
