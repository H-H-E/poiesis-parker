# Memory Pipeline Extensions & Frontend Integration

This document outlines plans for extending the memory pipeline capabilities and integrating them into the frontend for both admin and user interfaces.

## OpenRouter Integration for LLM Services

Before diving into memory pipeline extensions, we'll set up OpenRouter as our LLM gateway to provide better performance, cost-efficiency, and reliability.

### Setting Up OpenRouter

```typescript
// lib/langchain/openrouter.ts
import { ChatOpenAI } from "@langchain/openai";
import { OpenAIEmbeddings } from "@langchain/openai";

/**
 * Creates a configured LLM instance using OpenRouter
 * 
 * @param modelName The model to use (in OpenRouter format: "provider/model-name")
 * @param apiKey OpenRouter API key (optional, falls back to env var)
 * @param temperature Temperature setting (defaults to 0.7)
 */
export function createOpenRouterLLM({ 
  modelName = "openai/gpt-4-turbo", 
  apiKey, 
  temperature = 0.7 
}: {
  modelName?: string;
  apiKey?: string;
  temperature?: number;
}) {
  return new ChatOpenAI({
    modelName,
    temperature,
    openAIApiKey: apiKey || process.env.OPENROUTER_API_KEY,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://poiesis-parker.com",
        "X-Title": "Poiesis Parker Education Platform"
      }
    }
  });
}

/**
 * Creates embeddings instance using OpenRouter
 * 
 * @param modelName Embedding model to use
 * @param apiKey OpenRouter API key (optional, falls back to env var)
 */
export function createOpenRouterEmbeddings({
  modelName = "openai/text-embedding-ada-002",
  apiKey
}: {
  modelName?: string;
  apiKey?: string;
}) {
  return new OpenAIEmbeddings({
    modelName,
    openAIApiKey: apiKey || process.env.OPENROUTER_API_KEY,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1"
    }
  });
}

/**
 * Model recommendations based on task complexity
 */
export const RECOMMENDED_MODELS = {
  // Heavy extraction tasks
  EXTRACTION: "anthropic/claude-3-opus-20240229",
  EXTRACTION_FALLBACK: "mistralai/mixtral-8x22b",
  
  // Context processing
  CONTEXT: "anthropic/claude-3-sonnet-20240229",
  CONTEXT_FALLBACK: "openai/gpt-3.5-turbo",
  
  // Simple queries
  SIMPLE: "google/gemini-pro",
  SIMPLE_FALLBACK: "mistralai/mistral-large",
  
  // Embeddings
  EMBEDDING: "openai/text-embedding-ada-002",
  EMBEDDING_FALLBACK: "google/embedding-001"
};
```

## Planned Memory Pipeline Extensions

### 1. Enhanced Memory Pulling & Filtering

#### Custom Subject-Based Memory Retrieval

```typescript
// lib/memory/enhanced-retrieval.ts
import { createOpenRouterEmbeddings, RECOMMENDED_MODELS } from "../langchain/openrouter";

/**
 * Get memory relevant to a specific subject by combining facts filtered by subject
 * and vector memories with a subject filter
 */
export async function getSubjectSpecificMemory({
  userId,
  subject,
  question,
  client,
  apiKey
}: {
  userId: string;
  subject: string;
  question: string;
  client: SupabaseClient;
  apiKey?: string;
}) {
  // Create embeddings using OpenRouter
  const embeddings = createOpenRouterEmbeddings({ 
    modelName: RECOMMENDED_MODELS.EMBEDDING,
    apiKey 
  });
  
  // Get facts filtered by subject
  const facts = await getFactsForPrompt({
    userId,
    subject,
    client
  });
  
  // Get vector-based memories with subject metadata filter
  const vectorRetriever = await createSubjectFilteredRetriever({
    userId,
    subject,
    embeddings,
    client
  });
  
  const relevantMemories = await vectorRetriever.getRelevantDocuments(question);
  
  return {
    facts,
    vectorMemories: formatDocumentsAsString(relevantMemories)
  };
}
```

#### Time-based Memory Retrieval

```typescript
/**
 * Get memory within a specific timeframe
 */
export async function getTimeFilteredMemory({
  userId,
  timeframe, // "recent", "past-week", "past-month", "all"
  client,
  apiKey
}: {
  userId: string;
  timeframe: string;
  client: SupabaseClient;
  apiKey?: string;
}) {
  // Calculate date range based on timeframe
  const startDate = calculateTimeframeStartDate(timeframe);
  
  // Get facts from the specified timeframe
  const facts = await client
    .from('student_facts')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .eq('active', true);
    
  // Format facts for prompt
  // ...rest of implementation
}
```

### 2. Memory Confidence & Verification

