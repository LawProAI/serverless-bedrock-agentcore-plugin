# serverless-bedrock-agentcore

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
npm install serverless-bedrock-agentcore --save-dev
```

Add to `serverless.yml`:

```yaml
plugins:
  - serverless-bedrock-agentcore
```

## Quick Start

```yaml
service: my-agent

provider:
  name: aws
  region: us-east-1

plugins:
  - serverless-bedrock-agentcore

agents:
  myAgent:
    type: runtime
    description: My AI agent
    handler:
      type: docker
      image:
        dockerfile: ./Dockerfile
        context: .
    protocol: AWS_MCP
    networkMode: PUBLIC
    authorizationConfig:
      authorizationType: NONE
```

## Resource Types

### Runtime

Deploy containerized AI agents with the AgentCore Runtime.

```yaml
agents:
  myAgent:
    type: runtime
    description: My AI agent
    handler:
      type: docker
      image:
        dockerfile: ./Dockerfile
        context: .
    protocol: AWS_MCP # AWS_MCP, HTTP, or A2A
    networkMode: PUBLIC # PUBLIC or VPC
    authorizationConfig:
      authorizationType: NONE # NONE or AWS_IAM
    # Optional: Pass specific headers to the runtime
    requestHeaders:
      allowlist:
        - X-User-Id
        - X-Session-Id
        - Authorization
```

| Property                                | Required | Description                         |
| --------------------------------------- | -------- | ----------------------------------- |
| `type`                                  | Yes      | `runtime`                           |
| `handler.type`                          | Yes      | `docker`                            |
| `handler.image.dockerfile`              | Yes      | Path to Dockerfile                  |
| `handler.image.context`                 | Yes      | Docker build context                |
| `protocol`                              | No       | `AWS_MCP`, `HTTP`, or `A2A`         |
| `networkMode`                           | No       | `PUBLIC` or `VPC`                   |
| `authorizationConfig.authorizationType` | No       | `NONE` or `AWS_IAM`                 |
| `requestHeaders.allowlist`              | No       | Headers to pass to runtime (max 20) |
| `description`                           | No       | Runtime description                 |
| `roleArn`                               | No       | Custom IAM role ARN                 |

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
          Type: SEMANTIC
          Namespaces:
            - /conversations/{sessionId}
          SemanticMemoryConfiguration:
            ModelId: amazon.titan-embed-text-v2:0
            SimilarityThreshold: 0.75

      # Summarization strategy
      - SummaryMemoryStrategy:
          Name: SessionSummary
          Type: SUMMARIZATION
          SummaryConfiguration:
            SummaryModelId: anthropic.claude-3-haiku-20240307-v1:0
            MaxMessages: 100

      # User preference strategy
      - UserPreferenceMemoryStrategy:
          Name: UserPrefs
          Type: USER_PREFERENCE
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
    Type: SEMANTIC
    Namespaces:
      - /sessions/{sessionId}
    SemanticMemoryConfiguration:
      ModelId: amazon.titan-embed-text-v2:0
      SimilarityThreshold: 0.75
```

**SummaryMemoryStrategy** - Summarize long conversations:

```yaml
- SummaryMemoryStrategy:
    Name: Summary
    Type: SUMMARIZATION
    SummaryConfiguration:
      SummaryModelId: anthropic.claude-3-haiku-20240307-v1:0
      MaxMessages: 100
```

**UserPreferenceMemoryStrategy** - Track user preferences:

```yaml
- UserPreferenceMemoryStrategy:
    Name: Preferences
    Type: USER_PREFERENCE
    Namespaces:
      - /users/{userId}
```

**CustomMemoryStrategy** - Custom memory handling:

```yaml
- CustomMemoryStrategy:
    Name: Custom
    Type: CUSTOM
    CustomConfiguration:
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
  apiGateway:
    type: gateway
    description: External API gateway
    authorizationType: NONE
    targets:
      weatherApi:
        type: lambdaArn
        lambdaArn:
          Fn::GetAtt:
            - WeatherFunction
            - Arn
        name: WeatherAPI
        description: Get weather data
```

| Property            | Required | Description                        |
| ------------------- | -------- | ---------------------------------- |
| `type`              | Yes      | `gateway`                          |
| `authorizationType` | No       | `NONE` or `AWS_IAM`                |
| `targets`           | No       | Gateway targets (Lambda functions) |
| `description`       | No       | Gateway description                |
| `roleArn`           | No       | Custom IAM role ARN                |

## Commands

```bash
sls agentcore info        # Show defined resources
sls package               # Generate CloudFormation
sls deploy                # Deploy to AWS
sls remove                # Remove deployed resources
```

## Examples

The `examples/` directory contains complete working examples:

### Full-Stack Agent (`examples/full-stack-agent/`)

A comprehensive example showing all resource types working together:

- Runtime with Docker handler
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
    configuration:
      modelId: amazon.titan-embed-text-v2:0
```

**New format:**

```yaml
strategies:
  - SemanticMemoryStrategy:
      Name: Search
      Type: SEMANTIC
      SemanticMemoryConfiguration:
        ModelId: amazon.titan-embed-text-v2:0
```

## License

MIT
