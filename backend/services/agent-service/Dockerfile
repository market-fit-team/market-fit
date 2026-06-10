FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    LANGGRAPH_CLI_NO_ANALYTICS=1

COPY pyproject.toml langgraph.json README.md Makefile ./
COPY src ./src
COPY evals ./evals
COPY scripts ./scripts

RUN uv sync --no-dev

EXPOSE 2024

CMD ["uv", "run", "langgraph", "dev", "--host", "0.0.0.0", "--port", "2024", "--no-browser"]
