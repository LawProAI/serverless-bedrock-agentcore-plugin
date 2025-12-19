'use strict';

/**
 * Build credential provider configuration for the gateway target
 *
 * @param {Object} credProvider - The credential provider configuration
 * @returns {Array} CloudFormation credential provider configurations array
 */
function buildCredentialProviderConfigurations(credProvider) {
  if (!credProvider) {
    // Default to GATEWAY_IAM_ROLE
    return [
      {
        CredentialProviderType: 'GATEWAY_IAM_ROLE',
      },
    ];
  }

  const config = {
    CredentialProviderType: credProvider.type || 'GATEWAY_IAM_ROLE',
  };

  // Add OAuth configuration
  if (credProvider.type === 'OAUTH' && credProvider.oauthConfig) {
    config.OauthCredentialProviderConfiguration = {
      ...(credProvider.oauthConfig.secretArn && {
        CredentialsSecretArn: credProvider.oauthConfig.secretArn,
      }),
      ...(credProvider.oauthConfig.tokenUrl && {
        OauthTokenEndpoint: credProvider.oauthConfig.tokenUrl,
      }),
      ...(credProvider.oauthConfig.scopes && { Scopes: credProvider.oauthConfig.scopes }),
    };
  }

  // Add API Key configuration
  if (credProvider.type === 'API_KEY' && credProvider.apiKeyConfig) {
    config.ApiKeyCredentialProviderConfiguration = {
      ...(credProvider.apiKeyConfig.secretArn && {
        ApiKeySecretArn: credProvider.apiKeyConfig.secretArn,
      }),
    };
  }

  return [config];
}

/**
 * Build target configuration based on target type
 *
 * @param {Object} target - The target configuration from serverless.yml
 * @param {Object} context - The compilation context
 * @returns {Object} CloudFormation target configuration
 */
function buildTargetConfiguration(target, context) {
  const targetType = target.type || 'lambda';

  switch (targetType.toLowerCase()) {
    case 'lambda':
      return buildLambdaTargetConfiguration(target, context);
    case 'openapi':
      return buildOpenApiTargetConfiguration(target);
    case 'smithy':
      return buildSmithyTargetConfiguration(target);
    default:
      throw new Error(`Unknown gateway target type: ${targetType}`);
  }
}

/**
 * Transform JSON Schema to CloudFormation SchemaDefinition (PascalCase)
 *
 * @param {Object} schema - The JSON schema object
 * @returns {Object} CloudFormation SchemaDefinition
 */
function transformSchemaToCloudFormation(schema) {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  const cfSchema = {};

  // Transform type (required)
  if (schema.type || schema.Type) {
    cfSchema.Type = schema.Type || schema.type;
  }

  // Transform description (optional)
  if (schema.description || schema.Description) {
    cfSchema.Description = schema.Description || schema.description;
  }

  // Transform properties (optional, for object types)
  if (schema.properties || schema.Properties) {
    const props = schema.Properties || schema.properties;
    cfSchema.Properties = {};
    for (const [key, value] of Object.entries(props)) {
      cfSchema.Properties[key] = transformSchemaToCloudFormation(value);
    }
  }

  // Transform required (optional, for object types)
  if (schema.required || schema.Required) {
    cfSchema.Required = schema.Required || schema.required;
  }

  // Transform items (optional, for array types)
  if (schema.items || schema.Items) {
    cfSchema.Items = transformSchemaToCloudFormation(schema.Items || schema.items);
  }

  // Transform enum (optional)
  if (schema.enum || schema.Enum) {
    cfSchema.Enum = schema.Enum || schema.enum;
  }

  return cfSchema;
}

/**
 * Build Lambda target configuration
 *
 * @param {Object} target - The target configuration
 * @param {Object} context - The compilation context
 * @returns {Object} CloudFormation Lambda target configuration
 */
