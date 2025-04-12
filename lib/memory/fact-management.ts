import { extractFactsFromMessages } from "./structured-memory";
import type { BaseMessage } from "@langchain/core/messages";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as browserClient } from "@/lib/supabase/browser-client";

// Define the fact types that match our schema CHECK constraint
export type FactType = 'preference' | 'struggle' | 'goal' | 'topic_interest' | 'learning_style' | 'other';

// Define the student fact structure manually
export interface StudentFact {
  id?: string; // Optional for new facts
  user_id: string;
  chat_id?: string | null;
  fact_type: FactType;
  subject?: string | null;
  details: string;
  confidence?: number | null;
  source_message_id?: string | null;
  active?: boolean;
  tags?: string[]; // Array of tags for categorizing facts
  created_at?: string;
  updated_at?: string;
}

/**
 * Process a conversation to extract facts and store them in the database.
 * This combines Feature #3 (extraction) with Feature #4 (storage).
 */
export async function processAndStoreConversationFacts({
  messages,
  userId,
  chatId,
  llmApiKey,
  modelName = "gpt-3.5-turbo",
  client = browserClient
}: {
  messages: BaseMessage[];
  userId: string;
  chatId?: string;
  llmApiKey?: string;
  modelName?: string;
  client?: SupabaseClient;
}): Promise<StudentFact[]> {
  // 1. Extract facts from messages using the fact extraction chain (Feature #3)
  const extractedData = await extractFactsFromMessages({
    messages,
    llmApiKey,
    modelName
  });

  if (!extractedData.facts || extractedData.facts.length === 0) {
    console.log("No facts extracted from conversation");
    return [];
  }

  // 2. Map extracted facts to our StudentFact format
  const factsToStore: StudentFact[] = extractedData.facts.map(fact => ({
    user_id: userId,
    chat_id: chatId || null,
    fact_type: fact.fact_type as FactType,
    subject: fact.subject || null,
    details: fact.details,
    // Optional fields:
    confidence: null, // Could add confidence if the LLM provides it
    active: true
  }));

  console.log(`Storing ${factsToStore.length} extracted facts for user ${userId}`);

  try {
    // 3. Store facts in the database
    // Note: This requires the table to exist and the user to have appropriate permissions
    const { data: storedFacts, error } = await client
      .from("student_facts")
      .insert(factsToStore)
      .select();

    if (error) {
      console.error("Error storing facts:", error);
      throw new Error(`Failed to store facts: ${error.message}`);
    }

    console.log(`Successfully stored ${storedFacts?.length || 0} facts`);
    return storedFacts as StudentFact[] || [];
  } catch (error) {
    console.error("Error in fact storage process:", error);
    throw error;
  }
}

/**
 * Get facts for a user, formatted for inclusion in an LLM prompt.
 * This is part of Feature #5 (memory-augmented prompting).
 */
export async function getFactsForPrompt({
  userId,
  subject = null,
  factTypes = null, // Allow limiting to specific fact types if needed
  client = browserClient,
  maxFacts = 15 // Limit facts to prevent token overflow
}: {
  userId: string;
  subject?: string | null;
  factTypes?: FactType[] | null;
  client?: SupabaseClient;
  maxFacts?: number;
}): Promise<string> {
  try {
    // Build the query
    let query = client
      .from("student_facts")
      .select("*")
      .eq("user_id", userId)
      .eq("active", true)
      .order("updated_at", { ascending: false })
      .limit(maxFacts);

    // Add subject filter if provided
    if (subject) {
      query = query.eq("subject", subject);
    }

    // Add fact_type filter if provided
    if (factTypes && factTypes.length > 0) {
      query = query.in("fact_type", factTypes);
    }

    const { data: facts, error } = await query;

    if (error) {
      console.error("Error fetching facts for prompt:", error);
      return ""; // Return empty string on error to allow graceful degradation
    }

    if (!facts || facts.length === 0) {
      return "No prior information about the student available.";
    }

    // Format facts for the prompt in a helpful, structured way
    const formattedFacts = facts.map(fact => {
      const subjectStr = fact.subject ? ` [${fact.subject}]` : '';
      return `- ${fact.fact_type.toUpperCase()}${subjectStr}: ${fact.details}`;
    }).join('\n');

    return `Known information about the student:\n${formattedFacts}`;
  } catch (error) {
    console.error("Error generating facts for prompt:", error);
    return ""; // Return empty string on error
  }
}

/**
 * Groups facts by type and subject for a more structured representation.
 * Useful for UI display or more structured prompting.
 */
export async function getFactsGroupedByTypeAndSubject({
  userId,
  client = browserClient
}: {
  userId: string;
  client?: SupabaseClient;
}): Promise<Record<string, StudentFact[]>> {
  try {
    const { data: facts, error } = await client
      .from("student_facts")
      .select("*")
      .eq("user_id", userId)
      .eq("active", true)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching grouped facts:", error);
      return {};
    }

    if (!facts || facts.length === 0) {
      return {};
    }

    // Group facts by fact_type and by fact_type:subject
    return facts.reduce((grouped, fact) => {
      // Group by fact_type
      const type = fact.fact_type;
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(fact as StudentFact);
      
      // Then if subject exists, also group by fact_type:subject
      if (fact.subject) {
        const key = `${type}:${fact.subject}`;
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(fact as StudentFact);
      }
      
      return grouped;
    }, {} as Record<string, StudentFact[]>);
  } catch (error) {
    console.error("Error getting grouped facts:", error);
    return {};
  }
}

