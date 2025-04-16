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
    const { 
      userId, 
      limit = 20, 
      offset = 0, 
      query = '',
      factTypes = [],
      includeInactive = false,
      sortBy = 'updated_at',
      sortOrder = 'desc',
      minConfidence,
      fromDate,
      toDate
    } = requestData;
    
    // Validate required parameters
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: userId' },
        { status: 400 }
      );
    }
    
    // Build the base query
    let dbQuery = supabase
      .from('student_facts')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);
    
    // Apply filters
    if (!includeInactive) {
      dbQuery = dbQuery.eq('is_active', true);
    }
    
    if (query) {
      dbQuery = dbQuery.ilike('content', `%${query}%`);
    }
    
    if (factTypes.length > 0) {
      dbQuery = dbQuery.in('fact_type', factTypes);
    }
    
    if (minConfidence !== undefined && minConfidence !== null) {
      dbQuery = dbQuery.gte('confidence', minConfidence);
    }
    
    if (fromDate) {
      dbQuery = dbQuery.gte('created_at', fromDate);
    }
    
    if (toDate) {
      // Add a day to include the entire end date
      const nextDay = new Date(toDate);
      nextDay.setDate(nextDay.getDate() + 1);
      dbQuery = dbQuery.lt('created_at', nextDay.toISOString());
    }
    
    // Apply sorting
    if (sortBy && ['created_at', 'updated_at', 'confidence'].includes(sortBy)) {
      dbQuery = dbQuery.order(sortBy, { ascending: sortOrder === 'asc' });
    }
    
    // Apply pagination
    dbQuery = dbQuery.range(offset, offset + limit - 1);
    
    // Execute the query
    const { data, count, error } = await dbQuery;
    
    if (error) {
      console.error('Error retrieving student facts:', error);
      return NextResponse.json(
        { error: 'Failed to retrieve student facts' },
        { status: 500 }
      );
    }
    
    // Convert database records to client-friendly format
    const facts = data.map(item => ({
      id: item.id,
      content: item.content,
      factType: item.fact_type,
      confidence: item.confidence,
      isActive: item.is_active,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      originContext: item.source_context
    }));
    
    // Return the results
    return NextResponse.json({
      success: true,
      facts,
      totalCount: count || 0,
      hasMore: (offset + facts.length) < (count || 0),
      offset,
      limit
    });
    
  } catch (error) {
    console.error('Error in getstudentmemory API route:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve student facts' },
      { status: 500 }
    );
  }
} 