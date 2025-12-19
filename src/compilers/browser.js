'use strict';

const { getResourceName, getLogicalId } = require('../utils/naming');

/**
 * Build network configuration for BrowserCustom
 *
 * @param {Object} network - The network configuration from serverless.yml
 * @returns {Object} CloudFormation NetworkConfiguration
 */
function buildBrowserNetworkConfiguration(network = {}) {
  const networkMode = network.networkMode || 'PUBLIC';

  const config = {
    NetworkMode: networkMode,
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
 * Build recording configuration for BrowserCustom
 *
 * @param {Object} recording - The recording configuration from serverless.yml
 * @returns {Object|null} CloudFormation RecordingConfig or null
 */
function buildRecordingConfig(recording) {
  if (!recording) {
    return null;
  }

  const config = {};

  if (recording.enabled !== undefined) {
    config.Enabled = recording.enabled;
  }

  if (recording.s3Location) {
    config.S3Location = {
      Bucket: recording.s3Location.bucket,
      ...(recording.s3Location.prefix && { Prefix: recording.s3Location.prefix }),
    };
  }

  return Object.keys(config).length > 0 ? config : null;
}

/**
 * Build browser signing configuration
 *
 * @param {Object} signing - The signing configuration from serverless.yml
 * @returns {Object|null} CloudFormation BrowserSigning or null
 */
function buildBrowserSigning(signing) {
  if (!signing) {
    return null;
  }

  return { Enabled: signing.enabled || false };
}

/**
 * Compile a BrowserCustom resource to CloudFormation
 *
 * @param {string} name - The browser name
 * @param {Object} config - The browser configuration
 * @param {Object} context - The compilation context
 * @param {Object} tags - The merged tags
 * @returns {Object} CloudFormation resource definition
 */
function compileBrowser(name, config, context, tags) {
  const { serviceName, stage } = context;
  const resourceName = getResourceName(serviceName, name, stage);
  const roleLogicalId = `${getLogicalId(name, 'Browser')}Role`;

  const networkConfig = buildBrowserNetworkConfiguration(config.network);
  const recordingConfig = buildRecordingConfig(config.recording);
  const signingConfig = buildBrowserSigning(config.signing);

  return {
    Type: 'AWS::BedrockAgentCore::BrowserCustom',
    Properties: {
      Name: resourceName,
      NetworkConfiguration: networkConfig,
      ...(config.roleArn
        ? { ExecutionRoleArn: config.roleArn }
        : { ExecutionRoleArn: { 'Fn::GetAtt': [roleLogicalId, 'Arn'] } }),
      ...(config.description && { Description: config.description }),
      ...(signingConfig && { BrowserSigning: signingConfig }),
      ...(recordingConfig && { RecordingConfig: recordingConfig }),
      ...(Object.keys(tags).length > 0 && { Tags: tags }),
    },
  };
}

module.exports = {
  compileBrowser,
  buildBrowserNetworkConfiguration,
  buildRecordingConfig,
  buildBrowserSigning,
};
