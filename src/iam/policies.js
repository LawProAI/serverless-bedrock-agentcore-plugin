'use strict';

const { getResourceName } = require('../utils/naming');

/**
 * Generate IAM role for AgentCore Runtime
 *
 * @param {string} name - The agent name
 * @param {Object} config - The runtime configuration
 * @param {Object} context - The compilation context
 * @returns {Object} CloudFormation IAM Role resource
 */
function generateRuntimeRole(name, config, context) {
  const { serviceName, stage } = context;
  const roleName = getResourceName(serviceName, `${name}-runtime-role`, stage);

  const assumeRolePolicy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: {
          Service: 'bedrock-agentcore.amazonaws.com',
        },
        Action: 'sts:AssumeRole',
        Condition: {
          StringEquals: {
            'aws:SourceAccount': { Ref: 'AWS::AccountId' },
          },
        },
      },
    ],
  };

  // Base permissions for runtime
  const policies = [
    {
      PolicyName: `${roleName}-base-policy`,
      PolicyDocument: {
        Version: '2012-10-17',
        Statement: [
          // CloudWatch Logs permissions
          {
            Effect: 'Allow',
            Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
            Resource: {
              'Fn::Sub':
                'arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}:log-group:/aws/bedrock-agentcore/*',
            },
          },
          // ECR permissions if using container image
          ...(config.artifact?.containerImage
            ? [
                {
                  Effect: 'Allow',
                  Action: ['ecr:GetAuthorizationToken'],
                  Resource: '*',
                },
                {
                  Effect: 'Allow',
                  Action: [
                    'ecr:BatchCheckLayerAvailability',
                    'ecr:GetDownloadUrlForLayer',
                    'ecr:BatchGetImage',
                  ],
                  Resource: {
                    'Fn::Sub':
                      'arn:${AWS::Partition}:ecr:${AWS::Region}:${AWS::AccountId}:repository/*',
                  },
                },
              ]
            : []),
          // S3 permissions if using S3 artifact
          ...(config.artifact?.s3
            ? [
                {
                  Effect: 'Allow',
                  Action: ['s3:GetObject', 's3:GetObjectVersion'],
                  Resource: {
                    'Fn::Sub': `arn:\${AWS::Partition}:s3:::${config.artifact.s3.bucket}/${config.artifact.s3.key}`,
                  },
                },
              ]
            : []),
          // Bedrock model invocation permissions (all regions for cross-region inference)
          {
            Effect: 'Allow',
            Action: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
            Resource: {
              'Fn::Sub': 'arn:${AWS::Partition}:bedrock:*::foundation-model/*',
            },
          },
          // Bedrock cross-region inference profile permissions
          {
            Effect: 'Allow',
            Action: [
              'bedrock:InvokeModel',
              'bedrock:InvokeModelWithResponseStream',
              'bedrock:GetInferenceProfile',
            ],
            Resource: [
              'arn:aws:bedrock:*:*:inference-profile/us.*',
              'arn:aws:bedrock:*:*:inference-profile/eu.*',
              'arn:aws:bedrock:*:*:inference-profile/global.*',
            ],
          },
        ],
      },
    },
  ];

  // Add VPC permissions if VPC mode
  if (config.network?.networkMode === 'VPC') {
    policies[0].PolicyDocument.Statement.push({
      Effect: 'Allow',
      Action: [
        'ec2:CreateNetworkInterface',
        'ec2:DescribeNetworkInterfaces',
        'ec2:DeleteNetworkInterface',
        'ec2:AssignPrivateIpAddresses',
        'ec2:UnassignPrivateIpAddresses',
      ],
      Resource: '*',
    });
  }

  return {
    Type: 'AWS::IAM::Role',
    Properties: {
      RoleName: roleName,
      AssumeRolePolicyDocument: assumeRolePolicy,
      Policies: policies,
      Tags: [
        { Key: 'serverless:service', Value: serviceName },
        { Key: 'serverless:stage', Value: stage },
        { Key: 'agentcore:resource', Value: name },
        { Key: 'agentcore:type', Value: 'runtime-role' },
      ],
    },
  };
}

