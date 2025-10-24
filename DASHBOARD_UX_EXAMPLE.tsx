// Updated Dashboard UI with new schema (case_number + juzgado + notes)

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default function DashboardPage() {
  return (
    <div className="container max-w-6xl py-10">
      {/* Add Case Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Agregar Caso a Monitorear</CardTitle>
          <CardDescription>
            Recibe una alerta por WhatsApp cuando tu caso aparezca en el boletín
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Case Number - Required */}
          <div className="space-y-2">
            <Label htmlFor="case_number">Número de Expediente *</Label>
            <Input
              id="case_number"
              placeholder="00696/2019"
              pattern="\d{4,5}/\d{4}"
              required
            />
            <p className="text-xs text-muted-foreground">
              Formato: 5 dígitos / 4 dígitos (ej: 00696/2019)
            </p>
          </div>

          {/* Juzgado Dropdown - Required */}
          <div className="space-y-2">
            <Label htmlFor="juzgado">Juzgado (Tribunal) *</Label>
            <Select required>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el juzgado" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Tijuana</SelectLabel>
                  <SelectItem value="JUZGADO PRIMERO CIVIL TIJUANA">
                    Juzgado Primero Civil
                  </SelectItem>
                  <SelectItem value="JUZGADO SEGUNDO CIVIL TIJUANA">
                    Juzgado Segundo Civil
                  </SelectItem>
                  <SelectItem value="JUZGADO TERCERO CIVIL TIJUANA">
                    Juzgado Tercero Civil
                  </SelectItem>
                  {/* ... add all Tijuana courts */}
                </SelectGroup>

                <SelectGroup>
                  <SelectLabel>Mexicali</SelectLabel>
                  <SelectItem value="JUZGADO PRIMERO CIVIL MEXICALI">
                    Juzgado Primero Civil
                  </SelectItem>
                  <SelectItem value="JUZGADO SEGUNDO CIVIL MEXICALI">
                    Juzgado Segundo Civil
                  </SelectItem>
                  {/* ... add all Mexicali courts */}
                </SelectGroup>

                <SelectGroup>
                  <SelectLabel>Ensenada</SelectLabel>
                  <SelectItem value="JUZGADO PRIMERO CIVIL ENSENADA">
                    Juzgado Primero Civil
                  </SelectItem>
                  {/* ... add all Ensenada courts */}
                </SelectGroup>

                <SelectGroup>
                  <SelectLabel>Tecate</SelectLabel>
                  <SelectItem value="JUZGADO DE 1ERA INST.CIVIL DE TECATE">
                    Juzgado Primera Instancia Civil
                  </SelectItem>
                </SelectGroup>

                <SelectGroup>
                  <SelectLabel>Segunda Instancia</SelectLabel>
                  <SelectItem value="PRIMERA SALA TRIBUNAL SUPERIOR">
                    Primera Sala
                  </SelectItem>
                  <SelectItem value="SEGUNDA SALA TRIBUNAL SUPERIOR">
                    Segunda Sala
                  </SelectItem>
                  {/* ... add all salas */}
                </SelectGroup>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              El caso se monitorea únicamente en este juzgado específico
            </p>
          </div>

          {/* Notes - Optional */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Cliente: Juan Pérez - Disputa de terreno en Tijuana"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Para tu referencia personal (no se usa en la búsqueda)
            </p>
          </div>

          <Button className="w-full">Agregar Caso</Button>
        </CardContent>
      </Card>

      {/* Monitored Cases List */}
      <Card>
        <CardHeader>
          <CardTitle>Casos Monitoreados</CardTitle>
          <CardDescription>
            5/10 casos utilizados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Expediente</TableHead>
                <TableHead>Juzgado</TableHead>
                <TableHead>Notas</TableHead>
                <TableHead>Alertas</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">00696/2019</TableCell>
                <TableCell>Juzgado Primero Civil Tijuana</TableCell>
                <TableCell className="text-muted-foreground">
                  Cliente: Juan Pérez
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">3 alertas</Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    Eliminar
                  </Button>
                </TableCell>
              </TableRow>
              {/* More rows... */}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Alertas Recientes</CardTitle>
          <CardDescription>
            Actualizaciones de tus casos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4 p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge>22/10/2025</Badge>
                  <Badge variant="outline">00696/2019</Badge>
                </div>
                <p className="font-medium">Juzgado Primero Civil Tijuana</p>
                <p className="text-sm text-muted-foreground mt-1">
                  CESAR ALEJANDRO REYES VELAZQUEZ VS SERGIO MONTERO GOMEZ
                </p>
                <a
                  href="https://www.pjbc.gob.mx/boletinj/..."
                  className="text-sm text-primary hover:underline mt-2 inline-block"
                  target="_blank"
                >
                  Ver boletín completo →
                </a>
              </div>
            </div>
            {/* More alerts... */}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
