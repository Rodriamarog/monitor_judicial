import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2 } from 'lucide-react'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user's monitored cases
  const { data: cases, error } = await supabase
    .from('monitored_cases')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Get user profile for tier info
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single()

  const caseCount = cases?.length || 0
  const tier = profile?.subscription_tier || 'free'
  const maxCases = tier === 'free' ? 10 : tier === 'basic' ? 100 : 500

  const handleDelete = async (caseId: string) => {
    'use server'
    const supabase = await createClient()
    await supabase.from('monitored_cases').delete().eq('id', caseId)
    revalidatePath('/dashboard')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mis Casos</h1>
          <p className="text-muted-foreground">
            {caseCount} de {maxCases} casos monitoreados
          </p>
        </div>
        <Link href="/dashboard/add">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Agregar Caso
          </Button>
        </Link>
      </div>

      {/* Stats Card */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Casos Monitoreados</CardDescription>
            <CardTitle className="text-3xl">{caseCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Plan Actual</CardDescription>
            <CardTitle className="text-3xl capitalize">{tier}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Disponibles</CardDescription>
            <CardTitle className="text-3xl">{maxCases - caseCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Cases Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Casos</CardTitle>
          <CardDescription>
            Todos los casos que está monitoreando actualmente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!cases || cases.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No tiene casos registrados aún
              </p>
              <Link href="/dashboard/add">
                <Button>Agregar su primer caso</Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número de Caso</TableHead>
                  <TableHead>Juzgado</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Fecha de Registro</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map((case_) => (
                  <TableRow key={case_.id}>
                    <TableCell className="font-mono">{case_.case_number}</TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate">{case_.juzgado}</div>
                    </TableCell>
                    <TableCell>{case_.nombre || '-'}</TableCell>
                    <TableCell>
                      {new Date(case_.created_at).toLocaleDateString('es-MX')}
                    </TableCell>
                    <TableCell className="text-right">
                      <form action={handleDelete.bind(null, case_.id)}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          Eliminar
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
