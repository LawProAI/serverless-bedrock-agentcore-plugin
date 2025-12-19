'use strict';

/**
 * Define JSON Schema validation for the 'agents' top-level configuration
 *
 * @param {Object} serverless - The Serverless instance
 */
function defineAgentsSchema(serverless) {
  // Define the 'agents' top-level property
  serverless.configSchemaHandler.defineTopLevelProperty('agents', {
    type: 'object',
    additionalProperties: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['runtime', 'memory', 'gateway', 'browser', 'codeInterpreter', 'workloadIdentity'],
        },
        description: {
          type: 'string',
          minLength: 1,
          maxLength: 1200,
        },
        tags: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
        roleArn: {
          type: 'string',
          pattern: '^arn:aws(-[^:]+)?:iam::([0-9]{12})?:role/.+$',
        },

        // Runtime-specific properties
        artifact: {
          type: 'object',
          properties: {
            containerImage: { type: 'string' },
            s3: {
              type: 'object',
              properties: {
                bucket: { type: 'string' },
                key: { type: 'string' },
              },
              required: ['bucket', 'key'],
            },
          },
        },
        protocol: {
          type: 'string',
          enum: ['HTTP', 'MCP', 'A2A'],
        },
        environment: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
        network: {
          type: 'object',
          properties: {
            networkMode: {
              type: 'string',
              enum: ['PUBLIC', 'VPC'],
            },
            vpcConfig: {
              type: 'object',
              properties: {
                subnetIds: {
                  type: 'array',
                  items: { type: 'string' },
                },
                securityGroupIds: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            },
          },
        },
        authorizer: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['CUSTOM_JWT', 'AWS_IAM', 'NONE'],
            },
            jwtConfiguration: {
              type: 'object',
              properties: {
                issuer: { type: 'string' },
                audience: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            },
          },
        },
        lifecycle: {
          type: 'object',
          properties: {
            idleTimeout: { type: 'number' },
            maxConcurrency: { type: 'number' },
          },
        },
        endpoints: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              version: { type: 'string' },
              description: { type: 'string' },
            },
          },
        },

        // Memory-specific properties
        eventExpiryDuration: {
          type: 'number',
          minimum: 7,
          maximum: 365,
        },
        encryptionKeyArn: {
          type: 'string',
        },
        strategies: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['semantic', 'userPreference', 'summary', 'custom'],
              },
              name: { type: 'string' },
              namespaces: {
                type: 'array',
                items: { type: 'string' },
              },
              configuration: {
                type: 'object',
              },
            },
            required: ['type', 'name'],
          },
        },

        // Gateway-specific properties
        authorizerType: {
          type: 'string',
          enum: ['AWS_IAM', 'CUSTOM_JWT'],
        },
        protocolType: {
          type: 'string',
          enum: ['MCP'],
        },
        authorizerConfiguration: {
          type: 'object',
          properties: {
            allowedAudiences: {
              type: 'array',
              items: { type: 'string' },
            },
            allowedClients: {
              type: 'array',
              items: { type: 'string' },
            },
            allowedIssuers: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
        kmsKeyArn: {
          type: 'string',
        },
        targets: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: {
                type: 'string',
                enum: ['openapi', 'lambda', 'smithy'],
              },
              description: { type: 'string' },
              functionArn: { type: 'string' },
              functionName: { type: 'string' },
              s3: {
                type: 'object',
                properties: {
                  bucket: { type: 'string' },
                  key: { type: 'string' },
                },
              },
              credentialProvider: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['GATEWAY_IAM_ROLE', 'OAUTH', 'API_KEY'],
                  },
                  oauthConfig: {
                    type: 'object',
                    properties: {
                      secretArn: { type: 'string' },
                      tokenUrl: { type: 'string' },
                      scopes: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                    },
                  },
                  apiKeyConfig: {
                    type: 'object',
                    properties: {
                      secretArn: { type: 'string' },
                    },
                  },
                },
              },
            },
            required: ['name'],
          },
        },
      },
      required: ['type'],
    },
  });

  // Define custom.agentCore configuration
  serverless.configSchemaHandler.defineCustomProperties({
    type: 'object',
    properties: {
      agentCore: {
        type: 'object',
        properties: {
          defaultTags: {
            type: 'object',
            additionalProperties: { type: 'string' },
          },
        },
      },
    },
  });
}

module.exports = {
  defineAgentsSchema,
};
