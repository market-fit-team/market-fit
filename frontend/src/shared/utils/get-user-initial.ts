export const getUserInitial = (name?: string | null) =>
  name?.trim().slice(0, 1) || "나"
