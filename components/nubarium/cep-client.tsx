'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function CepClient({ userId }: { userId: string }) {
    const [tipoCriterio, setTipoCriterio] = useState('');
    const [fechaPago, setFechaPago] = useState('');
    const [claveRastreo, setClaveRastreo] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tipoCriterio.trim() || !fechaPago.trim()) {
            setError('Tipo de criterio y fecha de pago son requeridos');
            return;
        }

        setIsSearching(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/investigacion/nubarium/banking/cep', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tipoCriterio: tipoCriterio.trim(),
                    fechaPago: fechaPago.trim(),
                    claveRastreo: claveRastreo.trim() || undefined,
                }),
            });
            if (!response.ok) throw new Error('Error al validar CEP');
            setResult(await response.json());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold">Validar CEP (SPEI)</h1>
                <p className="text-muted-foreground">Valida transferencia SPEI</p>
            </div>
            <Card>
                <CardHeader><CardTitle>Validación de CEP</CardTitle></CardHeader>
                <CardContent>
                    <form onSubmit={handleSearch} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Tipo de Criterio</Label>
                            <Input value={tipoCriterio} onChange={(e) => setTipoCriterio(e.target.value)} placeholder="1" />
                        </div>
                        <div className="space-y-2">
                            <Label>Fecha de Pago</Label>
                            <Input value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} placeholder="YYYY-MM-DD" type="date" />
                        </div>
                        <div className="space-y-2">
                            <Label>Clave de Rastreo (opcional)</Label>
                            <Input value={claveRastreo} onChange={(e) => setClaveRastreo(e.target.value)} placeholder="CR12345678" />
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
                        <Alert variant={(result.status === 'OK' || result.estatus === 'OK') ? 'default' : 'destructive'}>
                            <AlertDescription>{result.message || 'Validación completada'}</AlertDescription>
                        </Alert>
                        {result.data && <pre className="mt-4 p-4 bg-muted rounded text-xs overflow-auto max-h-96">{JSON.stringify(result.data, null, 2)}</pre>}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
