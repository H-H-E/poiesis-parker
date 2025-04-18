/**
 * Error Logger Utility
 *
 * This utility helps with consistent error handling and logging across API routes.
 */

export interface ErrorResponseData {
  message: string
  status: number
  details?: unknown
}

/**
 * Handles API errors consistently with detailed logging
 */
export function handleApiError(
  error: unknown,
  context = "API"
): ErrorResponseData {
  // Log error with context for easier debugging
  console.error(`[${context} Error]:`, error)

  // Extract error details
  const errorMessage =
    error instanceof Error ? error.message : "An unexpected error occurred"
  const errorStatus =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as Record<string, unknown>).status === "number"
      ? (error as Record<string, number>).status
      : 500

  // Create standardized error response
  const errorResponse: ErrorResponseData = {
    message: errorMessage,
    status: errorStatus
  }

  // Add additional details for non-production environments
  if (process.env.NODE_ENV !== "production") {
    errorResponse.details =
      error instanceof Error
        ? {
            stack: error.stack,
            name: error.name
          }
        : error
  }

  return errorResponse
}

/**
 * Formats error message based on common patterns
 */
export function formatErrorMessage(errorMessage: string): string {
  const lowerCaseError = errorMessage.toLowerCase()

  if (lowerCaseError.includes("api key not found")) {
    return "API Key not found. Please set it in your profile settings."
  }

  if (
    lowerCaseError.includes("api key not valid") ||
    lowerCaseError.includes("invalid api key") ||
    lowerCaseError.includes("incorrect api key")
  ) {
    return "API Key is incorrect. Please fix it in your profile settings."
  }

  if (lowerCaseError.includes("rate limit")) {
    return "Rate limit exceeded. Please try again later."
  }

  return errorMessage
}
