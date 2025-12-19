'use strict';

const {
  mergeTags,
  tagsToCloudFormationArray,
  cloudFormationArrayToTags,
} = require('../../../src/utils/tags');

describe('Tags Utilities', () => {
  describe('mergeTags', () => {
    test('merges default and resource tags', () => {
      const defaultTags = { Project: 'MyProject', Team: 'Platform' };
      const resourceTags = { Environment: 'Production' };

      const result = mergeTags(defaultTags, resourceTags, 'my-service', 'prod', 'myAgent');

      expect(result).toEqual({
        Project: 'MyProject',
        Team: 'Platform',
        Environment: 'Production',
        'serverless:service': 'my-service',
        'serverless:stage': 'prod',
        'agentcore:resource': 'myAgent',
      });
    });

    test('resource tags override default tags', () => {
      const defaultTags = { Environment: 'Dev' };
      const resourceTags = { Environment: 'Prod' };

      const result = mergeTags(defaultTags, resourceTags, 'service', 'stage', 'resource');

      expect(result.Environment).toBe('Prod');
    });

    test('handles empty inputs', () => {
      const result = mergeTags(undefined, undefined, 'service', 'stage', 'resource');

      expect(result).toEqual({
        'serverless:service': 'service',
        'serverless:stage': 'stage',
        'agentcore:resource': 'resource',
      });
    });
  });

  describe('tagsToCloudFormationArray', () => {
    test('converts tags object to CloudFormation array format', () => {
      const tags = {
        Project: 'MyProject',
        Environment: 'Dev',
      };

      const result = tagsToCloudFormationArray(tags);

      expect(result).toEqual([
        { Key: 'Project', Value: 'MyProject' },
        { Key: 'Environment', Value: 'Dev' },
      ]);
    });

    test('converts non-string values to strings', () => {
      const tags = {
        Count: 42,
        Enabled: true,
      };

      const result = tagsToCloudFormationArray(tags);

      expect(result).toEqual([
        { Key: 'Count', Value: '42' },
        { Key: 'Enabled', Value: 'true' },
      ]);
    });
  });

  describe('cloudFormationArrayToTags', () => {
    test('converts CloudFormation array to tags object', () => {
      const tagsArray = [
        { Key: 'Project', Value: 'MyProject' },
        { Key: 'Environment', Value: 'Dev' },
      ];

      const result = cloudFormationArrayToTags(tagsArray);

      expect(result).toEqual({
        Project: 'MyProject',
        Environment: 'Dev',
      });
    });
  });
});
