import { buildBasePrompt, buildFinalMessages, buildGoogleGeminiFinalMessages } from '@/lib/build-prompt';
import type { Tables } from '@/supabase/types';
import type { ChatPayload, ChatSettings, MessageImage, ChatMessage } from '@/types';

// Mock the gpt-tokenizer encode function
jest.mock('gpt-tokenizer', () => ({
  __esModule: true,
  // Return an array of characters so .length gives token count
  encode: jest.fn((text: string) => text.split(''))
}));

describe('Build Prompt Tests', () => {
  describe('buildBasePrompt', () => {
    const basePrompt = "User initial prompt.";
    const profileContext = "User profile context.";
    const workspaceInstructions = "Workspace instructions.";
    const adminPrompt = "Admin instructions.";
    const studentPrompt = "Student instructions.";
    const mockAssistant: Tables<"assistants"> = {
      id: 'asst_123',
      name: 'Test Assistant',
      description: '',
      model: 'gpt-4',
      prompt: '',
      created_at: '',
      updated_at: '',
      folder_id: null,
      image_path: '',
      include_profile_context: true,
      include_workspace_instructions: true,
      context_length: 4096,
      embeddings_provider: 'openai',
      sharing: 'private',
      temperature: 0.5,
      user_id: 'user_123'
    };

    test('should include all parts when provided', () => {
      const result = buildBasePrompt(
        basePrompt,
        profileContext,
        workspaceInstructions,
        adminPrompt,
        mockAssistant,
        studentPrompt
      );

      expect(result).toContain('<INJECT ROLE>\nYou are not an AI. You are Test Assistant.\n</INJECT ROLE>');
      expect(result).toMatch(/Today is .+\./); // Check for date
      expect(result).toContain(`Admin Instructions (Always Follow These First):\n${adminPrompt}`);
      expect(result).toContain(`Student Instructions (Apply to all student interactions):\n${studentPrompt}`);
      expect(result).toContain(`User Info:\n${profileContext}`);
      expect(result).toContain(`System Instructions:\n${workspaceInstructions}`);
      expect(result).toContain(`User Instructions:\n${basePrompt}`);
    });

    test('should exclude parts when not provided', () => {
      const result = buildBasePrompt(basePrompt, '', '', null, null, null);
      expect(result).not.toContain('<INJECT ROLE>');
      expect(result).not.toContain('Admin Instructions');
      expect(result).not.toContain('Student Instructions');
      expect(result).not.toContain('User Info:');
      expect(result).not.toContain('System Instructions:');
      expect(result).toContain(`User Instructions:\n${basePrompt}`);
    });

    test('should prioritize admin prompt over student/workspace/user prompts', () => {
      // The test above ('should include all parts') implicitly checks order,
      // as thetoContain checks verify the structure includes the headers in the correct sequence.
      // A more explicit test could check the string starts with the INJECT ROLE, followed by date, admin, student etc.
       const result = buildBasePrompt(
        basePrompt,
        profileContext,
        workspaceInstructions,
        adminPrompt,
        mockAssistant,
        studentPrompt
      );
      expect(result.indexOf('Admin Instructions')).toBeLessThan(result.indexOf('Student Instructions'));
      expect(result.indexOf('Student Instructions')).toBeLessThan(result.indexOf('User Info'));
      expect(result.indexOf('User Info')).toBeLessThan(result.indexOf('System Instructions'));
      expect(result.indexOf('System Instructions')).toBeLessThan(result.indexOf('User Instructions'));

    });

    // Add more tests for edge cases: empty strings, different combinations etc.

  });

  describe('buildFinalMessages', () => {
    const mockProfile: Tables<"profiles"> = {
      id: 'user_123',
      user_id: 'user_123',
      anthropic_api_key: null,
      azure_openai_35_turbo_id: null,
      azure_openai_45_turbo_id: null,
      azure_openai_45_vision_id: null,
      azure_openai_api_key: null,
      azure_openai_endpoint: null,
      azure_openai_embeddings_id: null,
      google_gemini_api_key: null,
      has_onboarded: true,
      image_url: '',
      image_path: '',
      is_admin: false,
      mistral_api_key: null,
      openai_api_key: 'sk-abc',
      openai_organization_id: null,
      perplexity_api_key: null,
      permitted_models: [],
      profile_context: 'User test profile context.',
      use_azure_openai: false,
      username: 'testuser',
      display_name: 'Test User',
      bio: '',
      openrouter_api_key: null,
      groq_api_key: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const mockChatSettings: ChatSettings = {
      model: 'gpt-4',
      prompt: 'Test base prompt.',
      temperature: 0.7,
      contextLength: 400, // Keep small for easier testing
      includeProfileContext: true,
      includeWorkspaceInstructions: true,
      embeddingsProvider: 'openai'
    };

    const mockWorkspaceInstructions = "Test workspace instructions.";

    const createMockMessage = (id: string, content: string, role: 'user' | 'assistant', fileItems: string[] = [], image_paths: string[] = []): ChatMessage => ({
      message: {
        id: `msg_${id}`,
        user_id: mockProfile.id,
        chat_id: 'chat_123',
        sequence_number: Number.parseInt(id, 10),
        content,
        role,
        model: mockChatSettings.model,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        assistant_id: null,
        image_paths
      },
      fileItems
    });

    test('should build messages without truncation', async () => {
      const payload: ChatPayload = {
        chatSettings: mockChatSettings,
        workspaceInstructions: mockWorkspaceInstructions,
        chatMessages: [
          createMockMessage('1', 'Hello', 'user'),
          createMockMessage('2', 'Hi there', 'assistant')
        ],
        assistant: null,
        messageFileItems: [],
        chatFileItems: [],
        adminPrompt: undefined,
        studentSystemPrompt: undefined
      };

      const { finalMessages, usedTokens } = await buildFinalMessages(payload, mockProfile, []);

      expect(finalMessages).toHaveLength(3); // system + user + assistant
      expect(finalMessages[0].role).toBe('system');
      expect(finalMessages[0].content).toContain(mockChatSettings.prompt);
      expect(finalMessages[0].content).toContain(mockProfile.profile_context);
      expect(finalMessages[0].content).toContain(mockWorkspaceInstructions);
      expect(finalMessages[1].role).toBe('user');
      expect(finalMessages[1].content).toBe('Hello');
      expect(finalMessages[2].role).toBe('assistant');
      expect(finalMessages[2].content).toBe('Hi there');

      // Used tokens = prompt tokens (length of prompt string) + user + assistant tokens
      const expectedTokens = mockChatSettings.prompt.length + 'Hello'.length + 'Hi there'.length;
      expect(usedTokens).toBe(expectedTokens);
    });

    test('should truncate older messages based on context length', async () => {
      const longMessageContent = 'a'.repeat(150);
      const payload: ChatPayload = {
        chatSettings: { ...mockChatSettings, contextLength: 200 }, // Reduced context to force truncation
        workspaceInstructions: '', // Simplify for token counting
        chatMessages: [
          createMockMessage('1', 'First message - should be truncated', 'user'),
          createMockMessage('2', longMessageContent, 'assistant'),
          createMockMessage('3', 'Recent message - should be included', 'user')
        ],
        assistant: null,
        messageFileItems: [],
        chatFileItems: [],
        adminPrompt: undefined,
        studentSystemPrompt: undefined
      };

      // Calculate system prompt size (excluding workspace instructions)
      const systemPrompt = buildBasePrompt(mockChatSettings.prompt, mockProfile.profile_context, '', null, null, null);
      const systemTokens = systemPrompt.length;
      const message3Tokens = 'Recent message - should be included'.length;
      const message2Tokens = longMessageContent.length;
      // Remaining after system prompt: 200 - systemTokens
      // After msg3: 200 - systemTokens - message3Tokens
      // Since msg2Tokens > remaining after msg3, msg1 should be truncated.

      const { finalMessages, usedTokens } = await buildFinalMessages(payload, mockProfile, []);

      expect(finalMessages).toHaveLength(2); // system + user (context too low for msg2)
      expect(finalMessages[0].role).toBe('system');
      expect(finalMessages[1].role).toBe('user');
      expect(finalMessages[1].content).toBe('Recent message - should be included');

      // Used tokens = prompt tokens + included message tokens (only msg3 since context is too small)
      const expectedTokens = mockChatSettings.prompt.length + message3Tokens;
      expect(usedTokens).toBe(expectedTokens);
    });

    test('should exclude profile context and workspace instructions if flags are false', async () => {
      const payload: ChatPayload = {
        chatSettings: {
          ...mockChatSettings,
          includeProfileContext: false,
          includeWorkspaceInstructions: false
        },
        workspaceInstructions: mockWorkspaceInstructions,
        chatMessages: [createMockMessage('1', 'Hi', 'user')],
        assistant: null,
        messageFileItems: [],
        chatFileItems: [],
        adminPrompt: undefined,
        studentSystemPrompt: undefined
      };

      const { finalMessages } = await buildFinalMessages(payload, mockProfile, []);

      expect(finalMessages[0].role).toBe('system');
      expect(finalMessages[0].content).not.toContain(mockProfile.profile_context);
      expect(finalMessages[0].content).not.toContain(mockWorkspaceInstructions);
      expect(finalMessages[0].content).toContain(mockChatSettings.prompt);
    });

    test('should inject retrieval text for messageFileItems into the last message', async () => {
      const mockFileItem: Tables<"file_items"> = {
        id: 'file_item_1',
        content: 'Retrieved content from message file.',
        created_at: '', file_id: 'file_1', local_embedding: null, openai_embedding: null, updated_at: '', user_id: 'user_123',
        sharing: 'private',
        tokens: 10
      };
      const payload: ChatPayload = {
        chatSettings: mockChatSettings,
        workspaceInstructions: mockWorkspaceInstructions,
        chatMessages: [createMockMessage('1', 'User query about file', 'user')],
        assistant: null,
        messageFileItems: [mockFileItem],
        chatFileItems: [],
        adminPrompt: undefined,
        studentSystemPrompt: undefined
      };

      const { finalMessages } = await buildFinalMessages(payload, mockProfile, []);

      expect(finalMessages).toHaveLength(2); // system + user
      expect(finalMessages[1].role).toBe('user');
      expect(finalMessages[1].content).toContain('User query about file');
      expect(finalMessages[1].content).toContain('You may use the following sources');
      expect(finalMessages[1].content).toContain('<BEGIN SOURCE>\nRetrieved content from message file.\n</END SOURCE>');
    });

    test('should inject retrieval text for chatFileItems into the preceding assistant message', async () => {
      const mockFileItem: Tables<"file_items"> = {
        id: 'file_item_2',
        content: 'Retrieved content from chat file.',
        created_at: '', file_id: 'file_2', local_embedding: null, openai_embedding: null, updated_at: '', user_id: 'user_123',
        sharing: 'private',
        tokens: 10
      };
      const payload: ChatPayload = {
        chatSettings: mockChatSettings,
        workspaceInstructions: mockWorkspaceInstructions,
        chatMessages: [
          createMockMessage('1', 'Assistant response', 'assistant'),
          createMockMessage('2', 'User query referencing file', 'user', [mockFileItem.id]) // File attached to user msg
        ],
        assistant: null,
        messageFileItems: [],
        chatFileItems: [mockFileItem], // File exists in overall chat context
        adminPrompt: undefined,
        studentSystemPrompt: undefined
      };

      const { finalMessages } = await buildFinalMessages(payload, mockProfile, []);

      expect(finalMessages).toHaveLength(3); // system + assistant + user
      expect(finalMessages[1].role).toBe('assistant');
      // Check that retrieval text is added to the *assistant* message because the *user* message references it
      expect(finalMessages[1].content).toContain('Assistant response');
      expect(finalMessages[1].content).toContain('You may use the following sources');
      expect(finalMessages[1].content).toContain('<BEGIN SOURCE>\nRetrieved content from chat file.\n</END SOURCE>');
      expect(finalMessages[2].role).toBe('user');
      expect(finalMessages[2].content).toBe('User query referencing file');
    });

    test('should format messages with images', async () => {
      const dataUrlImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA\nAAAFAQAAAAClFBtVAAAAAmJLR0QA/4ePzL8AAAAJcEhZcwAAAEgAAABIAEbJaz4AAAAWSURBVAjXY2D4z/CfAUD/gUQGgFIA+m8D/dSGMl8AAAAASUVORK5CYII=';
      const imagePath = 'images/test.jpg';
      const imageBase64 = 'base64encodedstringforpath';
      const chatImages: MessageImage[] = [{ messageId: 'msg_1', path: imagePath, base64: imageBase64, url: '', file: null }];

      const payload: ChatPayload = {
        chatSettings: mockChatSettings,
        workspaceInstructions: mockWorkspaceInstructions,
        chatMessages: [
          createMockMessage('1', 'Look at this', 'user', [], [dataUrlImage, imagePath])
        ],
        assistant: null,
        messageFileItems: [],
        chatFileItems: [],
        adminPrompt: undefined,
        studentSystemPrompt: undefined
      };

      const { finalMessages } = await buildFinalMessages(payload, mockProfile, chatImages);

      expect(finalMessages).toHaveLength(2);
      expect(finalMessages[1].role).toBe('user');
      expect(Array.isArray(finalMessages[1].content)).toBe(true);
      // Define a more specific type for the content array structure
      type ImageContentPart = { type: 'text', text: string } | { type: 'image_url', image_url: { url: string } };
      const contentArray = finalMessages[1].content as ImageContentPart[];

      // Check text part
      const textPart = contentArray.find(part => part.type === 'text');
      expect(textPart).toBeDefined();
      if (textPart?.type === 'text') {
        expect(textPart.text).toBe('Look at this');
      }

      // Check image parts
      const imageParts = contentArray.filter(part => part.type === 'image_url');
      expect(imageParts).toHaveLength(2);
      const imageUrls = imageParts
        .map(part => (part.type === 'image_url' ? part.image_url.url : ''))
        .filter(Boolean);
      expect(imageUrls).toContain(dataUrlImage);
      expect(imageUrls).toContain(imageBase64);
    });

  });

  describe('buildGoogleGeminiFinalMessages', () => {
    // Create local mocks for Gemini tests
    const mockProfileGemini: Tables<"profiles"> = {
      id: 'user_123',
      user_id: 'user_123',
      anthropic_api_key: null,
      azure_openai_35_turbo_id: null,
      azure_openai_45_turbo_id: null,
      azure_openai_45_vision_id: null,
      azure_openai_api_key: null,
      azure_openai_endpoint: null,
      azure_openai_embeddings_id: null,
      google_gemini_api_key: null,
      has_onboarded: true,
      image_url: '',
      image_path: '',
      is_admin: false,
      mistral_api_key: null,
      openai_api_key: 'sk-abc',
      openai_organization_id: null,
      perplexity_api_key: null,
      permitted_models: [],
      profile_context: 'User test profile context.',
      use_azure_openai: false,
      username: 'testuser',
      display_name: 'Test User',
      bio: '',
      openrouter_api_key: null,
      groq_api_key: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const mockChatSettingsGemini: ChatSettings = {
      model: 'gpt-4',
      prompt: 'Hello Gemini',
      temperature: 0.7,
      contextLength: 400,
      includeProfileContext: true,
      includeWorkspaceInstructions: true,
      embeddingsProvider: 'openai'
    };
    const mockWorkspaceInstructionsGemini = 'Test workspace instructions.';

    // A standalone helper for Gemini messages
    const createMockMessageGemini = (id: string, content: string, role: 'user' | 'assistant'): ChatMessage => ({
      message: {
        chat_id: 'chat_123',
        assistant_id: null,
        content,
        created_at: '',
        id: `msg_${id}`,
        image_paths: [],
        model: mockChatSettingsGemini.model,
        role,
        sequence_number: Number.parseInt(id, 10),
        updated_at: '',
        user_id: mockProfileGemini.user_id
      },
      fileItems: []
    });

    test('basic scenario: includes system prompt and user message', async () => {
      const payload: ChatPayload = {
        chatSettings: mockChatSettingsGemini,
        workspaceInstructions: mockWorkspaceInstructionsGemini,
        chatMessages: [createMockMessageGemini('1', 'Hello Gemini', 'user')],
        assistant: null,
        messageFileItems: [],
        chatFileItems: [],
        adminPrompt: undefined,
        studentSystemPrompt: undefined
      };
      const { formattedMessages, usedTokens } = await buildGoogleGeminiFinalMessages(
        payload,
        mockProfileGemini,
        []
      );
      // System message is formatted as a user role with parts
      expect(formattedMessages[0].role).toBe('user');
      expect(formattedMessages[0].parts[0].text).toContain(mockChatSettingsGemini.prompt);
      // Actual user message
      expect(formattedMessages[1].role).toBe('user');
      expect(formattedMessages[1].parts[0].text).toBe('Hello Gemini');
      // Just like buildFinalMessages, it only counts prompt tokens, not full system message
      const expectedTokens = mockChatSettingsGemini.prompt.length + 'Hello Gemini'.length;
      expect(usedTokens).toBe(expectedTokens);
    });
  });
}); 