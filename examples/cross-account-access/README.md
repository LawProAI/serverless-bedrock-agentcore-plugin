# Cross-Account Access Example

This example demonstrates how to configure resource-based policies on an AgentCore Runtime to allow cross-account access.

## Overview

Resource-based policies allow you to grant permissions to principals in other AWS accounts to invoke your AgentCore runtime. This is useful for:

- **Multi-account architectures**: Allow services in different AWS accounts to invoke your agent
- **Service-to-service communication**: Grant specific IAM roles permission to invoke the runtime
- **Cross-account integrations**: Enable secure agent invocation across organizational boundaries

## Configuration

The key configuration is the `resourcePolicy` property in your agent definition:

```yaml
agents:
  myAgent:
    type: runtime
    # ... other configuration ...
    resourcePolicy:
      Version: '2012-10-17'
      Statement:
        - Sid: AllowCrossAccountInvoke
          Effect: Allow
          Principal:
            AWS: arn:aws:iam::123456789012:role/my-app-dev-ecs-task-role
          Action:
            - bedrock-agentcore:InvokeAgentRuntime
          Resource: '*'
```

## How It Works

1. **Agent Account (026090513638)**: Deploys the AgentCore runtime with a resource-based policy
2. **Caller Account (123456789012)**: Has an IAM role (e.g., ECS task role) with permissions to invoke Bedrock AgentCore
3. **Cross-Account Access**: The resource policy on the agent allows the caller account's role to invoke it

### Required Components

#### 1. Resource-Based Policy (Agent Account)

Configured in `serverless.yml` using the `resourcePolicy` property. This policy is applied to the AgentCore runtime resource after deployment via the `PutResourcePolicy` API (not via CloudFormation). Any `Resource: '*'` in your statements is automatically replaced with the actual runtime ARN at deploy time.

#### 2. IAM Permissions (Caller Account)

The IAM role in the caller account needs permissions to invoke the agent:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "bedrock-agentcore:InvokeAgentRuntime",
      "Resource": "arn:aws:bedrock-agentcore:us-east-1:026090513638:runtime/*"
    }
  ]
}
```

## Deployment

1. Update the `serverPolicy` in `serverless.yml` with the correct account ID and role name
2. Deploy the agent:

```bash
npx sls deploy --stage dev
```

3. Verify the resource policy was applied (note: resource policies are applied via the `PutResourcePolicy` API, not CloudFormation):

```bash
aws bedrock-agentcore-control get-resource-policy \
  --resource-arn <runtime-arn-from-stack-outputs>
```

## Testing Cross-Account Access

From the caller account (123456789012), invoke the agent:

```javascript
import {
  BedrockAgentCoreClient,
  InvokeAgentRuntimeCommand,
} from '@aws-sdk/client-bedrock-agentcore';

const client = new BedrockAgentCoreClient({ region: 'us-east-1' });

const command = new InvokeAgentRuntimeCommand({
  agentRuntimeArn:
    'arn:aws:bedrock-agentcore:us-east-1:026090513638:runtime/cross_account_agent_myAgent_dev-<id>',
  payload: JSON.stringify({ message: 'Hello from another account!' }),
  runtimeSessionId: 'session-123',
  runtimeUserId: 'user-456',
});

const response = await client.send(command);
```

## Multiple Accounts

You can allow multiple accounts or roles by adding additional statements:

```yaml
resourcePolicy:
  Version: '2012-10-17'
  Statement:
    - Sid: AllowAccount1
      Effect: Allow
      Principal:
        AWS: arn:aws:iam::111111111111:role/app-role
      Action:
        - bedrock-agentcore:InvokeAgentRuntime
      Resource: '*'
    - Sid: AllowAccount2
      Effect: Allow
      Principal:
        AWS: arn:aws:iam::222222222222:role/service-role
      Action:
        - bedrock-agentcore:InvokeAgentRuntime
      Resource: '*'
```

## Security Considerations

- **Least Privilege**: Only grant access to specific roles, not entire accounts
- **Resource Constraints**: Consider adding conditions to limit access (e.g., by VPC, IP address)
- **Audit Logging**: Enable CloudTrail to monitor cross-account invocations
- **Regular Review**: Periodically review and update resource policies

## Troubleshooting

### AccessDeniedException

If you get an `AccessDeniedException` when invoking the agent:

1. Verify the resource policy is correctly configured in the agent account
2. Check that the caller account's IAM role has the necessary permissions
3. Ensure the principal ARN in the resource policy matches the caller's role ARN
4. Confirm the agent runtime ARN is correct

### Policy Not Applied

If the resource policy doesn't seem to be applied:

1. Check the deploy logs for "Applying resource policy" and "Resource policy applied successfully" messages
2. Verify the plugin version supports resource policies (v0.3.0+)
3. Ensure the `resourcePolicy` is properly indented in `serverless.yml`
4. Redeploy the stack to apply changes

## Related Examples

- [strands-cognito-jwt](../strands-cognito-jwt/README.md) - JWT authentication for agents
- [full-stack-agent](../full-stack-agent/README.md) - Complete agent setup with multiple resources
