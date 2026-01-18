'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Search, Loader2, FileText, Printer, Download, History } from 'lucide-react';
import { BusquedasResultsTable } from '@/components/busquedas-results-table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { pdf, PDFViewer } from '@react-pdf/renderer';
import { AntecedentesPDFDocument } from '@/components/antecedentes-pdf-document';

interface SearchResult {
    id: string;
    bulletin_date: string;
    juzgado: string;
    case_number: string;
    raw_text: string;
    bulletin_url: string;
    source: string;
}

interface BusquedasEstatalesClientProps {
    userId: string;
}

const MEXICAN_STATES = [
    'Aguascalientes',
    'Baja California',
    'Baja California Sur',
    'Campeche',
    'Chiapas',
    'Chihuahua',
    'Ciudad de México',
    'Coahuila',
    'Colima',
    'Durango',
    'Estado de México',
    'Guanajuato',
    'Guerrero',
    'Hidalgo',
    'Jalisco',
    'Michoacán',
    'Morelos',
    'Nayarit',
    'Nuevo León',
    'Oaxaca',
    'Puebla',
    'Querétaro',
    'Quintana Roo',
    'San Luis Potosí',
    'Sinaloa',
    'Sonora',
    'Tabasco',
    'Tamaulipas',
    'Tlaxcala',
    'Veracruz',
    'Yucatán',
    'Zacatecas',
];

const PERIOD_OPTIONS = [
    { value: 'todos', label: 'Todos los registros' },
    { value: 'año_curso', label: 'Año en curso' },
    { value: 'año_curso_anterior', label: 'Año en curso y anterior' },
    { value: '2_años', label: 'Últimos 2 años' },
    { value: '3_años', label: 'Últimos 3 años' },
    { value: '5_años', label: 'Últimos 5 años' },
    { value: '10_años', label: 'Últimos 10 años' },
];

