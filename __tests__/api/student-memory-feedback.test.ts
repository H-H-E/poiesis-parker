import { NextRequest } from 'next/server';
import { POST } from '@/app/api/student/memory/feedback/route';

// Mock Supabase auth
jest.mock('@/lib/supabase/server-client', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null
      })
    },
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    rpc: jest.fn().mockReturnThis()
  }
}));

describe('Student Memory Feedback API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper function to create a mock request
  const createMockRequest = (body: any) => {
    return new NextRequest('http://localhost/api/student/memory/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
  };

  test('handles valid feedback submission', async () => {
    // Setup the request body
    const requestBody = {
      factId: 123,
      feedbackType: 'confirm', // 'confirm' | 'reject' | 'partial'
      comment: 'This is accurate'
    };

    // Mock supabase responses for this test
    const { supabase } = require('@/lib/supabase/server-client');
    supabase.insert.mockResolvedValue({ data: { id: 'feedback123' }, error: null });
    supabase.rpc.mockResolvedValue({ data: null, error: null });

    // Make the API call
    const response = await POST(createMockRequest(requestBody));
    const responseData = await response.json();

    // Verify the response
    expect(response.status).toBe(200);
    expect(responseData).toEqual({ success: true });

    // Verify Supabase calls
    expect(supabase.auth.getUser).toHaveBeenCalled();
    expect(supabase.from).toHaveBeenCalledWith('student_fact_feedback');
    expect(supabase.insert).toHaveBeenCalledWith({
      user_id: 'user123',
      fact_id: 123,
      feedback_type: 'confirm',
      comment: 'This is accurate'
    });

    // Verify RPC call to update confidence
    expect(supabase.rpc).toHaveBeenCalledWith('update_fact_confidence_from_feedback', {
      p_fact_id: 123,
      p_feedback_type: 'confirm'
    });
  });

  test('returns 400 for missing required fields', async () => {
    // Missing factId
    const invalidRequest = {
      feedbackType: 'confirm',
      comment: 'This is accurate'
    };

    const response = await POST(createMockRequest(invalidRequest));
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData).toHaveProperty('error');
    expect(responseData.error).toMatch(/factId is required/i);
  });

  test('returns 400 for invalid feedback type', async () => {
    // Invalid feedbackType
    const invalidRequest = {
      factId: 123,
      feedbackType: 'invalid-type',
      comment: 'This is accurate'
    };

    const response = await POST(createMockRequest(invalidRequest));
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData).toHaveProperty('error');
    expect(responseData.error).toMatch(/feedbackType must be/i);
  });

  test('returns 401 when user is not authenticated', async () => {
    // Mock unauthenticated user
    const { supabase } = require('@/lib/supabase/server-client');
    supabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Not authenticated' }
    });

    const response = await POST(createMockRequest({
      factId: 123,
      feedbackType: 'confirm',
      comment: 'This is accurate'
    }));
    
    expect(response.status).toBe(401);
    const responseData = await response.json();
    expect(responseData).toHaveProperty('error');
    expect(responseData.error).toMatch(/unauthorized/i);
  });

  test('handles database error gracefully', async () => {
    const { supabase } = require('@/lib/supabase/server-client');
    supabase.insert.mockResolvedValue({ 
      data: null, 
      error: { message: 'Database error' } 
    });

    const response = await POST(createMockRequest({
      factId: 123,
      feedbackType: 'confirm',
      comment: 'This is accurate'
    }));
    
    expect(response.status).toBe(500);
    const responseData = await response.json();
    expect(responseData).toHaveProperty('error');
    expect(responseData.error).toMatch(/error submitting feedback/i);
  });
}); 