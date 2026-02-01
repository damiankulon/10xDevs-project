import { useState } from 'react';
import type {
  EntryResponseDto,
  TrackerDetailResponseDto,
  UpdateEntryCommand,
} from '@shared/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trackersApi } from '@/lib/api/trackers';
import { AlertCircle } from 'lucide-react';

interface EditEntryModalProps {
  entry: EntryResponseDto;
  tracker: TrackerDetailResponseDto;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditEntryModal({
  entry,
  tracker,
  isOpen,
  onClose,
  onSuccess,
}: EditEntryModalProps) {
  const [value, setValue] = useState<string>(String(entry.value));
  const [recordedAt, setRecordedAt] = useState<string>(
    new Date(entry.recorded_at).toISOString().slice(0, 16)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      let parsedValue: number | boolean | string;

      switch (tracker.data_type) {
        case 'number':
        case 'scale':
          parsedValue = parseFloat(value);
          if (isNaN(parsedValue)) {
            throw new Error('Wartość musi być liczbą');
          }
          break;
        case 'boolean':
          parsedValue = value === 'true' || value === '1';
          break;
        case 'text':
          parsedValue = value;
          break;
        default:
          parsedValue = value;
      }

      const command: UpdateEntryCommand = {
        value: parsedValue,
        recorded_at: new Date(recordedAt).toISOString(),
      };

      await trackersApi.updateEntry(entry.tracker_id, entry.id, command);
      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Nie udało się zaktualizować wpisu'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edytuj wpis</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="value">Wartość</Label>
            {tracker.data_type === 'boolean' ? (
              <select
                id="value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="true">Tak</option>
                <option value="false">Nie</option>
              </select>
            ) : (
              <Input
                id="value"
                type={
                  tracker.data_type === 'number' ||
                  tracker.data_type === 'scale'
                    ? 'number'
                    : 'text'
                }
                step={
                  tracker.data_type === 'number' ||
                  tracker.data_type === 'scale'
                    ? 'any'
                    : undefined
                }
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
              />
            )}
            {tracker.unit && tracker.data_type === 'number' && (
              <p className="text-sm text-muted-foreground">
                Jednostka: {tracker.unit}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="recorded_at">Data i czas</Label>
            <Input
              id="recorded_at"
              type="datetime-local"
              value={recordedAt}
              onChange={(e) => setRecordedAt(e.target.value)}
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Zapisywanie...' : 'Zapisz'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
