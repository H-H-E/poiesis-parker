import { 
  getFactById, 
  getFactsByUserId, 
  createFact, 
  updateFact, 
  deactivateFact 
} from '@/db/student-facts';
import type { StudentFact, StudentFactInsert, StudentFactUpdate } from '@/db/student-facts';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/supabase/types';

// Mock data for tests
const mockFacts: StudentFact[] = [
  {
    id: 1,
    user_id: 'user123',
    fact_type: 'preference',
    details: 'Prefers visual learning',
    active: true,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  },
  {
    id: 2,
    user_id: 'user123',
    fact_type: 'struggle',
    details: 'Has difficulty with abstract concepts',
    active: true,
    created_at: '2023-01-02T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z'
  }
];

describe('Student Facts Database Functions', () => {
  // Create mock Supabase client
  const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis()
  } as unknown as SupabaseClient<Database, "public"> & {
    from: jest.Mock;
    select: jest.Mock;
    eq: jest.Mock;
    single: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFactById', () => {
    test('returns a fact when found', async () => {
      // Setup the mocked response
      mockSupabase.single = jest.fn().mockResolvedValue({
        data: mockFacts[0],
        error: null
      });

      // Call the function with the mock client
      const result = await getFactById(1, mockSupabase as any);

      // Verify the correct supabase methods were called
      expect(mockSupabase.from).toHaveBeenCalledWith('student_facts');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 1);
      expect(mockSupabase.single).toHaveBeenCalled();

      // Verify the result
      expect(result).toEqual(mockFacts[0]);
    });

    test('throws error when fact is not found', async () => {
      // Setup the mocked error response
      mockSupabase.single = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Fact not found', code: 'NOT_FOUND' }
      });

      // Verify the function throws an error
      await expect(getFactById(999, mockSupabase as any)).rejects.toThrow();
    });
  });

  describe('getFactsByUserId', () => {
    test('returns all facts for a user', async () => {
      // Setup the mocked response
      mockSupabase.eq = jest.fn().mockResolvedValue({
        data: mockFacts,
        error: null
      });

      // Call the function with the mock client
      const result = await getFactsByUserId('user123', mockSupabase as any);

      // Verify the correct supabase methods were called
      expect(mockSupabase.from).toHaveBeenCalledWith('student_facts');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user123');

      // Verify the result
      expect(result).toEqual(mockFacts);
    });

    test('returns empty array when no facts found', async () => {
      // Setup the mocked empty response
      mockSupabase.eq = jest.fn().mockResolvedValue({
        data: [],
        error: null
      });

      // Call the function
      const result = await getFactsByUserId('unknown-user', mockSupabase as any);

      // Verify the result is an empty array
      expect(result).toEqual([]);
    });

    test('throws error on database error', async () => {
      // Setup the mocked error response
      mockSupabase.eq = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: 'DB_ERROR' }
      });

      // Verify the function throws an error
      await expect(getFactsByUserId('user123', mockSupabase as any)).rejects.toThrow();
    });
  });

  describe('createFact', () => {
    test('successfully creates a new fact', async () => {
      // Setup the new fact data
      const newFact: StudentFactInsert = {
        user_id: 'user123',
        fact_type: 'goal',
        details: 'Wants to improve math skills',
        active: true
      };

      // Setup the mocked response (including the generated ID)
      const createdFact = {
        ...newFact,
        id: 3,
        created_at: '2023-01-03T00:00:00Z',
        updated_at: '2023-01-03T00:00:00Z'
      };

      mockSupabase.insert = jest.fn().mockResolvedValue({
        data: createdFact,
        error: null
      });

      // Call the function
      const result = await createFact(newFact, mockSupabase as any);

      // Verify the correct supabase methods were called
      expect(mockSupabase.from).toHaveBeenCalledWith('student_facts');
      expect(mockSupabase.insert).toHaveBeenCalledWith(newFact);
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.single).toHaveBeenCalled();

      // Verify the result
      expect(result).toEqual(createdFact);
    });

    test('throws error when insert fails', async () => {
      mockSupabase.insert = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Insert failed', code: 'INSERT_ERROR' }
      });

      const newFact: StudentFactInsert = {
        user_id: 'user123',
        fact_type: 'goal',
        details: 'Wants to improve math skills',
        active: true
      };

      await expect(createFact(newFact, mockSupabase as any)).rejects.toThrow();
    });
  });

  describe('updateFact', () => {
    test('successfully updates a fact', async () => {
      // Setup the update data
      const factId = 1;
      const updates: StudentFactUpdate = {
        details: 'Updated preference: Prefers audio-visual learning',
        active: true
      };

      // Setup the mocked response
      const updatedFact = {
        ...mockFacts[0],
        details: updates.details,
        updated_at: '2023-01-04T00:00:00Z'
      };

      mockSupabase.update = jest.fn().mockResolvedValue({
        data: updatedFact,
        error: null
      });

      // Call the function
      const result = await updateFact(factId, updates, mockSupabase as any);

      // Verify the correct supabase methods were called
      expect(mockSupabase.from).toHaveBeenCalledWith('student_facts');
      expect(mockSupabase.update).toHaveBeenCalledWith(updates);
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', factId);
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.single).toHaveBeenCalled();

      // Verify the result
      expect(result).toEqual(updatedFact);
    });

    test('throws error when fact not found or update fails', async () => {
      mockSupabase.update = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Fact not found', code: 'NOT_FOUND' }
      });

      await expect(updateFact(999, { details: 'Updated' }, mockSupabase as any)).rejects.toThrow();
    });
  });

  describe('deactivateFact', () => {
    test('successfully deactivates a fact', async () => {
      // Setup the mocked response
      mockSupabase.update = jest.fn().mockResolvedValue({
        data: { ...mockFacts[0], active: false },
        error: null
      });

      // Call the function
      const result = await deactivateFact(1, mockSupabase as any);

      // Verify the correct supabase methods were called
      expect(mockSupabase.from).toHaveBeenCalledWith('student_facts');
      expect(mockSupabase.update).toHaveBeenCalledWith({ active: false });
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 1);

      // Verify the result
      expect(result).toBe(true);
    });

    test('returns false when update fails', async () => {
      mockSupabase.update = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Update failed', code: 'UPDATE_ERROR' }
      });

      const result = await deactivateFact(999, mockSupabase as any);
      expect(result).toBe(false);
    });
  });
}); 