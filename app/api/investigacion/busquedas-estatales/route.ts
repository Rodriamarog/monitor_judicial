import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizeName } from '@/lib/name-variations';

/**
 * Search ALL historical bulletins for a specific name
 * Returns matching bulletin entries for display (does NOT create alerts)
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
    const { searchName } = body;

    if (!searchName || typeof searchName !== 'string') {
        return NextResponse.json(
            { error: 'Missing required field: searchName' },
            { status: 400 }
        );
    }

    console.log(`[Busquedas Estatales] Searching for "${searchName}"`);

    // Normalize the search name (remove accents, uppercase)
    const normalizedSearchName = normalizeName(searchName);

    try {
        // Query bulletin_entries using PostgreSQL text search
        // We'll use ILIKE with wildcards for case-insensitive matching
        // Note: This searches the raw_text column for the name
        const { data: results, error: searchError } = await supabase
            .from('bulletin_entries')
            .select('id, bulletin_date, juzgado, case_number, raw_text, bulletin_url, source')
            .order('bulletin_date', { ascending: false })
            .limit(500); // Limit to prevent performance issues

        if (searchError) {
            console.error('[Busquedas Estatales] Search error:', searchError);
            return NextResponse.json({ error: searchError.message }, { status: 500 });
        }

        if (!results || results.length === 0) {
            console.log('[Busquedas Estatales] No bulletin entries found in database');
            return NextResponse.json({ results: [], total: 0 });
        }

        // Filter results in-memory using normalized text matching
        // This allows us to do accent-insensitive matching
        const matchedResults = results.filter((entry) => {
            const normalizedText = normalizeName(entry.raw_text);
            return normalizedText.includes(normalizedSearchName);
        });

        console.log(`[Busquedas Estatales] Found ${matchedResults.length} matches out of ${results.length} entries searched`);

        return NextResponse.json({
            results: matchedResults,
            total: matchedResults.length,
        });
    } catch (error) {
        console.error('[Busquedas Estatales] Unexpected error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
