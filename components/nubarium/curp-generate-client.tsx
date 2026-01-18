'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { UserPlus, Loader2, Download, Eye } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { pdf, PDFViewer } from '@react-pdf/renderer';
import { CurpPDFDocument } from './curp-pdf-document';

interface CurpGenerateClientProps {
    userId: string;
}

export function CurpGenerateClient({ userId }: CurpGenerateClientProps) {
    const [generateData, setGenerateData] = useState({
        nombre: '',
        primerApellido: '',
        segundoApellido: '',
        fechaNacimiento: '',
        entidad: '',
        sexo: ''
    });
    const [isGenerating, setIsGenerating] = useState(false);
    const [generateResult, setGenerateResult] = useState<any>(null);
    const [generateError, setGenerateError] = useState<string | null>(null);

    // Modal states
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [showGeneratePdfPreview, setShowGeneratePdfPreview] = useState(false);
    const [isDownloadingGeneratePdf, setIsDownloadingGeneratePdf] = useState(false);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!generateData.nombre || !generateData.primerApellido || !generateData.fechaNacimiento || !generateData.entidad || !generateData.sexo) {
            setGenerateError('Por favor complete todos los campos obligatorios');
            return;
        }

        setIsGenerating(true);
        setGenerateError(null);
        setGenerateResult(null);

        try {
            const response = await fetch('/api/investigacion/nubarium/curp/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(generateData),
            });

            if (!response.ok) {
                throw new Error('Error al generar CURP');
            }

            const data = await response.json();
            setGenerateResult(data);

            // Automatically save report with PDF
            await saveGenerateReport(generateData, data);

            // Show modal with results
            setShowGenerateModal(true);
        } catch (err) {
            setGenerateError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setIsGenerating(false);
        }
    };

    const saveGenerateReport = async (searchParams: any, result: any) => {
        try {
            // Generate PDF
            const pdfDocument = (
                <CurpPDFDocument
                    reportType="generate"
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
                    reportType: 'nubarium_curp_generate',
                    searchParams,
                    resultsCount: result.estatus === 'OK' ? 1 : 0,
                    pdfBlob: base64,
                }),
            });
        } catch (error) {
            console.error('Error saving generate report:', error);
        }
    };

    const handleDownloadGeneratePdf = async () => {
        if (!generateResult) return;

        setIsDownloadingGeneratePdf(true);
        try {
            const pdfDocument = (
                <CurpPDFDocument
                    reportType="generate"
                    searchParams={generateData}
                    result={generateResult}
                />
            );

            const blob = await pdf(pdfDocument).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const date = new Date().toISOString().split('T')[0];
            const name = `${generateData.primerApellido}_${generateData.nombre}`.replace(/\s+/g, '_');
            link.download = `Generacion_CURP_${name}_${date}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading PDF:', error);
        } finally {
            setIsDownloadingGeneratePdf(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold">Generar CURP</h1>
                <p className="text-muted-foreground">
                    Genera CURP a partir de datos personales
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Generar CURP</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleGenerate} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="nombre">Nombre(s) *</Label>
                                <Input
                                    id="nombre"
                                    value={generateData.nombre}
                                    onChange={(e) => setGenerateData({ ...generateData, nombre: e.target.value.toUpperCase() })}
                                    placeholder="JUAN"
                                    className="uppercase"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="primerApellido">Primer Apellido *</Label>
                                <Input
                                    id="primerApellido"
                                    value={generateData.primerApellido}
                                    onChange={(e) => setGenerateData({ ...generateData, primerApellido: e.target.value.toUpperCase() })}
                                    placeholder="PÉREZ"
                                    className="uppercase"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="segundoApellido">Segundo Apellido</Label>
                                <Input
                                    id="segundoApellido"
                                    value={generateData.segundoApellido}
                                    onChange={(e) => setGenerateData({ ...generateData, segundoApellido: e.target.value.toUpperCase() })}
                                    placeholder="GARCÍA"
                                    className="uppercase"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="fechaNacimiento">Fecha de Nacimiento *</Label>
                                <Input
                                    id="fechaNacimiento"
                                    type="date"
                                    value={generateData.fechaNacimiento}
                                    onChange={(e) => setGenerateData({ ...generateData, fechaNacimiento: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="entidad">Estado de Nacimiento *</Label>
                                <Select
                                    value={generateData.entidad}
                                    onValueChange={(value) => setGenerateData({ ...generateData, entidad: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione estado" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="AGUASCALIENTES">Aguascalientes</SelectItem>
                                        <SelectItem value="BAJA CALIFORNIA">Baja California</SelectItem>
                                        <SelectItem value="BAJA CALIFORNIA SUR">Baja California Sur</SelectItem>
                                        <SelectItem value="CAMPECHE">Campeche</SelectItem>
                                        <SelectItem value="CHIAPAS">Chiapas</SelectItem>
                                        <SelectItem value="CHIHUAHUA">Chihuahua</SelectItem>
                                        <SelectItem value="CIUDAD DE MEXICO">Ciudad de México</SelectItem>
                                        <SelectItem value="COAHUILA">Coahuila</SelectItem>
                                        <SelectItem value="COLIMA">Colima</SelectItem>
                                        <SelectItem value="DURANGO">Durango</SelectItem>
                                        <SelectItem value="GUANAJUATO">Guanajuato</SelectItem>
                                        <SelectItem value="GUERRERO">Guerrero</SelectItem>
                                        <SelectItem value="HIDALGO">Hidalgo</SelectItem>
                                        <SelectItem value="JALISCO">Jalisco</SelectItem>
                                        <SelectItem value="MEXICO">México</SelectItem>
                                        <SelectItem value="MICHOACAN">Michoacán</SelectItem>
                                        <SelectItem value="MORELOS">Morelos</SelectItem>
                                        <SelectItem value="NAYARIT">Nayarit</SelectItem>
                                        <SelectItem value="NUEVO LEON">Nuevo León</SelectItem>
                                        <SelectItem value="OAXACA">Oaxaca</SelectItem>
                                        <SelectItem value="PUEBLA">Puebla</SelectItem>
                                        <SelectItem value="QUERETARO">Querétaro</SelectItem>
                                        <SelectItem value="QUINTANA ROO">Quintana Roo</SelectItem>
                                        <SelectItem value="SAN LUIS POTOSI">San Luis Potosí</SelectItem>
                                        <SelectItem value="SINALOA">Sinaloa</SelectItem>
                                        <SelectItem value="SONORA">Sonora</SelectItem>
                                        <SelectItem value="TABASCO">Tabasco</SelectItem>
                                        <SelectItem value="TAMAULIPAS">Tamaulipas</SelectItem>
                                        <SelectItem value="TLAXCALA">Tlaxcala</SelectItem>
                                        <SelectItem value="VERACRUZ">Veracruz</SelectItem>
                                        <SelectItem value="YUCATAN">Yucatán</SelectItem>
                                        <SelectItem value="ZACATECAS">Zacatecas</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sexo">Sexo *</Label>
                                <Select
                                    value={generateData.sexo}
                                    onValueChange={(value) => setGenerateData({ ...generateData, sexo: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione sexo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="HOMBRE">Hombre</SelectItem>
                                        <SelectItem value="MUJER">Mujer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {generateError && (
                            <Alert variant="destructive">
                                <AlertDescription>{generateError}</AlertDescription>
                            </Alert>
                        )}

                        <Button type="submit" disabled={isGenerating} className="w-full">
                            {isGenerating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generando...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Generar CURP
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Generate Results Modal */}
            <Dialog open={showGenerateModal} onOpenChange={setShowGenerateModal}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>CURP Generado</DialogTitle>
                    </DialogHeader>

                    {generateResult && (
                        <div className="space-y-4">
                            {/* Status Alert */}
                            <Alert variant={generateResult.estatus === 'OK' ? 'default' : 'destructive'}>
                                <AlertDescription>
                                    {generateResult.mensaje || 'Sin mensaje disponible'}
                                </AlertDescription>
                            </Alert>

                            {/* CURP Highlight */}
                            {generateResult.curp && (
                                <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-6 text-center">
                                    <p className="text-sm text-gray-600 mb-2">CURP Generado</p>
                                    <p className="text-3xl font-bold font-mono tracking-wider">{generateResult.curp}</p>
                                </div>
                            )}

                            {/* Personal Information */}
                            {generateResult.estatus === 'OK' && (
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    {generateResult.nombre && (
                                        <div>
                                            <span className="text-gray-600">Nombre(s):</span>
                                            <p className="font-medium">{generateResult.nombre}</p>
                                        </div>
                                    )}
                                    {generateResult.apellidoPaterno && (
                                        <div>
                                            <span className="text-gray-600">Apellido Paterno:</span>
                                            <p className="font-medium">{generateResult.apellidoPaterno}</p>
                                        </div>
                                    )}
                                    {generateResult.apellidoMaterno && (
                                        <div>
                                            <span className="text-gray-600">Apellido Materno:</span>
                                            <p className="font-medium">{generateResult.apellidoMaterno}</p>
                                        </div>
                                    )}
                                    {generateResult.sexo && (
                                        <div>
                                            <span className="text-gray-600">Sexo:</span>
                                            <p className="font-medium">{generateResult.sexo}</p>
                                        </div>
                                    )}
                                    {generateResult.fechaNacimiento && (
                                        <div>
                                            <span className="text-gray-600">Fecha de Nacimiento:</span>
                                            <p className="font-medium">{generateResult.fechaNacimiento}</p>
                                        </div>
                                    )}
                                    {generateResult.estadoNacimiento && (
                                        <div>
                                            <span className="text-gray-600">Estado de Nacimiento:</span>
                                            <p className="font-medium">{generateResult.estadoNacimiento}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowGenerateModal(false)}>
                            Cerrar
                        </Button>
                        <Button variant="outline" onClick={() => setShowGeneratePdfPreview(true)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Preview
                        </Button>
                        <Button onClick={handleDownloadGeneratePdf} disabled={isDownloadingGeneratePdf}>
                            {isDownloadingGeneratePdf ? (
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

            {/* Generate PDF Preview Modal */}
            <Dialog open={showGeneratePdfPreview} onOpenChange={setShowGeneratePdfPreview}>
                <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
                    <DialogHeader className="px-6 pt-6 pb-2">
                        <DialogTitle>Preview - Generación CURP</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 px-6 pb-6">
                        {generateResult && (
                            <PDFViewer width="100%" height="100%" style={{ border: 'none' }}>
                                <CurpPDFDocument
                                    reportType="generate"
                                    searchParams={generateData}
                                    result={generateResult}
                                />
                            </PDFViewer>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
