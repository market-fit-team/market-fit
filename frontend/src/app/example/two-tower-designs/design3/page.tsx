// frontend/src/app/example/two-tower-designs/design3/page.tsx
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  Building,
  Check,
  Search,
  Sparkles,
} from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import { Input } from "@/shared/components/ui/input"
import { Progress } from "@/shared/components/ui/progress"
import { CATEGORIES, QUESTIONS, encodeAnswers } from "./_fixtures/mockData"

export default function Design3SurveyPage() {
  const router = useRouter()

  // 설문 상태 관리
  const [step, setStep] = React.useState<number>(0) // 0: 업종 선택, 1~10: 질문지 문항
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(
    null
  )
  const [answers, setAnswers] = React.useState<
    Record<string, string | string[]>
  >({})
  const [searchQuery, setSearchQuery] = React.useState<string>("")
  const [isAnalyzing, setIsAnalyzing] = React.useState<boolean>(false)
  const [analysisProgress, setAnalysisProgress] = React.useState<number>(0)
  const [analysisText, setAnalysisText] = React.useState<string>("")

  // 업종 필터링
  const filteredCategories = CATEGORIES.filter(
    (cat) =>
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 단일 선택형 답변 핸들러
  const handleSingleSelect = (questionId: string, optionCode: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionCode,
    }))

    // 사용자 경험을 위해 자동 다음 단계로 전환 (딜레이를 주어 피드백 확인)
    setTimeout(() => {
      setStep((prev) => prev + 1)
    }, 250)
  }

  // 복수 선택형 답변 핸들러 (최대 3개)
  const handleMultiSelect = (questionId: string, optionCode: string) => {
    const currentSelections = (answers[questionId] as string[]) || []
    let updated: string[]

    if (currentSelections.includes(optionCode)) {
      updated = currentSelections.filter((code) => code !== optionCode)
    } else {
      if (currentSelections.length >= 3) {
        // 이미 3개가 선택된 상태라면 추가하지 않음
        return
      }
      updated = [...currentSelections, optionCode]
    }

    setAnswers((prev) => ({
      ...prev,
      [questionId]: updated,
    }))
  }

  // 설문 완료 후 추천 모델링 연산 애니메이션 구동
  const handleSubmit = () => {
    setIsAnalyzing(true)
    setAnalysisProgress(0)

    const logs = [
      "성향 설문 데이터 파싱 중...",
      "창업자 성향(User Tower) 임베딩 벡터 생성 완료.",
      "서울시 15개 대표 상권 데이터셋(Commercial Tower) 대조 중...",
      "Two-Tower 모델 Cosine Similarity 내적 연산 수행 중...",
      "매칭 지표 분석 및 최종 추천 리스트 랭킹 구축 완료!",
    ]

    let currentLogIndex = 0
    setAnalysisText(logs[0])

    const interval = setInterval(() => {
      setAnalysisProgress((prev) => {
        const next = prev + 10
        if (next >= 100) {
          clearInterval(interval)
          // 최종 연산 완료 후 리다이렉트
          if (selectedCategory) {
            const code = encodeAnswers(selectedCategory, answers)
            router.push(`/example/two-tower-designs/design3/${code}`)
          }
          return 100
        }

        // 진행도에 따라 매칭 과정 로그 변경
        const logIndex = Math.min(
          Math.floor((next / 100) * logs.length),
          logs.length - 1
        )
        if (logIndex !== currentLogIndex) {
          currentLogIndex = logIndex
          setAnalysisText(logs[logIndex])
        }

        return next
      })
    }, 200)
  }

  // 현재 문항 정보
  const currentQuestion = QUESTIONS[step - 1]
  const progressValue = (step / QUESTIONS.length) * 100

  // 다음 버튼 활성화 여부
  const isNextDisabled = () => {
    if (step === 0) return !selectedCategory
    const currentAns = answers[currentQuestion.id]
    if (currentQuestion.type === "multi") {
      return !currentAns || (currentAns as string[]).length === 0
    }
    return !currentAns
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #020617 100%)",
        color: "#f8fafc",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 백그라운드 디자인 데코레이션 */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "5%",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)",
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          right: "5%",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(236, 72, 153, 0.1) 0%, transparent 70%)",
          filter: "blur(50px)",
          pointerEvents: "none",
        }}
      />

      {/* 분석 시뮬레이션 화면 overlay */}
      {isAnalyzing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(2, 6, 17, 0.95)",
            backdropFilter: "blur(12px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              maxWidth: "450px",
              width: "100%",
              padding: "2rem",
              textAlign: "center",
            }}
          >
            <div
              style={{
                position: "relative",
                display: "inline-block",
                marginBottom: "2rem",
              }}
            >
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  border: "3px solid rgba(99, 102, 241, 0.2)",
                  borderTopColor: "#6366f1",
                  animation: "spin 1s linear infinite",
                }}
              />
              <Sparkles
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  color: "#a5b4fc",
                  width: "32px",
                  height: "32px",
                }}
              />
            </div>

            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: "700",
                marginBottom: "1rem",
                color: "#e2e8f0",
              }}
            >
              성향 매칭 알고리즘 가동 중
            </h2>
            <p
              style={{
                fontSize: "0.875rem",
                color: "#94a3b8",
                height: "40px",
                marginBottom: "2rem",
              }}
            >
              {analysisText}
            </p>

            <div
              style={{
                width: "100%",
                background: "rgba(255, 255, 255, 0.05)",
                height: "6px",
                borderRadius: "3px",
                overflow: "hidden",
                marginBottom: "0.5rem",
              }}
            >
              <div
                style={{
                  width: `${analysisProgress}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #6366f1, #ec4899)",
                  transition: "width 0.2s ease-out",
                }}
              />
            </div>
            <div
              style={{
                textAlign: "right",
                fontSize: "0.75rem",
                color: "#64748b",
              }}
            >
              {analysisProgress}% Complete
            </div>
          </div>
        </div>
      )}

      {/* 헤더 타이틀 */}
      <header style={{ textAlign: "center", marginBottom: "2rem", zIndex: 10 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1rem",
            borderRadius: "9999px",
            background: "rgba(99, 102, 241, 0.1)",
            border: "1px solid rgba(99, 102, 241, 0.2)",
            marginBottom: "0.75rem",
          }}
        >
          <Sparkles
            style={{ width: "14px", height: "14px", color: "#818cf8" }}
          />
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: "600",
              letterSpacing: "0.05em",
              color: "#a5b4fc",
            }}
          >
            TWO-TOWER RECOMMENDATION SYSTEM
          </span>
        </div>
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: "800",
            background: "linear-gradient(to right, #ffffff, #cbd5e1)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          창업 성향 및 상권 추천 진단
        </h1>
        <p
          style={{
            color: "#94a3b8",
            fontSize: "0.875rem",
            marginTop: "0.5rem",
          }}
        >
          성향과 투자 여건에 완벽히 매칭되는 서울시 최적 상권을 찾아드립니다.
        </p>
      </header>

      {/* 메인 설문 카드 */}
      <main style={{ width: "100%", maxWidth: "600px", zIndex: 10 }}>
        <Card
          style={{
            background: "rgba(30, 41, 59, 0.45)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "16px",
            boxShadow:
              "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)",
            overflow: "visible",
          }}
        >
          {/* 상단 프로그레스 바 */}
          {step > 0 && (
            <div style={{ padding: "1.5rem 1.5rem 0 1.5rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.5rem",
                  fontSize: "0.75rem",
                  color: "#94a3b8",
                }}
              >
                <span>
                  질문 {step} / {QUESTIONS.length}
                </span>
                <span style={{ color: "#818cf8", fontWeight: "600" }}>
                  {Math.round(progressValue)}% 완료
                </span>
              </div>
              <Progress value={progressValue} className="h-1.5 bg-slate-800" />
            </div>
          )}

          {step === 0 ? (
            /* STEP 0: 업종 선택 */
            <>
              <CardHeader style={{ padding: "2rem 1.5rem 1rem 1.5rem" }}>
                <CardTitle
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: "700",
                    color: "#f8fafc",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Building
                    style={{ color: "#818cf8", width: "20px", height: "20px" }}
                  />
                  희망 업종 선택
                </CardTitle>
                <CardDescription
                  style={{ color: "#94a3b8", fontSize: "0.875rem" }}
                >
                  창업을 희망하시는 상세 업종을 선택해주세요. 해당 카테고리의
                  실제 매출 추이와 연동하여 분석합니다.
                </CardDescription>
              </CardHeader>

              <CardContent style={{ padding: "0 1.5rem 1.5rem 1.5rem" }}>
                {/* 업종 검색바 */}
                <div style={{ position: "relative", marginBottom: "1.5rem" }}>
                  <Search
                    style={{
                      position: "absolute",
                      left: "0.75rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#64748b",
                      width: "16px",
                      height: "16px",
                    }}
                  />
                  <Input
                    type="text"
                    placeholder="업종명 또는 설명 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      paddingLeft: "2.25rem",
                      background: "rgba(15, 23, 42, 0.6)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#ffffff",
                    }}
                  />
                </div>

                {/* 업종 리스트 그리드 */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "1rem",
                    maxHeight: "360px",
                    overflowY: "auto",
                    paddingRight: "4px",
                  }}
                >
                  {filteredCategories.map((cat) => {
                    const isSelected = selectedCategory === cat.code
                    return (
                      <div
                        key={cat.code}
                        onClick={() => setSelectedCategory(cat.code)}
                        style={{
                          background: isSelected
                            ? "rgba(99, 102, 241, 0.15)"
                            : "rgba(15, 23, 42, 0.4)",
                          border: isSelected
                            ? "2px solid #6366f1"
                            : "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: "12px",
                          padding: "1rem",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "0.75rem",
                          position: "relative",
                        }}
                      >
                        <span style={{ fontSize: "1.75rem" }}>{cat.emoji}</span>
                        <div>
                          <h3
                            style={{
                              fontSize: "0.875rem",
                              fontWeight: "600",
                              color: isSelected ? "#a5b4fc" : "#f8fafc",
                            }}
                          >
                            {cat.name}
                          </h3>
                          <p
                            style={{
                              fontSize: "0.75rem",
                              color: "#64748b",
                              marginTop: "0.25rem",
                            }}
                          >
                            {cat.description}
                          </p>
                        </div>
                        {isSelected && (
                          <div
                            style={{
                              position: "absolute",
                              top: "0.5rem",
                              right: "0.5rem",
                              background: "#6366f1",
                              borderRadius: "50%",
                              padding: "2px",
                            }}
                          >
                            <Check
                              style={{
                                width: "12px",
                                height: "12px",
                                color: "#ffffff",
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {filteredCategories.length === 0 && (
                    <div
                      style={{
                        gridColumn: "1 / -1",
                        textAlign: "center",
                        padding: "2rem",
                        color: "#64748b",
                        fontSize: "0.875rem",
                      }}
                    >
                      검색된 업종이 없습니다.
                    </div>
                  )}
                </div>
              </CardContent>
            </>
          ) : (
            /* STEP 1~10: 설문 문항 */
            <>
              <CardHeader style={{ padding: "2rem 1.5rem 1rem 1.5rem" }}>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "#818cf8",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Question {step}
                </span>
                <CardTitle
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: "700",
                    color: "#ffffff",
                    lineHeight: "1.5",
                    marginTop: "0.25rem",
                  }}
                >
                  {currentQuestion.prompt}
                </CardTitle>
                {currentQuestion.type === "multi" && (
                  <CardDescription style={{ color: "#94a3b8" }}>
                    가장 부합하는 보기를 최대 3개까지 선택해 주세요.
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent style={{ padding: "0 1.5rem 1.5rem 1.5rem" }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  {currentQuestion.options.map((opt) => {
                    const ans = answers[currentQuestion.id]
                    const isSelected =
                      currentQuestion.type === "multi"
                        ? Array.isArray(ans) && ans.includes(opt.code)
                        : ans === opt.code

                    return (
                      <div
                        key={opt.code}
                        onClick={() => {
                          if (currentQuestion.type === "multi") {
                            handleMultiSelect(currentQuestion.id, opt.code)
                          } else {
                            handleSingleSelect(currentQuestion.id, opt.code)
                          }
                        }}
                        style={{
                          background: isSelected
                            ? "rgba(99, 102, 241, 0.12)"
                            : "rgba(15, 23, 42, 0.4)",
                          border: isSelected
                            ? "1.5px solid #6366f1"
                            : "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: "10px",
                          padding: "1rem 1.25rem",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.875rem",
                          }}
                        >
                          <span
                            style={{
                              width: "24px",
                              height: "24px",
                              borderRadius: "6px",
                              background: isSelected
                                ? "#6366f1"
                                : "rgba(255, 255, 255, 0.05)",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.75rem",
                              fontWeight: "700",
                              color: isSelected ? "#ffffff" : "#94a3b8",
                            }}
                          >
                            {opt.code}
                          </span>
                          <span
                            style={{
                              fontSize: "0.875rem",
                              color: isSelected ? "#e2e8f0" : "#cbd5e1",
                            }}
                          >
                            {opt.label}
                          </span>
                        </div>

                        {isSelected && (
                          <Check
                            style={{
                              width: "16px",
                              height: "16px",
                              color: "#818cf8",
                            }}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </>
          )}

          {/* 하단 제어 바 */}
          <CardFooter
            style={{
              padding: "1.5rem",
              borderTop: "1px solid rgba(255, 255, 255, 0.05)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "rgba(15, 23, 42, 0.2)",
              borderBottomLeftRadius: "16px",
              borderBottomRightRadius: "16px",
            }}
          >
            {step > 0 ? (
              <Button
                variant="outline"
                onClick={() => setStep((prev) => prev - 1)}
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#cbd5e1",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <ArrowLeft style={{ width: "14px", height: "14px" }} />
                이전
              </Button>
            ) : (
              <div />
            )}

            {step < QUESTIONS.length ? (
              <Button
                onClick={() => setStep((prev) => prev + 1)}
                disabled={isNextDisabled()}
                style={{
                  background: isNextDisabled()
                    ? "rgba(255, 255, 255, 0.05)"
                    : "linear-gradient(90deg, #6366f1, #4f46e5)",
                  color: isNextDisabled() ? "#64748b" : "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  border: "none",
                }}
              >
                다음
                <ArrowRight style={{ width: "14px", height: "14px" }} />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isNextDisabled()}
                style={{
                  background: "linear-gradient(90deg, #6366f1, #ec4899)",
                  border: "none",
                  fontWeight: "700",
                  color: "#ffffff",
                  padding: "0 1.25rem",
                  boxShadow: "0 10px 15px -3px rgba(99, 102, 241, 0.3)",
                }}
              >
                진단 결과 분석하기
                <Sparkles
                  style={{
                    width: "14px",
                    height: "14px",
                    marginLeft: "0.5rem",
                  }}
                />
              </Button>
            )}
          </CardFooter>
        </Card>
      </main>

      {/* CSS 스핀 애니메이션 정의 */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `,
        }}
      />
    </div>
  )
}
