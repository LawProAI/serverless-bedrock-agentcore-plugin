"""
Strands AI Agent with AgentCore Memory Integration.

This example demonstrates how to create a Strands agent that integrates
with AWS Bedrock AgentCore Memory for conversation persistence and
long-term knowledge retention.
"""

import os
from bedrock_agentcore.runtime import BedrockAgentCoreApp
from bedrock_agentcore.memory import MemoryClient
from strands import Agent, tool
from strands.hooks import (
    AgentInitializedEvent,
    HookProvider,
    HookRegistry,
    MessageAddedEvent,
)

# Bypass tool consent for automated execution
os.environ["BYPASS_TOOL_CONSENT"] = "true"

# Initialize the Bedrock AgentCore app
app = BedrockAgentCoreApp()

# Connect to AgentCore Memory service
# MEMORY_ID should be set to the deployed Memory resource ID
MEMORY_ID = os.getenv("MEMORY_ID")
MEMORY_REGION = os.getenv("AWS_REGION", "us-east-1")

memory_client = None
if MEMORY_ID:
    memory_client = MemoryClient(region_name=MEMORY_REGION)
    print(f"Memory client initialized with ID: {MEMORY_ID}")


class MemoryHook(HookProvider):
    """
    Hook provider that automatically handles memory operations:
    - Loads previous conversation history when agent initializes
    - Saves each message after it's processed
    """

    def on_agent_initialized(self, event: AgentInitializedEvent):
        """
        Called when the agent starts - loads conversation history from memory.
        """
        if not memory_client or not MEMORY_ID:
            return

        try:
            session_id = event.agent.state.get("session_id", "default")
            user_id = event.agent.state.get("user_id", "default_user")

            # Get last k conversation turns from memory
            turns = memory_client.get_last_k_turns(
                memory_id=MEMORY_ID,
                actor_id=user_id,
                session_id=session_id,
                k=5,  # Number of previous exchanges to load
            )

            if turns:
                # Format conversation history and add to system prompt
                history_lines = []
                for turn in turns:
                    for msg in turn:
                        role = msg.get("role", "unknown")
                        content = msg.get("content", {})
                        text = content.get("text", "") if isinstance(content, dict) else str(content)
                        if text:
                            history_lines.append(f"{role}: {text}")

                if history_lines:
                    context = "\n".join(history_lines)
                    event.agent.system_prompt += f"\n\nPrevious conversation:\n{context}"
                    print(f"Loaded {len(history_lines)} messages from memory")

        except Exception as e:
            print(f"Error loading memory: {e}")

    def on_message_added(self, event: MessageAddedEvent):
        """
        Called after each message - saves it to memory.
        """
        if not memory_client or not MEMORY_ID:
            return

        try:
            session_id = event.agent.state.get("session_id", "default")
            user_id = event.agent.state.get("user_id", "default_user")

            # Get the latest message
            if event.agent.messages:
                msg = event.agent.messages[-1]
                content = msg.get("content", "")
                role = msg.get("role", "assistant")

                # Convert content to string if needed
                if isinstance(content, list):
                    text_parts = []
                    for part in content:
                        if isinstance(part, dict) and "text" in part:
                            text_parts.append(part["text"])
                        else:
                            text_parts.append(str(part))
                    content = " ".join(text_parts)
                elif isinstance(content, dict):
                    content = content.get("text", str(content))

                # Save to memory
                memory_client.create_event(
                    memory_id=MEMORY_ID,
                    actor_id=user_id,
                    session_id=session_id,
                    messages=[(str(content), role)],
                )
                print(f"Saved message to memory: {role}")

        except Exception as e:
            print(f"Error saving to memory: {e}")

    def register_hooks(self, registry: HookRegistry):
        """Register the memory hooks with the agent."""
        registry.add_callback(AgentInitializedEvent, self.on_agent_initialized)
        registry.add_callback(MessageAddedEvent, self.on_message_added)


@tool
def remember_preference(key: str, value: str) -> str:
    """
    Explicitly store a user preference.

    Args:
        key: The preference key (e.g., "favorite_color", "communication_style")
        value: The preference value

    Returns:
        Confirmation message
    """
    # This is handled by the UserPreferenceMemoryStrategy automatically,
    # but this tool allows explicit preference storage
    return f"I'll remember that your {key} is {value}."


@tool
def get_current_context() -> str:
    """
    Get information about the current conversation context.

    Returns:
        Context information including session and user IDs
    """
    return f"Memory ID: {MEMORY_ID or 'Not configured'}"


# Create the Strands agent (memory hooks disabled for now until MEMORY_ID is configured)
# To enable memory, set MEMORY_ID environment variable to the deployed Memory resource ID
hooks = []  # [MemoryHook()] if MEMORY_ID else []

agent = Agent(
    model="us.anthropic.claude-3-7-sonnet-20250219-v1:0",
    system_prompt="""You are a helpful AI assistant with memory capabilities.

You can remember conversations within and across sessions. Key features:
- I remember our previous conversations in this session
- I can learn and remember your preferences over time
- I provide personalized responses based on what I know about you

You have access to these tools:
- remember_preference: Explicitly store a user preference
- get_current_context: Get information about the current context

Be friendly and reference past conversations when relevant.""",
    tools=[remember_preference, get_current_context],
    hooks=hooks,
    state={"session_id": "default", "user_id": "default_user"},
)


@app.entrypoint
def invoke(payload, context):
    """
    Main entrypoint for the agent with memory integration.

    Args:
        payload: The request payload containing the prompt
        context: Runtime context with session info

    Returns:
        The agent's response
    """
    prompt = payload.get("prompt", "Hello!")
    user_id = payload.get("user_id", "default_user")

    # Update agent state with session and user info
    if hasattr(context, "session_id"):
        agent.state["session_id"] = context.session_id
    agent.state["user_id"] = user_id

    print(f"Processing prompt for user: {user_id}")
    print(f"Session ID: {agent.state.get('session_id')}")

    # Invoke the agent
    result = agent(prompt)

    # Extract response text
    response_text = result.message
    if isinstance(response_text, dict) and "content" in response_text:
        content = response_text["content"]
        if isinstance(content, list) and len(content) > 0:
            response_text = content[0].get("text", str(content))

    return {"result": response_text}


if __name__ == "__main__":
    app.run()
