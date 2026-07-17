import toposort from "toposort"

import { collectBodyOwnedNodeIds } from "@/features/workflows/lib/for-each"
import type { WorkflowGraph } from "@/lib/db/schema"

// Structural problems knowable before a run — empty array means runnable. Pure
// (no db import) so the client can pre-flight the in-hand graph and toast,
// while the server reuses it as the save-time backstop.
export function validateGraph({ nodes, edges }: WorkflowGraph): string[] {
  const problems: string[] = []

  const triggers = nodes.filter((n) => n.data.kind === "trigger").length
  if (triggers !== 1) {
    problems.push(`A workflow needs exactly one Start trigger (found ${triggers}).`)
  }

  // The runner only executes nodes touching an edge, so with none Run is a no-op.
  if (edges.length === 0) {
    problems.push("Connect your nodes before running.")
  } else {
    try {
      // toposort throws on a cycle — the run would otherwise fail mid-sort.
      toposort(edges.map((e) => [e.source, e.target]))
    } catch {
      problems.push("Workflow has a cycle — remove the loop before running.")
    }
  }

  for (const node of nodes) {
    if (node.data.type !== "for-each") continue
    const hasBody = edges.some(
      (e) => e.source === node.id && e.sourceHandle === "body"
    )
    if (!hasBody) {
      problems.push(
        `"${node.data.title}" needs at least one connection from its Each handle.`
      )
    }
  }

  // Done-path nodes must not also sit inside a for-each body (ambiguous ownership).
  const bodyOwned = collectBodyOwnedNodeIds(edges)
  for (const edge of edges) {
    if (edge.sourceHandle !== "done") continue
    if (bodyOwned.has(edge.target)) {
      problems.push(
        "A For each Done path can't reconnect into its Each body — keep Done separate."
      )
      break
    }
  }

  return problems
}