/**
 * Generate IAM role for AgentCore Memory
 *
 * @param {string} name - The agent name
 * @param {Object} config - The memory configuration
 * @param {Object} context - The compilation context
 * @returns {Object} CloudFormation IAM Role resource
 */
function generateMemoryRole(name, config, context) {
  const { serviceName, stage } = context;
  const roleName = getResourceName(serviceName, `${name}-memory-role`, stage);

  const assumeRolePolicy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: {
          Service: 'bedrock-agentcore.amazonaws.com',
        },
        Action: 'sts:AssumeRole',
        Condition: {
          StringEquals: {
            'aws:SourceAccount': { Ref: 'AWS::AccountId' },
          },
        },
      },
    ],
  };

  const policies = [
    {
      PolicyName: `${roleName}-base-policy`,
      PolicyDocument: {
        Version: '2012-10-17',
        Statement: [
          // CloudWatch Logs permissions
          {
            Effect: 'Allow',
            Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
            Resource: {
              'Fn::Sub':
                'arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}:log-group:/aws/bedrock-agentcore/*',
            },
          },
          // Bedrock model invocation for memory strategies (all regions for cross-region inference)
          {
            Effect: 'Allow',
            Action: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
            Resource: {
              'Fn::Sub': 'arn:${AWS::Partition}:bedrock:*::foundation-model/*',
            },
          },
          // Bedrock cross-region inference profile permissions
          {
            Effect: 'Allow',
            Action: [
              'bedrock:InvokeModel',
              'bedrock:InvokeModelWithResponseStream',
              'bedrock:GetInferenceProfile',
            ],
            Resource: [
              'arn:aws:bedrock:*:*:inference-profile/us.*',
              'arn:aws:bedrock:*:*:inference-profile/eu.*',
              'arn:aws:bedrock:*:*:inference-profile/global.*',
            ],
          },
          // KMS permissions if encryption key is specified
          ...(config.encryptionKeyArn
            ? [
                {
                  Effect: 'Allow',
                  Action: ['kms:Decrypt', 'kms:Encrypt', 'kms:GenerateDataKey', 'kms:DescribeKey'],
                  Resource: config.encryptionKeyArn,
                },
              ]
            : []),
        ],
      },
    },
  ];

  return {
    Type: 'AWS::IAM::Role',
    Properties: {
      RoleName: roleName,
      AssumeRolePolicyDocument: assumeRolePolicy,
      Policies: policies,
      Tags: [
        { Key: 'serverless:service', Value: serviceName },
        { Key: 'serverless:stage', Value: stage },
        { Key: 'agentcore:resource', Value: name },
        { Key: 'agentcore:type', Value: 'memory-role' },
      ],
    },
  };
}

/**
 * Generate IAM role for AgentCore Gateway
 *
 * @param {string} name - The agent name
 * @param {Object} config - The gateway configuration
 * @param {Object} context - The compilation context
 * @returns {Object} CloudFormation IAM Role resource
 */