/**
 * Updates an existing student fact in the database.
 */
export async function updateStudentFact({
  factId,
  updates,
  client = browserClient
}: {
  factId: string;
  updates: Partial<Omit<StudentFact, 'id' | 'user_id' | 'created_at' | 'updated_at'>>; // Allow updating relevant fields
  client?: SupabaseClient;
}): Promise<StudentFact | null> {
  if (!factId) {
    throw new Error("Fact ID is required for updates.");
  }

  // Ensure 'updated_at' is set automatically by Supabase or manually here if needed
  const updateData = { ...updates, updated_at: new Date().toISOString() };

  try {
    const { data, error } = await client
      .from("student_facts")
      .update(updateData)
      .eq("id", factId)
      .select()
      .single(); // Expecting a single row back

    if (error) {
      console.error(`Error updating fact ${factId}:`, error);
      throw new Error(`Failed to update fact: ${error.message}`);
    }

    console.log(`Successfully updated fact ${factId}`);
    return data as StudentFact || null;
  } catch (error) {
    console.error("Error in updateStudentFact:", error);
    throw error;
  }
}

/**
 * Deactivates a student fact by setting its 'active' status to false.
 */
export async function deactivateStudentFact({
  factId,
  client = browserClient
}: {
  factId: string;
  client?: SupabaseClient;
}): Promise<StudentFact | null> {
   if (!factId) {
    throw new Error("Fact ID is required for deactivation.");
  }

  try {
    const { data, error } = await client
      .from("student_facts")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("id", factId)
      .select()
      .single();

    if (error) {
      console.error(`Error deactivating fact ${factId}:`, error);
      throw new Error(`Failed to deactivate fact: ${error.message}`);
    }

     console.log(`Successfully deactivated fact ${factId}`);
    return data as StudentFact || null;
  } catch (error) {
    console.error("Error in deactivateStudentFact:", error);
    throw error;
  }
}

/**
 * Detects and resolves conflicts between a new fact and existing facts.
 * This helps maintain consistency in the student knowledge base.
 */
export async function detectAndHandleFactConflicts({
  newFact,
  userId,
  strategy = 'prefer_new',
  client = browserClient
}: {
  newFact: Omit<StudentFact, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
  userId: string;
  strategy?: 'prefer_new' | 'prefer_high_confidence' | 'merge';
  client?: SupabaseClient;
}): Promise<{
  existingFacts: StudentFact[];
  action: 'added' | 'updated' | 'merged' | 'ignored';
  result?: StudentFact | null;
}> {
  // Search for potentially conflicting facts with same fact_type and subject
  const { data: existingFacts, error } = await client
    .from("student_facts")
    .select("*")
    .eq("user_id", userId)
    .eq("active", true)
    .eq("fact_type", newFact.fact_type)
    .eq("subject", newFact.subject || '');

  if (error) {
    console.error("Error finding potential fact conflicts:", error);
    throw new Error(`Failed to search for conflicting facts: ${error.message}`);
  }

  if (!existingFacts || existingFacts.length === 0) {
    // No conflicts, add as a new fact
    const { data: insertedFact, error: insertError } = await client
      .from("student_facts")
      .insert({ ...newFact, user_id: userId })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to insert new fact: ${insertError.message}`);
    }

    return {
      existingFacts: [],
      action: 'added',
      result: insertedFact as StudentFact
    };
  }

  // Handle potential conflicts based on strategy
  console.log(`Found ${existingFacts.length} potential conflicts. Using strategy: ${strategy}`);

  switch (strategy) {
    case 'prefer_new': {
      // Deactivate all conflicting facts and add the new one
      const deactivationPromises = existingFacts.map(fact => 
        fact.id ? deactivateStudentFact({ factId: fact.id, client }) : Promise.resolve(null)
      );
      await Promise.all(deactivationPromises);

      const { data: addedFact, error: addError } = await client
        .from("student_facts")
        .insert({ ...newFact, user_id: userId })
        .select()
        .single();

      if (addError) {
        throw new Error(`Failed to add new fact after deactivating conflicts: ${addError.message}`);
      }

      return {
        existingFacts: existingFacts as StudentFact[],
        action: 'updated',
        result: addedFact as StudentFact
      };
    }

    case 'prefer_high_confidence': {
      // Compare confidence and keep the one with higher confidence
      const highestConfidenceFact = [...existingFacts].sort((a, b) => 
        (b.confidence || 0) - (a.confidence || 0)
      )[0] as StudentFact;

      if ((newFact.confidence || 0) > (highestConfidenceFact.confidence || 0)) {
        // New fact has higher confidence, deactivate old ones and add new
        const deactivationPromises = existingFacts.map(fact => 
          fact.id ? deactivateStudentFact({ factId: fact.id, client }) : Promise.resolve(null)
        );
        await Promise.all(deactivationPromises);

        const { data: addedHighConfFact, error: addHighConfError } = await client
          .from("student_facts")
          .insert({ ...newFact, user_id: userId })
          .select()
          .single();

        if (addHighConfError) {
          throw new Error(`Failed to add higher confidence fact: ${addHighConfError.message}`);
        }

        return {
          existingFacts: existingFacts as StudentFact[],
          action: 'updated',
          result: addedHighConfFact as StudentFact
        };
      }
      
      // Existing fact has higher or equal confidence, keep it
      return {
        existingFacts: existingFacts as StudentFact[],
        action: 'ignored',
        result: null
      };
    }

    case 'merge': {
      // Merge the information from new fact with the most recent existing fact
      const mostRecentFact = [...existingFacts].sort((a, b) => 
        new Date(b.updated_at || b.created_at || '').getTime() - 
        new Date(a.updated_at || a.created_at || '').getTime()
      )[0] as StudentFact;

      // Simple merge strategy: combine details with note about the merge
      const mergedDetails = `${mostRecentFact.details} (Updated: ${newFact.details})`;
      
      if (!mostRecentFact.id) {
        throw new Error('Cannot merge with fact that has no ID');
      }
      
      // Update the existing fact with merged information
      const { data: updatedFact, error: updateError } = await client
        .from("student_facts")
        .update({ 
          details: mergedDetails,
          confidence: Math.max(newFact.confidence || 0, mostRecentFact.confidence || 0),
          updated_at: new Date().toISOString()
        })
        .eq("id", mostRecentFact.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to merge facts: ${updateError.message}`);
      }

      return {
        existingFacts: existingFacts as StudentFact[],
        action: 'merged',
        result: updatedFact as StudentFact
      };
    }

    default:
      throw new Error(`Unknown conflict resolution strategy: ${strategy}`);
  }
}

