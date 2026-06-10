from langgraph.pregel import Pregel

from agent.services.chat.graph import chat_graph
from agent.services.chat.toolkits.chat_toolkit import list_chat_tools


def test_graph_compiles() -> None:
    assert isinstance(chat_graph, Pregel)


def test_tool_catalog_is_not_empty() -> None:
    tools = list_chat_tools()
    assert tools
    assert {tool["name"] for tool in tools} >= {"add", "subtract", "multiply", "divide"}
