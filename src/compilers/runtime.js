'use strict';

const { getResourceName, getLogicalId } = require('../utils/naming');

/**
 * Build the artifact configuration for the runtime
 *
 * @param {Object} artifact - The artifact configuration from serverless.yml
 * @returns {Object} CloudFormation artifact configuration
 */
function buildArtifact(artifact) {
  if (artifact.containerImage) {
    return {
      ContainerConfiguration: {
        ContainerUri: artifact.containerImage,
      },
    };
  }

  if (artifact.s3) {
    return {
      S3Configuration: {
        S3BucketName: artifact.s3.bucket,
        S3ObjectKey: artifact.s3.key,
      },
    };
  }

  throw new Error('Artifact must specify either containerImage or s3 configuration');
}

/**
 * Build network configuration for the runtime
 *
 * @param {Object} network - The network configuration from serverless.yml
 * @returns {Object} CloudFormation network configuration
 */
function buildNetworkConfiguration(network = {}) {
  const networkMode = network.networkMode || 'PUBLIC';

  const config = {
    NetworkMode: networkMode,
  };

  // Add VPC configuration if VPC mode
  if (networkMode === 'VPC' && network.vpcConfig) {
    config.VpcConfiguration = {
      ...(network.vpcConfig.subnetIds && { SubnetIds: network.vpcConfig.subnetIds }),
      ...(network.vpcConfig.securityGroupIds && {
        SecurityGroupIds: network.vpcConfig.securityGroupIds,
      }),
    };
  }

  return config;
}

/**
 * Build authorizer configuration for the runtime
 * Supports NONE, AWS_IAM, and CustomJWTAuthorizer
 *
 * @param {Object} authorizer - The authorizer configuration from serverless.yml
 * @returns {Object|null} CloudFormation authorizer configuration or null
 */
function buildAuthorizerConfiguration(authorizer) {
  if (!authorizer) {
    return null;
  }

  // Handle CustomJWTAuthorizer - uses OIDC discovery URL
  if (authorizer.customJwtAuthorizer) {
    const jwtConfig = authorizer.customJwtAuthorizer;

    // DiscoveryUrl is required for CustomJWTAuthorizer
    if (!jwtConfig.discoveryUrl) {
      throw new Error('CustomJWTAuthorizer requires discoveryUrl');
    }

    return {
      CustomJWTAuthorizer: {
        DiscoveryUrl: jwtConfig.discoveryUrl,
        ...(jwtConfig.allowedAudience && { AllowedAudience: jwtConfig.allowedAudience }),
        ...(jwtConfig.allowedClients && { AllowedClients: jwtConfig.allowedClients }),
      },
    };
  }

  // Handle legacy format with type field
  if (authorizer.type === 'CUSTOM_JWT' && authorizer.jwtConfiguration) {
    // Convert legacy format to new format
    const discoveryUrl =
      authorizer.jwtConfiguration.discoveryUrl || authorizer.jwtConfiguration.issuer;

    if (!discoveryUrl) {
      throw new Error('CustomJWTAuthorizer requires discoveryUrl or issuer');
    }

    return {
      CustomJWTAuthorizer: {
        DiscoveryUrl: discoveryUrl,
        ...(authorizer.jwtConfiguration.allowedAudience && {
          AllowedAudience: authorizer.jwtConfiguration.allowedAudience,
        }),
        ...(authorizer.jwtConfiguration.allowedClients && {
          AllowedClients: authorizer.jwtConfiguration.allowedClients,
        }),
        // Legacy support: audience -> allowedAudience
        ...(authorizer.jwtConfiguration.audience && {
          AllowedAudience: Array.isArray(authorizer.jwtConfiguration.audience)
            ? authorizer.jwtConfiguration.audience
            : [authorizer.jwtConfiguration.audience],
        }),
      },
    };
  }

  // Return null for NONE or AWS_IAM (handled at runtime level, not in AuthorizerConfiguration)
  return null;
}

