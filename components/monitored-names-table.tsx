'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Loader2, Pencil, Search } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function MonitoredNamesTable({
  names,
  onDelete,
  onUpdate
}: {
  names: Array<{
    id: string;
    full_name: string;
    search_mode: string;
    notes?: string;
    created_at: string;
    alerts?: Array<{ count: number }>;
    assigned_collaborators?: string[];
  }>;
  onDelete: (id: string) => Promise<void>;
  onUpdate?: (id: string, updates: { full_name?: string; search_mode?: string; notes?: string | null }) => Promise<void>;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Edit dialog state
  const [editingName, setEditingName] = useState<any | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editSearchMode, setEditSearchMode] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Filter names based on search query
  const filteredNames = useMemo(() => {
    if (!searchQuery.trim()) return names;

    const query = searchQuery.toLowerCase();
    return names.filter(
      (name) =>
        name.full_name.toLowerCase().includes(query) ||
        (name.notes && name.notes.toLowerCase().includes(query))
    );
  }, [names, searchQuery]);

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

  const handleEditClick = (name: any, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingName(name);
    setEditFullName(name.full_name);
    setEditSearchMode(name.search_mode);
    setEditNotes(name.notes || '');
    setEditError(null);
  };

  const handleEditSave = async () => {
    if (!editingName || !onUpdate) return;

    setEditLoading(true);
    setEditError(null);

    try {
      if (!editFullName.trim()) {
        setEditError('El nombre no puede estar vacío');
        setEditLoading(false);
        return;
      }

      await onUpdate(editingName.id, {
        full_name: editFullName.trim(),
        search_mode: editSearchMode,
        notes: editNotes.trim() || null,
      });

      toast.success('Nombre actualizado');
      setEditingName(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Error al actualizar');
      toast.error('Error al actualizar nombre');
    } finally {
      setEditLoading(false);
    }
  };

  const handleRowClick = (nameId: string, event: React.MouseEvent) => {
    // Don't navigate if clicking on buttons or action elements
    const target = event.target as HTMLElement;
    if (target.closest('button') || target.closest('[data-action]')) {
      return;
    }
    router.push(`/dashboard/alerts?name=${nameId}`);
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  if (names.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay nombres monitoreados. Agrega un nombre para comenzar.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="flex items-center gap-2 pt-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o notas..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Names Table */}
        <div className="border rounded-md overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-24 text-center">Alertas</TableHead>
                <TableHead className="min-w-[200px]">Nombre</TableHead>
                <TableHead className="min-w-0">Notas</TableHead>
                <TableHead className="w-32">Precisión</TableHead>
                <TableHead className="min-w-0">Notificaciones</TableHead>
                <TableHead className="w-28 text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNames.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No se encontraron nombres' : 'No hay nombres monitoreados'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredNames.map((name) => {
              const alertCount = name.alerts?.[0]?.count || 0;

              return (
                <TableRow
                  key={name.id}
                  onClick={(e) => handleRowClick(name.id, e)}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  title="Clic para ver historial de alertas"
                >
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
                  <TableCell className="font-medium">
                    {name.full_name}
                  </TableCell>
                  <TableCell>
                    <div className="truncate text-sm text-muted-foreground" title={name.notes || '-'}>
                      {name.notes || '-'}
                    </div>
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
                  <TableCell>
                    {name.assigned_collaborators && name.assigned_collaborators.length > 0 ? (
                      <div className="text-xs">
                        <div className="font-medium">
                          {name.assigned_collaborators.length} colaborador{name.assigned_collaborators.length > 1 ? 'es' : ''}
                        </div>
                        {name.assigned_collaborators.slice(0, 2).map(email => (
                          <div key={email} className="text-muted-foreground truncate" title={email}>{email}</div>
                        ))}
                        {name.assigned_collaborators.length > 2 && (
                          <div className="text-muted-foreground">
                            +{name.assigned_collaborators.length - 2} más
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Solo propietario</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-1" data-action="true">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 cursor-pointer"
                        onClick={(e) => handleEditClick(name, e)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
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
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Total count display */}
        <div className="text-sm text-muted-foreground text-right">
          Mostrando {filteredNames.length} de {names.length} nombres
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingName} onOpenChange={(open) => !open && setEditingName(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Nombre Monitoreado</DialogTitle>
            <DialogDescription>
              Modifique los detalles del nombre monitoreado
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {editError && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {editError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-full-name">Nombre Completo</Label>
              <Input
                id="edit-full-name"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                placeholder="Nombre completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-search-mode">Modo de Búsqueda</Label>
              <Select value={editSearchMode} onValueChange={setEditSearchMode}>
                <SelectTrigger id="edit-search-mode">
                  <SelectValue placeholder="Seleccione un modo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exact">Búsqueda Exacta</SelectItem>
                  <SelectItem value="variations">Con Variaciones</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notas (opcional)</Label>
              <Textarea
                id="edit-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Notas sobre este nombre"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingName(null)}
              disabled={editLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={editLoading}
              className="cursor-pointer"
            >
              {editLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
