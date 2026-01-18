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
import { SatRfcPDFDocument } from './sat-rfc-pdf-document';

interface SatRfcClientProps {
    userId: string;
}

export function SatRfcClient({ userId }: SatRfcClientProps) {
    const [rfc, setRfc] = useState('');
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

        if (!rfc.trim()) {
            setError('Por favor ingrese un RFC');
            return;
        }

        // Basic RFC format validation (12-13 characters)
        const rfcUpper = rfc.trim().toUpperCase();
        if (rfcUpper.length < 12 || rfcUpper.length > 13) {
            setError('El RFC debe tener 12 o 13 caracteres');
            return;
        }

        setIsSearching(true);
        setError(null);
        setResult(null);

        try {
            const params = { rfc: rfcUpper };

            const response = await fetch('/api/investigacion/nubarium/sat/rfc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
            });

            if (!response.ok) {
                throw new Error('Error al validar RFC');
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
                <SatRfcPDFDocument
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
                    reportType: 'nubarium_sat_rfc',
                    searchParams: params,
                    resultsCount: resultData.estatus === 'OK' ? 1 : 0,
                    pdfBlob: base64,
                }),
            });
        } catch (error) {
            console.error('Error saving SAT RFC report:', error);
        }
    };

    const handleDownloadPdf = async () => {
        if (!result || !searchParams) return;

        setIsDownloadingPdf(true);
        try {
            const pdfDocument = (
                <SatRfcPDFDocument
                    searchParams={searchParams}
                    result={result}
                />
            );

            const blob = await pdf(pdfDocument).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const date = new Date().toISOString().split('T')[0];
            link.download = `Validacion_RFC_${searchParams.rfc}_${date}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading PDF:', error);
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    const isSuccess = result?.estatus === 'OK';

    const getPersonType = (tipo?: string) => {
        if (!tipo) return 'No especificado';
        if (tipo === 'F') return 'Persona Física';
        if (tipo === 'M') return 'Persona Moral';
        return tipo;
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold">Validación RFC - SAT</h1>
                <p className="text-muted-foreground">
                    Valida RFC contra el Servicio de Administración Tributaria
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Validar RFC</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSearch} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="rfc">RFC (Registro Federal de Contribuyentes)</Label>
                            <Input
                                id="rfc"
                                value={rfc}
                                onChange={(e) => setRfc(e.target.value)}
                                placeholder="XAXX010101000"
                                maxLength={13}
                                className="uppercase"
                            />
                            <p className="text-xs text-muted-foreground">
                                Ingrese el RFC de 12 o 13 caracteres
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
                                    Validando...
                                </>
                            ) : (
                                <>
                                    <Search className="mr-2 h-4 w-4" />
                                    Validar RFC
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
                        <DialogTitle>Resultado de Validación - RFC</DialogTitle>
                    </DialogHeader>

                    {result && (
                        <div className="space-y-4">
                            {/* Status Alert */}
                            <Alert variant={isSuccess ? 'default' : 'destructive'}>
                                <AlertDescription>
                                    {result.mensaje || (isSuccess
                                        ? 'RFC válido en el sistema SAT'
                                        : 'RFC no encontrado o inválido')}
                                </AlertDescription>
                            </Alert>

                            {/* RFC Highlight */}
                            {isSuccess && (
                                <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-6 text-center">
                                    <p className="text-sm text-gray-600 mb-2">RFC Validado</p>
                                    <p className="text-3xl font-bold">{searchParams.rfc}</p>
                                </div>
                            )}

                            {/* RFC Information */}
                            {isSuccess && (
                                <div>
                                    <h3 className="font-semibold mb-3">Información del RFC</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        {result.tipoPersona && (
                                            <div>
                                                <span className="text-gray-600">Tipo de Persona:</span>
                                                <p className="font-medium">{getPersonType(result.tipoPersona)}</p>
                                            </div>
                                        )}
                                        {result.informacionAdicional && (
                                            <div>
                                                <span className="text-gray-600">Información Adicional:</span>
                                                <p className="font-medium">{result.informacionAdicional}</p>
                                            </div>
                                        )}
                                        <div>
                                            <span className="text-gray-600">Estado:</span>
                                            <p className="font-medium">{result.estatus}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
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
                        <DialogTitle>Preview - Validación RFC SAT</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 px-6 pb-6">
                        {result && searchParams && (
                            <PDFViewer width="100%" height="100%" style={{ border: 'none' }}>
                                <SatRfcPDFDocument
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
