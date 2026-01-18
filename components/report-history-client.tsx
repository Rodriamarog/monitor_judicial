'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, Trash2, Loader2, FileCheck, Car, UserCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface ReportRecord {
    id: string;
    report_type: string;
    search_params: any; // Can be different structures for different report types
    results_count: number;
    file_path: string | null;
    created_at: string;
}

interface ReportHistoryClientProps {
    userId: string;
}

// Helper function to get report type display name
const getReportTypeLabel = (reportType: string): string => {
    const labels: Record<string, string> = {
        'antecedentes_legales': 'Antecedentes Legales',
        'nubarium_curp_validate': 'CURP Validación',
        'nubarium_curp_generate': 'CURP Generación',
        'nubarium_repuve': 'REPUVE',
    };
    return labels[reportType] || reportType;
};

// Helper function to get report type icon
const getReportTypeIcon = (reportType: string) => {
    if (reportType === 'antecedentes_legales') return FileCheck;
    if (reportType.startsWith('nubarium_curp')) return UserCheck;
    if (reportType === 'nubarium_repuve') return Car;
    return FileText;
};

// Helper function to get report type badge color
const getReportTypeBadgeColor = (reportType: string): string => {
    if (reportType === 'antecedentes_legales') return 'bg-purple-100 text-purple-800';
    if (reportType.startsWith('nubarium_curp')) return 'bg-blue-100 text-blue-800';
    if (reportType === 'nubarium_repuve') return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
};

// Helper function to get search parameter display value
const getSearchParamDisplay = (report: ReportRecord): string => {
    const { report_type, search_params } = report;

    if (report_type === 'antecedentes_legales') {
        return search_params.fullName || 'N/A';
    }

    if (report_type === 'nubarium_curp_validate') {
        return search_params.curp || 'N/A';
    }

    if (report_type === 'nubarium_curp_generate') {
        const nombre = search_params.nombre || '';
        const primerApellido = search_params.primerApellido || '';
        const segundoApellido = search_params.segundoApellido || '';
        return `${primerApellido} ${segundoApellido} ${nombre}`.trim() || 'N/A';
    }

    if (report_type === 'nubarium_repuve') {
        return search_params.vin || search_params.nic || search_params.placa || 'N/A';
    }

    return 'N/A';
};

// Helper function to get additional info display
const getAdditionalInfo = (report: ReportRecord): string | null => {
    const { report_type, search_params } = report;

    if (report_type === 'antecedentes_legales') {
        return search_params.estado || null;
    }

    if (report_type === 'nubarium_curp_generate') {
        return search_params.entidad || null;
    }

    return null;
};

// Helper function to generate download filename
const getDownloadFilename = (report: ReportRecord): string => {
    const { report_type, search_params, created_at } = report;
    const date = new Date(created_at).toISOString().split('T')[0];

    if (report_type === 'antecedentes_legales') {
        const name = search_params.fullName?.replace(/\s+/g, '_') || 'reporte';
        return `Antecedentes_Legales_${name}_${date}.pdf`;
    }

    if (report_type === 'nubarium_curp_validate') {
        const curp = search_params.curp || 'curp';
        return `Validacion_CURP_${curp}_${date}.pdf`;
    }

    if (report_type === 'nubarium_curp_generate') {
        const apellido = search_params.primerApellido || '';
        const nombre = search_params.nombre || '';
        const nameStr = `${apellido}_${nombre}`.replace(/\s+/g, '_') || 'curp';
        return `Generacion_CURP_${nameStr}_${date}.pdf`;
    }

    if (report_type === 'nubarium_repuve') {
        const identifier = search_params.vin || search_params.nic || search_params.placa || 'repuve';
        return `Consulta_REPUVE_${identifier}_${date}.pdf`;
    }

    return `reporte_${date}.pdf`;
};

export function ReportHistoryClient({ userId }: ReportHistoryClientProps) {
    const [reports, setReports] = useState<ReportRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('report_history')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (fetchError) {
                throw fetchError;
            }

            setReports(data || []);
        } catch (err) {
            console.error('Error fetching reports:', err);
            setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (report: ReportRecord) => {
        if (!report.file_path) {
            alert('No hay archivo PDF disponible para este reporte');
            return;
        }

        try {
            const { data, error: downloadError } = await supabase.storage
                .from('reports')
                .download(report.file_path);

            if (downloadError) {
                throw downloadError;
            }

            // Create download link
            const url = URL.createObjectURL(data);
            const link = document.createElement('a');
            link.href = url;
            link.download = getDownloadFilename(report);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading PDF:', error);
            alert('Error al descargar el PDF. Por favor intente de nuevo.');
        }
    };

    const handleDelete = async (reportId: string, filePath: string | null) => {
        if (!confirm('¿Está seguro de eliminar este reporte?')) {
            return;
        }

        try {
            // Delete from storage if file exists
            if (filePath) {
                const { error: deleteStorageError } = await supabase.storage
                    .from('reports')
                    .remove([filePath]);

                if (deleteStorageError) {
                    console.error('Error deleting file from storage:', deleteStorageError);
                }
            }

            // Delete from database
            const { error: deleteDbError } = await supabase
                .from('report_history')
                .delete()
                .eq('id', reportId);

            if (deleteDbError) {
                throw deleteDbError;
            }

            // Refresh the list
            await fetchReports();
        } catch (error) {
            console.error('Error deleting report:', error);
            alert('Error al eliminar el reporte. Por favor intente de nuevo.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <Card className="max-w-md">
                    <CardHeader>
                        <CardTitle>Error</CardTitle>
                        <CardDescription>No se pudo cargar el historial de reportes</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">{error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Historial de Reportes</h1>
                <p className="text-muted-foreground">
                    Reportes de investigación generados anteriormente
                </p>
            </div>

            {reports.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">No hay reportes generados</p>
                        <p className="text-sm text-muted-foreground">
                            Los reportes que genere aparecerán aquí
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Reportes Generados ({reports.length})</CardTitle>
                        <CardDescription>
                            Haga clic en el botón de descarga para descargar el PDF
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Parámetro de Búsqueda</TableHead>
                                    <TableHead>Info Adicional</TableHead>
                                    <TableHead>Resultados</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reports.map((report) => {
                                    const Icon = getReportTypeIcon(report.report_type);
                                    const additionalInfo = getAdditionalInfo(report);

                                    return (
                                        <TableRow key={report.id}>
                                            <TableCell>
                                                <Badge className={getReportTypeBadgeColor(report.report_type)}>
                                                    <Icon className="h-3 w-3 mr-1" />
                                                    {getReportTypeLabel(report.report_type)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {new Date(report.created_at).toLocaleDateString('es-MX', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </TableCell>
                                            <TableCell className="font-medium font-mono text-sm">
                                                {getSearchParamDisplay(report)}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {additionalInfo || '-'}
                                            </TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                                                    {report.results_count === 1
                                                        ? '1 resultado'
                                                        : `${report.results_count} resultados`}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDownload(report)}
                                                        disabled={!report.file_path}
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDelete(report.id, report.file_path)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
