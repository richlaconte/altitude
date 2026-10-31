import { ProjectsScreen } from "@/components/projects-screen"
import { Toaster } from "@/components/ui/sonner"

export default function App() {
  return (
    <main className="min-h-svh bg-muted/30">
      <ProjectsScreen />
      <Toaster position="bottom-right" />
    </main>
  )
}
