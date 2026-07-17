import toposort from "toposort"
import { logger, metadata, task } from "@trigger.dev/sdk"
import { Stagehand } from "@browserbasehq/stagehand"
import type { Edge } from "@xyflow/react"

import { nodeExecutors } from "@/features/workflows/nodes/node-executors"
import {
  collectBodyOwnedNodeIds,
  getDirectBodyOrder,
  parseItemsArray,
  parseMaxItems,
} from "@/features/workflows/lib/for-each"
import {
  interpolate,
  type NodeOutputs,
} from "@/features/workflows/lib/interpolate"
import type { RunStep } from "@/features/workflows/lib/run-types"
import type { RunWorkflowPayload } from "@/features/workflows/lib/trigger-payload"
import {
  finalizeWorkflowRun,
  getAuthProfile,
  getDecryptedOrgSecrets,
  getWorkflow,
  upsertWorkflowRun,
} from "@/features/workflows/data"

export type { RunStep } from "@/features/workflows/lib/run-types"
export type { RunWorkflowPayload } from "@/features/workflows/lib/trigger-payload"

export const runWorkflowTask = task({
  id: "run-workflow",
  run: async (
    {
      workflowId,
      orgId,
      trigger,
      authProfileId: authProfileIdOverride,
    }: RunWorkflowPayload,
    { ctx }
  ) => {
    const runId = ctx.run.id
    const workflow = await getWorkflow(orgId, workflowId)
    if (!workflow?.graph) throw new Error(`Workflow ${workflowId} has no graph`)

    const resolvedAuthProfileId =
      authProfileIdOverride !== undefined
        ? authProfileIdOverride
        : workflow.authProfileId

    const authProfile = resolvedAuthProfileId
      ? await getAuthProfile(orgId, resolvedAuthProfileId)
      : null
    if (resolvedAuthProfileId && !authProfile) {
      throw new Error(
        `Auth profile ${resolvedAuthProfileId} not found for this organization`
      )
    }

    const { nodes, edges } = workflow.graph
    const byId = new Map(nodes.map((n) => [n.id, n]))

    const incomingByTarget = new Map<string, Edge[]>()
    for (const edge of edges) {
      const list = incomingByTarget.get(edge.target) ?? []
      list.push(edge)
      incomingByTarget.set(edge.target, list)
    }

    const bodyOwned = collectBodyOwnedNodeIds(edges)
    const connected = new Set(edges.flatMap((e) => [e.source, e.target]))
    const order = toposort
      .array(
        nodes.map((n) => n.id),
        edges.map((e) => [e.source, e.target] as [string, string])
      )
      .filter((id) => connected.has(id) && !bodyOwned.has(id))

    // Steps include body nodes so the console shows loop iterations.
    const stepOrder = toposort
      .array(
        nodes.map((n) => n.id),
        edges.map((e) => [e.source, e.target] as [string, string])
      )
      .filter((id) => connected.has(id))

    logger.log(`Running workflow ${workflow.name}`, {
      steps: stepOrder.length,
      trigger: trigger?.source ?? "manual",
      authProfileId: authProfile?.id ?? null,
    })

    const steps: RunStep[] = stepOrder.map((nodeId) => {
      const node = byId.get(nodeId)!
      return {
        nodeId,
        type: node.data.type,
        title: node.data.title,
        status: "pending",
      }
    })
    const stepById = new Map(steps.map((s) => [s.nodeId, s]))

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
        projectId: process.env.BROWSERBASE_PROJECT_ID,
        model: "google/gemini-2.5-flash",
        disablePino: true,
        // Stagehand-level recovery for flaky element targeting.
        selfHeal: true,
        ...(authProfile
          ? {
              browserbaseSessionCreateParams: {
                browserSettings: {
                  context: {
                    id: authProfile.browserbaseContextId,
                    persist: true,
                  },
                },
              },
            }
          : {}),
      })
      await stagehand.init()
      browserbaseSessionId = stagehand.browserbaseSessionID
      await publishSteps()
      await metadata.flush()
      return stagehand
    }

    const secretValues = await getDecryptedOrgSecrets(orgId)
    const outputs: NodeOutputs = {
      secrets: secretValues,
      trigger: {
        source: trigger?.source ?? "manual",
        body: trigger?.body,
      },
    }

    const skipped = new Set<string>()
    const takenHandle = new Map<string, string>()

    const shouldSkip = (id: string): boolean => {
      const incoming = incomingByTarget.get(id) ?? []
      if (incoming.length === 0) return false
      const anyActive = incoming.some((edge) => {
        if (skipped.has(edge.source)) return false
        const taken = takenHandle.get(edge.source)
        if (taken != null && edge.sourceHandle != null) {
          return edge.sourceHandle === taken
        }
        return true
      })
      return !anyActive
    }

    const failRun = async (step: RunStep, error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)
      step.status = "failed"
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
      throw error instanceof Error ? error : new Error(message)
    }

    const runLeafNode = async (id: string) => {
      const step = stepById.get(id)!
      const node = byId.get(id)!
      logger.log(`Running step: ${node.data.title}`)

      if (shouldSkip(id)) {
        skipped.add(id)
        step.status = "skipped"
        await publishSteps()
        return
      }

      const executor = nodeExecutors[node.data.type]
      if (!executor) {
        step.status = "done"
        await publishSteps()
        return
      }

      step.status = "running"
      step.error = undefined
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

        if (
          node.data.type === "branch" &&
          output &&
          typeof output === "object" &&
          "branch" in output
        ) {
          takenHandle.set(id, String((output as { branch: string }).branch))
        }
      } catch (error) {
        step.durationMs = Date.now() - startedAt
        await failRun(step, error)
      }

      step.status = "done"
      step.durationMs = Date.now() - startedAt
      await publishSteps()
    }

    const runForEach = async (forEachId: string) => {
      const step = stepById.get(forEachId)!
      const node = byId.get(forEachId)!
      logger.log(`Running for-each: ${node.data.title}`)

      if (shouldSkip(forEachId)) {
        skipped.add(forEachId)
        step.status = "skipped"
        for (const bodyId of getDirectBodyOrder({
          forEachId,
          nodes,
          edges,
        })) {
          const bodyStep = stepById.get(bodyId)
          if (bodyStep && bodyStep.status === "pending") {
            skipped.add(bodyId)
            bodyStep.status = "skipped"
          }
        }
        await publishSteps()
        return
      }

      step.status = "running"
      step.error = undefined
      await publishSteps()
      await metadata.flush()

      const startedAt = Date.now()

      let items: unknown[]
      let bodyOrder: string[]
      try {
        const itemsText = interpolate({
          text: node.data.values.items ?? "",
          outputs,
        })
        const allItems = parseItemsArray(itemsText)
        const maxItems = parseMaxItems(node.data.values.maxItems)
        items = allItems.slice(0, maxItems)
        bodyOrder = getDirectBodyOrder({ forEachId, nodes, edges })
      } catch (error) {
        step.durationMs = Date.now() - startedAt
        await failRun(step, error)
        return
      }

      const results: unknown[] = []

      if (items.length === 0) {
        for (const bodyId of bodyOrder) {
          skipped.add(bodyId)
          const bodyStep = stepById.get(bodyId)
          if (bodyStep && bodyStep.status === "pending") {
            bodyStep.status = "skipped"
          }
        }
      }

      for (let index = 0; index < items.length; index++) {
        const item = items[index]
        outputs[forEachId] = {
          item,
          index,
          count: items.length,
        }

        for (const bodyId of bodyOrder) {
          delete outputs[bodyId]
          const bodyStep = stepById.get(bodyId)
          if (bodyStep) {
            bodyStep.status = "pending"
            bodyStep.error = undefined
            bodyStep.output = undefined
            bodyStep.durationMs = undefined
          }
          skipped.delete(bodyId)
          takenHandle.delete(bodyId)
        }
        await publishSteps()

        for (const bodyId of bodyOrder) {
          const bodyNode = byId.get(bodyId)!
          if (bodyNode.data.type === "for-each") {
            await runForEach(bodyId)
          } else {
            await runLeafNode(bodyId)
          }
        }

        const lastBodyId = bodyOrder[bodyOrder.length - 1]
        results.push(lastBodyId ? (outputs[lastBodyId] ?? null) : null)
      }

      const output = {
        item: items[items.length - 1] ?? null,
        index: Math.max(items.length - 1, 0),
        count: items.length,
        results,
      }
      outputs[forEachId] = output
      step.output = output
      takenHandle.set(forEachId, "done")
      step.status = "done"
      step.durationMs = Date.now() - startedAt
      await publishSteps()
    }

    const runNode = async (id: string) => {
      const node = byId.get(id)!
      if (node.data.type === "for-each") {
        await runForEach(id)
      } else {
        await runLeafNode(id)
      }
    }

    for (const id of order) {
      await runNode(id)
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
