# Memory Architecture Documentation

## Overview

This document outlines the memory architecture used in the Poiesis Parker application, which implements several types of AI memory to provide context-aware, personalized interactions with users.

## Memory Types

The application implements three primary types of memory:

1. **Chat History Memory**: Basic conversation context using `SupabaseChatMessageHistory`
2. **Vector Memory**: Semantic search over past conversations using embeddings stored in Supabase
3. **Structured Facts Memory**: Extracted factual information about users stored in a structured format

## Technical Implementation

### 1. Chat History Memory

Implemented via `SupabaseChatMessageHistory` which:
- Stores messages in a Supabase `messages` table
- Supports standard LangChain message types (Human, AI, System, Tool)
- Handles serialization/deserialization between frontend format and LangChain format
- Allows for basic chat history recall and persistence

### 2. Vector Memory (RAG)

Implemented via:
- `ingestConversationHistory`: Processes conversations into vector chunks
- `getConversationMemoryRetriever`: Creates a retriever for semantic search
- Uses embeddings and Supabase vector extensions
- Enables retrieval of past relevant conversation snippets

### 3. Structured Facts Memory

Implemented via:
- `extractFactsFromMessages`: LLM-based extraction of structured information
- `processAndStoreConversationFacts`: Processes and stores facts in the database
- `getFactsForPrompt`: Retrieves facts for inclusion in prompts
- Categorizes information by fact types (preferences, struggles, goals, etc.)

## LLM Integration via OpenRouter

The memory system uses OpenRouter as a unified gateway for all LLM processing, providing several advantages:

1. **Model Flexibility**: Access to multiple LLM providers (OpenAI, Anthropic, etc.) through a single API
2. **Cost Optimization**: Ability to route requests to different models based on task complexity and budget
3. **Fallback Support**: Automatic failover to alternative models if primary models are unavailable

### Configuration

```typescript
// Example: Creating an LLM instance via OpenRouter
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  modelName: "openai/gpt-4-turbo", // OpenRouter format: "provider/model-name"
  temperature: 0.7,
  openAIApiKey: process.env.OPENROUTER_API_KEY, // Your OpenRouter API key
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "https://poiesis-parker.com", // Your site URL
      "X-Title": "Poiesis Parker Education Platform"
    }
  }
});
```

### Embedding Models

For vector embeddings, we use OpenRouter's embedding capabilities:

```typescript
import { OpenAIEmbeddings } from "@langchain/openai";

const embeddings = new OpenAIEmbeddings({
  modelName: "openai/text-embedding-ada-002", // OpenRouter embedding model
  openAIApiKey: process.env.OPENROUTER_API_KEY,
  configuration: {
    baseURL: "https://openrouter.ai/api/v1"
  }
});
```

## Memory Pipeline

The complete memory pipeline is coordinated in `createMemoryAugmentedChain` and works as follows:

1. User sends a message
2. Chat history is saved and retrieved
3. Standalone question is generated if needed
4. Semantic search retrieves relevant conversation memories
5. Student facts are pulled from structured storage
6. All memory types are combined in a prompt
7. LLM generates a response with full context
8. After response, background processes extract and store new facts

## Data Schemas

### Student Facts Schema
```typescript
interface StudentFact {
  id?: string;
  user_id: string;
  chat_id?: string | null;
  fact_type: 'preference' | 'struggle' | 'goal' | 'topic_interest' | 'learning_style' | 'other';
  subject?: string | null;
  details: string;
  confidence?: number | null;
  source_message_id?: string | null;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}
```

### Vector Memory Schema
The vector memory uses Supabase's pgvector extension with:
- Text chunks with embeddings
- Metadata (user_id, chat_id, ingested_at)
- Match function for semantic similarity search

## Model Selection Strategy

With OpenRouter, we employ a tiered model selection strategy:

1. **Heavy Extraction Tasks** (SEL identification, fact extraction):
   - Primary: Claude 3 Opus or GPT-4
   - Fallback: Mixtral or Llama 3

2. **Context Processing** (RAG, memory retrieval):
   - Mid-tier models like Claude 3 Sonnet or GPT-3.5

3. **Simple Queries** (standalone question generation):
   - Lightweight models like Gemini Pro or Mistral

This strategy balances cost, performance, and reliability across different memory operations.

## Usage in Application

The memory system is used in:
- `/api/chat.ts` - Main chat API endpoint
- Integration with the frontend via chat interface
- Background processing of conversations 

## Admin UI Components

The memory system includes an admin interface for managing and viewing student memory facts.

### Admin API Endpoints

