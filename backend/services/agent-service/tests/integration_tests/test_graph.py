import os

import pytest

from agent.services.chat.graph import chat_graph

pytestmark = pytest.mark.anyio

if not (os.getenv("OLLAMA_API_KEY") or os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENCODE_ZEN_API_KEY")):
    pytest.skip("Set a chat provider API key to run integration tests.", allow_module_level=True)


async def test_chat_graph_smoke() -> None:
    result = await chat_graph.ainvoke(
        {
            "messages": [
                {
                    "role": "user",
                    "content": "What is 19*3? Use tools if needed and answer with just the number.",
                }
            ],
            "model": "gpt-oss:120b",
            "reasoning_effort": "medium",
            "allowed_tools": ["multiply"],
            "interrupt_on": {},
        }
    )
    output_text = str(result["messages"][-1].content)
    assert "57" in output_text
