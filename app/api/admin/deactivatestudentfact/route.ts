import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deactivateStudentFact } from '@/lib/memory/fact-management';
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
    const { factId } = requestData;
    
    // Validate required parameters
    if (!factId) {
      return NextResponse.json(
        { error: 'Missing required parameter: factId' },
        { status: 400 }
      );
    }
    
    // Deactivate the fact using the fact-management library
    const result = await deactivateStudentFact({
      factId,
      client: supabase
    });
    
    return NextResponse.json({
      success: true,
      fact: result
    });
    
  } catch (error) {
    console.error('Error in deactivatestudentfact API route:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate student fact' },
      { status: 500 }
    );
  }
} 