import asyncio
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any

from langchain_core.runnables import RunnableConfig

from agent.schemas.chat import ReasoningEffort
from agent.services.chat.error_log import record_chat_error
from agent.services.chat.model_cards import ChatModelCard, ChatModelRoute


ModelFactory = Callable[[ChatModelRoute, ReasoningEffort], Any]
Sleep = Callable[[float], Awaitable[None]]


@dataclass(frozen=True, slots=True)
class FallbackChatModel:
    card: ChatModelCard
    reasoning_effort: ReasoningEffort
    model_factory: ModelFactory
    sleep: Sleep = asyncio.sleep
    bind_tools_args: tuple[Any, ...] = ()
    bind_tools_kwargs: dict[str, Any] | None = None

    def bind_tools(self, *args: Any, **kwargs: Any) -> "FallbackChatModel":
        return FallbackChatModel(
            card=self.card,
            reasoning_effort=self.reasoning_effort,
            model_factory=self.model_factory,
            sleep=self.sleep,
            bind_tools_args=args,
            bind_tools_kwargs=kwargs,
        )

    async def ainvoke(
        self,
        input: Any,
        config: RunnableConfig | None = None,
        **kwargs: Any,
    ) -> Any:
        first_error: Exception | None = None

        for index, route in enumerate(self.card.routes):
            try:
                model = self.model_factory(route, self.reasoning_effort)
                if self.bind_tools_args or self.bind_tools_kwargs:
                    model = model.bind_tools(
                        *self.bind_tools_args,
                        **(self.bind_tools_kwargs or {}),
                    )
                return await model.ainvoke(input, config=config, **kwargs)
            except Exception as error:
                record_chat_error(
                    error,
                    context={
                        "phase": "chat_model_route",
                        "model_id": self.card.id,
                        "model_family": self.card.model_family,
                        "provider": route.provider,
                        "langchain_model": route.langchain_model,
                        "route_index": index,
                    },
                )
                if first_error is None:
                    first_error = error
                if index < len(self.card.routes) - 1:
                    await self.sleep(self.card.fallback_retry_delay_seconds)

        if first_error is not None:
            raise first_error

        raise ValueError(f"{self.card.id} has no chat model routes")
