# 설문지 12문항 - 업종추천용타워 / 상권추천용타워 통일 질문

## Q1. 주말 오후에 가장 자연스럽게 가는 곳은 어디예요?

_단일 선택_

| 선택지                                                 | 파라미터                                                                                |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| A. 집 근처 카페나 동네 가게를 천천히 둘러보는 편이에요 | `resident_focus_level↑` / `weekend_preference_level↑` / `stability_level↑`              |
| B. 사람 많은 번화가나 역 근처로 나가 보는 편이에요     | `traffic_volume_preference↑` / `subway_dependency_level↑` / `weekend_preference_level↑` |
| C. 집에서 쉬면서 다음 주를 준비하는 편이에요           | `stability_level↑` / `labor_intensity_tolerance↓`                                       |
| D. 시장이나 골목 맛집을 찾아다니는 편이에요            | `avg_ticket_preference↓` / `resident_focus_level↑` / `weekend_preference_level↑`        |

## Q2. 내 가게에서 가장 뿌듯할 것 같은 순간은 언제예요?

_단일 선택_

| 선택지                                                 | 파라미터                                                                                 |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| A. 점심시간에 손님 줄이 길게 생길 때예요               | `lunch_preference_level↑` / `traffic_volume_preference↑` / `worker_focus_level↑`         |
| B. 저녁마다 단골이 꾸준히 다시 찾아올 때예요           | `evening_preference_level↑` / `stability_level↑` / `resident_focus_level↑`               |
| C. 주말에 가족이나 커플 손님으로 가게가 가득 찰 때예요 | `weekend_preference_level↑` / `target_age_30_level↑` / `target_age_40_level↑`            |
| D. 밤늦게까지 손님이 끊기지 않을 때예요                | `late_night_preference_level↑` / `competition_tolerance_level↑` / `target_age_20_level↑` |

## Q3. 사람들이 내 가게를 어떻게 기억해 주면 좋겠어요?

_단일 선택_

| 선택지                                                           | 파라미터                                                                               |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| A. 가성비가 좋아서 자주 가는 곳이라고 기억해 주면 좋겠어요       | `avg_ticket_preference↓` / `traffic_volume_preference↑` / `budget_level↓`              |
| B. 분위기가 좋아서 일부러 찾아가는 곳이라고 기억해 주면 좋겠어요 | `avg_ticket_preference↑` / `female_preference_level↑` / `space_efficiency_preference↑` |
| C. 오래 가도 늘 믿을 만한 곳이라고 기억해 주면 좋겠어요          | `stability_level↑` / `resident_focus_level↑` / `rent_sensitivity_level↑`               |
| D. 요즘 가장 뜨는 곳이라고 기억해 주면 좋겠어요                  | `competition_tolerance_level↑` / `target_age_20_level↑` / `target_age_30_level↑`       |

## Q4. 자주 가거나 살고 싶은 상권은 어떤 느낌이에요?

_단일 선택_

| 선택지                                                   | 파라미터                                                                          |
| -------------------------------------------------------- | --------------------------------------------------------------------------------- |
| A. 지하철역 바로 앞이라 늘 사람이 많은 곳이에요          | `subway_dependency_level↑` / `traffic_volume_preference↑` / `worker_focus_level↑` |
| B. 아파트 단지 옆이라 주민들이 자주 오가는 곳이에요      | `resident_focus_level↑` / `stability_level↑` / `rent_sensitivity_level↑`          |
| C. 오피스 빌딩 사이처럼 직장인이 많은 곳이에요           | `worker_focus_level↑` / `lunch_preference_level↑` / `traffic_volume_preference↑`  |
| D. 골목 안쪽이라 조용하지만 단골이 생길 수 있는 곳이에요 | `resident_focus_level↑` / `subway_dependency_level↓` / `stability_level↑`         |

## Q5. 창업 관련 콘텐츠를 볼 때 가장 끌리는 장면은 어떤 모습이에요?

_단일 선택_

| 선택지                                               | 파라미터                                                                                     |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| A. 작은 공간에서 혼자 깔끔하게 운영하는 1인 가게예요 | `space_efficiency_preference↑` / `labor_intensity_tolerance↓` / `budget_level↓`              |
| B. 직원들과 함께 바쁘게 돌아가는 가게예요            | `labor_intensity_tolerance↑` / `traffic_volume_preference↑` / `competition_tolerance_level↑` |
| C. 검증된 프랜차이즈를 안정적으로 운영하는 가게예요  | `franchise_affinity_level↑` / `stability_level↑` / `budget_level↑`                           |
| D. 독립 브랜드로 자기 색깔을 만드는 가게예요         | `competition_tolerance_level↑` / `avg_ticket_preference↑` / `franchise_affinity_level↓`      |

