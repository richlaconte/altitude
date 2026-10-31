import { TruckIcon } from "lucide-react"

import { ShipmentRecords } from "@/components/shipment-records"
import { Toaster } from "@/components/ui/sonner"

export default function App() {
  return (
    <div className="min-h-svh bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 sm:px-6">
          <TruckIcon className="size-5" />
          <span className="font-semibold">Ridgeway Freight</span>
          <span className="text-muted-foreground">/ Shipment Tracker</span>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        <ShipmentRecords />
      </main>
      <Toaster position="bottom-right" />
    </div>
  )
}
