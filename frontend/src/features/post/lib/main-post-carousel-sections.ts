import type { MainPostCarouselSection } from "@/features/post/types/post-carousel"

// 메인 게시글 캐러셀 섹션을 모아 두고, 반복과 노출 순서는 위젯이 제어한다.
export const mainPostCarouselSections: MainPostCarouselSection[] = [
  {
    id: "trend",
    title: "트렌드 예측 리포트",
    description: "상권 변화와 신규 업종 흐름을 빠르게 읽는 게시글입니다.",
    posts: [
      {
        id: "trend-1",
        title:
          "2026 서울시 신규 자영업 트렌드: 소규모 배달 전문 vs 초대형 쇼룸 카페",
        summary:
          "금리 하락기에 맞물린 서울 주요 상권의 상반된 트렌드를 조명합니다. 소자본 1인 창업과 하이엔드 오프라인 매장의 생존 전략을 데이터로 분석했습니다.",
        category: "Trend",
        readTime: "5분 분량",
        date: "2026-06-10",
      },
      {
        id: "trend-2",
        title: "성수동 팝업스토어 성황, 배후 상권 식음료 매출 효과는?",
        summary:
          "성수동 테마팝업 오픈 시 반경 300m 이내 일반 요식업 매장의 카드 결제 횟수와 주말 매출 상승 추이를 분석했습니다.",
        category: "Trend",
        readTime: "4분 분량",
        date: "2026-05-28",
      },
      {
        id: "trend-3",
        title: "홍대/합정 야간 유동인구 회복, 주점 창업 타이밍은 언제인가",
        summary:
          "야간 시간대 유입이 회복되는 상권에서 임대료 상승 전에 확인해야 할 업종별 손익분기 기준을 정리했습니다.",
        category: "Trend",
        readTime: "6분 분량",
        date: "2026-05-20",
      },
    ],
  },
  {
    id: "guide",
    title: "창업 실무 가이드",
    description: "초기 창업자가 바로 써먹을 수 있는 실행 체크리스트입니다.",
    posts: [
      {
        id: "guide-1",
        title: "동네 상권에서 1등 하기: 로컬 브랜딩 방법론",
        summary:
          "대형 상권이 아닌 주거밀착형 상권에서 재방문율을 확보한 반찬전문점, 골목 베이커리 대표의 단골 확보 노하우입니다.",
        category: "Guide",
        readTime: "6분 분량",
        date: "2026-05-15",
      },
      {
        id: "guide-2",
        title: "첫 매장 계약 전 확인해야 하는 권리금, 보증금, 원상복구 항목",
        summary:
          "계약서 날인 전 임대인과 반드시 합의해야 하는 비용 항목과 특약 문구를 창업자 관점에서 정리했습니다.",
        category: "Guide",
        readTime: "7분 분량",
        date: "2026-05-08",
      },
      {
        id: "guide-3",
        title: "프랜차이즈 본사 미팅에서 물어봐야 할 12가지 질문",
        summary:
          "가맹비, 물류 마진, 폐점률, 슈퍼바이저 운영 방식까지 본사 상담에서 놓치기 쉬운 질문을 모았습니다.",
        category: "Guide",
        readTime: "5분 분량",
        date: "2026-04-29",
      },
    ],
  },
  {
    id: "policy",
    title: "정책/법률 업데이트",
    description: "창업 비용과 리스크에 직접 영향을 주는 제도 변경입니다.",
    posts: [
      {
        id: "policy-1",
        title:
          "상가 임대차 보호법 개정안 핵심 가이드: 환산보증금과 권리금 보장 범위",
        summary:
          "초보 창업가가 계약서 날인 전에 반드시 알아야 할 법률적 체크포인트와 임대료 연 상승 한도 계산법을 예시와 함께 설명합니다.",
        category: "Policy",
        readTime: "7분 분량",
        date: "2026-06-05",
      },
      {
        id: "policy-2",
        title: "소상공인 정책자금 신청 전 준비해야 하는 매출 추정 자료",
        summary:
          "예비 창업자가 정책자금 심사에서 설득력을 높이기 위해 준비해야 하는 상권 분석 자료와 비용 계획입니다.",
        category: "Policy",
        readTime: "5분 분량",
        date: "2026-05-31",
      },
      {
        id: "policy-3",
        title: "음식점 창업 인허가 체크리스트: 영업신고부터 위생교육까지",
        summary:
          "일반음식점, 휴게음식점, 제과점 업종별로 달라지는 인허가 순서와 누락하기 쉬운 제출 서류를 정리했습니다.",
        category: "Policy",
        readTime: "6분 분량",
        date: "2026-05-22",
      },
    ],
  },
]
