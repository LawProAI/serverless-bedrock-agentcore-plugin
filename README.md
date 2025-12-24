# serverless-bedrock-agentcore-plugin

Deploy AWS Bedrock AgentCore resources with Serverless Framework.

## Features

- Define AgentCore resources in `serverless.yml`
- Supports all AgentCore resource types:
  - **Runtime** - Deploy containerized AI agents
  - **Memory** - Conversation history with semantic search
  - **Gateway** - External API integrations
  - **Browser** - Web browsing capabilities
  - **CodeInterpreter** - Sandboxed code execution
  - **WorkloadIdentity** - OAuth2 authentication
- Auto-generates IAM roles with least-privilege permissions
- Automatic tagging and naming conventions
- CloudFormation outputs for cross-stack references

## Installation

```bash
npm install serverless-bedrock-agentcore-plugin --save-dev
```

Add to `serverless.yml`:

```yaml
plugins:
  - serverless-bedrock-agentcore-plugin
```

## Quick Start

```yaml
service: my-agent

provider:
  name: aws
  region: us-east-1

plugins:
  - serverless-bedrock-agentcore-plugin

agents:
  myAgent:
    type: runtime
    description: My AI agent
    artifact:
      docker:
        path: .
        file: Dockerfile
        repository: my-agent
    protocol: HTTP
    network:
      networkMode: PUBLIC
    # Omit 'authorizer' for no authentication
```

## Resource Types

### Runtime

Deploy containerized AI agents with the AgentCore Runtime.

```yaml
agents:
  myAgent:
    type: runtime
    description: My AI agent
    artifact:
      docker:
        path: .
        file: Dockerfile
        repository: my-agent
    protocol: HTTP # HTTP, MCP, or A2A
    network:
      networkMode: PUBLIC # PUBLIC or VPC
    # Optional: JWT authorization (omit for no auth)
    authorizer:
      customJwtAuthorizer:
        discoveryUrl: https://cognito-idp.us-east-1.amazonaws.com/us-east-1_xxx/.well-known/openid-configuration
        allowedAudience:
          - my-client-id
    # Optional: Pass specific headers to the runtime
    requestHeaders:
      allowlist:
        - X-User-Id
        - X-Session-Id
        - Authorization
```

| Property                                  | Required | Description                                              |
| ----------------------------------------- | -------- | -------------------------------------------------------- |
| `type`                                    | Yes      | `runtime`                                                |
| `artifact.docker.path`                    | Yes\*    | Docker build context path                                |
| `artifact.docker.file`                    | No       | Dockerfile name (default: Dockerfile)                    |
| `artifact.docker.repository`              | No       | ECR repository name                                      |
| `artifact.containerImage`                 | Yes\*    | Pre-built container image URI                            |
| `protocol`                                | No       | `HTTP`, `MCP`, or `A2A`                                  |
| `network.networkMode`                     | No       | `PUBLIC` or `VPC`                                        |
| `authorizer.customJwtAuthorizer`          | No       | JWT authorizer config (omit for no auth)                 |
| `authorizer.customJwtAuthorizer.discoveryUrl` | Yes\*\* | OIDC discovery URL                                   |
| `authorizer.customJwtAuthorizer.allowedAudience` | No  | Array of allowed audience values                         |
| `authorizer.customJwtAuthorizer.allowedClients` | No   | Array of allowed client IDs                              |
| `requestHeaders.allowlist`                | No       | Headers to pass to runtime (max 20)                      |
| `description`                             | No       | Runtime description                                      |
| `roleArn`                                 | No       | Custom IAM role ARN                                      |

\*Either `artifact.docker` or `artifact.containerImage` is required

\*\*Required when using `customJwtAuthorizer`

### Memory

Store conversation history with semantic search and summarization.

```yaml
agents:
  conversationMemory:
    type: memory
    description: Conversation memory with semantic search
    eventExpiryDuration: 90
    strategies:
      # Semantic search strategy
      - SemanticMemoryStrategy:
          Name: ConversationSearch
          Namespaces:
            - /conversations/{sessionId}

      # Summarization strategy
      - SummaryMemoryStrategy:
          Name: SessionSummary
          Namespaces:
            - /sessions/{sessionId}

      # User preference strategy
      - UserPreferenceMemoryStrategy:
          Name: UserPrefs
          Namespaces:
            - /users/{userId}/preferences
```

| Property              | Required | Description                         |
| --------------------- | -------- | ----------------------------------- |
| `type`                | Yes      | `memory`                            |
| `eventExpiryDuration` | No       | Days to retain (7-365, default: 30) |
| `strategies`          | No       | Memory strategies array             |
| `description`         | No       | Memory description                  |
| `encryptionKeyArn`    | No       | KMS key for encryption              |
| `roleArn`             | No       | Custom IAM role ARN                 |

