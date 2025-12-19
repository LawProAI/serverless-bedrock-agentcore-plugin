"""
Strands AI Agent with Cognito JWT Authentication.

This example demonstrates how to create a Strands agent that is
protected by Cognito JWT tokens. All requests must include a valid
JWT token from the configured Cognito User Pool.
"""

import os
from bedrock_agentcore.runtime import BedrockAgentCoreApp
from strands import Agent, tool

# Bypass tool consent for automated execution
os.environ["BYPASS_TOOL_CONSENT"] = "true"

# Initialize the Bedrock AgentCore app
app = BedrockAgentCoreApp()


@tool
def get_user_info(context_claims: str = "") -> str:
    """
    Get information about the authenticated user from JWT claims.

    Note: In production, the JWT claims would be passed through
    request headers by AgentCore after validation.

    Args:
        context_claims: JSON string of JWT claims (passed by AgentCore)

    Returns:
        User information from the JWT
    """
    import json

    if context_claims:
        try:
            claims = json.loads(context_claims)
            return f"""
User Information:
- Email: {claims.get('email', 'N/A')}
- Sub (User ID): {claims.get('sub', 'N/A')}
- Token Issuer: {claims.get('iss', 'N/A')}
- Token Expires: {claims.get('exp', 'N/A')}
"""
        except json.JSONDecodeError:
            return "Error: Invalid claims format"

    return "No user claims available. Ensure request includes valid JWT token."


@tool
def secure_operation(operation: str) -> str:
    """
    Perform a secure operation that requires authentication.

    This is a demonstration of operations that are only available
    to authenticated users.

    Args:
        operation: The operation to perform

    Returns:
        Result of the operation
    """
    # In a real application, you would:
    # 1. Verify the user has permission for this operation
    # 2. Perform the actual secure operation
    # 3. Log the access for audit purposes

    return f"Secure operation '{operation}' completed successfully. User is authenticated."


@tool
def get_protected_data(data_type: str) -> str:
    """
    Retrieve protected data that requires authentication.

    Args:
        data_type: Type of data to retrieve (user_profile, settings, preferences)

    Returns:
        The requested protected data
    """
    mock_data = {
        "user_profile": {
            "name": "Authenticated User",
            "role": "agent_user",
            "permissions": ["read", "write", "execute"],
        },
        "settings": {
            "theme": "dark",
            "notifications": True,
            "language": "en",
        },
        "preferences": {
            "model": "claude-3-sonnet",
            "temperature": 0.7,
            "max_tokens": 1000,
        },
    }

    if data_type in mock_data:
        import json
        return json.dumps(mock_data[data_type], indent=2)

    return f"Unknown data type: {data_type}. Available: user_profile, settings, preferences"


# Create the Strands agent
agent = Agent(
    model="us.anthropic.claude-3-7-sonnet-20250219-v1:0",
    system_prompt="""You are a secure AI assistant protected by Cognito JWT authentication.

All requests to you are authenticated - users must have a valid JWT token
from the configured Cognito User Pool to interact with you.

Available tools:
- get_user_info: Get information about the authenticated user
- secure_operation: Perform secure operations
- get_protected_data: Retrieve protected user data

Always acknowledge that the user is authenticated when responding.
Be helpful while maintaining security awareness.""",
    tools=[get_user_info, secure_operation, get_protected_data],
)


@app.entrypoint
def invoke(payload, context):
    """
    Main entrypoint for the agent with JWT authentication.

    The CustomJWTAuthorizer validates the JWT token before this
    handler is invoked. Invalid tokens are rejected at the
    AgentCore level and never reach this code.

    Args:
        payload: The request payload containing the prompt
        context: Runtime context (includes validated JWT claims)

    Returns:
        The agent's response
    """
    prompt = payload.get("prompt", "Hello!")

    # In production, JWT claims may be available in context
    # This depends on AgentCore's implementation
    jwt_claims = payload.get("jwt_claims", "{}")

    print(f"Processing authenticated request")
    print(f"Session ID: {getattr(context, 'session_id', 'N/A')}")

    # Add JWT claims context to the prompt if available
    enhanced_prompt = prompt
    if jwt_claims and jwt_claims != "{}":
        enhanced_prompt = f"[User JWT Claims: {jwt_claims}]\n\n{prompt}"

    # Invoke the agent
    result = agent(enhanced_prompt)

    # Extract response text
    response_text = result.message
    if isinstance(response_text, dict) and "content" in response_text:
        content = response_text["content"]
        if isinstance(content, list) and len(content) > 0:
            response_text = content[0].get("text", str(content))

    return {"result": response_text}


if __name__ == "__main__":
    app.run()
