'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { MonitoredNamesTable } from '@/components/monitored-names-table';
import { AddNameDialog } from '@/components/add-name-dialog';
import { ReadOnlyBanner } from '@/components/read-only-banner';
import { useUserRole } from '@/lib/hooks/use-user-role';
import { useRouter } from 'next/navigation';

interface NombresClientProps {
  namesWithAlerts: Array<{
    id: string;
    full_name: string;
    search_mode: string;
    telefono?: string;
    notes?: string;
    created_at: string;
    alert_count: number;
  }>;
  nameCount: number;
  maxNames: number;
  userId: string;
  onDelete: (nameId: string) => void;
  onUpdate?: (nameId: string, updates: { full_name?: string; search_mode?: string; notes?: string | null }) => Promise<void>;
}

export function NombresClient({
  namesWithAlerts,
  nameCount,
  maxNames,
  userId,
  onDelete,
  onUpdate,
}: NombresClientProps) {
  const router = useRouter();
  const { isCollaborator } = useUserRole();

  const handleSuccess = () => {
    router.refresh();
  };

  const handleDelete = async (nameId: string) => {
    await onDelete(nameId);
    router.refresh();
  };

  const totalAlerts = namesWithAlerts.reduce((sum, name) => sum + name.alert_count, 0);

  return (
    <div className="flex flex-col h-full gap-4 overflow-hidden">
      {/* Header Section */}
      <div className="flex-shrink-0 space-y-4">
        {/* Read-Only Banner for Collaborators */}
        {isCollaborator && <ReadOnlyBanner />}

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Monitoreo por Nombre</h1>
            <p className="text-muted-foreground">
              {isCollaborator
                ? `${nameCount} nombre${nameCount !== 1 ? 's' : ''} asignado${nameCount !== 1 ? 's' : ''}`
                : `${nameCount} de ${maxNames} nombres monitoreados`}
            </p>
          </div>
          {!isCollaborator && (
            <div className="flex gap-2">
              <AddNameDialog
                userId={userId}
                currentCount={nameCount}
                maxNames={maxNames}
                onSuccess={handleSuccess}
              />
            </div>
          )}
        </div>

        {/* Compact Stats Card (master only) */}
        {!isCollaborator && (
          <Card>
            <CardContent className="py-2 px-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Monitoreados</p>
                  <p className="text-lg font-bold">{nameCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total de Alertas</p>
                  <p className="text-lg font-bold">{totalAlerts}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Disponibles</p>
                  <p className="text-lg font-bold">{maxNames - nameCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Names Table - Fills remaining space */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="flex-shrink-0">
          <CardTitle>Nombres Monitoreados</CardTitle>
          <CardDescription>
            Lista de personas que estás rastreando en los boletines judiciales
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto pb-2 pt-2">
          {!namesWithAlerts || namesWithAlerts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {isCollaborator
                  ? 'No tienes nombres asignados aún'
                  : 'No tienes nombres monitoreados aún'}
              </p>
              {!isCollaborator && (
                <AddNameDialog
                  userId={userId}
                  currentCount={nameCount}
                  maxNames={maxNames}
                  onSuccess={handleSuccess}
                />
              )}
            </div>
          ) : (
            <MonitoredNamesTable names={namesWithAlerts} onDelete={handleDelete} onUpdate={onUpdate} readOnly={isCollaborator} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
