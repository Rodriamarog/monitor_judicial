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
    const { searchName, estado, periodo } = body;

    if (!searchName || typeof searchName !== 'string') {
        return NextResponse.json(
            { error: 'Missing required field: searchName' },
            { status: 400 }
        );
    }

    console.log(`[Busquedas Estatales] Searching for "${searchName}" in ${estado || 'all states'} for period: ${periodo || 'all time'}`);

    // Calculate date range based on periodo
    let startDate: string | null = null;
    const today = new Date();

    switch (periodo) {
        case 'año_curso':
            startDate = `${today.getFullYear()}-01-01`;
            break;
        case 'año_curso_anterior':
            startDate = `${today.getFullYear() - 1}-01-01`;
            break;
        case '2_años':
            const twoYearsAgo = new Date(today);
            twoYearsAgo.setFullYear(today.getFullYear() - 2);
            startDate = twoYearsAgo.toISOString().split('T')[0];
            break;
        case '3_años':
            const threeYearsAgo = new Date(today);
            threeYearsAgo.setFullYear(today.getFullYear() - 3);
            startDate = threeYearsAgo.toISOString().split('T')[0];
            break;
        case '5_años':
            const fiveYearsAgo = new Date(today);
            fiveYearsAgo.setFullYear(today.getFullYear() - 5);
            startDate = fiveYearsAgo.toISOString().split('T')[0];
            break;
        case '10_años':
            const tenYearsAgo = new Date(today);
            tenYearsAgo.setFullYear(today.getFullYear() - 10);
            startDate = tenYearsAgo.toISOString().split('T')[0];
            break;
        case 'todos':
        default:
            startDate = '2005-01-01'; // Beginning of archive
            break;
    }

    console.log(`[Busquedas Estatales] Date range: ${startDate} to ${today.toISOString().split('T')[0]}`);

    // Normalize to uppercase but KEEP accents for searching
    // The database has names with accents, and ILIKE handles case-insensitivity
    const searchNameUpper = searchName.trim().toUpperCase();

    try {
        // Build search patterns - search with accents AND without accents to catch all variations
        const nameParts = searchNameUpper.split(/\s+/).filter(Boolean);

        // Create pattern with accents
        const patternWithAccents = `%${nameParts.join('%')}%`;

        // Create pattern without accents (for names stored without accents)
        const normalizedSearchName = normalizeName(searchName);
        const namePartsNoAccents = normalizedSearchName.split(/\s+/).filter(Boolean);
        const patternWithoutAccents = `%${namePartsNoAccents.join('%')}%`;

        console.log(`[Busquedas Estatales] Searching for patterns: ${patternWithAccents} OR ${patternWithoutAccents}`);

        // Use raw SQL to force use of trigram index
        // Search for both accent variations to catch all results
        const { data: results, error: searchError } = await supabase
            .rpc('search_bulletins_by_name', {
                search_pattern_with_accents: patternWithAccents,
                search_pattern_without_accents: patternWithoutAccents,
                start_date: startDate || '2005-01-01',
                max_results: 1000
            });

        if (searchError) {
            console.error('[Busquedas Estatales] Search error:', searchError);
            return NextResponse.json({ error: searchError.message }, { status: 500 });
        }

        console.log(`[Busquedas Estatales] Found ${results?.length || 0} matches`);

        return NextResponse.json({
            results: results || [],
            total: results?.length || 0,
        });
    } catch (error) {
        console.error('[Busquedas Estatales] Unexpected error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
