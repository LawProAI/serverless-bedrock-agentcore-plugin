# Strands Basic Agent Example

A simple Strands AI agent with custom tools deployed to AWS Bedrock AgentCore.

## Overview

This example demonstrates:

- Creating a Strands agent with minimal code
- Defining custom tools using the `@tool` decorator
- Deploying to AgentCore Runtime with Serverless Framework

## Prerequisites

- AWS account with Bedrock model access (Claude 3.7 Sonnet)
- AWS CLI configured
- Node.js 18+ and npm
- Docker installed and running

## Project Structure

```
strands-basic/
├── serverless.yml    # Serverless Framework configuration
├── agent.py          # Strands agent with custom tools
├── Dockerfile        # Container configuration
├── pyproject.toml    # Python dependencies
├── .dockerignore     # Docker ignore patterns
└── README.md         # This file
```

## Custom Tools

The agent includes three custom tools:

| Tool               | Description                               |
| ------------------ | ----------------------------------------- |
| `get_current_time` | Returns the current date and time         |
| `calculate`        | Safely evaluates mathematical expressions |
| `get_weather`      | Gets mock weather data for a location     |

## Deployment

```bash
# Install dependencies
npm install

# Deploy to AWS
sls deploy

# Or deploy to a specific stage
sls deploy --stage prod
```

## Testing

After deployment, invoke the agent:

```bash
# Using AgentCore CLI
agentcore invoke '{"prompt": "What time is it?"}'

# Test calculator
agentcore invoke '{"prompt": "Calculate 25 * 17"}'

# Test weather
agentcore invoke '{"prompt": "What is the weather in Seattle?"}'
```

## Local Development

Test locally before deploying:

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install strands-agents bedrock-agentcore

# Run locally
python agent.py
```

## Key Concepts

### Strands Agent Creation

```python
from strands import Agent, tool

@tool
def my_tool(arg: str) -> str:
    """Tool description."""
    return f"Result: {arg}"

agent = Agent(
    model="us.anthropic.claude-3-7-sonnet-20250219-v1:0",
    system_prompt="You are a helpful assistant.",
    tools=[my_tool],
)
```

### AgentCore Integration

```python
from bedrock_agentcore.runtime import BedrockAgentCoreApp

app = BedrockAgentCoreApp()

@app.entrypoint
def invoke(payload, context):
    result = agent(payload.get("prompt"))
    return {"result": result.message}

app.run()
```

## Cleanup

Remove deployed resources:

```bash
sls remove
```
