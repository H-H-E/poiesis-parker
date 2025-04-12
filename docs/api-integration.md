# Memory System API Integration

This document provides technical specifications for the memory system API endpoints and how to use them in frontend components.

## Memory API Endpoints

### 1. Chat API with Memory Parameters

The main chat endpoint now accepts memory-related parameters to customize the memory pipeline.

#### Endpoint: `/api/chat`

**Request format:**
```json
{
  "chatId": "chat-123",
  "messages": [
    { "role": "user", "content": "Question here" }
  ],
  "settings": {
    "model": "gpt-3.5-turbo",
    "temperature": 0.7,
    "extractFacts": true,
    "includeStructuredFacts": true,
    "includeVectorMemory": true,
    "subjectFilter": "math",
    "timeframeFilter": "30d",
    "sourceCount": 4
  }
}
```

**Response format:**
```json
{
  "response": "AI response text here",
  "memory": {
    "factsUsed": ["Fact 1", "Fact 2"],
    "sourcesUsed": 3
  }
}
```

### 2. Memory Facts API

#### Endpoint: `/api/memory/facts`

**Request (GET):**
```
GET /api/memory/facts?userId=user-123&subject=math&factTypes=preference,goal&timeframe=30d
```

**Response:**
```json
{
  "facts": [
    {
      "id": "fact-1",
      "user_id": "user-123",
      "fact_type": "preference",
      "subject": "math",
      "details": "Prefers visual explanations with diagrams",
      "created_at": "2023-05-10T15:30:00Z"
    },
    {
      "id": "fact-2",
      "user_id": "user-123",
      "fact_type": "goal",
      "subject": "math",
      "details": "Wants to improve calculus skills",
      "created_at": "2023-06-05T09:15:00Z"
    }
  ]
}
```

### 3. Memory Management API

#### Endpoint: `/api/memory/manage`

**Request (POST):**
```json
{
  "action": "update",
  "factId": "fact-1",
  "factData": {
    "fact_type": "preference",
    "subject": "math",
    "details": "Updated fact details"
  }
}
```

**Response:**
```json
{
  "fact": {
    "id": "fact-1",
    "user_id": "user-123",
    "fact_type": "preference",
    "subject": "math",
    "details": "Updated fact details",
    "updated_at": "2023-08-10T14:22:10Z"
  }
}
```

### 4. Memory Search API

#### Endpoint: `/api/memory/search`

**Request (GET):**
```
GET /api/memory/search?userId=user-123&query=calculus&timeframe=all
```

**Response:**
```json
{
  "results": [
    {
      "type": "fact",
      "id": "fact-2",
      "details": "Wants to improve calculus skills",
      "subject": "math",
      "created_at": "2023-06-05T09:15:00Z"
    },
    {
      "type": "conversation",
      "chat_id": "chat-45",
      "snippet": "I've been studying calculus for the past week",
      "timestamp": "2023-05-22T10:05:00Z"
    }
  ]
}
```

## Frontend Integration Examples

### 1. Fetching User Facts in a Component

```tsx
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';

export function UserFactsDisplay({ subject, factTypes = [] }) {
  const { user } = useAuth();
  const [facts, setFacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (!user) return;
    
    async function fetchFacts() {
      setLoading(true);
      try {
        // Build query parameters
        const params = new URLSearchParams();
        params.append('userId', user.id);
        if (subject) params.append('subject', subject);
        if (factTypes.length > 0) params.append('factTypes', factTypes.join(','));
        
        const response = await fetch(`/api/memory/facts?${params}`);
        
        if (!response.ok) {
          throw new Error(`Error fetching facts: ${response.statusText}`);
        }
        
        const data = await response.json();
        setFacts(data.facts);
      } catch (err) {
        console.error('Failed to fetch facts:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchFacts();
  }, [user, subject, factTypes]);
  
  if (loading) return <div>Loading facts...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div className="facts-container">
      <h3>Your {subject ? `${subject} ` : ''}Facts</h3>
      {facts.length === 0 ? (
        <p>No facts found.</p>
      ) : (
        <ul>
          {facts.map(fact => (
            <li key={fact.id}>
              <strong>{fact.fact_type}:</strong> {fact.details}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### 2. Memory Settings Hook

```tsx
import { useState, useCallback } from 'react';

