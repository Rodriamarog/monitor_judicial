'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function SatValidateInfoClient({ userId }: { userId: string }) {
    const [rfc, setRfc] = useState('');
    const [nombre, setNombre] = useState('');
    const [cp, setCp] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rfc.trim() || !nombre.trim() || !cp.trim()) {
            setError('Todos los campos son requeridos');
            return;
        }

        setIsSearching(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/investigacion/nubarium/sat/validate-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rfc: rfc.trim().toUpperCase(), nombre: nombre.trim(), cp: cp.trim() }),
            });
            if (!response.ok) throw new Error('Error al validar');
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
                <h1 className="text-3xl font-bold">Validar RFC vs Datos</h1>
                <p className="text-muted-foreground">Valida RFC contra nombre y código postal</p>
            </div>
            <Card>
                <CardHeader><CardTitle>Validación</CardTitle></CardHeader>
                <CardContent>
                    <form onSubmit={handleSearch} className="space-y-4">
                        <div className="space-y-2">
                            <Label>RFC</Label>
                            <Input value={rfc} onChange={(e) => setRfc(e.target.value)} placeholder="XAXX010101000" maxLength={13} className="uppercase" />
                        </div>
                        <div className="space-y-2">
                            <Label>Nombre</Label>
                            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Juan Pérez" />
                        </div>
                        <div className="space-y-2">
                            <Label>Código Postal</Label>
                            <Input value={cp} onChange={(e) => setCp(e.target.value)} placeholder="12345" maxLength={5} />
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
                            <AlertDescription>{result.message || result.resultado || 'Validación completada'}</AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
