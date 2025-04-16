import { formatDistanceToNow } from "date-fns"
import type { Fact } from "@/app/components/student/memory/types" // Reusing student type
import {
  formatDate,
  getConfidenceClasses,
  getConfidenceLabel,
  truncateText
} from "@/app/lib/memory/admin-utils"

interface AdminFactCardProps {
  fact: Fact
  onEdit: (fact: Fact) => void
  onDelete: (factId: string) => void
}

export const AdminFactCard: React.FC<AdminFactCardProps> = ({
  fact,
  onEdit,
  onDelete
}) => {
  const timeAgo = formatDistanceToNow(new Date(fact.updatedAt), {
    addSuffix: true
  })
  const exactDate = formatDate(fact.updatedAt)

  // Type styling (same as student view)
  const getTypeStyle = (type: string) => {
    switch (type.toLowerCase()) {
      case "personal":
        return "bg-blue-100 text-blue-800"
      case "preference":
        return "bg-purple-100 text-purple-800"
      case "concept":
        return "bg-green-100 text-green-800"
      case "struggle":
        return "bg-orange-100 text-orange-800"
      case "goal":
        return "bg-indigo-100 text-indigo-800"
      case "topic_interest":
        return "bg-pink-100 text-pink-800"
      case "learning_style":
        return "bg-teal-100 text-teal-800"
      case "session":
        return "bg-amber-100 text-amber-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Status styling
  const getStatusStyle = (isActive: boolean) => {
    return isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
  }

  return (
    <div className="mb-4 rounded-lg border p-4 shadow-sm transition-shadow hover:shadow-md">
      {/* Header: Type, Status, Date */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 ${getTypeStyle(fact.factType)}`}
          >
            {fact.factType}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 ${getStatusStyle(fact.isActive)}`}
          >
            {fact.isActive ? "Active" : "Inactive"}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 ${getConfidenceClasses(fact.confidence)}`}
          >
            {getConfidenceLabel(fact.confidence)}
          </span>
        </div>
        <span className="text-gray-500" title={exactDate}>
          Updated {timeAgo}
        </span>
      </div>

      {/* Content */}
      <p className="mb-2 text-gray-800">{fact.content}</p>

      {/* Metadata: Confidence, Origin */}
      <div className="mb-3 space-y-1 text-xs text-gray-600">
        {fact.confidence !== undefined && (
          <p>Confidence: {Math.round((fact.confidence || 0) * 100)}%</p>
        )}
        {fact.originContext && (
          <p>
            <span className="italic">
              Source: {truncateText(fact.originContext, 150)}
            </span>
          </p>
        )}
        <p>ID: {fact.id}</p>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={() => onEdit(fact)}
          className="rounded border border-blue-300 px-3 py-1 text-sm text-blue-700 hover:bg-blue-50"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(fact.id)}
          className="rounded border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
