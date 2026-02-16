import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye } from 'lucide-react';

/**
 * Banner component to indicate read-only mode for collaborators
 *
 * Displays a prominent blue alert at the top of pages to remind
 * collaborators they have view-only access and cannot modify data.
 */
export function ReadOnlyBanner() {
  return (
    <Alert className="mb-4 bg-blue-50 border-blue-200">
      <Eye className="h-4 w-4 text-blue-600" />
      <AlertDescription className="text-blue-900">
        Estás en modo de solo lectura. No puedes crear, editar o eliminar casos.
      </AlertDescription>
    </Alert>
  );
}
