'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Search, Loader2, Download, Eye } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { pdf, PDFViewer } from '@react-pdf/renderer';
import { GeoInsightsPDFDocument } from './geo-insights-pdf-document';

interface GeoInsightsClientProps {
    userId: string;
}

export function GeoInsightsClient({ userId }: GeoInsightsClientProps) {
    const [searchType, setSearchType] = useState<'address' | 'coordinates'>('address');
    const [address, setAddress] = useState('');
    const [lat, setLat] = useState('');
    const [lng, setLng] = useState('');
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

        if (searchType === 'address' && !address.trim()) {
            setError('Por favor ingrese una dirección');
            return;
        }

        if (searchType === 'coordinates' && (!lat.trim() || !lng.trim())) {
            setError('Por favor ingrese latitud y longitud');
            return;
        }

        setIsSearching(true);
        setError(null);
        setResult(null);

        try {
            const params: any = {};
            if (searchType === 'address') {
                params.address = address.trim();
            } else {
                params.lat = parseFloat(lat);
                params.lng = parseFloat(lng);

                if (isNaN(params.lat) || isNaN(params.lng)) {
                    throw new Error('Las coordenadas deben ser números válidos');
                }
            }

            const response = await fetch('/api/investigacion/nubarium/geo/insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
            });

            if (!response.ok) {
                throw new Error('Error al obtener análisis geográfico');
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
                <GeoInsightsPDFDocument
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
                    reportType: 'nubarium_geo_insights',
                    searchParams: params,
                    resultsCount: resultData.status === 'OK' ? 1 : 0,
                    pdfBlob: base64,
                }),
            });
        } catch (error) {
            console.error('Error saving Geo Insights report:', error);
        }
    };

    const handleDownloadPdf = async () => {
        if (!result || !searchParams) return;

        setIsDownloadingPdf(true);
        try {
            const pdfDocument = (
                <GeoInsightsPDFDocument
                    searchParams={searchParams}
                    result={result}
                />
            );

            const blob = await pdf(pdfDocument).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const date = new Date().toISOString().split('T')[0];
            link.download = `Geo_Insights_${date}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading PDF:', error);
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    const isSuccess = result?.status === 'OK';

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold">Inteligencia Geográfica</h1>
                <p className="text-muted-foreground">
                    Obtén análisis de marginalización CONAPO y datos geográficos
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Consultar Análisis Geográfico</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSearch} className="space-y-4">
                        <div className="space-y-3">
                            <Label>Tipo de búsqueda</Label>
                            <RadioGroup value={searchType} onValueChange={(v) => setSearchType(v as any)}>
                                <div className="flex gap-4">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="address" id="address" />
                                        <Label htmlFor="address" className="font-normal cursor-pointer">Dirección</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="coordinates" id="coordinates" />
                                        <Label htmlFor="coordinates" className="font-normal cursor-pointer">Coordenadas</Label>
                                    </div>
                                </div>
                            </RadioGroup>
                        </div>

                        {searchType === 'address' ? (
                            <div className="space-y-2">
                                <Label htmlFor="address-input">Dirección</Label>
                                <Input
                                    id="address-input"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="Av. Chapultepec 480, Americana, Guadalajara, Jalisco"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Ingrese la dirección completa para análisis
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="lat">Latitud</Label>
                                    <Input
                                        id="lat"
                                        value={lat}
                                        onChange={(e) => setLat(e.target.value)}
                                        placeholder="20.6736"
                                        type="number"
                                        step="any"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lng">Longitud</Label>
                                    <Input
                                        id="lng"
                                        value={lng}
                                        onChange={(e) => setLng(e.target.value)}
                                        placeholder="-103.3467"
                                        type="number"
                                        step="any"
                                    />
                                </div>
                            </div>
                        )}

                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <Button type="submit" disabled={isSearching} className="w-full">
                            {isSearching ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Analizando...
                                </>
                            ) : (
                                <>
                                    <Search className="mr-2 h-4 w-4" />
                                    Analizar
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
                        <DialogTitle>Resultado de Análisis Geográfico</DialogTitle>
                    </DialogHeader>

                    {result && (
                        <div className="space-y-4">
                            {/* Status Alert */}
                            <Alert variant={isSuccess ? 'default' : 'destructive'}>
                                <AlertDescription>
                                    {result.message || (isSuccess
                                        ? 'Análisis completado exitosamente'
                                        : 'No se pudo completar el análisis')}
                                </AlertDescription>
                            </Alert>

                            {/* Results */}
                            {isSuccess && result.insights && (
                                <div className="space-y-6">
                                    {/* CONAPO Data */}
                                    {result.insights.conapo && (
                                        <div>
                                            <h3 className="font-semibold mb-3">Datos CONAPO (Marginalización)</h3>
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                {result.insights.conapo.state && (
                                                    <div>
                                                        <span className="text-gray-600">Estado:</span>
                                                        <p className="font-medium">{result.insights.conapo.state}</p>
                                                    </div>
                                                )}
                                                {result.insights.conapo.municipality && (
                                                    <div>
                                                        <span className="text-gray-600">Municipio:</span>
                                                        <p className="font-medium">{result.insights.conapo.municipality}</p>
                                                    </div>
                                                )}
                                                {result.insights.conapo.locality && (
                                                    <div>
                                                        <span className="text-gray-600">Localidad:</span>
                                                        <p className="font-medium">{result.insights.conapo.locality}</p>
                                                    </div>
                                                )}
                                                {result.insights.conapo.level !== undefined && (
                                                    <div>
                                                        <span className="text-gray-600">Nivel de Marginalización:</span>
                                                        <p className="font-medium">
                                                            {result.insights.conapo.level} ({result.insights.conapo.levelCode || 'N/A'})
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* SEPOMEX Data */}
                                    {result.insights.sepomex && (
                                        <div>
                                            <h3 className="font-semibold mb-3">Datos SEPOMEX</h3>
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                {result.insights.sepomex.postalCode && (
                                                    <div>
                                                        <span className="text-gray-600">Código Postal:</span>
                                                        <p className="font-medium">{result.insights.sepomex.postalCode}</p>
                                                    </div>
                                                )}
                                                {result.insights.sepomex.colony && (
                                                    <div>
                                                        <span className="text-gray-600">Colonia:</span>
                                                        <p className="font-medium">{result.insights.sepomex.colony}</p>
                                                    </div>
                                                )}
                                                {result.insights.sepomex.municipality && (
                                                    <div>
                                                        <span className="text-gray-600">Municipio:</span>
                                                        <p className="font-medium">{result.insights.sepomex.municipality}</p>
                                                    </div>
                                                )}
                                                {result.insights.sepomex.state && (
                                                    <div>
                                                        <span className="text-gray-600">Estado:</span>
                                                        <p className="font-medium">{result.insights.sepomex.state}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
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
                        <DialogTitle>Preview - Inteligencia Geográfica</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 px-6 pb-6">
                        {result && searchParams && (
                            <PDFViewer width="100%" height="100%" style={{ border: 'none' }}>
                                <GeoInsightsPDFDocument
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
