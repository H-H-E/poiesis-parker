# Social-Emotional Learning & Style Preference Memory

This document outlines extensions to the memory system that capture social-emotional learning (SEL) aspects and communication style preferences.

## New Memory Categories

### 1. Communication Style Preferences

Extend the `fact_type` enum to include style preferences:

```typescript
export type FactType = 
  'preference' | 'struggle' | 'goal' | 'topic_interest' | 'learning_style' | 
  'communication_style' | 'engagement_pattern' | 'social_emotional' | 'other';
```

Examples of communication style facts:
- "Finds formal academic language 'cringe'"
- "Prefers casual, emoji-filled communication"
- "Engages better with humor and pop culture references"
- "Dislikes being talked down to or oversimplified explanations"

### 2. Topic Engagement Patterns

These facts capture nuanced preferences about how topics should be presented:
- "Loves discussing Minecraft, but not when used for math examples"
- "Enjoys sports analogies for science concepts"
- "Shuts down when literature analysis focuses on symbolism"
- "Engages with history through personal stories, not dates/facts"

### 3. Social-Emotional Indicators

Facts that capture emotional state and social development:
- "Shows frustration through short, one-word responses"
- "Needs encouragement when tackling new math concepts"
- "Responds well to growth mindset reinforcement"
- "Becomes defensive when discussing writing skills"

## Schema Extensions

### Extended Student Fact Schema

```typescript
interface StudentFact {
  id?: string;
  user_id: string;
  chat_id?: string | null;
  fact_type: FactType;
  subject?: string | null;
  details: string;
  confidence?: number | null;
  source_message_id?: string | null;
  // New fields
  context?: string | null;         // When this preference applies
  exception_context?: string | null; // When this preference doesn't apply
  observed_frequency?: number | null; // How often observed (1-10)
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}
```

### Topic Context Schema

For capturing when preferences apply or don't apply:

```typescript
interface TopicContext {
  context_type: 'positive' | 'negative';  // When to apply or not apply
  subject?: string | null;
  topic: string;                  // Specific topic (e.g., "Minecraft")
  usage_context: string;          // How it's used (e.g., "as math metaphor")
  student_reaction: string;       // Observed reaction
}
```

## Enhanced Fact Extraction

### Updated Extraction Chain

Modify the fact extraction chain to identify these nuanced preferences:

```typescript
const prompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(
    `Extract relevant facts about the student, including:
    
    1. Learning preferences and goals
    2. Struggles and challenges
    3. Communication style preferences (formal/informal, humor, pop culture)
    4. Topic engagement patterns (what topics they enjoy, when they enjoy them, exceptions)
    5. Social-emotional indicators (frustration signals, motivation patterns, emotional responses)
    
    Pay special attention to:
    - What topics they like discussing but ONLY in certain contexts
    - Communication styles they find engaging vs. "cringe" or off-putting
    - Emotional responses to different learning approaches
    - Specific phrasing that resonates with or alienates them`
  ),
  HumanMessagePromptTemplate.fromTemplate("{conversation_text}")
]);
```

### Context-Aware Extraction Example

```typescript
export async function extractStylePreferencesFromMessages({
  messages,
  llmApiKey,
  modelName = "gpt-4" // Use a more capable model for nuanced extraction
}) {
  if (!messages || messages.length === 0) {
    return { preferences: [] };
  }

  const conversationText = messages
    .map(msg => `${msg._getType()}: ${typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}`)
    .join("\n");

  const chain = createStylePreferenceExtractionChain({ llmApiKey, modelName });

  try {
    return await chain.invoke({ conversation_text: conversationText });
  } catch (error) {
    console.error("Error during style preference extraction:", error);
    return { preferences: [] };
  }
}
```

## Memory Integration for Adaptive Responses

### Dynamic Prompt Adjustments

```typescript
function createAdaptiveTonePrompt(facts) {
  // Find communication style preferences
  const stylePreferences = facts.filter(f => 
    f.fact_type === 'communication_style' || 
    f.fact_type === 'engagement_pattern'
  );
  
  if (stylePreferences.length === 0) {
    return "Use a friendly, encouraging tone that's appropriate for a student.";
  }
  
  // Build specific style guidelines based on preferences
  const styleGuidelines = stylePreferences.map(pref => {
    if (pref.exception_context) {
      return `${pref.details}, except when ${pref.exception_context}`;
    }
    return pref.details;
  }).join("\n- ");
  
  return `Adapt your communication style to this student's preferences:
- ${styleGuidelines}

Balance these preferences with being educational and supportive.`;
}
```

### Topic Awareness in RAG Chain

Extend the memory-augmented chain to be aware of topic engagement patterns:

```typescript
// In createMemoryAugmentedChain
RunnablePassthrough.assign({
  // ... existing code
  
  // Add topic preferences for contextual awareness
  topic_preferences: async (input) => {
    // Extract potential topics from the question
    const topics = await extractTopicsFromQuestion(input.standalone_question);
    
    // If topics found, fetch relevant engagement patterns
    if (topics.length > 0) {
      return getTopicPreferences({ 
        userId, 
        topics,
        client: supabaseClient 
      });
    }
    return "";
  }
}),
```

## UI Components for Capturing Preferences

### Style Preference Feedback Component

