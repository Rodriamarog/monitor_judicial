'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import { CasesTable } from '@/components/cases-table'
import { DowngradeBlockedAlert } from '@/components/downgrade-blocked-alert'
import { StaleCasesAlert } from '@/components/stale-cases-alert'
import { AddCaseDialog } from '@/components/add-case-dialog'

interface DashboardClientProps {
  casesWithAlerts: any[]
  caseCount: number
  maxCases: number
  tier: string
  showDowngradeAlert: boolean
  staleCaseCount: number
  onDelete: (caseId: string) => void
  onUpdate: (caseId: string, updates: any) => Promise<void>
}

export function DashboardClient({
  casesWithAlerts,
  caseCount,
  maxCases,
  tier,
  showDowngradeAlert,
  staleCaseCount,
  onDelete,
  onUpdate,
}: DashboardClientProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  return (
    <div className="space-y-6">
      {/* Downgrade Blocked Alert */}
      {showDowngradeAlert && (
        <DowngradeBlockedAlert
          caseCount={caseCount}
          maxCasesForNewTier={50} // We'll need to store the target tier, for now assume Pro 50
          targetTier="Pro 50"
        />
      )}

      {/* Stale Cases Alert */}
      <StaleCasesAlert staleCaseCount={staleCaseCount} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mis Casos</h1>
          <p className="text-muted-foreground">
            {caseCount} de {maxCases} casos monitoreados
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="gap-2 cursor-pointer">
          <Plus className="h-4 w-4" />
          Agregar Caso
        </Button>
      </div>

      {/* Compact Stats Card */}
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

      {/* Cases Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Casos</CardTitle>
        </CardHeader>
        <CardContent>
          {!casesWithAlerts || casesWithAlerts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No tiene casos registrados aún
              </p>
              <Button onClick={() => setAddDialogOpen(true)}>Agregar su primer caso</Button>
            </div>
          ) : (
            <CasesTable cases={casesWithAlerts} onDelete={onDelete} onUpdate={onUpdate} />
          )}
        </CardContent>
      </Card>

      {/* Add Case Dialog */}
      <AddCaseDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </div>
  )
}
