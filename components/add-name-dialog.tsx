'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { validateName } from '@/lib/name-variations';
import { toast } from 'sonner';

export function AddNameDialog({
  userId,
  currentCount,
  maxNames,
  onSuccess
}: {
  userId: string;
  currentCount: number;
  maxNames: number;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [searchMode, setSearchMode] = useState<'exact' | 'fuzzy'>('exact');
  const [notes, setNotes] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate name
    const validation = validateName(fullName);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    // Check subscription limit
    if (currentCount >= maxNames) {
      toast.error(`Has alcanzado el límite de ${maxNames} nombres monitoreados para tu plan`);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/monitored-names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          search_mode: searchMode,
          notes,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al agregar nombre');
      }

      const result = await response.json();

      toast.success('Nombre agregado correctamente');

      setOpen(false);
      setFullName('');
      setSearchMode('exact');
      setNotes('');
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Agregar Nombre</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Monitorear Nombre</DialogTitle>
          <DialogDescription>
            Agrega el nombre de una persona para monitorear su aparición en boletines judiciales.
            El sistema buscará este nombre en todos los boletines nuevos y te alertará cuando aparezca.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Full Name Input */}
            <div className="grid gap-2">
              <Label htmlFor="fullName">Nombre Completo *</Label>
              <Input
                id="fullName"
                placeholder="JUAN ALBERTO PEREZ GONZALEZ"
                value={fullName}
                onChange={(e) => setFullName(e.target.value.toUpperCase())}
                required
              />
              <p className="text-xs text-muted-foreground">
                Mínimo 2 palabras (nombre y apellido). Idealmente nombre completo con apellidos paterno y materno.
              </p>
            </div>

            {/* Search Mode Selection */}
            <div className="grid gap-2">
              <Label>Precisión de Búsqueda *</Label>
              <div className="space-y-2">
                <label className="flex items-start space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="searchMode"
                    value="exact"
                    checked={searchMode === 'exact'}
                    onChange={() => setSearchMode('exact')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium">Solo coincidencia exacta (Recomendado)</div>
                    <div className="text-xs text-muted-foreground">
                      Solo busca el nombre exactamente como lo escribiste. Mayor precisión, sin falsos positivos.
                      Recibirás notificaciones por email y WhatsApp.
                    </div>
                  </div>
                </label>
                <label className="flex items-start space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="searchMode"
                    value="fuzzy"
                    checked={searchMode === 'fuzzy'}
                    onChange={() => setSearchMode('fuzzy')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium">Incluir variaciones</div>
                    <div className="text-xs text-muted-foreground">
                      Busca el nombre completo y variaciones comunes (ej: "JUAN PEREZ", "J. PEREZ", "JUAN A. PEREZ G.").
                      Más resultados pero puede incluir falsos positivos.
                    </div>
                    <div className="text-xs text-orange-600 dark:text-orange-400 font-medium mt-1">
                      ⚠️ NO recibirás notificaciones por email/WhatsApp con esta opción
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Optional Fields */}
            <div className="grid gap-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Ej: Cliente investigación, demandante caso X..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Limit Warning */}
            <p className="text-xs text-muted-foreground">
              Nombres monitoreados: {currentCount} / {maxNames}
            </p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Agregando...' : 'Agregar Nombre'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
