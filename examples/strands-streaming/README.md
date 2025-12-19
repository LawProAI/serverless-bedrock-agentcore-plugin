# Strands Streaming Agent Example

A Strands AI agent with async streaming responses deployed to AWS Bedrock AgentCore.

## Overview

This example demonstrates:

- Creating an async Strands agent with streaming
- Using `stream_async()` for real-time response streaming
- Yielding events as they are generated

## Prerequisites

- AWS account with Bedrock model access (Claude 3.7 Sonnet)
- AWS CLI configured
- Node.js 18+ and npm
- Docker installed and running

## Project Structure

```
strands-streaming/
├── serverless.yml    # Serverless Framework configuration
├── agent.py          # Async Strands agent with streaming
├── Dockerfile        # Container configuration
├── pyproject.toml    # Python dependencies
├── .dockerignore     # Docker ignore patterns
└── README.md         # This file
```

## Custom Tools

| Tool            | Description                                                |
| --------------- | ---------------------------------------------------------- |
| `calculator`    | Performs math operations (add, subtract, multiply, divide) |
| `generate_list` | Generates a numbered list about any topic                  |

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
# Test streaming response
agentcore invoke '{"prompt": "Explain how photosynthesis works step by step"}'

# Test calculator with streaming
agentcore invoke '{"prompt": "Calculate 100 divided by 7, then multiply by 3"}'

# Test list generation
agentcore invoke '{"prompt": "Generate a list of 5 programming best practices"}'
```

## Key Concepts

### Async Streaming with Strands

```python
from strands import Agent

# Disable default callback handler for manual streaming
agent = Agent(
    model="us.anthropic.claude-3-7-sonnet-20250219-v1:0",
    callback_handler=None,
    tools=[...],
)

@app.entrypoint
async def invoke(payload, context):
    prompt = payload.get("prompt")

    # Get async stream
    agent_stream = agent.stream_async(prompt)

    # Yield events as they arrive
    async for event in agent_stream:
        yield event
```

### Event Types

The stream yields various event types:

- **Text chunks**: Partial response text as it's generated
- **Tool calls**: When the agent invokes a tool
- **Tool results**: Results returned from tools
- **Completion**: Final message when generation completes

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

## Cleanup

Remove deployed resources:

```bash
sls remove
```
