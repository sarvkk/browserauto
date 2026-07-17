import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

import { Canvas } from "./canvas"
import { ConsolePanel } from "./console-panel"
import { RightSidebar } from "./right-sidebar"
import type { WorkflowGraph } from "@/lib/db/schema"

interface WorkflowShellProps {
  workflowId: string
  workflowName: string
  initialGraph?: WorkflowGraph | null
  scheduleCron: string | null
  webhookSecret: string | null
  authProfileId: string | null
  authProfiles: { id: string; name: string }[]
}

export function WorkflowShell({
  workflowId,
  workflowName,
  initialGraph,
  scheduleCron,
  webhookSecret,
  authProfileId,
  authProfiles,
}: WorkflowShellProps) {
  return (
    <ResizablePanelGroup orientation="horizontal" className="size-full">
      <ResizablePanel minSize="30rem">
        <ResizablePanelGroup orientation="vertical">
          <ResizablePanel minSize="18rem">
            <Canvas initialGraph={initialGraph} />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize="8rem" minSize="6rem">
            <ConsolePanel />
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize="16rem" minSize="14rem" maxSize="36rem">
        <RightSidebar
          workflowId={workflowId}
          workflowName={workflowName}
          scheduleCron={scheduleCron}
          webhookSecret={webhookSecret}
          authProfileId={authProfileId}
          authProfiles={authProfiles}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
