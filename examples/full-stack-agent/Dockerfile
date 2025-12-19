FROM public.ecr.aws/lambda/python:3.12

# Install uv for dependency management
COPY --from=ghcr.io/astral-sh/uv:0.5.5 /uv /usr/local/bin/uv

# Copy dependency files
COPY pyproject.toml ./

# Install dependencies
RUN uv pip install --system -r pyproject.toml

# Copy application code
COPY agent.py ./
COPY handlers/ ./handlers/

# AWS MCP Server handler
CMD ["agent.handler"]
