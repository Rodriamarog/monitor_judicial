'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search, Loader2, Download, Eye } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { pdf, PDFViewer } from '@react-pdf/renderer';
import { SepPDFDocument } from './sep-pdf-document';

interface SepClientProps {
    userId: string;
}

export function SepClient({ userId }: SepClientProps) {
    const [numeroCedula, setNumeroCedula] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [searchParams, setSearchParams] = useState<any>(null);

    // Modal states
    const [showResultModal, setShowResultModal] = useState(false);
    const [showPdfPreview, setShowPdfPreview] = useState(false);
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!numeroCedula.trim()) {
            setError('Por favor ingrese un número de cédula');
            return;
        }

        setIsSearching(true);
        setError(null);
        setResult(null);

        try {
            const params = { numeroCedula: numeroCedula.trim() };

            const response = await fetch('/api/investigacion/nubarium/sep', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
            });

            if (!response.ok) {
                throw new Error('Error al consultar cédula profesional');
            }

            const data = await response.json();
            setResult(data);
            setSearchParams(params);

            // Automatically save report with PDF
            await saveReport(params, data);

            // Show modal with results
            setShowResultModal(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setIsSearching(false);
        }
    };

    const saveReport = async (params: any, resultData: any) => {
        try {
            // Generate PDF
            const pdfDocument = (
                <SepPDFDocument
                    searchParams={params}
                    result={resultData}
                />
            );

            const blob = await pdf(pdfDocument).toBlob();
            const arrayBuffer = await blob.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');

            // Save to database
            await fetch('/api/investigacion/nubarium/save-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reportType: 'nubarium_sep',
                    searchParams: params,
                    resultsCount: resultData.estatus === 'OK' && resultData.cedulas ? resultData.cedulas.length : 0,
                    pdfBlob: base64,
                }),
            });
        } catch (error) {
            console.error('Error saving SEP report:', error);
        }
    };

    const handleDownloadPdf = async () => {
        if (!result || !searchParams) return;

        setIsDownloadingPdf(true);
        try {
            const pdfDocument = (
                <SepPDFDocument
                    searchParams={searchParams}
                    result={result}
                />
            );

            const blob = await pdf(pdfDocument).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const date = new Date().toISOString().split('T')[0];
            link.download = `Cedula_Profesional_${searchParams.numeroCedula}_${date}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading PDF:', error);
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    const cedulas = result?.cedulas || [];
    const isSuccess = result?.estatus === 'OK' && cedulas.length > 0;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold">Cédula Profesional SEP</h1>
                <p className="text-muted-foreground">
                    Valida cédulas profesionales en el registro de la SEP
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Consultar Cédula Profesional</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSearch} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="cedula">Número de Cédula</Label>
                            <Input
                                id="cedula"
                                value={numeroCedula}
                                onChange={(e) => setNumeroCedula(e.target.value)}
                                placeholder="12345678"
                            />
                            <p className="text-xs text-muted-foreground">
                                Ingrese el número de cédula profesional a consultar
                            </p>
                        </div>

                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <Button type="submit" disabled={isSearching} className="w-full">
                            {isSearching ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Consultando...
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

            {/* Results Modal */}
            <Dialog open={showResultModal} onOpenChange={setShowResultModal}>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Resultado de Consulta - Cédula Profesional</DialogTitle>
                    </DialogHeader>

                    {result && (
                        <div className="space-y-4">
                            {/* Status Alert */}
                            <Alert variant={isSuccess ? 'default' : 'destructive'}>
                                <AlertDescription>
                                    {isSuccess
                                        ? `Se encontraron ${cedulas.length} resultado(s) en el sistema SEP`
                                        : 'No se encontraron resultados para la cédula consultada'}
                                </AlertDescription>
                            </Alert>

                            {/* Cédulas Found */}
                            {isSuccess && cedulas.map((cedula: any, index: number) => (
                                <div key={index} className="space-y-4">
                                    {/* Cédula Number Highlight */}
                                    {cedula.numeroCedula && (
                                        <div className="bg-yellow-50 border-2 border-yellow-500 rounded-lg p-6 text-center">
                                            <p className="text-sm text-gray-600 mb-2">Número de Cédula</p>
                                            <p className="text-3xl font-bold">{cedula.numeroCedula}</p>
                                        </div>
                                    )}

                                    {/* Professional Information */}
                                    <div>
                                        <h3 className="font-semibold mb-3">Información Profesional</h3>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            {cedula.nombre && (
                                                <div>
                                                    <span className="text-gray-600">Nombre:</span>
                                                    <p className="font-medium">{cedula.nombre}</p>
                                                </div>
                                            )}
                                            {cedula.titulo && (
                                                <div>
                                                    <span className="text-gray-600">Título:</span>
                                                    <p className="font-medium">{cedula.titulo}</p>
                                                </div>
                                            )}
                                            {cedula.institucion && (
                                                <div className="col-span-2">
                                                    <span className="text-gray-600">Institución:</span>
                                                    <p className="font-medium">{cedula.institucion}</p>
                                                </div>
                                            )}
                                            {cedula.fechaExpedicion && (
                                                <div>
                                                    <span className="text-gray-600">Fecha de Expedición:</span>
                                                    <p className="font-medium">{cedula.fechaExpedicion}</p>
                                                </div>
                                            )}
                                            {cedula.numeroRegistro && (
                                                <div>
                                                    <span className="text-gray-600">Número de Registro:</span>
                                                    <p className="font-medium">{cedula.numeroRegistro}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {index < cedulas.length - 1 && (
                                        <hr className="my-6" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowResultModal(false)}>
                            Cerrar
                        </Button>
                        <Button variant="outline" onClick={() => setShowPdfPreview(true)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Preview
                        </Button>
                        <Button onClick={handleDownloadPdf} disabled={isDownloadingPdf}>
                            {isDownloadingPdf ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generando...
                                </>
                            ) : (
                                <>
                                    <Download className="mr-2 h-4 w-4" />
                                    Descargar PDF
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* PDF Preview Modal */}
            <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
                <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
                    <DialogHeader className="px-6 pt-6 pb-2">
                        <DialogTitle>Preview - Cédula Profesional SEP</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 px-6 pb-6">
                        {result && searchParams && (
                            <PDFViewer width="100%" height="100%" style={{ border: 'none' }}>
                                <SepPDFDocument
                                    searchParams={searchParams}
                                    result={result}
                                />
                            </PDFViewer>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
