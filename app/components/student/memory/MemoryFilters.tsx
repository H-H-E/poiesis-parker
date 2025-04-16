"use client"

import { useState, useEffect } from "react"
import type { SearchParams } from "./types"

interface MemoryFiltersProps {
  onFilterChange: (filters: Partial<SearchParams>) => void
  availableFactTypes: string[]
  initialFilters?: Partial<SearchParams>
}

export const MemoryFilters: React.FC<MemoryFiltersProps> = ({
  onFilterChange,
  availableFactTypes = [],
  initialFilters = {}
}) => {
  const [query, setQuery] = useState(initialFilters.query || "")
  const [selectedFactTypes, setSelectedFactTypes] = useState<string[]>(
    initialFilters.factTypes || []
  )
  const [groupBy, setGroupBy] = useState<"factType" | "date" | null>(
    initialFilters.groupBy ?? "factType"
  )

  // Apply filters when the component mounts with initial filters
  useEffect(() => {
    if (Object.keys(initialFilters).length > 0) {
      onFilterChange(initialFilters)
    }
  }, [initialFilters, onFilterChange])

  // Handle search input (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange({ query })
    }, 500)

    return () => clearTimeout(timer)
  }, [query, onFilterChange])

  // Handle fact type selection changes
  const handleFactTypeChange = (factType: string) => {
    const newSelectedTypes = selectedFactTypes.includes(factType)
      ? selectedFactTypes.filter(type => type !== factType)
      : [...selectedFactTypes, factType]

    setSelectedFactTypes(newSelectedTypes)
    onFilterChange({ factTypes: newSelectedTypes })
  }

  // Handle group by change
  const handleGroupByChange = (newGroupBy: "factType" | "date" | null) => {
    setGroupBy(newGroupBy)
    onFilterChange({ groupBy: newGroupBy })
  }

  return (
    <div className="mb-6 space-y-4">
      {/* Search Input */}
      <div>
        <label
          htmlFor="memory-search"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Search Memories
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg
              className="size-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            id="memory-search"
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="block w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            placeholder="Search memories..."
          />
        </div>
      </div>

      {/* Fact Type Filters */}
      {availableFactTypes.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-gray-700">
            Filter by Type
          </h3>
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

      {/* Group By Options */}
      <div>
        <h3 className="mb-2 text-sm font-medium text-gray-700">Group By</h3>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => handleGroupByChange("factType")}
            className={`rounded-md px-3 py-1 text-sm transition-colors ${
              groupBy === "factType"
                ? "border-blue-300 bg-blue-100 text-blue-800"
                : "border-gray-300 bg-gray-100 text-gray-800"
            } border`}
          >
            Type
          </button>
          <button
            type="button"
            onClick={() => handleGroupByChange("date")}
            className={`rounded-md px-3 py-1 text-sm transition-colors ${
              groupBy === "date"
                ? "border-blue-300 bg-blue-100 text-blue-800"
                : "border-gray-300 bg-gray-100 text-gray-800"
            } border`}
          >
            Date
          </button>
          <button
            type="button"
            onClick={() => handleGroupByChange(null)}
            className={`rounded-md px-3 py-1 text-sm transition-colors ${
              groupBy === null
                ? "border-blue-300 bg-blue-100 text-blue-800"
                : "border-gray-300 bg-gray-100 text-gray-800"
            } border`}
          >
            None
          </button>
        </div>
      </div>
    </div>
  )
}
