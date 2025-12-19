'use strict';

/**
 * Generate a resource name following the pattern: {service}-{name}-{stage}
 *
 * @param {string} serviceName - The Serverless service name
 * @param {string} name - The agent/resource name
 * @param {string} stage - The deployment stage
 * @returns {string} The generated resource name
 */
function getResourceName(serviceName, name, stage) {
  // AgentCore names have pattern: [a-zA-Z][a-zA-Z0-9_]{0,47}
  // Replace hyphens with underscores and ensure it starts with a letter
  const baseName = `${serviceName}_${name}_${stage}`
    .replace(/-/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '');

  // Ensure it starts with a letter
  const safeName = /^[a-zA-Z]/.test(baseName) ? baseName : `A${baseName}`;

  // Truncate to max 48 characters
  return safeName.substring(0, 48);
}

/**
 * Generate a CloudFormation logical ID from the agent name and resource type
 *
 * @param {string} name - The agent name
 * @param {string} resourceType - The resource type (e.g., 'Runtime', 'Memory')
 * @returns {string} The CloudFormation logical ID
 */
function getLogicalId(name, resourceType) {
  // Convert to PascalCase and remove invalid characters
  const pascalName = name
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');

  return `${pascalName}${resourceType}`;
}

/**
 * Generate a CloudFormation logical ID for nested resources
 *
 * @param {string} parentName - The parent resource name
 * @param {string} childName - The child resource name
 * @param {string} resourceType - The resource type
 * @returns {string} The CloudFormation logical ID
 */
function getNestedLogicalId(parentName, childName, resourceType) {
  const pascalParent = parentName
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');

  const pascalChild = childName
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');

  return `${pascalParent}${pascalChild}${resourceType}`;
}

/**
 * Sanitize a name for use in CloudFormation
 *
 * @param {string} name - The name to sanitize
 * @returns {string} The sanitized name
 */
function sanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9]/g, '');
}

module.exports = {
  getResourceName,
  getLogicalId,
  getNestedLogicalId,
  sanitizeName,
};
