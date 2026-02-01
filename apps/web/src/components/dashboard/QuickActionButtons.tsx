import { Button } from '@/components/ui/button';
import { Plus, Eye } from 'lucide-react';

interface QuickActionButtonsProps {
  trackerId: string;
  onAddEntry: () => void;
  onViewDetails: () => void;
}

export function QuickActionButtons({
  onAddEntry,
  onViewDetails,
}: QuickActionButtonsProps) {
  return (
    <div className="quick-action-buttons flex gap-2 mt-4">
      <Button
        variant="default"
        size="sm"
        className="flex-1"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onAddEntry();
        }}
        aria-label="Dodaj nowy wpis"
      >
        <Plus className="h-4 w-4 mr-1" />
        Dodaj wpis
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onViewDetails();
        }}
        aria-label="Zobacz szczegóły trackera"
      >
        <Eye className="h-4 w-4" />
      </Button>
    </div>
  );
}
