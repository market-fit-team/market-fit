const getFirstValue = (value: unknown) => {
  return Array.isArray(value) ? value[0] : value
}

export const normalizeCallbackURL = (raw: unknown) => {
  const value = getFirstValue(raw)

  // Only relative in-app paths are accepted to avoid open redirects.
  if (typeof value !== "string") return "/"

  const trimmedValue = value.trim()

  if (!trimmedValue || !trimmedValue.startsWith("/")) return "/"
  if (trimmedValue.startsWith("//")) return "/"

  return trimmedValue
}
