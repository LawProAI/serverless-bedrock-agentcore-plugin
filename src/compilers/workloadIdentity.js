'use strict';

const { getResourceName } = require('../utils/naming');

/**
 * Compile a WorkloadIdentity resource to CloudFormation
 *
 * @param {string} name - The workload identity name
 * @param {Object} config - The workload identity configuration
 * @param {Object} context - The compilation context
 * @param {Object} tags - The merged tags
 * @returns {Object} CloudFormation resource definition
 */
function compileWorkloadIdentity(name, config, context, tags) {
  const { serviceName, stage } = context;
  // WorkloadIdentity name pattern: [A-Za-z0-9_.-]+
  // Replace underscores with hyphens to match the pattern better
  const resourceName = getResourceName(serviceName, name, stage).replace(/_/g, '-');

  // Convert tags object to array format for WorkloadIdentity
  // WorkloadIdentity uses Array[Tag] format instead of Object format
  const tagArray = Object.entries(tags).map(([Key, Value]) => ({ Key, Value }));

  return {
    Type: 'AWS::BedrockAgentCore::WorkloadIdentity',
    Properties: {
      Name: resourceName,
      ...(config.oauth2ReturnUrls && { AllowedResourceOauth2ReturnUrls: config.oauth2ReturnUrls }),
      ...(tagArray.length > 0 && { Tags: tagArray }),
    },
  };
}

module.exports = {
  compileWorkloadIdentity,
};
