"""
Strands AI Agent with OAuth2 Identity for External APIs.

This example demonstrates how to create a Strands agent that uses
AgentCore WorkloadIdentity for secure OAuth2 credential management
to access external APIs like OpenAI, GitHub, etc.
"""

import os
from bedrock_agentcore.runtime import BedrockAgentCoreApp
from bedrock_agentcore.identity.auth import requires_api_key
from strands import Agent, tool

# Bypass tool consent for automated execution
os.environ["BYPASS_TOOL_CONSENT"] = "true"

# Initialize the Bedrock AgentCore app
app = BedrockAgentCoreApp()

# Global variable for the agent (initialized after credentials)
agent = None


@requires_api_key(
    provider_name="openai-credential-provider"  # Configure this in WorkloadIdentity
)
async def get_openai_credentials(*, api_key: str):
    """
    Retrieve OpenAI API key from AgentCore Identity.
    The @requires_api_key decorator handles OAuth2 flow automatically.
    """
    print("Retrieved API key from AgentCore Identity")
    os.environ["OPENAI_API_KEY"] = api_key
    return api_key


@requires_api_key(
    provider_name="github-credential-provider"
)
async def get_github_credentials(*, api_key: str):
    """
    Retrieve GitHub token from AgentCore Identity.
    """
    print("Retrieved GitHub token from AgentCore Identity")
    os.environ["GITHUB_TOKEN"] = api_key
    return api_key


@tool
def check_credentials_status() -> str:
    """
    Check the status of configured credentials.

    Returns:
        Status of available credentials
    """
    credentials = []

    if os.environ.get("OPENAI_API_KEY"):
        credentials.append("OpenAI: Configured")
    else:
        credentials.append("OpenAI: Not configured")

    if os.environ.get("GITHUB_TOKEN"):
        credentials.append("GitHub: Configured")
    else:
        credentials.append("GitHub: Not configured")

    return "\n".join(credentials)


@tool
def call_external_api(service: str, prompt: str) -> str:
    """
    Call an external API using stored credentials.

    Args:
        service: The service to call (openai, github)
        prompt: The prompt or query to send

    Returns:
        Response from the external API
    """
    if service.lower() == "openai":
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            return "Error: OpenAI credentials not configured. Please set up the credential provider."

        try:
            # Example OpenAI API call (requires openai package)
            import openai
            client = openai.OpenAI(api_key=api_key)
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=500
            )
            return response.choices[0].message.content
        except ImportError:
            return "OpenAI package not installed. This is a demo - in production, install the openai package."
        except Exception as e:
            return f"OpenAI API error: {str(e)}"

    elif service.lower() == "github":
        token = os.environ.get("GITHUB_TOKEN")
        if not token:
            return "Error: GitHub credentials not configured. Please set up the credential provider."

        try:
            import urllib.request
            import json

            # Example: Search GitHub repositories
            url = f"https://api.github.com/search/repositories?q={prompt}&per_page=5"
            req = urllib.request.Request(url)
            req.add_header("Authorization", f"token {token}")
            req.add_header("Accept", "application/vnd.github.v3+json")
            req.add_header("User-Agent", "Strands-Agent")

            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode())
                repos = [f"- {item['full_name']}: {item['description'] or 'No description'}"
                         for item in data.get('items', [])[:5]]
                return f"Top GitHub repos for '{prompt}':\n" + "\n".join(repos)
        except Exception as e:
            return f"GitHub API error: {str(e)}"

    else:
        return f"Unknown service: {service}. Supported: openai, github"


def create_agent():
    """Create the Strands agent with OAuth tools."""
    return Agent(
        model="us.anthropic.claude-3-7-sonnet-20250219-v1:0",
        system_prompt="""You are a helpful AI assistant with access to external APIs via OAuth2.

You can securely access external services using stored credentials:
- OpenAI for advanced AI capabilities
- GitHub for repository information

Available tools:
- check_credentials_status: See which credentials are configured
- call_external_api: Call external APIs (openai, github)

When asked to use an external service:
1. First check if credentials are configured
2. If not, inform the user they need to set up the credential provider
3. If configured, make the API call""",
        tools=[check_credentials_status, call_external_api],
    )


@app.entrypoint
async def invoke(payload, context):
    """
    Main entrypoint for the agent with OAuth identity integration.

    Args:
        payload: The request payload containing the prompt
        context: Runtime context with session info

    Returns:
        The agent's response
    """
    global agent

    prompt = payload.get("prompt", "Hello!")
    initialize_credentials = payload.get("initialize_credentials", False)

    # Optionally initialize credentials on first request
    if initialize_credentials:
        try:
            print("Initializing credentials from AgentCore Identity...")
            # These will trigger OAuth flow if needed
            await get_openai_credentials(api_key="")
        except Exception as e:
            print(f"Note: Could not retrieve OpenAI credentials: {e}")

        try:
            await get_github_credentials(api_key="")
        except Exception as e:
            print(f"Note: Could not retrieve GitHub credentials: {e}")

    # Create agent if not already created
    if agent is None:
        agent = create_agent()

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
