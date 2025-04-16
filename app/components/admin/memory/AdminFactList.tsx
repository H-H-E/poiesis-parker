'use client';

import type { Fact } from '@/app/components/student/memory/types'; // Reusing student type
import { AdminFactCard } from './AdminFactCard';

interface AdminFactListProps {
  facts: Fact[];
  isLoading: boolean;
  error: Error | null;
  onEditFact: (fact: Fact) => void;
  onDeleteFact: (factId: string) => void;
}

export const AdminFactList: React.FC<AdminFactListProps> = ({ 
  facts, 
  isLoading, 
  error, 
  onEditFact, 
  onDeleteFact 
}) => {
  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={`skeleton-admin-${i}-${Date.now()}`} className="animate-pulse rounded-lg border p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex gap-2">
                <div className="h-5 w-16 rounded-full bg-gray-200" />
                <div className="h-5 w-16 rounded-full bg-gray-200" />
              </div>
              <div className="h-4 w-24 rounded bg-gray-200" />
            </div>
            <div className="mb-2 h-4 w-full rounded bg-gray-200" />
            <div className="mb-3 h-4 w-3/4 rounded bg-gray-200" />
            <div className="flex justify-end space-x-2">
              <div className="h-8 w-16 rounded bg-gray-200" />
              <div className="h-8 w-16 rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <h3 className="mb-1 font-medium text-red-800">Error loading facts</h3>
        <p className="text-red-700">{error.message}</p>
      </div>
    );
  }

  // Empty state
  if (facts.length === 0) {
    return (
      <div className="rounded-lg border bg-gray-50 p-8 text-center">
        <h3 className="mb-1 font-medium text-gray-700">No facts found</h3>
        <p className="text-gray-600">No facts match the current filters for this user.</p>
      </div>
    );
  }

  // Display facts
  return (
    <div className="space-y-4">
      {facts.map(fact => (
        <AdminFactCard 
          key={fact.id} 
          fact={fact} 
          onEdit={onEditFact} 
          onDelete={onDeleteFact} 
        />
      ))}
    </div>
  );
}; 