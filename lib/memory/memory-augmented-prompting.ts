import {
  ChatPromptTemplate,
  MessagesPlaceholder
} from "@langchain/core/prompts"
import {
  RunnableSequence,
  RunnablePassthrough
} from "@langchain/core/runnables"
import { StringOutputParser } from "@langchain/core/output_parsers"
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai"
import { formatDocumentsAsString } from "langchain/util/document"
import type { BaseMessage } from "@langchain/core/messages"
import type { SupabaseClient } from "@supabase/supabase-js"

// Import our memory components
import { SupabaseChatMessageHistory } from "@/lib/langchain/memory/supabase-chat-history"
import { getConversationMemoryRetriever } from "@/lib/memory/vector-memory"
import {
  getFactsForPrompt,
  processAndStoreConversationFacts
} from "@/lib/memory/fact-management"
import { supabase as browserClient } from "@/lib/supabase/browser-client"

// Import SEL components
import {
  extractComprehensiveInsightsFromMessages,
  formatAllSELInsightsForPrompt
} from "@/lib/memory/sel-extraction"

// Define a type for chat settings
export interface ChatSettings {
  openaiApiKey?: string
  model: string
  temperature: number
  extractFacts?: boolean
  includeSEL?: boolean // New setting for social-emotional learning
  // Add any other settings needed
}

/**
 * Create a complete RAG chain that combines all memory types:
 * 1. Chat History (SupabaseChatMessageHistory)
 * 2. Semantic Memory (RAG using getConversationMemoryRetriever)
 * 3. Structured Facts (from getFactsForPrompt)
 * 4. Social-Emotional Learning & Style Preferences (new)
 */
export async function createMemoryAugmentedChain({
  userId,
  chatId,
  supabaseClient = browserClient,
  chatSettings,
  sourceCount = 4, // Number of RAG chunks to retrieve
  includeStructuredFacts = true, // Whether to include facts from Feature #4
  includeSEL = true, // Whether to include social-emotional learning insights
  systemPromptTemplate = "", // Optional custom system prompt
  subjectFilter = null, // Optional subject filter for facts
  timeframeFilter = "all" // Optional timeframe filter
}: {
  userId: string
  chatId: string
  supabaseClient?: SupabaseClient
  chatSettings: ChatSettings // Use the defined type
  sourceCount?: number
  includeStructuredFacts?: boolean
  includeSEL?: boolean
  systemPromptTemplate?: string
  subjectFilter?: string | null
  timeframeFilter?: string
}) {
  // 1. Setup Memory Components
  const chatHistory = new SupabaseChatMessageHistory({
    chatId,
    userId,
    client: supabaseClient
  })

  const retriever = getConversationMemoryRetriever({
    userId,
    client: supabaseClient,
    embeddingApiKey: chatSettings.openaiApiKey, // Or from env vars if server-side
    k: sourceCount,
    timeframe: timeframeFilter
  })

  // 2. Define LLM
  const llm = new ChatOpenAI({
    openAIApiKey: chatSettings.openaiApiKey, // Or from env vars
    modelName: chatSettings.model,
    temperature: chatSettings.temperature
    // streaming: true // Keep streaming enabled for UI
  })

  // 3. Define Prompts - a) Condense Question Prompt
  const condenseQuestionPrompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "Given the conversation history, formulate the user's most recent message as a standalone question that captures its full intent. If it's already a standalone question, return it as is."
    ],
    new MessagesPlaceholder("chat_history"),
    ["human", "{question}"],
    ["ai", "Standalone question:"]
  ])

  // 3. Define Prompts - b) Answer Prompt with all memory sources including SEL
  const defaultSystemPrompt = `You are Poiesis Pete, a helpful AI assistant for students. Answer the user's question based on the provided context sources:

1. STUDENT FACTS: Known facts and preferences about the student.
2. SOCIAL-EMOTIONAL LEARNING INSIGHTS: Communication style preferences and topic engagement patterns.
3. CONVERSATION MEMORIES: Relevant snippets from past conversations.
4. CURRENT CHAT HISTORY: The ongoing conversation.

If asked about something not in these sources, acknowledge that you don't have specific memory of that topic and answer based on your general knowledge. Be friendly, supportive, and personalize your responses to the student's preferences and needs when possible.

Adapt your communication style to match their preferences - be aware of what they find engaging or "cringe", and how they prefer to discuss topics.`

  const finalSystemPrompt = systemPromptTemplate || defaultSystemPrompt

  const answerPrompt = ChatPromptTemplate.fromMessages([
    ["system", finalSystemPrompt],
    // We'll add these conditionally below
    // ["system", "{student_facts}"],
    // ["system", "{sel_insights}"],
    // ["system", "Relevant conversation memories:\n{context}"],
    new MessagesPlaceholder("chat_history"),
    ["human", "{question}"]
  ])

  // 4. Define Chains
  const standaloneQuestionChain = RunnableSequence.from([
    // Dynamically fetch history inside the chain step
    RunnablePassthrough.assign({
      chat_history: async () => chatHistory.getMessages()
    }),
    condenseQuestionPrompt,
    llm,
    new StringOutputParser()
  ] as any).withConfig({ runName: "StandaloneQuestionGeneration" })

  const retrieverChain = RunnableSequence.from([
    (input: { standalone_question: string }) => input.standalone_question,
    retriever,
    formatDocumentsAsString
  ] as any).withConfig({ runName: "RetrieveSemanticMemory" })

  // 5. Main RAG Chain with memory augmentation
  const memoryAugmentedChain = RunnableSequence.from([
    // Step 1: Condense the question and fetch student facts
    RunnablePassthrough.assign({
      // Condense question only if chat history exists
      standalone_question: async (input: { question: string }) => {
        const messages = await chatHistory.getMessages()
        if (messages && messages.length > 1) {
          return standaloneQuestionChain.invoke({
            question: input.question
            // chat_history populated inside the chain
          })
        }
        return input.question // Pass through if no history
      },
      // Fetch structured facts about the student
      student_facts: includeStructuredFacts
        ? async () =>
            getFactsForPrompt({
              userId,
              subject: subjectFilter,
              timeframe: timeframeFilter,
              client: supabaseClient
            })
        : async () => "", // Empty string if not using structured facts

      // Fetch social-emotional learning and style preferences
      sel_insights: includeSEL
        ? async () => {
            // Get messages to analyze
            const messages = await chatHistory.getMessages()
            if (!messages || messages.length < 3) {
              return "" // Not enough context to extract insights
            }

            // Extract comprehensive insights from messages
            const insights = await extractComprehensiveInsightsFromMessages({
              messages,
              llmApiKey: chatSettings.openaiApiKey
            })

            // Format insights for prompt inclusion
            return formatAllSELInsightsForPrompt(insights)
          }
        : async () => "" // Empty string if not using SEL
    }),

    // Step 2: Retrieve semantic memory context based on the standalone question
    RunnablePassthrough.assign({
      context: async input => {
        const context = await retrieverChain.invoke({
          standalone_question: input.standalone_question
        })
        return context || "No relevant past conversation memories found."
      },
      // Also get fresh chat history for the final prompt
      chat_history: async () => chatHistory.getMessages()
    }),

    // Step 3: Format the final prompt with all memory sources
    input => {
      // Start with the basic inputs
      const finalPromptInputs: Record<string, unknown> = {
        // Use unknown instead of any
        question: input.question,
        chat_history: input.chat_history ?? []
      }

      // Build the final prompt by conditionally adding memory components
      let finalPrompt = answerPrompt
      const promptParts = [["system", finalSystemPrompt]]

      // Add student facts if available and requested
      if (
        includeStructuredFacts &&
        input.student_facts &&
        input.student_facts.length > 0
      ) {
        promptParts.push([
          "system",
          `STUDENT FACTS:\n${input.student_facts}\n\n`
        ])
      }

      // Add SEL insights if available and requested
      if (includeSEL && input.sel_insights && input.sel_insights.length > 0) {
        promptParts.push(["system", `${input.sel_insights}\n\n`])
      }

      // Add RAG context if available
      if (input.context && input.context.length > 0) {
        promptParts.push([
          "system",
          `CONVERSATION MEMORIES:\n${input.context}\n\n`
        ])
      }

      // Add chat history - using a special type cast to handle the MessagesPlaceholder
      const historyPlaceholder = new MessagesPlaceholder("chat_history")
      promptParts.push(historyPlaceholder as any)

      // Add user question
      promptParts.push(["human", "{question}"])

      // Create the final prompt template
      // Use a type assertion to handle the mixed array of string tuples and MessagesPlaceholder
      finalPrompt = ChatPromptTemplate.fromMessages(promptParts as any)

      return {
        prompt: finalPrompt,
        prompt_inputs: finalPromptInputs
      }
    },

    // Step 4: Execute the final prompt with LLM
    input => input.prompt.pipe(llm).invoke(input.prompt_inputs)

    // Output parser might be handled by streaming logic in the API route
  ]).withConfig({ runName: "MemoryAugmentedAnswerGeneration" })

  return {
    memoryAugmentedChain,
    chatHistory // Return history object for saving messages in the API route
  }
}

