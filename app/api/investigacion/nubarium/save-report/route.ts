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
            'nubarium_repuve',
            'nubarium_sep',
            'nubarium_sat_rfc',
            'nubarium_sat_get_name',
            'nubarium_sat_csf_cif',
            'nubarium_sat_cfdi',
            'nubarium_sat_validate_info',
            'nubarium_sat_validate_serial',
            'nubarium_sat_69',
            'nubarium_sat_69b',
            'nubarium_cfe',
            'nubarium_imss_nss',
            'nubarium_imss_employment',
            'nubarium_issste_employment',
            'nubarium_peps',
            'nubarium_cep',
            'nubarium_geo_insights',
            'nubarium_geo_position',
            'nubarium_geo_address'
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

            // For SEP: match by numeroCedula
            if (reportType === 'nubarium_sep') {
                return existing.numeroCedula === searchParams.numeroCedula;
            }

            // For SAT RFC: match by rfc
            if (reportType === 'nubarium_sat_rfc') {
                return existing.rfc === searchParams.rfc;
            }

            // For SAT Get Name: match by rfc
            if (reportType === 'nubarium_sat_get_name') {
                return existing.rfc === searchParams.rfc;
            }

            // For SAT CSF/CIF: match by rfc or documento
            if (reportType === 'nubarium_sat_csf_cif') {
                return (existing.rfc && existing.rfc === searchParams.rfc) ||
                       (existing.documento && existing.documento === searchParams.documento);
            }

            // For SAT CFDI: match by folioCfdi
            if (reportType === 'nubarium_sat_cfdi') {
                return existing.folioCfdi === searchParams.folioCfdi;
            }

            // For SAT Validate Info: match by rfc
            if (reportType === 'nubarium_sat_validate_info') {
                return existing.rfc === searchParams.rfc;
            }

            // For SAT Validate Serial: match by rfc and serial
            if (reportType === 'nubarium_sat_validate_serial') {
                return existing.rfc === searchParams.rfc && existing.serial === searchParams.serial;
            }

            // For SAT 69: match by rfc
            if (reportType === 'nubarium_sat_69') {
                return existing.rfc === searchParams.rfc;
            }

            // For SAT 69-B: match by rfc
            if (reportType === 'nubarium_sat_69b') {
                return existing.rfc === searchParams.rfc;
            }

            // For CFE: match by serviceNumber
            if (reportType === 'nubarium_cfe') {
                return existing.serviceNumber === searchParams.serviceNumber;
            }

            // For IMSS NSS: match by curp
            if (reportType === 'nubarium_imss_nss') {
                return existing.curp === searchParams.curp;
            }

            // For IMSS Employment: match by curp and nss
            if (reportType === 'nubarium_imss_employment') {
                return existing.curp === searchParams.curp && existing.nss === searchParams.nss;
            }

            // For ISSSTE Employment: match by curp
            if (reportType === 'nubarium_issste_employment') {
                return existing.curp === searchParams.curp;
            }

            // For PEPs: match by nombreCompleto
            if (reportType === 'nubarium_peps') {
                return existing.nombreCompleto === searchParams.nombreCompleto;
            }

            // For CEP: match by claveRastreo or fechaPago
            if (reportType === 'nubarium_cep') {
                return (existing.claveRastreo && existing.claveRastreo === searchParams.claveRastreo) ||
                       (existing.fechaPago && existing.fechaPago === searchParams.fechaPago);
            }

            // For Geo Insights: match by address or coordinates
            if (reportType === 'nubarium_geo_insights') {
                return (existing.address && existing.address === searchParams.address) ||
                       (existing.lat && existing.lat === searchParams.lat && existing.lng === searchParams.lng);
            }

            // For Geo Position: match by coordinates
            if (reportType === 'nubarium_geo_position') {
                return existing.lat === searchParams.lat && existing.lng === searchParams.lng;
            }

            // For Geo Address: match by address
            if (reportType === 'nubarium_geo_address') {
                return existing.address === searchParams.address;
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
            case 'nubarium_sep':
                filePrefix = searchParams.numeroCedula || 'sep';
                fileName = `${user.id}/nubarium_sep_${filePrefix}_${timestamp}.pdf`;
                break;
            case 'nubarium_sat_rfc':
                filePrefix = searchParams.rfc || 'sat_rfc';
                fileName = `${user.id}/nubarium_sat_rfc_${filePrefix}_${timestamp}.pdf`;
                break;
            case 'nubarium_sat_get_name':
                filePrefix = searchParams.rfc || 'sat_get_name';
                fileName = `${user.id}/nubarium_sat_get_name_${filePrefix}_${timestamp}.pdf`;
                break;
            case 'nubarium_sat_csf_cif':
                filePrefix = searchParams.rfc || searchParams.documento || 'sat_csf_cif';
                fileName = `${user.id}/nubarium_sat_csf_cif_${filePrefix}_${timestamp}.pdf`;
                break;
            case 'nubarium_sat_cfdi':
                filePrefix = searchParams.folioCfdi || 'sat_cfdi';
                fileName = `${user.id}/nubarium_sat_cfdi_${filePrefix}_${timestamp}.pdf`;
                break;
            case 'nubarium_sat_validate_info':
                filePrefix = searchParams.rfc || 'sat_validate_info';
                fileName = `${user.id}/nubarium_sat_validate_info_${filePrefix}_${timestamp}.pdf`;
                break;
            case 'nubarium_sat_validate_serial':
                filePrefix = searchParams.rfc || 'sat_validate_serial';
                fileName = `${user.id}/nubarium_sat_validate_serial_${filePrefix}_${timestamp}.pdf`;
                break;
            case 'nubarium_sat_69':
                filePrefix = searchParams.rfc || 'sat_69';
                fileName = `${user.id}/nubarium_sat_69_${filePrefix}_${timestamp}.pdf`;
                break;
            case 'nubarium_sat_69b':
                filePrefix = searchParams.rfc || 'sat_69b';
                fileName = `${user.id}/nubarium_sat_69b_${filePrefix}_${timestamp}.pdf`;
                break;
            case 'nubarium_cfe':
                filePrefix = searchParams.serviceNumber || 'cfe';
                fileName = `${user.id}/nubarium_cfe_${filePrefix}_${timestamp}.pdf`;
                break;
            case 'nubarium_imss_nss':
                filePrefix = searchParams.curp || 'imss_nss';
                fileName = `${user.id}/nubarium_imss_nss_${filePrefix}_${timestamp}.pdf`;
                break;
            case 'nubarium_imss_employment':
                filePrefix = searchParams.curp || 'imss_employment';
                fileName = `${user.id}/nubarium_imss_employment_${filePrefix}_${timestamp}.pdf`;
                break;
            case 'nubarium_issste_employment':
                filePrefix = searchParams.curp || 'issste_employment';
                fileName = `${user.id}/nubarium_issste_employment_${filePrefix}_${timestamp}.pdf`;
                break;
            case 'nubarium_peps':
                filePrefix = 'peps';
                fileName = `${user.id}/nubarium_peps_${timestamp}.pdf`;
                break;
            case 'nubarium_cep':
                filePrefix = searchParams.claveRastreo || 'cep';
                fileName = `${user.id}/nubarium_cep_${filePrefix}_${timestamp}.pdf`;
                break;
            case 'nubarium_geo_insights':
                filePrefix = 'geo_insights';
                fileName = `${user.id}/nubarium_geo_insights_${timestamp}.pdf`;
                break;
            case 'nubarium_geo_position':
                filePrefix = 'geo_position';
                fileName = `${user.id}/nubarium_geo_position_${timestamp}.pdf`;
                break;
            case 'nubarium_geo_address':
                filePrefix = 'geo_address';
                fileName = `${user.id}/nubarium_geo_address_${timestamp}.pdf`;
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
