/**
 * Better Auth 로그인 왕복에 사용할 callback URL을 정규화한다.
 *
 * 이 유틸은 인증 흐름의 핵심 로직이라기보다, 외부 입력으로 들어온
 * callbackURL을 앱 내부 상대 경로로 제한해서 오픈 리다이렉트를 막는
 * 보안용 순수 함수다.
 */
const getFirstValue = (value: unknown) => {
  return Array.isArray(value) ? value[0] : value
}

/**
 * 로그인 후 돌아갈 경로를 안전한 인앱 상대 경로로 제한한다.
 */
export const normalizeCallbackURL = (raw: unknown) => {
  const value = getFirstValue(raw)

  // 오픈 리다이렉트를 막기 위해 앱 내부 상대 경로만 허용한다.
  if (typeof value !== "string") return "/"

  const trimmedValue = value.trim()

  if (!trimmedValue || !trimmedValue.startsWith("/")) return "/"
  if (trimmedValue.startsWith("//")) return "/"

  return trimmedValue
}
