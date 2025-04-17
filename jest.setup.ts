import '@testing-library/jest-dom';

// Mock Supabase JS client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockResolvedValue({ data: [], error: null }),
    insert: jest.fn().mockResolvedValue({ data: [], error: null }),
    update: jest.fn().mockResolvedValue({ data: [], error: null }),
    delete: jest.fn().mockResolvedValue({ data: [], error: null }),
    rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithPassword: jest.fn().mockResolvedValue({ data: { session: null }, error: null })
    }
  }))
}));

// Mock Supabase auth-helpers and SSR
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createServerSupabaseClient: jest.fn(),
  createBrowserSupabaseClient: jest.fn()
}));
jest.mock('@supabase/ssr', () => ({ createMiddlewareSupabaseClient: jest.fn() }));

// Mock OpenAI
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: jest.fn() } },
    embeddings: { create: jest.fn() }
  }))
}));

// Mock Anthropic
jest.mock('@anthropic-ai/sdk', () => ({
  Anthropic: jest.fn().mockImplementation(() => ({
    completions: { create: jest.fn() }
  }))
}));

// Mock Google GenAI
jest.mock('@google/genai', () => ({
  TextServiceClient: jest.fn().mockImplementation(() => ({
    embedText: jest.fn(),
    generateText: jest.fn()
  }))
}));

// Silence console warnings/errors in tests
jest.spyOn(console, 'warn').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {}); 