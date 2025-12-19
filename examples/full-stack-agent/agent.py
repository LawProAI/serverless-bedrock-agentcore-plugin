"""
Full-stack AI Agent using MCP (Model Context Protocol)

This agent demonstrates integration with multiple AgentCore resources:
- Memory for conversation history and semantic search
- Browser for web interactions
- Code Interpreter for code execution
- Gateway for external API tools
"""

import json
import logging
from typing import Any

from mcp.server import Server
from mcp.types import (
    Tool,
    TextContent,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create MCP server
server = Server("full-stack-agent")


@server.list_tools()
async def list_tools() -> list[Tool]:
    """List available tools for the agent."""
    return [
        Tool(
            name="search_memory",
            description="Search conversation history using semantic search",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query"
                    },
                    "session_id": {
                        "type": "string",
                        "description": "Optional session ID to scope search"
                    }
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="browse_url",
            description="Browse a URL and extract content",
            inputSchema={
                "type": "object",
                "properties": {
                    "url": {
                        "type": "string",
                        "description": "The URL to browse"
                    }
                },
                "required": ["url"]
            }
        ),
        Tool(
            name="execute_code",
            description="Execute Python code in a sandboxed environment",
            inputSchema={
                "type": "object",
                "properties": {
                    "code": {
                        "type": "string",
                        "description": "Python code to execute"
                    }
                },
                "required": ["code"]
            }
        ),
        Tool(
            name="get_weather",
            description="Get current weather for a location",
            inputSchema={
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "City name or coordinates"
                    }
                },
                "required": ["location"]
            }
        )
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
    """Handle tool calls."""
    logger.info(f"Tool called: {name} with arguments: {arguments}")

    if name == "search_memory":
        # In a real implementation, this would call the Memory API
        return [TextContent(
            type="text",
            text=f"Searching memory for: {arguments.get('query')}"
        )]

    elif name == "browse_url":
        # In a real implementation, this would use the Browser resource
        return [TextContent(
            type="text",
            text=f"Browsing URL: {arguments.get('url')}"
        )]

    elif name == "execute_code":
        # In a real implementation, this would use the CodeInterpreter
        return [TextContent(
            type="text",
            text=f"Executing code in sandbox..."
        )]

    elif name == "get_weather":
        # This calls the Gateway target
        return [TextContent(
            type="text",
            text=f"Getting weather for: {arguments.get('location')}"
        )]

    else:
        return [TextContent(
            type="text",
            text=f"Unknown tool: {name}"
        )]


def handler(event: dict, context: Any) -> dict:
    """AWS Lambda handler for AgentCore Runtime."""
    import asyncio

    logger.info(f"Received event: {json.dumps(event)}")

    # Process the MCP request
    # This is a simplified handler - real implementation would use MCP protocol

    return {
        "statusCode": 200,
        "body": json.dumps({"message": "Agent processed request"})
    }
