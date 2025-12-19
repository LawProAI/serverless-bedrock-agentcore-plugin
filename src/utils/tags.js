'use strict';

/**
 * Merge tags from multiple sources with proper precedence
 *
 * @param {Object} defaultTags - Default tags from custom.agentCore.defaultTags
 * @param {Object} resourceTags - Tags specific to the resource
 * @param {string} serviceName - The Serverless service name
 * @param {string} stage - The deployment stage
 * @param {string} resourceName - The resource name
 * @returns {Object} Merged tags object for CloudFormation
 */
function mergeTags(defaultTags = {}, resourceTags = {}, serviceName, stage, resourceName) {
  const tags = {
    ...defaultTags,
    ...resourceTags,
    'serverless:service': serviceName,
    'serverless:stage': stage,
    'agentcore:resource': resourceName,
  };

  return tags;
}

/**
 * Convert tags object to CloudFormation Tags array format
 *
 * @param {Object} tags - Tags object with key-value pairs
 * @returns {Array} Array of {Key, Value} objects for CloudFormation
 */
function tagsToCloudFormationArray(tags) {
  return Object.entries(tags).map(([Key, Value]) => ({
    Key,
    Value: String(Value),
  }));
}

/**
 * Convert CloudFormation Tags array to object format
 *
 * @param {Array} tagsArray - Array of {Key, Value} objects
 * @returns {Object} Tags object with key-value pairs
 */
function cloudFormationArrayToTags(tagsArray) {
  return tagsArray.reduce((acc, { Key, Value }) => {
    acc[Key] = Value;

    return acc;
  }, {});
}

module.exports = {
  mergeTags,
  tagsToCloudFormationArray,
  cloudFormationArrayToTags,
};
