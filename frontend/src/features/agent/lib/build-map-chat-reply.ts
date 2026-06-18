import type { ChatMessage } from "@/features/agent/types/chat"
import type { DistrictData } from "@/features/startup/lib/data"

// 현재 와이어프레임용 임시 지도 에이전트 응답이다.
// 실제 에이전트 API가 응답을 제공하면 이 파일을 교체한다.
export const initialMapChatMessage: ChatMessage = {
  role: "assistant",
  content:
    "안녕하세요! Gemini 15 AI 창업 비서입니다. 왼쪽 지도에서 행정동 상권을 탭해 매출 및 유동인구를 비교하시거나, 창업 관련 질문을 편하게 말씀해 주세요.",
}

export const mapChatPresetPrompts = [
  {
    text: "주말 업종 매출액 비중",
    prompt: "상권의 주말 업종 매출액 비중을 요약해 줘.",
  },
  {
    text: "과포화 업종 및 위험성",
    prompt: "상권 내 과포화 업종과 폐업 방지 대책을 알려줘.",
  },
  {
    text: "입점 추천 가맹본부 후보",
    prompt: "이곳에 창업 가능한 유력 프랜차이즈는?",
  },
] as const

export const buildMapChatReply = ({
  text,
  selectedTradeArea,
}: {
  text: string
  selectedTradeArea: DistrictData | null
}) => {
  const tradeAreaName = selectedTradeArea
    ? selectedTradeArea.nameKo
    : "해당 상권"
  const normalizedText = text.toLowerCase()

  if (normalizedText.includes("매출") || normalizedText.includes("돈")) {
    return `${tradeAreaName}의 최근 카드사 결제 정보를 분석하면 주말 매출 점유율이 42.1%로 높으며, 식음료 매장당 월평균 결제 단가는 24,500원선으로 안정적인 성장을 기록 중입니다.`
  }

  if (
    normalizedText.includes("생존") ||
    normalizedText.includes("폐업") ||
    normalizedText.includes("위험")
  ) {
    return `${tradeAreaName}의 3년차 가맹점 생존율은 ${selectedTradeArea?.survivalRate3Year}%로 양호한 편이나, 특정 커피 전문점 브랜드들이 과포화 상태이므로 차별화된 F&B 아이템 선정이 필요합니다.`
  }

  if (
    normalizedText.includes("추천") ||
    normalizedText.includes("프랜차이즈")
  ) {
    const brands = selectedTradeArea?.recommendedFranchises
      .map((franchise) => franchise.name)
      .join(", ")

    return `${tradeAreaName}의 매출 연령 비중상 [ ${brands} ] 가맹점이 적합도가 높으며, 초기 창업 비용은 최소 입점 비용과 권리금을 조율할 필요가 있습니다.`
  }

  return `입력하신 창업 실무 조언을 소상공인 정책 대출 및 화재 보험 보장 요율 데이터베이스와 결합하여 검토한 결과, ${tradeAreaName}은 주중 직장인과 주말 2030 유동층이 조화를 이루는 비즈니스 구조를 띄고 있어 리스크가 낮습니다.`
}
