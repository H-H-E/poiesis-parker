import { ChatOpenAI } from "@langchain/openai"
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate
} from "@langchain/core/prompts"
import { JsonOutputFunctionsParser } from "langchain/output_parsers"
import { zodToJsonSchema } from "zod-to-json-schema"
import {
  communicationStyleSchema,
  topicEngagementSchema,
  socialEmotionalSchema,
  comprehensiveExtractionSchema,
  studentFactSchema
} from "./schemas"
import type { BaseMessage } from "@langchain/core/messages"
import { z } from "zod"

// Define types for the extracted data
type CommunicationStyle = z.infer<typeof communicationStyleSchema>
type TopicEngagement = z.infer<typeof topicEngagementSchema>
type SocialEmotional = z.infer<typeof socialEmotionalSchema>
type StudentFact = z.infer<typeof studentFactSchema>

type ComprehensiveInsights = {
  facts: StudentFact[]
  communication_styles?: CommunicationStyle[]
  topic_engagement?: TopicEngagement[]
  social_emotional?: SocialEmotional[]
}

/**
 * Creates a specialized LangChain chain that extracts communication style preferences
 * from conversation text.
 */
export function createStylePreferenceExtractionChain({
  llmApiKey,
  modelName = "gpt-4" // Use a capable model for nuance detection
}: {
  llmApiKey?: string
  modelName?: string
}) {
  const prompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(
      `Analyze the conversation and extract the student's communication style preferences. 
            Focus on identifying language patterns they respond positively or negatively to, 
            such as:
            
            - Formal vs. informal language preferences
            - Reactions to certain phrases or tones (e.g., what they might find "cringe")
            - Use of humor, emojis, pop culture references
            - Level of technical vs. simplified language they prefer
            
            Be highly attentive to subtle cues where they express like or dislike for how something is phrased.
            Only extract preferences that are clearly demonstrated, not assumptions.`
    ),
    HumanMessagePromptTemplate.fromTemplate("{conversation_text}")
  ])

  const llm = new ChatOpenAI({
    openAIApiKey: llmApiKey ?? process.env.OPENAI_API_KEY,
    modelName: modelName,
    temperature: 0 // Low temperature for reliable extraction
  })

  const extractionFunctionName = "extractCommunicationStylePreferences"

  // Bind the schema as a function call to the LLM
  const extractionLlm = llm.bind({
    functions: [
      {
        name: extractionFunctionName,
        description:
          "Extracts communication style preferences from student conversations.",
        parameters: zodToJsonSchema(communicationStyleSchema)
      }
    ],
    function_call: { name: extractionFunctionName }
  })

  const chain = prompt.pipe(extractionLlm).pipe(new JsonOutputFunctionsParser())

  return chain
}

/**
 * Creates a LangChain chain that extracts topic engagement patterns from conversation.
 */
export function createTopicEngagementExtractionChain({
  llmApiKey,
  modelName = "gpt-4"
}: {
  llmApiKey?: string
  modelName?: string
}) {
  const prompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(
      `Analyze the conversation and extract the student's topic engagement patterns.
            Focus on identifying:
            
            - Topics they enjoy discussing (e.g., games, sports, media)
            - How they engage with these topics in different contexts
            - Topics they avoid or respond negatively to
            - Context-specific engagement patterns (e.g., likes a topic in one context but not another)
            
            For example, a student might love discussing Minecraft generally, but disengage when it's
            used as a math example. Or they might enjoy sports analogies for science but not for literature.
            Capture these nuanced patterns precisely.`
    ),
    HumanMessagePromptTemplate.fromTemplate("{conversation_text}")
  ])

  const llm = new ChatOpenAI({
    openAIApiKey: llmApiKey ?? process.env.OPENAI_API_KEY,
    modelName: modelName,
    temperature: 0
  })

  const extractionFunctionName = "extractTopicEngagementPatterns"

  const extractionLlm = llm.bind({
    functions: [
      {
        name: extractionFunctionName,
        description:
          "Extracts topic engagement patterns from student conversations.",
        parameters: zodToJsonSchema(topicEngagementSchema)
      }
    ],
    function_call: { name: extractionFunctionName }
  })

  return prompt.pipe(extractionLlm).pipe(new JsonOutputFunctionsParser())
}