export function useMemorySettings(initialSettings = {}) {
  const defaultSettings = {
    includeStructuredFacts: true,
    includeVectorMemory: true,
    subjectFilter: '',
    timeframeFilter: 'all',
    extractFacts: true,
    sourceCount: 4
  };
  
  const [memorySettings, setMemorySettings] = useState({
    ...defaultSettings,
    ...initialSettings
  });
  
  const updateSettings = useCallback((newSettings) => {
    setMemorySettings(prev => ({
      ...prev,
      ...newSettings
    }));
  }, []);
  
  const resetSettings = useCallback(() => {
    setMemorySettings(defaultSettings);
  }, []);
  
  // Create chat settings object to send to API
  const getChatSettings = useCallback(() => {
    return {
      model: 'gpt-3.5-turbo', // Default model
      temperature: 0.7,       // Default temperature
      extractFacts: memorySettings.extractFacts,
      includeStructuredFacts: memorySettings.includeStructuredFacts,
      includeVectorMemory: memorySettings.includeVectorMemory,
      subjectFilter: memorySettings.subjectFilter || null,
      timeframeFilter: memorySettings.timeframeFilter,
      sourceCount: memorySettings.sourceCount
    };
  }, [memorySettings]);
  
  return {
    memorySettings,
    updateSettings,
    resetSettings,
    getChatSettings
  };
}
```

### 3. Chat Component with Memory Integration

```tsx
import { useState, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { useMemorySettings } from '@/hooks/useMemorySettings';
import MemorySettingsPanel from '@/components/chat/MemorySettings';

export default function ChatInterface({ chatId }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const { memorySettings, updateSettings, getChatSettings } = useMemorySettings();
  
  async function handleSendMessage(e) {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;
    
    const userMessage = { role: 'user', content: inputValue };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          messages: [...messages, userMessage],
          settings: getChatSettings()
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      setMessages(prev => [
        ...prev, 
        { role: 'assistant', content: data.response }
      ]);
      
      // Optionally show memory info in UI
      if (data.memory) {
        console.log('Memory used in response:', data.memory);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev,
        { role: 'system', content: 'Error sending message. Please try again.' }
      ]);
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div className="chat-container">
      <div className="chat-settings-panel">
        <MemorySettingsPanel
          settings={memorySettings}
          onSettingsChange={updateSettings}
        />
      </div>
      
      <div className="messages-container">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
        {loading && <div className="loading">AI is thinking...</div>}
      </div>
      
      <form onSubmit={handleSendMessage} className="input-form">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type your message..."
          disabled={loading}
        />
        <button type="submit" disabled={loading || !inputValue.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
```

## API Implementation Reference

### Adding Memory Parameters to Chat API

Update the `pages/api/chat.ts` file to handle the new memory parameters:

```typescript
// In pages/api/chat.ts
// ...existing imports

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // ...existing authentication code
  
  const { 
    chatId, 
    messages, 
    settings = {
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      extractFacts: true,
      includeStructuredFacts: true,
      includeVectorMemory: true,
      subjectFilter: null,
      timeframeFilter: 'all',
      sourceCount: 4
    }
  } = req.body;
  
  // ...existing validation code
  
  // Create the memory-augmented chain with enhanced settings
  const { memoryAugmentedChain, chatHistory } = await createMemoryAugmentedChain({
    userId,
    chatId,
    supabaseClient: supabase,
    chatSettings: {
      model: settings.model,
      temperature: settings.temperature,
      openaiApiKey: process.env.OPENAI_API_KEY,
      extractFacts: settings.extractFacts
    },
    includeStructuredFacts: settings.includeStructuredFacts,
    includeVectorMemory: settings.includeVectorMemory,
    subjectFilter: settings.subjectFilter,
    timeframeFilter: settings.timeframeFilter,
    sourceCount: settings.sourceCount || 4
  });
  
  // ...rest of the API implementation
}
```

Update the `createMemoryAugmentedChain` function to handle the new parameters:

```typescript
// In lib/memory/memory-augmented-prompting.ts
// ...existing imports

export async function createMemoryAugmentedChain({
  userId,
  chatId,
  supabaseClient = browserClient,
  chatSettings,
  sourceCount = 4,
  includeStructuredFacts = true,
  includeVectorMemory = true,
  systemPromptTemplate = "",
  subjectFilter = null,
  timeframeFilter = "all",
}: {
  userId: string;
  chatId: string;
  supabaseClient?: SupabaseClient;
  chatSettings: ChatSettings;
  sourceCount?: number;
  includeStructuredFacts?: boolean;
  includeVectorMemory?: boolean;
  systemPromptTemplate?: string;
  subjectFilter?: string | null;
  timeframeFilter?: string;
}) {
  // 1. Setup Memory Components
  const chatHistory = new SupabaseChatMessageHistory({ 
    chatId, 
    userId, 
    client: supabaseClient 
  });
  
  // Only set up vector retriever if vector memory is enabled
  const retriever = includeVectorMemory 
    ? getConversationMemoryRetriever({
        userId,
        client: supabaseClient,
        embeddingApiKey: chatSettings.openaiApiKey,
        k: sourceCount,
        timeframeFilter
      })
    : null;
  
  // ...rest of the implementation with added conditionals
  
  // Only include facts retrieval if structured facts are enabled
  const memoryAugmentedChain = RunnableSequence.from([
    // Step 1: Condense the question and fetch student facts
    RunnablePassthrough.assign({
      standalone_question: async (input: { question: string }) => {
        // ...existing code
      },
      // Only fetch facts if includeStructuredFacts is true
      student_facts: includeStructuredFacts 
        ? async () => getFactsForPrompt({ 
            userId, 
            subject: subjectFilter,
            timeframe: timeframeFilter, 
            client: supabaseClient 
          })
        : async () => "", // Empty string if not using structured facts
    }),
    
    // Step 2: Retrieve semantic memory only if vector memory is enabled
    RunnablePassthrough.assign({
      context: async (input) => {
        if (!includeVectorMemory || !retriever) {
          return "No past conversation memories included.";
        }
        
        const context = await retriever.getRelevantDocuments(input.standalone_question);
        return formatDocumentsAsString(context) || "No relevant past conversation memories found.";
      },
      // Also get fresh chat history for the final prompt
      chat_history: async () => chatHistory.getMessages(),
    }),
    
    // ...rest of implementation
  ]);
  
  return { 
    memoryAugmentedChain, 
    chatHistory 
  };
} 