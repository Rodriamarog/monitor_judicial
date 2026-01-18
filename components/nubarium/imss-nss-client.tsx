'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function ImssNssClient({ userId }: { userId: string }) {
    const [curp, setCurp] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!curp.trim() || !webhookUrl.trim()) {
            setError('CURP y URL de webhook son requeridos');
            return;
        }

        setIsSearching(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/investigacion/nubarium/imss/nss', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ curp: curp.trim().toUpperCase(), url: webhookUrl.trim() }),
            });
            if (!response.ok) throw new Error('Error al consultar NSS');
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
                <h1 className="text-3xl font-bold">Obtener NSS - IMSS</h1>
                <p className="text-muted-foreground">Obtiene Número de Seguro Social (webhook)</p>
            </div>
            <Card>
                <CardHeader><CardTitle>Consulta NSS</CardTitle></CardHeader>
                <CardContent>
                    <form onSubmit={handleSearch} className="space-y-4">
                        <div className="space-y-2">
                            <Label>CURP</Label>
                            <Input value={curp} onChange={(e) => setCurp(e.target.value)} placeholder="ABCD123456HDFRRL09" maxLength={18} className="uppercase" />
                        </div>
                        <div className="space-y-2">
                            <Label>Webhook URL</Label>
                            <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://tu-servidor.com/webhook" />
                            <p className="text-xs text-muted-foreground">El resultado será enviado a esta URL via POST</p>
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
                    <CardHeader><CardTitle>Respuesta</CardTitle></CardHeader>
                    <CardContent>
                        <Alert>
                            <AlertDescription>
                                Solicitud enviada. El resultado será enviado a tu webhook cuando esté disponible.
                                {result.codigoValidacion && <> Código: {result.codigoValidacion}</>}
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
