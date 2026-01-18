'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface CollaboratorSelectorProps {
  selectedEmails: string[];
  onSelectionChange: (emails: string[]) => void;
  availableCollaborators: string[];
  disabled?: boolean;
}

export function CollaboratorSelector({
  selectedEmails,
  onSelectionChange,
  availableCollaborators,
  disabled = false,
}: CollaboratorSelectorProps) {
  const handleToggle = (email: string) => {
    if (selectedEmails.includes(email)) {
      // Remove from selection
      onSelectionChange(selectedEmails.filter((e) => e !== email));
    } else {
      // Add to selection
      onSelectionChange([...selectedEmails, email]);
    }
  };

  if (availableCollaborators.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {availableCollaborators.map((email) => (
          <div key={email} className="flex items-center space-x-2">
            <Checkbox
              id={`collab-${email}`}
              checked={selectedEmails.includes(email)}
              onCheckedChange={() => handleToggle(email)}
              disabled={disabled}
            />
            <Label
              htmlFor={`collab-${email}`}
              className="text-sm font-normal cursor-pointer"
            >
              {email}
            </Label>
          </div>
        ))}
      </div>

      <div className="text-xs text-muted-foreground">
        {selectedEmails.length} de {availableCollaborators.length} colaborador
        {availableCollaborators.length !== 1 ? 'es' : ''} seleccionado
        {selectedEmails.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
