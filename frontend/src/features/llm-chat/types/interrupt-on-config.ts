export type InterruptOnConfig = Record<
  string,
  false | { allowedDecisions: string[] }
>