/**
 * Creates a LangChain chain that extracts social-emotional indicators from conversation.
 */
export function createSocialEmotionalExtractionChain({
  llmApiKey,
  modelName = "gpt-4"
}: {
  llmApiKey?: string
  modelName?: string
}) {
  const prompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(
      `Analyze the conversation and extract social-emotional learning indicators from the student.
            Focus on identifying:
            
            - Signs of frustration or confusion (e.g., short responses, giving up)
            - Confidence indicators (positive or negative)
            - Emotional responses to different learning approaches
            - Motivational patterns and what inspires engagement
            - Growth mindset vs. fixed mindset signals
            
            Pay close attention to how they respond emotionally to challenges, feedback, and success.
            Note both the emotional trigger and how it manifests in their communication.`
    ),
    HumanMessagePromptTemplate.fromTemplate("{conversation_text}")
  ])

  const llm = new ChatOpenAI({
    openAIApiKey: llmApiKey ?? process.env.OPENAI_API_KEY,
    modelName: modelName,
    temperature: 0
  })

  const extractionFunctionName = "extractSocialEmotionalIndicators"

  const extractionLlm = llm.bind({
    functions: [
      {
        name: extractionFunctionName,
        description:
          "Extracts social-emotional indicators from student conversations.",
        parameters: zodToJsonSchema(socialEmotionalSchema)
      }
    ],
    function_call: { name: extractionFunctionName }
  })

  return prompt.pipe(extractionLlm).pipe(new JsonOutputFunctionsParser())
}

/**
 * Creates a comprehensive extraction chain that captures all types of preferences and SEL indicators.
 */
export function createComprehensiveExtractionChain({
  llmApiKey,
  modelName = "gpt-4"
}: {
  llmApiKey?: string
  modelName?: string
}) {
  const prompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(
      `Analyze the conversation and extract comprehensive insights about the student, including:
            
            1. GENERAL FACTS: Learning preferences, struggles, goals, interests
            2. COMMUNICATION STYLE: Language preferences, what they find engaging vs. "cringe"
            3. TOPIC ENGAGEMENT: How they engage with different topics in different contexts
            4. SOCIAL-EMOTIONAL: Emotional responses, confidence indicators, motivational patterns
            
            Be especially attentive to nuanced preferences - for example, a student might like
            discussing video games generally, but dislike when they're used in math problems.
            Or they might find certain phrases or communication styles off-putting.`
    ),
    HumanMessagePromptTemplate.fromTemplate("{conversation_text}")
  ])

  const llm = new ChatOpenAI({
    openAIApiKey: llmApiKey ?? process.env.OPENAI_API_KEY,
    modelName: modelName,
    temperature: 0
  })

  const extractionFunctionName = "extractComprehensiveStudentInsights"

  const extractionLlm = llm.bind({
    functions: [
      {
        name: extractionFunctionName,
        description:
          "Extracts comprehensive insights about a student from conversations.",
        parameters: zodToJsonSchema(comprehensiveExtractionSchema)
      }
    ],
    function_call: { name: extractionFunctionName }
  })

  return prompt.pipe(extractionLlm).pipe(new JsonOutputFunctionsParser())
}

/**
 * Runs comprehensive extraction on a given set of messages.
 */