/**
 * Example API route implementation that uses the memory-augmented chain.
 * This is a conceptual example - integrate this into your actual API route.
 */
/*
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

export async function POST(req: Request) {
  const body = await req.json();
  const { messages, chatSettings, chatId, userId } = body;
  
  // Get the most recent message (user input)
  const currentQuestion = messages[messages.length - 1].content;
  
  try {
    // Create server-side Supabase client
    const supabaseClient = createServerComponentClient({ cookies });
    
    // Create the memory-augmented chain
    const { memoryAugmentedChain, chatHistory } = await createMemoryAugmentedChain({
      userId,
      chatId,
      supabaseClient,
      chatSettings,
      includeStructuredFacts: true,
      includeSEL: true
    });
    
    // Save the user message BEFORE running the chain
    await chatHistory.addUserMessage(currentQuestion);
    
    // Process in streaming mode
    const stream = await memoryAugmentedChain.stream({
      question: currentQuestion
    });
    
    // Handle streaming (simplified) - you'll likely use the AI SDK or equivalent
    let completeResponse = "";
    for await (const chunk of stream) {
      // Send chunk to client
      completeResponse += chunk.content;
    }
    
    // Save the AI's response AFTER completion
    await chatHistory.addAIChatMessage(completeResponse);
    
    // After the chat session, process facts in the background
    // This could be moved to a separate API endpoint or background job
    if (chatSettings.extractFacts !== false) {
      const allMessages = await chatHistory.getMessages();
      processAndStoreConversationFacts({
        messages: allMessages,
        userId,
        chatId,
        llmApiKey: chatSettings.openaiApiKey,
        client: supabaseClient
      }).catch(err => console.error("Background fact extraction failed:", err));
    }
    
    // Return streaming response
    return new Response(stream);
  } catch (error) {
    console.error("Error in chat processing:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process chat" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
*/
