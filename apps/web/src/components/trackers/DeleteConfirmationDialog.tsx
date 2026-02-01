import { useState } from 'react';
import type { EntryResponseDto } from '@shared/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trackersApi } from '@/lib/api/trackers';
import { AlertCircle, AlertTriangle } from 'lucide-react';

interface DeleteConfirmationDialogProps {
  entry: EntryResponseDto;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteConfirmationDialog({
  entry,
  isOpen,
  onClose,
  onSuccess,
}: DeleteConfirmationDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);
    setIsDeleting(true);

    try {
      await trackersApi.deleteEntry(entry.tracker_id, entry.id);
      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Nie udało się usunąć wpisu'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Usuń wpis
          </DialogTitle>
          <DialogDescription>
            Czy na pewno chcesz usunąć ten wpis? Ta operacja jest nieodwracalna.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="rounded-lg border p-4 bg-muted">
          <p className="text-sm font-medium">
            Wartość:{' '}
            <span className="font-semibold">{String(entry.value)}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Data: {new Date(entry.recorded_at).toLocaleString('pl-PL')}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Anuluj
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Usuwanie...' : 'Usuń'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
