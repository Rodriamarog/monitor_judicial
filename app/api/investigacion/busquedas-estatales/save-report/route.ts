import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Save or update a report
 * - On search completion: creates/updates report with results (no PDF yet)
 * - On PDF download: updates existing report with PDF file
 */
export async function POST(request: NextRequest) {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Parse request body
        const body = await request.json();
        const { searchParams, resultsCount, pdfBlob, reportId } = body;

        if (!searchParams || typeof resultsCount !== 'number') {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Check if a report with same search params already exists (prevent duplicates)
        const { data: existingReports } = await supabase
            .from('report_history')
            .select('*')
            .eq('user_id', user.id)
            .eq('report_type', 'antecedentes_legales');

        // Find exact match based on search parameters
        const existingReport = existingReports?.find(report => {
            const existing = report.search_params;
            return (
                existing.fullName === searchParams.fullName &&
                existing.estado === searchParams.estado &&
                existing.periodo === searchParams.periodo &&
                existing.curp === searchParams.curp &&
                existing.rfc === searchParams.rfc
            );
        });

        let filePath = null;
        let reportData = null;

        // Upload PDF to storage if provided
        if (pdfBlob) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `${user.id}/antecedentes_${searchParams.fullName.replace(/\s+/g, '_')}_${timestamp}.pdf`;

            // Convert base64 to buffer
            const buffer = Buffer.from(pdfBlob, 'base64');

            const { error: uploadError } = await supabase.storage
                .from('reports')
                .upload(fileName, buffer, {
                    contentType: 'application/pdf',
                    upsert: false,
                });

            if (uploadError) {
                console.error('[Save Report] Upload error:', uploadError);
                return NextResponse.json({ error: 'Failed to upload PDF' }, { status: 500 });
            }

            filePath = fileName;
        }

        if (existingReport) {
            // Update existing report
            const updateData: any = {
                results_count: resultsCount,
                created_at: new Date().toISOString(), // Update timestamp
            };

            if (filePath) {
                updateData.file_path = filePath;
            }

            const { data, error: updateError } = await supabase
                .from('report_history')
                .update(updateData)
                .eq('id', existingReport.id)
                .select()
                .single();

            if (updateError) {
                console.error('[Save Report] Update error:', updateError);
                return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
            }

            reportData = data;
        } else {
            // Create new report
            const { data, error: insertError } = await supabase
                .from('report_history')
                .insert({
                    user_id: user.id,
                    report_type: 'antecedentes_legales',
                    search_params: searchParams,
                    results_count: resultsCount,
                    file_path: filePath,
                })
                .select()
                .single();

            if (insertError) {
                console.error('[Save Report] Insert error:', insertError);
                return NextResponse.json({ error: 'Failed to save report' }, { status: 500 });
            }

            reportData = data;
        }

        return NextResponse.json({
            success: true,
            reportId: reportData.id,
            filePath: filePath,
            isUpdate: !!existingReport,
        });
    } catch (error) {
        console.error('[Save Report] Unexpected error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
