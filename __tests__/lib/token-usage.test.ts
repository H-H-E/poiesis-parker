import { 
  countTokens, 
  logTokenUsage, 
  getUserTokenUsage, 
  getWorkspaceTokenUsage,
  type TokenUsageData
} from '@/lib/token-usage';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from '@/supabase/types';

// Mock gpt-tokenizer
jest.mock('gpt-tokenizer', () => ({
  __esModule: true,
  encode: jest.fn((text: string) => text.split(''))
}));

describe('Token Usage Tests', () => {
  describe('countTokens', () => {
    test('counts tokens correctly for a string', () => {
      const text = 'Hello, this is a test.';
      expect(countTokens(text)).toBe(text.length);
    });

    test('returns 0 for empty string', () => {
      expect(countTokens('')).toBe(0);
    });
  });

  describe('logTokenUsage', () => {
    // Create a mock supabase client
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis()
    } as unknown as SupabaseClient<Database, "public"> & { 
      from: jest.Mock; 
      insert: jest.Mock;
    };

    beforeEach(() => {
      jest.clearAllMocks();
      mockSupabase.from = jest.fn().mockReturnThis();
      mockSupabase.insert = jest.fn().mockResolvedValue({ data: null, error: null });
    });

    test('successfully logs token usage', async () => {
      const tokenData: TokenUsageData = {
        userId: 'user123',
        chatId: 'chat123',
        modelId: 'gpt-4',
        inputTokens: 100,
        outputTokens: 50,
        workspaceId: 'workspace123'
      };

      const result = await logTokenUsage(mockSupabase as SupabaseClient<Database, "public">, tokenData);

      expect(mockSupabase.from).toHaveBeenCalledWith('token_usage');
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        user_id: 'user123',
        chat_id: 'chat123',
        model_id: 'gpt-4',
        input_tokens: 100,
        output_tokens: 50,
        total_tokens: 150, // sum of input and output
        workspace_id: 'workspace123'
      });
      expect(result).toEqual({ success: true, error: null });
    });

    test('handles error when insert fails', async () => {
      const mockError = new Error('Database error');
      mockSupabase.insert = jest.fn().mockResolvedValue({ data: null, error: mockError });

      const tokenData: TokenUsageData = {
        userId: 'user123',
        modelId: 'gpt-4',
        inputTokens: 100,
        outputTokens: 50
      };

      const result = await logTokenUsage(mockSupabase as SupabaseClient<Database, "public">, tokenData);
      
      expect(result).toEqual({ success: false, error: mockError });
    });

    test('handles exceptions', async () => {
      mockSupabase.insert = jest.fn().mockRejectedValue(new Error('Network error'));

      const tokenData: TokenUsageData = {
        userId: 'user123',
        modelId: 'gpt-4',
        inputTokens: 100,
        outputTokens: 50
      };

      const result = await logTokenUsage(mockSupabase as SupabaseClient<Database, "public">, tokenData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
    });
  });

  describe('getUserTokenUsage', () => {
    // Create a mock supabase client with more complete query chain
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis()
    } as unknown as SupabaseClient<Database, "public"> & {
      from: jest.Mock;
      select: jest.Mock;
      eq: jest.Mock;
      gte: jest.Mock;
      lte: jest.Mock;
    };

    const mockUsageRecords: Tables<"token_usage">[] = [
      {
        id: 1,
        created_at: '2023-01-01T00:00:00Z',
        user_id: 'user123',
        chat_id: 'chat1',
        model_id: 'gpt-4',
        input_tokens: 100,
        output_tokens: 50,
        total_tokens: 150,
        workspace_id: 'workspace1'
      },
      {
        id: 2,
        created_at: '2023-01-02T00:00:00Z',
        user_id: 'user123',
        chat_id: 'chat2',
        model_id: 'gpt-4',
        input_tokens: 200,
        output_tokens: 100,
        total_tokens: 300,
        workspace_id: 'workspace1'
      }
    ];

    beforeEach(() => {
      jest.clearAllMocks();
      mockSupabase.from = jest.fn().mockReturnThis();
      mockSupabase.select = jest.fn().mockReturnThis();
      mockSupabase.eq = jest.fn().mockReturnThis();
      mockSupabase.gte = jest.fn().mockReturnThis();
      mockSupabase.lte = jest.fn().mockReturnThis();
    });

    test('returns user token usage with correct totals', async () => {
      const mockNestedFunctions = {
        lte: jest.fn().mockResolvedValue({ data: mockUsageRecords, error: null })
      };
      const mockDateRange = {
        gte: jest.fn().mockReturnValue(mockNestedFunctions)
      };
      const mockUserEq = {
        gte: jest.fn().mockReturnValue(mockDateRange)
      };
      
      mockSupabase.select = jest.fn().mockReturnThis();
      mockSupabase.eq = jest.fn().mockReturnThis();
      mockSupabase.gte = jest.fn().mockReturnThis();
      mockSupabase.lte = jest.fn().mockResolvedValue({ data: mockUsageRecords, error: null });

      const result = await getUserTokenUsage(
        mockSupabase as SupabaseClient<Database, "public">, 
        'user123', 
        new Date('2023-01-01'), 
        new Date('2023-01-31')
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('token_usage');
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.data) {
        expect(result.data.records).toEqual(mockUsageRecords);
        expect(result.data.totals).toEqual({
          inputTokens: 300,  // 100 + 200
          outputTokens: 150, // 50 + 100
          totalTokens: 450   // 150 + 300
        });
      }
    });

    test('handles database error', async () => {
      const mockError = new Error('Database error');
      mockSupabase.eq = jest.fn().mockResolvedValue({ data: null, error: mockError });

      const result = await getUserTokenUsage(mockSupabase as SupabaseClient<Database, "public">, 'user123');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe(mockError);
      expect(result.data).toBeNull();
    });

    test('returns empty results when no records found', async () => {
      mockSupabase.eq = jest.fn().mockResolvedValue({ data: null, error: null });

      const result = await getUserTokenUsage(mockSupabase as SupabaseClient<Database, "public">, 'user123');
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        records: [],
        totals: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
      });
    });
  });

  describe('getWorkspaceTokenUsage', () => {
    // Create a mock supabase client with more complete query chain
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis()
    } as unknown as SupabaseClient<Database, "public"> & {
      from: jest.Mock;
      select: jest.Mock;
      eq: jest.Mock;
      gte: jest.Mock;
      lte: jest.Mock;
    };

    const mockUsageRecords: Partial<Tables<"token_usage">>[] = [
      {
        id: 1,
        created_at: '2023-01-01T00:00:00Z',
        user_id: 'user1',
        chat_id: 'chat1',
        model_id: 'gpt-4',
        input_tokens: 100,
        output_tokens: 50,
        total_tokens: 150,
        workspace_id: 'workspace123'
      },
      {
        id: 2,
        created_at: '2023-01-02T00:00:00Z',
        user_id: 'user2',
        chat_id: 'chat2',
        model_id: 'gpt-4',
        input_tokens: 200,
        output_tokens: 100,
        total_tokens: 300,
        workspace_id: 'workspace123'
      },
      {
        id: 3,
        created_at: '2023-01-03T00:00:00Z',
        user_id: 'user1',
        chat_id: 'chat3',
        model_id: 'gpt-4',
        input_tokens: 150,
        output_tokens: 75,
        total_tokens: 225,
        workspace_id: 'workspace123'
      }
    ];

    beforeEach(() => {
      jest.clearAllMocks();
      mockSupabase.from = jest.fn().mockReturnThis();
      mockSupabase.select = jest.fn().mockReturnThis();
      mockSupabase.eq = jest.fn().mockReturnThis();
      mockSupabase.gte = jest.fn().mockReturnThis();
      mockSupabase.lte = jest.fn().mockReturnThis();
    });

    test('returns workspace token usage with correct totals and user grouping', async () => {
      const mockNestedFunctions = {
        lte: jest.fn().mockResolvedValue({ data: mockUsageRecords, error: null })
      };
      const mockDateRange = {
        gte: jest.fn().mockReturnValue(mockNestedFunctions)
      };
      const mockWorkspaceEq = {
        gte: jest.fn().mockReturnValue(mockDateRange)
      };
      
      mockSupabase.select = jest.fn().mockReturnThis();
      mockSupabase.eq = jest.fn().mockReturnThis();
      mockSupabase.gte = jest.fn().mockReturnThis();
      mockSupabase.lte = jest.fn().mockResolvedValue({ data: mockUsageRecords, error: null });

      const result = await getWorkspaceTokenUsage(
        mockSupabase as SupabaseClient<Database, "public">, 
        'workspace123', 
        new Date('2023-01-01'), 
        new Date('2023-01-31')
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('token_usage');
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.data) {
        expect(result.data.records).toEqual(mockUsageRecords);
        expect(result.data.totals).toEqual({
          inputTokens: 450,  // 100 + 200 + 150
          outputTokens: 225, // 50 + 100 + 75
          totalTokens: 675   // 150 + 300 + 225
        });
        expect(result.data.userUsage).toEqual({
          'user1': {
            inputTokens: 250,  // 100 + 150
            outputTokens: 125, // 50 + 75
            totalTokens: 375   // 150 + 225
          },
          'user2': {
            inputTokens: 200,
            outputTokens: 100,
            totalTokens: 300
          }
        });
      }
    });

    test('handles database error', async () => {
      const mockError = new Error('Database error');
      mockSupabase.eq = jest.fn().mockResolvedValue({ data: null, error: mockError });

      const result = await getWorkspaceTokenUsage(mockSupabase as SupabaseClient<Database, "public">, 'workspace123');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe(mockError);
      expect(result.data).toBeNull();
    });

    test('returns empty results when no records found', async () => {
      mockSupabase.eq = jest.fn().mockResolvedValue({ data: null, error: null });

      const result = await getWorkspaceTokenUsage(mockSupabase as SupabaseClient<Database, "public">, 'workspace123');
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        records: [],
        userUsage: {},
        totals: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
      });
    });
  });
}); 