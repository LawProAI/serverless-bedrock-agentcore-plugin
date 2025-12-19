# Strands OAuth Identity Example

A Strands AI agent with AgentCore WorkloadIdentity for secure OAuth2 credential management.

## Overview

This example demonstrates:

- Using WorkloadIdentity for OAuth2 credential storage
- The `@requires_api_key` decorator for secure credential retrieval
- Calling external APIs (OpenAI, GitHub) with stored credentials
- Secure credential flow without hardcoding API keys

## Prerequisites

- AWS account with Bedrock model access (Claude 3.7 Sonnet)
- AWS CLI configured
- Node.js 18+ and npm
- Docker installed and running
- External API accounts (OpenAI, GitHub) for testing

## Project Structure

```
strands-oauth-identity/
├── serverless.yml    # Runtime + WorkloadIdentity + Gateway
├── agent.py          # Agent with OAuth credential handling
├── Dockerfile        # Container configuration
├── pyproject.toml    # Python dependencies
├── .dockerignore     # Docker ignore patterns
└── README.md         # This file
```

## Resources Deployed

| Resource             | Type             | Description                  |
| -------------------- | ---------------- | ---------------------------- |
| `oauthAgent`         | Runtime          | The Strands agent            |
| `agentIdentity`      | WorkloadIdentity | OAuth2 credential management |
| `externalApiGateway` | Gateway          | External API integrations    |

## How It Works

### 1. WorkloadIdentity Setup

The WorkloadIdentity resource enables OAuth2 flows:

```yaml
agents:
  agentIdentity:
    type: workloadIdentity
    oauth2ReturnUrls:
      - https://example.com/oauth/callback
      - http://localhost:3000/oauth/callback
```

### 2. Credential Retrieval

Use the `@requires_api_key` decorator to securely retrieve credentials:

```python
from bedrock_agentcore.identity.auth import requires_api_key

@requires_api_key(provider_name="openai-credential-provider")
async def get_credentials(*, api_key: str):
    os.environ["OPENAI_API_KEY"] = api_key
```

### 3. Using Credentials

The agent can then use the credentials to call external APIs:

```python
@tool
def call_openai(prompt: str) -> str:
    api_key = os.environ.get("OPENAI_API_KEY")
    # Make API call...
```

## Setting Up Credential Providers

After deployment, you need to configure credential providers in AgentCore:

### OpenAI

```bash
# Using AgentCore CLI
agentcore identity create-provider \
  --name openai-credential-provider \
  --type api-key \
  --workload-identity-id <your-workload-identity-id>
```

### GitHub (OAuth2)

```bash
agentcore identity create-provider \
  --name github-credential-provider \
  --type oauth2 \
  --client-id <github-oauth-app-client-id> \
  --client-secret <github-oauth-app-client-secret> \
  --authorization-url https://github.com/login/oauth/authorize \
  --token-url https://github.com/login/oauth/access_token \
  --workload-identity-id <your-workload-identity-id>
```

## Deployment

```bash
# Install dependencies
npm install

# Deploy to AWS
sls deploy
```

## Testing

```bash
# Check credential status
agentcore invoke '{"prompt": "What credentials are configured?"}'

# Initialize and use credentials
agentcore invoke '{
  "prompt": "Search GitHub for serverless frameworks",
  "initialize_credentials": true
}'

# Call OpenAI
agentcore invoke '{"prompt": "Use OpenAI to explain quantum computing"}'
```

## Security Best Practices

1. **Never hardcode credentials** - Always use WorkloadIdentity
2. **Limit OAuth scopes** - Request only necessary permissions
3. **Rotate credentials** - Set up credential rotation policies
4. **Audit access** - Monitor credential usage in CloudWatch

## Key Concepts

### The @requires_api_key Decorator

```python
@requires_api_key(
    provider_name="my-provider",  # Credential provider name
    # Optional parameters:
    # scopes=["read", "write"],   # OAuth2 scopes
    # refresh=True,               # Auto-refresh tokens
)
async def get_credentials(*, api_key: str):
    # api_key is injected by the decorator
    pass
```

### OAuth2 Flow

1. Agent requests credential from WorkloadIdentity
2. If token exists and is valid, it's returned
3. If token is expired, it's automatically refreshed
4. If no token exists, OAuth2 flow is triggered
5. User completes OAuth2 authorization
6. Token is stored securely in WorkloadIdentity

## Local Development

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install strands-agents bedrock-agentcore openai

# For local testing, set credentials manually
export OPENAI_API_KEY=your-key
export GITHUB_TOKEN=your-token

# Run locally
python agent.py
```

## Cleanup

```bash
sls remove
```
