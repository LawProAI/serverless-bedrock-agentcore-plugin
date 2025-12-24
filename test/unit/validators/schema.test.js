'use strict';

const { defineAgentsSchema } = require('../../../src/validators/schema');

describe('Schema Validator', () => {
  let mockServerless;
  let capturedAgentsSchema;
  let capturedCustomSchema;

  beforeEach(() => {
    capturedAgentsSchema = null;
    capturedCustomSchema = null;

    mockServerless = {
      configSchemaHandler: {
        defineTopLevelProperty: jest.fn((name, schema) => {
          if (name === 'agents') {
            capturedAgentsSchema = schema;
          }
        }),
        defineCustomProperties: jest.fn((schema) => {
          capturedCustomSchema = schema;
        }),
      },
    };
  });

  describe('defineAgentsSchema', () => {
    test('defines agents top-level property', () => {
      defineAgentsSchema(mockServerless);

      expect(mockServerless.configSchemaHandler.defineTopLevelProperty).toHaveBeenCalledWith(
        'agents',
        expect.any(Object)
      );
    });

    test('defines custom properties for agentCore', () => {
      defineAgentsSchema(mockServerless);

      expect(mockServerless.configSchemaHandler.defineCustomProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'object',
          properties: expect.objectContaining({
            agentCore: expect.any(Object),
          }),
        })
      );
    });

    test('agents schema is object type with additionalProperties', () => {
      defineAgentsSchema(mockServerless);

      expect(capturedAgentsSchema.type).toBe('object');
      expect(capturedAgentsSchema.additionalProperties).toBeDefined();
      expect(capturedAgentsSchema.additionalProperties.type).toBe('object');
    });

    test('agent schema requires type property', () => {
      defineAgentsSchema(mockServerless);

      expect(capturedAgentsSchema.additionalProperties.required).toContain('type');
    });

    test('agent schema has valid type enum', () => {
      defineAgentsSchema(mockServerless);

      const typeSchema = capturedAgentsSchema.additionalProperties.properties.type;
      expect(typeSchema.type).toBe('string');
      expect(typeSchema.enum).toContain('runtime');
      expect(typeSchema.enum).toContain('memory');
      expect(typeSchema.enum).toContain('gateway');
    });

    test('agent schema includes description property', () => {
      defineAgentsSchema(mockServerless);

      const descSchema = capturedAgentsSchema.additionalProperties.properties.description;
      expect(descSchema.type).toBe('string');
      expect(descSchema.minLength).toBe(1);
      expect(descSchema.maxLength).toBe(1200);
    });

    test('agent schema includes tags property', () => {
      defineAgentsSchema(mockServerless);

      const tagsSchema = capturedAgentsSchema.additionalProperties.properties.tags;
      expect(tagsSchema.type).toBe('object');
      expect(tagsSchema.additionalProperties.type).toBe('string');
    });

    test('agent schema includes roleArn with pattern', () => {
      defineAgentsSchema(mockServerless);

      const roleArnSchema = capturedAgentsSchema.additionalProperties.properties.roleArn;
      expect(roleArnSchema.type).toBe('string');
      expect(roleArnSchema.pattern).toContain('arn:aws');
    });

    test('runtime schema includes artifact property', () => {
      defineAgentsSchema(mockServerless);

      const artifactSchema = capturedAgentsSchema.additionalProperties.properties.artifact;
      expect(artifactSchema.type).toBe('object');
      expect(artifactSchema.properties.containerImage).toBeDefined();
      expect(artifactSchema.properties.s3).toBeDefined();
    });

    test('runtime schema includes protocol property', () => {
      defineAgentsSchema(mockServerless);

      const protocolSchema = capturedAgentsSchema.additionalProperties.properties.protocol;
      expect(protocolSchema.type).toBe('string');
      expect(protocolSchema.enum).toContain('HTTP');
      expect(protocolSchema.enum).toContain('MCP');
      expect(protocolSchema.enum).toContain('A2A');
    });

    test('runtime schema includes network configuration', () => {
      defineAgentsSchema(mockServerless);

      const networkSchema = capturedAgentsSchema.additionalProperties.properties.network;
      expect(networkSchema.type).toBe('object');
      expect(networkSchema.properties.networkMode.enum).toContain('PUBLIC');
      expect(networkSchema.properties.networkMode.enum).toContain('VPC');
    });

    test('runtime schema includes authorizer configuration', () => {
      defineAgentsSchema(mockServerless);

      const authSchema = capturedAgentsSchema.additionalProperties.properties.authorizer;
      expect(authSchema.type).toBe('object');
      expect(authSchema.properties.type.enum).toContain('CUSTOM_JWT');
      expect(authSchema.properties.type.enum).toContain('AWS_IAM');
      expect(authSchema.properties.type.enum).toContain('NONE');
    });

    test('runtime schema includes lifecycle configuration', () => {
      defineAgentsSchema(mockServerless);

      const lifecycleSchema = capturedAgentsSchema.additionalProperties.properties.lifecycle;
      expect(lifecycleSchema.type).toBe('object');
      expect(lifecycleSchema.properties.idleTimeout.type).toBe('number');
      expect(lifecycleSchema.properties.maxConcurrency.type).toBe('number');
    });

    test('runtime schema includes endpoints array', () => {
      defineAgentsSchema(mockServerless);

      const endpointsSchema = capturedAgentsSchema.additionalProperties.properties.endpoints;
      expect(endpointsSchema.type).toBe('array');
      expect(endpointsSchema.items.properties.name).toBeDefined();
      expect(endpointsSchema.items.properties.version).toBeDefined();
    });

    test('memory schema includes eventExpiryDuration', () => {
      defineAgentsSchema(mockServerless);

      const expirySchema = capturedAgentsSchema.additionalProperties.properties.eventExpiryDuration;
      expect(expirySchema.type).toBe('number');
      expect(expirySchema.minimum).toBe(7);
      expect(expirySchema.maximum).toBe(365);
    });

    test('memory schema includes strategies array', () => {
      defineAgentsSchema(mockServerless);

      const strategiesSchema = capturedAgentsSchema.additionalProperties.properties.strategies;
      expect(strategiesSchema.type).toBe('array');
      // Strategies use additionalProperties to support both legacy and new format
      expect(strategiesSchema.items.type).toBe('object');
      expect(strategiesSchema.items.additionalProperties).toBe(true);
    });

    test('gateway schema includes authorizerType', () => {
      defineAgentsSchema(mockServerless);

      const authTypeSchema = capturedAgentsSchema.additionalProperties.properties.authorizerType;
      expect(authTypeSchema.type).toBe('string');
      expect(authTypeSchema.enum).toContain('NONE');
      expect(authTypeSchema.enum).toContain('AWS_IAM');
      expect(authTypeSchema.enum).toContain('CUSTOM_JWT');
    });

    test('gateway schema includes targets array', () => {
      defineAgentsSchema(mockServerless);

      const targetsSchema = capturedAgentsSchema.additionalProperties.properties.targets;
      expect(targetsSchema.type).toBe('array');
      expect(targetsSchema.items.properties.name).toBeDefined();
      expect(targetsSchema.items.properties.type.enum).toContain('openapi');
      expect(targetsSchema.items.properties.type.enum).toContain('lambda');
      expect(targetsSchema.items.properties.type.enum).toContain('smithy');
    });

    test('custom agentCore schema includes defaultTags', () => {
      defineAgentsSchema(mockServerless);

      const agentCoreSchema = capturedCustomSchema.properties.agentCore;
      expect(agentCoreSchema.type).toBe('object');
      expect(agentCoreSchema.properties.defaultTags.type).toBe('object');
      expect(agentCoreSchema.properties.defaultTags.additionalProperties.type).toBe('string');
    });
  });
});
