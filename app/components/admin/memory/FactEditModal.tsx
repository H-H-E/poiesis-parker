"use client"

import { useState, useEffect } from "react"
import type { Fact } from "@/app/components/student/memory/types"

interface FactEditModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (updatedFact: Fact) => Promise<void>
  fact?: Fact | null
  availableFactTypes: string[]
}

export const FactEditModal: React.FC<FactEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  fact,
  availableFactTypes = []
}) => {
  const [formData, setFormData] = useState<Partial<Fact>>({
    content: "",
    factType: "",
    confidence: 0.7,
    isActive: true
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customFactType, setCustomFactType] = useState<string>("")
  const [showCustomFactTypeInput, setShowCustomFactTypeInput] = useState(false)

  // Reset form when modal opens/closes or fact changes
  useEffect(() => {
    if (isOpen && fact) {
      setFormData({
        id: fact.id,
        content: fact.content || "",
        factType: fact.factType || "",
        confidence: fact.confidence || 0.7,
        isActive: fact.isActive,
        originContext: fact.originContext || ""
      })

      // Handle custom fact types
      setShowCustomFactTypeInput(!availableFactTypes.includes(fact.factType))
      setCustomFactType(
        !availableFactTypes.includes(fact.factType) ? fact.factType : ""
      )
    } else if (isOpen && !fact) {
      // Creating a new fact
      setFormData({
        content: "",
        factType: availableFactTypes.length > 0 ? availableFactTypes[0] : "",
        confidence: 0.7,
        isActive: true
      })
      setShowCustomFactTypeInput(false)
      setCustomFactType("")
    }

    setError(null)
  }, [isOpen, fact, availableFactTypes])

  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target

    if (name === "confidence") {
      // Validate confidence is between 0 and 1
      const numValue = Number.parseFloat(value)
      if (!Number.isNaN(numValue) && numValue >= 0 && numValue <= 1) {
        setFormData({ ...formData, [name]: numValue })
      }
    } else if (name === "isActive" && e.target instanceof HTMLInputElement) {
      setFormData({ ...formData, [name]: e.target.checked })
    } else if (name === "factType") {
      if (value === "_custom") {
        setShowCustomFactTypeInput(true)
        // Keep the current factType until custom is entered
      } else {
        setShowCustomFactTypeInput(false)
        setFormData({ ...formData, [name]: value })
      }
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  // Handle custom fact type input
  const handleCustomFactTypeChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value
    setCustomFactType(value)
    setFormData({ ...formData, factType: value })
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form data
    if (!formData.content?.trim()) {
      setError("Content is required")
      return
    }

    if (!formData.factType?.trim()) {
      setError("Fact type is required")
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      // Prepare the fact data for saving
      const factToSave = {
        ...fact,
        ...formData
      } as Fact

      await onSave(factToSave)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save fact")
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600/50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="border-b p-5">
          <h3 className="text-lg font-medium">
            {fact ? "Edit Memory Fact" : "Add New Memory Fact"}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          {/* Content */}
          <div className="mb-4">
            <label
              htmlFor="content"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Content
            </label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              rows={4}
            />
          </div>

          {/* Fact Type */}
          <div className="mb-4">
            <label
              htmlFor="factType"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Fact Type
            </label>
            <select
              id="factType"
              name="factType"
              value={showCustomFactTypeInput ? "_custom" : formData.factType}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            >
              {availableFactTypes.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
              <option value="_custom">Add Custom Type</option>
            </select>
          </div>

          {/* Custom Fact Type Input */}
          {showCustomFactTypeInput && (
            <div className="mb-4">
              <label
                htmlFor="customFactType"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Custom Fact Type
              </label>
              <input
                id="customFactType"
                name="customFactType"
                type="text"
                value={customFactType}
                onChange={handleCustomFactTypeChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="Enter custom fact type"
              />
            </div>
          )}

          {/* Confidence */}
          <div className="mb-4">
            <label
              htmlFor="confidence"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Confidence (0-1)
            </label>
            <input
              id="confidence"
              name="confidence"
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={formData.confidence}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
          </div>

          {/* Active Status */}
          <div className="mb-4 flex items-center">
            <input
              id="isActive"
              name="isActive"
              type="checkbox"
              checked={formData.isActive}
              onChange={handleChange}
              className="size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="isActive"
              className="ml-2 block text-sm font-medium text-gray-700"
            >
              Active
            </label>
          </div>

          {/* Origin Context (Read-only if editing) */}
          {fact?.originContext && (
            <div className="mb-4">
              <label
                htmlFor="originContext"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Origin Context
              </label>
              <textarea
                id="originContext"
                name="originContext"
                value={formData.originContext}
                readOnly
                className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm"
                rows={3}
              />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : fact ? "Update Fact" : "Create Fact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
