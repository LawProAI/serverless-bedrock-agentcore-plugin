"""
Simple AI Agent using Google ADK with AWS Bedrock AgentCore

This is a minimal example demonstrating how to create an agent
that can be deployed to AWS Bedrock AgentCore.
"""

from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from bedrock_agentcore import BedrockAgentCoreApp
import os
import yaml


# Initialize the Bedrock AgentCore app
app = BedrockAgentCoreApp()
app_name = "myAgent"

# Define example tools
def get_current_time() -> str:
    """Get the current date and time."""
    from datetime import datetime
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def calculate(expression: str) -> str:
    """
    Safely evaluate a mathematical expression.

    Args:
        expression: A mathematical expression like "2 + 2" or "10 * 5"

    Returns:
        The result of the calculation
    """
    try:
        # Only allow safe mathematical operations
        allowed_chars = set('0123456789+-*/(). ')
        if not all(c in allowed_chars for c in expression):
            return "Error: Invalid characters in expression"
        result = eval(expression, {"__builtins__": {}}, {})
        return str(result)
    except Exception as e:
        return f"Error: {str(e)}"


# Create the agent
root_agent = LlmAgent(
    name=app_name,
    model=LiteLlm(model="bedrock/us.anthropic.claude-sonnet-4-20250514-v1:0"),
    instruction="""
You are a helpful AI assistant deployed on AWS Bedrock AgentCore.

You have access to the following tools:
- get_current_time: Returns the current date and time
- calculate: Evaluates mathematical expressions

Be concise and helpful in your responses.
""",
    tools=[get_current_time, calculate]
)

# Session service for conversation state
session_service = InMemorySessionService()


async def setup(user_id: str, session_id: str):
    """Set up or retrieve a session for the user."""
    session = None

    try:
        session = await session_service.get_session(
            app_name=app_name,
            user_id=user_id,
            session_id=session_id
        )
    except Exception:
        pass

    if not session:
        session = await session_service.create_session(
            app_name=app_name,
            user_id=user_id,
            session_id=session_id
        )

    runner = Runner(
        agent=root_agent,
        app_name=app_name,
        session_service=session_service
    )
    return runner, session


async def run_agent_streaming(query: str, user_id: str, session_id: str):
    """Run the agent and yield streaming responses."""
    content = types.Content(role='user', parts=[types.Part(text=query)])
    runner, session = await setup(user_id, session_id)

    events = runner.run_async(
        user_id=user_id,
        session_id=session_id,
        new_message=content
    )

    async for event in events:
        if hasattr(event, 'content') and event.content and hasattr(event.content, 'parts'):
            for part in event.content.parts:
                if hasattr(part, 'text') and part.text:
                    yield {"type": "text", "content": part.text}


@app.entrypoint
async def invoke_agent(payload, context):
    """Main entrypoint for the agent - handles incoming requests."""
    prompt = payload.get("prompt", "Hello!")
    user_id = payload.get("user_id", "default_user")
    session_id = context.session_id

    async for event in run_agent_streaming(prompt, user_id, session_id):
        yield event


if __name__ == "__main__":
    app.run()
