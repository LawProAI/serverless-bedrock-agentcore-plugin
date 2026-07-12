# MCP Server Target Example

An AgentCore Gateway that fronts an existing MCP-speaking HTTP server,
forwarding a custom auth header through to it.

## Overview

This example demonstrates:

- A Gateway target of type `mcpserver`, pointing at an existing MCP server
  endpoint instead of a Lambda function, OpenAPI spec, or Smithy model
- `metadataConfiguration.allowedRequestHeaders` to forward a custom header
  (e.g. an internal auth token) from the Gateway caller through to the
  upstream MCP server

## Prerequisites

- AWS account with Bedrock AgentCore access
- AWS CLI configured
- Node.js 18+ and npm
- An existing MCP server reachable over HTTPS from the Gateway

## Project Structure

```
mcp-server-target/
├── serverless.yml    # Gateway + mcpserver target
└── README.md         # This file
```

## Resources Deployed

| Resource      | Type    | Description                             |
| ------------- | ------- | --------------------------------------- |
| `toolGateway` | Gateway | Gateway fronting an existing MCP server |

## How It Works

### 1. Gateway with an `mcpserver` target

Instead of wrapping a Lambda function, OpenAPI spec, or Smithy model, an
`mcpserver` target simply points the Gateway at an existing MCP server's
endpoint:

```yaml
agents:
  toolGateway:
    type: gateway
    description: Gateway fronting an existing MCP server
    authorizerType: AWS_IAM
    targets:
      - name: internal-mcp-server
        type: mcpserver
        description: Existing MCP server for internal tooling
        endpoint: https://internal-tools.example.com/mcp/
```

### 2. Header forwarding with `metadataConfiguration`

`metadataConfiguration` controls which request headers, response headers,
and query parameters are allowed to pass through the Gateway to the
upstream target:

```yaml
metadataConfiguration:
  allowedRequestHeaders:
    - X-Internal-Auth
```

This lets the upstream MCP server receive headers (such as an internal auth
token) that the Gateway caller sends, without the Gateway needing to know
anything about their meaning.

## Deployment

```bash
# Install dependencies
npm install

# Deploy to AWS
sls deploy
```

## Cleanup

```bash
sls remove
```
