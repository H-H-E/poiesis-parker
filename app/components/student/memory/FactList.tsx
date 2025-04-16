"use client"

import { useMemo } from "react"
import { FactCard } from "./FactCard"
import type { Fact, FeedbackType, FactGroup } from "./types"

interface FactListProps {
  facts: Fact[]
  isLoading: boolean
  error: Error | null
  onFeedback: (factId: string, feedbackType: FeedbackType) => Promise<void>
  groupBy?: "factType" | "date" | null
}

export const FactList: React.FC<FactListProps> = ({
  facts,
  isLoading,
  error,
  onFeedback,
  groupBy = "factType"
}) => {
  // Group facts if requested
  const groupedFacts = useMemo(() => {
    if (isLoading) {
      return [{ title: "Loading...", facts: [] }]
    }

    if (error) {
      return [{ title: "Error", facts: [] }]
    }

    if (facts.length === 0) {
      return [{ title: "No Memories Found", facts: [] }]
    }

    if (!groupBy) {
      return [{ title: "All Memories", facts }]
    }

    if (groupBy === "factType") {
      const groups: Record<string, Fact[]> = {}

      for (const fact of facts) {
        const key = fact.factType || "Other"
        if (!groups[key]) {
          groups[key] = []
        }
        groups[key].push(fact)
      }

      return Object.entries(groups).map(([title, facts]) => ({
        title,
        facts
      }))
    }

    if (groupBy === "date") {
      const today = new Date()
      const oneWeekAgo = new Date(today)
      oneWeekAgo.setDate(today.getDate() - 7)
      const oneMonthAgo = new Date(today)
      oneMonthAgo.setMonth(today.getMonth() - 1)

      const thisWeek: Fact[] = []
      const thisMonth: Fact[] = []
      const older: Fact[] = []

      for (const fact of facts) {
        const date = new Date(fact.updatedAt)
        if (date >= oneWeekAgo) {
          thisWeek.push(fact)
        } else if (date >= oneMonthAgo) {
          thisMonth.push(fact)
        } else {
          older.push(fact)
        }
      }

      const results: FactGroup[] = []
      if (thisWeek.length > 0)
        results.push({ title: "This Week", facts: thisWeek })
      if (thisMonth.length > 0)
        results.push({ title: "This Month", facts: thisMonth })
      if (older.length > 0) results.push({ title: "Older", facts: older })

      return results
    }

    return [{ title: "All Memories", facts }]
  }, [facts, groupBy, isLoading, error])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-3 size-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
        <h3 className="font-medium text-gray-700">Loading memories...</h3>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-red-500">
        <h3 className="mb-1 font-medium">Error loading memories</h3>
        <p className="text-sm">{error.message}</p>
      </div>
    )
  }

  // Empty state
  if (facts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h3 className="mb-1 font-medium text-gray-700">No memories found</h3>
        <p className="text-gray-600">
          No memories matching your criteria were found.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {groupedFacts.map(group => (
        <div key={group.title} className="mb-6">
          <h2 className="mb-3 text-xl font-semibold text-gray-800">
            {group.title}
          </h2>
          <div className="space-y-4">
            {group.facts.map(fact => (
              <FactCard key={fact.id} fact={fact} onFeedback={onFeedback} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