/**
 * Get facts that are contextually relevant to a given query or topic.
 * This is useful for retrieving facts that might be relevant to the current
 * conversation context, even if they don't match exact subject filters.
 */
export async function getContextuallyRelevantFacts({
  userId,
  context,
  limit = 10,
  includeInactiveFacts = false,
  client = browserClient,
  factTypes = null
}: {
  userId: string;
  context: string; // The current topic or query to find relevant facts for
  limit?: number;
  includeInactiveFacts?: boolean;
  client?: SupabaseClient;
  factTypes?: FactType[] | null;
}): Promise<StudentFact[]> {
  try {
    // First, get all facts for the user
    let query = client
      .from("student_facts")
      .select("*")
      .eq("user_id", userId);

    // Filter by active status if needed
    if (!includeInactiveFacts) {
      query = query.eq("active", true);
    }
    
    // Filter by fact types if specified
    if (factTypes && factTypes.length > 0) {
      query = query.in("fact_type", factTypes);
    }

    const { data: allFacts, error } = await query;

    if (error) {
      console.error("Error fetching facts for contextual relevance:", error);
      throw new Error(`Failed to fetch facts: ${error.message}`);
    }

    if (!allFacts || allFacts.length === 0) {
      return [];
    }

    // For now, we'll use a simple keyword matching approach
    // In a production system, this would be replaced with:
    // 1. Vector embeddings and similarity search
    // 2. Or an LLM-based relevance function
    
    // Simple relevance scoring function based on keyword matching
    const getRelevanceScore = (fact: StudentFact, contextQuery: string): number => {
      // Lowercase everything for case-insensitive matching
      const lowerContext = contextQuery.toLowerCase();
      const lowerSubject = (fact.subject || '').toLowerCase();
      const lowerDetails = fact.details.toLowerCase();
      
      let score = 0;
      
      // Check if context terms appear in the subject or details
      const contextTerms = lowerContext.split(/\s+/).filter(term => term.length > 3);
      
      for (const term of contextTerms) {
        // Subject matches are more important
        if (lowerSubject.includes(term)) {
          score += 5;
        }
        
        // Details matches
        if (lowerDetails.includes(term)) {
          score += 2;
        }
        
        // Exact phrase matches
        if (lowerDetails.includes(lowerContext)) {
          score += 10;
        }
      }
      
      // Boost certain fact types that might be more relevant for contextual queries
      if (fact.fact_type === 'topic_interest' || fact.fact_type === 'preference') {
        score += 2;
      }
      
      // Consider confidence if available
      if (fact.confidence) {
        score += fact.confidence;
      }
      
      return score;
    };
    
    // Score and sort facts by relevance
    const scoredFacts = allFacts.map(fact => ({
      fact: fact as StudentFact,
      score: getRelevanceScore(fact as StudentFact, context)
    }));
    
    // Sort by score in descending order and take the top results
    const sortedFacts = scoredFacts
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    return sortedFacts.map(item => item.fact);
  } catch (error) {
    console.error("Error in getContextuallyRelevantFacts:", error);
    throw error;
  }
}

/**
 * Imports a batch of facts from an external source, handling duplicates and conflicts.
 * Useful for initial data setup or importing facts from other systems.
 */