The following API endpoints are available for managing student memory facts:

#### 1. Get Student Memory Facts
- **Endpoint**: `/api/admin/getstudentmemory`
- **Method**: POST
- **Description**: Retrieves a paginated list of memory facts for a specific user with filtering options
- **Request Parameters**:
  ```typescript
  {
    userId: string;           // Required: ID of the user to get facts for
    limit?: number;           // Optional: Number of items per page (default: 20)
    offset?: number;          // Optional: Pagination offset (default: 0)
    query?: string;           // Optional: Text search query
    factTypes?: string[];     // Optional: Filter by fact types
    includeInactive?: boolean;// Optional: Include inactive facts (default: false)
    sortBy?: 'created_at' | 'updated_at' | 'confidence'; // Optional: Field to sort by (default: 'updated_at')
    sortOrder?: 'asc' | 'desc'; // Optional: Sort direction (default: 'desc')
    minConfidence?: number;   // Optional: Minimum confidence threshold
    fromDate?: string;        // Optional: Start date filter (ISO format)
    toDate?: string;          // Optional: End date filter (ISO format)
  }
  ```
- **Response**:
  ```typescript
  {
    success: boolean;
    facts: Fact[];            // Array of fact objects
    totalCount: number;       // Total number of matching facts
    hasMore: boolean;         // Whether there are more facts to load
    offset: number;           // Current offset
    limit: number;            // Current limit
  }
  ```

#### 2. Create Student Fact
- **Endpoint**: `/api/admin/createstudentfact`
- **Method**: POST
- **Description**: Creates a new memory fact for a student
- **Request Parameters**:
  ```typescript
  {
    user_id: string;          // Required: ID of the user to create the fact for
    content: string;          // Required: Content of the fact
    factType: string;         // Required: Type of fact
    confidence?: number;      // Optional: Confidence score (0-1)
    isActive?: boolean;       // Optional: Whether the fact is active (default: true)
    originContext?: string;   // Optional: Source context or message
  }
  ```
- **Response**:
  ```typescript
  {
    success: boolean;
    fact: Fact;               // The created fact object
  }
  ```

#### 3. Update Student Fact
- **Endpoint**: `/api/admin/updatestudentfact`
- **Method**: POST
- **Description**: Updates an existing memory fact
- **Request Parameters**:
  ```typescript
  {
    id: string;               // Required: ID of the fact to update
    content?: string;         // Optional: New content
    factType?: string;        // Optional: New fact type
    confidence?: number;      // Optional: New confidence score (0-1)
    isActive?: boolean;       // Optional: New active status
  }
  ```
- **Response**:
  ```typescript
  {
    success: boolean;
    fact: Fact;               // The updated fact object
  }
  ```

#### 4. Delete Student Fact
- **Endpoint**: `/api/admin/deletestudentfact`
- **Method**: POST
- **Description**: Deletes a memory fact
- **Request Parameters**:
  ```typescript
  {
    factId: string;           // Required: ID of the fact to delete
  }
  ```
- **Response**:
  ```typescript
  {
    success: boolean;
    message: string;          // Success message
  }
  ```

### GPT Model Selection Strategy for Memory Operations

For optimal performance and cost-efficiency, we employ the following model selection strategy with GPT-4 variants:

1. **Classification Tasks** - Use **GPT-4.1-nano**:
   - Classifying fact types
   - Determining fact relevance
   - Basic entity recognition
   - Initial confidence scoring

2. **Generation and Extraction Tasks** - Use **GPT-4.1-mini**:
   - Basic fact extraction
   - Simple summaries
   - Contextual analysis
   - Confidence refinement

3. **Complex Processing Tasks** - Use **GPT-4.1-full**:
   - Deep semantic understanding
   - Complex entity relationship mapping
   - Conflict resolution between facts
   - Critical educational insights
   - Handling ambiguous student expressions

This strategy allows us to optimize both cost and performance by matching the model capability to the task complexity.

### AdminMemoryFilters Component

The `AdminMemoryFilters` component provides a comprehensive interface for filtering memory facts in the admin view:

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SearchParams } from '@/app/components/student/memory/types'; // Reusing student types for now

// We might need to extend SearchParams or create an AdminSearchParams interface later
// if admin filters diverge significantly.
type AdminFilters = Partial<Omit<SearchParams, 'groupBy'> & {
  // Add admin-specific filter properties here if needed
  // For now, reusing SearchParams fields like includeInactive, etc.
  minConfidence?: number;
  fromDate?: string;
  toDate?: string;
}>;

