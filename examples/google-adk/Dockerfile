FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

ENV UV_SYSTEM_PYTHON=1 \
    UV_COMPILE_BYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY pyproject.toml .
RUN uv pip install .

# Create non-root user
RUN useradd -m -u 1000 agent
USER agent

COPY agent.py ./

EXPOSE 8080

# Run the agent (BedrockAgentCoreApp handles OTEL instrumentation internally)
CMD ["python", "agent.py"]
