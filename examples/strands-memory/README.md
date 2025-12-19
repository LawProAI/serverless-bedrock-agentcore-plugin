# Strands Memory Agent Example

A Strands AI agent with AgentCore Memory integration for conversation persistence.

## Overview

This example demonstrates:

- Integrating Strands with AgentCore Memory
- Using hook providers for automatic memory operations
- Short-term memory (within session)
- Long-term memory with semantic search and user preferences

## Prerequisites

- AWS account with Bedrock model access (Claude 3.7 Sonnet)
- AWS CLI configured
- Node.js 18+ and npm
- Docker installed and running

## Project Structure

```
strands-memory/
├── serverless.yml    # Runtime + Memory resources
├── agent.py          # Strands agent with memory hooks
├── Dockerfile        # Container configuration
├── pyproject.toml    # Python dependencies
├── .dockerignore     # Docker ignore patterns
└── README.md         # This file
```

## Resources Deployed

| Resource          | Type    | Description                         |
| ----------------- | ------- | ----------------------------------- |
| `memoryAgent`     | Runtime | The Strands agent                   |
| `shortTermMemory` | Memory  | 7-day conversation storage          |
| `longTermMemory`  | Memory  | 90-day storage with semantic search |

## Memory Strategies

### Short-Term Memory

- Stores raw conversation turns
- 7-day retention
- Fast retrieval for recent context

### Long-Term Memory

- **SemanticMemoryStrategy**: Semantic search over past conversations
- **UserPreferenceMemoryStrategy**: Automatic extraction of user preferences
- 90-day retention

## Deployment

```bash
# Install dependencies
npm install

# Deploy to AWS
sls deploy

# Note the Memory IDs from the deployment output
```

After deployment, set the `MEMORY_ID` environment variable when invoking:

```bash
# Get the Memory ID from CloudFormation outputs
export MEMORY_ID=$(aws cloudformation describe-stacks \
  --stack-name strands-memory-agent-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`LongTermMemoryId`].OutputValue' \
  --output text)
```

## Testing

```bash
# First interaction - introduce yourself
agentcore invoke '{"prompt": "Hi, my name is Alice and I prefer Python"}'

# Second interaction - test memory
agentcore invoke '{"prompt": "What is my name and preferred language?"}'

# Test across sessions (with same user_id)
agentcore invoke '{"prompt": "Do you remember my preferences?", "user_id": "alice"}'
```

## Key Concepts

### Memory Hook Provider

```python
from strands.hooks import HookProvider, AgentInitializedEvent, MessageAddedEvent

class MemoryHook(HookProvider):
    def on_agent_initialized(self, event):
        """Load conversation history when agent starts."""
        turns = memory_client.get_last_k_turns(
            memory_id=MEMORY_ID,
            actor_id=user_id,
            session_id=session_id,
            k=5
        )
        # Add to agent's context...

    def on_message_added(self, event):
        """Save each message to memory."""
        memory_client.create_event(
            memory_id=MEMORY_ID,
            actor_id=user_id,
            session_id=session_id,
            messages=[(content, role)]
        )

    def register_hooks(self, registry):
        registry.add_callback(AgentInitializedEvent, self.on_agent_initialized)
        registry.add_callback(MessageAddedEvent, self.on_message_added)
```

### Using Hooks with Agent

```python
agent = Agent(
    model="us.anthropic.claude-3-7-sonnet-20250219-v1:0",
    hooks=[MemoryHook()],
    state={"session_id": "default", "user_id": "default_user"}
)
```

## Memory Types Explained

### Short-Term Memory (STM)

- Stores exact conversation messages
- Within-session recall only
- Instant retrieval
- Use case: Conversation continuity

### Long-Term Memory (LTM)

- Extracts preferences and facts automatically
- Cross-session recall
- Semantic search capabilities
- Use case: Personalization, knowledge retention

## Local Development

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install strands-agents bedrock-agentcore

# Set memory ID for testing
export MEMORY_ID=your-memory-id

# Run locally
python agent.py
```

## Cleanup

```bash
sls remove
```

This will remove the Runtime and Memory resources.
