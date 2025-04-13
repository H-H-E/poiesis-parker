import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchStudentFacts, type FactType } from '@/lib/memory/fact-management';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    // Get cookie store
    const cookieStore = cookies();
    
    // Create a server-side Supabase client with cookie store
    const supabase = createClient(cookieStore);
    
    // Check if user has admin privileges
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse the request body
    const requestData = await request.json();
    const { 
      userId,
      query = '',
      factTypes = [],
      includeInactive = false,
      limit = 20,
      offset = 0,
      fromDate,
      toDate,
      minConfidence,
      sortBy = 'updated_at',
      sortOrder = 'desc'
    } = requestData;
    
    // Validate required parameters
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: userId' },
        { status: 400 }
      );
    }
    
    // Get the facts using the fact-management library
    const result = await searchStudentFacts({
      userId,
      searchParams: {
        query,
        factTypes: factTypes as FactType[],
        includeInactive,
        limit,
        offset,
        fromDate,
        toDate,
        minConfidence,
        sortBy: sortBy as 'created_at' | 'updated_at' | 'confidence',
        sortOrder: sortOrder as 'asc' | 'desc'
      },
      client: supabase
    });
    
    return NextResponse.json({
      facts: result.facts,
      totalCount: result.count,
      hasMore: result.hasMore
    });
    
  } catch (error) {
    console.error('Error in getstudentmemory API route:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve student memory facts' },
      { status: 500 }
    );
  }
} 