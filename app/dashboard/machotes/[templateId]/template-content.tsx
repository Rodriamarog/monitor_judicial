'use client'

import { JuicioAlimentosForm } from '@/components/templates/juicio-alimentos-form'
import { JuicioPlenarioPosesionForm } from '@/components/templates/juicio-plenario-posesion-form'
import { JurisdiccionConcubinatoForm } from '@/components/templates/jurisdiccion-concubinato-form'
import { OfrecimientoPruebasForm } from '@/components/templates/ofrecimiento-pruebas-form'
import { PrescripcionForm } from '@/components/templates/prescripcion-form'

export function TemplateContent({ templateId }: { templateId: string }) {
    const renderForm = () => {
        switch (templateId) {
            case 'juicio-alimentos':
                return <JuicioAlimentosForm />
            case 'juicio-plenario-posesion':
                return <JuicioPlenarioPosesionForm />
            case 'jurisdiccion-concubinato':
                return <JurisdiccionConcubinatoForm />
            case 'ofrecimiento-pruebas':
                return <OfrecimientoPruebasForm />
            case 'prescripcion':
                return <PrescripcionForm />
            default:
                return <div>Plantilla no encontrada</div>
        }
    }

    return (
        <div className="h-full flex flex-col">
            <div className="flex-1 min-h-0">
                {renderForm()}
            </div>
        </div>
    )
}
