import { useState } from "react"
import { PawPrintIcon } from "lucide-react"
import { toast } from "sonner"

import { PracticeOverview } from "@/components/practice-overview"
import { PracticeSettings } from "@/components/practice-settings"
import { Toaster } from "@/components/ui/sonner"
import { initialPractice, type Practice } from "@/data"

type View = "overview" | "settings"

export default function App() {
  const [practice, setPractice] = useState<Practice>(initialPractice)
  const [view, setView] = useState<View>("overview")

  function handleSave(next: Practice) {
    setPractice(next)
    setView("overview")
    toast.success("Practice settings saved")
  }

  return (
    <div className="min-h-svh bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:px-6">
          <PawPrintIcon className="size-5 text-primary" />
          <span className="font-heading font-semibold">PawBook</span>
          <span className="text-muted-foreground">/</span>
          <span className="truncate text-sm text-muted-foreground">{practice.name}</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {view === "overview" ? (
          <PracticeOverview practice={practice} onOpenSettings={() => setView("settings")} />
        ) : (
          <PracticeSettings
            practice={practice}
            onSave={handleSave}
            onCancel={() => setView("overview")}
          />
        )}
      </main>
      <Toaster position="bottom-right" />
    </div>
  )
}
