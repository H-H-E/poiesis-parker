import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// Placeholder for admin check - replace with your actual implementation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function isAdmin(userId: string, client: any): Promise<boolean> {
  // Example: Check a custom claim or a separate 'roles' table
  // const { data, error } = await client.from('user_roles').select('role').eq('user_id', userId).single();
  // return data?.role === 'admin';
  console.warn('Using placeholder isAdmin check!');
  // Avoid using the client parameter for now to satisfy linter
  if (!userId) console.error('UserId missing for isAdmin check');
  return true; // Defaulting to true for now
}

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify if the current user is an admin
    const userIsAdmin = await isAdmin(session.user.id, supabase);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch users - adjust columns as needed (id and email/name are typical)
    // Add filtering/pagination if the user list is very large
    const { data: users, error: usersError } = await supabase
      .from('users') // Assuming you have a 'users' table or view
      .select('id, email') // Select id and email (or name)
      .order('email'); // Order alphabetically

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    return NextResponse.json(users);

  } catch (error) {
    console.error('Error in admin users API route:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve users' },
      { status: 500 }
    );
  }
} 