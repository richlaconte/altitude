import { useState } from "react"

import { Toaster } from "@/components/ui/sonner"
import { WorkspaceOverview } from "@/components/workspace-overview"
import { WorkspaceSettings } from "@/components/workspace-settings"
import { initialWorkspace, type Workspace } from "@/data"

type View = "overview" | "settings"

export default function App() {
  const [workspace, setWorkspace] = useState<Workspace>(initialWorkspace)
  const [view, setView] = useState<View>("overview")

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      {view === "overview" ? (
        <WorkspaceOverview workspace={workspace} onOpenSettings={() => setView("settings")} />
      ) : (
        <div className="max-w-2xl">
          <WorkspaceSettings
            workspace={workspace}
            onSave={(fields) => setWorkspace((w) => ({ ...w, ...fields }))}
            onCancel={() => setView("overview")}
          />
        </div>
      )}
      <Toaster position="bottom-right" />
    </main>
  )
}
