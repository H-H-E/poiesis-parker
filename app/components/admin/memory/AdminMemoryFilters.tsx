"use client"

import { useState, useEffect, useCallback } from "react"
import type { SearchParams } from "@/app/components/student/memory/types" // Reusing student types for now

// We might need to extend SearchParams or create an AdminSearchParams interface later
// if admin filters diverge significantly.
type AdminFilters = Partial<
  Omit<SearchParams, "groupBy"> & {
    // Add admin-specific filter properties here if needed
    // For now, reusing SearchParams fields like includeInactive, etc.
    minConfidence?: number
    fromDate?: string
    toDate?: string
  }
>

interface AdminMemoryFiltersProps {
  onFilterChange: (filters: AdminFilters) => void
  availableFactTypes: string[] // Assuming these might still be useful
  initialFilters?: AdminFilters
}

export const AdminMemoryFilters: React.FC<AdminMemoryFiltersProps> = ({
  onFilterChange,
  availableFactTypes = [],
  initialFilters = {}
}) => {
  const [query, setQuery] = useState(initialFilters.query || "")
  const [selectedFactTypes, setSelectedFactTypes] = useState<string[]>(
    initialFilters.factTypes || []
  )
  const [includeInactive, setIncludeInactive] = useState(
    initialFilters.includeInactive || false
  )
  const [fromDate, setFromDate] = useState(initialFilters.fromDate || "")
  const [toDate, setToDate] = useState(initialFilters.toDate || "")
  const [minConfidence, setMinConfidence] = useState<number | string>(
    initialFilters.minConfidence ?? "" // Use empty string for uncontrolled input
  )

  // Debounce search query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange({ query })
    }, 500)
    return () => clearTimeout(timer)
  }, [query, onFilterChange])

  // Propagate other filter changes immediately (or debounce if preferred)
  useEffect(() => {
    const confidenceValue =
      typeof minConfidence === "string"
        ? Number.parseFloat(minConfidence)
        : minConfidence
    onFilterChange({
      factTypes: selectedFactTypes,
      includeInactive,
      fromDate: fromDate || undefined, // Send undefined if empty
      toDate: toDate || undefined,
      minConfidence:
        !Number.isNaN(confidenceValue) &&
        confidenceValue >= 0 &&
        confidenceValue <= 1
          ? confidenceValue
          : undefined
    })
  }, [
    selectedFactTypes,
    includeInactive,
    fromDate,
    toDate,
    minConfidence,
    onFilterChange
  ])

  // Handle fact type changes
  const handleFactTypeChange = (factType: string) => {
    const newSelectedTypes = selectedFactTypes.includes(factType)
      ? selectedFactTypes.filter(type => type !== factType)
      : [...selectedFactTypes, factType]
    setSelectedFactTypes(newSelectedTypes)
    // Change is propagated by the useEffect above
  }

  // Handle inactive toggle changes
  const handleInactiveChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked
    setIncludeInactive(checked)
    // Change is propagated by the useEffect above
  }

  // Handlers for new filters
  const handleDateChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    type: "from" | "to"
  ) => {
    const value = event.target.value
    if (type === "from") {
      setFromDate(value)
    } else {
      setToDate(value)
    }
    // Change is propagated by the useEffect above
  }

  const handleConfidenceChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setMinConfidence(event.target.value) // Keep as string for input control
    // Change is propagated by the useEffect above
  }

  return (
    <div className="mb-6 space-y-4 rounded border bg-gray-50 p-4">
      <h3 className="text-lg font-semibold">Filter Memory Facts</h3>

      {/* Search Input */}
      <div>
        <label
          htmlFor="admin-memory-search"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Search Content
        </label>
        <input
          id="admin-memory-search"
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          placeholder="Search fact content..."
        />
      </div>

      {/* Fact Type Filters */}
      {availableFactTypes.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-medium text-gray-700">
            Filter by Type
          </h4>
          <div className="flex flex-wrap gap-2">
            {availableFactTypes.map(factType => (
              <button
                key={factType}
                type="button"
                onClick={() => handleFactTypeChange(factType)}
                className={`rounded-full px-3 py-1 text-sm transition-colors ${
                  selectedFactTypes.includes(factType)
                    ? "border-blue-300 bg-blue-100 text-blue-800"
                    : "border-gray-300 bg-gray-100 text-gray-800"
                } border`}
              >
                {factType}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Row for Toggle, Dates, Confidence */}
      <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
        {/* Include Inactive Toggle */}
        <div className="flex items-center pt-5">
          <input
            id="include-inactive"
            type="checkbox"
            checked={includeInactive}
            onChange={handleInactiveChange}
            className="size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label
            htmlFor="include-inactive"
            className="ml-2 block text-sm text-gray-900"
          >
            Include Inactive Facts
          </label>
        </div>

        {/* Date Range Filters */}
        <div>
          <label
            htmlFor="from-date"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            From Date
          </label>
          <input
            id="from-date"
            type="date"
            value={fromDate}
            onChange={e => handleDateChange(e, "from")}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          />
        </div>
        <div>
          <label
            htmlFor="to-date"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            To Date
          </label>
          <input
            id="to-date"
            type="date"
            value={toDate}
            onChange={e => handleDateChange(e, "to")}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          />
        </div>

        {/* Confidence Filter */}
        <div>
          <label
            htmlFor="min-confidence"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Min. Confidence (0-1)
          </label>
          <input
            id="min-confidence"
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={minConfidence}
            onChange={handleConfidenceChange}
            placeholder="e.g., 0.7"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  )
}
