from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from qdrant_client.http import models


@dataclass(frozen=True)
class PayloadIndexDefinition:
    field_name: str
    field_schema: models.PayloadSchemaType
    is_tenant: bool = False


class RagSourceDefinition(Protocol):
    @property
    def source_type(self) -> str: ...

    @property
    def schema_version(self) -> int: ...

    @property
    def payload_indexes(self) -> tuple[PayloadIndexDefinition, ...]: ...

    @property
    def filter_field_names(self) -> tuple[str, ...]: ...

    @property
    def result_payload_fields(self) -> tuple[str, ...]: ...