function generateGatewayRole(name, config, context) {
  const { serviceName, stage } = context;
  const roleName = getResourceName(serviceName, `${name}-gateway-role`, stage);

  const assumeRolePolicy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: {
          Service: 'bedrock-agentcore.amazonaws.com',
        },
        Action: 'sts:AssumeRole',
        Condition: {
          StringEquals: {
            'aws:SourceAccount': { Ref: 'AWS::AccountId' },
          },
        },
      },
    ],
  };

  // Build Lambda invocation permissions if there are Lambda targets
  const lambdaTargets = (config.targets || []).filter(
    (t) => t.type === 'lambda' || (!t.type && (t.functionArn || t.functionName))
  );

  const policies = [
    {
      PolicyName: `${roleName}-base-policy`,
      PolicyDocument: {
        Version: '2012-10-17',
        Statement: [
          // CloudWatch Logs permissions
          {
            Effect: 'Allow',
            Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
            Resource: {
              'Fn::Sub':
                'arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}:log-group:/aws/bedrock-agentcore/*',
            },
          },
          // Lambda invocation permissions for Lambda targets
          ...(lambdaTargets.length > 0
            ? [
                {
                  Effect: 'Allow',
                  Action: ['lambda:InvokeFunction'],
                  Resource: lambdaTargets.map((t) => {
                    if (t.functionArn) {
                      return t.functionArn;
                    }
                    // Reference the function from the stack
                    const functionLogicalId =
                      t.functionName
                        .split(/[-_]/)
                        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
                        .join('') + 'LambdaFunction';

                    return { 'Fn::GetAtt': [functionLogicalId, 'Arn'] };
                  }),
                },
              ]
            : []),
          // S3 permissions for OpenAPI/Smithy specs
          ...getS3PermissionsForTargets(config.targets || []),
          // Secrets Manager permissions for OAuth/API Key credentials
          ...getSecretsManagerPermissions(config.targets || []),
          // KMS permissions if encryption key is specified
          ...(config.kmsKeyArn
            ? [
                {
                  Effect: 'Allow',
                  Action: ['kms:Decrypt', 'kms:Encrypt', 'kms:GenerateDataKey', 'kms:DescribeKey'],
                  Resource: config.kmsKeyArn,
                },
              ]
            : []),
        ],
      },
    },
  ];

  return {
    Type: 'AWS::IAM::Role',
    Properties: {
      RoleName: roleName,
      AssumeRolePolicyDocument: assumeRolePolicy,
      Policies: policies,
      Tags: [
        { Key: 'serverless:service', Value: serviceName },
        { Key: 'serverless:stage', Value: stage },
        { Key: 'agentcore:resource', Value: name },
        { Key: 'agentcore:type', Value: 'gateway-role' },
      ],
    },
  };
}

/**
 * Get S3 permissions for targets with S3 configurations
 *
 * @param {Array} targets - Array of target configurations
 * @returns {Array} Array of IAM policy statements
 */
function getS3PermissionsForTargets(targets) {
  const s3Targets = targets.filter((t) => t.s3);

  if (s3Targets.length === 0) {
    return [];
  }

  return [
    {
      Effect: 'Allow',
      Action: ['s3:GetObject', 's3:GetObjectVersion'],
      Resource: s3Targets.map((t) => ({
        'Fn::Sub': `arn:\${AWS::Partition}:s3:::${t.s3.bucket}/${t.s3.key}`,
      })),
    },
  ];
}

/**
 * Get Secrets Manager permissions for OAuth/API Key credentials
 *
 * @param {Array} targets - Array of target configurations
 * @returns {Array} Array of IAM policy statements
 */
function getSecretsManagerPermissions(targets) {
  const secretArns = targets
    .filter((t) => t.credentialProvider)
    .map((t) => {
      const cp = t.credentialProvider;
      if (cp.oauthConfig?.secretArn) {
        return cp.oauthConfig.secretArn;
      }
      if (cp.apiKeyConfig?.secretArn) {
        return cp.apiKeyConfig.secretArn;
      }

      return null;
    })
    .filter(Boolean);

  if (secretArns.length === 0) {
    return [];
  }

  return [
    {
      Effect: 'Allow',
      Action: ['secretsmanager:GetSecretValue'],
      Resource: secretArns,
    },
  ];
}

/**
 * Generate IAM role for AgentCore BrowserCustom
 *
 * @param {string} name - The browser name
 * @param {Object} config - The browser configuration
 * @param {Object} context - The compilation context
 * @returns {Object} CloudFormation IAM Role resource
 */
