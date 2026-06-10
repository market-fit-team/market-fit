from __future__ import annotations

import re
from inspect import isclass
from typing import Any, Literal

from langchain_core.tools import BaseTool
from pydantic import BaseModel, ConfigDict, Field, model_validator

from agent.services.chat.approvals.schemas import ApprovalDecisionType


ToolCategory = Literal[
    "calculator",
    "rag",
    "document",
    "web",
    "file",
    "system",
]

_TOOL_NAME_PATTERN = re.compile(r"^[a-z][a-z0-9_]*$")


class ToolSpec(BaseModel):
    """agent와 client에 노출되는 chat tool 계약의 단일 출처입니다."""

    model_config = ConfigDict(arbitrary_types_allowed=True, extra="forbid")

    tool: BaseTool
    name: str = Field(min_length=1)
    description: str = Field(min_length=1)
    category: ToolCategory
    args_schema: Any
    default_allowed: bool
    allowed_decisions: list[ApprovalDecisionType] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_contract(self) -> "ToolSpec":
        if not _TOOL_NAME_PATTERN.fullmatch(self.name):
            raise ValueError(f"Tool 이름은 snake_case여야 합니다. name={self.name}")
        if self.tool.name != self.name:
            raise ValueError(f"ToolSpec name은 tool.name과 같아야 합니다. spec={self.name} tool={self.tool.name}")
        if not self.description.strip():
            raise ValueError(f"Tool description은 비어 있으면 안 됩니다. name={self.name}")
        if not _is_supported_args_schema(self.args_schema):
            raise ValueError(
                f"Tool args_schema는 Pydantic model class 또는 JSON schema dict여야 합니다. name={self.name}"
            )
        return self


def validate_tool_specs(specs: tuple[ToolSpec, ...]) -> tuple[ToolSpec, ...]:
    names: set[str] = set()
    for spec in specs:
        if spec.name in names:
            raise ValueError(f"중복된 chat tool 이름이 등록되었습니다. name={spec.name}")
        names.add(spec.name)
    return specs


def _is_supported_args_schema(args_schema: Any) -> bool:
    if isinstance(args_schema, dict):
        return True
    return isclass(args_schema) and issubclass(args_schema, BaseModel)