```typescript
// lib/memory/confidence-scoring.ts
import { createOpenRouterLLM, RECOMMENDED_MODELS } from "../langchain/openrouter";

/**
 * Extract facts with confidence scores using an LLM
 */
export async function extractFactsWithConfidence({
  messages,
  userId,
  chatId,
  apiKey
}: {
  messages: BaseMessage[];
  userId: string;
  chatId?: string;
  apiKey?: string;
}) {
  const llm = createOpenRouterLLM({ 
    modelName: RECOMMENDED_MODELS.EXTRACTION,
    apiKey
  });
  
  // Create a chain with function calling to extract facts with confidence
  const chain = createFactExtractionChainWithConfidence(llm);
  
  // Format messages for the chain
  // ...implementation details
  
  // Return facts with confidence scores
  return chain.invoke({ messages: formattedMessages });
}
```

### 3. Conflict Resolution for Contradictory Facts

```typescript
// lib/memory/conflict-resolution.ts
import { createOpenRouterLLM, RECOMMENDED_MODELS } from "../langchain/openrouter";

/**
 * Identify and resolve conflicting facts for a user
 */
export async function resolveConflictingFacts({
  userId,
  client,
  apiKey
}: {
  userId: string;
  client: SupabaseClient;
  apiKey?: string;
}) {
  // Get all active facts for the user
  const { data: facts } = await client
    .from('student_facts')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true);
    
  // Group facts by subject and fact_type to find potential conflicts
  const groupedFacts = groupFactsBySubjectAndType(facts);
  
  // Initialize OpenRouter LLM for resolution
  const llm = createOpenRouterLLM({
    modelName: RECOMMENDED_MODELS.CONTEXT, // Use a model good at reasoning
    apiKey
  });
  
  // For each group, check for conflicts
  const resolutionResults = [];
  
  for (const group of groupedFacts) {
    if (group.facts.length > 1) {
      // Potential conflict, use LLM to analyze
      const resolution = await resolveFactsWithLLM(group.facts, llm);
      
      if (resolution.hasConflict) {
        // Update the database with resolved information
        // ...implementation details
        
        resolutionResults.push(resolution);
      }
    }
  }
  
  return resolutionResults;
}
```

## Frontend Integration

### 1. Admin Interface

#### Memory Dashboard for Admins

```tsx
// pages/admin/memory-dashboard.tsx
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { resolveConflictingFacts } from '@/lib/memory/conflict-resolution';

export default function MemoryDashboard() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userFacts, setUserFacts] = useState([]);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openrouter_api_key') || '');
  
  // Fetch users and facts
  // ...implementation
  
  const handleResolveConflicts = async () => {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      
      const results = await resolveConflictingFacts({
        userId: selectedUser.id,
        client: supabase,
        apiKey // Pass OpenRouter API key
      });
      
      // Update UI with resolution results
      // ...implementation
    } catch (error) {
      console.error('Error resolving conflicts:', error);
    }
  };
  
  // Rest of component implementation
}
```

#### Memory Editing Interface

```tsx
// components/admin/FactEditor.tsx
import { useState } from 'react';
import { createOpenRouterLLM, RECOMMENDED_MODELS } from '@/lib/langchain/openrouter';

export default function FactEditor({ fact, onSave, onDelete }) {
  const [editedFact, setEditedFact] = useState(fact);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openrouter_api_key') || '');
  
  const handleValidateFact = async () => {
    try {
      // Create LLM instance with OpenRouter
      const llm = createOpenRouterLLM({
        modelName: RECOMMENDED_MODELS.CONTEXT,
        apiKey
      });
      
      // Use LLM to validate and suggest improvements
      // ...implementation
    } catch (error) {
      console.error('Error validating fact:', error);
    }
  };
  
  // Rest of component implementation
}
```

### 2. User Interface

#### Personal Memory Portal

```tsx
// pages/my-memory.tsx
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { getSubjectSpecificMemory } from '@/lib/memory/enhanced-retrieval';

export default function MyMemory() {
  const [facts, setFacts] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [apiKey, setApiKey] = useState('');
  
  useEffect(() => {
    // Load API key from localStorage
    const savedKey = localStorage.getItem('openrouter_api_key');
    if (savedKey) setApiKey(savedKey);
    
    // Load subjects and facts
    // ...implementation
  }, []);
  
  const handleSubjectChange = async (subject) => {
    setSelectedSubject(subject);
    
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      
      const { facts } = await getSubjectSpecificMemory({
        userId: 'current-user-id', // Get from auth context
        subject,
        question: `Tell me about my learning in ${subject}`,
        client: supabase,
        apiKey
      });
      
      setFacts(facts);
    } catch (error) {
      console.error('Error fetching subject memories:', error);
    }
  };
  
  // Rest of component implementation
}
```

#### Memory Settings in Chat

