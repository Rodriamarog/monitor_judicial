'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function SatCfdiClient({ userId }: { userId: string }) {
    const [folioCfdi, setFolioCfdi] = useState('');
    const [rfcEmisor, setRfcEmisor] = useState('');
    const [rfcReceptor, setRfcReceptor] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!folioCfdi.trim() || !rfcEmisor.trim() || !rfcReceptor.trim()) {
            setError('Todos los campos son requeridos');
            return;
        }

        setIsSearching(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/investigacion/nubarium/sat/cfdi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    folioCfdi: folioCfdi.trim(),
                    rfcEmisor: rfcEmisor.trim().toUpperCase(),
                    rfcReceptor: rfcReceptor.trim().toUpperCase()
                }),
            });

            if (!response.ok) throw new Error('Error al validar CFDI');
            setResult(await response.json());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setIsSearching(false);
        }
    };

    const isSuccess = result?.status === 'OK' || result?.estatus === 'OK';

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold">Validar CFDI</h1>
                <p className="text-muted-foreground">Valida factura electrónica CFDI</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Validación de CFDI</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSearch} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="folio">Folio CFDI (UUID)</Label>
                            <Input
                                id="folio"
                                value={folioCfdi}
                                onChange={(e) => setFolioCfdi(e.target.value)}
                                placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="emisor">RFC Emisor</Label>
                                <Input
                                    id="emisor"
                                    value={rfcEmisor}
                                    onChange={(e) => setRfcEmisor(e.target.value)}
                                    placeholder="XAXX010101000"
                                    maxLength={13}
                                    className="uppercase"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="receptor">RFC Receptor</Label>
                                <Input
                                    id="receptor"
                                    value={rfcReceptor}
                                    onChange={(e) => setRfcReceptor(e.target.value)}
                                    placeholder="XAXX010101000"
                                    maxLength={13}
                                    className="uppercase"
                                />
                            </div>
                        </div>

                        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

                        <Button type="submit" disabled={isSearching} className="w-full">
                            {isSearching ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Validando...</> : <><Search className="mr-2 h-4 w-4" />Validar</>}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {result && (
                <Card>
                    <CardHeader><CardTitle>Resultado</CardTitle></CardHeader>
                    <CardContent>
                        <Alert variant={isSuccess ? 'default' : 'destructive'}>
                            <AlertDescription>
                                {result.message || result.estado || 'Validación completada'}
                            </AlertDescription>
                        </Alert>
                        {result.data && (
                            <pre className="mt-4 p-4 bg-muted rounded text-xs overflow-auto max-h-96">
                                {JSON.stringify(result.data, null, 2)}
                            </pre>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