function buildLambdaTargetConfiguration(target, _context) {
  let functionArn = target.functionArn;

  // If functionName is provided instead of functionArn, build the ARN reference
  if (target.functionName && !functionArn) {
    // Reference the function from the same stack
    const functionLogicalId =
      target.functionName
        .split(/[-_]/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join('') + 'LambdaFunction';

    functionArn = { 'Fn::GetAtt': [functionLogicalId, 'Arn'] };
  }

  const lambdaConfig = {
    LambdaArn: functionArn,
  };

  // Add ToolSchema if provided
  if (target.toolSchema) {
    const toolSchema = {};

    // Handle InlinePayload (CloudFormation uses PascalCase)
    if (target.toolSchema.inlinePayload) {
      toolSchema.InlinePayload = target.toolSchema.inlinePayload.map((tool) => ({
        Name: tool.name || tool.Name,
        Description: tool.description || tool.Description,
        InputSchema: transformSchemaToCloudFormation(tool.inputSchema || tool.InputSchema),
        ...(tool.outputSchema || tool.OutputSchema
          ? {
              OutputSchema: transformSchemaToCloudFormation(tool.outputSchema || tool.OutputSchema),
            }
          : {}),
      }));
    }

    // Handle S3 location (CloudFormation uses PascalCase)
    if (target.toolSchema.s3) {
      toolSchema.S3 = {
        Uri:
          target.toolSchema.s3.uri ||
          `s3://${target.toolSchema.s3.bucket}/${target.toolSchema.s3.key}`,
        ...(target.toolSchema.s3.bucketOwnerAccountId && {
          BucketOwnerAccountId: target.toolSchema.s3.bucketOwnerAccountId,
        }),
      };
    }

    lambdaConfig.ToolSchema = toolSchema;
  }

  return {
    Mcp: {
      Lambda: lambdaConfig,
    },
  };
}

/**
 * Build OpenAPI target configuration
 *
 * @param {Object} target - The target configuration
 * @returns {Object} CloudFormation OpenAPI target configuration
 */
function buildOpenApiTargetConfiguration(target) {
  const openApiConfig = {};

  if (target.s3) {
    openApiConfig.S3 = {
      Uri: target.s3.uri || `s3://${target.s3.bucket}/${target.s3.key}`,
      ...(target.s3.bucketOwnerAccountId && {
        BucketOwnerAccountId: target.s3.bucketOwnerAccountId,
      }),
    };
  }

  if (target.inline || target.inlinePayload) {
    openApiConfig.InlinePayload = target.inline || target.inlinePayload;
  }

  return {
    Mcp: {
      OpenApiSchema: openApiConfig,
    },
  };
}

/**
 * Build Smithy target configuration
 *
 * @param {Object} target - The target configuration
 * @returns {Object} CloudFormation Smithy target configuration
 */
function buildSmithyTargetConfiguration(target) {
  const smithyConfig = {};

  if (target.s3) {
    smithyConfig.S3 = {
      Uri: target.s3.uri || `s3://${target.s3.bucket}/${target.s3.key}`,
      ...(target.s3.bucketOwnerAccountId && {
        BucketOwnerAccountId: target.s3.bucketOwnerAccountId,
      }),
    };
  }

  if (target.inline || target.inlinePayload) {
    smithyConfig.InlinePayload = target.inline || target.inlinePayload;
  }

  return {
    Mcp: {
      SmithyModel: smithyConfig,
    },
  };
}

/**
 * Compile a GatewayTarget resource to CloudFormation
 *
 * @param {string} gatewayName - The parent gateway name
 * @param {string} targetName - The target name
 * @param {Object} config - The target configuration
 * @param {string} gatewayLogicalId - The logical ID of the parent Gateway resource
 * @param {Object} context - The compilation context
 * @returns {Object} CloudFormation resource definition
 */
function compileGatewayTarget(gatewayName, targetName, config, gatewayLogicalId, context) {
  // Target name pattern: ^([0-9a-zA-Z][-]?){1,100}$
  const resourceName = targetName
    .replace(/[^0-9a-zA-Z-]/g, '-')
    .replace(/--+/g, '-')
    .substring(0, 100);

  const credentialConfigs = buildCredentialProviderConfigurations(config.credentialProvider);
  const targetConfig = buildTargetConfiguration(config, context);

  return {
    Type: 'AWS::BedrockAgentCore::GatewayTarget',
    DependsOn: [gatewayLogicalId],
    Properties: {
      Name: resourceName,
      GatewayIdentifier: { 'Fn::GetAtt': [gatewayLogicalId, 'GatewayIdentifier'] },
      CredentialProviderConfigurations: credentialConfigs,
      TargetConfiguration: targetConfig,
      ...(config.description && { Description: config.description }),
    },
  };
}

module.exports = {
  compileGatewayTarget,
  buildCredentialProviderConfigurations,
  buildTargetConfiguration,
  buildLambdaTargetConfiguration,
  buildOpenApiTargetConfiguration,
  buildSmithyTargetConfiguration,
  transformSchemaToCloudFormation,
};
