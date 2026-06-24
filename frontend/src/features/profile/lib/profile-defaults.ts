import { customAlphabet, nanoid } from "nanoid"
import { uniqueNamesGenerator } from "unique-names-generator"

export const DISPLAY_NAME_MIN_LENGTH = 3
export const DISPLAY_NAME_MAX_LENGTH = 20
const createShortSuffix = customAlphabet("0123456789", 4)

const shortAdjectives = [
  "aqua",
  "bold",
  "calm",
  "cool",
  "dawn",
  "fast",
  "glow",
  "keen",
  "mint",
  "navy",
  "ruby",
  "sage",
  "warm",
  "zest",
]

const shortAnimals = [
  "ant",
  "bee",
  "cat",
  "dog",
  "eel",
  "emu",
  "fox",
  "owl",
  "ram",
  "yak",
]

type ProfileSessionUser = {
  displayName?: string | null
  avatarSeed?: string | null
  age?: number | null
  job?: string | null
}

export const DISPLAY_NAME_REGEX = new RegExp(
  `^(?!default$)(?![0-9])[A-Za-z가-힣0-9]{${DISPLAY_NAME_MIN_LENGTH},${DISPLAY_NAME_MAX_LENGTH}}$`,
  "i"
)

export const isProfileSetupRequired = (user: ProfileSessionUser) => {
  const displayName = user.displayName?.trim()
  const avatarSeed = user.avatarSeed?.trim()

  return (
    !displayName ||
    !avatarSeed ||
    displayName.toLowerCase() === "default" ||
    avatarSeed.toLowerCase() === "default"
  )
}

export const createProfileDisplayName = () => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const base = uniqueNamesGenerator({
      dictionaries: [shortAdjectives, shortAnimals],
      separator: "",
      length: 2,
      style: "capital",
    })
    const candidate = `${base}${createShortSuffix()}`

    if (
      candidate.length >= DISPLAY_NAME_MIN_LENGTH &&
      candidate.length <= DISPLAY_NAME_MAX_LENGTH &&
      DISPLAY_NAME_REGEX.test(candidate)
    ) {
      return candidate
    }
  }

  return `User${customAlphabet("0123456789", 5)()}`
}

export const createProfileAvatarSeed = () => {
  return nanoid(12)
}

export const resolveProfileDraft = (user: ProfileSessionUser) => {
  const nextDisplayName =
    !user.displayName || user.displayName.toLowerCase() === "default"
      ? createProfileDisplayName()
      : user.displayName

  const nextAvatarSeed =
    !user.avatarSeed || user.avatarSeed.toLowerCase() === "default"
      ? createProfileAvatarSeed()
      : user.avatarSeed

  return {
    age: user.age ?? null,
    avatarSeed: nextAvatarSeed,
    displayName: nextDisplayName,
    job: user.job ?? null,
    requiresInitialization: isProfileSetupRequired(user),
  }
}

export const resolveProfileCompletionRedirectTarget = (callbackURL: string) => {
  return callbackURL.startsWith("/profile") ? "/" : callbackURL
}
