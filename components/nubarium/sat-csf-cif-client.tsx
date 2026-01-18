'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function SatCsfCifClient({ userId }: { userId: string }) {
    const [rfc, setRfc] = useState('');
    const [documento, setDocumento] = useState('');
    const [cif, setCif] = useState('');
    const [tipo, setTipo] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();

        setIsSearching(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/investigacion/nubarium/sat/csf-cif', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rfc: rfc || undefined,
                    documento: documento || undefined,
                    cif: cif || undefined,
                    tipo: tipo || undefined
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
                <h1 className="text-3xl font-bold">Consultar CSF/CIF</h1>
                <p className="text-muted-foreground">Obtiene datos a partir de CSF o CIF y RFC</p>
            </div>
            <Card>
                <CardHeader><CardTitle>Consulta</CardTitle></CardHeader>
                <CardContent>
                    <form onSubmit={handleSearch} className="space-y-4">
                        <div className="space-y-2">
                            <Label>RFC (opcional)</Label>
                            <Input value={rfc} onChange={(e) => setRfc(e.target.value)} placeholder="XAXX010101000" maxLength={13} className="uppercase" />
                        </div>
                        <div className="space-y-2">
                            <Label>Documento (opcional)</Label>
                            <Input value={documento} onChange={(e) => setDocumento(e.target.value)} placeholder="Número de documento" />
                        </div>
                        <div className="space-y-2">
                            <Label>CIF (opcional)</Label>
                            <Input value={cif} onChange={(e) => setCif(e.target.value)} placeholder="Número CIF" />
                        </div>
                        <div className="space-y-2">
                            <Label>Tipo (opcional)</Label>
                            <Select value={tipo} onValueChange={setTipo}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CSF">CSF</SelectItem>
                                    <SelectItem value="CIF">CIF</SelectItem>
                                </SelectContent>
                            </Select>
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
                        <pre className="p-4 bg-muted rounded text-xs overflow-auto max-h-96">{JSON.stringify(result, null, 2)}</pre>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