#### Memory Strategy Types

**SemanticMemoryStrategy** - Semantic search over conversations:

```yaml
- SemanticMemoryStrategy:
    Name: Search
    Namespaces:
      - /sessions/{sessionId}
```

**SummaryMemoryStrategy** - Summarize long conversations:

```yaml
- SummaryMemoryStrategy:
    Name: Summary
    Namespaces:
      - /sessions/{sessionId}
```

**UserPreferenceMemoryStrategy** - Track user preferences:

```yaml
- UserPreferenceMemoryStrategy:
    Name: Preferences
    Namespaces:
      - /users/{userId}
```

**CustomMemoryStrategy** - Custom memory handling:

```yaml
- CustomMemoryStrategy:
    Name: Custom
    Configuration:
      key: value
```

### Browser

Enable web browsing capabilities for agents.

```yaml
agents:
  webBrowser:
    type: browser
    description: Web browser for agent
    network:
      networkMode: PUBLIC # PUBLIC or VPC
    signing:
      enabled: true
    recording:
      enabled: true
      s3Location:
        bucket: my-recordings-bucket
        prefix: browser-sessions/
```

| Property               | Required | Description                               |
| ---------------------- | -------- | ----------------------------------------- |
| `type`                 | Yes      | `browser`                                 |
| `network.networkMode`  | No       | `PUBLIC` or `VPC` (default: `PUBLIC`)     |
| `network.vpcConfig`    | No       | VPC configuration (required for VPC mode) |
| `signing.enabled`      | No       | Enable request signing                    |
| `recording.enabled`    | No       | Enable session recording                  |
| `recording.s3Location` | No       | S3 bucket/prefix for recordings           |
| `description`          | No       | Browser description                       |
| `roleArn`              | No       | Custom IAM role ARN                       |

### CodeInterpreter

Enable sandboxed code execution.

```yaml
agents:
  codeExecutor:
    type: codeInterpreter
    description: Python code execution
    network:
      networkMode: SANDBOX # SANDBOX, PUBLIC, or VPC
```

| Property              | Required | Description                                        |
| --------------------- | -------- | -------------------------------------------------- |
| `type`                | Yes      | `codeInterpreter`                                  |
| `network.networkMode` | No       | `SANDBOX`, `PUBLIC`, or `VPC` (default: `SANDBOX`) |
| `network.vpcConfig`   | No       | VPC configuration (required for VPC mode)          |
| `description`         | No       | CodeInterpreter description                        |
| `roleArn`             | No       | Custom IAM role ARN                                |

### WorkloadIdentity

Enable OAuth2 authentication for agents.

```yaml
agents:
  agentIdentity:
    type: workloadIdentity
    oauth2ReturnUrls:
      - https://example.com/callback
      - http://localhost:3000/auth/callback
```

| Property           | Required | Description                  |
| ------------------ | -------- | ---------------------------- |
| `type`             | Yes      | `workloadIdentity`           |
| `oauth2ReturnUrls` | No       | Allowed OAuth2 redirect URLs |

### Gateway

Integrate external APIs as agent tools.

```yaml
agents:
  # Gateway without authentication
  publicGateway:
    type: gateway
    description: Public API gateway
    authorizerType: NONE
    targets:
      - name: WeatherAPI
        type: lambda
        description: Get weather data
        functionArn:
          Fn::GetAtt:
            - WeatherFunction
            - Arn

  # Gateway with JWT authentication
  secureGateway:
    type: gateway
    description: Secure API gateway with JWT auth
    authorizerType: CUSTOM_JWT
    authorizerConfiguration:
      customJwtAuthorizer:
        discoveryUrl: https://cognito-idp.us-east-1.amazonaws.com/us-east-1_xxx/.well-known/openid-configuration
        allowedAudience:
          - my-client-id
        allowedClients:
          - my-app-client
    targets:
      - name: SecureAPI
        type: lambda
        functionArn:
          Fn::GetAtt:
            - SecureFunction
            - Arn
```

| Property         | Required | Description                                            |
| ---------------- | -------- | ------------------------------------------------------ |
| `type`           | Yes      | `gateway`                                              |
| `authorizerType` | No       | `NONE`, `AWS_IAM`, or `CUSTOM_JWT` (default: `AWS_IAM`) |
| `authorizerConfiguration.customJwtAuthorizer` | No* | JWT authorizer config (required when `authorizerType: CUSTOM_JWT`) |
| `authorizerConfiguration.customJwtAuthorizer.discoveryUrl` | Yes** | OIDC discovery URL |
| `authorizerConfiguration.customJwtAuthorizer.allowedAudience` | No | Array of allowed audience values |
| `authorizerConfiguration.customJwtAuthorizer.allowedClients` | No | Array of allowed client IDs |
| `protocolType`   | No       | `MCP` (default: `MCP`)                                 |
| `targets`        | No       | Gateway targets (Lambda functions)                     |
| `description`    | No       | Gateway description                                    |
| `roleArn`        | No       | Custom IAM role ARN                                    |