/**
 * Build lifecycle configuration for the runtime
 *
 * @param {Object} lifecycle - The lifecycle configuration from serverless.yml
 * @returns {Object|null} CloudFormation lifecycle configuration or null
 */
function buildLifecycleConfiguration(lifecycle) {
  if (!lifecycle) {
    return null;
  }

  return {
    ...(lifecycle.idleTimeout !== undefined && { IdleTimeoutSeconds: lifecycle.idleTimeout }),
    ...(lifecycle.maxConcurrency !== undefined && { MaxConcurrency: lifecycle.maxConcurrency }),
  };
}

/**
 * Build protocol configuration for the runtime
 * ProtocolConfiguration is a string enum: HTTP, MCP, or A2A
 *
 * @param {string} protocol - The protocol type (HTTP, MCP, A2A)
 * @returns {string|null} Protocol string or null
 */
function buildProtocolConfiguration(protocol) {
  if (!protocol) {
    return null;
  }

  // ProtocolConfiguration is just the protocol string, not an object
  return protocol;
}

/**
 * Build environment variables for the runtime
 *
 * @param {Object} environment - Environment variables object
 * @returns {Object|null} Environment variables or null
 */
function buildEnvironmentVariables(environment) {
  if (!environment || Object.keys(environment).length === 0) {
    return null;
  }

  return environment;
}

/**
 * Build request header configuration for the runtime
 * Allows specific headers to be forwarded to the agent
 *
 * @param {Object} requestHeaders - The request headers configuration from serverless.yml
 * @returns {Object|null} CloudFormation RequestHeaderConfiguration or null
 */
function buildRequestHeaderConfiguration(requestHeaders) {
  if (!requestHeaders || !requestHeaders.allowlist || requestHeaders.allowlist.length === 0) {
    return null;
  }

  return {
    RequestHeaderAllowlist: requestHeaders.allowlist,
  };
}

/**
 * Compile a Runtime resource to CloudFormation
 *
 * @param {string} name - The agent name
 * @param {Object} config - The runtime configuration
 * @param {Object} context - The compilation context
 * @param {Object} tags - The merged tags
 * @returns {Object} CloudFormation resource definition
 */
function compileRuntime(name, config, context, tags) {
  const { serviceName, stage } = context;
  const resourceName = getResourceName(serviceName, name, stage);
  const roleLogicalId = `${getLogicalId(name, 'Runtime')}Role`;

  const artifact = buildArtifact(config.artifact);
  const networkConfig = buildNetworkConfiguration(config.network);
  const authorizerConfig = buildAuthorizerConfiguration(config.authorizer);
  const lifecycleConfig = buildLifecycleConfiguration(config.lifecycle);
  const protocolConfig = buildProtocolConfiguration(config.protocol);
  const envVars = buildEnvironmentVariables(config.environment);
  const requestHeaderConfig = buildRequestHeaderConfiguration(config.requestHeaders);

  return {
    Type: 'AWS::BedrockAgentCore::Runtime',
    Properties: {
      AgentRuntimeName: resourceName,
      AgentRuntimeArtifact: artifact,
      NetworkConfiguration: networkConfig,
      RoleArn: config.roleArn || { 'Fn::GetAtt': [roleLogicalId, 'Arn'] },
      ...(config.description && { Description: config.description }),
      ...(authorizerConfig && { AuthorizerConfiguration: authorizerConfig }),
      ...(lifecycleConfig && { LifecycleConfiguration: lifecycleConfig }),
      ...(protocolConfig && { ProtocolConfiguration: protocolConfig }),
      ...(envVars && { EnvironmentVariables: envVars }),
      ...(requestHeaderConfig && { RequestHeaderConfiguration: requestHeaderConfig }),
      ...(Object.keys(tags).length > 0 && { Tags: tags }),
    },
  };
}

module.exports = {
  compileRuntime,
  buildArtifact,
  buildNetworkConfiguration,
  buildAuthorizerConfiguration,
  buildLifecycleConfiguration,
  buildProtocolConfiguration,
  buildEnvironmentVariables,
  buildRequestHeaderConfiguration,
};
