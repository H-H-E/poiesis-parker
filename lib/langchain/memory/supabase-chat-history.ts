import {
  BaseChatMessageHistory
} from "@langchain/core/chat_history";
import {
  AIMessage,
  BaseMessage,
  ChatMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage
} from "@langchain/core/messages";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createMessage,
  getMessagesByChatId,
  deleteMessagesIncludingAndAfter // Assuming we might want a way to prune history later
  // We might need a deleteMessagesByChatId or similar for a full clear
} from "@/db/messages"; // Adjust import path as needed
import type { TablesInsert, Tables } from "@/supabase/types"; // Import Tables

// Helper to map LangChain roles to Supabase roles and vice-versa if needed
// Assuming Supabase 'role' column uses strings like 'user', 'assistant', 'system', 'tool'
const mapRoleToSupabase = (role: string): string => {
  switch (role) {
    case "human":
      return "user";
    case "ai":
      return "assistant";
    case "system":
      return "system";
    case "tool":
      return "tool";
    // Add other mappings if necessary (e.g., generic ChatMessage)
    default:
      console.warn(`Unknown LangChain role: ${role}, storing as 'system'`);
      return "system"; // Or throw error / handle differently
  }
};

const mapSupabaseRoleToLangChain = (role: string): string => {
  switch (role) {
    case "user":
      return "human";
    case "assistant":
      return "ai";
    case "system":
      return "system";
    case "tool":
      return "tool";
    default:
      console.warn(`Unknown Supabase role: ${role}, mapping to 'system'`);
      return "system"; // Or handle differently
  }
};

// Helper to construct the correct LangChain message type
// Use the specific Supabase table type
const mapDbMessageToLangChainMessage = (msg: Tables<'messages'>): BaseMessage => {
  const lcRole = mapSupabaseRoleToLangChain(msg.role);
  switch (lcRole) {
    case "human":
      return new HumanMessage(msg.content);
    case "ai":
      return new AIMessage(msg.content /*, msg.additional_kwargs || {} */);
    case "system":
      return new SystemMessage(msg.content);
    case "tool": {
      // NOTE: Current Supabase schema (Tables<'messages'>) does not have tool_call_id.
      // Mapping to ChatMessage. To support ToolMessage correctly,
      // add a 'tool_call_id' column to the messages table and regenerate types.
      console.warn("Mapping DB 'tool' role to generic ChatMessage due to missing tool_call_id in schema.");
      return new ChatMessage(msg.content, "tool"); // Map to generic ChatMessage for now
      // const toolCallId = typeof msg.tool_call_id === 'string' ? msg.tool_call_id : undefined; // Use this if schema is updated
      // return new ToolMessage({content: msg.content, tool_call_id: toolCallId });
    }
    default:
      return new ChatMessage(msg.content, lcRole);
  }
};

export class SupabaseChatMessageHistory extends BaseChatMessageHistory {
  lc_namespace = ["langchain", "stores", "message", "supabase"];

  private chatId: string;
  private userId: string; // Needed for some db functions like deleteMessagesIncludingAndAfter
  private supabaseClient: SupabaseClient; // Allow passing client for flexibility

  constructor({
    chatId,
    userId,
    client
  }: {
    chatId: string;
    userId: string;
    client: SupabaseClient;
  }) {
    super();
    this.chatId = chatId;
    this.userId = userId;
    this.supabaseClient = client; // Use the passed client
  }

  async getMessages(): Promise<BaseMessage[]> {
    const dbMessages = await getMessagesByChatId(this.chatId);

    if (!dbMessages) {
        return [];
    }
    // Sort messages by sequence number before mapping
    dbMessages.sort((a, b) => a.sequence_number - b.sequence_number);

    return dbMessages.map(mapDbMessageToLangChainMessage);
  }

  async addMessage(message: BaseMessage): Promise<void> {
    // Fetch the latest sequence number for this chat_id to increment it.
    const { data: latestMessages, error: fetchError } = await this.supabaseClient
        .from('messages')
        .select('sequence_number')
        .eq('chat_id', this.chatId)
        .order('sequence_number', { ascending: false })
        .limit(1);

    if (fetchError) {
        console.error("Error fetching latest sequence number:", fetchError);
        // Decide how to handle: throw error, default to 0, etc.
        throw new Error("Could not determine sequence number for new message.");
    }

    const latestSequenceNumber = latestMessages?.[0]?.sequence_number ?? 0;

    const messageToStore: TablesInsert<"messages"> = {
      chat_id: this.chatId,
      user_id: this.userId,
      role: mapRoleToSupabase(message._getType()),
      content: typeof message.content === "string" ? message.content : JSON.stringify(message.content),
      sequence_number: latestSequenceNumber + 1, // Increment sequence number
      model: "unknown", // TODO: Populate with actual model used, perhaps from message.additional_kwargs?
      image_paths: [], // TODO: Populate if images are handled
      // --- Optional fields ---
      // assistant_id: // if used
      // tool_call_id: // Add if schema updated & message is ToolMessage
      // name: message.name // Add if needed
    };

    const { error: insertError } = await this.supabaseClient
        .from('messages')
        .insert([messageToStore]);

    if (insertError) {
        console.error("Error inserting message:", insertError);
        throw new Error(`Failed to store message: ${insertError.message}`);
    }
    // Original implementation used db/messages.ts functions directly.
    // Switched to using the passed SupabaseClient for consistency and explicitness.
    // If you prefer using the db/messages functions, ensure they accept/use the client.
    // await createMessage(messageToStore);
  }

  // Optional: Implement addMessages for potential bulk inserts if needed
  // async addMessages(messages: BaseMessage[]): Promise<void> {
  //   const messagesToStore = messages.map(message => {
  //     // ... mapping logic similar to addMessage ...
  //   });
  //   await createMessages(messagesToStore); // Assumes createMessages uses the correct client
  // }

  // Optional: Implement clear - requires a way to delete all messages for the chat_id
  async clear(): Promise<void> {
    console.warn(
      `clear() method called for SupabaseChatMessageHistory for chat ${this.chatId}. This will delete all messages.`
    );
    // Requires a way to delete all messages by chat_id using the client
    const { error } = await this.supabaseClient
        .from('messages')
        .delete()
        .eq('chat_id', this.chatId);

    if (error) {
        console.error("Error clearing messages:", error);
        throw new Error(`Failed to clear history: ${error.message}`);
    }
  }

  // Example pruning method (not part of interface)
  async pruneHistory(keepSequenceNumberAfter: number): Promise<void> {
    console.log(`Pruning history for chat ${this.chatId}, keeping messages after sequence number ${keepSequenceNumberAfter}`);
    // Use the existing RPC function via the client
    const { error } = await this.supabaseClient.rpc("delete_messages_including_and_after", {
        p_user_id: this.userId,
        p_chat_id: this.chatId,
        p_sequence_number: keepSequenceNumberAfter + 1
      })

    if (error) {
        console.error("Error pruning history:", error);
        throw new Error(`Failed to prune history: ${error.message}`);
    }
  }

  // --- Implement required methods from BaseChatMessageHistory ---
  async addUserMessage(message: string): Promise<void> {
      await this.addMessage(new HumanMessage(message));
  }

  async addAIChatMessage(message: string): Promise<void> {
      await this.addMessage(new AIMessage(message));
  }

  // --- Optional methods ---
  // async addMessages(messages: BaseMessage[]): Promise<void> { ... }
  // async clear(): Promise<void> { ... }
  // async pruneHistory(keepSequenceNumberAfter: number): Promise<void> { ... }
} 