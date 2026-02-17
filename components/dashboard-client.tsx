'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Upload } from 'lucide-react'
import { CasesTable } from '@/components/cases-table'
import { DowngradeBlockedAlert } from '@/components/downgrade-blocked-alert'
import { AddCaseDialog } from '@/components/add-case-dialog'
import { ImportCasesDialog } from '@/components/import-cases-dialog'
import { ReadOnlyBanner } from '@/components/read-only-banner'
import { useUserRole } from '@/lib/hooks/use-user-role'

interface DashboardClientProps {
  casesWithAlerts: any[]
  caseCount: number
  maxCases: number
  tier: string
  showDowngradeAlert: boolean
  onDelete: (caseId: string) => void
  onUpdate: (caseId: string, updates: any) => Promise<void>
}

export function DashboardClient({
  casesWithAlerts,
  caseCount,
  maxCases,
  tier,
  showDowngradeAlert,
  onDelete,
  onUpdate,
}: DashboardClientProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const { isCollaborator } = useUserRole()

  return (
    <div className="flex flex-col h-full gap-4 overflow-hidden">
      {/* Alerts - Fixed height */}
      <div className="flex-shrink-0 space-y-4">
        {/* Read-Only Banner for Collaborators */}
        {isCollaborator && <ReadOnlyBanner />}

        {/* Downgrade Blocked Alert */}
        {showDowngradeAlert && (
          <DowngradeBlockedAlert
            caseCount={caseCount}
            maxCasesForNewTier={50} // We'll need to store the target tier, for now assume Pro 50
            targetTier="Pro 50"
          />
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Monitoreo por Expediente</h1>
            <p className="text-muted-foreground">
              {isCollaborator
                ? `${caseCount} caso${caseCount !== 1 ? 's' : ''} asignado${caseCount !== 1 ? 's' : ''}`
                : `${caseCount} de ${maxCases} casos monitoreados`}
            </p>
          </div>
          {!isCollaborator && (
            <div className="flex gap-2">
              <Button
                onClick={() => setImportDialogOpen(true)}
                variant="outline"
                size="icon"
                className="cursor-pointer"
                title="Importar Expedientes desde JSON"
              >
                <Upload className="h-4 w-4" />
              </Button>
              <Button onClick={() => setAddDialogOpen(true)} className="gap-2 cursor-pointer">
                <Plus className="h-4 w-4" />
                Agregar Caso
              </Button>
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
                  <p className="text-lg font-bold">{caseCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Plan</p>
                  <p className="text-lg font-bold capitalize">{tier}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Disponibles</p>
                  <p className="text-lg font-bold">{maxCases - caseCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Cases Table - Fills remaining space */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="flex-shrink-0">
          <CardTitle>Lista de Casos</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto pb-2">
          {!casesWithAlerts || casesWithAlerts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {isCollaborator
                  ? 'No tienes casos asignados aún'
                  : 'No tiene casos registrados aún'}
              </p>
              {!isCollaborator && (
                <Button onClick={() => setAddDialogOpen(true)}>Agregar su primer caso</Button>
              )}
            </div>
          ) : (
            <CasesTable cases={casesWithAlerts} onDelete={onDelete} onUpdate={onUpdate} readOnly={isCollaborator} />
          )}
        </CardContent>
      </Card>

      {/* Add Case Dialog (master only) */}
      {!isCollaborator && (
        <>
          <AddCaseDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
          <ImportCasesDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
        </>
      )}
    </div>
  )
}