interface AdminMemoryFiltersProps {
  onFilterChange: (filters: AdminFilters) => void;
  availableFactTypes: string[]; // Assuming these might still be useful
  initialFilters?: AdminFilters;
}

export const AdminMemoryFilters: React.FC<AdminMemoryFiltersProps> = ({
  onFilterChange,
  availableFactTypes = [],
  initialFilters = {}
}) => {
  const [query, setQuery] = useState(initialFilters.query || '');
  const [selectedFactTypes, setSelectedFactTypes] = useState<string[]>(
    initialFilters.factTypes || []
  );
  const [includeInactive, setIncludeInactive] = useState(
    initialFilters.includeInactive || false
  );
  const [fromDate, setFromDate] = useState(initialFilters.fromDate || '');
  const [toDate, setToDate] = useState(initialFilters.toDate || '');
  const [minConfidence, setMinConfidence] = useState<number | string>(
    initialFilters.minConfidence ?? '' // Use empty string for uncontrolled input
  );

  // Use useCallback for onFilterChange to stabilize useEffect dependencies
  const stableOnFilterChange = useCallback(onFilterChange, []);

  // Debounce search query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      stableOnFilterChange({ query });
    }, 500);
    return () => clearTimeout(timer);
  }, [query, stableOnFilterChange]);

  // Propagate other filter changes immediately (or debounce if preferred)
  useEffect(() => {
    const confidenceValue = typeof minConfidence === 'string' ? Number.parseFloat(minConfidence) : minConfidence;
    stableOnFilterChange({ 
      factTypes: selectedFactTypes, 
      includeInactive, 
      fromDate: fromDate || undefined, // Send undefined if empty
      toDate: toDate || undefined,
      minConfidence: !Number.isNaN(confidenceValue) && confidenceValue >= 0 && confidenceValue <= 1 ? confidenceValue : undefined
    });
  }, [selectedFactTypes, includeInactive, fromDate, toDate, minConfidence, stableOnFilterChange]);


  // Handle fact type changes
  const handleFactTypeChange = (factType: string) => {
    const newSelectedTypes = selectedFactTypes.includes(factType)
      ? selectedFactTypes.filter(type => type !== factType)
      : [...selectedFactTypes, factType];
    setSelectedFactTypes(newSelectedTypes);
    // Change is propagated by the useEffect above
  };

  // Handle inactive toggle changes
  const handleInactiveChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setIncludeInactive(checked);
     // Change is propagated by the useEffect above
  };

  // Handlers for new filters
  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'from' | 'to') => {
    const value = event.target.value;
    if (type === 'from') {
      setFromDate(value);
    } else {
      setToDate(value);
    }
     // Change is propagated by the useEffect above
  };

  const handleConfidenceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMinConfidence(event.target.value); // Keep as string for input control
     // Change is propagated by the useEffect above
  };

  return (
    <div className="mb-6 p-4 border rounded bg-gray-50 space-y-4">
      <h3 className="text-lg font-semibold">Filter Memory Facts</h3>
      
      {/* Search Input */}
      <div>
        <label htmlFor="admin-memory-search" className="block text-sm font-medium text-gray-700 mb-1">
          Search Content
        </label>
        <input
          id="admin-memory-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Search fact content..."
        />
      </div>

      {/* Fact Type Filters */}
      {availableFactTypes.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Filter by Type</h4>
          <div className="flex flex-wrap gap-2">
            {availableFactTypes.map(factType => (
              <button
                key={factType}
                type="button"
                onClick={() => handleFactTypeChange(factType)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  selectedFactTypes.includes(factType)
                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                    : 'bg-gray-100 text-gray-800 border-gray-300'
                } border`}
              >
                {factType}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Row for Toggle, Dates, Confidence */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        {/* Include Inactive Toggle */}
        <div className="flex items-center pt-5">
          <input
            id="include-inactive"
            type="checkbox"
            checked={includeInactive}
            onChange={handleInactiveChange}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="include-inactive" className="ml-2 block text-sm text-gray-900">
            Include Inactive Facts
          </label>
        </div>

        {/* Date Range Filters */}
        <div>
          <label htmlFor="from-date" className="block text-sm font-medium text-gray-700 mb-1">
            From Date
          </label>
          <input 
            id="from-date" 
            type="date" 
            value={fromDate}
            onChange={(e) => handleDateChange(e, 'from')} 
            className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
           <label htmlFor="to-date" className="block text-sm font-medium text-gray-700 mb-1">
            To Date
          </label>
          <input 
            id="to-date" 
            type="date" 
            value={toDate}
            onChange={(e) => handleDateChange(e, 'to')} 
            className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Confidence Filter */}
        <div>
          <label htmlFor="min-confidence" className="block text-sm font-medium text-gray-700 mb-1">
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
            className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
};
```

This component provides the following filtering capabilities:
- Text search for fact content
- Filtering by fact types (buttons for each available type)
- Inclusion/exclusion of inactive facts
- Date range filtering (from/to)
- Minimum confidence threshold

The filters are implemented with debounced updates to prevent excessive API calls during user interaction, and the component handles validation and formatting of filter values before passing them to the parent component.

### FactEditModal Component

The `FactEditModal` component provides a modal interface for creating and editing memory facts:

```tsx
'use client';

import { useState, useEffect } from 'react';
import type { Fact } from '@/app/components/student/memory/types';

interface FactEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedFact: Fact) => Promise<void>;
  fact?: Fact | null;
  availableFactTypes: string[];
}

export const FactEditModal: React.FC<FactEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  fact,
  availableFactTypes = []
}) => {
  const [formData, setFormData] = useState<Partial<Fact>>({
    content: '',
    factType: '',
    confidence: 0.7,
    isActive: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customFactType, setCustomFactType] = useState<string>('');
  const [showCustomFactTypeInput, setShowCustomFactTypeInput] = useState(false);
  
  // Reset form when modal opens/closes or fact changes
  useEffect(() => {
    if (isOpen && fact) {
      setFormData({
        id: fact.id,
        content: fact.content || '',
        factType: fact.factType || '',
        confidence: fact.confidence || 0.7,
        isActive: fact.isActive,
        originContext: fact.originContext || '',
      });
      
      // Handle custom fact types
      setShowCustomFactTypeInput(!availableFactTypes.includes(fact.factType));
      setCustomFactType(!availableFactTypes.includes(fact.factType) ? fact.factType : '');
    } else if (isOpen && !fact) {
      // Creating a new fact
      setFormData({
        content: '',
        factType: availableFactTypes.length > 0 ? availableFactTypes[0] : '',
        confidence: 0.7,
        isActive: true,
      });
      setShowCustomFactTypeInput(false);
      setCustomFactType('');
    }
    
    setError(null);
  }, [isOpen, fact, availableFactTypes]);

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'confidence') {
      // Validate confidence is between 0 and 1
      const numValue = Number.parseFloat(value);
      if (!Number.isNaN(numValue) && numValue >= 0 && numValue <= 1) {
        setFormData({ ...formData, [name]: numValue });
      }
    } else if (name === 'isActive' && e.target instanceof HTMLInputElement) {
      setFormData({ ...formData, [name]: e.target.checked });
    } else if (name === 'factType') {
      if (value === '_custom') {
        setShowCustomFactTypeInput(true);
        // Keep the current factType until custom is entered
      } else {
        setShowCustomFactTypeInput(false);
        setFormData({ ...formData, [name]: value });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };
  
  // Handle custom fact type input
  const handleCustomFactTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomFactType(value);
    setFormData({ ...formData, factType: value });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.content?.trim()) {
      setError('Content is required');
      return;
    }
    
    if (!formData.factType?.trim()) {
      setError('Fact type is required');
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      // Prepare the fact data for saving
      const factToSave = {
        ...fact,
        ...formData,
      } as Fact;
      
      await onSave(factToSave);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save fact');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600 bg-opacity-50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="border-b p-5">
          <h3 className="text-lg font-medium">{fact ? 'Edit Memory Fact' : 'Add New Memory Fact'}</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5">
          {/* Content */}
          <div className="mb-4">
            <label htmlFor="content" className="mb-1 block text-sm font-medium text-gray-700">
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
            <label htmlFor="factType" className="mb-1 block text-sm font-medium text-gray-700">
              Fact Type
            </label>
            <select
              id="factType"
              name="factType"
              value={showCustomFactTypeInput ? '_custom' : formData.factType}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            >
              {availableFactTypes.map((type) => (
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
              <label htmlFor="customFactType" className="mb-1 block text-sm font-medium text-gray-700">
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
            <label htmlFor="confidence" className="mb-1 block text-sm font-medium text-gray-700">
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
            <label htmlFor="isActive" className="ml-2 block text-sm font-medium text-gray-700">
              Active
            </label>
          </div>
          
          {/* Origin Context (Read-only if editing) */}
          {fact?.originContext && (
            <div className="mb-4">
              <label htmlFor="originContext" className="mb-1 block text-sm font-medium text-gray-700">
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
              {isSaving ? 'Saving...' : fact ? 'Update Fact' : 'Create Fact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 