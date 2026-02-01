import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AddEntryFABProps {
  onClick: () => void;
}

export function AddEntryFAB({ onClick }: AddEntryFABProps) {
  return (
    <Button
      onClick={onClick}
      size="lg"
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
    >
      <Plus className="h-6 w-6" />
      <span className="sr-only">Dodaj wpis</span>
    </Button>
  );
}
