# 설문지 12문항 - 업종추천용타워 / 상권추천용타워 통일 질문

## Q1. 주말 오후에 가장 자주 가는 곳은 어디인가요?

_단일 선택_

| 선택지                      | 파라미터                                                                                |
| --------------------------- | --------------------------------------------------------------------------------------- |
| A. 집 근처 카페나 동네 가게 | `resident_focus_level↑` / `weekend_preference_level↑` / `stability_level↑`              |
| B. 사람 많은 번화가나 역    | `traffic_volume_preference↑` / `subway_dependency_level↑` / `weekend_preference_level↑` |
| C. 집에서의 휴식            | `stability_level↑` / `labor_intensity_tolerance↓`                                       |
| D. 시장이나 동네 맛집       | `avg_ticket_preference↓` / `resident_focus_level↑` / `weekend_preference_level↑`        |

## Q2. 내 가게에서 가장 뿌듯할 것 같은 순간은 언제일까요?

_단일 선택_

| 선택지                                             | 파라미터                                                                                 |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| A. 점심시간에 손님 줄이 길게 생길 때               | `lunch_preference_level↑` / `traffic_volume_preference↑` / `worker_focus_level↑`         |
| B. 저녁마다 단골이 꾸준히 다시 찾아올 때           | `evening_preference_level↑` / `stability_level↑` / `resident_focus_level↑`               |
| C. 주말에 가족이나 커플 손님으로 가게가 가득 찰 때 | `weekend_preference_level↑` / `target_age_30_level↑` / `target_age_40_level↑`            |
| D. 밤늦게까지 손님이 끊기지 않을 때                | `late_night_preference_level↑` / `competition_tolerance_level↑` / `target_age_20_level↑` |

## Q3. 내 가게가 어떻게 사람들에게 기억되고 싶으신가요?

_단일 선택_

| 선택지                                 | 파라미터                                                                               |
| -------------------------------------- | -------------------------------------------------------------------------------------- |
| A. 가성비가 좋아 사람이 많이 모이는 곳 | `avg_ticket_preference↓` / `traffic_volume_preference↑` / `budget_level↓`              |
| B. 분위기가 좋아 멀리서도 찾는 명소    | `avg_ticket_preference↑` / `female_preference_level↑` / `space_efficiency_preference↑` |
| C. 꾸준히 장사하는 단골집              | `stability_level↑` / `resident_focus_level↑` / `rent_sensitivity_level↑`               |
| D. 요즘 가장 뜨는 핫 플레이스          | `competition_tolerance_level↑` / `target_age_20_level↑` / `target_age_30_level↑`       |

## Q4. 자주 가거나 살고 싶은 장소는 어디인가요?

_단일 선택_

| 선택지                                             | 파라미터                                                                          |
| -------------------------------------------------- | --------------------------------------------------------------------------------- |
| A. 지하철역 바로 앞이라 늘 사람이 많은 곳          | `subway_dependency_level↑` / `traffic_volume_preference↑` / `worker_focus_level↑` |
| B. 아파트 단지 옆이라 주민들이 자주 오가는 곳      | `resident_focus_level↑` / `stability_level↑` / `rent_sensitivity_level↑`          |
| C. 오피스 빌딩 사이처럼 직장인이 많은 곳           | `worker_focus_level↑` / `lunch_preference_level↑` / `traffic_volume_preference↑`  |
| D. 골목 안쪽이라 조용하지만 단골이 생길 수 있는 곳 | `resident_focus_level↑` / `subway_dependency_level↓` / `stability_level↑`         |

## Q5. 창업 관련 콘텐츠를 볼 때 가장 끌리는 장면은 어떤 모습인가요?

_단일 선택_

| 선택지                                           | 파라미터                                                                                     |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| A. 작은 공간에서 혼자 깔끔하게 운영하는 1인 가게 | `space_efficiency_preference↑` / `labor_intensity_tolerance↓` / `budget_level↓`              |
| B. 직원들과 함께 바쁘게 돌아가는 가게            | `labor_intensity_tolerance↑` / `traffic_volume_preference↑` / `competition_tolerance_level↑` |
| C. 검증된 프랜차이즈를 안정적으로 운영하는 가게  | `franchise_affinity_level↑` / `stability_level↑` / `budget_level↑`                           |
| D. 독립 브랜드로 자기 색깔을 만드는 가게         | `competition_tolerance_level↑` / `avg_ticket_preference↑` / `franchise_affinity_level↓`      |

## Q6. 돈을 쓸 때 나는 어떤 편인가요?

_단일 선택_

| 선택지                                        | 파라미터                                                               |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| A. 일단 적게 쓰고 상황을 보면서 늘리는 편     | `budget_level↓` / `rent_sensitivity_level↑` / `stability_level↑`       |
| B. 필요하다고 느끼면 좋은 것에 확실히 쓰는 편 | `budget_level↑` / `avg_ticket_preference↑` / `rent_sensitivity_level↓` |
| C. 고정비를 줄이고 현금 여유를 남겨 두는 편   | `rent_sensitivity_level↑` / `budget_level↓` / `stability_level↑`       |
| D. 초기에 크게 투자하고 빠르게 회수하는 편    | `budget_level↑` / `competition_tolerance_level↑` / `stability_level↓`  |

## Q7. 어떤 손님이 가장 반가울 것 같나요?

_단일 선택_

