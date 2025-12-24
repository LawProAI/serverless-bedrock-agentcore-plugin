'use strict';

const { getResourceName, getLogicalId } = require('../utils/naming');

// Track if deprecation warning has been shown (module-level to show only once)
let deprecationWarningShown = false;

/**
 * Reset the deprecation warning flag (for testing purposes)
 */
function resetDeprecationWarning() {
  deprecationWarningShown = false;
}

/**
 * Detect if strategy is in legacy format
 * Legacy format has flat structure with type/name at top level
 * New format uses typed union like SemanticMemoryStrategy, etc.
 *
 * @param {Object} strategy - The strategy configuration
 * @returns {boolean} True if legacy format
 */
function isLegacyFormat(strategy) {
  // New format has one of these as top-level keys
  const newFormatKeys = [
    'SemanticMemoryStrategy',
    'SummaryMemoryStrategy',
    'UserPreferenceMemoryStrategy',
    'CustomMemoryStrategy',
  ];

  // If any new format key exists, it's new format
  if (newFormatKeys.some((key) => strategy[key] !== undefined)) {
    return false;
  }

  // If it has 'type' property at top level, it's legacy format
  return strategy.type !== undefined;
}

/**
 * Convert legacy strategy format to new typed union format
 *
 * @param {Object} strategy - Legacy format strategy
 * @returns {Object} New format strategy
 */
function convertLegacyStrategy(strategy) {
  const baseConfig = {
    Name: strategy.name,
    ...(strategy.description && { Description: strategy.description }),
    ...(strategy.namespaces && { Namespaces: strategy.namespaces }),
  };

  const type = (strategy.type || '').toLowerCase();

  switch (type) {
    case 'semantic':
      return {
        SemanticMemoryStrategy: {
          ...baseConfig,
          // Note: Managed strategies don't require explicit Type or model configuration
        },
      };

    case 'summary':
    case 'summarization':
      return {
        SummaryMemoryStrategy: {
          ...baseConfig,
          // Note: Managed strategies don't require explicit Type
        },
      };

    case 'userpreference':
    case 'user_preference':
      return {
        UserPreferenceMemoryStrategy: {
          ...baseConfig,
          // Note: Managed strategies don't require explicit Type
        },
      };

    case 'custom':
      return {
        CustomMemoryStrategy: {
          ...baseConfig,
          ...(strategy.configuration && { Configuration: strategy.configuration }),
        },
      };

    default:
      throw new Error(`Unknown memory strategy type: ${type}`);
  }
}

/**
 * Build memory strategies configuration
 * Supports both legacy flat format and new typed union format
 *
 * @param {Array} strategies - The strategies configuration from serverless.yml
 * @returns {Array|null} CloudFormation memory strategies or null
 */
function buildMemoryStrategies(strategies) {
  if (!strategies || strategies.length === 0) {
    return null;
  }

  return strategies.map((strategy) => {
    if (isLegacyFormat(strategy)) {
      // Emit deprecation warning once per deployment
      if (!deprecationWarningShown) {
        // eslint-disable-next-line no-console -- Intentional user-facing deprecation warning
        console.warn(
          '\x1b[33m%s\x1b[0m', // Yellow color
          'DEPRECATION WARNING: Memory strategy format has changed to typed union structure. ' +
            'Please update your configuration. See documentation for migration guide.'
        );
        deprecationWarningShown = true;
      }

      return convertLegacyStrategy(strategy);
    }

    // Already in new format - pass through
    return strategy;
  });
}

/**
 * Compile a Memory resource to CloudFormation
 *
 * @param {string} name - The agent name
 * @param {Object} config - The memory configuration
 * @param {Object} context - The compilation context
 * @param {Object} tags - The merged tags
 * @returns {Object} CloudFormation resource definition
 */
function compileMemory(name, config, context, tags) {
  const { serviceName, stage } = context;
  const resourceName = getResourceName(serviceName, name, stage);
  const roleLogicalId = `${getLogicalId(name, 'Memory')}Role`;

  const strategies = buildMemoryStrategies(config.strategies);

  // Default expiry duration to 30 days if not specified
  const eventExpiryDuration = config.eventExpiryDuration || 30;

  return {
    Type: 'AWS::BedrockAgentCore::Memory',
    Properties: {
      Name: resourceName,
      EventExpiryDuration: eventExpiryDuration,
      ...(config.description && { Description: config.description }),
      ...(config.encryptionKeyArn && { EncryptionKeyArn: config.encryptionKeyArn }),
      ...(!config.roleArn && { MemoryExecutionRoleArn: { 'Fn::GetAtt': [roleLogicalId, 'Arn'] } }),
      ...(config.roleArn && { MemoryExecutionRoleArn: config.roleArn }),
      ...(strategies && { MemoryStrategies: strategies }),
      ...(Object.keys(tags).length > 0 && { Tags: tags }),
    },
  };
}

module.exports = {
  compileMemory,
  buildMemoryStrategies,
  isLegacyFormat,
  convertLegacyStrategy,
  resetDeprecationWarning,
};
