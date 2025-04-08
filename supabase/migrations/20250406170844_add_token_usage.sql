-- Create token_usage table to track token consumption
CREATE TABLE IF NOT EXISTS "token_usage" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
  "chat_id" UUID REFERENCES "chats"("id") ON DELETE CASCADE,
  "model_id" TEXT NOT NULL,
  "input_tokens" INTEGER NOT NULL DEFAULT 0,
  "output_tokens" INTEGER NOT NULL DEFAULT 0, 
  "total_tokens" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  "workspace_id" UUID REFERENCES "workspaces"("id") ON DELETE CASCADE
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS "token_usage_user_id_idx" ON "token_usage"("user_id");
CREATE INDEX IF NOT EXISTS "token_usage_chat_id_idx" ON "token_usage"("chat_id");
CREATE INDEX IF NOT EXISTS "token_usage_created_at_idx" ON "token_usage"("created_at");
CREATE INDEX IF NOT EXISTS "token_usage_workspace_id_idx" ON "token_usage"("workspace_id");

-- Add RLS policies
ALTER TABLE "token_usage" ENABLE ROW LEVEL SECURITY;

-- Admin can see all token usage
CREATE POLICY "Admin can see all token usage" ON "token_usage"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "profiles"
      WHERE "profiles"."id" = auth.uid() AND "profiles"."role" = 'admin'
    )
  );

-- Users can see their own token usage
CREATE POLICY "Users can see their own token usage" ON "token_usage"
  FOR SELECT
  TO authenticated
  USING ("user_id" = auth.uid());

-- Admin can create token usage records for any user
CREATE POLICY "Admin can create token usage records" ON "token_usage"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "profiles" 
      WHERE "profiles"."id" = auth.uid() AND "profiles"."role" = 'admin'
    )
  );

-- Users can create token usage records for themselves
CREATE POLICY "Users can create their own token usage records" ON "token_usage"
  FOR INSERT
  TO authenticated
  WITH CHECK ("user_id" = auth.uid());

-- Add a field to workspaces table for admin prompts
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "admin_prompt" TEXT NULL; 