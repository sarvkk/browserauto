import type { Stagehand } from "@browserbasehq/stagehand"
import { z, type ZodTypeAny } from "zod"

export async function extract({
  stagehand,
  instruction,
  schema,
}: {
  stagehand: Stagehand
  instruction: string
  schema?: string
}) {
  const zodSchema = schema?.trim()
    ? buildZodFromJsonShape(schema.trim())
    : undefined

  if (zodSchema) {
    // Wrap so the existing `extraction` output path stays valid for chips.
    const result = await stagehand.extract(
      instruction,
      z.object({ extraction: zodSchema })
    )
    return result
  }

  const { extraction } = await stagehand.extract(instruction)
  return { extraction }
}

// Converts a simple JSON shape into Zod:
//   { "price": "string", "items": ["string"], "count": "number" }
function buildZodFromJsonShape(raw: string): ZodTypeAny {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error("Extract schema must be valid JSON")
  }
  return jsonShapeToZod(parsed)
}

function jsonShapeToZod(shape: unknown): ZodTypeAny {
  if (typeof shape === "string") {
    switch (shape) {
      case "string":
        return z.string()
      case "number":
        return z.number()
      case "boolean":
        return z.boolean()
      default:
        return z.string()
    }
  }

  if (Array.isArray(shape)) {
    const item = shape[0] ?? "string"
    return z.array(jsonShapeToZod(item))
  }

  if (typeof shape === "object" && shape !== null) {
    const entries = Object.entries(shape as Record<string, unknown>)
    const fields: Record<string, ZodTypeAny> = {}
    for (const [key, value] of entries) {
      fields[key] = jsonShapeToZod(value)
    }
    return z.object(fields)
  }

  return z.unknown()
}
