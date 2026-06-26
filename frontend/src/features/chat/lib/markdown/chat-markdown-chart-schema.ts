import { z } from "zod"

const chartDataValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
])

const chartDataRowSchema = z.record(z.string(), chartDataValueSchema)

const chartSeriesSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  color: z.string().min(1).optional(),
})

const cartesianChartBaseSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    xKey: z.string().min(1),
    series: z.array(chartSeriesSchema).min(1),
    data: z.array(chartDataRowSchema).min(1),
  })
  .superRefine((value, context) => {
    value.data.forEach((row, rowIndex) => {
      const xValue = row[value.xKey]
      if (xValue == null || typeof xValue === "boolean") {
        context.addIssue({
          code: "custom",
          message: `data[${rowIndex + 1}]에 xKey '${value.xKey}' 값이 없습니다.`,
        })
      }

      value.series.forEach((series) => {
        const seriesValue = row[series.key]
        if (seriesValue == null) {
          context.addIssue({
            code: "custom",
            message: `data[${rowIndex + 1}]에 series key '${series.key}' 값이 없습니다.`,
          })
          return
        }

        if (
          typeof seriesValue !== "number" ||
          Number.isNaN(seriesValue) ||
          !Number.isFinite(seriesValue)
        ) {
          context.addIssue({
            code: "custom",
            message: `data[${rowIndex + 1}].${series.key}는 숫자여야 합니다.`,
          })
        }
      })
    })
  })

const barChartSchema = cartesianChartBaseSchema.extend({
  type: z.literal("bar"),
})

const lineChartSchema = cartesianChartBaseSchema.extend({
  type: z.literal("line"),
})

const pieChartSchema = z
  .object({
    type: z.literal("pie"),
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    nameKey: z.string().min(1),
    dataKey: z.string().min(1),
    data: z.array(chartDataRowSchema).min(1),
  })
  .superRefine((value, context) => {
    value.data.forEach((row, rowIndex) => {
      const nameValue = row[value.nameKey]
      if (
        nameValue == null ||
        typeof nameValue === "boolean" ||
        (typeof nameValue !== "string" && typeof nameValue !== "number")
      ) {
        context.addIssue({
          code: "custom",
          message: `data[${rowIndex + 1}].${value.nameKey}는 문자열 또는 숫자여야 합니다.`,
        })
      }

      const dataValue = row[value.dataKey]
      if (dataValue == null) {
        context.addIssue({
          code: "custom",
          message: `data[${rowIndex + 1}]에 dataKey '${value.dataKey}' 값이 없습니다.`,
        })
        return
      }

      if (
        typeof dataValue !== "number" ||
        Number.isNaN(dataValue) ||
        !Number.isFinite(dataValue)
      ) {
        context.addIssue({
          code: "custom",
          message: `data[${rowIndex + 1}].${value.dataKey}는 숫자여야 합니다.`,
        })
      }
    })
  })

export const chatMarkdownChartBlockSchema = z.discriminatedUnion("type", [
  barChartSchema,
  lineChartSchema,
  pieChartSchema,
])

export type ChatMarkdownChartBlock = z.infer<
  typeof chatMarkdownChartBlockSchema
>
