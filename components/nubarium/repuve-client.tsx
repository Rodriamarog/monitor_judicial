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
import { RepuvePDFDocument } from './repuve-pdf-document';

interface RepuveClientProps {
    userId: string;
}

export function RepuveClient({ userId }: RepuveClientProps) {
    const [searchType, setSearchType] = useState<'vin' | 'nic' | 'placa'>('vin');
    const [searchValue, setSearchValue] = useState('');
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

        if (!searchValue.trim()) {
            setError('Por favor ingrese un valor de búsqueda');
            return;
        }

        setIsSearching(true);
        setError(null);
        setResult(null);

        try {
            const params = {
                [searchType]: searchValue.toUpperCase(),
                pdf: false
            };

            const response = await fetch('/api/investigacion/nubarium/repuve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
            });

            if (!response.ok) {
                throw new Error('Error al consultar REPUVE');
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
                <RepuvePDFDocument
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
                    reportType: 'nubarium_repuve',
                    searchParams: params,
                    resultsCount: resultData.status === 'OK' ? 1 : 0,
                    pdfBlob: base64,
                }),
            });
        } catch (error) {
            console.error('Error saving REPUVE report:', error);
        }
    };

    const handleDownloadPdf = async () => {
        if (!result || !searchParams) return;

        setIsDownloadingPdf(true);
        try {
            const pdfDocument = (
                <RepuvePDFDocument
                    searchParams={searchParams}
                    result={result}
                />
            );

            const blob = await pdf(pdfDocument).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const date = new Date().toISOString().split('T')[0];
            const identifier = searchParams.vin || searchParams.nic || searchParams.placa || 'repuve';
            link.download = `Consulta_REPUVE_${identifier}_${date}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading PDF:', error);
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    const vehicle = result?.data?.vehicle;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold">REPUVE - Registro Vehicular</h1>
                <p className="text-muted-foreground">
                    Consulta vehículos registrados por VIN, NIC o número de placa
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Búsqueda en REPUVE</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSearch} className="space-y-4">
                        <div className="space-y-3">
                            <Label>Tipo de búsqueda</Label>
                            <RadioGroup value={searchType} onValueChange={(v) => setSearchType(v as any)}>
                                <div className="flex gap-4">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="vin" id="vin" />
                                        <Label htmlFor="vin" className="font-normal cursor-pointer">VIN</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="nic" id="nic" />
                                        <Label htmlFor="nic" className="font-normal cursor-pointer">NIC</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="placa" id="placa" />
                                        <Label htmlFor="placa" className="font-normal cursor-pointer">Placa</Label>
                                    </div>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="search">
                                {searchType === 'vin' && 'Número VIN'}
                                {searchType === 'nic' && 'Número NIC'}
                                {searchType === 'placa' && 'Número de Placa'}
                            </Label>
                            <Input
                                id="search"
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                placeholder={
                                    searchType === 'vin' ? '1NCCN82233A223456' :
                                    searchType === 'nic' ? 'NICABCDEF12345' :
                                    'ABC1234'
                                }
                                className="uppercase"
                            />
                            <p className="text-xs text-muted-foreground">
                                {searchType === 'vin' && 'Número de Identificación Vehicular de 17 caracteres'}
                                {searchType === 'nic' && 'Número de Identificación del Certificado'}
                                {searchType === 'placa' && 'Número de placa del vehículo'}
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
                        <DialogTitle>Resultado de Consulta REPUVE</DialogTitle>
                    </DialogHeader>

                    {result && (
                        <div className="space-y-4">
                            {/* Status Alert */}
                            <Alert variant={result.status === 'OK' ? 'default' : 'destructive'}>
                                <AlertDescription>
                                    {result.message || 'Sin mensaje disponible'}
                                </AlertDescription>
                            </Alert>

                            {/* Vehicle Main Info */}
                            {result.status === 'OK' && vehicle && (
                                <>
                                    <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-6">
                                        <div className="grid grid-cols-3 gap-4 mb-4">
                                            <div>
                                                <p className="text-sm text-gray-600">Marca</p>
                                                <p className="text-xl font-bold">{vehicle.marca || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-600">Modelo</p>
                                                <p className="text-xl font-bold">{vehicle.modelo || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-600">Año</p>
                                                <p className="text-xl font-bold">{vehicle.anioModelo || 'N/A'}</p>
                                            </div>
                                        </div>

                                        {vehicle.vin && (
                                            <div className="bg-indigo-100 rounded p-3">
                                                <p className="text-sm text-gray-600 mb-1">VIN (Número de Serie)</p>
                                                <p className="text-lg font-bold font-mono tracking-wide">{vehicle.vin}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Identification */}
                                    <div>
                                        <h3 className="font-semibold mb-3">Información de Identificación</h3>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            {vehicle.placa && (
                                                <div>
                                                    <span className="text-gray-600">Placa:</span>
                                                    <p className="font-medium">{vehicle.placa}</p>
                                                </div>
                                            )}
                                            {vehicle.nic && (
                                                <div>
                                                    <span className="text-gray-600">NIC:</span>
                                                    <p className="font-medium">{vehicle.nic}</p>
                                                </div>
                                            )}
                                            {result.data?.repuveId && (
                                                <div>
                                                    <span className="text-gray-600">ID REPUVE:</span>
                                                    <p className="font-medium">{result.data.repuveId}</p>
                                                </div>
                                            )}
                                            {vehicle.numeroSerie && (
                                                <div>
                                                    <span className="text-gray-600">Número de Serie:</span>
                                                    <p className="font-medium">{vehicle.numeroSerie}</p>
                                                </div>
                                            )}
                                            {vehicle.numeroMotor && (
                                                <div>
                                                    <span className="text-gray-600">Número de Motor:</span>
                                                    <p className="font-medium">{vehicle.numeroMotor}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Characteristics */}
                                    <div>
                                        <h3 className="font-semibold mb-3">Características del Vehículo</h3>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            {vehicle.clase && (
                                                <div>
                                                    <span className="text-gray-600">Clase:</span>
                                                    <p className="font-medium">{vehicle.clase}</p>
                                                </div>
                                            )}
                                            {vehicle.tipo && (
                                                <div>
                                                    <span className="text-gray-600">Tipo:</span>
                                                    <p className="font-medium">{vehicle.tipo}</p>
                                                </div>
                                            )}
                                            {vehicle.linea && (
                                                <div>
                                                    <span className="text-gray-600">Línea:</span>
                                                    <p className="font-medium">{vehicle.linea}</p>
                                                </div>
                                            )}
                                            {vehicle.color && (
                                                <div>
                                                    <span className="text-gray-600">Color:</span>
                                                    <p className="font-medium">{vehicle.color}</p>
                                                </div>
                                            )}
                                            {vehicle.origin && (
                                                <div>
                                                    <span className="text-gray-600">Origen:</span>
                                                    <p className="font-medium">{vehicle.origin}</p>
                                                </div>
                                            )}
                                            {vehicle.procedencia && (
                                                <div>
                                                    <span className="text-gray-600">Procedencia:</span>
                                                    <p className="font-medium">{vehicle.procedencia}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Technical Specs */}
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <h3 className="font-semibold mb-3">Especificaciones Técnicas</h3>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            {vehicle.combustible && (
                                                <div>
                                                    <span className="text-gray-600">Combustible:</span>
                                                    <p className="font-medium">{vehicle.combustible}</p>
                                                </div>
                                            )}
                                            {vehicle.transmision && (
                                                <div>
                                                    <span className="text-gray-600">Transmisión:</span>
                                                    <p className="font-medium">{vehicle.transmision}</p>
                                                </div>
                                            )}
                                            {vehicle.cilindros && (
                                                <div>
                                                    <span className="text-gray-600">Cilindros:</span>
                                                    <p className="font-medium">{vehicle.cilindros}</p>
                                                </div>
                                            )}
                                            {vehicle.puertas && (
                                                <div>
                                                    <span className="text-gray-600">Puertas:</span>
                                                    <p className="font-medium">{vehicle.puertas}</p>
                                                </div>
                                            )}
                                            {vehicle.asientos && (
                                                <div>
                                                    <span className="text-gray-600">Asientos:</span>
                                                    <p className="font-medium">{vehicle.asientos}</p>
                                                </div>
                                            )}
                                            {vehicle.capacidadCarga && (
                                                <div>
                                                    <span className="text-gray-600">Capacidad de Carga:</span>
                                                    <p className="font-medium">{vehicle.capacidadCarga} kg</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
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
                        <DialogTitle>Preview - Consulta REPUVE</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 px-6 pb-6">
                        {result && searchParams && (
                            <PDFViewer width="100%" height="100%" style={{ border: 'none' }}>
                                <RepuvePDFDocument
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
