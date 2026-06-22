from __future__ import annotations

from typing import Any

ACTIVE_SURVEY_SLUG = "founder-fit-12-final"
ACTIVE_SURVEY_VERSION = 1
ACTIVE_SURVEY_CODE = "A"
ACTIVE_SCORING_VERSION = "founder_fit_v2"

_ACTIVE_SURVEY_DEFINITION: dict[str, Any] = {
    "slug": ACTIVE_SURVEY_SLUG,
    "version": ACTIVE_SURVEY_VERSION,
    "survey_code": ACTIVE_SURVEY_CODE,
    "scoring_version": ACTIVE_SCORING_VERSION,
    "title": "창업 성향 설문 12문항",
    "description": "업종 추천용 유저타워와 상권 추천용 유저타워를 함께 계산하는 현재 활성 설문 정의다.",
    "questions": [
        {
            "id": "q1",
            "selection_type": "single",
            "prompt": "주말 오후에 가장 자연스럽게 가는 곳은 어디예요?",
            "options": [
                {
                    "code": "A",
                    "label": "집 근처 카페나 동네 가게를 천천히 둘러보는 편이에요",
                    "effects": {
                        "resident_focus_level": 1.0,
                        "weekend_preference_level": 1.0,
                        "stability_level": 1.0,
                    },
                },
                {
                    "code": "B",
                    "label": "사람 많은 번화가나 역 근처로 나가 보는 편이에요",
                    "effects": {
                        "traffic_volume_preference": 1.0,
                        "subway_dependency_level": 1.0,
                        "weekend_preference_level": 1.0,
                    },
                },
                {
                    "code": "C",
                    "label": "집에서 쉬면서 다음 주를 준비하는 편이에요",
                    "effects": {
                        "stability_level": 1.0,
                        "labor_intensity_tolerance": 0.0,
                    },
                },
                {
                    "code": "D",
                    "label": "시장이나 골목 맛집을 찾아다니는 편이에요",
                    "effects": {
                        "avg_ticket_preference": 0.0,
                        "resident_focus_level": 1.0,
                        "weekend_preference_level": 1.0,
                    },
                },
            ],
            "primary_parameters": ["resident_focus_level", "weekend_preference_level", "traffic_volume_preference"],
            "secondary_parameters": ["subway_dependency_level", "stability_level", "labor_intensity_tolerance"],
        },
        {
            "id": "q2",
            "selection_type": "single",
            "prompt": "내 가게에서 가장 뿌듯할 것 같은 순간은 언제예요?",
            "options": [
                {
                    "code": "A",
                    "label": "점심시간에 손님 줄이 길게 생길 때예요",
                    "effects": {
                        "lunch_preference_level": 1.0,
                        "traffic_volume_preference": 1.0,
                        "worker_focus_level": 1.0,
                    },
                },
                {
                    "code": "B",
                    "label": "저녁마다 단골이 꾸준히 다시 찾아올 때예요",
                    "effects": {
                        "evening_preference_level": 1.0,
                        "stability_level": 1.0,
                        "resident_focus_level": 1.0,
                    },
                },
                {
                    "code": "C",
                    "label": "주말에 가족이나 커플 손님으로 가게가 가득 찰 때예요",
                    "effects": {
                        "weekend_preference_level": 1.0,
                        "target_age_30_level": 1.0,
                        "target_age_40_level": 1.0,
                    },
                },
                {
                    "code": "D",
                    "label": "밤늦게까지 손님이 끊기지 않을 때예요",
                    "effects": {
                        "late_night_preference_level": 1.0,
                        "competition_tolerance_level": 1.0,
                        "target_age_20_level": 1.0,
                    },
                },
            ],
            "primary_parameters": [
                "lunch_preference_level",
                "evening_preference_level",
                "weekend_preference_level",
                "late_night_preference_level",
            ],
            "secondary_parameters": [
                "traffic_volume_preference",
                "worker_focus_level",
                "resident_focus_level",
                "competition_tolerance_level",
                "target_age_20_level",
                "target_age_30_level",
                "target_age_40_level",
            ],
        },
        {
            "id": "q3",
            "selection_type": "single",
            "prompt": "사람들이 내 가게를 어떻게 기억해 주면 좋겠어요?",
            "options": [
                {
                    "code": "A",
                    "label": "가성비가 좋아서 자주 가는 곳이라고 기억해 주면 좋겠어요",
                    "effects": {
                        "avg_ticket_preference": 0.0,
                        "traffic_volume_preference": 1.0,
                        "budget_level": 0.0,
                    },
                },
                {
                    "code": "B",
                    "label": "분위기가 좋아서 일부러 찾아가는 곳이라고 기억해 주면 좋겠어요",
                    "effects": {
                        "avg_ticket_preference": 1.0,
                        "female_preference_level": 1.0,
                        "space_efficiency_preference": 1.0,
                    },
                },
                {
                    "code": "C",
                    "label": "오래 가도 늘 믿을 만한 곳이라고 기억해 주면 좋겠어요",
                    "effects": {
                        "stability_level": 1.0,
                        "resident_focus_level": 1.0,
                        "rent_sensitivity_level": 1.0,
                    },
                },
                {
                    "code": "D",
                    "label": "요즘 가장 뜨는 곳이라고 기억해 주면 좋겠어요",
                    "effects": {
                        "competition_tolerance_level": 1.0,
                        "target_age_20_level": 1.0,
                        "target_age_30_level": 1.0,
                    },
                },
            ],
            "primary_parameters": ["avg_ticket_preference", "stability_level", "competition_tolerance_level"],
            "secondary_parameters": [
                "traffic_volume_preference",
                "budget_level",
                "female_preference_level",
                "space_efficiency_preference",
                "resident_focus_level",
                "rent_sensitivity_level",
                "target_age_20_level",
                "target_age_30_level",
            ],
        },
        {
            "id": "q4",
            "selection_type": "single",
            "prompt": "자주 가거나 살고 싶은 상권은 어떤 느낌이에요?",
            "options": [
                {
                    "code": "A",
                    "label": "지하철역 바로 앞이라 늘 사람이 많은 곳이에요",
                    "effects": {
                        "subway_dependency_level": 1.0,
                        "traffic_volume_preference": 1.0,
                        "worker_focus_level": 1.0,
                    },
                },
                {
                    "code": "B",
                    "label": "아파트 단지 옆이라 주민들이 자주 오가는 곳이에요",
                    "effects": {
                        "resident_focus_level": 1.0,
                        "stability_level": 1.0,
                        "rent_sensitivity_level": 1.0,
                    },
                },
                {
                    "code": "C",
                    "label": "오피스 빌딩 사이처럼 직장인이 많은 곳이에요",
                    "effects": {
                        "worker_focus_level": 1.0,
                        "lunch_preference_level": 1.0,
                        "traffic_volume_preference": 1.0,
                    },
                },
                {
                    "code": "D",
                    "label": "골목 안쪽이라 조용하지만 단골이 생길 수 있는 곳이에요",
                    "effects": {
                        "resident_focus_level": 1.0,
                        "subway_dependency_level": 0.0,
                        "stability_level": 1.0,
                    },
                },
            ],
            "primary_parameters": ["subway_dependency_level", "resident_focus_level", "worker_focus_level"],
            "secondary_parameters": ["traffic_volume_preference", "stability_level", "rent_sensitivity_level"],
        },
        {
            "id": "q5",
            "selection_type": "single",
            "prompt": "창업 관련 콘텐츠를 볼 때 가장 끌리는 장면은 어떤 모습이에요?",
            "options": [
                {
                    "code": "A",
                    "label": "작은 공간에서 혼자 깔끔하게 운영하는 1인 가게예요",
                    "effects": {
                        "space_efficiency_preference": 1.0,
                        "labor_intensity_tolerance": 0.0,
                        "budget_level": 0.0,
                    },
                },
                {
                    "code": "B",
                    "label": "직원들과 함께 바쁘게 돌아가는 가게예요",
                    "effects": {
                        "labor_intensity_tolerance": 1.0,
                        "traffic_volume_preference": 1.0,
                        "competition_tolerance_level": 1.0,
                    },
                },
                {
                    "code": "C",
                    "label": "검증된 프랜차이즈를 안정적으로 운영하는 가게예요",
                    "effects": {
                        "franchise_affinity_level": 1.0,
                        "stability_level": 1.0,
                        "budget_level": 1.0,
                    },
                },
                {
                    "code": "D",
                    "label": "독립 브랜드로 자기 색깔을 만드는 가게예요",
                    "effects": {
                        "competition_tolerance_level": 1.0,
                        "avg_ticket_preference": 1.0,
                        "franchise_affinity_level": 0.0,
                    },
                },
            ],
            "primary_parameters": [
                "space_efficiency_preference",
                "labor_intensity_tolerance",
                "franchise_affinity_level",
            ],
            "secondary_parameters": ["budget_level", "traffic_volume_preference", "competition_tolerance_level"],
        },
        {
            "id": "q6",
            "selection_type": "single",
            "prompt": "돈을 쓸 때 나는 어떤 편이에요?",
            "options": [
                {
                    "code": "A",
                    "label": "일단 적게 쓰고 상황을 보면서 늘리는 편이에요",
                    "effects": {
                        "budget_level": 0.0,
                        "rent_sensitivity_level": 1.0,
                        "stability_level": 1.0,
                    },
                },
                {
                    "code": "B",
                    "label": "필요하다고 느끼면 좋은 것에 확실히 쓰는 편이에요",
                    "effects": {
                        "budget_level": 1.0,
                        "avg_ticket_preference": 1.0,
                        "rent_sensitivity_level": 0.0,
                    },
                },
                {
                    "code": "C",
                    "label": "고정비를 줄이고 현금 여유를 남겨 두는 편이에요",
                    "effects": {
                        "rent_sensitivity_level": 1.0,
                        "budget_level": 0.0,
                        "stability_level": 1.0,
                    },
                },
                {
                    "code": "D",
                    "label": "초기에 크게 투자하고 빠르게 회수하는 편이에요",
                    "effects": {
                        "budget_level": 1.0,
                        "competition_tolerance_level": 1.0,
                        "stability_level": 0.0,
                    },
                },
            ],
            "primary_parameters": ["budget_level", "rent_sensitivity_level", "stability_level"],
            "secondary_parameters": ["avg_ticket_preference", "competition_tolerance_level"],
        },
        {
            "id": "q7",
            "selection_type": "single",
            "prompt": "어떤 손님이 가장 반가울 것 같아요?",
            "options": [
                {
                    "code": "A",
                    "label": "10대와 20대 손님이 사진 찍고 공유해 줄 때예요",
                    "effects": {
                        "target_age_10_level": 1.0,
                        "target_age_20_level": 1.0,
                        "female_preference_level": 1.0,
                    },
                },
                {
                    "code": "B",
                    "label": "20대와 30대 또래 손님이 자주 들를 때예요",
                    "effects": {
                        "target_age_20_level": 1.0,
                        "target_age_30_level": 1.0,
                        "evening_preference_level": 1.0,
                    },
                },
                {
                    "code": "C",
                    "label": "30대와 40대 손님이 재방문해 줄 때예요",
                    "effects": {
                        "target_age_30_level": 1.0,
                        "target_age_40_level": 1.0,
                        "weekend_preference_level": 1.0,
                    },
                },
                {
                    "code": "D",
                    "label": "50대 이상 단골이 꾸준히 다시 찾아올 때예요",
                    "effects": {
                        "target_age_50_plus_level": 1.0,
                        "stability_level": 1.0,
                        "resident_focus_level": 1.0,
                    },
                },
            ],
            "primary_parameters": [
                "target_age_10_level",
                "target_age_20_level",
                "target_age_30_level",
                "target_age_40_level",
                "target_age_50_plus_level",
            ],
            "secondary_parameters": [
                "female_preference_level",
                "evening_preference_level",
                "weekend_preference_level",
                "stability_level",
                "resident_focus_level",
            ],
        },
        {
            "id": "q8",
            "selection_type": "single",
            "prompt": "경쟁자가 바로 옆에 생기면 어떤 기분이 들어요?",
            "options": [
                {
                    "code": "A",
                    "label": "수요가 있다는 뜻 같아서 오히려 반가워요",
                    "effects": {
                        "competition_tolerance_level": 1.0,
                        "traffic_volume_preference": 1.0,
                    },
                },
                {
                    "code": "B",
                    "label": "불편하지만 더 잘하면 된다고 생각해요",
                    "effects": {
                        "competition_tolerance_level": 1.0,
                        "stability_level": 1.0,
                    },
                },
                {
                    "code": "C",
                    "label": "가능하면 그런 상황은 피하고 싶어요",
                    "effects": {
                        "competition_tolerance_level": 0.0,
                        "stability_level": 1.0,
                        "resident_focus_level": 1.0,
                    },
                },
                {
                    "code": "D",
                    "label": "임대료와 매출이 같이 흔들릴까 봐 걱정돼요",
                    "effects": {
                        "competition_tolerance_level": 0.0,
                        "rent_sensitivity_level": 1.0,
                        "budget_level": 0.0,
                    },
                },
            ],
            "primary_parameters": ["competition_tolerance_level"],
            "secondary_parameters": [
                "traffic_volume_preference",
                "stability_level",
                "resident_focus_level",
                "rent_sensitivity_level",
                "budget_level",
            ],
        },
        {
            "id": "q9",
            "selection_type": "single",
            "prompt": "운영 방식은 어떤 쪽이 나와 더 잘 맞을 것 같아요?",
            "options": [
                {
                    "code": "A",
                    "label": "혼자 하거나 최소 인원으로 가볍게 운영하는 쪽이 좋아요",
                    "effects": {
                        "labor_intensity_tolerance": 0.0,
                        "space_efficiency_preference": 1.0,
                        "stability_level": 1.0,
                    },
                },
                {
                    "code": "B",
                    "label": "팀을 꾸려서 바쁘게 굴리는 쪽이 좋아요",
                    "effects": {
                        "labor_intensity_tolerance": 1.0,
                        "traffic_volume_preference": 1.0,
                        "competition_tolerance_level": 1.0,
                    },
                },
                {
                    "code": "C",
                    "label": "검증된 시스템과 매뉴얼이 있는 쪽이 마음 편해요",
                    "effects": {
                        "franchise_affinity_level": 1.0,
                        "stability_level": 1.0,
                        "labor_intensity_tolerance": 0.0,
                    },
                },
                {
                    "code": "D",
                    "label": "조금 복잡해도 내 방식대로 운영하는 쪽이 좋아요",
                    "effects": {
                        "franchise_affinity_level": 0.0,
                        "competition_tolerance_level": 1.0,
                        "avg_ticket_preference": 1.0,
                    },
                },
            ],
            "primary_parameters": ["labor_intensity_tolerance", "franchise_affinity_level"],
            "secondary_parameters": ["space_efficiency_preference", "traffic_volume_preference", "stability_level"],
        },
        {
            "id": "q10",
            "selection_type": "single",
            "prompt": "어떤 시간대 손님 흐름이 가장 매력적으로 느껴져요?",
            "options": [
                {
                    "code": "A",
                    "label": "짧고 굵게 점심시간에 몰리는 흐름이에요",
                    "effects": {
                        "lunch_preference_level": 1.0,
                        "worker_focus_level": 1.0,
                        "traffic_volume_preference": 1.0,
                    },
                },
                {
                    "code": "B",
                    "label": "퇴근 후 저녁에 꾸준히 차는 흐름이에요",
                    "effects": {
                        "evening_preference_level": 1.0,
                        "stability_level": 1.0,
                    },
                },
                {
                    "code": "C",
                    "label": "주말 낮부터 저녁까지 길게 이어지는 흐름이에요",
                    "effects": {
                        "weekend_preference_level": 1.0,
                        "target_age_30_level": 1.0,
                        "target_age_40_level": 1.0,
                    },
                },
                {
                    "code": "D",
                    "label": "늦은 밤까지 수요가 이어지는 흐름이에요",
                    "effects": {
                        "late_night_preference_level": 1.0,
                        "evening_preference_level": 1.0,
                        "target_age_20_level": 1.0,
                    },
                },
            ],
            "primary_parameters": [
                "lunch_preference_level",
                "evening_preference_level",
                "weekend_preference_level",
                "late_night_preference_level",
            ],
            "secondary_parameters": [
                "worker_focus_level",
                "traffic_volume_preference",
                "target_age_20_level",
                "target_age_30_level",
                "target_age_40_level",
                "stability_level",
            ],
        },
        {
            "id": "q11",
            "selection_type": "single",
            "prompt": "어떤 공간 분위기가 더 끌려요?",
            "options": [
                {
                    "code": "A",
                    "label": "넓고 여유롭고 오래 머물 수 있는 공간이 좋아요",
                    "effects": {
                        "space_efficiency_preference": 0.0,
                        "avg_ticket_preference": 1.0,
                        "female_preference_level": 1.0,
                    },
                },
                {
                    "code": "B",
                    "label": "작아도 효율적으로 돌아가고 회전이 빠른 공간이 좋아요",
                    "effects": {
                        "space_efficiency_preference": 1.0,
                        "traffic_volume_preference": 1.0,
                        "avg_ticket_preference": 0.0,
                    },
                },
                {
                    "code": "C",
                    "label": "사진 찍고 싶을 만큼 분위기 있는 감성 공간이 좋아요",
                    "effects": {
                        "female_preference_level": 1.0,
                        "avg_ticket_preference": 1.0,
                        "evening_preference_level": 1.0,
                    },
                },
                {
                    "code": "D",
                    "label": "화려하지 않아도 실용적이고 깔끔한 공간이 좋아요",
                    "effects": {
                        "franchise_affinity_level": 1.0,
                        "budget_level": 0.0,
                        "labor_intensity_tolerance": 0.0,
                    },
                },
            ],
            "primary_parameters": ["space_efficiency_preference", "avg_ticket_preference", "female_preference_level"],
            "secondary_parameters": ["traffic_volume_preference", "evening_preference_level", "franchise_affinity_level"],
        },
        {
            "id": "q12",
            "selection_type": "multi",
            "max_selections": 2,
            "prompt": "5년 뒤 내 가게는 어떤 모습이었으면 좋겠어요?",
            "options": [
                {
                    "code": "A",
                    "label": "동네에서 모르는 사람이 없는 터줏대감이었으면 좋겠어요",
                    "effects": {
                        "resident_focus_level": 1.0,
                        "stability_level": 1.0,
                        "target_age_40_level": 1.0,
                    },
                },
                {
                    "code": "B",
                    "label": "2호점과 3호점까지 확장한 가게였으면 좋겠어요",
                    "effects": {
                        "competition_tolerance_level": 1.0,
                        "traffic_volume_preference": 1.0,
                        "budget_level": 1.0,
                    },
                },
                {
                    "code": "C",
                    "label": "월급쟁이 시절보다 여유롭고 자유로운 가게였으면 좋겠어요",
                    "effects": {
                        "labor_intensity_tolerance": 0.0,
                        "space_efficiency_preference": 1.0,
                        "stability_level": 1.0,
                    },
                },
                {
                    "code": "D",
                    "label": "SNS에서 줄 서는 가게로 소문나 있었으면 좋겠어요",
                    "effects": {
                        "target_age_20_level": 1.0,
                        "female_preference_level": 1.0,
                        "competition_tolerance_level": 1.0,
                    },
                },
                {
                    "code": "E",
                    "label": "직원들이 오래 일하고 싶어 하는 좋은 가게였으면 좋겠어요",
                    "effects": {
                        "labor_intensity_tolerance": 1.0,
                        "stability_level": 1.0,
                        "avg_ticket_preference": 1.0,
                    },
                },
            ],
            "primary_parameters": [
                "resident_focus_level",
                "stability_level",
                "competition_tolerance_level",
                "labor_intensity_tolerance",
            ],
            "secondary_parameters": [
                "target_age_20_level",
                "target_age_40_level",
                "female_preference_level",
                "avg_ticket_preference",
                "traffic_volume_preference",
                "budget_level",
                "space_efficiency_preference",
            ],
        },
    ],
}


def active_survey_definition() -> dict[str, Any]:
    return {
        **_ACTIVE_SURVEY_DEFINITION,
        "questions": [
            question.copy()
            | {
                "options": [
                    option.copy() | {"effects": dict(option.get("effects", {}))}
                    for option in question["options"]
                ]
            }
            for question in _ACTIVE_SURVEY_DEFINITION["questions"]
        ],
    }
