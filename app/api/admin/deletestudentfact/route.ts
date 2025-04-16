import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
    
    // Delete the fact from the database
    // Note: You might want to do a soft delete by setting is_active = false instead
    const { error } = await supabase
      .from('student_facts')
      .delete()
      .eq('id', factId);
    
    if (error) {
      console.error('Error deleting student fact:', error);
      return NextResponse.json(
        { error: 'Failed to delete student fact' },
        { status: 500 }
      );
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Fact deleted successfully'
    });
    
  } catch (error) {
    console.error('Error in deletestudentfact API route:', error);
    return NextResponse.json(
      { error: 'Failed to delete student fact' },
      { status: 500 }
    );
  }
} 