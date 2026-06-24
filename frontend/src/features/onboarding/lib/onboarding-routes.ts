export const ONBOARDING_ENTRY_PATH = "/onboarding"
export const ONBOARDING_RESULT_PATH_PREFIX = "/onboarding/result"
export const ONBOARDING_LOGIN_PATH = "/login"

export const getOnboardingEntryPath = () => ONBOARDING_ENTRY_PATH

export const getOnboardingResultPath = (code: string) => {
  return `${ONBOARDING_RESULT_PATH_PREFIX}/${encodeURIComponent(code)}`
}

export const getOnboardingLoginPath = (callbackURL: string) => {
  return `${ONBOARDING_LOGIN_PATH}?callbackURL=${encodeURIComponent(callbackURL)}`
}