| 선택지                                       | 파라미터                                                                      |
| -------------------------------------------- | ----------------------------------------------------------------------------- |
| A. 10대와 20대 손님이 사진 찍고 공유해 줄 때 | `target_age_10_level↑` / `target_age_20_level↑` / `female_preference_level↑`  |
| B. 20대와 30대 또래 손님이 자주 들를 때      | `target_age_20_level↑` / `target_age_30_level↑` / `evening_preference_level↑` |
| C. 30대와 40대 손님이 재방문해 줄 때         | `target_age_30_level↑` / `target_age_40_level↑` / `weekend_preference_level↑` |
| D. 50대 이상 단골이 꾸준히 다시 찾아올 때    | `target_age_50_plus_level↑` / `stability_level↑` / `resident_focus_level↑`    |

## Q8. 평소 경쟁자가 생길 때 어떤 기분인가요?

_단일 선택_

| 선택지                                               | 파라미터                                                                      |
| ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| A. 내 분야가 인기가 있다는 뜻 같아서 오히려 반가워요 | `competition_tolerance_level↑` / `traffic_volume_preference↑` / `rent_sensitivity_level↑`                 |
| B. 신경쓰지 않고 내가 더 잘하면 된다고 생각해요      | `competition_tolerance_level↑` / `stability_level↑` / `rent_sensitivity_level↑`                           |
| C. 그런 상황은 불편해서 피하고 싶어요                | `competition_tolerance_level↓` / `stability_level↑` / `resident_focus_level↑` / `rent_sensitivity_level↑` |
| D. 경쟁 점점 더 치열해질까 봐 걱정이 먼저 앞서요     | `competition_tolerance_level↓` / `rent_sensitivity_level↑` / `budget_level↓`  |

## Q9. 가게를 어떻게 운영하고 싶으신가요?

_단일 선택_

| 선택지                                        | 파라미터                                                                                     |
| --------------------------------------------- | -------------------------------------------------------------------------------------------- |
| A. 혼자 하거나 최소 인원으로 가볍게 운영하기  | `labor_intensity_tolerance↓` / `space_efficiency_preference↑` / `stability_level↑`           |
| B. 팀을 꾸려서 바쁘게 굴리기                  | `labor_intensity_tolerance↑` / `traffic_volume_preference↑` / `competition_tolerance_level↑` |
| C. 검증된 시스템과 매뉴얼로 체계적으로 일하기 | `franchise_affinity_level↑` / `stability_level↑` / `labor_intensity_tolerance↓`              |
| D. 조금 복잡해도 내 방식대로 운영하기         | `franchise_affinity_level↓` / `competition_tolerance_level↑` / `avg_ticket_preference↑`      |

## Q10. 손님들이 어떻게 찾아오면 좋겠어요?

_단일 선택_

| 선택지                                                 | 파라미터                                                                              |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| A. 점심 시간대에 한 번에 짧고 굵게 찾아오기            | `lunch_preference_level↑` / `worker_focus_level↑` / `traffic_volume_preference↑`      |
| B. 평일 퇴근 후 저녁 시간대에 천천히 꾸준하게 찾아오기 | `evening_preference_level↑` / `stability_level↑`                                      |
| C. 주말 동안 가족이나 커플 단위의 손님들이 찾아오기    | `weekend_preference_level↑` / `target_age_30_level↑` / `target_age_40_level↑`         |
| D. 매일 늦은 밤에도 젊은 손님들이 찾아오기             | `late_night_preference_level↑` / `evening_preference_level↑` / `target_age_20_level↑` |

## Q11. 어떤 분위기의 공간을 선호하시나요?

_단일 선택_

| 선택지                                         | 파라미터                                                                                 |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| A. 넓고 여유롭고 오래 머물 수 있는 공간        | `space_efficiency_preference↓` / `avg_ticket_preference↑` / `female_preference_level↑`   |
| B. 작아도 효율적으로 돌아가고 회전이 빠른 공간 | `space_efficiency_preference↑` / `traffic_volume_preference↑` / `avg_ticket_preference↓` |
| C. 사진 찍고 싶을 만큼 분위기 있는 감성 공간   | `female_preference_level↑` / `avg_ticket_preference↑` / `evening_preference_level↑`      |
| D. 화려하지 않아도 실용적이고 깔끔한 공간      | `franchise_affinity_level↑` / `budget_level↓` / `labor_intensity_tolerance↓`             |

## Q12. 5년 뒤 내 가게는 어떤 모습일까요? `최대 2개`

_복수 선택 (최대 2개)_

| 선택지                                           | 파라미터                                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------------------------ |
| A. 동네에서 모르는 사람이 없는 주민들의 단골가게 | `resident_focus_level↑` / `stability_level↑` / `target_age_40_level↑`                |
| B. 2호점과 3호점까지 확장하는 가게               | `competition_tolerance_level↑` / `traffic_volume_preference↑` / `budget_level↑`      |
| C. 직장인 시절보다 여유롭고 자유로운 가게        | `labor_intensity_tolerance↓` / `space_efficiency_preference↑` / `stability_level↑`   |
| D. SNS에서 인기 있는 트렌드한 가게               | `target_age_20_level↑` / `female_preference_level↑` / `competition_tolerance_level↑` |
| E. 직원들과 함께 오래 일하는 가족같은 가게       | `labor_intensity_tolerance↑` / `stability_level↑` / `avg_ticket_preference↑`         |

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
