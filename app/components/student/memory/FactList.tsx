'use client';

import { useMemo } from 'react';
import type { Fact, FactGroup, FeedbackType } from './types';
import { FactCard } from './FactCard';

interface FactListProps {
  facts: Fact[];
  isLoading: boolean;
  error: Error | null;
  onFeedback: (factId: string, feedbackType: FeedbackType) => Promise<void>;
  groupBy?: 'factType' | 'date' | null;
}

export const FactList: React.FC<FactListProps> = ({ 
  facts, 
  isLoading, 
  error, 
  onFeedback,
  groupBy = 'factType'
}) => {
  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={`skeleton-${i}-${Date.now()}`} className="mb-4 animate-pulse rounded-lg border p-4">
            <div className="mb-2 flex items-start justify-between">
              <div className="h-6 w-20 rounded-full bg-gray-200" />
              <div className="h-4 w-32 rounded bg-gray-200" />
            </div>
            <div className="mb-2 h-4 w-full rounded bg-gray-200" />
            <div className="mb-2 h-4 w-5/6 rounded bg-gray-200" />
            <div className="mb-4 h-4 w-1/2 rounded bg-gray-200" />
            <div className="flex space-x-2">
              <div className="h-8 w-20 rounded bg-gray-200" />
              <div className="h-8 w-20 rounded bg-gray-200" />
              <div className="h-8 w-20 rounded bg-gray-200" />
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
        <h3 className="mb-1 font-medium text-red-800">Error loading memories</h3>
        <p className="text-red-700">{error.message}</p>
      </div>
    );
  }

  // Empty state
  if (facts.length === 0) {
    return (
      <div className="rounded-lg border bg-gray-50 p-8 text-center">
        <h3 className="mb-1 font-medium text-gray-700">No memories found</h3>
        <p className="text-gray-600">No memories matching your criteria were found.</p>
      </div>
    );
  }

  // Group facts if requested
  const groupedFacts = useMemo(() => {
    if (!groupBy) {
      return [{ title: 'All Memories', facts }];
    }

    if (groupBy === 'factType') {
      const groups: Record<string, Fact[]> = {};
      
      for (const fact of facts) {
        const key = fact.factType || 'Other';
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(fact);
      }
      
      return Object.entries(groups).map(([title, facts]) => ({
        title,
        facts
      }));
    }

    if (groupBy === 'date') {
      const today = new Date();
      const oneWeekAgo = new Date(today);
      oneWeekAgo.setDate(today.getDate() - 7);
      const oneMonthAgo = new Date(today);
      oneMonthAgo.setMonth(today.getMonth() - 1);
      
      const thisWeek: Fact[] = [];
      const thisMonth: Fact[] = [];
      const older: Fact[] = [];
      
      for (const fact of facts) {
        const date = new Date(fact.updatedAt);
        if (date >= oneWeekAgo) {
          thisWeek.push(fact);
        } else if (date >= oneMonthAgo) {
          thisMonth.push(fact);
        } else {
          older.push(fact);
        }
      }
      
      const results: FactGroup[] = [];
      if (thisWeek.length > 0) results.push({ title: 'This Week', facts: thisWeek });
      if (thisMonth.length > 0) results.push({ title: 'This Month', facts: thisMonth });
      if (older.length > 0) results.push({ title: 'Older', facts: older });
      
      return results;
    }
    
    return [{ title: 'All Memories', facts }];
  }, [facts, groupBy]);

  return (
    <div className="space-y-6">
      {groupedFacts.map(group => (
        <div key={group.title} className="mb-6">
          <h2 className="mb-3 text-xl font-semibold text-gray-800">{group.title}</h2>
          <div className="space-y-4">
            {group.facts.map(fact => (
              <FactCard 
                key={fact.id} 
                fact={fact} 
                onFeedback={onFeedback} 
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}; 