# onboarding-service/.sample

`backend/services/onboarding-service/.sample`은 학습 파이프라인 개발용 축약 데이터다.
원본 CSV는 `.temp/.raw/` 또는 서비스 내부 `.raw/`에 두고, 샘플 파일만 git으로 관리한다.

```text
backend/services/onboarding-service/
├── .sample/
│   ├── estimated_sales_hdong_2025.sample.csv
│   ├── store_hdong_2025.sample.csv
│   ├── small_business_activity_by_sector.sample.csv
│   └── user_tower_profiles.sample.jsonl
└── app/models/
```

## CSV

모든 샘플 CSV는 UTF-8이다.
상권분석서비스 원본 중 `cp949` 또는 `euc-kr`로 내려받힌 파일은 UTF-8로 변환한다.
`small_business_activity_by_sector.sample.csv`는 원본이 `utf-8-sig` 2행 헤더라서 헤더 2행과 데이터 5행을 담는다.

| 파일 | 원본 데이터 | 행 | 모델링 메모 |
| --- | --- | ---: | --- |
| `estimated_sales_hdong_2025.sample.csv` | 서울시 상권분석서비스 추정매출-행정동 | 6 | `기준_년분기_코드`, `행정동_코드`, `서비스_업종_코드`별 `당월_매출_금액`, `당월_매출_건수` |
| `store_hdong_2025.sample.csv` | 서울시 상권분석서비스 점포-행정동 | 6 | `점포_수`, `유사_업종_점포_수`, `개업_율`, `폐업_률`, `프랜차이즈_점포_수`를 확인한다. |
| `consumption_hdong.sample.csv` | 서울시 상권분석서비스 소비-행정동 | 6 | 행정동별 소비 지출 총액과 품목별 지출 |
| `resident_population_hdong.sample.csv` | 서울시 상권분석서비스 상주인구-행정동 | 6 | 행정동별 상주인구, 성별/연령대, 가구 수 |
| `working_population_hdong.sample.csv` | 서울시 상권분석서비스 직장인구-행정동 | 6 | 행정동별 직장인구, 성별/연령대 |
| `apartment_hdong.sample.csv` | 서울시 상권분석서비스 아파트-행정동 | 6 | 행정동별 아파트 단지, 면적/가격대, 평균 면적/시가 |
| `attraction_facilities_hdong.sample.csv` | 서울시 상권분석서비스 집객시설-행정동 | 6 | 행정동별 관공서, 병원, 학교, 지하철역, 버스정거장 수 |
| `living_population_hdong_domestic.sample.csv` | 행정동 단위 서울 생활인구 내국인 | 6 | `기준일ID`, `시간대구분`, `행정동코드`별 생활인구 |
| `subway_station_hourly_ridership.sample.csv` | 서울시 지하철 호선별 역별 시간대별 승하차 인원 | 6 | 역/호선/월별 시간대 승하차. 행정동 결합에는 역-행정동 매핑이 더 필요하다. |
| `small_business_activity_by_sector.sample.csv` | 서울시 영세자영업 경영활동 현황 업종별 | 9 | 업종별 운영점포수, 종사자수, 평균영업기간, 면적당매출액, 면적당종사자수를 확인한다. |

## user_tower_profiles.sample.jsonl

`user_tower_profiles.sample.jsonl`은 현재 `app.models.onboarding_two_tower` 학습과 런타임 예시 프로필에 같이 쓰인다.

```text
rows = 6
format = JSON Lines
```

`preferred_category_code`는 `estimated_sales_hdong_2025.sample.csv`의 `서비스_업종_코드`를 사용한다.

## 원본 인코딩

이번에 추가한 샘플의 원본 인코딩은 서로 다르다.

```text
서울시 상권분석서비스(점포-행정동)_2025년.csv
-> euc-kr

영세자영업 경영활동 현황(업종별)_20260622200751.csv
-> utf-8-sig
```

샘플 생성 시에는 UTF-8로 다시 저장한다.

## 주요 파일

- `backend/services/onboarding-service/.sample/estimated_sales_hdong_2025.sample.csv`
- `backend/services/onboarding-service/.sample/store_hdong_2025.sample.csv`
- `backend/services/onboarding-service/.sample/small_business_activity_by_sector.sample.csv`
- `backend/services/onboarding-service/.sample/user_tower_profiles.sample.jsonl`
- `backend/services/onboarding-service/app/models/subway_commercial_trend_score/features.py`
- `backend/services/onboarding-service/app/models/onboarding_two_tower/user_profiles.py`

## 참고 문서

- 서울시 상권분석서비스(추정매출-행정동): `https://data.seoul.go.kr/dataList/OA-22175/S/1/datasetView.do`
- 서울시 상권분석서비스(점포-행정동): `https://data.seoul.go.kr/dataList/OA-22172/S/1/datasetView.do`
- 서울시 상권분석서비스(소비-행정동): `https://data.seoul.go.kr/dataList/OA-22166/S/1/datasetView.do`
- 서울시 상권분석서비스(상주인구-행정동): `https://data.seoul.go.kr/dataList/OA-22183/S/1/datasetView.do`
- 서울시 상권분석서비스(직장인구-행정동): `https://data.seoul.go.kr/dataList/OA-22184/S/1/datasetView.do`
- 서울시 상권분석서비스(아파트-행정동): `https://data.seoul.go.kr/dataList/OA-22163/S/1/datasetView.do`
- 서울시 상권분석서비스(집객시설-행정동): `https://data.seoul.go.kr/dataList/OA-22169/A/1/datasetView.do`
- 행정동 단위 서울 생활인구(내국인): `https://data.seoul.go.kr/dataList/OA-14991/S/1/datasetView.do`
- 서울시 지하철 호선별 역별 시간대별 승하차 인원 정보: `https://data.seoul.go.kr/dataList/OA-12252/S/1/datasetView.do`
- 서울시 영세자영업 경영활동 현황(업종별): `https://data.seoul.go.kr/dataList/OA-21398/S/1/datasetView.do`
