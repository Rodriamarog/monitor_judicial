'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search, Loader2, Download, Eye, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { pdf, PDFViewer } from '@react-pdf/renderer';
import { Sat69bPDFDocument } from './sat-69b-pdf-document';

interface Sat69bClientProps {
    userId: string;
}

export function Sat69bClient({ userId }: Sat69bClientProps) {
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

            const response = await fetch('/api/investigacion/nubarium/sat/69b', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
            });

            if (!response.ok) {
                throw new Error('Error al consultar lista 69-B');
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
                <Sat69bPDFDocument
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
                    reportType: 'nubarium_sat_69b',
                    searchParams: params,
                    resultsCount: resultData.estatus === 'OK' ? 1 : 0,
                    pdfBlob: base64,
                }),
            });
        } catch (error) {
            console.error('Error saving SAT 69-B report:', error);
        }
    };

    const handleDownloadPdf = async () => {
        if (!result || !searchParams) return;

        setIsDownloadingPdf(true);
        try {
            const pdfDocument = (
                <Sat69bPDFDocument
                    searchParams={searchParams}
                    result={result}
                />
            );

            const blob = await pdf(pdfDocument).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const date = new Date().toISOString().split('T')[0];
            link.download = `SAT_69B_${searchParams.rfc}_${date}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading PDF:', error);
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    const isSuccess = result?.estatus === 'OK';
    const isOnList = result?.situacion && result.situacion !== 'NO LOCALIZADO';

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold">Lista SAT Artículo 69-B</h1>
                <p className="text-muted-foreground">
                    Consulta de contribuyentes presuntos en operaciones inexistentes
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Consultar RFC en Lista 69-B</CardTitle>
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
                                Ingrese el RFC a consultar en la lista del artículo 69-B
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
                                    Consultar Lista
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
                        <DialogTitle>Resultado de Consulta - SAT 69-B</DialogTitle>
                    </DialogHeader>

                    {result && (
                        <div className="space-y-4">
                            {/* Status Alert */}
                            <Alert variant={isOnList ? 'destructive' : 'default'}>
                                {isOnList && <AlertTriangle className="h-4 w-4" />}
                                <AlertDescription>
                                    {isOnList
                                        ? `RFC encontrado en lista 69-B - Situación: ${result.situacion}`
                                        : 'RFC no se encuentra en ninguna publicación del artículo 69-B'}
                                </AlertDescription>
                            </Alert>

                            {/* Warning Box if on list */}
                            {isOnList && (
                                <div className="bg-red-50 border-2 border-red-500 rounded-lg p-6 text-center">
                                    <p className="text-sm text-gray-600 mb-2">Situación en Lista 69-B</p>
                                    <p className="text-2xl font-bold text-red-600">{result.situacion}</p>
                                </div>
                            )}

                            {/* RFC Information */}
                            {isSuccess && (
                                <div>
                                    <h3 className="font-semibold mb-3">Información del RFC</h3>
                                    <div className="space-y-4 text-sm">
                                        {result.nombreContribuyente && (
                                            <div>
                                                <span className="text-gray-600">Nombre del Contribuyente:</span>
                                                <p className="font-medium">{result.nombreContribuyente}</p>
                                            </div>
                                        )}
                                        {result.situacion && (
                                            <div>
                                                <span className="text-gray-600">Situación:</span>
                                                <p className="font-medium">{result.situacion}</p>
                                            </div>
                                        )}

                                        {/* Presunto */}
                                        {(result.publicacionDofPresunto || result.publicacionSatPresunto) && (
                                            <div className="pt-4 border-t">
                                                <h4 className="font-semibold mb-2">Publicación Presunto</h4>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {result.publicacionDofPresunto && (
                                                        <div>
                                                            <span className="text-gray-600">Publicación DOF:</span>
                                                            <p className="font-medium">{result.publicacionDofPresunto}</p>
                                                        </div>
                                                    )}
                                                    {result.publicacionSatPresunto && (
                                                        <div>
                                                            <span className="text-gray-600">Publicación SAT:</span>
                                                            <p className="font-medium">{result.publicacionSatPresunto}</p>
                                                        </div>
                                                    )}
                                                    {result.numeroFechaOficioPresunto && (
                                                        <div className="col-span-2">
                                                            <span className="text-gray-600">Número y Fecha de Oficio:</span>
                                                            <p className="font-medium">{result.numeroFechaOficioPresunto}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Definitivo */}
                                        {(result.publicacionDofDefinitivo || result.publicacionSatDefinitivo) && (
                                            <div className="pt-4 border-t">
                                                <h4 className="font-semibold mb-2">Publicación Definitivo</h4>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {result.publicacionDofDefinitivo && (
                                                        <div>
                                                            <span className="text-gray-600">Publicación DOF:</span>
                                                            <p className="font-medium">{result.publicacionDofDefinitivo}</p>
                                                        </div>
                                                    )}
                                                    {result.publicacionSatDefinitivo && (
                                                        <div>
                                                            <span className="text-gray-600">Publicación SAT:</span>
                                                            <p className="font-medium">{result.publicacionSatDefinitivo}</p>
                                                        </div>
                                                    )}
                                                    {result.numeroFechaOficioDefinitivo && (
                                                        <div className="col-span-2">
                                                            <span className="text-gray-600">Número y Fecha de Oficio:</span>
                                                            <p className="font-medium">{result.numeroFechaOficioDefinitivo}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Desvirtuado */}
                                        {(result.publicacionDofDesvirtuado || result.publicacionSatDesvirtuado) && (
                                            <div className="pt-4 border-t">
                                                <h4 className="font-semibold mb-2">Publicación Desvirtuado</h4>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {result.publicacionDofDesvirtuado && (
                                                        <div>
                                                            <span className="text-gray-600">Publicación DOF:</span>
                                                            <p className="font-medium">{result.publicacionDofDesvirtuado}</p>
                                                        </div>
                                                    )}
                                                    {result.publicacionSatDesvirtuado && (
                                                        <div>
                                                            <span className="text-gray-600">Publicación SAT:</span>
                                                            <p className="font-medium">{result.publicacionSatDesvirtuado}</p>
                                                        </div>
                                                    )}
                                                    {result.numeroFechaOficioDesvirtuado && (
                                                        <div className="col-span-2">
                                                            <span className="text-gray-600">Número y Fecha de Oficio:</span>
                                                            <p className="font-medium">{result.numeroFechaOficioDesvirtuado}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Favorable */}
                                        {(result.publicacionDofFavorable || result.publicacionSatFavorable) && (
                                            <div className="pt-4 border-t">
                                                <h4 className="font-semibold mb-2">Publicación Favorable</h4>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {result.publicacionDofFavorable && (
                                                        <div>
                                                            <span className="text-gray-600">Publicación DOF:</span>
                                                            <p className="font-medium">{result.publicacionDofFavorable}</p>
                                                        </div>
                                                    )}
                                                    {result.publicacionSatFavorable && (
                                                        <div>
                                                            <span className="text-gray-600">Publicación SAT:</span>
                                                            <p className="font-medium">{result.publicacionSatFavorable}</p>
                                                        </div>
                                                    )}
                                                    {result.numeroFechaOficioFavorable && (
                                                        <div className="col-span-2">
                                                            <span className="text-gray-600">Número y Fecha de Oficio:</span>
                                                            <p className="font-medium">{result.numeroFechaOficioFavorable}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
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
                        <DialogTitle>Preview - SAT Artículo 69-B</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 px-6 pb-6">
                        {result && searchParams && (
                            <PDFViewer width="100%" height="100%" style={{ border: 'none' }}>
                                <Sat69bPDFDocument
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
