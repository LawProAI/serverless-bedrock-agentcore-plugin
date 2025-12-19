'use strict';

const { getLogicalId } = require('../utils/naming');

/**
 * Build authorizer configuration for the gateway
 *
 * @param {Object} authConfig - The authorizer configuration from serverless.yml
 * @returns {Object|null} CloudFormation authorizer configuration or null
 */
function buildGatewayAuthorizerConfiguration(authConfig) {
  if (!authConfig) {
    return null;
  }

  return {
    ...(authConfig.allowedAudiences && { AllowedAudiences: authConfig.allowedAudiences }),
    ...(authConfig.allowedClients && { AllowedClients: authConfig.allowedClients }),
    ...(authConfig.allowedIssuers && { AllowedIssuers: authConfig.allowedIssuers }),
  };
}

/**
 * Build protocol configuration for the gateway
 *
 * @param {Object} protocolConfig - The protocol configuration from serverless.yml
 * @returns {Object|null} CloudFormation protocol configuration or null
 */
function buildGatewayProtocolConfiguration(protocolConfig) {
  if (!protocolConfig) {
    return null;
  }

  return {
    ...(protocolConfig.mcpConfiguration && {
      McpConfiguration: {
        ...(protocolConfig.mcpConfiguration.instructions && {
          Instructions: protocolConfig.mcpConfiguration.instructions,
        }),
        ...(protocolConfig.mcpConfiguration.supportedVersions && {
          SupportedVersions: protocolConfig.mcpConfiguration.supportedVersions,
        }),
      },
    }),
  };
}

/**
 * Compile a Gateway resource to CloudFormation
 *
 * @param {string} name - The agent name
 * @param {Object} config - The gateway configuration
 * @param {Object} context - The compilation context
 * @param {Object} tags - The merged tags
 * @returns {Object} CloudFormation resource definition
 */
function compileGateway(name, config, context, tags) {
  const { serviceName, stage } = context;

  // Gateway name pattern: ^([0-9a-zA-Z][-]?){1,100}$
  const resourceName = `${serviceName}-${name}-${stage}`
    .replace(/[^0-9a-zA-Z-]/g, '-')
    .replace(/--+/g, '-')
    .substring(0, 100);

  const roleLogicalId = `${getLogicalId(name, 'Gateway')}Role`;

  // Default to AWS_IAM if not specified
  const authorizerType = config.authorizerType || 'AWS_IAM';

  // Default to MCP if not specified
  const protocolType = config.protocolType || 'MCP';

  const authConfig = buildGatewayAuthorizerConfiguration(config.authorizerConfiguration);
  const protocolConfig = buildGatewayProtocolConfiguration(config.protocolConfiguration);

  return {
    Type: 'AWS::BedrockAgentCore::Gateway',
    Properties: {
      Name: resourceName,
      AuthorizerType: authorizerType,
      ProtocolType: protocolType,
      RoleArn: config.roleArn || { 'Fn::GetAtt': [roleLogicalId, 'Arn'] },
      ...(config.description && { Description: config.description }),
      ...(authConfig && { AuthorizerConfiguration: authConfig }),
      ...(protocolConfig && { ProtocolConfiguration: protocolConfig }),
      ...(config.kmsKeyArn && { KmsKeyArn: config.kmsKeyArn }),
      ...(config.exceptionLevel && { ExceptionLevel: config.exceptionLevel }),
      ...(Object.keys(tags).length > 0 && { Tags: tags }),
    },
  };
}

module.exports = {
  compileGateway,
  buildGatewayAuthorizerConfiguration,
  buildGatewayProtocolConfiguration,
};