function generateBrowserRole(name, config, context) {
  const { serviceName, stage } = context;
  const roleName = getResourceName(serviceName, `${name}-browser-role`, stage);

  const assumeRolePolicy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: {
          Service: 'bedrock-agentcore.amazonaws.com',
        },
        Action: 'sts:AssumeRole',
        Condition: {
          StringEquals: {
            'aws:SourceAccount': { Ref: 'AWS::AccountId' },
          },
        },
      },
    ],
  };

  const policies = [
    {
      PolicyName: `${roleName}-policy`,
      PolicyDocument: {
        Version: '2012-10-17',
        Statement: [
          // CloudWatch Logs permissions
          {
            Effect: 'Allow',
            Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
            Resource: {
              'Fn::Sub':
                'arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}:log-group:/aws/bedrock-agentcore/*',
            },
          },
          // S3 permissions for recordings (if enabled)
          ...(config.recording?.s3Location
            ? [
                {
                  Effect: 'Allow',
                  Action: ['s3:PutObject', 's3:GetObject'],
                  Resource: {
                    'Fn::Sub': `arn:\${AWS::Partition}:s3:::${config.recording.s3Location.bucket}/${config.recording.s3Location.prefix || ''}*`,
                  },
                },
              ]
            : []),
          // VPC permissions (if VPC mode)
          ...(config.network?.networkMode === 'VPC'
            ? [
                {
                  Effect: 'Allow',
                  Action: [
                    'ec2:CreateNetworkInterface',
                    'ec2:DescribeNetworkInterfaces',
                    'ec2:DeleteNetworkInterface',
                    'ec2:AssignPrivateIpAddresses',
                    'ec2:UnassignPrivateIpAddresses',
                  ],
                  Resource: '*',
                },
              ]
            : []),
        ],
      },
    },
  ];

  return {
    Type: 'AWS::IAM::Role',
    Properties: {
      RoleName: roleName,
      AssumeRolePolicyDocument: assumeRolePolicy,
      Policies: policies,
      Tags: [
        { Key: 'serverless:service', Value: serviceName },
        { Key: 'serverless:stage', Value: stage },
        { Key: 'agentcore:resource', Value: name },
        { Key: 'agentcore:type', Value: 'browser-role' },
      ],
    },
  };
}

/**
 * Generate IAM role for AgentCore CodeInterpreterCustom
 *
 * @param {string} name - The code interpreter name
 * @param {Object} config - The code interpreter configuration
 * @param {Object} context - The compilation context
 * @returns {Object} CloudFormation IAM Role resource
 */
function generateCodeInterpreterRole(name, config, context) {
  const { serviceName, stage } = context;
  const roleName = getResourceName(serviceName, `${name}-ci-role`, stage);

  const assumeRolePolicy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: {
          Service: 'bedrock-agentcore.amazonaws.com',
        },
        Action: 'sts:AssumeRole',
        Condition: {
          StringEquals: {
            'aws:SourceAccount': { Ref: 'AWS::AccountId' },
          },
        },
      },
    ],
  };

  const policies = [
    {
      PolicyName: `${roleName}-policy`,
      PolicyDocument: {
        Version: '2012-10-17',
        Statement: [
          // CloudWatch Logs permissions
          {
            Effect: 'Allow',
            Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
            Resource: {
              'Fn::Sub':
                'arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}:log-group:/aws/bedrock-agentcore/*',
            },
          },
          // VPC permissions (if VPC mode)
          ...(config.network?.networkMode === 'VPC'
            ? [
                {
                  Effect: 'Allow',
                  Action: [
                    'ec2:CreateNetworkInterface',
                    'ec2:DescribeNetworkInterfaces',
                    'ec2:DeleteNetworkInterface',
                    'ec2:AssignPrivateIpAddresses',
                    'ec2:UnassignPrivateIpAddresses',
                  ],
                  Resource: '*',
                },
              ]
            : []),
        ],
      },
    },
  ];

  return {
    Type: 'AWS::IAM::Role',
    Properties: {
      RoleName: roleName,
      AssumeRolePolicyDocument: assumeRolePolicy,
      Policies: policies,
      Tags: [
        { Key: 'serverless:service', Value: serviceName },
        { Key: 'serverless:stage', Value: stage },
        { Key: 'agentcore:resource', Value: name },
        { Key: 'agentcore:type', Value: 'codeinterpreter-role' },
      ],
    },
  };
}

module.exports = {
  generateRuntimeRole,
  generateMemoryRole,
  generateGatewayRole,
  generateBrowserRole,
  generateCodeInterpreterRole,
  getS3PermissionsForTargets,
  getSecretsManagerPermissions,
};
