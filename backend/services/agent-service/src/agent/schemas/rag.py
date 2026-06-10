from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class PostMediaAttachmentInput(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    attachment_id: int = Field(alias="attachmentId")
    content_type: str = Field(alias="contentType", min_length=1)
    sort_order: int = Field(alias="sortOrder", ge=0)
    signed_url: str = Field(alias="signedUrl", min_length=1)


class IndexPostRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    # Java API 계약은 camelCase이고 Python 내부 코드는 snake_case를 쓰므로 alias로 경계를 맞춥니다.
    post_id: int = Field(alias="postId")
    author_id: int = Field(alias="authorId")
    content: str | None = None
    visibility: str = Field(min_length=1)
    status: str = Field(min_length=1)
    created_at: datetime = Field(alias="createdAt")
    media_attachments: list[PostMediaAttachmentInput] = Field(
        default_factory=list,
        alias="mediaAttachments",
    )

    @model_validator(mode="after")
    def validate_content_or_media(self) -> "IndexPostRequest":
        # 텍스트나 이미지 중 하나는 있어야 Gemini에 의미 있는 embedding 입력을 만들 수 있습니다.
        has_content = self.content is not None and bool(self.content.strip())
        if not has_content and not self.media_attachments:
            raise ValueError("content 또는 mediaAttachments 중 하나는 제공해야 합니다.")
        return self


class UpdatePostStatusRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: str = Field(min_length=1)


class PostSearchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    query: str = Field(min_length=1)
    limit: int = Field(default=20, ge=1, le=50)
    visibility: str | None = None
    status: str | None = None


class RelatedPostsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    limit: int = Field(default=20, ge=1, le=50)
    visibility: str | None = None
    status: str | None = None


class PostSearchResult(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    post_id: int = Field(alias="postId")
    score: float


class PostSearchResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # 검색 결과는 Java가 다시 DB에서 조회할 식별자와 ranking score만 반환합니다.
    results: list[PostSearchResult]
