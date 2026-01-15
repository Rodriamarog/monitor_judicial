'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function MonitoredNamesTable({
  names,
  onDelete
}: {
  names: Array<{
    id: string;
    full_name: string;
    search_mode: string;
    notes?: string;
    created_at: string;
    alerts?: Array<{ count: number }>;
  }>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar monitoreo de "${name}"?`)) return;

    setDeleting(id);
    try {
      const response = await fetch(`/api/monitored-names/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Error al eliminar');

      toast.success('Nombre eliminado');
      await onDelete(id);
    } catch (error) {
      toast.error('Error al eliminar nombre');
      console.error('Delete error:', error);
    } finally {
      setDeleting(null);
    }
  }

  if (names.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay nombres monitoreados. Agrega un nombre para comenzar.
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
            <TableHead className="min-w-[200px]">Nombre</TableHead>
            <TableHead className="w-32">Precisión</TableHead>
            <TableHead className="w-24 text-center">Alertas</TableHead>
            <TableHead className="w-20 text-center">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {names.map((name) => {
            const alertCount = name.alerts?.[0]?.count || 0;

            return (
              <TableRow key={name.id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="font-medium">
                  <div>{name.full_name}</div>
                  {name.notes && (
                    <div className="text-xs text-muted-foreground mt-0.5">{name.notes}</div>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {name.search_mode === 'exact' ? (
                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                      Exacta
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary hover:bg-primary/20">
                      Variaciones
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <div
                      className={`inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full text-xs font-medium ${alertCount > 0
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-muted text-muted-foreground'
                        }`}
                    >
                      {alertCount}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive cursor-pointer"
                    onClick={() => handleDelete(name.id, name.full_name)}
                    disabled={deleting === name.id}
                    title="Eliminar"
                  >
                    {deleting === name.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
