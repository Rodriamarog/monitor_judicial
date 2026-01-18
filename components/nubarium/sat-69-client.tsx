'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function Sat69Client({ userId }: { userId: string }) {
    const [rfc, setRfc] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rfc.trim()) {
            setError('RFC es requerido');
            return;
        }

        setIsSearching(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/investigacion/nubarium/sat/69', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rfc: rfc.trim().toUpperCase() }),
            });
            if (!response.ok) throw new Error('Error al consultar');
            setResult(await response.json());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setIsSearching(false);
        }
    };

    const isOnList = result?.situacion && result.situacion !== 'NO LOCALIZADO';

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold">Lista SAT Artículo 69</h1>
                <p className="text-muted-foreground">Consulta lista SAT artículo 69</p>
            </div>
            <Card>
                <CardHeader><CardTitle>Consultar RFC</CardTitle></CardHeader>
                <CardContent>
                    <form onSubmit={handleSearch} className="space-y-4">
                        <div className="space-y-2">
                            <Label>RFC</Label>
                            <Input value={rfc} onChange={(e) => setRfc(e.target.value)} placeholder="XAXX010101000" maxLength={13} className="uppercase" />
                        </div>
                        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                        <Button type="submit" disabled={isSearching} className="w-full">
                            {isSearching ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Consultando...</> : <><Search className="mr-2 h-4 w-4" />Consultar</>}
                        </Button>
                    </form>
                </CardContent>
            </Card>
            {result && (
                <Card>
                    <CardHeader><CardTitle>Resultado</CardTitle></CardHeader>
                    <CardContent>
                        <Alert variant={isOnList ? 'destructive' : 'default'}>
                            <AlertDescription>
                                {isOnList ? `RFC encontrado en lista 69 - ${result.situacion}` : 'RFC no encontrado en lista 69'}
                            </AlertDescription>
                        </Alert>
                        {result.data && <pre className="mt-4 p-4 bg-muted rounded text-xs overflow-auto max-h-96">{JSON.stringify(result, null, 2)}</pre>}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
