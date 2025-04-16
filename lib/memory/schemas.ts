import { z } from "zod"

// Example schema for extracting student preferences or facts
export const studentFactSchema = z
  .object({
    fact_type: z
      .enum([
        "preference",
        "struggle",
        "goal",
        "topic_interest",
        "learning_style",
        "communication_style",
        "engagement_pattern",
        "social_emotional",
        "other"
      ])
      .describe(
        "The category of the extracted fact (e.g., preference, learning goal, communication style)."
      ),
    subject: z
      .string()
      .optional()
      .describe(
        "The academic subject the fact relates to (e.g., Math, Physics, History). Optional."
      ),
    details: z
      .string()
      .describe(
        "A concise description of the extracted fact (e.g., 'visual learner', 'difficulty with fractions', 'finds formal language cringe')."
      ),
    // New fields for enhanced context awareness
    context: z
      .string()
      .optional()
      .describe(
        "When this preference applies (e.g., 'during collaborative exercises', 'when discussing their favorite games')."
      ),
    exception_context: z
      .string()
      .optional()
      .describe(
        "When this preference does not apply (e.g., 'except when used as math examples', 'unless presented with visuals')."
      ),
    // Optional: Add confidence score if the LLM supports it
    confidence: z
      .number()
      .optional()
      .describe("Confidence score (0-1) that the extracted fact is accurate.")
  })
  .describe(
    "A single, atomic fact, preference, goal, or area of struggle mentioned by the student."
  )

// Schema for extracting multiple facts at once
export const extractedFactsSchema = z.object({
  facts: z
    .array(studentFactSchema)
    .describe(
      "An array of facts, preferences, goals, or struggles extracted from the conversation."
    )
})

// Schema for communication style preferences specifically
export const communicationStyleSchema = z.object({
  preference_type: z
    .enum(["likes", "dislikes"])
    .describe(
      "Whether this represents something the student likes or dislikes in communication."
    ),
  style_element: z
    .string()
    .describe(
      "The specific communication element (e.g., 'emoji use', 'formal language', 'pop culture references')."
    ),
  details: z.string().describe("Detailed description of the preference."),
  example_phrase: z
    .string()
    .optional()
    .describe(
      "An example phrase or wording that demonstrates this style element."
    )
})

// Schema for topic engagement patterns
export const topicEngagementSchema = z.object({
  topic: z
    .string()
    .describe(
      "The subject or topic of interest (e.g., 'Minecraft', 'basketball', 'anime')."
    ),
  engagement_level: z
    .enum(["high", "moderate", "low", "negative"])
    .describe("How engaged the student gets with this topic."),
  context: z
    .string()
    .describe(
      "When/how the student engages with this topic (e.g., 'when discussing game mechanics', 'as real-world examples')."
    ),
  exception: z
    .string()
    .optional()
    .describe(
      "Exception to the engagement pattern (e.g., 'except when used for math problems')."
    )
})

// Schema for extracting social-emotional indicators
export const socialEmotionalSchema = z.object({
  indicator_type: z
    .enum(["frustration", "engagement", "confidence", "motivation", "other"])
    .describe("The type of social-emotional indicator observed."),
  trigger: z
    .string()
    .describe(
      "What causes this emotional response (e.g., 'difficult math problems', 'being praised')."
    ),
  manifestation: z
    .string()
    .describe(
      "How the emotion is expressed (e.g., 'short one-word responses', 'increased participation')."
    ),
  suggested_response: z
    .string()
    .optional()
    .describe("How to effectively respond to this emotional state.")
})

// Combined schema for extracting all types of preferences and SEL indicators
export const comprehensiveExtractionSchema = z.object({
  facts: z
    .array(studentFactSchema)
    .describe(
      "General facts about the student's preferences and learning style."
    ),
  communication_styles: z
    .array(communicationStyleSchema)
    .optional()
    .describe("Specific communication style preferences."),
  topic_engagement: z
    .array(topicEngagementSchema)
    .optional()
    .describe("How the student engages with different topics."),
  social_emotional: z
    .array(socialEmotionalSchema)
    .optional()
    .describe("Social and emotional indicators from the conversation.")
})
