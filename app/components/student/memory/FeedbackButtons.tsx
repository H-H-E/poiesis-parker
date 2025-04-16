'use client';

import { useState } from 'react';
import type { FeedbackType } from './types';

interface FeedbackButtonsProps {
  factId: string;
  onFeedback: (factId: string, feedbackType: FeedbackType) => Promise<void>;
}

export const FeedbackButtons: React.FC<FeedbackButtonsProps> = ({ factId, onFeedback }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedFeedback, setSubmittedFeedback] = useState<FeedbackType | null>(null);

  const handleFeedback = async (feedbackType: FeedbackType) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onFeedback(factId, feedbackType);
      setSubmittedFeedback(feedbackType);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      // Let the parent component handle any error UI
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedFeedback) {
    return (
      <div className="mt-2 text-sm text-green-600">
        Thank you for your feedback!
      </div>
    );
  }

  return (
    <div className="mt-2 flex space-x-2">
      <button 
        type="button"
        onClick={() => handleFeedback('correct')} 
        disabled={isSubmitting}
        className="rounded border p-1 text-xs hover:bg-green-100 disabled:opacity-50"
      >
        👍 Correct
      </button>
      <button 
        type="button"
        onClick={() => handleFeedback('incorrect')} 
        disabled={isSubmitting}
        className="rounded border p-1 text-xs hover:bg-red-100 disabled:opacity-50"
      >
        👎 Incorrect
      </button>
      <button 
        type="button"
        onClick={() => handleFeedback('outdated')} 
        disabled={isSubmitting}
        className="rounded border p-1 text-xs hover:bg-yellow-100 disabled:opacity-50"
      >
        ❓ Outdated
      </button>
    </div>
  );
}; 