import toposort from "toposort"
import type { Edge } from "@xyflow/react"

import type { StepNodeType } from "@/features/workflows/nodes/node-registry"

// Nodes reachable from any for-each "body" handle (including nested bodies).
// These are excluded from the top-level run order and executed by runForEach.
export function collectBodyOwnedNodeIds(edges: Edge[]): Set<string> {
  const owned = new Set<string>()
  const queue: string[] = []

  for (const edge of edges) {
    if (edge.sourceHandle !== "body") continue
    if (owned.has(edge.target)) continue
    owned.add(edge.target)
    queue.push(edge.target)
  }

  while (queue.length > 0) {
    const id = queue.shift()!
    for (const edge of edges) {
      if (edge.source !== id) continue
      if (owned.has(edge.target)) continue
      owned.add(edge.target)
      queue.push(edge.target)
    }
  }

  return owned
}

// Body subgraph for one for-each, excluding nodes owned by nested for-each bodies
// (those run when the nested for-each executes).
export function getDirectBodyOrder({
  forEachId,
  nodes,
  edges,
}: {
  forEachId: string
  nodes: StepNodeType[]
  edges: Edge[]
}): string[] {
  const owned = collectOwnedFromBodyHandle(forEachId, edges)
  if (owned.size === 0) return []

  const nestedOwned = new Set<string>()
  for (const node of nodes) {
    if (!owned.has(node.id)) continue
    if (node.data.type !== "for-each") continue
    for (const id of collectOwnedFromBodyHandle(node.id, edges)) {
      nestedOwned.add(id)
    }
  }

  const direct = [...owned].filter((id) => !nestedOwned.has(id))
  const directSet = new Set(direct)
  const pairEdges = edges
    .filter((e) => directSet.has(e.source) && directSet.has(e.target))
    .map((e) => [e.source, e.target] as [string, string])

  if (pairEdges.length === 0) {
    return direct
  }

  return toposort.array(direct, pairEdges)
}

function collectOwnedFromBodyHandle(
  forEachId: string,
  edges: Edge[]
): Set<string> {
  const owned = new Set<string>()
  const queue: string[] = []

  for (const edge of edges) {
    if (edge.source !== forEachId || edge.sourceHandle !== "body") continue
    if (owned.has(edge.target)) continue
    owned.add(edge.target)
    queue.push(edge.target)
  }

  while (queue.length > 0) {
    const id = queue.shift()!
    for (const edge of edges) {
      if (edge.source !== id) continue
      if (owned.has(edge.target)) continue
      owned.add(edge.target)
      queue.push(edge.target)
    }
  }

  return owned
}

export function parseItemsArray(text: string): unknown[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  let value: unknown
  try {
    value = JSON.parse(trimmed)
  } catch {
    throw new Error(
      'For each "items" must be a JSON array (got invalid JSON after interpolation).'
    )
  }

  if (!Array.isArray(value)) {
    throw new Error('For each "items" must be a JSON array.')
  }

  return value
}

export function parseMaxItems(text: string | undefined): number {
  const n = Number.parseInt((text ?? "25").trim(), 10)
  if (!Number.isFinite(n) || n < 1) return 25
  return Math.min(n, 200)
}