\*Required when `authorizerType` is `CUSTOM_JWT`

\*\*Required when using `customJwtAuthorizer`

## Commands

```bash
sls agentcore info        # Show defined resources
sls agentcore build       # Build Docker images
sls agentcore invoke      # Invoke a deployed agent
sls agentcore logs        # Fetch logs for a runtime
sls package               # Generate CloudFormation
sls deploy                # Deploy to AWS
sls remove                # Remove deployed resources
```

## Examples

The `examples/` directory contains complete working examples:

### Full-Stack Agent (`examples/full-stack-agent/`)

A comprehensive example showing all resource types working together:

- Runtime with Docker artifact
- Memory with multiple strategies
- Browser for web interactions
- CodeInterpreter for code execution
- WorkloadIdentity for OAuth2
- Gateway for external APIs

### Memory Strategies (`examples/memory-strategies/`)

Detailed examples of all memory strategy types:

- Semantic search configuration
- Summarization settings
- User preference tracking
- Custom strategies
- Multi-strategy memory

### Browser & CodeInterpreter (`examples/browser-code-interpreter/`)

Examples of browser and code interpreter configurations:

- Public, VPC, and sandbox network modes
- Session recording
- Request signing
- Custom IAM roles

### Google ADK (`examples/google-adk/`)

Deploy a Google ADK agent to AWS Bedrock AgentCore.

### Strands Framework Examples

The [Strands Agents SDK](https://github.com/strands-agents/sdk-python) is a lightweight, model-driven framework for building AI agents. These examples show how to deploy Strands agents to AgentCore:

#### Strands Basic (`examples/strands-basic/`)

Simple Strands agent with custom tools:

- Custom `@tool` decorated functions
- Basic prompt/response flow
- Minimal setup example

```python
from strands import Agent, tool

@tool
def get_weather(location: str) -> str:
    """Get weather for a location."""
    return f"Weather in {location}: Sunny, 72°F"

agent = Agent(
    model="us.anthropic.claude-3-7-sonnet-20250219-v1:0",
    tools=[get_weather],
)
```

#### Strands Streaming (`examples/strands-streaming/`)

Async agent with streaming responses:

- `stream_async()` for real-time streaming
- Async event iteration
- Suitable for long-form responses

#### Strands Memory (`examples/strands-memory/`)

Agent with AgentCore Memory integration:

- MemoryHook provider for automatic memory ops
- Short-term memory (within session)
- Long-term memory with semantic search
- User preference tracking

#### Strands MCP Tools (`examples/strands-mcp-tools/`)

Agent with Gateway/MCP tool integration:

- MCP protocol for tool discovery
- Gateway targets with Lambda functions
- Dynamic tool registration

#### Strands OAuth Identity (`examples/strands-oauth-identity/`)

Agent with WorkloadIdentity for external API credentials:

- `@requires_api_key` decorator for secure credential retrieval
- OAuth2 flows for external services (OpenAI, GitHub)
- Secure credential storage without hardcoding

#### Strands Cognito JWT (`examples/strands-cognito-jwt/`)

Agent protected by Cognito JWT authentication:

- CustomJWTAuthorizer configuration
- Cognito User Pool and Client setup
- JWT token validation at AgentCore level
- Secure endpoints requiring authentication

## Configuration Options

### Default Tags

Apply tags to all resources:

```yaml
custom:
  agentCore:
    defaultTags:
      Project: MyProject
      Environment: ${self:provider.stage}
```

### VPC Configuration

For resources that support VPC mode:

```yaml
network:
  networkMode: VPC
  vpcConfig:
    subnetIds:
      - subnet-12345678
      - subnet-87654321
    securityGroupIds:
      - sg-12345678
```

### Custom IAM Roles

Bring your own IAM roles:

```yaml
agents:
  myAgent:
    type: runtime
    roleArn: arn:aws:iam::123456789012:role/MyCustomRole
    # ... other config
```

## Migration Guide

### Memory Strategy Format (v0.2.0+)

The memory strategy format has changed to a typed union structure. The legacy format is deprecated but still supported with a warning.

**Legacy format (deprecated):**

```yaml
strategies:
  - type: semantic
    name: Search
    namespaces:
      - /sessions/{sessionId}
```

**New format:**

```yaml
strategies:
  - SemanticMemoryStrategy:
      Name: Search
      Namespaces:
        - /sessions/{sessionId}
```

## License

MIT
