# Strands Cognito JWT Example

A Strands AI agent protected by Amazon Cognito JWT authentication using CustomJWTAuthorizer.

## Overview

This example demonstrates:

- Creating a Cognito User Pool and Client with CloudFormation
- Configuring CustomJWTAuthorizer on AgentCore Runtime
- Protecting agent endpoints with JWT token validation
- Accessing authenticated user information

## Prerequisites

- AWS account with Bedrock model access (Claude 3.7 Sonnet)
- AWS CLI configured
- Node.js 18+ and npm
- Docker installed and running

## Project Structure

```
strands-cognito-jwt/
├── serverless.yml    # Runtime + Cognito resources
├── agent.py          # Secure agent with auth-aware tools
├── Dockerfile        # Container configuration
├── pyproject.toml    # Python dependencies
├── .dockerignore     # Docker ignore patterns
└── README.md         # This file
```

## Resources Deployed

| Resource              | Type              | Description                |
| --------------------- | ----------------- | -------------------------- |
| `secureAgent`         | Runtime           | Protected Strands agent    |
| `AgentUserPool`       | Cognito User Pool | User identity store        |
| `AgentUserPoolClient` | Cognito Client    | Application authentication |
| `AgentUserPoolDomain` | Cognito Domain    | Hosted UI for login        |

## How Authentication Works

```
┌─────────────┐     1. Login      ┌─────────────────┐
│   Client    │ ────────────────▶ │  Cognito        │
│             │                   │  User Pool      │
│             │ ◀──────────────── │                 │
│             │    2. JWT Token   │                 │
└──────┬──────┘                   └─────────────────┘
       │
       │ 3. Request + JWT
       ▼
┌─────────────────────────────────────────────────────┐
│                 AgentCore Runtime                    │
│  ┌──────────────────────────────────────────────┐  │
│  │           CustomJWTAuthorizer                 │  │
│  │  - Validates JWT signature                    │  │
│  │  - Checks token expiry                        │  │
│  │  - Verifies allowed clients/audience          │  │
│  └──────────────────────────────────────────────┘  │
│                        │                            │
│                        ▼ (if valid)                 │
│  ┌──────────────────────────────────────────────┐  │
│  │              Strands Agent                    │  │
│  │         (agent.py - your code)                │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## CustomJWTAuthorizer Configuration

```yaml
authorizer:
  customJwtAuthorizer:
    # OIDC discovery URL - AgentCore fetches public keys from here
    discoveryUrl:
      Fn::Sub:
        - https://cognito-idp.${AWS::Region}.amazonaws.com/${UserPoolId}/.well-known/openid-configuration
        - UserPoolId:
            Ref: AgentUserPool
    # Only accept tokens from these client IDs
    allowedClients:
      - Ref: AgentUserPoolClient
    # Only accept tokens with this audience claim
    allowedAudience:
      - Ref: AgentUserPoolClient
```

## Deployment

```bash
# Install dependencies
npm install

# Deploy to AWS
sls deploy
```

Note the outputs:

- `UserPoolId` - For user management
- `UserPoolClientId` - For authentication
- `CognitoDomain` - For hosted UI login
- `OIDCDiscoveryUrl` - OIDC configuration endpoint

## Creating Test Users

```bash
# Get the User Pool ID from deployment outputs
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name strands-cognito-jwt-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text)

# Create a test user
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username test@example.com \
  --user-attributes Name=email,Value=test@example.com \
  --temporary-password TempPass123!

# Set permanent password (admin)
aws cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username test@example.com \
  --password SecurePass123! \
  --permanent
```

## Getting a JWT Token

```bash
# Get Client ID
CLIENT_ID=$(aws cloudformation describe-stacks \
  --stack-name strands-cognito-jwt-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' \
  --output text)

# Authenticate and get tokens
aws cognito-idp initiate-auth \
  --client-id $CLIENT_ID \
  --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=test@example.com,PASSWORD=SecurePass123!

# The response includes:
# - IdToken (JWT for identity)
# - AccessToken (JWT for API access)
# - RefreshToken (for getting new tokens)
```

## Testing the Agent

```bash
# Get the JWT token (IdToken from previous step)
JWT_TOKEN="eyJraWQ..."

# Invoke the agent with the JWT token
curl -X POST https://your-agent-endpoint/invoke \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What user am I logged in as?"}'
```

## Security Best Practices

1. **Token Expiry**: Cognito tokens expire after 1 hour by default
2. **HTTPS Only**: Always use HTTPS for token transmission
3. **Audience Validation**: Restrict `allowedAudience` to your specific client
4. **Client Restriction**: Use `allowedClients` to limit which apps can access
5. **Refresh Tokens**: Implement token refresh for long sessions

## Customizing Authentication

### Adding More OAuth Scopes

```yaml
AllowedOAuthScopes:
  - email
  - openid
  - profile
  - custom:admin # Custom scope
```

### Using External Identity Providers

```yaml
SupportedIdentityProviders:
  - COGNITO
  - Google
  - Facebook
```

### Custom Domain

```yaml
AgentUserPoolDomain:
  Type: AWS::Cognito::UserPoolDomain
  Properties:
    Domain: auth.yourdomain.com
    CustomDomainConfig:
      CertificateArn: arn:aws:acm:...
```

## Cleanup

```bash
sls remove
```

This removes the Runtime, Cognito User Pool, Client, and Domain.
