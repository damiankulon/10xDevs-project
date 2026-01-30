import { Button } from '@/components/ui/button';

interface EditLayoutToggleProps {
  isEditMode: boolean;
  onToggle: () => void;
}

export function EditLayoutToggle({
  isEditMode,
  onToggle,
}: EditLayoutToggleProps) {
  return (
    <Button
      variant={isEditMode ? 'default' : 'outline'}
      size="sm"
      onClick={onToggle}
      aria-pressed={isEditMode}
    >
      {isEditMode ? 'Zakończ edycję' : 'Edytuj układ'}
    </Button>
  );
}
