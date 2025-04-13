import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFactsGroupedByTypeAndSubject } from '@/lib/memory/fact-management';
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
    const { userId } = requestData;
    
    // Validate required parameters
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: userId' },
        { status: 400 }
      );
    }
    
    // Get the grouped facts using the fact-management library
    const groupedFacts = await getFactsGroupedByTypeAndSubject({
      userId,
      client: supabase
    });
    
    return NextResponse.json({
      success: true,
      groupedFacts
    });
    
  } catch (error) {
    console.error('Error in getuserfacts API route:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve grouped user facts' },
      { status: 500 }
    );
  }
} 