```tsx
// components/chat/MemorySettings.tsx
import { useState } from 'react';
import { Switch, Select, Slider } from '@/components/ui';

export default function MemorySettings({ onSettingsChange }) {
  const [settings, setSettings] = useState({
    useStructuredFacts: true,
    useSEL: true,
    subjectFilter: '',
    timeframeFilter: 'all',
    modelPreference: 'default' // 'default', 'balanced', 'premium'
  });
  
  const handleChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSettingsChange(newSettings);
    
    // Save to localStorage
    localStorage.setItem('memory_settings', JSON.stringify(newSettings));
  };
  
  // Map model preference to actual OpenRouter models
  const getSelectedModels = () => {
    switch (settings.modelPreference) {
      case 'premium':
        return {
          extraction: RECOMMENDED_MODELS.EXTRACTION,
          context: RECOMMENDED_MODELS.CONTEXT,
          simple: RECOMMENDED_MODELS.SIMPLE
        };
      case 'balanced':
        return {
          extraction: RECOMMENDED_MODELS.CONTEXT,
          context: RECOMMENDED_MODELS.SIMPLE,
          simple: RECOMMENDED_MODELS.SIMPLE
        };
      default:
        return {
          extraction: RECOMMENDED_MODELS.CONTEXT_FALLBACK,
          context: RECOMMENDED_MODELS.SIMPLE_FALLBACK,
          simple: RECOMMENDED_MODELS.SIMPLE_FALLBACK
        };
    }
  };
  
  // Component render
  return (
    <div className="memory-settings-panel">
      <h3>Memory & AI Settings</h3>
      
      <div className="setting-group">
        <label>
          <Switch 
            checked={settings.useStructuredFacts}
            onChange={e => handleChange('useStructuredFacts', e.target.checked)}
          />
          Use my learning profile
        </label>
      </div>

      <div className="setting-group">
        <label>
          <Switch 
            checked={settings.useSEL}
            onChange={e => handleChange('useSEL', e.target.checked)}
          />
          Remember my communication preferences
        </label>
      </div>
      
      <div className="setting-group">
        <label>Subject focus:</label>
        <Select
          value={settings.subjectFilter}
          onChange={e => handleChange('subjectFilter', e.target.value)}
          options={[
            { value: '', label: 'All subjects' },
            { value: 'math', label: 'Math' },
            { value: 'science', label: 'Science' },
            // ...other subjects
          ]}
        />
      </div>
      
      <div className="setting-group">
        <label>Time relevance:</label>
        <Select
          value={settings.timeframeFilter}
          onChange={e => handleChange('timeframeFilter', e.target.value)}
          options={[
            { value: 'all', label: 'All time' },
            { value: 'recent', label: 'Recent conversations' },
            { value: 'past-week', label: 'Past week' },
            { value: 'past-month', label: 'Past month' },
          ]}
        />
      </div>
      
      <div className="setting-group">
        <label>AI model quality:</label>
        <Select
          value={settings.modelPreference}
          onChange={e => handleChange('modelPreference', e.target.value)}
          options={[
            { value: 'default', label: 'Standard (Faster)' },
            { value: 'balanced', label: 'Balanced' },
            { value: 'premium', label: 'Premium (Higher quality)' },
          ]}
        />
      </div>
    </div>
  );
}
```

## API Integration

### New API Routes

1. Memory retrieval API:

```typescript
// pages/api/memory/facts.ts
export default async function handler(req, res) {
  const { userId, subject, factTypes, timeframe } = req.query;
  
  // Authorization check
  const supabase = createServerSupabaseClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // Only allow admins or the user themselves to access their memory
  if (session.user.id !== userId && !session.user.app_metadata.isAdmin) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  
  try {
    const facts = await getFactsWithFilters({ 
      userId, 
      subject, 
      factTypes: factTypes ? factTypes.split(',') : null,
      timeframe
    });
    
    return res.status(200).json({ facts });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve memory' });
  }
}
```

2. Memory management API:

```typescript
// pages/api/memory/manage.ts
export default async function handler(req, res) {
  // Only allow POST for updates
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { action, factId, factData } = req.body;
  
  // Authorization check
  const supabase = createServerSupabaseClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session || !session.user.app_metadata.isAdmin) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  
  try {
    switch (action) {
      case 'update':
        const updatedFact = await updateStudentFact(factId, factData);
        return res.status(200).json({ fact: updatedFact });
        
      case 'delete':
        await deleteStudentFact(factId);
        return res.status(200).json({ success: true });
        
      case 'resolve_conflicts':
        const resolvedFacts = await resolveConflictingFacts({
          userId: factData.userId,
          subject: factData.subject
        });
        return res.status(200).json({ facts: resolvedFacts });
        
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Operation failed' });
  }
}
```

## Implementation Roadmap

1. **Phase 1: Core Memory Pipeline Extensions**
   - Implement subject and time-based filtering
   - Add conflict detection and resolution
   - Update confidence scoring

2. **Phase 2: Admin Interface**
   - Build memory dashboard
   - Implement fact editing and management
   - Add analytics for memory usage

3. **Phase 3: User Interface**
   - Develop personal memory portal
   - Create memory settings for chat
   - Implement user feedback mechanisms

4. **Phase 4: Testing & Optimization**
   - Performance testing for memory retrieval
   - User testing of interfaces
   - Optimize LLM prompts for memory utilization 