## Q6. 돈을 쓸 때 나는 어떤 편이에요?

_단일 선택_

| 선택지                                              | 파라미터                                                               |
| --------------------------------------------------- | ---------------------------------------------------------------------- |
| A. 일단 적게 쓰고 상황을 보면서 늘리는 편이에요     | `budget_level↓` / `rent_sensitivity_level↑` / `stability_level↑`       |
| B. 필요하다고 느끼면 좋은 것에 확실히 쓰는 편이에요 | `budget_level↑` / `avg_ticket_preference↑` / `rent_sensitivity_level↓` |
| C. 고정비를 줄이고 현금 여유를 남겨 두는 편이에요   | `rent_sensitivity_level↑` / `budget_level↓` / `stability_level↑`       |
| D. 초기에 크게 투자하고 빠르게 회수하는 편이에요    | `budget_level↑` / `competition_tolerance_level↑` / `stability_level↓`  |

## Q7. 어떤 손님이 가장 반가울 것 같아요?

_단일 선택_

| 선택지                                           | 파라미터                                                                      |
| ------------------------------------------------ | ----------------------------------------------------------------------------- |
| A. 10대와 20대 손님이 사진 찍고 공유해 줄 때예요 | `target_age_10_level↑` / `target_age_20_level↑` / `female_preference_level↑`  |
| B. 20대와 30대 또래 손님이 자주 들를 때예요      | `target_age_20_level↑` / `target_age_30_level↑` / `evening_preference_level↑` |
| C. 30대와 40대 손님이 재방문해 줄 때예요         | `target_age_30_level↑` / `target_age_40_level↑` / `weekend_preference_level↑` |
| D. 50대 이상 단골이 꾸준히 다시 찾아올 때예요    | `target_age_50_plus_level↑` / `stability_level↑` / `resident_focus_level↑`    |

## Q8. 경쟁자가 바로 옆에 생기면 어떤 기분이 들어요?

_단일 선택_

| 선택지                                       | 파라미터                                                                      |
| -------------------------------------------- | ----------------------------------------------------------------------------- |
| A. 수요가 있다는 뜻 같아서 오히려 반가워요   | `competition_tolerance_level↑` / `traffic_volume_preference↑`                 |
| B. 불편하지만 더 잘하면 된다고 생각해요      | `competition_tolerance_level↑` / `stability_level↑`                           |
| C. 가능하면 그런 상황은 피하고 싶어요        | `competition_tolerance_level↓` / `stability_level↑` / `resident_focus_level↑` |
| D. 임대료와 매출이 같이 흔들릴까 봐 걱정돼요 | `competition_tolerance_level↓` / `rent_sensitivity_level↑` / `budget_level↓`  |

## Q9. 운영 방식은 어떤 쪽이 나와 더 잘 맞을 것 같아요?

_단일 선택_

| 선택지                                                   | 파라미터                                                                                     |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| A. 혼자 하거나 최소 인원으로 가볍게 운영하는 쪽이 좋아요 | `labor_intensity_tolerance↓` / `space_efficiency_preference↑` / `stability_level↑`           |
| B. 팀을 꾸려서 바쁘게 굴리는 쪽이 좋아요                 | `labor_intensity_tolerance↑` / `traffic_volume_preference↑` / `competition_tolerance_level↑` |
| C. 검증된 시스템과 매뉴얼이 있는 쪽이 마음 편해요        | `franchise_affinity_level↑` / `stability_level↑` / `labor_intensity_tolerance↓`              |
| D. 조금 복잡해도 내 방식대로 운영하는 쪽이 좋아요        | `franchise_affinity_level↓` / `competition_tolerance_level↑` / `avg_ticket_preference↑`      |

## Q10. 어떤 시간대 손님 흐름이 가장 매력적으로 느껴져요?

_단일 선택_

| 선택지                                           | 파라미터                                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------------------------- |
| A. 짧고 굵게 점심시간에 몰리는 흐름이에요        | `lunch_preference_level↑` / `worker_focus_level↑` / `traffic_volume_preference↑`      |
| B. 퇴근 후 저녁에 꾸준히 차는 흐름이에요         | `evening_preference_level↑` / `stability_level↑`                                      |
| C. 주말 낮부터 저녁까지 길게 이어지는 흐름이에요 | `weekend_preference_level↑` / `target_age_30_level↑` / `target_age_40_level↑`         |
| D. 늦은 밤까지 수요가 이어지는 흐름이에요        | `late_night_preference_level↑` / `evening_preference_level↑` / `target_age_20_level↑` |

