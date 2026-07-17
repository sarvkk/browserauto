import { useEffect, useMemo, useState } from "react"
import { getIncomers, useStore } from "@xyflow/react"

import {
  nodeRegistry,
  type NodeType,
  type StepNodeType,
} from "@/features/workflows/nodes/node-registry"
import { listSecretsAction } from "@/features/workflows/actions"

// One insertable reference to an upstream node's output (or an org secret).
export type UpstreamConnection = {
  token: string
  label: string
  // Absent for org secrets (rendered without a node icon).
  nodeType?: NodeType
}

export function useUpstreamConnections(): UpstreamConnection[] {
  const nodes = useStore((s) => s.nodes) as StepNodeType[]
  const edges = useStore((s) => s.edges)
  const selected = nodes.find((n) => n.selected)
  const [secretNames, setSecretNames] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    listSecretsAction()
      .then((secrets) => {
        if (!cancelled) setSecretNames(secrets.map((s) => s.name))
      })
      .catch(() => {
        if (!cancelled) setSecretNames([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  return useMemo(() => {
    if (!selected) return []

    const ancestors: StepNodeType[] = []
    const seen = new Set<string>()
    const queue: StepNodeType[] = [selected]

    while (queue.length) {
      const current = queue.shift()!
      for (const incomer of getIncomers(current, nodes, edges) as StepNodeType[]) {
        if (seen.has(incomer.id)) continue
        seen.add(incomer.id)
        ancestors.push(incomer)
        queue.push(incomer)
      }
    }

    const upstream = ancestors.flatMap((node) =>
      nodeRegistry[node.data.type].outputs.map((output) => ({
        token: `{{ ${node.id}.${output.path} }}`,
        label: `${node.data.title} · ${output.label}`,
        nodeType: node.data.type,
      }))
    )

    const secrets = secretNames.map((name) => ({
      token: `{{ secrets.${name} }}`,
      label: `Secret · ${name}`,
    }))

    const triggerTokens: UpstreamConnection[] = [
      {
        token: "{{ trigger.body }}",
        label: "Trigger · body",
      },
      {
        token: "{{ trigger.source }}",
        label: "Trigger · source",
      },
    ]

    return [...upstream, ...triggerTokens, ...secrets]
  }, [selected, nodes, edges, secretNames])
}
