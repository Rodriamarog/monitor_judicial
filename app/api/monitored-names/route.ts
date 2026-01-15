import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateName, normalizeName } from '@/lib/name-variations';

/**
 * POST: Add a new monitored name
 * Validates the name, checks subscription limits, and creates the monitored_name record
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse request body
  const body = await request.json();
  const { full_name, search_mode, notes } = body;

  // Validate name
  const validation = validateName(full_name);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Validate search mode
  if (!['exact', 'fuzzy'].includes(search_mode)) {
    return NextResponse.json({ error: 'Invalid search mode' }, { status: 400 });
  }

  // Check subscription limit
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('max_monitored_names')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Error fetching user profile:', profileError);
    return NextResponse.json({ error: 'Error checking subscription limit' }, { status: 500 });
  }

  const { count: currentCount, error: countError } = await supabase
    .from('monitored_names')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (countError) {
    console.error('Error counting monitored names:', countError);
    return NextResponse.json({ error: 'Error checking subscription limit' }, { status: 500 });
  }

  if (currentCount !== null && profile && currentCount >= profile.max_monitored_names) {
    return NextResponse.json(
      { error: `Has alcanzado el límite de ${profile.max_monitored_names} nombres para tu plan` },
      { status: 400 }
    );
  }

  // Insert monitored name
  const { data, error } = await supabase
    .from('monitored_names')
    .insert({
      user_id: user.id,
      full_name: full_name.trim().toUpperCase(),
      normalized_name: normalizeName(full_name),
      search_mode,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) {
    // Check for duplicate
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Ya estás monitoreando este nombre' },
        { status: 400 }
      );
    }
    console.error('Error creating monitored name:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[Monitored Names] Created: "${full_name}" (mode: ${search_mode}) for user ${user.id}`);

  return NextResponse.json(data);
}

/**
 * GET: List all monitored names for the authenticated user
 * Includes alert counts for each name
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch user's monitored names with alert counts
  const { data, error } = await supabase
    .from('monitored_names')
    .select(`
      *,
      alerts:alerts!monitored_name_id(count)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching monitored names:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
