'use client'

import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { JuicioAlimentosForm } from '@/components/templates/juicio-alimentos-form'

export default function TemplatePage() {
    const params = useParams()
    const router = useRouter()
    const templateId = params.templateId as string

    const renderForm = () => {
        switch (templateId) {
            case 'juicio-alimentos':
                return <JuicioAlimentosForm />
            default:
                return <div>Plantilla no encontrada</div>
        }
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex items-center gap-4 flex-shrink-0">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight capitalize">
                        {templateId.replace('-', ' ')}
                    </h1>
                </div>
            </div>

            <div className="flex-1 min-h-0">
                {renderForm()}
            </div>
        </div>
    )
}
