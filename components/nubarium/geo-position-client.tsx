'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function GeoPositionClient({ userId }: { userId: string }) {
    const [lat, setLat] = useState('');
    const [lng, setLng] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!lat.trim() || !lng.trim()) {
            setError('Latitud y longitud son requeridos');
            return;
        }

        setIsSearching(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/investigacion/nubarium/geo/analyze-position', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lat: parseFloat(lat),
                    lng: parseFloat(lng)
                }),
            });
            if (!response.ok) throw new Error('Error al analizar');
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
                <h1 className="text-3xl font-bold">Análisis desde Coordenadas</h1>
                <p className="text-muted-foreground">Análisis geográfico a partir de latitud y longitud</p>
            </div>
            <Card>
                <CardHeader><CardTitle>Coordenadas</CardTitle></CardHeader>
                <CardContent>
                    <form onSubmit={handleSearch} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Latitud</Label>
                                <Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="20.6736" type="number" step="any" />
                            </div>
                            <div className="space-y-2">
                                <Label>Longitud</Label>
                                <Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="-103.3467" type="number" step="any" />
                            </div>
                        </div>
                        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                        <Button type="submit" disabled={isSearching} className="w-full">
                            {isSearching ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analizando...</> : <><Search className="mr-2 h-4 w-4" />Analizar</>}
                        </Button>
                    </form>
                </CardContent>
            </Card>
            {result && (
                <Card>
                    <CardHeader><CardTitle>Resultado</CardTitle></CardHeader>
                    <CardContent>
                        <pre className="p-4 bg-muted rounded text-xs overflow-auto max-h-96">{JSON.stringify(result, null, 2)}</pre>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
