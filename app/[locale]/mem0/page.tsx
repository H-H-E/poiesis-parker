"use client"

import { Button } from "@/components/ui/button"
import { useRouter, useParams } from "next/navigation"

export default function Mem0DashboardPage() {
  const router = useRouter()
  const params = useParams()
  const locale = params?.locale as string

  return (
    <main className="container mx-auto min-h-screen p-4">
      <div className="flex flex-col space-y-4 py-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold">Memory Dashboard</h1>
            <p className="text-muted-foreground text-sm">
              Manage your personalized learning memories
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push(`/${locale}/mem0/settings`)}
            size="sm"
          >
            Settings
          </Button>
        </div>
      </div>
    </main>
  )
}