export async function batchImportFacts({
  facts,
  userId,
  chatId = null,
  conflictStrategy = 'prefer_high_confidence',
  client = browserClient
}: {
  facts: Array<Omit<StudentFact, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
  userId: string;
  chatId?: string | null;
  conflictStrategy?: 'prefer_new' | 'prefer_high_confidence' | 'merge' | 'skip_duplicates';
  client?: SupabaseClient;
}): Promise<{
  imported: number;
  skipped: number;
  updated: number;
  errors: Array<{fact: Partial<StudentFact>; error: string}>;
}> {
  const result = {
    imported: 0,
    skipped: 0,
    updated: 0,
    errors: [] as Array<{fact: Partial<StudentFact>; error: string}>
  };

  // Process each fact sequentially to handle conflicts
  for (const fact of facts) {
    try {
      // Set chat_id if provided at batch level
      const factWithChatId = chatId ? {...fact, chat_id: chatId} : fact;
      
      // Skip facts with empty or invalid details
      if (!factWithChatId.details || factWithChatId.details.trim() === '') {
        result.skipped++;
        result.errors.push({
          fact: factWithChatId,
          error: 'Fact details missing or empty'
        });
        continue;
      }

      // For 'skip_duplicates' strategy, check if similar fact already exists
      if (conflictStrategy === 'skip_duplicates') {
        const { data: existingFacts } = await client
          .from("student_facts")
          .select("*")
          .eq("user_id", userId)
          .eq("active", true)
          .eq("fact_type", factWithChatId.fact_type)
          .eq("subject", factWithChatId.subject || '')
          .limit(1);

        if (existingFacts && existingFacts.length > 0) {
          result.skipped++;
          continue;
        }
        
        // No duplicate found, insert the fact
        const { error: insertError } = await client
          .from("student_facts")
          .insert({ ...factWithChatId, user_id: userId });

        if (insertError) {
          throw new Error(`Insert error: ${insertError.message}`);
        }
        
        result.imported++;
        continue;
      }
      
      // For other strategies, use our conflict detection and handling
      const conflictResult = await detectAndHandleFactConflicts({
        newFact: factWithChatId,
        userId,
        strategy: conflictStrategy as 'prefer_new' | 'prefer_high_confidence' | 'merge',
        client
      });
      
      // Update stats based on action taken
      switch (conflictResult.action) {
        case 'added':
          result.imported++;
          break;
        case 'updated':
        case 'merged':
          result.updated++;
          break;
        case 'ignored':
          result.skipped++;
          break;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error importing fact:', fact, errorMessage);
      result.errors.push({
        fact,
        error: errorMessage
      });
      result.skipped++;
    }
  }
  
  return result;
}

/**
 * Advanced search function for student facts with multiple filtering options.
 * Enables precise querying of the fact database for specific information.
 */
export async function searchStudentFacts({
  userId,
  searchParams,
  client = browserClient
}: {
  userId: string;
  searchParams: {
    query?: string;
    factTypes?: FactType[];
    subjects?: string[];
    fromDate?: Date | string;
    toDate?: Date | string;
    includeInactive?: boolean;
    minConfidence?: number;
    limit?: number;
    offset?: number;
    sortBy?: 'created_at' | 'updated_at' | 'confidence';
    sortOrder?: 'asc' | 'desc';
  };
  client?: SupabaseClient;
}): Promise<{
  facts: StudentFact[];
  count: number;
  hasMore: boolean;
}> {
  try {
    // Build the base query
    let query = client
      .from("student_facts")
      .select("*", { count: 'exact' })
      .eq("user_id", userId);
    
    // Apply active status filter
    if (!searchParams.includeInactive) {
      query = query.eq("active", true);
    }
    
    // Apply fact type filter
    if (searchParams.factTypes && searchParams.factTypes.length > 0) {
      query = query.in("fact_type", searchParams.factTypes);
    }
    
    // Apply subject filter
    if (searchParams.subjects && searchParams.subjects.length > 0) {
      query = query.in("subject", searchParams.subjects);
    }
    
    // Apply date range filters
    if (searchParams.fromDate) {
      const fromDate = typeof searchParams.fromDate === 'string' 
        ? searchParams.fromDate 
        : searchParams.fromDate.toISOString();
      query = query.gte("created_at", fromDate);
    }
    
    if (searchParams.toDate) {
      const toDate = typeof searchParams.toDate === 'string' 
        ? searchParams.toDate 
        : searchParams.toDate.toISOString();
      query = query.lte("created_at", toDate);
    }
    
    // Apply confidence threshold
    if (searchParams.minConfidence !== undefined) {
      query = query.gte("confidence", searchParams.minConfidence);
    }
    
    // Apply text search if query is provided
    if (searchParams.query && searchParams.query.trim() !== '') {
      // Split query into words for better matching
      const queryTerms = searchParams.query.trim().split(/\s+/).filter(term => term.length > 0);
      
      if (queryTerms.length > 0) {
        // For each term, check if it appears in details or subject
        for (const term of queryTerms) {
          query = query.or(`details.ilike.%${term}%,subject.ilike.%${term}%`);
        }
      }
    }
    
    // Apply sorting
    const sortBy = searchParams.sortBy || 'updated_at';
    const sortOrder = searchParams.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    
    // Apply pagination
    const limit = searchParams.limit || 20;
    const offset = searchParams.offset || 0;
    query = query.range(offset, offset + limit - 1);
    
    // Execute the query
    const { data, error, count } = await query;
    
    if (error) {
      console.error("Error searching facts:", error);
      throw new Error(`Search failed: ${error.message}`);
    }
    
    return {
      facts: (data || []) as StudentFact[],
      count: count || 0,
      hasMore: count ? offset + limit < count : false
    };
  } catch (error) {
    console.error("Error in searchStudentFacts:", error);
    throw error;
  }
}

/**
 * Identifies knowledge gaps by analyzing the distribution and coverage of facts.
 * Helps guide the conversation to elicit missing information.
 */
export async function identifyKnowledgeGaps({
  userId,
  client = browserClient
}: {
  userId: string;
  client?: SupabaseClient;
}): Promise<{
  missingFactTypes: FactType[];
  lowCoverageSubjects: string[];
  recommendedQuestions: string[];
}> {
  try {
    // Get all active facts for this user
    const { data: facts, error } = await client
      .from("student_facts")
      .select("*")
      .eq("user_id", userId)
      .eq("active", true);
    
    if (error) {
      console.error("Error fetching facts for gap analysis:", error);
      throw new Error(`Failed to fetch facts: ${error.message}`);
    }
    
    // Initialize result objects
    const allFactTypes: FactType[] = [
      'preference', 'struggle', 'goal', 'topic_interest', 'learning_style', 'other'
    ];
    const missingFactTypes: FactType[] = [];
    const subjectCounts: Record<string, number> = {};
    const factTypeCounts: Record<FactType, number> = {} as Record<FactType, number>;
    
    // Count facts by type and subject
    for (const fact of (facts || [])) {
      const typedFact = fact as StudentFact;
      
      // Count by fact type
      factTypeCounts[typedFact.fact_type] = (factTypeCounts[typedFact.fact_type] || 0) + 1;
      
      // Count by subject
      if (typedFact.subject) {
        subjectCounts[typedFact.subject] = (subjectCounts[typedFact.subject] || 0) + 1;
      }
    }
    
    // Find missing fact types
    for (const factType of allFactTypes) {
      if (!factTypeCounts[factType]) {
        missingFactTypes.push(factType);
      }
    }
    
    // Find subjects with low coverage (only one fact)
    const lowCoverageSubjects = Object.entries(subjectCounts)
      .filter(([_, count]) => count === 1)
      .map(([subject]) => subject);
    
    // Generate recommended questions to fill knowledge gaps
    const recommendedQuestions: string[] = [];
    
    // For missing fact types
    if (missingFactTypes.includes('preference')) {
      recommendedQuestions.push("What are your preferences for learning content?");
    }
    if (missingFactTypes.includes('struggle')) {
      recommendedQuestions.push("What areas or topics do you find most challenging?");
    }
    if (missingFactTypes.includes('goal')) {
      recommendedQuestions.push("What are your learning goals or what do you hope to achieve?");
    }
    if (missingFactTypes.includes('learning_style')) {
      recommendedQuestions.push("How do you prefer to learn? (e.g., visual, hands-on, reading)");
    }
    if (missingFactTypes.includes('topic_interest')) {
      recommendedQuestions.push("What topics or subjects are you most interested in?");
    }
    
    // For low coverage subjects
    for (const subject of lowCoverageSubjects) {
      recommendedQuestions.push(`Can you tell me more about your experience with ${subject}?`);
    }
    
    return {
      missingFactTypes,
      lowCoverageSubjects,
      recommendedQuestions
    };
  } catch (error) {
    console.error("Error identifying knowledge gaps:", error);
    throw error;
  }
}

/**
 * Updates the tags associated with a student fact.
 * Tags provide an additional dimension for organizing and retrieving facts.
 */
export async function updateFactTags({
  factId,
  tags,
  client = browserClient
}: {
  factId: string;
  tags: string[];
  client?: SupabaseClient;
}): Promise<StudentFact | null> {
  if (!factId) {
    throw new Error("Fact ID is required for tag updates.");
  }

  try {
    // First, validate that the fact exists
    const { data: fact, error: factError } = await client
      .from("student_facts")
      .select("*")
      .eq("id", factId)
      .single();

    if (factError || !fact) {
      console.error(`Error fetching fact ${factId}:`, factError);
      throw new Error(`Fact not found: ${factError?.message || 'No fact with this ID'}`);
    }

    // We'll store tags as a JSON array in a 'tags' column
    // This assumes your Supabase schema has a JSONB 'tags' column
    // If not, you'd need to alter the table to add this column
    const { data: updatedFact, error: updateError } = await client
      .from("student_facts")
      .update({ 
        tags: tags,
        updated_at: new Date().toISOString()
      })
      .eq("id", factId)
      .select()
      .single();

    if (updateError) {
      console.error(`Error updating tags for fact ${factId}:`, updateError);
      throw new Error(`Failed to update tags: ${updateError.message}`);
    }

    console.log(`Successfully updated tags for fact ${factId}`);
    return updatedFact as StudentFact || null;
  } catch (error) {
    console.error("Error in updateFactTags:", error);
    throw error;
  }
}

/**
 * Retrieves facts with specified tags.
 */
export async function getFactsByTags({
  userId,
  tags,
  matchAll = false,
  client = browserClient
}: {
  userId: string;
  tags: string[];
  matchAll?: boolean; // If true, facts must have all specified tags; if false, any matching tag
  client?: SupabaseClient;
}): Promise<StudentFact[]> {
  if (!tags || tags.length === 0) {
    throw new Error("At least one tag must be specified");
  }

  try {
    // This assumes your Supabase schema has a JSONB 'tags' column
    // containing an array of tag strings
    
    // Use Postgres JSONB operators to search within the tags array
    // If matchAll is true, we need to find facts that contain ALL the specified tags
    // If matchAll is false, we need to find facts that contain ANY of the specified tags
    
    let query = client
      .from("student_facts")
      .select("*")
      .eq("user_id", userId)
      .eq("active", true);
    
    if (matchAll) {
      // For matchAll=true, we use the contains operator (@>) which checks if the tags column
      // contains all elements of the provided array
      query = query.contains("tags", tags);
    } else {
      // For matchAll=false, we need to check if any of the specified tags exist in the tags column
      // We'll use the overlap operator (&&) which checks if the tags column has any elements
      // in common with the provided array
      query = query.overlaps("tags", tags);
    }
    
    const { data: facts, error } = await query;
    
    if (error) {
      console.error("Error fetching facts by tags:", error);
      throw new Error(`Failed to fetch facts by tags: ${error.message}`);
    }
    
    return (facts || []) as StudentFact[];
  } catch (error) {
    console.error("Error in getFactsByTags:", error);
    throw error;
  }
}

/**
 * Gets all unique tags used across a user's facts.
 */
export async function getAllFactTags({
  userId,
  client = browserClient
}: {
  userId: string;
  client?: SupabaseClient;
}): Promise<string[]> {
  try {
    // This query uses PostgreSQL's unnest function to flatten the tags arrays
    // from all facts, then selects distinct values
    const { data, error } = await client
      .from("student_facts")
      .select("tags")
      .eq("user_id", userId)
      .eq("active", true);
    
    if (error) {
      console.error("Error fetching all tags:", error);
      throw new Error(`Failed to fetch tags: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // Extract all tags from all facts and flatten into a single array
    const allTags = data
      .filter(row => row.tags && Array.isArray(row.tags))
      .flatMap(row => row.tags as string[]);
    
    // Remove duplicates
    return [...new Set(allTags)];
  } catch (error) {
    console.error("Error in getAllFactTags:", error);
    throw error;
  }
}

/**
 * Generates a concise natural language summary of a user's knowledge profile
 * based on their stored facts. Useful for quick overviews and reporting.
 */
export async function generateUserKnowledgeProfile({
  userId,
  maxFactsPerType = 3,
  client = browserClient
}: {
  userId: string;
  maxFactsPerType?: number;
  client?: SupabaseClient;
}): Promise<{
  summary: string;
  factTypeDistribution: Record<FactType, number>;
  totalFacts: number;
  recentSubjects: string[];
}> {
  try {
    // Get all facts for this user
    const { data: facts, error } = await client
      .from("student_facts")
      .select("*")
      .eq("user_id", userId)
      .eq("active", true)
      .order("updated_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching facts for knowledge profile:", error);
      throw new Error(`Failed to fetch facts: ${error.message}`);
    }
    
    if (!facts || facts.length === 0) {
      return {
        summary: "No knowledge profile available for this user yet.",
        factTypeDistribution: {} as Record<FactType, number>,
        totalFacts: 0,
        recentSubjects: []
      };
    }
    
    const typedFacts = facts as StudentFact[];
    
    // Count facts by type
    const factTypeDistribution: Record<FactType, number> = {} as Record<FactType, number>;
    const factsByType: Record<FactType, StudentFact[]> = {} as Record<FactType, StudentFact[]>;
    
    for (const fact of typedFacts) {
      // Count by type
      factTypeDistribution[fact.fact_type] = (factTypeDistribution[fact.fact_type] || 0) + 1;
      
      // Group by type
      if (!factsByType[fact.fact_type]) {
        factsByType[fact.fact_type] = [];
      }
      factsByType[fact.fact_type].push(fact);
    }
    
    // Get unique recent subjects (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentSubjects = [...new Set(
      typedFacts
        .filter(fact => 
          fact.subject && 
          new Date(fact.updated_at || fact.created_at || '') > thirtyDaysAgo
        )
        .map(fact => fact.subject as string)
    )];
    
    // Generate summary text
    const summaryParts: string[] = [];
    
    // Intro
    summaryParts.push(`This user has ${typedFacts.length} stored facts across ${Object.keys(factTypeDistribution).length} categories.`);
    
    // Summary of preferences if available
    if (factsByType.preference && factsByType.preference.length > 0) {
      const preferenceSummary = factsByType.preference
        .slice(0, maxFactsPerType)
        .map(fact => fact.details)
        .join("; ");
      
      summaryParts.push(`Preferences: ${preferenceSummary}.`);
    }
    
    // Summary of goals if available
    if (factsByType.goal && factsByType.goal.length > 0) {
      const goalSummary = factsByType.goal
        .slice(0, maxFactsPerType)
        .map(fact => fact.details)
        .join("; ");
      
      summaryParts.push(`Goals: ${goalSummary}.`);
    }
    
    // Summary of struggles if available
    if (factsByType.struggle && factsByType.struggle.length > 0) {
      const struggleSummary = factsByType.struggle
        .slice(0, maxFactsPerType)
        .map(fact => fact.details)
        .join("; ");
      
      summaryParts.push(`Struggles: ${struggleSummary}.`);
    }
    
    // Topics of interest
    if (factsByType.topic_interest && factsByType.topic_interest.length > 0) {
      const interestSummary = factsByType.topic_interest
        .slice(0, maxFactsPerType)
        .map(fact => fact.subject ? `${fact.subject} (${fact.details})` : fact.details)
        .join("; ");
      
      summaryParts.push(`Interests: ${interestSummary}.`);
    }
    
    // Learning style
    if (factsByType.learning_style && factsByType.learning_style.length > 0) {
      const styleSummary = factsByType.learning_style
        .slice(0, Math.min(2, factsByType.learning_style.length))
        .map(fact => fact.details)
        .join("; ");
      
      summaryParts.push(`Learning style: ${styleSummary}.`);
    }
    
    // Recent activity
    if (recentSubjects.length > 0) {
      summaryParts.push(`Recent subjects: ${recentSubjects.slice(0, 5).join(", ")}.`);
    }
    
    return {
      summary: summaryParts.join(" "),
      factTypeDistribution,
      totalFacts: typedFacts.length,
      recentSubjects
    };
  } catch (error) {
    console.error("Error generating knowledge profile:", error);
    throw error;
  }
}

/**
 * Exports all facts for a user in a portable JSON format.
 * Useful for backups, analytics, or transferring to other systems.
 */
export async function exportUserFacts({
  userId,
  includeInactive = false,
  client = browserClient
}: {
  userId: string;
  includeInactive?: boolean;
  client?: SupabaseClient;
}): Promise<{
  facts: StudentFact[];
  metadata: {
    exportDate: string;
    totalCount: number;
    factTypeCounts: Record<string, number>;
    version: string;
  };
}> {
  try {
    // Build query for all user facts
    let query = client
      .from("student_facts")
      .select("*")
      .eq("user_id", userId);
    
    // Apply active filter if specified
    if (!includeInactive) {
      query = query.eq("active", true);
    }
    
    const { data: facts, error } = await query;
    
    if (error) {
      console.error("Error exporting user facts:", error);
      throw new Error(`Failed to export facts: ${error.message}`);
    }
    
    if (!facts || facts.length === 0) {
      return {
        facts: [],
        metadata: {
          exportDate: new Date().toISOString(),
          totalCount: 0,
          factTypeCounts: {},
          version: '1.0'
        }
      };
    }
    
    const typedFacts = facts as StudentFact[];
    
    // Generate count metadata
    const factTypeCounts: Record<string, number> = {};
    for (const fact of typedFacts) {
      factTypeCounts[fact.fact_type] = (factTypeCounts[fact.fact_type] || 0) + 1;
    }
    
    return {
      facts: typedFacts,
      metadata: {
        exportDate: new Date().toISOString(),
        totalCount: typedFacts.length,
        factTypeCounts,
        version: '1.0'
      }
    };
  } catch (error) {
    console.error("Error in exportUserFacts:", error);
    throw error;
  }
}

/**
 * Imports facts from a JSON export, with validation and conflict handling.
 * Can be used to restore backups or transfer data between systems.
 */
export async function importUserFacts({
  userId,
  importData,
  conflictStrategy = 'skip_duplicates',
  client = browserClient
}: {
  userId: string;
  importData: {
    facts: StudentFact[];
    metadata?: {
      exportDate?: string;
      totalCount?: number;
      factTypeCounts?: Record<string, number>;
      version?: string;
    };
  };
  conflictStrategy?: 'prefer_new' | 'prefer_high_confidence' | 'merge' | 'skip_duplicates';
  client?: SupabaseClient;
}): Promise<{
  imported: number;
  skipped: number;
  updated: number;
  errors: Array<{fact: Partial<StudentFact>; error: string}>;
}> {
  try {
    // Validate import data structure
    if (!importData.facts || !Array.isArray(importData.facts)) {
      throw new Error('Invalid import data: facts array is required');
    }
    
    // Prepare facts for import by extracting relevant fields
    // This ensures we don't try to import IDs or timestamps from the source system
    const factsToImport = importData.facts.map(fact => ({
      fact_type: fact.fact_type,
      subject: fact.subject,
      details: fact.details,
      confidence: fact.confidence,
      source_message_id: fact.source_message_id,
      active: fact.active === undefined ? true : fact.active,
      tags: fact.tags || []
    }));
    
    // Use our batch import function to handle the import with conflict resolution
    return await batchImportFacts({
      facts: factsToImport,
      userId,
      conflictStrategy,
      client
    });
  } catch (error) {
    console.error("Error in importUserFacts:", error);
    throw error;
  }
}

/**
 * Analyzes fact patterns to derive higher-level insights about a student.
 * This function identifies trends, correlations, and potential areas for personalization.
 */
export async function analyzeStudentFactPatterns({
  userId,
  client = browserClient
}: {
  userId: string;
  client?: SupabaseClient;
}): Promise<{
  strengths: string[];
  challenges: string[];
  recommendedApproaches: string[];
  learningPatterns: string[];
  engagementSuggestions: string[];
}> {
  try {
    // Get all active facts for the user
    const { data: facts, error } = await client
      .from("student_facts")
      .select("*")
      .eq("user_id", userId)
      .eq("active", true);
    
    if (error) {
      console.error("Error fetching facts for pattern analysis:", error);
      throw new Error(`Failed to fetch facts: ${error.message}`);
    }
    
    if (!facts || facts.length === 0) {
      return {
        strengths: [],
        challenges: [],
        recommendedApproaches: [],
        learningPatterns: [],
        engagementSuggestions: []
      };
    }
    
    const typedFacts = facts as StudentFact[];
    
    // Extract facts by type for easier analysis
    const preferences = typedFacts.filter(fact => fact.fact_type === 'preference');
    const struggles = typedFacts.filter(fact => fact.fact_type === 'struggle');
    const goals = typedFacts.filter(fact => fact.fact_type === 'goal');
    const interests = typedFacts.filter(fact => fact.fact_type === 'topic_interest');
    const learningStyles = typedFacts.filter(fact => fact.fact_type === 'learning_style');
    
    // Identify strengths based on interests and positive preferences
    const strengths: string[] = [];
    
    // Look for explicit strengths mentioned in details
    for (const fact of typedFacts) {
      const lowerDetails = fact.details.toLowerCase();
      if (
        lowerDetails.includes('good at') || 
        lowerDetails.includes('strong in') || 
        lowerDetails.includes('strength') ||
        lowerDetails.includes('excel') ||
        lowerDetails.includes('skilled')
      ) {
        // Extract the subject if available, otherwise use the whole detail
        const strength = fact.subject ? `${fact.subject}` : fact.details;
        strengths.push(strength);
      }
    }
    
    // Add subject areas of high interest as potential strengths
    for (const interest of interests) {
      if (interest.subject && !strengths.includes(interest.subject)) {
        strengths.push(interest.subject);
      }
    }
    
    // Identify challenges based on struggles
    const challenges: string[] = [];
    
    // Add explicit struggles
    for (const struggle of struggles) {
      const challenge = struggle.subject 
        ? `${struggle.subject}: ${struggle.details}`
        : struggle.details;
      
      challenges.push(challenge);
    }
    
    // Look for implicit challenges in other fact types
    for (const fact of typedFacts) {
      if (fact.fact_type === 'struggle') continue; // Already processed
      
      const lowerDetails = fact.details.toLowerCase();
      if (
        lowerDetails.includes('difficult') || 
        lowerDetails.includes('challenge') || 
        lowerDetails.includes('struggle') ||
        lowerDetails.includes('hard time') ||
        lowerDetails.includes('trouble with')
      ) {
        const challenge = fact.subject 
          ? `${fact.subject}: ${fact.details}`
          : fact.details;
        
        if (!challenges.includes(challenge)) {
          challenges.push(challenge);
        }
      }
    }
    
    // Derive recommended learning approaches based on learning styles and preferences
    const recommendedApproaches: string[] = [];
    
    // First add explicit learning style preferences
    for (const style of learningStyles) {
      recommendedApproaches.push(style.details);
    }
    
    // Add preferences that suggest learning approaches
    for (const pref of preferences) {
      const lowerDetails = pref.details.toLowerCase();
      if (
        lowerDetails.includes('learn') ||
        lowerDetails.includes('study') ||
        lowerDetails.includes('practice') ||
        lowerDetails.includes('prefer when')
      ) {
        if (!recommendedApproaches.includes(pref.details)) {
          recommendedApproaches.push(pref.details);
        }
      }
    }
    
    // Identify overall learning patterns
    const learningPatterns: string[] = [];
    
    // Analyze fact distribution to identify patterns
    const factTypeCounts: Record<FactType, number> = {} as Record<FactType, number>;
    for (const fact of typedFacts) {
      factTypeCounts[fact.fact_type] = (factTypeCounts[fact.fact_type] || 0) + 1;
    }
    
    // Pattern: Goal-oriented learner
    if (factTypeCounts.goal && factTypeCounts.goal > 2) {
      learningPatterns.push('Goal-oriented learner who benefits from clear objectives');
    }
    
    // Pattern: Struggle-aware learner
    if (factTypeCounts.struggle && factTypeCounts.struggle > factTypeCounts.goal) {
      learningPatterns.push('Focuses more on challenges than goals - may benefit from strengths-based approach');
    }
    
    // Pattern: Interest-driven learner
    if (factTypeCounts.topic_interest && factTypeCounts.topic_interest > (factTypeCounts.goal || 0)) {
      learningPatterns.push('Interest-driven learner who engages best with topics of personal relevance');
    }
    
    // Engagement suggestions based on all gathered insights
    const engagementSuggestions: string[] = [];
    
    // Add goal-based suggestions
    if (goals.length > 0) {
      engagementSuggestions.push('Connect learning activities to their stated goals for increased motivation');
    }
    
    // Add interest-based suggestions
    if (interests.length > 0) {
      engagementSuggestions.push('Use topics of interest as examples or contexts for teaching new concepts');
    }
    
    // Add learning style suggestions
    if (learningStyles.length > 0) {
      engagementSuggestions.push('Accommodate their preferred learning style when presenting new information');
    }
    
    // Add challenge-based suggestions
    if (challenges.length > 0) {
      engagementSuggestions.push('Provide extra support for identified challenge areas while building on strengths');
    }
    
    return {
      strengths: strengths.slice(0, 5), // Limit to top 5
      challenges: challenges.slice(0, 5), // Limit to top 5
      recommendedApproaches,
      learningPatterns,
      engagementSuggestions
    };
  } catch (error) {
    console.error("Error in analyzeStudentFactPatterns:", error);
    throw error;
  }
} 