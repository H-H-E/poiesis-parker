"use client"

import { useState, useEffect, useCallback } from "react"
import { MemoryFilters } from "@/app/components/student/memory/MemoryFilters"
import { FactList } from "@/app/components/student/memory/FactList"
import type {
  Fact,
  FeedbackType,
  SearchParams
} from "@/app/components/student/memory/types"

export default function StudentMemoryPage() {
  // State for memory data
  const [facts, setFacts] = useState<Fact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  // State for pagination
  const [offset, setOffset] = useState(0)
  const [limit] = useState(20)

  // State for filters
  const [filters, setFilters] = useState<Partial<SearchParams>>({
    query: "",
    factTypes: [],
    includeInactive: false,
    sortBy: "updated_at",
    sortOrder: "desc",
    groupBy: "factType"
  })

  // State for available fact types
  const [availableFactTypes, setAvailableFactTypes] = useState<string[]>([])

  // Fetch facts from the API
  const fetchFacts = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Construct the query string from filters
      const params = new URLSearchParams()

      if (filters.query) params.append("query", filters.query)
      if (filters.factTypes && filters.factTypes.length > 0) {
        params.append("factTypes", filters.factTypes.join(","))
      }

      params.append("offset", offset.toString())
      params.append("limit", limit.toString())
      params.append("sortBy", filters.sortBy || "updated_at")
      params.append("sortOrder", filters.sortOrder || "desc")

      // Make the API request
      const response = await fetch(`/api/student/memory?${params.toString()}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch memories: ${response.statusText}`)
      }

      const data = await response.json()

      setFacts(data.facts || [])
      setTotalCount(data.totalCount || 0)
      setHasMore(data.hasMore || false)

      // If this is the first request, extract available fact types from the response
      if (
        availableFactTypes.length === 0 &&
        data.facts &&
        data.facts.length > 0
      ) {
        const factTypeSet = new Set<string>()
        // Explicitly type each fact and ensure factType is a string
        for (const fact of data.facts as Fact[]) {
          if (fact.factType) factTypeSet.add(fact.factType)
        }
        setAvailableFactTypes(Array.from(factTypeSet))
      }
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("An unknown error occurred")
      )
    } finally {
      setIsLoading(false)
    }
  }, [filters, offset, limit, availableFactTypes.length])

  // Update when fetchFacts or offset changes
  useEffect(() => {
    fetchFacts()
    // Reset offset when filters change (but not when fetchFacts changes)
    if (offset !== 0) {
      setOffset(0)
    }
  }, [fetchFacts, offset])

  // Handle filter changes from the MemoryFilters component
  const handleFilterChange = (newFilters: Partial<SearchParams>) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      ...newFilters
    }))
  }

  // Handle feedback submission
  const handleFeedback = async (
    factId: string,
    feedbackType: FeedbackType
  ): Promise<void> => {
    try {
      // Submit feedback to API
      const response = await fetch("/api/student/memory/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          factId,
          feedbackType
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to submit feedback: ${response.statusText}`)
      }

      // Optionally refresh the facts list after successful feedback
      // fetchFacts();
    } catch (error) {
      console.error("Error submitting feedback:", error)
      throw error // Re-throw to let the UI component handle it
    }
  }

  // Handle loading more facts
  const handleLoadMore = () => {
    if (hasMore) {
      setOffset(prevOffset => prevOffset + limit)
    }
  }

  return (
    <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Your Memory</h1>
          <p className="text-gray-600">
            Here&apos;s what I understand about you from our interactions. This
            helps me provide a more personalized learning experience.
          </p>
        </header>

        <MemoryFilters
          onFilterChange={handleFilterChange}
          availableFactTypes={availableFactTypes}
          initialFilters={filters}
        />

        <FactList
          facts={facts}
          isLoading={isLoading}
          error={error}
          onFeedback={handleFeedback}
          groupBy={filters.groupBy as "factType" | "date" | null}
        />

        {/* Pagination / Load More */}
        {!isLoading && facts.length > 0 && (
          <div className="mt-8 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {facts.length} of {totalCount} memories
            </div>
            {hasMore && (
              <button
                type="button"
                onClick={handleLoadMore}
                className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Load More
              </button>
            )}
          </div>
        )}

        {/* Privacy Footer */}
        <footer className="mt-12 border-t border-gray-200 pt-6 text-center text-sm text-gray-500">
          <p>
            Your privacy is important. This information is used solely to
            personalize your learning experience.
          </p>
        </footer>
      </div>
    </main>
  )
}
