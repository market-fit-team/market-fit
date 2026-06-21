// frontend/src/app/example/two-tower-designs/design3/[res]/page.tsx
"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowRight,
  Bookmark,
  Building,
  Compass,
  DollarSign,
  ExternalLink,
  MapPin,
  RotateCcw,
  Share2,
  Sliders,
  TrendingUp,
  Users,
} from "lucide-react"
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts"
import { toast } from "sonner"
import { Button } from "@/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import { Toaster } from "@/shared/components/ui/sonner"
import {
  CATEGORIES,
  calculateProfile,
  decodeAnswers,
  encodeAnswers,
  recommendAreas,
} from "../_fixtures/mockData"

export default function Design3ResultsPage() {
  const params = useParams()
  const router = useRouter()
  const resCode = params.res as string

  // URL에서 복원한 최초의 설문 답변 및 업종
  const { categoryCode, answers } = React.useMemo(() => {
    return decodeAnswers(resCode)
  }, [resCode])

  const category = React.useMemo(() => {
    return CATEGORIES.find((c) => c.code === categoryCode) || CATEGORIES[1]
  }, [categoryCode])

  // 설문으로부터 계산된 초기 사용자 프로필 벡터
  const initialProfile = React.useMemo(() => {
    return calculateProfile(categoryCode, answers)
  }, [categoryCode, answers])

  // 클라이언트 측 미세조정을 위한 상태 관리
  const [profileVector, setProfileVector] = React.useState({
    budget_level: initialProfile.budget_level,
    stability_level: initialProfile.stability_level,
    subway_dependency_level: initialProfile.subway_dependency_level,
    weekend_preference_level: initialProfile.weekend_preference_level,
    evening_preference_level: initialProfile.evening_preference_level,
    resident_focus_level: initialProfile.resident_focus_level,
    worker_focus_level: initialProfile.worker_focus_level,
    rent_sensitivity_level: initialProfile.rent_sensitivity_level,
    competition_tolerance_level: initialProfile.competition_tolerance_level,
  })

  // 설문 응답이 변경되면 상태 동기화 (렌더 타임 동기화 적용)
  const [prevInitialProfile, setPrevInitialProfile] =
    React.useState(initialProfile)
  if (initialProfile !== prevInitialProfile) {
    setPrevInitialProfile(initialProfile)
    setProfileVector({
      budget_level: initialProfile.budget_level,
      stability_level: initialProfile.stability_level,
      subway_dependency_level: initialProfile.subway_dependency_level,
      weekend_preference_level: initialProfile.weekend_preference_level,
      evening_preference_level: initialProfile.evening_preference_level,
      resident_focus_level: initialProfile.resident_focus_level,
      worker_focus_level: initialProfile.worker_focus_level,
      rent_sensitivity_level: initialProfile.rent_sensitivity_level,
      competition_tolerance_level: initialProfile.competition_tolerance_level,
    })
  }

  // 하이드레이션 오류 방지를 위한 마운트 상태
  const [isMounted, setIsMounted] = React.useState(false)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true)
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  // 저장 모달 및 공유 모달 제어 상태
  const [isSaveModalOpen, setIsSaveModalOpen] = React.useState(false)
  const [profileNameInput, setProfileNameInput] =
    React.useState("내 설문 저장본")

  // 실시간 추천 리스트 연산
  const recommendations = React.useMemo(() => {
    return recommendAreas(profileVector, categoryCode, 5)
  }, [profileVector, categoryCode])

  // 상세 보기로 활성화된 상권 ID 관리 (기본값은 1위 상권)
  const [activeAreaId, setActiveAreaId] = React.useState<number | null>(null)
  const activeArea = React.useMemo(() => {
    if (recommendations.length === 0) return null
    return (
      recommendations.find((r) => r.id === activeAreaId) || recommendations[0]
    )
  }, [recommendations, activeAreaId])

  // 슬라이더 값이 변경될 때 핸들러
  const handleVectorChange = (
    key: keyof typeof profileVector,
    value: number
  ) => {
    setProfileVector((prev) => ({
      ...prev,
      [key]: parseFloat(value.toFixed(2)),
    }))
  }

  // 설문 초기화 및 재시작
  const handleReset = () => {
    router.push("/example/two-tower-designs/design3")
  }

  // 설문 초기 벡터로 복원
  const handleRestoreInitial = () => {
    setProfileVector({
      budget_level: initialProfile.budget_level,
      stability_level: initialProfile.stability_level,
      subway_dependency_level: initialProfile.subway_dependency_level,
      weekend_preference_level: initialProfile.weekend_preference_level,
      evening_preference_level: initialProfile.evening_preference_level,
      resident_focus_level: initialProfile.resident_focus_level,
      worker_focus_level: initialProfile.worker_focus_level,
      rent_sensitivity_level: initialProfile.rent_sensitivity_level,
      competition_tolerance_level: initialProfile.competition_tolerance_level,
    })
    toast.success("설문 답변에 기반한 초기 성향 벡터로 초기화되었습니다.")
  }

  // 공유 링크 복사 핸들러
  const handleShare = () => {
    // 실시간 수정된 벡터를 반영한 새로운 링크 생성 가능
    const currentCode = encodeAnswers(categoryCode, answers) // 원본 설문 코드 사용 혹은 실시간 코딩 가능하나, 설문지 규격에 맞춰 원본 코드 공유
    const shareUrl = `${window.location.origin}/example/two-tower-designs/design3/${currentCode}`

    navigator.clipboard.writeText(shareUrl).then(
      () => {
        toast.success("공유 링크가 클립보드에 복사되었습니다!", {
          description:
            "친구에게 전송하여 동일한 분석 결과를 확인할 수 있습니다.",
        })
      },
      () => {
        toast.error(
          "링크 복사에 실패했습니다. 주소창의 URL을 직접 복사해주세요."
        )
      }
    )
  }

  // 프로필 저장 핸들러
  const handleSaveProfile = () => {
    setIsSaveModalOpen(false)
    toast.success(`'${profileNameInput}' 프로필 저장이 완료되었습니다!`, {
      description: `추천 코드: ${resCode.substring(0, 8)}... (회원 계정에 연동되었습니다)`,
    })
  }

  // 차트 가시성 및 가독성을 위한 데이터 포맷팅
  const chartData = React.useMemo(() => {
    if (!activeArea) return []

    // 매핑 키 정의
    const keysMap = [
      { subject: "자본규모", userKey: "budget_level", areaKey: "budget_level" },
      {
        subject: "안정성",
        userKey: "stability_level",
        areaKey: "stability_level",
      },
      {
        subject: "역세권",
        userKey: "subway_dependency_level",
        areaKey: "subway_dependency_level",
      },
      {
        subject: "주말집중",
        userKey: "weekend_preference_level",
        areaKey: "weekend_preference_level",
      },
      {
        subject: "저녁집중",
        userKey: "evening_preference_level",
        areaKey: "evening_preference_level",
      },
      {
        subject: "주거인구",
        userKey: "resident_focus_level",
        areaKey: "resident_focus_level",
      },
      {
        subject: "직장인구",
        userKey: "worker_focus_level",
        areaKey: "worker_focus_level",
      },
      {
        subject: "임대민감",
        userKey: "rent_sensitivity_level",
        areaKey: "rent_sensitivity_level",
      },
      {
        subject: "경쟁수용",
        userKey: "competition_tolerance_level",
        areaKey: "competition_tolerance_level",
      },
    ]

    return keysMap.map((item) => {
      const uVal =
        profileVector[item.userKey as keyof typeof profileVector] || 0.5
      const aVal =
        activeArea.vector[item.areaKey as keyof typeof activeArea.vector] || 0.5
      return {
        subject: item.subject,
        user: Math.round(uVal * 100),
        area: Math.round(aVal * 100),
        fullMark: 100,
      }
    })
  }, [profileVector, activeArea])

  // 상권 프로필 타입 다국어 라벨 변환
  const getAreaTypeLabel = (type: string) => {
    switch (type) {
      case "residential":
        return "주거 중심형"
      case "office":
        return "오피스 집중형"
      case "commercial":
        return "상업 중심형"
      case "mixed":
        return "복합 상권형"
      default:
        return "혼합형"
    }
  }

  // 상권 프로필 배지 컬러 클래스 반환
  const getAreaTypeBadgeStyles = (type: string) => {
    switch (type) {
      case "residential":
        return {
          bg: "rgba(16, 185, 129, 0.15)",
          text: "#10b981",
          border: "rgba(16, 185, 129, 0.3)",
        }
      case "office":
        return {
          bg: "rgba(59, 130, 246, 0.15)",
          text: "#3b82f6",
          border: "rgba(59, 130, 246, 0.3)",
        }
      case "commercial":
        return {
          bg: "rgba(245, 158, 11, 0.15)",
          text: "#f59e0b",
          border: "rgba(245, 158, 11, 0.3)",
        }
      case "mixed":
        return {
          bg: "rgba(139, 92, 246, 0.15)",
          text: "#8b5cf6",
          border: "rgba(139, 92, 246, 0.3)",
        }
      default:
        return {
          bg: "rgba(148, 163, 184, 0.15)",
          text: "#94a3b8",
          border: "rgba(148, 163, 184, 0.3)",
        }
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)",
        color: "#f8fafc",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        padding: "2rem 1.5rem",
      }}
    >
      <Toaster position="top-right" />

      {/* 헤더 바 */}
      <header
        style={{
          maxWidth: "1280px",
          margin: "0 auto 2.5rem auto",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1.5rem",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          paddingBottom: "1.5rem",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.5rem",
            }}
          >
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: "700",
                color: "#818cf8",
                background: "rgba(99, 102, 241, 0.1)",
                padding: "0.25rem 0.625rem",
                borderRadius: "9999px",
                border: "1px solid rgba(99, 102, 241, 0.2)",
              }}
            >
              {category.emoji} {category.name} 분석 리포트
            </span>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
              코드: {resCode}
            </span>
          </div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: "800",
              background: "linear-gradient(to right, #ffffff, #94a3b8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Two-Tower 상권 추천 매칭 진단서
          </h1>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Button
            variant="outline"
            onClick={handleRestoreInitial}
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#cbd5e1",
            }}
          >
            <RotateCcw
              style={{ width: "14px", height: "14px", marginRight: "0.5rem" }}
            />
            설문결과 복원
          </Button>
          <Button
            variant="outline"
            onClick={handleShare}
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#cbd5e1",
            }}
          >
            <Share2
              style={{ width: "14px", height: "14px", marginRight: "0.5rem" }}
            />
            결과 공유
          </Button>
          <Button
            onClick={() => setIsSaveModalOpen(true)}
            style={{
              background: "linear-gradient(90deg, #6366f1, #4f46e5)",
              color: "#ffffff",
              border: "none",
            }}
          >
            <Bookmark
              style={{ width: "14px", height: "14px", marginRight: "0.5rem" }}
            />
            내 프로필 저장
          </Button>
        </div>
      </header>

      {/* 대시보드 그리드 */}
      <main
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "2rem",
        }}
      >
        {/* 모바일이나 데스크톱 반응형 2단 분할 레이아웃 적용 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
            gap: "2rem",
            alignItems: "start",
          }}
        >
          {/* 1. Left Tower: Founder Fit (설문 매칭 벡터 조정 패널) */}
          <section
            style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
          >
            <Card
              style={{
                background: "rgba(30, 41, 59, 0.35)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "16px",
              }}
            >
              <CardHeader>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <CardTitle
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      fontSize: "1.125rem",
                      color: "#f8fafc",
                    }}
                  >
                    <Sliders
                      style={{
                        width: "18px",
                        height: "18px",
                        color: "#818cf8",
                      }}
                    />
                    Founder Fit Tower (창업성향 세부 조절)
                  </CardTitle>
                </div>
                <CardDescription style={{ color: "#94a3b8" }}>
                  설문 답변을 토대로 산출된 가중치 벡터입니다. 슬라이더를 통해
                  성향 강도를 직접 미세조정하여 실시간 상권 추천 목록 변화를
                  확인하세요.
                </CardDescription>
              </CardHeader>

              <CardContent
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem",
                  paddingBottom: "2rem",
                }}
              >
                {/* 1-1. 자본 & 안전성 */}
                <div>
                  <h3
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      color: "#a5b4fc",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                      paddingBottom: "0.375rem",
                      marginBottom: "0.75rem",
                    }}
                  >
                    재무 및 성향 요인
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1rem",
                    }}
                  >
                    {/* 자본규모 */}
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.75rem",
                          marginBottom: "0.25rem",
                        }}
                      >
                        <span style={{ color: "#cbd5e1" }}>
                          창업 예산 규모 (저예산 → 고자본)
                        </span>
                        <span style={{ fontWeight: "700", color: "#818cf8" }}>
                          {Math.round(profileVector.budget_level * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="0.95"
                        step="0.05"
                        value={profileVector.budget_level}
                        onChange={(e) =>
                          handleVectorChange(
                            "budget_level",
                            parseFloat(e.target.value)
                          )
                        }
                        style={{ width: "100%", accentColor: "#6366f1" }}
                      />
                    </div>
                    {/* 임대민감 */}
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.75rem",
                          marginBottom: "0.25rem",
                        }}
                      >
                        <span style={{ color: "#cbd5e1" }}>
                          월세 부담 민감도 (둔감 → 예민)
                        </span>
                        <span style={{ fontWeight: "700", color: "#818cf8" }}>
                          {Math.round(
                            profileVector.rent_sensitivity_level * 100
                          )}
                          %
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="0.95"
                        step="0.05"
                        value={profileVector.rent_sensitivity_level}
                        onChange={(e) =>
                          handleVectorChange(
                            "rent_sensitivity_level",
                            parseFloat(e.target.value)
                          )
                        }
                        style={{ width: "100%", accentColor: "#6366f1" }}
                      />
                    </div>
                    {/* 안정성 */}
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.75rem",
                          marginBottom: "0.25rem",
                        }}
                      >
                        <span style={{ color: "#cbd5e1" }}>
                          안정 지향성 (고수익성 → 고안정성)
                        </span>
                        <span style={{ fontWeight: "700", color: "#818cf8" }}>
                          {Math.round(profileVector.stability_level * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="0.95"
                        step="0.05"
                        value={profileVector.stability_level}
                        onChange={(e) =>
                          handleVectorChange(
                            "stability_level",
                            parseFloat(e.target.value)
                          )
                        }
                        style={{ width: "100%", accentColor: "#6366f1" }}
                      />
                    </div>
                  </div>
                </div>

                {/* 1-2. 고객 & 타겟층 */}
                <div>
                  <h3
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      color: "#a5b4fc",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                      paddingBottom: "0.375rem",
                      marginBottom: "0.75rem",
                    }}
                  >
                    상권 환경 및 타겟
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1rem",
                    }}
                  >
                    {/* 역세권 */}
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.75rem",
                          marginBottom: "0.25rem",
                        }}
                      >
                        <span style={{ color: "#cbd5e1" }}>
                          지하철역 접근성 의존도
                        </span>
                        <span style={{ fontWeight: "700", color: "#818cf8" }}>
                          {Math.round(
                            profileVector.subway_dependency_level * 100
                          )}
                          %
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="0.95"
                        step="0.05"
                        value={profileVector.subway_dependency_level}
                        onChange={(e) =>
                          handleVectorChange(
                            "subway_dependency_level",
                            parseFloat(e.target.value)
                          )
                        }
                        style={{ width: "100%", accentColor: "#6366f1" }}
                      />
                    </div>
                    {/* 경쟁 수용 */}
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.75rem",
                          marginBottom: "0.25rem",
                        }}
                      >
                        <span style={{ color: "#cbd5e1" }}>
                          경쟁 및 포화도 수용도
                        </span>
                        <span style={{ fontWeight: "700", color: "#818cf8" }}>
                          {Math.round(
                            profileVector.competition_tolerance_level * 100
                          )}
                          %
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="0.95"
                        step="0.05"
                        value={profileVector.competition_tolerance_level}
                        onChange={(e) =>
                          handleVectorChange(
                            "competition_tolerance_level",
                            parseFloat(e.target.value)
                          )
                        }
                        style={{ width: "100%", accentColor: "#6366f1" }}
                      />
                    </div>
                    {/* 주거인구 / 직장인구 */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "1rem",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "0.75rem",
                            marginBottom: "0.25rem",
                          }}
                        >
                          <span style={{ color: "#cbd5e1" }}>
                            주거인구 선호
                          </span>
                          <span style={{ fontWeight: "700", color: "#818cf8" }}>
                            {Math.round(
                              profileVector.resident_focus_level * 100
                            )}
                            %
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="0.95"
                          step="0.05"
                          value={profileVector.resident_focus_level}
                          onChange={(e) =>
                            handleVectorChange(
                              "resident_focus_level",
                              parseFloat(e.target.value)
                            )
                          }
                          style={{ width: "100%", accentColor: "#6366f1" }}
                        />
                      </div>
                      <div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "0.75rem",
                            marginBottom: "0.25rem",
                          }}
                        >
                          <span style={{ color: "#cbd5e1" }}>
                            직장인구 선호
                          </span>
                          <span style={{ fontWeight: "700", color: "#818cf8" }}>
                            {Math.round(profileVector.worker_focus_level * 100)}
                            %
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="0.95"
                          step="0.05"
                          value={profileVector.worker_focus_level}
                          onChange={(e) =>
                            handleVectorChange(
                              "worker_focus_level",
                              parseFloat(e.target.value)
                            )
                          }
                          style={{ width: "100%", accentColor: "#6366f1" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 1-3. 시간 & 요일 */}
                <div>
                  <h3
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      color: "#a5b4fc",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                      paddingBottom: "0.375rem",
                      marginBottom: "0.75rem",
                    }}
                  >
                    타겟 시간대 요인
                  </h3>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "1rem",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.75rem",
                          marginBottom: "0.25rem",
                        }}
                      >
                        <span style={{ color: "#cbd5e1" }}>주말 집중형</span>
                        <span style={{ fontWeight: "700", color: "#818cf8" }}>
                          {Math.round(
                            profileVector.weekend_preference_level * 100
                          )}
                          %
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="0.95"
                        step="0.05"
                        value={profileVector.weekend_preference_level}
                        onChange={(e) =>
                          handleVectorChange(
                            "weekend_preference_level",
                            parseFloat(e.target.value)
                          )
                        }
                        style={{ width: "100%", accentColor: "#6366f1" }}
                      />
                    </div>
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.75rem",
                          marginBottom: "0.25rem",
                        }}
                      >
                        <span style={{ color: "#cbd5e1" }}>저녁 집중형</span>
                        <span style={{ fontWeight: "700", color: "#818cf8" }}>
                          {Math.round(
                            profileVector.evening_preference_level * 100
                          )}
                          %
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="0.95"
                        step="0.05"
                        value={profileVector.evening_preference_level}
                        onChange={(e) =>
                          handleVectorChange(
                            "evening_preference_level",
                            parseFloat(e.target.value)
                          )
                        }
                        style={{ width: "100%", accentColor: "#6366f1" }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 설문 다시하기 버튼 */}
            <Button
              variant="outline"
              onClick={handleReset}
              style={{
                background: "rgba(15, 23, 42, 0.4)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                color: "#cbd5e1",
                padding: "1.25rem",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                fontSize: "0.875rem",
                fontWeight: "600",
              }}
            >
              설문 다시 시작하기
              <ArrowRight style={{ width: "14px", height: "14px" }} />
            </Button>
          </section>

          {/* 2. Right Tower: Commercial Fit (추천 상권 리스트 및 2-Tower 융합 분석) */}
          <section
            style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
          >
            {/* 2-1. 추천 순위 리스트 */}
            <Card
              style={{
                background: "rgba(30, 41, 59, 0.35)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "16px",
              }}
            >
              <CardHeader>
                <CardTitle
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontSize: "1.125rem",
                    color: "#f8fafc",
                  }}
                >
                  <Compass
                    style={{ width: "18px", height: "18px", color: "#ec4899" }}
                  />
                  Commercial Fit Tower (추천 매칭 상권 목록)
                </CardTitle>
                <CardDescription style={{ color: "#94a3b8" }}>
                  성향 다차원 임베딩과 가장 잘 밀착되는 서울 대표 상권
                  후보군입니다. 상권을 클릭하여 정밀 대조 데이터를 비교해
                  보세요.
                </CardDescription>
              </CardHeader>

              <CardContent
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                {recommendations.map((rec) => {
                  const isActive = activeArea?.id === rec.id
                  const badge = getAreaTypeBadgeStyles(rec.area_profile_type)
                  return (
                    <div
                      key={rec.id}
                      onClick={() => setActiveAreaId(rec.id)}
                      style={{
                        background: isActive
                          ? "rgba(236, 72, 153, 0.1)"
                          : "rgba(15, 23, 42, 0.3)",
                        border: isActive
                          ? "2px solid #ec4899"
                          : "1px solid rgba(255, 255, 255, 0.06)",
                        borderRadius: "12px",
                        padding: "1rem",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "1rem",
                        }}
                      >
                        {/* 랭킹 뱃지 */}
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            background:
                              rec.rank === 1
                                ? "linear-gradient(135deg, #fbbf24, #f59e0b)"
                                : "rgba(255,255,255,0.06)",
                            color: rec.rank === 1 ? "#000" : "#cbd5e1",
                            fontWeight: "800",
                            fontSize: "1rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {rec.rank}
                        </div>

                        <div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                            }}
                          >
                            <span
                              style={{
                                fontWeight: "700",
                                fontSize: "1rem",
                                color: "#ffffff",
                              }}
                            >
                              {rec.name}
                            </span>
                            <span
                              style={{
                                fontSize: "0.6875rem",
                                fontWeight: "600",
                                padding: "0.125rem 0.5rem",
                                borderRadius: "4px",
                                background: badge.bg,
                                color: badge.text,
                                border: `1px solid ${badge.border}`,
                              }}
                            >
                              {getAreaTypeLabel(rec.area_profile_type)}
                            </span>
                          </div>

                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "#64748b",
                              display: "block",
                              marginTop: "0.25rem",
                            }}
                          >
                            카테고리: {rec.service_category_name} | 분기 매출
                            규모: {(rec.sales_amount / 100000000).toFixed(1)}
                            억원
                          </span>
                        </div>
                      </div>

                      {/* 매칭 스코어 */}
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "0.75rem", color: "#cbd5e1" }}>
                          매칭 점수
                        </span>
                        <div
                          style={{
                            fontSize: "1.125rem",
                            fontWeight: "800",
                            color: rec.rank === 1 ? "#fbbf24" : "#ec4899",
                          }}
                        >
                          {rec.score.toFixed(4)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* 2-2. 정밀 융합 분석 (Active Area 정밀 비교) */}
            {activeArea && (
              <Card
                style={{
                  background: "rgba(30, 41, 59, 0.45)",
                  backdropFilter: "blur(16px)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "16px",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                }}
              >
                <CardHeader
                  style={{
                    borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "#818cf8",
                          fontWeight: "700",
                        }}
                      >
                        DETAILED TOWER MATCHING ANALYSIS
                      </div>
                      <CardTitle
                        style={{
                          fontSize: "1.25rem",
                          fontWeight: "800",
                          color: "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          marginTop: "0.25rem",
                        }}
                      >
                        <MapPin
                          style={{
                            color: "#ec4899",
                            width: "18px",
                            height: "18px",
                          }}
                        />
                        {activeArea.name} 상세 매칭 리포트
                      </CardTitle>
                    </div>
                    <div
                      style={{
                        background: "rgba(236, 72, 153, 0.1)",
                        border: "1px solid rgba(236, 72, 153, 0.3)",
                        borderRadius: "8px",
                        padding: "0.375rem 0.75rem",
                        textAlign: "right",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.625rem",
                          color: "#f472b6",
                          fontWeight: "700",
                        }}
                      >
                        MATCH RATE
                      </div>
                      <div
                        style={{
                          fontSize: "1.125rem",
                          fontWeight: "900",
                          color: "#f472b6",
                        }}
                      >
                        {Math.round((activeArea.score / 5.0) * 100)}%
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent
                  style={{
                    padding: "1.5rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.5rem",
                  }}
                >
                  {/* 레이더 차트 시각화 */}
                  <div
                    style={{
                      height: "260px",
                      width: "100%",
                      background: "rgba(15, 23, 42, 0.4)",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.04)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "1rem",
                    }}
                  >
                    {isMounted ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart
                          cx="50%"
                          cy="50%"
                          outerRadius="80%"
                          data={chartData}
                        >
                          <PolarGrid stroke="rgba(255, 255, 255, 0.08)" />
                          <PolarAngleAxis
                            dataKey="subject"
                            tick={{
                              fill: "#94a3b8",
                              fontSize: 10,
                              fontWeight: "600",
                            }}
                          />
                          <PolarRadiusAxis
                            angle={30}
                            domain={[0, 100]}
                            tick={{ fill: "#64748b", fontSize: 8 }}
                          />
                          <Radar
                            name="창업자 성향 (Founder)"
                            dataKey="user"
                            stroke="#818cf8"
                            fill="#818cf8"
                            fillOpacity={0.25}
                          />
                          <Radar
                            name="상권 프로필 (Commercial)"
                            dataKey="area"
                            stroke="#ec4899"
                            fill="#ec4899"
                            fillOpacity={0.25}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div
                        style={{
                          color: "#64748b",
                          fontSize: "0.875rem",
                          display: "flex",
                          gap: "0.5rem",
                          alignItems: "center",
                        }}
                      >
                        차트 생성 및 로딩 중...
                      </div>
                    )}
                  </div>

                  {/* 투 타워 범례 표시 */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      gap: "1.5rem",
                      fontSize: "0.75rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.375rem",
                      }}
                    >
                      <span
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "3px",
                          background: "#818cf8",
                        }}
                      />
                      <span style={{ color: "#cbd5e1" }}>
                        Founder Fit 타워 (창업 성향 벡터)
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.375rem",
                      }}
                    >
                      <span
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "3px",
                          background: "#ec4899",
                        }}
                      />
                      <span style={{ color: "#cbd5e1" }}>
                        Commercial Fit 타워 (상권 환경 벡터)
                      </span>
                    </div>
                  </div>

                  {/* 정밀 지표 리스트 비교 피드 */}
                  <div>
                    <h3
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: "700",
                        color: "#ffffff",
                        marginBottom: "0.75rem",
                      }}
                    >
                      상권 주요 운영 지표
                    </h3>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "1rem",
                      }}
                    >
                      {/* 매출 및 트렌드 */}
                      <div
                        style={{
                          background: "rgba(15, 23, 42, 0.4)",
                          border: "1px solid rgba(255,255,255,0.04)",
                          borderRadius: "8px",
                          padding: "0.75rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                        }}
                      >
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "6px",
                            background: "rgba(236, 72, 153, 0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#ec4899",
                            flexShrink: 0,
                          }}
                        >
                          <TrendingUp
                            style={{
                              width: "16px",
                              height: "16px",
                              margin: "auto",
                            }}
                          />
                        </div>
                        <div>
                          <span
                            style={{
                              fontSize: "0.6875rem",
                              color: "#64748b",
                              display: "block",
                            }}
                          >
                            상권 트렌드 지수
                          </span>
                          <span
                            style={{
                              fontSize: "0.875rem",
                              fontWeight: "700",
                              color: "#e2e8f0",
                            }}
                          >
                            {Math.round(
                              activeArea.subway_commercial_trend_score * 100
                            )}
                            점 (우수)
                          </span>
                        </div>
                      </div>

                      {/* 거주 / 근무 비율 */}
                      <div
                        style={{
                          background: "rgba(15, 23, 42, 0.4)",
                          border: "1px solid rgba(255,255,255,0.04)",
                          borderRadius: "8px",
                          padding: "0.75rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                        }}
                      >
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "6px",
                            background: "rgba(99, 102, 241, 0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#818cf8",
                            flexShrink: 0,
                          }}
                        >
                          <Users
                            style={{
                              width: "16px",
                              height: "16px",
                              margin: "auto",
                            }}
                          />
                        </div>
                        <div>
                          <span
                            style={{
                              fontSize: "0.6875rem",
                              color: "#64748b",
                              display: "block",
                            }}
                          >
                            거주/직장 인구 수
                          </span>
                          <span
                            style={{
                              fontSize: "0.875rem",
                              fontWeight: "700",
                              color: "#e2e8f0",
                            }}
                          >
                            {(activeArea.resident_population / 1000).toFixed(1)}
                            k /{" "}
                            {(activeArea.worker_population / 1000).toFixed(1)}k
                          </span>
                        </div>
                      </div>

                      {/* 카테고리 기회 */}
                      <div
                        style={{
                          background: "rgba(15, 23, 42, 0.4)",
                          border: "1px solid rgba(255,255,255,0.04)",
                          borderRadius: "8px",
                          padding: "0.75rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                        }}
                      >
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "6px",
                            background: "rgba(16, 185, 129, 0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#10b981",
                            flexShrink: 0,
                          }}
                        >
                          <Building
                            style={{
                              width: "16px",
                              height: "16px",
                              margin: "auto",
                            }}
                          />
                        </div>
                        <div>
                          <span
                            style={{
                              fontSize: "0.6875rem",
                              color: "#64748b",
                              display: "block",
                            }}
                          >
                            업종 기회 점수
                          </span>
                          <span
                            style={{
                              fontSize: "0.875rem",
                              fontWeight: "700",
                              color: "#e2e8f0",
                            }}
                          >
                            {Math.round(
                              activeArea.category_opportunity_score * 100
                            )}{" "}
                            / 100점
                          </span>
                        </div>
                      </div>

                      {/* 공급 부족 지표 */}
                      <div
                        style={{
                          background: "rgba(15, 23, 42, 0.4)",
                          border: "1px solid rgba(255, 255, 255, 0.04)",
                          borderRadius: "8px",
                          padding: "0.75rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                        }}
                      >
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "6px",
                            background: "rgba(245, 158, 11, 0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#f59e0b",
                            flexShrink: 0,
                          }}
                        >
                          <DollarSign
                            style={{
                              width: "16px",
                              height: "16px",
                              margin: "auto",
                            }}
                          />
                        </div>
                        <div>
                          <span
                            style={{
                              fontSize: "0.6875rem",
                              color: "#64748b",
                              display: "block",
                            }}
                          >
                            수요 공급 격차 (수요량-공급량)
                          </span>
                          <span
                            style={{
                              fontSize: "0.875rem",
                              fontWeight: "700",
                              color: "#e2e8f0",
                            }}
                          >
                            {Math.round(activeArea.demand_gap_score * 100)}%
                            격차
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>

                <CardFooter
                  style={{
                    padding: "1rem 1.5rem",
                    borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                    background: "rgba(15, 23, 42, 0.2)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "0.6875rem", color: "#64748b" }}>
                    * 데이터 출처: 서울시 공공 데이터 포탈 실시간 적재 데이터
                    가공본
                  </span>
                  <a
                    href="https://data.seoul.go.kr"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: "0.6875rem",
                      color: "#818cf8",
                      textDecoration: "underline",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    공공데이터포털
                    <ExternalLink style={{ width: "10px", height: "10px" }} />
                  </a>
                </CardFooter>
              </Card>
            )}
          </section>
        </div>
      </main>

      {/* 내 프로필 저장용 수동 모달 구현 */}
      {isSaveModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "rgba(2, 6, 17, 0.8)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "#1e293b",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "16px",
              maxWidth: "400px",
              width: "100%",
              padding: "1.5rem",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            }}
          >
            <h3
              style={{
                fontSize: "1.125rem",
                fontWeight: "700",
                color: "#ffffff",
                marginBottom: "0.5rem",
              }}
            >
              내 진단 프로필 저장
            </h3>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "#94a3b8",
                marginBottom: "1.25rem",
              }}
            >
              이 진단 결과 상태를 계정 프로필로 등록합니다. 향후 로그인 시
              언제든 저장된 성향과 매칭 결과를 불러올 수 있습니다.
            </p>

            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: "#cbd5e1",
                  display: "block",
                  marginBottom: "0.375rem",
                }}
              >
                프로필 이름
              </label>
              <input
                type="text"
                value={profileNameInput}
                onChange={(e) => setProfileNameInput(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  background: "rgba(15, 23, 42, 0.5)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "8px",
                  color: "#ffffff",
                  fontSize: "0.875rem",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.75rem",
              }}
            >
              <Button
                variant="outline"
                onClick={() => setIsSaveModalOpen(false)}
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#cbd5e1",
                }}
              >
                취소
              </Button>
              <Button
                onClick={handleSaveProfile}
                style={{
                  background: "linear-gradient(90deg, #6366f1, #4f46e5)",
                  color: "#ffffff",
                  border: "none",
                }}
              >
                저장 완료
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 하단 모델 설명 영역 */}
      <footer
        style={{
          maxWidth: "1280px",
          margin: "3rem auto 0 auto",
          textAlign: "center",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          paddingTop: "1.5rem",
        }}
      >
        <p style={{ fontSize: "0.75rem", color: "#475569" }}>
          Powered by <strong>Google Gemini 3.5 Flash</strong> Hybrid
          Dual-Encoder Model. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
