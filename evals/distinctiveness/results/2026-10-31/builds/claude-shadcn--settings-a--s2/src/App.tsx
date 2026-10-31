import { useState } from "react"
import { Toaster } from "@/components/ui/sonner"
import { WorkspaceOverview } from "@/components/workspace-overview"
import { WorkspaceSettings } from "@/components/workspace-settings"
import { initialWorkspace, type Workspace } from "@/data/workspace"

type View = "overview" | "settings"

export default function App() {
  const [view, setView] = useState<View>("overview")
  const [workspace, setWorkspace] = useState<Workspace>(initialWorkspace)

  return (
    <div className="min-h-svh bg-muted/40">
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        {view === "overview" ? (
          <WorkspaceOverview
            workspace={workspace}
            onOpenSettings={() => setView("settings")}
          />
        ) : (
          <WorkspaceSettings
            workspace={workspace}
            onSave={(changes) => setWorkspace((w) => ({ ...w, ...changes }))}
            onCancel={() => setView("overview")}
          />
        )}
      </main>
      <Toaster position="bottom-right" />
    </div>
  )
}
