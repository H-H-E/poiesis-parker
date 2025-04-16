/**
 * Utility functions for admin memory management
 */

import { toast } from 'react-hot-toast';
import type { Fact } from '@/app/components/student/memory/types';

/**
 * Handle API errors with consistent error messaging
 */
export const handleApiError = (error: unknown, defaultMessage: string = 'An error occurred'): string => {
  console.error('API Error:', error);
  
  // Extract error message if available
  let errorMessage = defaultMessage;
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (error && typeof error === 'object' && 'message' in error) {
    errorMessage = String((error as {message: string}).message);
  }
  
  // Show toast notification for user feedback
  toast.error(errorMessage);
  
  return errorMessage;
};

/**
 * Format date for display in the UI
 */
export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

/**
 * Get label for fact confidence score
 */
export const getConfidenceLabel = (confidence: number | undefined | null): string => {
  if (confidence === undefined || confidence === null) {
    return 'Unknown';
  }
  
  if (confidence >= 0.8) return 'High';
  if (confidence >= 0.5) return 'Medium';
  return 'Low';
};

/**
 * Get CSS classes for confidence indicator
 */
export const getConfidenceClasses = (confidence: number | undefined | null): string => {
  if (confidence === undefined || confidence === null) {
    return 'bg-gray-200 text-gray-800';
  }
  
  if (confidence >= 0.8) return 'bg-green-100 text-green-800';
  if (confidence >= 0.5) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}; 