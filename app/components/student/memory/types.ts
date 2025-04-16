export interface Fact {
  id: string;
  content: string;
  factType: string;
  createdAt: string;
  updatedAt: string;
  confidence?: number;
  isActive: boolean;
  originContext?: string;
}

export interface SearchParams {
  query: string;
  factTypes: string[];
  includeInactive: boolean;
  limit: number;
  offset: number;
  fromDate?: string;
  toDate?: string;
  minConfidence?: number;
  sortBy: 'created_at' | 'updated_at' | 'confidence';
  sortOrder: 'asc' | 'desc';
  groupBy?: 'factType' | 'date' | null;
}

export type FeedbackType = 'correct' | 'incorrect' | 'outdated';

export interface FactGroup {
  title: string;
  facts: Fact[];
} 