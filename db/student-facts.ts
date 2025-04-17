import { supabase } from "@/lib/supabase/browser-client"
import type { SupabaseClient } from "@supabase/supabase-js"

// Define the fact_type enum values that match the table CHECK constraint
export type FactType =
  | "preference"
  | "struggle"
  | "goal"
  | "topic_interest"
  | "learning_style"
  | "other"

// Define the student fact structure manually to avoid needing generated types
export interface StudentFact {
  id: number
  user_id: string
  chat_id?: string | null
  fact_type: FactType
  subject?: string | null
  details: string
  confidence?: number | null
  source_message_id?: string | null
  active: boolean
  created_at: string
  updated_at: string
}

// Define what's required for insertion (partial type for insert operations)
export type StudentFactInsert = Omit<
  StudentFact,
  "id" | "created_at" | "updated_at"
> & {
  id?: number // Optional on insert
  created_at?: string
  updated_at?: string
}

// Define what's allowed for updates
export type StudentFactUpdate = Partial<
  Omit<StudentFact, "id" | "user_id" | "created_at">
>

/**
 * Get a specific student fact by its ID
 */
export const getFactById = async (
  factId: number,
  client = supabase
): Promise<StudentFact> => {
  const { data: fact, error } = await client
    .from("student_facts")
    .select("*")
    .eq("id", factId)
    .single()

  if (error) {
    throw new Error(`Failed to get fact: ${error.message}`)
  }

  if (!fact) {
    throw new Error("Fact not found")
  }

  return fact as StudentFact
}

/**
 * Get all active facts for a student/user
 */
export const getFactsByUserId = async (
  userId: string,
  client = supabase
): Promise<StudentFact[]> => {
  const { data: facts, error } = await client
    .from("student_facts")
    .select("*")
    .eq("user_id", userId)
    .eq("active", true)
    .order("updated_at", { ascending: false })

  if (error) {
    throw new Error(`Failed to get facts: ${error.message}`)
  }

  return (facts || []) as StudentFact[]
}

/**
 * Get facts of a specific type for a student/user
 */
export const getFactsByType = async (
  userId: string,
  factType: FactType,
  client = supabase
): Promise<StudentFact[]> => {
  const { data: facts, error } = await client
    .from("student_facts")
    .select("*")
    .eq("user_id", userId)
    .eq("fact_type", factType)
    .eq("active", true)
    .order("updated_at", { ascending: false })

  if (error) {
    throw new Error(`Failed to get facts by type: ${error.message}`)
  }

  return (facts || []) as StudentFact[]
}

/**
 * Get facts for a specific subject for a student/user
 */
export const getFactsBySubject = async (
  userId: string,
  subject: string,
  client = supabase
): Promise<StudentFact[]> => {
  const { data: facts, error } = await client
    .from("student_facts")
    .select("*")
    .eq("user_id", userId)
    .eq("subject", subject)
    .eq("active", true)
    .order("updated_at", { ascending: false })

  if (error) {
    throw new Error(`Failed to get facts by subject: ${error.message}`)
  }

  return (facts || []) as StudentFact[]
}

/**
 * Get facts from a specific chat for a student/user
 */
export const getFactsByChatId = async (
  userId: string,
  chatId: string,
  client = supabase
): Promise<StudentFact[]> => {
  const { data: facts, error } = await client
    .from("student_facts")
    .select("*")
    .eq("user_id", userId)
    .eq("chat_id", chatId)
    .eq("active", true)
    .order("updated_at", { ascending: false })

  if (error) {
    throw new Error(`Failed to get facts by chat: ${error.message}`)
  }

  return (facts || []) as StudentFact[]
}

/**
 * Create a new student fact
 */
export const createFact = async (
  fact: StudentFactInsert,
  client = supabase
): Promise<StudentFact> => {
  const { data: createdFact, error } = await client
    .from("student_facts")
    .insert([fact])
    .select("*")
    .single()

  if (error) {
    throw new Error(`Failed to create fact: ${error.message}`)
  }

  if (!createdFact) {
    throw new Error("Failed to create fact: No data returned")
  }

  return createdFact as StudentFact
}

/**
 * Create multiple student facts in a batch
 */
export const createFacts = async (
  facts: StudentFactInsert[],
  client = supabase
): Promise<StudentFact[]> => {
  if (!facts.length) return []

  const { data: createdFacts, error } = await client
    .from("student_facts")
    .insert(facts)
    .select("*")

  if (error) {
    throw new Error(`Failed to create facts: ${error.message}`)
  }

  return (createdFacts || []) as StudentFact[]
}

/**
 * Update an existing student fact
 */
export const updateFact = async (
  factId: number,
  updates: StudentFactUpdate,
  client = supabase
): Promise<StudentFact> => {
  const { data: updatedFact, error } = await client
    .from("student_facts")
    .update(updates)
    .eq("id", factId)
    .select("*")
    .single()

  if (error) {
    throw new Error(`Failed to update fact: ${error.message}`)
  }

  if (!updatedFact) {
    throw new Error("Failed to update fact: No data returned")
  }

  return updatedFact as StudentFact
}

/**
 * Deactivate (soft delete) a fact by setting active=false
 */
export const deactivateFact = async (
  factId: number,
  client = supabase
): Promise<boolean> => {
  const { error } = await client
    .from("student_facts")
    .update({ active: false })
    .eq("id", factId)

  if (error) {
    throw new Error(`Failed to deactivate fact: ${error.message}`)
  }

  return true
}

/**
 * Hard delete a fact from the database
 */
export const deleteFact = async (
  factId: number,
  client = supabase
): Promise<boolean> => {
  const { error } = await client.from("student_facts").delete().eq("id", factId)

  if (error) {
    throw new Error(`Failed to delete fact: ${error.message}`)
  }

  return true
}

/**
 * Group facts by fact_type and subject, useful for summarizing facts
 */
export const getGroupedFacts = async (
  userId: string,
  client = supabase
): Promise<Record<string, StudentFact[]>> => {
  const facts = await getFactsByUserId(userId, client)

  return facts.reduce(
    (grouped, fact) => {
      // First group by fact_type
      const type = fact.fact_type
      if (!grouped[type]) {
        grouped[type] = []
      }
      grouped[type].push(fact)

      // Then if subject exists, group by fact_type:subject
      if (fact.subject) {
        const key = `${type}:${fact.subject}`
        if (!grouped[key]) {
          grouped[key] = []
        }
        grouped[key].push(fact)
      }

      return grouped
    },
    {} as Record<string, StudentFact[]>
  )
}
