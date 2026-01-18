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
import { CurpPDFDocument } from './curp-pdf-document';

interface CurpValidateClientProps {
    userId: string;
}

export function CurpValidateClient({ userId }: CurpValidateClientProps) {
    const [curpToValidate, setCurpToValidate] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [validateResult, setValidateResult] = useState<any>(null);
    const [validateError, setValidateError] = useState<string | null>(null);
    const [validateSearchParams, setValidateSearchParams] = useState<any>(null);

    // Modal states
    const [showValidateModal, setShowValidateModal] = useState(false);
    const [showValidatePdfPreview, setShowValidatePdfPreview] = useState(false);
    const [isDownloadingValidatePdf, setIsDownloadingValidatePdf] = useState(false);

    const handleValidate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!curpToValidate.trim()) {
            setValidateError('Por favor ingrese un CURP');
            return;
        }

        setIsValidating(true);
        setValidateError(null);
        setValidateResult(null);

        try {
            const response = await fetch('/api/investigacion/nubarium/curp/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ curp: curpToValidate.toUpperCase() }),
            });

            if (!response.ok) {
                throw new Error('Error al validar CURP');
            }

            const data = await response.json();
            setValidateResult(data);
            setValidateSearchParams({ curp: curpToValidate.toUpperCase() });

            // Automatically save report with PDF
            await saveValidateReport({ curp: curpToValidate.toUpperCase() }, data);

            // Show modal with results
            setShowValidateModal(true);
        } catch (err) {
            setValidateError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setIsValidating(false);
        }
    };

    const saveValidateReport = async (searchParams: any, result: any) => {
        try {
            // Generate PDF
            const pdfDocument = (
                <CurpPDFDocument
                    reportType="validate"
                    searchParams={searchParams}
                    result={result}
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
                    reportType: 'nubarium_curp_validate',
                    searchParams,
                    resultsCount: result.estatus === 'OK' ? 1 : 0,
                    pdfBlob: base64,
                }),
            });
        } catch (error) {
            console.error('Error saving validate report:', error);
        }
    };

    const handleDownloadValidatePdf = async () => {
        if (!validateResult || !validateSearchParams) return;

        setIsDownloadingValidatePdf(true);
        try {
            const pdfDocument = (
                <CurpPDFDocument
                    reportType="validate"
                    searchParams={validateSearchParams}
                    result={validateResult}
                />
            );

            const blob = await pdf(pdfDocument).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const date = new Date().toISOString().split('T')[0];
            link.download = `Validacion_CURP_${validateSearchParams.curp}_${date}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading PDF:', error);
        } finally {
            setIsDownloadingValidatePdf(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold">Validar CURP</h1>
                <p className="text-muted-foreground">
                    Valida CURP contra el registro nacional RENAPO
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Validar CURP</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleValidate} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="curp">CURP</Label>
                            <Input
                                id="curp"
                                value={curpToValidate}
                                onChange={(e) => setCurpToValidate(e.target.value)}
                                placeholder="RAZR811011HVZMPB01"
                                className="uppercase"
                                maxLength={18}
                            />
                            <p className="text-xs text-muted-foreground">
                                Ingrese el CURP de 18 caracteres
                            </p>
                        </div>

                        {validateError && (
                            <Alert variant="destructive">
                                <AlertDescription>{validateError}</AlertDescription>
                            </Alert>
                        )}

                        <Button type="submit" disabled={isValidating} className="w-full">
                            {isValidating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Validando...
                                </>
                            ) : (
                                <>
                                    <Search className="mr-2 h-4 w-4" />
                                    Validar
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Validate Results Modal */}
            <Dialog open={showValidateModal} onOpenChange={setShowValidateModal}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Resultado de Validación CURP</DialogTitle>
                    </DialogHeader>

                    {validateResult && (
                        <div className="space-y-4">
                            {/* Status Alert */}
                            <Alert variant={validateResult.estatus === 'OK' ? 'default' : 'destructive'}>
                                <AlertDescription>
                                    {validateResult.mensaje || 'Sin mensaje disponible'}
                                </AlertDescription>
                            </Alert>

                            {/* CURP Highlight */}
                            {validateResult.curp && (
                                <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-4 text-center">
                                    <p className="text-sm text-gray-600 mb-2">CURP</p>
                                    <p className="text-2xl font-bold font-mono tracking-wider">{validateResult.curp}</p>
                                </div>
                            )}

                            {/* Personal Information */}
                            {validateResult.estatus === 'OK' && (
                                <div className="space-y-3">
                                    <h3 className="font-semibold">Información Personal</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        {validateResult.nombre && (
                                            <div>
                                                <span className="text-gray-600">Nombre(s):</span>
                                                <p className="font-medium">{validateResult.nombre}</p>
                                            </div>
                                        )}
                                        {validateResult.apellidoPaterno && (
                                            <div>
                                                <span className="text-gray-600">Apellido Paterno:</span>
                                                <p className="font-medium">{validateResult.apellidoPaterno}</p>
                                            </div>
                                        )}
                                        {validateResult.apellidoMaterno && (
                                            <div>
                                                <span className="text-gray-600">Apellido Materno:</span>
                                                <p className="font-medium">{validateResult.apellidoMaterno}</p>
                                            </div>
                                        )}
                                        {validateResult.sexo && (
                                            <div>
                                                <span className="text-gray-600">Sexo:</span>
                                                <p className="font-medium">{validateResult.sexo}</p>
                                            </div>
                                        )}
                                        {validateResult.fechaNacimiento && (
                                            <div>
                                                <span className="text-gray-600">Fecha de Nacimiento:</span>
                                                <p className="font-medium">{validateResult.fechaNacimiento}</p>
                                            </div>
                                        )}
                                        {validateResult.estadoNacimiento && (
                                            <div>
                                                <span className="text-gray-600">Estado de Nacimiento:</span>
                                                <p className="font-medium">{validateResult.estadoNacimiento}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Birth Certificate Info */}
                                    {validateResult.datosDocProbatorio && (
                                        <div className="bg-gray-50 rounded-lg p-4 mt-4">
                                            <h4 className="font-semibold mb-3">Datos del Documento Probatorio</h4>
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                {validateResult.datosDocProbatorio.entidadRegistro && (
                                                    <div>
                                                        <span className="text-gray-600">Entidad de Registro:</span>
                                                        <p className="font-medium">{validateResult.datosDocProbatorio.entidadRegistro}</p>
                                                    </div>
                                                )}
                                                {validateResult.datosDocProbatorio.municipioRegistro && (
                                                    <div>
                                                        <span className="text-gray-600">Municipio:</span>
                                                        <p className="font-medium">{validateResult.datosDocProbatorio.municipioRegistro}</p>
                                                    </div>
                                                )}
                                                {validateResult.datosDocProbatorio.numActa && (
                                                    <div>
                                                        <span className="text-gray-600">Número de Acta:</span>
                                                        <p className="font-medium">{validateResult.datosDocProbatorio.numActa}</p>
                                                    </div>
                                                )}
                                                {validateResult.datosDocProbatorio.anioReg && (
                                                    <div>
                                                        <span className="text-gray-600">Año de Registro:</span>
                                                        <p className="font-medium">{validateResult.datosDocProbatorio.anioReg}</p>
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
                        <Button variant="outline" onClick={() => setShowValidateModal(false)}>
                            Cerrar
                        </Button>
                        <Button variant="outline" onClick={() => setShowValidatePdfPreview(true)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Preview
                        </Button>
                        <Button onClick={handleDownloadValidatePdf} disabled={isDownloadingValidatePdf}>
                            {isDownloadingValidatePdf ? (
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

            {/* Validate PDF Preview Modal */}
            <Dialog open={showValidatePdfPreview} onOpenChange={setShowValidatePdfPreview}>
                <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
                    <DialogHeader className="px-6 pt-6 pb-2">
                        <DialogTitle>Preview - Validación CURP</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 px-6 pb-6">
                        {validateResult && validateSearchParams && (
                            <PDFViewer width="100%" height="100%" style={{ border: 'none' }}>
                                <CurpPDFDocument
                                    reportType="validate"
                                    searchParams={validateSearchParams}
                                    result={validateResult}
                                />
                            </PDFViewer>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
