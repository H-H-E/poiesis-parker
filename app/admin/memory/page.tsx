"use client"

import { useState, useEffect, useCallback } from "react"
import { Toaster } from "react-hot-toast"
import { StudentSelector } from "@/app/components/admin/memory/StudentSelector"
import { AdminMemoryFilters } from "@/app/components/admin/memory/AdminMemoryFilters"
import { AdminFactList } from "@/app/components/admin/memory/AdminFactList"
import { FactEditModal } from "@/app/components/admin/memory/FactEditModal"
import { handleApiError } from "@/app/lib/memory/admin-utils"
import type { Fact, SearchParams } from "@/app/components/student/memory/types" // Reusing student types for now

// Placeholder type for Admin filters, refine as needed
type AdminFilters = Partial<
  Omit<SearchParams, "groupBy"> & {
    minConfidence?: number
    fromDate?: string
    toDate?: string
  }
>

export default function AdminMemoryPage() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  // State for memory data
  const [facts, setFacts] = useState<Fact[]>([])
  const [isLoadingFacts, setIsLoadingFacts] = useState(false)
  const [factsError, setFactsError] = useState<Error | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  // State for pagination
  const [offset, setOffset] = useState(0)
  const [limit] = useState(20)

  // State for filters
  const [filters, setFilters] = useState<AdminFilters>({
    query: "",
    factTypes: [],
    includeInactive: false, // Consider setting this default based on admin needs
    sortBy: "updated_at",
    sortOrder: "desc"
  })

  // State for the edit modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedFact, setSelectedFact] = useState<Fact | null>(null)

  // TODO: Fetch available fact types for filters if needed
  const [availableFactTypes, setAvailableFactTypes] = useState<string[]>([])

  // Fetch facts when a user is selected or filters/pagination change
  const fetchFactsForUser = useCallback(async () => {
    if (!selectedUserId) {
      setFacts([])
      setTotalCount(0)
      setHasMore(false)
      return
    }

    setIsLoadingFacts(true)
    setFactsError(null)

    try {
      const requestBody = {
        userId: selectedUserId,
        limit,
        offset,
        ...filters
      }

      const response = await fetch("/api/admin/getstudentmemory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          `Failed to fetch memories: ${response.statusText} ${errorData?.error || ""}`.trim()
        )
      }

      const data = await response.json()

      setFacts(data.facts || [])
      setTotalCount(data.totalCount || 0)
      setHasMore(data.hasMore || false)

      // TEMP: Populate available types from first fetch (improve later)
      if (
        offset === 0 &&
        availableFactTypes.length === 0 &&
        data.facts?.length > 0
      ) {
        const types = [
          ...new Set(data.facts.map((fact: Fact) => fact.factType))
        ].filter(Boolean) as string[]
        setAvailableFactTypes(types)
      }
    } catch (err) {
      const errorMessage = handleApiError(err, "Failed to fetch student facts")
      setFactsError(new Error(errorMessage))
      setFacts([])
      setTotalCount(0)
      setHasMore(false)
    } finally {
      setIsLoadingFacts(false)
    }
  }, [selectedUserId, filters, offset, limit, availableFactTypes.length])

  // Trigger fetch when necessary dependencies change
  useEffect(() => {
    fetchFactsForUser()
  }, [fetchFactsForUser])

  // Reset pagination when user or filters change
  useEffect(() => {
    // Only reset if offset is not already 0
    if (selectedUserId || Object.keys(filters).length) {
      setOffset(0)
    }
  }, [selectedUserId, filters])

  // Handler for student selection
  const handleStudentSelect = (userId: string | null) => {
    setSelectedUserId(userId)
    setAvailableFactTypes([]) // Reset available types for new user
  }

  // Handler for filter changes
  const handleFilterChange = (newFilters: AdminFilters) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      ...newFilters
    }))
  }

  // Handler for edit action
  const handleEditFact = (fact: Fact) => {
    setSelectedFact(fact)
    setIsModalOpen(true)
  }

  // Handler for create new fact
  const handleCreateFact = () => {
    setSelectedFact(null)
    setIsModalOpen(true)
  }

  // Handler for saving fact changes
  const handleSaveFact = async (updatedFact: Fact) => {
    try {
      const isCreating = !updatedFact.id
      const endpoint = isCreating
        ? "/api/admin/createstudentfact"
        : "/api/admin/updatestudentfact"

      // Prepare data for API
      const requestData = {
        ...updatedFact,
        user_id: selectedUserId // Ensure user ID is included for new facts
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          `Failed to ${isCreating ? "create" : "update"} fact: ${response.statusText} ${errorData?.error || ""}`.trim()
        )
      }

      // Refresh the facts list
      await fetchFactsForUser()

      // Close the modal
      setIsModalOpen(false)
      setSelectedFact(null)
    } catch (error) {
      handleApiError(error, "Failed to save fact")
      throw error // Let the modal component handle the error
    }
  }

  // Handler for delete action
  const handleDeleteFact = async (factId: string) => {
    if (
      confirm(
        "Are you sure you want to delete this fact? This action cannot be undone."
      )
    ) {
      try {
        const response = await fetch("/api/admin/deletestudentfact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ factId })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(
            `Failed to delete fact: ${response.statusText} ${errorData?.error || ""}`.trim()
          )
        }

        // Refresh the facts list
        await fetchFactsForUser()
      } catch (error) {
        handleApiError(error, "Failed to delete fact")
      }
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
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          Admin Memory Management
        </h1>

        {selectedUserId && (
          <button
            type="button"
            onClick={handleCreateFact}
            className="ml-4 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Add New Fact
          </button>
        )}
      </header>

      <StudentSelector onStudentSelect={handleStudentSelect} />

      {selectedUserId && (
        <div className="mt-6">
          <h2 className="mb-4 text-xl font-semibold">
            Memory for User ID: {selectedUserId}
          </h2>

          <AdminMemoryFilters
            onFilterChange={handleFilterChange}
            initialFilters={filters}
            availableFactTypes={availableFactTypes}
          />

          <AdminFactList
            facts={facts}
            isLoading={isLoadingFacts}
            error={factsError}
            onEditFact={handleEditFact}
            onDeleteFact={handleDeleteFact}
          />

          {/* Pagination / Load More */}
          {!isLoadingFacts && facts.length > 0 && (
            <div className="mt-8 flex items-center justify-center">
              {hasMore && (
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isLoadingFacts}
                  className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {isLoadingFacts ? "Loading..." : "Load More"}
                </button>
              )}
            </div>
          )}
          {!isLoadingFacts && facts.length > 0 && !hasMore && (
            <p className="mt-8 text-center text-sm text-gray-500">
              End of results.
            </p>
          )}
        </div>
      )}

      {!selectedUserId && (
        <p className="mt-6 text-gray-600">
          Please select a student to view their memory.
        </p>
      )}

      {/* Fact Edit Modal */}
      <FactEditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveFact}
        fact={selectedFact}
        availableFactTypes={availableFactTypes}
      />

      {/* Toast notifications */}
      <Toaster position="top-right" />
    </main>
  )
}
