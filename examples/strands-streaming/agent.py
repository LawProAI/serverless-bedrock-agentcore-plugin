"""
Strands AI Agent with Async Streaming for AWS Bedrock AgentCore.

This example demonstrates how to create a Strands agent that streams
responses back to the client using async iteration.
"""

import os
from bedrock_agentcore.runtime import BedrockAgentCoreApp
from strands import Agent, tool

# Bypass tool consent for automated execution
os.environ["BYPASS_TOOL_CONSENT"] = "true"

# Initialize the Bedrock AgentCore app
app = BedrockAgentCoreApp()


@tool
def calculator(operation: str, a: float, b: float) -> str:
    """
    Perform a mathematical calculation.

    Args:
        operation: The operation to perform (add, subtract, multiply, divide)
        a: First number
        b: Second number

    Returns:
        The result of the calculation
    """
    operations = {
        "add": lambda x, y: x + y,
        "subtract": lambda x, y: x - y,
        "multiply": lambda x, y: x * y,
        "divide": lambda x, y: x / y if y != 0 else "Error: Division by zero",
    }

    if operation not in operations:
        return f"Error: Unknown operation '{operation}'. Use: add, subtract, multiply, divide"

    result = operations[operation](a, b)
    return f"{a} {operation} {b} = {result}"


@tool
def generate_list(topic: str, count: int = 5) -> str:
    """
    Generate a numbered list about a topic (mock implementation).

    Args:
        topic: The topic to generate a list about
        count: Number of items to generate (default: 5)

    Returns:
        A numbered list of items
    """
    # Mock implementation - in production, could use another API
    items = [f"{i+1}. Item about {topic} #{i+1}" for i in range(count)]
    return "\n".join(items)


# Create the Strands agent with streaming disabled callback handler
# Setting callback_handler=None allows us to handle streaming manually
agent = Agent(
    model="us.anthropic.claude-3-7-sonnet-20250219-v1:0",
    system_prompt="""You are a helpful AI assistant with streaming capabilities.

You have access to the following tools:
- calculator: Performs mathematical operations (add, subtract, multiply, divide)
- generate_list: Generates a numbered list about any topic

Provide detailed, helpful responses. When asked to explain something,
break it down step by step.""",
    tools=[calculator, generate_list],
    callback_handler=None,  # Disable default handler for manual streaming
)


@app.entrypoint
async def invoke(payload, context):
    """
    Async entrypoint for the agent with streaming support.

    Args:
        payload: The request payload containing the prompt
        context: Runtime context with session info

    Yields:
        Streaming events as the agent generates its response
    """
    prompt = payload.get("prompt", "Hello!")

    print(f"Processing prompt: {prompt}")
    print(f"Context: {context}")

    # Get the agent stream using stream_async
    agent_stream = agent.stream_async(prompt)

    # Yield events as they come in
    async for event in agent_stream:
        # Events can be different types (text chunks, tool calls, etc.)
        yield event


if __name__ == "__main__":
    app.run()