```tsx
// components/feedback/StyleFeedback.tsx
export function StyleFeedback() {
  const [feedback, setFeedback] = useState("");
  const [isPositive, setIsPositive] = useState(true);
  
  const submitFeedback = async () => {
    // Submit the style preference to the API
    await fetch('/api/memory/style-preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: isPositive ? 'positive' : 'negative',
        feedback
      })
    });
  };
  
  return (
    <div className="style-feedback-panel">
      <h4>How was my communication style?</h4>
      
      <div className="feedback-type-selector">
        <button 
          className={isPositive ? 'active' : ''} 
          onClick={() => setIsPositive(true)}
        >
          I liked this ✓
        </button>
        <button 
          className={!isPositive ? 'active' : ''} 
          onClick={() => setIsPositive(false)}
        >
          This felt off ✗
        </button>
      </div>
      
      <textarea
        placeholder={isPositive 
          ? "What did you like about how I explained this?" 
          : "What felt off about how I communicated?"}
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
      />
      
      <button 
        onClick={submitFeedback} 
        disabled={!feedback.trim()}
      >
        Submit Feedback
      </button>
    </div>
  );
}
```

### Topic Preference Component

```tsx
// components/feedback/TopicPreference.tsx
export function TopicPreferenceCapture({ detectedTopics = [] }) {
  const [selectedTopic, setSelectedTopic] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [preference, setPreference] = useState({
    like: true,
    context: "",
    exception: ""
  });
  
  const activeTopic = selectedTopic === "custom" ? customTopic : selectedTopic;
  
  return (
    <div className="topic-preference-panel">
      <h4>Help me understand your interests better</h4>
      
      <div className="topic-selection">
        <label>Topic:</label>
        <select 
          value={selectedTopic} 
          onChange={(e) => setSelectedTopic(e.target.value)}
        >
          <option value="">Select a topic</option>
          {detectedTopics.map(topic => (
            <option key={topic} value={topic}>{topic}</option>
          ))}
          <option value="custom">Other (specify)</option>
        </select>
        
        {selectedTopic === "custom" && (
          <input
            type="text"
            placeholder="Enter topic"
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
          />
        )}
      </div>
      
      {activeTopic && (
        <>
          <div className="preference-type">
            <label>
              <input
                type="radio"
                checked={preference.like}
                onChange={() => setPreference({...preference, like: true})}
              />
              I like discussing this topic
            </label>
            <label>
              <input
                type="radio"
                checked={!preference.like}
                onChange={() => setPreference({...preference, like: false})}
              />
              I don't enjoy this topic
            </label>
          </div>
          
          <div className="context-fields">
            <label>
              When/how I {preference.like ? 'like' : 'don\'t mind'} this topic:
              <input
                type="text"
                placeholder={preference.like 
                  ? "e.g., When discussing real-world applications" 
                  : "e.g., When it's brief and relevant"}
                value={preference.context}
                onChange={(e) => setPreference({...preference, context: e.target.value})}
              />
            </label>
            
            <label>
              Exception (when I {preference.like ? 'don\'t like' : 'do like'} this topic):
              <input
                type="text"
                placeholder={preference.like 
                  ? "e.g., When used as math problems" 
                  : "e.g., When related to my hobbies"}
                value={preference.exception}
                onChange={(e) => setPreference({...preference, exception: e.target.value})}
              />
            </label>
          </div>
          
          <button 
            onClick={() => {/* Submit preference */}} 
            disabled={!activeTopic || !preference.context}
          >
            Save Preference
          </button>
        </>
      )}
    </div>
  );
}
```

## Admin Tools for SEL Management

### Social-Emotional Dashboard

```tsx
// pages/admin/sel-dashboard.tsx
export default function SELDashboard() {
  // ... authentication and user selection code similar to memory dashboard
  
  return (
    <div className="sel-dashboard">
      <h1>Social-Emotional Learning Insights</h1>
      
      {/* User selection UI */}
      
      {selectedUser && (
        <div className="sel-insights">
          <div className="insight-section">
            <h2>Communication Style Preferences</h2>
            <CommunicationStyleTable facts={userFacts.communication_style || []} />
          </div>
          
          <div className="insight-section">
            <h2>Topic Engagement Patterns</h2>
            <TopicEngagementVisualizer facts={userFacts.engagement_pattern || []} />
          </div>
          
          <div className="insight-section">
            <h2>Emotional Response Patterns</h2>
            <EmotionalResponseTracker facts={userFacts.social_emotional || []} />
          </div>
          
          <div className="insight-section">
            <h2>Communication Recommendations</h2>
            <CommunicationRecommendations facts={userFacts} />
          </div>
        </div>
      )}
    </div>
  );
}
```

## Implementation Plan

1. **Database Schema Updates:**
   - Add new fact types to the type enum
   - Add new fields to the student_facts table
   - Create topic_contexts table if needed

2. **Extraction Enhancement:**
   - Improve the fact extraction prompt for style/SEL awareness
   - Develop specialized LLM chains for communication style analysis
   - Create post-conversation analysis for emotional pattern detection

3. **UI Development:**
   - Add style feedback UI to chat interface
   - Create topic preference capture components
   - Develop SEL insights dashboard for educators

4. **Integration with Memory Pipeline:**
   - Update memory retrieval to include style/SEL facts
   - Modify prompt templates to adapt to style preferences
   - Add topic-aware context filtering 