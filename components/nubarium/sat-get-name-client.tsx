'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SatGetNameClientProps {
    userId: string;
}

export function SatGetNameClient({ userId }: SatGetNameClientProps) {
    const [rfc, setRfc] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!rfc.trim()) {
            setError('Por favor ingrese un RFC');
            return;
        }

        const rfcUpper = rfc.trim().toUpperCase();
        if (rfcUpper.length < 12 || rfcUpper.length > 13) {
            setError('El RFC debe tener 12 o 13 caracteres');
            return;
        }

        setIsSearching(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/investigacion/nubarium/sat/get-name', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rfc: rfcUpper }),
            });

            if (!response.ok) {
                throw new Error('Error al obtener nombre de RFC');
            }

            const data = await response.json();
            setResult(data);
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
                <h1 className="text-3xl font-bold">Obtener Nombre de RFC</h1>
                <p className="text-muted-foreground">
                    Obtiene razón social o nombre a partir de RFC
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Consultar Nombre</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSearch} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="rfc">RFC</Label>
                            <Input
                                id="rfc"
                                value={rfc}
                                onChange={(e) => setRfc(e.target.value)}
                                placeholder="XAXX010101000"
                                maxLength={13}
                                className="uppercase"
                            />
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
                                    Consultar
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {result && (
                <Card>
                    <CardHeader>
                        <CardTitle>Resultado</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Alert variant={isSuccess ? 'default' : 'destructive'}>
                            <AlertDescription>
                                {result.message || result.razonSocial || result.nombre || 'Sin información disponible'}
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
