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
    const factData = await request.json();
    
    // Validate required parameters
    if (!factData.user_id) {
      return NextResponse.json(
        { error: 'Missing required parameter: user_id' },
        { status: 400 }
      );
    }
    
    if (!factData.content) {
      return NextResponse.json(
        { error: 'Missing required parameter: content' },
        { status: 400 }
      );
    }
    
    if (!factData.factType) {
      return NextResponse.json(
        { error: 'Missing required parameter: factType' },
        { status: 400 }
      );
    }
    
    // Prepare data for insert
    const now = new Date().toISOString();
    const insertData = {
      user_id: factData.user_id,
      content: factData.content,
      fact_type: factData.factType,
      confidence: factData.confidence || 0.7,
      is_active: factData.isActive !== undefined ? factData.isActive : true,
      created_at: now,
      updated_at: now,
      source_context: factData.originContext || null,
      // Add other fields as needed
    };
    
    // Insert the fact into the database
    const { data, error } = await supabase
      .from('student_facts')
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating student fact:', error);
      return NextResponse.json(
        { error: 'Failed to create student fact' },
        { status: 500 }
      );
    }
    
    // Return success response with created data
    return NextResponse.json({
      success: true,
      fact: {
        id: data.id,
        content: data.content,
        factType: data.fact_type,
        confidence: data.confidence,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        originContext: data.source_context
      }
    });
    
  } catch (error) {
    console.error('Error in createstudentfact API route:', error);
    return NextResponse.json(
      { error: 'Failed to create student fact' },
      { status: 500 }
    );
  }
} 