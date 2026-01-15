'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Search, Loader2, Scale } from 'lucide-react';
import { BusquedasResultsTable } from '@/components/busquedas-results-table';

interface SearchResult {
    id: string;
    bulletin_date: string;
    juzgado: string;
    case_number: string;
    raw_text: string;
    bulletin_url: string;
    source: string;
}

interface BusquedasEstatalesClientProps {
    userId: string;
}

const MEXICAN_STATES = [
    'Aguascalientes',
    'Baja California',
    'Baja California Sur',
    'Campeche',
    'Chiapas',
    'Chihuahua',
    'Ciudad de México',
    'Coahuila',
    'Colima',
    'Durango',
    'Estado de México',
    'Guanajuato',
    'Guerrero',
    'Hidalgo',
    'Jalisco',
    'Michoacán',
    'Morelos',
    'Nayarit',
    'Nuevo León',
    'Oaxaca',
    'Puebla',
    'Querétaro',
    'Quintana Roo',
    'San Luis Potosí',
    'Sinaloa',
    'Sonora',
    'Tabasco',
    'Tamaulipas',
    'Tlaxcala',
    'Veracruz',
    'Yucatán',
    'Zacatecas',
];

const PERIOD_OPTIONS = [
    { value: 'todos', label: 'Todos los registros' },
    { value: 'año_curso', label: 'Año en curso' },
    { value: 'año_curso_anterior', label: 'Año en curso y anterior' },
    { value: '2_años', label: 'Últimos 2 años' },
    { value: '3_años', label: 'Últimos 3 años' },
    { value: '5_años', label: 'Últimos 5 años' },
    { value: '10_años', label: 'Últimos 10 años' },
];