## Q11. 어떤 공간 분위기가 더 끌려요?

_단일 선택_

| 선택지                                                  | 파라미터                                                                                 |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| A. 넓고 여유롭고 오래 머물 수 있는 공간이 좋아요        | `space_efficiency_preference↓` / `avg_ticket_preference↑` / `female_preference_level↑`   |
| B. 작아도 효율적으로 돌아가고 회전이 빠른 공간이 좋아요 | `space_efficiency_preference↑` / `traffic_volume_preference↑` / `avg_ticket_preference↓` |
| C. 사진 찍고 싶을 만큼 분위기 있는 감성 공간이 좋아요   | `female_preference_level↑` / `avg_ticket_preference↑` / `evening_preference_level↑`      |
| D. 화려하지 않아도 실용적이고 깔끔한 공간이 좋아요      | `franchise_affinity_level↑` / `budget_level↓` / `labor_intensity_tolerance↓`             |

## Q12. 5년 뒤 내 가게는 어떤 모습이었으면 좋겠어요? `최대 2개 선택해 주세요.`

_복수 선택 (최대 2개)_

| 선택지                                                     | 파라미터                                                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| A. 동네에서 모르는 사람이 없는 터줏대감이었으면 좋겠어요   | `resident_focus_level↑` / `stability_level↑` / `target_age_40_level↑`                |
| B. 2호점과 3호점까지 확장한 가게였으면 좋겠어요            | `competition_tolerance_level↑` / `traffic_volume_preference↑` / `budget_level↑`      |
| C. 월급쟁이 시절보다 여유롭고 자유로운 가게였으면 좋겠어요 | `labor_intensity_tolerance↓` / `space_efficiency_preference↑` / `stability_level↑`   |
| D. SNS에서 줄 서는 가게로 소문나 있었으면 좋겠어요         | `target_age_20_level↑` / `female_preference_level↑` / `competition_tolerance_level↑` |
| E. 직원들이 오래 일하고 싶어 하는 좋은 가게였으면 좋겠어요 | `labor_intensity_tolerance↑` / `stability_level↑` / `avg_ticket_preference↑`         |

## 파라미터 커버리지 요약

| 파라미터                      | 커버 문항                                    |
| ----------------------------- | -------------------------------------------- |
| `budget_level`                | Q3, Q5, Q6, Q8, Q11, Q12                     |
| `stability_level`             | Q1, Q2, Q3, Q4, Q5, Q6, Q7, Q8, Q9, Q10, Q12 |
| `subway_dependency_level`     | Q1, Q4                                       |
| `weekend_preference_level`    | Q1, Q2, Q7, Q10                              |
| `evening_preference_level`    | Q2, Q7, Q10, Q11                             |
| `resident_focus_level`        | Q1, Q2, Q3, Q4, Q7, Q8, Q12                  |
| `worker_focus_level`          | Q2, Q4, Q10                                  |
| `rent_sensitivity_level`      | Q3, Q4, Q6, Q8                               |
| `competition_tolerance_level` | Q2, Q3, Q5, Q6, Q8, Q9, Q12                  |
| `lunch_preference_level`      | Q2, Q4, Q10                                  |
| `late_night_preference_level` | Q2, Q10                                      |
| `target_age_10_level`         | Q7                                           |
| `target_age_20_level`         | Q2, Q3, Q7, Q10, Q12                         |
| `target_age_30_level`         | Q2, Q3, Q7, Q10                              |
| `target_age_40_level`         | Q2, Q7, Q10, Q12                             |
| `target_age_50_plus_level`    | Q7                                           |
| `female_preference_level`     | Q3, Q7, Q11, Q12                             |
| `avg_ticket_preference`       | Q1, Q3, Q5, Q6, Q9, Q11, Q12                 |
| `traffic_volume_preference`   | Q1, Q2, Q4, Q5, Q8, Q9, Q10, Q11, Q12        |
| `franchise_affinity_level`    | Q5, Q9, Q11                                  |
| `labor_intensity_tolerance`   | Q1, Q5, Q9, Q11, Q12                         |
| `space_efficiency_preference` | Q3, Q5, Q9, Q11, Q12                         |
