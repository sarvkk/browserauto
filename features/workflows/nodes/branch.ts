export async function branch({
  left,
  operator,
  right,
}: {
  left: string
  operator: string
  right: string
}) {
  const result = evaluate(left, operator || "equals", right)
  return { result, branch: result ? "true" : "false" }
}

function evaluate(left: string, operator: string, right: string): boolean {
  switch (operator) {
    case "equals":
      return left === right
    case "not_equals":
      return left !== right
    case "contains":
      return left.includes(right)
    case "greater_than": {
      const a = Number(left)
      const b = Number(right)
      if (Number.isNaN(a) || Number.isNaN(b)) return left > right
      return a > b
    }
    case "less_than": {
      const a = Number(left)
      const b = Number(right)
      if (Number.isNaN(a) || Number.isNaN(b)) return left < right
      return a < b
    }
    case "is_empty":
      return left.trim() === ""
    default:
      throw new Error(`Unknown branch operator: ${operator}`)
  }
}
