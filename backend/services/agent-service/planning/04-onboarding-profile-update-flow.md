# onboarding profile update flow

채팅 중 agent가 성향 변경을 감지하면 onboarding-service의 유저타워 결과를 새로 만든다.  
agent-service는 성향 결과 본문을 저장하지 않는다.

```text
agent-service
-> result_code 참조
-> 변경 이력
-> tool audit

onboarding-service
-> survey result
-> area_user_profile
-> category_user_profile
-> category recommendations
-> area recommendations cache
```

## thread context

```text
agent_thread_onboarding_contexts
+ id uuid pk
+ thread_id uuid fk agent_threads.id
+ auth_user_uuid string indexed
+ result_code string
+ selected_category_code string nullable
+ source string
+ attached_at timestamptz
+ updated_at timestamptz
```

`source` 값은 아래 문자열로 시작한다.

```text
default_profile
manual_attach
agent_update
```

## context events

```text
agent_onboarding_context_events
+ id uuid pk
+ auth_user_uuid string indexed
+ thread_id uuid fk agent_threads.id
+ previous_result_code string nullable
+ next_result_code string
+ selected_category_code string nullable
+ change_source string
+ tool_call_id string nullable
+ summary text nullable
+ diff_json json
+ created_at timestamptz
```

이 테이블은 “AI가 어떤 근거로 성향을 갱신했는지”를 보여준다.

## onboarding client

`src/agent/clients/onboarding_service.py`가 onboarding-service API를 감싼다.

```py
class OnboardingServiceClient:
    async def get_default_profile(self, access_token: str) -> SurveyResultResponse | None:
        ...

    async def get_survey_result(self, result_code: str) -> SurveyResultResponse:
        ...

    async def get_area_recommendations(
        self,
        result_code: str,
        category_code: str,
        top_k: int,
    ) -> SurveyAreaRecommendationResponse:
        ...
```

채팅 기반 성향 업데이트 API는 onboarding-service에 추가되어야 한다.

```text
POST /surveys/me/profile/preview-update
POST /surveys/me/profile/commit-update
```

## onboarding_preview_profile_update

side effect 없이 변경안을 계산한다.

```py
@tool
async def onboarding_preview_profile_update(
    base_result_code: str,
    patch: dict[str, float],
    evidence: list[ProfileUpdateEvidence],
) -> ProfileUpdatePreview:
    ...
```

```json
{
  "base_result_code": "r0a1b2c3d4e5f6g",
  "patch": {
    "budget_level": 0.58,
    "subway_dependency_level": 0.72,
    "competition_tolerance_level": 0.41
  },
  "evidence": [
    {
      "message_id": "msg_xxx",
      "quote": "역세권은 꼭 필요하고 경쟁은 적었으면 좋겠어"
    }
  ]
}
```

## onboarding_commit_profile_update

새 성향 결과를 onboarding-service DB에 저장하고 `result_code`를 받는다.

```py
@tool
async def onboarding_commit_profile_update(
    base_result_code: str,
    patch: dict[str, float],
    evidence: list[ProfileUpdateEvidence],
) -> ProfileUpdateCommitResult:
    ...
```

이 tool은 HITL 대상이다.

```text
onboarding_commit_profile_update
-> interrupt
-> approve
-> onboarding-service POST /surveys/me/profile/commit-update
-> result_code
```

## onboarding_set_thread_profile_context

현재 thread가 참조하는 `result_code`를 갱신한다.

```py
@tool
async def onboarding_set_thread_profile_context(
    thread_id: str,
    result_code: str,
    selected_category_code: str | None = None,
) -> ThreadOnboardingContext:
    ...
```

commit 뒤 자동 호출하거나, 별도 HITL tool로 둔다.  
초기 구현은 commit tool 내부에서 app service를 호출해 context를 같이 갱신한다.

## stream artifact

preview 결과는 ToolMessage로 돌아오고, 프론트는 성향 분석 아티팩트로 연다.

```text
ToolMessage(ProfileUpdatePreview)
-> design4 DynamicPanel
-> personality_analysis / ai_report
```

새로고침 뒤에는 아래 흐름으로 복원한다.

```text
GET /api/v1/agent/threads/{thread_id}/onboarding-context
-> result_code
-> onboarding-service GET /surveys/results/{result_code}
```

## 닫히는 단위

```text
src/agent/clients/onboarding_service.py
src/agent/api/routes/onboarding_contexts.py
src/agent/repositories/onboarding_contexts.py
src/agent/schemas/onboarding_contexts.py
src/agent/services/onboarding_contexts/service.py
src/agent/services/chat/tools/onboarding_tool/
tests/unit_tests/test_onboarding_context_service.py
tests/unit_tests/test_onboarding_tool.py
```

```text
uv run pytest tests/unit_tests/test_onboarding_context_service.py tests/unit_tests/test_onboarding_tool.py
```

## 주요 파일

- `src/agent/services/chat/toolkits/chat_toolkit.py`
- `src/agent/services/chat/approvals/nodes.py`
- `backend/services/onboarding-service/docs/api.md`
- `backend/services/onboarding-service/app/surveys/contracts.py`
- `backend/services/onboarding-service/app/surveys/service.py`

## 참고 문서

- LangGraph human-in-the-loop: `https://docs.langchain.com/oss/python/langgraph/interrupts`
- LangGraph Persistence: `https://docs.langchain.com/oss/python/langgraph/persistence`
