'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function PepsClient({ userId }: { userId: string }) {
    const [nombreCompleto, setNombreCompleto] = useState('');
    const [similitud, setSimilitud] = useState('80');
    const [isSearching, setIsSearching] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombreCompleto.trim()) {
            setError('Nombre completo es requerido');
            return;
        }

        setIsSearching(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/investigacion/nubarium/lists/peps', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombreCompleto: nombreCompleto.trim(),
                    similitud: parseInt(similitud) || 80
                }),
            });
            if (!response.ok) throw new Error('Error al consultar');
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
                <h1 className="text-3xl font-bold">PEPs y Listas Internacionales</h1>
                <p className="text-muted-foreground">Consulta Politically Exposed Persons y listas negras</p>
            </div>
            <Card>
                <CardHeader><CardTitle>Búsqueda</CardTitle></CardHeader>
                <CardContent>
                    <form onSubmit={handleSearch} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nombre Completo</Label>
                            <Input value={nombreCompleto} onChange={(e) => setNombreCompleto(e.target.value)} placeholder="Juan Pérez García" />
                        </div>
                        <div className="space-y-2">
                            <Label>Porcentaje de Similitud</Label>
                            <Input value={similitud} onChange={(e) => setSimilitud(e.target.value)} placeholder="80" type="number" min="0" max="100" />
                            <p className="text-xs text-muted-foreground">0-100 (por defecto 80)</p>
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
                        {result.matches && result.matches.length > 0 ? (
                            <>
                                <Alert variant="destructive">
                                    <AlertDescription>Se encontraron {result.matches.length} coincidencia(s)</AlertDescription>
                                </Alert>
                                <pre className="mt-4 p-4 bg-muted rounded text-xs overflow-auto max-h-96">{JSON.stringify(result.matches, null, 2)}</pre>
                            </>
                        ) : (
                            <Alert>
                                <AlertDescription>No se encontraron coincidencias</AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
