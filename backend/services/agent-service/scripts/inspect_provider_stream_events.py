from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path
from typing import Any

from langchain_core.load import dumpd
from langchain_core.runnables.schema import StreamEvent

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from agent.core.config import settings
from agent.schemas.chat import ReasoningEffort
from agent.services.chat.model_cards import ChatModelCard, ChatModelProvider, ChatModelRoute, list_chat_model_cards
from agent.services.chat.providers import create_chat_model_for_route



ProviderChoice = ChatModelProvider

PROVIDER_DEFAULT_REASONING: dict[ProviderChoice, ReasoningEffort] = {
    "ollama": "medium",
    "google": "high",
    "opencode_zen": "high",
    "openrouter": "high",
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Inspect normalized LangChain stream events from configured providers.")
    parser.add_argument(
        "--provider",
        choices=["ollama", "google", "opencode_zen", "openrouter"],
        required=True,
    )
    parser.add_argument("--model", help="Public model id whose route should be inspected.")
    parser.add_argument("--prompt", default="Say hello in one short sentence.")
    parser.add_argument("--max-events", type=int, default=20)
    args = parser.parse_args()

    card, route = _route_for_provider(args.provider, model_id=args.model)
    _skip_if_required_key_missing(route)
    try:
        asyncio.run(_inspect(card=card, route=route, prompt=args.prompt, max_events=args.max_events))
    except Exception as error:
        raise SystemExit(f"{route.provider} smoke failed: {error.__class__.__name__}: {error}") from error


async def _inspect(*, card: ChatModelCard, route: ChatModelRoute, prompt: str, max_events: int) -> None:
    model = create_chat_model_for_route(route, PROVIDER_DEFAULT_REASONING[route.provider])
    count = 0
    async for event in model.astream_events(prompt, version="v2"):
        compact = _compact_event(event)
        compact["route"] = {
            "public_model_id": card.id,
            "provider": route.provider,
            "langchain_model": route.langchain_model,
        }
        print(json.dumps(compact, ensure_ascii=False))
        count += 1
        if count >= max_events:
            break


def _route_for_provider(provider: ProviderChoice, *, model_id: str | None) -> tuple[ChatModelCard, ChatModelRoute]:
    for card in list_chat_model_cards():
        if model_id is not None and card.id != model_id:
            continue
        for route in card.routes:
            if route.provider == provider:
                return card, route
    if model_id is None:
        raise ValueError(f"unknown provider route: {provider}")
    raise ValueError(f"unknown provider route: {provider} for model {model_id}")


def _skip_if_required_key_missing(route: ChatModelRoute) -> None:
    if route.provider == "ollama" and not settings.ollama_api_key:
        raise SystemExit("OLLAMA_API_KEY is required for ollama smoke inspection.")
    if route.provider == "google" and not settings.gemini_api_key:
        raise SystemExit("GEMINI_API_KEY is required for google smoke inspection.")
    if route.provider == "opencode_zen" and not settings.opencode_zen_api_key:
        raise SystemExit("OPENCODE_ZEN_API_KEY is required for opencode_zen smoke inspection.")
    if route.provider == "openrouter" and not settings.openrouter_api_key:
        raise SystemExit("OPENROUTER_API_KEY is required for openrouter smoke inspection.")


def _compact_event(event: StreamEvent | dict[str, Any]) -> dict[str, Any]:
    return {
        "event": event.get("event"),
        "name": event.get("name"),
        "run_id": event.get("run_id"),
        "parent_ids": event.get("parent_ids", []),
        "data": _dump_jsonable(event.get("data", {})),
    }


def _dump_jsonable(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, dict):
        return {str(key): _dump_jsonable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_dump_jsonable(item) for item in value]
    return dumpd(value)


if __name__ == "__main__":
    main()
