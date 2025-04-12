-- Create student_facts table for storing structured extracted facts
CREATE TABLE IF NOT EXISTS "student_facts" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "user_id" UUID NOT NULL, -- The student the fact relates to
  "chat_id" UUID, -- Optional: The chat where this fact was first discovered (can be null for manually added facts)
  "fact_type" TEXT NOT NULL CHECK (fact_type IN ('preference', 'struggle', 'goal', 'topic_interest', 'learning_style', 'other')), 
  "subject" TEXT, -- Can be null if not applicable
  "details" TEXT NOT NULL, -- The actual fact content
  "confidence" DECIMAL(3,2), -- Optional confidence score (0-1.00)
  "source_message_id" UUID, -- Optional: Link to the specific message this fact was extracted from
  "active" BOOLEAN DEFAULT TRUE, -- Whether this fact is still considered valid/active
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key references
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE,
  FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE SET NULL
);

-- Index for faster lookups by user_id (will be the main filter)
CREATE INDEX student_facts_user_id_idx ON "student_facts" ("user_id");

-- Index for fact_type + user_id combination (common query pattern)
CREATE INDEX student_facts_user_fact_type_idx ON "student_facts" ("user_id", "fact_type");

-- Add row-level security
ALTER TABLE "student_facts" ENABLE ROW LEVEL SECURITY;

-- Policies: Allow access to a user's own facts
CREATE POLICY "Users can view their own facts"
  ON "student_facts"
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own facts"
  ON "student_facts"
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own facts"
  ON "student_facts"
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own facts"
  ON "student_facts" 
  FOR DELETE
  USING (auth.uid() = user_id);

-- Ensure service roles have full access
CREATE POLICY "Service roles have full access to facts"
  ON "student_facts"
  USING (auth.role() = 'service_role');

-- Setup RLS trigger for updated_at
CREATE OR REPLACE FUNCTION update_student_facts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_student_facts_updated_at_trigger
BEFORE UPDATE ON "student_facts"
FOR EACH ROW
EXECUTE FUNCTION update_student_facts_updated_at(); 