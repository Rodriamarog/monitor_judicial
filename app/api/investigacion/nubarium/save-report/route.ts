import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Save Nubarium report (CURP or REPUVE)
 * - Creates/updates report with results
 * - Stores PDF in storage bucket
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
        const { reportType, searchParams, resultsCount = 1, pdfBlob } = body;

        if (!reportType || !searchParams || !pdfBlob) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Validate report type
        const validTypes = [
            'nubarium_curp_validate',
            'nubarium_curp_generate',
            'nubarium_repuve'
        ];
        if (!validTypes.includes(reportType)) {
            return NextResponse.json(
                { error: 'Invalid report type' },
                { status: 400 }
            );
        }

        // Check if a report with same params already exists (prevent duplicates)
        const { data: existingReports } = await supabase
            .from('report_history')
            .select('*')
            .eq('user_id', user.id)
            .eq('report_type', reportType);

        // Find exact match based on search parameters
        const existingReport = existingReports?.find(report => {
            const existing = report.search_params;

            // For CURP validation: match by curp
            if (reportType === 'nubarium_curp_validate') {
                return existing.curp === searchParams.curp;
            }

            // For CURP generation: match by name + birthdate + estado + sexo
            if (reportType === 'nubarium_curp_generate') {
                return (
                    existing.nombre === searchParams.nombre &&
                    existing.primerApellido === searchParams.primerApellido &&
                    existing.segundoApellido === searchParams.segundoApellido &&
                    existing.fechaNacimiento === searchParams.fechaNacimiento &&
                    existing.entidad === searchParams.entidad &&
                    existing.sexo === searchParams.sexo
                );
            }

            // For REPUVE: match by vin OR nic OR placa
            if (reportType === 'nubarium_repuve') {
                return (
                    (existing.vin && existing.vin === searchParams.vin) ||
                    (existing.nic && existing.nic === searchParams.nic) ||
                    (existing.placa && existing.placa === searchParams.placa)
                );
            }

            return false;
        });

        // Generate file name based on report type
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        let filePrefix = '';
        let fileName = '';

        switch (reportType) {
            case 'nubarium_curp_validate':
                filePrefix = searchParams.curp || 'curp_validate';
                fileName = `${user.id}/nubarium_curp_validate_${filePrefix}_${timestamp}.pdf`;
                break;
            case 'nubarium_curp_generate':
                filePrefix = `${searchParams.primerApellido}_${searchParams.nombre}`.replace(/\s+/g, '_');
                fileName = `${user.id}/nubarium_curp_generate_${filePrefix}_${timestamp}.pdf`;
                break;
            case 'nubarium_repuve':
                filePrefix = searchParams.vin || searchParams.nic || searchParams.placa || 'repuve';
                fileName = `${user.id}/nubarium_repuve_${filePrefix}_${timestamp}.pdf`;
                break;
        }

        // Convert base64 to buffer and upload to storage
        const buffer = Buffer.from(pdfBlob, 'base64');

        const { error: uploadError } = await supabase.storage
            .from('reports')
            .upload(fileName, buffer, {
                contentType: 'application/pdf',
                upsert: false,
            });

        if (uploadError) {
            console.error('[Save Nubarium Report] Upload error:', uploadError);
            return NextResponse.json({ error: 'Failed to upload PDF' }, { status: 500 });
        }

        let reportData = null;

        if (existingReport) {
            // Update existing report
            const { data, error: updateError } = await supabase
                .from('report_history')
                .update({
                    results_count: resultsCount,
                    file_path: fileName,
                    created_at: new Date().toISOString(), // Update timestamp
                })
                .eq('id', existingReport.id)
                .select()
                .single();

            if (updateError) {
                console.error('[Save Nubarium Report] Update error:', updateError);
                return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
            }

            reportData = data;
        } else {
            // Create new report
            const { data, error: insertError } = await supabase
                .from('report_history')
                .insert({
                    user_id: user.id,
                    report_type: reportType,
                    search_params: searchParams,
                    results_count: resultsCount,
                    file_path: fileName,
                })
                .select()
                .single();

            if (insertError) {
                console.error('[Save Nubarium Report] Insert error:', insertError);
                return NextResponse.json({ error: 'Failed to save report' }, { status: 500 });
            }

            reportData = data;
        }

        return NextResponse.json({
            success: true,
            reportId: reportData.id,
            filePath: fileName,
            isUpdate: !!existingReport,
        });
    } catch (error) {
        console.error('[Save Nubarium Report] Unexpected error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