export function BusquedasEstatalesClient({ userId }: BusquedasEstatalesClientProps) {
    const [tipoPersona, setTipoPersona] = useState('fisica');
    const [nombre, setNombre] = useState('');
    const [apellidoPaterno, setApellidoPaterno] = useState('');
    const [apellidoMaterno, setApellidoMaterno] = useState('');
    const [detalle, setDetalle] = useState('no');
    const [periodo, setPeriodo] = useState('10_años');
    const [estado, setEstado] = useState('Baja California');
    const [curp, setCurp] = useState('');
    const [rfc, setRfc] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();

        // Build full name from parts
        const fullName = [nombre, apellidoPaterno, apellidoMaterno]
            .filter(Boolean)
            .join(' ')
            .trim();

        if (!fullName) {
            setError('Por favor ingrese al menos un nombre');
            return;
        }

        setIsSearching(true);
        setError(null);
        setHasSearched(false);

        try {
            const response = await fetch('/api/investigacion/busquedas-estatales', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    searchName: fullName,
                    estado,
                    periodo,
                    curp: curp || undefined,
                    rfc: rfc || undefined,
                }),
            });

            if (!response.ok) {
                throw new Error('Error al realizar la búsqueda');
            }

            const data = await response.json();
            setResults(data.results || []);
            setHasSearched(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
            setResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="flex flex-col h-full gap-6 overflow-hidden">
            {/* Header with Logo */}
            <div className="flex-shrink-0 text-center">
                <div className="flex justify-center mb-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                        <Scale className="h-8 w-8 text-primary" />
                    </div>
                </div>
                <h1 className="text-2xl font-bold mb-2">Formulario de búsqueda</h1>
                <p className="text-sm text-muted-foreground">
                    Busca nombres en todos los boletines judiciales del estado
                </p>
            </div>

            {/* Two Column Layout */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-auto">
                {/* Left Column - Datos de la persona */}
                <Card>
                    <CardHeader>
                        <CardTitle>Datos de la persona</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSearch} className="space-y-6">
                            {/* Tipo de persona */}
                            <div className="space-y-3">
                                <Label>Tipo de persona</Label>
                                <RadioGroup value={tipoPersona} onValueChange={setTipoPersona}>
                                    <div className="flex items-center space-x-6">
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="fisica" id="fisica" />
                                            <Label htmlFor="fisica" className="font-normal cursor-pointer">Física</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="moral" id="moral" />
                                            <Label htmlFor="moral" className="font-normal cursor-pointer">Moral</Label>
                                        </div>
                                    </div>
                                </RadioGroup>
                            </div>

                            {/* Nombre(s) */}
                            <div className="space-y-2">
                                <Label htmlFor="nombre">Nombre(s)</Label>
                                <Input
                                    id="nombre"
                                    placeholder=""
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                />
                            </div>

                            {/* Apellido Paterno */}
                            <div className="space-y-2">
                                <Label htmlFor="apellidoPaterno">Apellido Paterno</Label>
                                <Input
                                    id="apellidoPaterno"
                                    placeholder=""
                                    value={apellidoPaterno}
                                    onChange={(e) => setApellidoPaterno(e.target.value)}
                                />
                            </div>

                            {/* Apellido Materno */}
                            <div className="space-y-2">
                                <Label htmlFor="apellidoMaterno">Apellido Materno</Label>
                                <Input
                                    id="apellidoMaterno"
                                    placeholder=""
                                    value={apellidoMaterno}
                                    onChange={(e) => setApellidoMaterno(e.target.value)}
                                />
                            </div>

                            {/* Detalle */}
                            <div className="space-y-3">
                                <Label>Detalle</Label>
                                <RadioGroup value={detalle} onValueChange={setDetalle}>
                                    <div className="flex items-center space-x-6">
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="si" id="si" />
                                            <Label htmlFor="si" className="font-normal cursor-pointer">Sí</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id="no" />
                                            <Label htmlFor="no" className="font-normal cursor-pointer">No</Label>
                                        </div>
                                    </div>
                                </RadioGroup>
                            </div>

                            {/* Periodo de búsqueda */}
                            <div className="space-y-2">
                                <Label htmlFor="periodo">Periodo de búsqueda</Label>
                                <p className="text-xs text-muted-foreground">(Opcional)</p>
                                <select
                                    id="periodo"
                                    value={periodo}
                                    onChange={(e) => setPeriodo(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                    {PERIOD_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {error && (
                                <div className="text-sm text-destructive">
                                    {error}
                                </div>
                            )}

                            <Button type="submit" disabled={isSearching} className="w-full">
                                {isSearching ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Buscando...
                                    </>
                                ) : (
                                    <>
                                        <Search className="mr-2 h-4 w-4" />
                                        Buscar
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Right Column - Tipo de búsqueda */}
                <Card>
                    <CardHeader>
                        <CardTitle>Tipo de búsqueda</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Tipo de búsqueda */}
                        <div className="space-y-3">
                            <Label>Tipo de búsqueda</Label>
                            <RadioGroup value="estatal" disabled>
                                <div className="flex items-center space-x-6">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="estatal" id="estatal" />
                                        <Label htmlFor="estatal" className="font-normal cursor-pointer">Estatal</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="nacional" id="nacional" disabled />
                                        <Label htmlFor="nacional" className="font-normal cursor-not-allowed text-muted-foreground">Nacional</Label>
                                    </div>
                                </div>
                            </RadioGroup>
                            <p className="text-xs text-muted-foreground">
                                Usted tiene <span className="font-semibold">43 búsquedas estatales</span> disponibles.
                            </p>
                        </div>

                        {/* Estado */}
                        <div className="space-y-2">
                            <Label htmlFor="estado">Estado</Label>
                            <select
                                id="estado"
                                value={estado}
                                onChange={(e) => setEstado(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                {MEXICAN_STATES.map((state) => (
                                    <option key={state} value={state}>
                                        {state}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* CURP Field */}
                        <div className="space-y-2">
                            <Label htmlFor="curp">CURP (Opcional)</Label>
                            <Input
                                id="curp"
                                placeholder=""
                                value={curp}
                                onChange={(e) => setCurp(e.target.value.toUpperCase())}
                                maxLength={18}
                            />
                            <p className="text-xs text-muted-foreground">
                                El CURP proporcionado será validado ante el Registro Nacional de Población.
                            </p>
                        </div>

                        {/* RFC Field */}
                        <div className="space-y-2">
                            <Label htmlFor="rfc">RFC (Opcional)</Label>
                            <Input
                                id="rfc"
                                placeholder=""
                                value={rfc}
                                onChange={(e) => setRfc(e.target.value.toUpperCase())}
                                maxLength={13}
                            />
                            <p className="text-xs text-muted-foreground">
                                El RFC proporcionado será validada ante el SAT y se realizará una búsqueda del mismo en las listas negras del SAT.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Results Section */}
            {hasSearched && (
                <Card className="flex-shrink-0">
                    <CardHeader>
                        <CardTitle>
                            Resultados de la búsqueda
                            {results.length > 0 && (
                                <span className="ml-2 text-sm font-normal text-muted-foreground">
                                    ({results.length} {results.length === 1 ? 'boletín encontrado' : 'boletines encontrados'})
                                </span>
                            )}
                        </CardTitle>
                        <CardDescription>
                            Boletines que contienen el nombre buscado
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="max-h-[400px] overflow-auto">
                        {results.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-muted-foreground">
                                    No se encontraron resultados para esta búsqueda
                                </p>
                            </div>
                        ) : (
                            <BusquedasResultsTable results={results} />
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