export async function extractComprehensiveInsightsFromMessages({
  messages,
  llmApiKey,
  modelName = "gpt-4"
}: {
  messages: BaseMessage[]
  llmApiKey?: string
  modelName?: string
}): Promise<ComprehensiveInsights> {
  if (!messages || messages.length === 0) {
    return {
      facts: [],
      communication_styles: [],
      topic_engagement: [],
      social_emotional: []
    }
  }

  const conversationText = messages
    .map(
      msg =>
        `${msg._getType()}: ${typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content)}`
    )
    .join("\n\n")

  const chain = createComprehensiveExtractionChain({ llmApiKey, modelName })

  try {
    return (await chain.invoke({
      conversation_text: conversationText
    })) as ComprehensiveInsights
  } catch (error) {
    console.error("Error during comprehensive extraction:", error)
    return {
      facts: [],
      communication_styles: [],
      topic_engagement: [],
      social_emotional: []
    }
  }
}

/**
 * Helper: Process and format communication style preferences for LLM prompting
 */
export function formatCommunicationStylePreferencesForPrompt(
  styles: CommunicationStyle[] = []
): string {
  if (!styles || styles.length === 0) {
    return ""
  }

  const formattedStyles = styles
    .map(style => {
      const prefix = style.preference_type === "likes" ? "Use" : "Avoid"
      return `- ${prefix} ${style.style_element}: ${style.details}${style.example_phrase ? ` (e.g., "${style.example_phrase}")` : ""}`
    })
    .join("\n")

  return `COMMUNICATION STYLE PREFERENCES:\n${formattedStyles}`
}

/**
 * Helper: Process and format topic engagement patterns for LLM prompting
 */
export function formatTopicEngagementForPrompt(
  topics: TopicEngagement[] = []
): string {
  if (!topics || topics.length === 0) {
    return ""
  }

  const formattedTopics = topics
    .map(topic => {
      let engagementDesc = ""
      switch (topic.engagement_level) {
        case "high":
          engagementDesc = "Shows high interest in"
          break
        case "moderate":
          engagementDesc = "Is moderately interested in"
          break
        case "low":
          engagementDesc = "Shows little interest in"
          break
        case "negative":
          engagementDesc = "Reacts negatively to"
          break
      }

      const contextStr = topic.context ? ` when ${topic.context}` : ""
      const exceptionStr = topic.exception
        ? ` Exception: ${topic.exception}`
        : ""

      return `- ${engagementDesc} ${topic.topic}${contextStr}.${exceptionStr}`
    })
    .join("\n")

  return `TOPIC ENGAGEMENT PATTERNS:\n${formattedTopics}`
}

/**
 * Helper: Process and format social-emotional indicators for LLM prompting
 */
export function formatSocialEmotionalForPrompt(
  indicators: SocialEmotional[] = []
): string {
  if (!indicators || indicators.length === 0) {
    return ""
  }

  const formattedIndicators = indicators
    .map(indicator => {
      const response = indicator.suggested_response
        ? `\n  Effective response: ${indicator.suggested_response}`
        : ""
      return `- When ${indicator.trigger}, shows ${indicator.indicator_type} through ${indicator.manifestation}.${response}`
    })
    .join("\n")

  return `SOCIAL-EMOTIONAL INDICATORS:\n${formattedIndicators}`
}

/**
 * Combine all SEL insights into a single prompt section
 */
export function formatAllSELInsightsForPrompt(
  insights: Partial<ComprehensiveInsights> = {}
): string {
  if (!insights || Object.keys(insights).length === 0) {
    return ""
  }

  const sections = []

  if (
    insights.communication_styles &&
    insights.communication_styles.length > 0
  ) {
    sections.push(
      formatCommunicationStylePreferencesForPrompt(
        insights.communication_styles
      )
    )
  }

  if (insights.topic_engagement && insights.topic_engagement.length > 0) {
    sections.push(formatTopicEngagementForPrompt(insights.topic_engagement))
  }

  if (insights.social_emotional && insights.social_emotional.length > 0) {
    sections.push(formatSocialEmotionalForPrompt(insights.social_emotional))
  }

  if (sections.length === 0) {
    return ""
  }

  return `SOCIAL-EMOTIONAL LEARNING INSIGHTS:\n${sections.join("\n\n")}`
}
