import toposort from "toposort"
import { logger, metadata, task } from "@trigger.dev/sdk"
import { Stagehand } from "@browserbasehq/stagehand"
import type { Edge } from "@xyflow/react"

import { nodeExecutors } from "@/features/workflows/nodes/node-executors"
import {
  interpolate,
  type NodeOutputs,
} from "@/features/workflows/lib/interpolate"
import type { RunStep } from "@/features/workflows/lib/run-types"
import {
  finalizeWorkflowRun,
  getDecryptedOrgSecrets,
  getWorkflow,
  upsertWorkflowRun,
} from "@/features/workflows/data"

export type { RunStep } from "@/features/workflows/lib/run-types"

export const runWorkflowTask = task({
  id: "run-workflow",
  run: async (
    { workflowId, orgId }: { workflowId: string; orgId: string },
    { ctx }
  ) => {
    const runId = ctx.run.id
    const workflow = await getWorkflow(orgId, workflowId)
    if (!workflow?.graph) throw new Error(`Workflow ${workflowId} has no graph`)

    const { nodes, edges } = workflow.graph
    const byId = new Map(nodes.map((n) => [n.id, n]))

    // Incoming edges keyed by target, used to decide whether a node should be
    // skipped after a branch takes the other path.
    const incomingByTarget = new Map<string, Edge[]>()
    for (const edge of edges) {
      const list = incomingByTarget.get(edge.target) ?? []
      list.push(edge)
      incomingByTarget.set(edge.target, list)
    }

    // Run only connected nodes — anything touching an edge. Orphans dropped on
    // the canvas are skipped. toposort orders them and throws on a cycle.
    const connected = new Set(edges.flatMap((e) => [e.source, e.target]))
    const order = toposort
      .array(
        nodes.map((n) => n.id),
        edges.map((e) => [e.source, e.target] as [string, string])
      )
      .filter((id) => connected.has(id))

    logger.log(`Running workflow ${workflow.name}`, { steps: order.length })

    const steps: RunStep[] = order.map((nodeId) => {
      const node = byId.get(nodeId)!
      return {
        nodeId,
        type: node.data.type,
        title: node.data.title,
        status: "pending",
      }
    })

    let stagehand: Stagehand | undefined
    let browserbaseSessionId: string | undefined

    await upsertWorkflowRun({
      id: runId,
      workflowId,
      orgId,
      status: "EXECUTING",
      steps,
    })

    const publishSteps = async () => {
      metadata.set("steps", steps as never)
      if (browserbaseSessionId) {
        metadata.set("browserbaseSessionId", browserbaseSessionId)
      }
      await upsertWorkflowRun({
        id: runId,
        workflowId,
        orgId,
        status: "EXECUTING",
        steps,
        browserbaseSessionId,
      })
    }

    await publishSteps()

    const getStagehand = async () => {
      if (stagehand) return stagehand
      stagehand = new Stagehand({
        env: "BROWSERBASE",
        apiKey: process.env.BROWSERBASE_API_KEY!,
        model: "google/gemini-2.5-flash",
        disablePino: true,
      })
      await stagehand.init()
      browserbaseSessionId = stagehand.browserbaseSessionID
      await publishSteps()
      await metadata.flush()
      return stagehand
    }

    // Inject org secrets as a pseudo-node so fields can use {{secrets.NAME}}.
    // Never publish secret values to metadata or step outputs.
    const secretValues = await getDecryptedOrgSecrets(orgId)
    const outputs: NodeOutputs = {
      secrets: secretValues,
    }

    // Track which nodes were skipped / which branch handle was taken so
    // downstream nodes on the inactive path can be skipped.
    const skipped = new Set<string>()
    const takenHandle = new Map<string, string>()

    for (let i = 0; i < order.length; i++) {
      const id = order[i]
      const step = steps[i]
      const node = byId.get(id)!
      logger.log(`Running step: ${node.data.title}`)

      // Skip if every incoming edge is inactive (source skipped, or branch took
      // the other handle). Nodes with no incoming edges (e.g. Start) always run.
      const incoming = incomingByTarget.get(id) ?? []
      if (incoming.length > 0) {
        const anyActive = incoming.some((edge) => {
          if (skipped.has(edge.source)) return false
          const taken = takenHandle.get(edge.source)
          if (taken != null && edge.sourceHandle != null) {
            return edge.sourceHandle === taken
          }
          // Source had no branching (or edges without handles) — edge is active
          // as long as the source wasn't skipped.
          return true
        })
        if (!anyActive) {
          skipped.add(id)
          step.status = "skipped"
          await publishSteps()
          continue
        }
      }

      const executor = nodeExecutors[node.data.type]
      if (!executor) {
        step.status = "done"
        await publishSteps()
        continue
      }

      step.status = "running"
      await publishSteps()
      await metadata.flush()

      const values = Object.fromEntries(
        Object.entries(node.data.values).map(([key, text]) => [
          key,
          interpolate({ text, outputs }),
        ])
      )

      const startedAt = Date.now()
      try {
        const output = await executor({
          values,
          getStagehand,
          runId,
          orgId,
        })
        outputs[id] = output
        step.output = output

        // Record which branch handle was taken for skip logic downstream.
        if (
          node.data.type === "branch" &&
          output &&
          typeof output === "object" &&
          "branch" in output
        ) {
          takenHandle.set(id, String((output as { branch: string }).branch))
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        step.status = "failed"
        step.durationMs = Date.now() - startedAt
        step.error = message
        metadata.set("steps", steps as never)
        await metadata.flush()
        await finalizeWorkflowRun({
          id: runId,
          workflowId,
          orgId,
          status: "FAILED",
          steps,
          browserbaseSessionId,
          error: message,
        })
        await stagehand?.close()
        throw error
      }

      step.status = "done"
      step.durationMs = Date.now() - startedAt
      await publishSteps()
    }

    await stagehand?.close()

    await finalizeWorkflowRun({
      id: runId,
      workflowId,
      orgId,
      status: "COMPLETED",
      steps,
      browserbaseSessionId,
    })

    return { steps, browserbaseSessionId }
  },
})