export function BusquedasEstatalesClient({ userId }: BusquedasEstatalesClientProps) {
    const [tipoPersona, setTipoPersona] = useState('fisica');
    const [nombre, setNombre] = useState('');
    const [apellidoPaterno, setApellidoPaterno] = useState('');
    const [apellidoMaterno, setApellidoMaterno] = useState('');
    const [periodo, setPeriodo] = useState('10_años');
    const [estado, setEstado] = useState('Baja California');
    const [curp, setCurp] = useState('');
    const [rfc, setRfc] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showResultsDialog, setShowResultsDialog] = useState(false);
    const [showPDFPreview, setShowPDFPreview] = useState(false);
    const [searchParams, setSearchParams] = useState({
        fullName: '',
        estado: '',
        periodo: '',
        curp: '',
        rfc: '',
    });

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();

        // Build full name from parts
        const fullName = [nombre, apellidoPaterno, apellidoMaterno]
            .filter(Boolean)
            .join(' ')
            .trim();

        if (!fullName) {
            setError('Por favor ingrese al menos un nombre');
            return;
        }

        setIsSearching(true);
        setError(null);
        setHasSearched(false);

        try {
            const response = await fetch('/api/investigacion/busquedas-estatales', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    searchName: fullName,
                    estado,
                    periodo,
                    curp: curp || undefined,
                    rfc: rfc || undefined,
                }),
            });

            if (!response.ok) {
                throw new Error('Error al realizar la búsqueda');
            }

            const data = await response.json();
            setResults(data.results || []);
            setHasSearched(true);

            // Store search parameters for report
            const params = {
                fullName,
                estado,
                periodo,
                curp: curp || '',
                rfc: rfc || '',
            };
            setSearchParams(params);

            // Save report to history and auto-generate PDF
            try {
                // Generate PDF
                const pdfDocument = (
                    <AntecedentesPDFDocument
                        searchParams={params}
                        results={data.results || []}
                        getPeriodoLabel={getPeriodoLabel}
                    />
                );

                const blob = await pdf(pdfDocument).toBlob();

                // Convert blob to base64 for upload
                const arrayBuffer = await blob.arrayBuffer();
                const base64 = Buffer.from(arrayBuffer).toString('base64');

                // Save report with PDF
                await fetch('/api/investigacion/busquedas-estatales/save-report', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        searchParams: params,
                        resultsCount: data.results?.length || 0,
                        pdfBlob: base64,
                    }),
                });
            } catch (saveError) {
                console.error('Failed to save report:', saveError);
                // Don't block the user flow if saving fails
            }

            // Open results dialog
            setShowResultsDialog(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
            setResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPDF = async () => {
        try {
            // Generate PDF using react-pdf
            const pdfDocument = (
                <AntecedentesPDFDocument
                    searchParams={searchParams}
                    results={results}
                    getPeriodoLabel={getPeriodoLabel}
                />
            );

            const blob = await pdf(pdfDocument).toBlob();

            // Convert blob to base64 for upload
            const arrayBuffer = await blob.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');

            // Update report with PDF (the report record was already created on search)
            try {
                await fetch('/api/investigacion/busquedas-estatales/save-report', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        searchParams,
                        resultsCount: results.length,
                        pdfBlob: base64,
                    }),
                });
            } catch (saveError) {
                console.error('Failed to save PDF to report:', saveError);
                // Continue with download even if save fails
            }

            // Create download link
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Antecedentes_Legales_${searchParams.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error al generar el PDF. Por favor intente de nuevo.');
        }
    };

    const getPeriodoLabel = (value: string) => {
        const option = PERIOD_OPTIONS.find(o => o.value === value);
        return option?.label || value;
    };

    return (
        <div className="flex flex-col h-full gap-6 overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex-1 text-center">
                        <h1 className="text-2xl font-bold">Antecedentes Legales</h1>
                    </div>
                    <Link href="/dashboard/investigacion/historial">
                        <Button variant="outline" size="sm">
                            <History className="mr-2 h-4 w-4" />
                            Historial
                        </Button>
                    </Link>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                    Busca nombres en todos los boletines judiciales del estado
                </p>
            </div>

            {/* Wider form layout */}
            <div className="flex-1 flex flex-col gap-6 overflow-auto max-w-5xl mx-auto w-full">
                {/* Datos de la persona */}
                <Card>
                    <CardHeader>
                        <CardTitle>Datos de la persona</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSearch} className="space-y-6">
                            {/* Row 1: Tipo de persona */}
                            <div className="space-y-3">
                                <Label>Tipo de persona</Label>
                                <RadioGroup
                                    value={tipoPersona}
                                    onValueChange={(value) => {
                                        setTipoPersona(value);
                                        // Clear fields not needed for moral persons
                                        if (value === 'moral') {
                                            setApellidoPaterno('');
                                            setApellidoMaterno('');
                                            setCurp('');
                                        }
                                    }}
                                >
                                    <div className="flex items-center space-x-6">
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="fisica" id="fisica" />
                                            <Label htmlFor="fisica" className="font-normal cursor-pointer">Física</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="moral" id="moral" />
                                            <Label htmlFor="moral" className="font-normal cursor-pointer">Moral</Label>
                                        </div>
                                    </div>
                                </RadioGroup>
                            </div>

                            {/* Row 2: Name fields - Different for Física vs Moral */}
                            {tipoPersona === 'fisica' ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Nombre(s) */}
                                    <div className="space-y-2">
                                        <Label htmlFor="nombre">Nombre(s)</Label>
                                        <Input
                                            id="nombre"
                                            placeholder=""
                                            value={nombre}
                                            onChange={(e) => setNombre(e.target.value)}
                                        />
                                    </div>

                                    {/* Apellido Paterno */}
                                    <div className="space-y-2">
                                        <Label htmlFor="apellidoPaterno">Apellido Paterno</Label>
                                        <Input
                                            id="apellidoPaterno"
                                            placeholder=""
                                            value={apellidoPaterno}
                                            onChange={(e) => setApellidoPaterno(e.target.value)}
                                        />
                                    </div>

                                    {/* Apellido Materno */}
                                    <div className="space-y-2">
                                        <Label htmlFor="apellidoMaterno">Apellido Materno</Label>
                                        <Input
                                            id="apellidoMaterno"
                                            placeholder=""
                                            value={apellidoMaterno}
                                            onChange={(e) => setApellidoMaterno(e.target.value)}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {/* Nombre - For Moral persons (companies) */}
                                    <Label htmlFor="nombre">Nombre</Label>
                                    <Input
                                        id="nombre"
                                        placeholder="Razón social de la empresa"
                                        value={nombre}
                                        onChange={(e) => setNombre(e.target.value)}
                                    />
                                </div>
                            )}

                            {/* Row 3: CURP and RFC - Different for Física vs Moral */}
                            {tipoPersona === 'fisica' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* CURP Field */}
                                    <div className="space-y-2">
                                        <Label htmlFor="curp">CURP (Opcional)</Label>
                                        <Input
                                            id="curp"
                                            placeholder=""
                                            value={curp}
                                            onChange={(e) => setCurp(e.target.value.toUpperCase())}
                                            maxLength={18}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Validado ante el Registro Nacional de Población
                                        </p>
                                    </div>

                                    {/* RFC Field */}
                                    <div className="space-y-2">
                                        <Label htmlFor="rfc">RFC (Opcional)</Label>
                                        <Input
                                            id="rfc"
                                            placeholder=""
                                            value={rfc}
                                            onChange={(e) => setRfc(e.target.value.toUpperCase())}
                                            maxLength={13}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Validado ante el SAT
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {/* RFC Field only for Moral persons */}
                                    <Label htmlFor="rfc">RFC (Opcional)</Label>
                                    <Input
                                        id="rfc"
                                        placeholder=""
                                        value={rfc}
                                        onChange={(e) => setRfc(e.target.value.toUpperCase())}
                                        maxLength={13}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Validado ante el SAT
                                    </p>
                                </div>
                            )}

                            {/* Row 4: Periodo de búsqueda */}
                            <div className="space-y-2">
                                <Label htmlFor="periodo">Periodo de búsqueda</Label>
                                <p className="text-xs text-muted-foreground">(Opcional)</p>
                                <select
                                    id="periodo"
                                    value={periodo}
                                    onChange={(e) => setPeriodo(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                    {PERIOD_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {error && (
                                <div className="text-sm text-destructive">
                                    {error}
                                </div>
                            )}

                            <Button type="submit" disabled={isSearching} className="w-full">
                                {isSearching ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Buscando...
                                    </>
                                ) : (
                                    <>
                                        <Search className="mr-2 h-4 w-4" />
                                        Buscar
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/*
                Commented out until we have multiple states available

                Right Column - Tipo de búsqueda
                <Card>
                    <CardHeader>
                        <CardTitle>Tipo de búsqueda</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        Tipo de búsqueda
                        <div className="space-y-3">
                            <Label>Tipo de búsqueda</Label>
                            <RadioGroup value="estatal" disabled>
                                <div className="flex items-center space-x-6">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="estatal" id="estatal" />
                                        <Label htmlFor="estatal" className="font-normal cursor-pointer">Estatal</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="nacional" id="nacional" disabled />
                                        <Label htmlFor="nacional" className="font-normal cursor-not-allowed text-muted-foreground">Nacional</Label>
                                    </div>
                                </div>
                            </RadioGroup>
                            <p className="text-xs text-muted-foreground">
                                Usted tiene <span className="font-semibold">43 búsquedas estatales</span> disponibles.
                            </p>
                        </div>

                        Estado
                        <div className="space-y-2">
                            <Label htmlFor="estado">Estado</Label>
                            <select
                                id="estado"
                                value={estado}
                                onChange={(e) => setEstado(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                {MEXICAN_STATES.map((state) => (
                                    <option key={state} value={state}>
                                        {state}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </CardContent>
                </Card>
                */}
            </div>

            {/* Results Notification */}
            {hasSearched && (
                <Alert className="flex-shrink-0">
                    <FileText className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                        <span>
                            {results.length > 0
                                ? `Búsqueda completada: ${results.length} ${results.length === 1 ? 'boletín encontrado' : 'boletines encontrados'}`
                                : 'Búsqueda completada: No se encontraron resultados'
                            }
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowResultsDialog(true)}
                        >
                            Ver Reporte Completo
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {/* Results Dialog */}
            <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader className="print:block">
                        <DialogTitle className="text-2xl">Reporte de Antecedentes Legales</DialogTitle>
                        <DialogDescription>
                            Resultados de la búsqueda en boletines judiciales
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-auto print:overflow-visible">
                        {/* Print Header - Only visible when printing */}
                        <div className="hidden print:block mb-6 pb-4 border-b">
                            <h1 className="text-3xl font-bold mb-2">Reporte de Antecedentes Legales</h1>
                            <p className="text-sm text-gray-600">Generado el {new Date().toLocaleDateString('es-MX', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}</p>
                        </div>

                        {/* Search Parameters Summary */}
                        <div className="mb-6 p-4 bg-gray-50 rounded-lg print:bg-white print:border print:border-gray-300">
                            <h3 className="font-semibold text-lg mb-3">Parámetros de Búsqueda</h3>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="font-medium">Nombre:</span>
                                    <span className="ml-2">{searchParams.fullName}</span>
                                </div>
                                <div>
                                    <span className="font-medium">Estado:</span>
                                    <span className="ml-2">{searchParams.estado}</span>
                                </div>
                                <div>
                                    <span className="font-medium">Periodo:</span>
                                    <span className="ml-2">{getPeriodoLabel(searchParams.periodo)}</span>
                                </div>
                                {searchParams.curp && (
                                    <div>
                                        <span className="font-medium">CURP:</span>
                                        <span className="ml-2">{searchParams.curp}</span>
                                    </div>
                                )}
                                {searchParams.rfc && (
                                    <div>
                                        <span className="font-medium">RFC:</span>
                                        <span className="ml-2">{searchParams.rfc}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Results Summary */}
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg print:bg-white print:border-green-300">
                            <h3 className="font-semibold text-lg mb-2">Resumen de Resultados</h3>
                            <p className="text-2xl font-bold text-green-700">
                                {results.length} {results.length === 1 ? 'Boletín Encontrado' : 'Boletines Encontrados'}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                                {results.length > 0
                                    ? 'Se encontraron menciones del nombre buscado en los siguientes boletines judiciales:'
                                    : 'No se encontraron menciones del nombre buscado en los boletines judiciales del estado seleccionado.'
                                }
                            </p>
                        </div>

                        {/* Results Table */}
                        {results.length > 0 ? (
                            <div className="mb-6">
                                <h3 className="font-semibold text-lg mb-3">Detalle de Boletines</h3>
                                <BusquedasResultsTable results={results} />
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <p>No se encontraron antecedentes legales para los parámetros especificados.</p>
                            </div>
                        )}

                        {/* Footer Note */}
                        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm print:bg-white print:border-yellow-300">
                            <p className="font-medium mb-1">Nota Importante:</p>
                            <p className="text-gray-700">
                                Este reporte muestra únicamente menciones encontradas en boletines judiciales públicos.
                                La presencia de un nombre en un boletín no implica responsabilidad legal o condena.
                                Para información legal precisa, consulte con un profesional del derecho o verifique
                                directamente con las autoridades judiciales correspondientes.
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons - Hidden when printing */}
                    <div className="flex gap-2 justify-end pt-4 border-t print:hidden">
                        <Button
                            variant="outline"
                            onClick={() => setShowResultsDialog(false)}
                        >
                            Cerrar
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setShowPDFPreview(true)}
                        >
                            <FileText className="mr-2 h-4 w-4" />
                            Ver Preview
                        </Button>
                        <Button
                            onClick={handleDownloadPDF}
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Descargar PDF
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* PDF Preview Dialog */}
            <Dialog open={showPDFPreview} onOpenChange={setShowPDFPreview}>
                <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Vista Previa del PDF</DialogTitle>
                        <DialogDescription>
                            Previsualización del reporte que será descargado
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden">
                        <PDFViewer width="100%" height="100%">
                            <AntecedentesPDFDocument
                                searchParams={searchParams}
                                results={results}
                                getPeriodoLabel={getPeriodoLabel}
                            />
                        </PDFViewer>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
