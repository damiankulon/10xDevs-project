import { useState } from 'react';
import type {
  TrackerDetailResponseDto,
  CreateEntryCommand,
  ScaleConfig,
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

interface AddEntryBottomSheetProps {
  tracker: TrackerDetailResponseDto;
  isOpen: boolean;
  onClose: () => void;
  onEntryAdded: () => void;
}

export function AddEntryBottomSheet({
  tracker,
  isOpen,
  onClose,
  onEntryAdded,
}: AddEntryBottomSheetProps) {
  const [value, setValue] = useState<string>('');
  const [recordedAt, setRecordedAt] = useState<string>(
    new Date().toISOString().slice(0, 16)
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

          // Validate scale range
          if (tracker.data_type === 'scale' && tracker.config) {
            const config = tracker.config as ScaleConfig;
            if (parsedValue < config.min || parsedValue > config.max) {
              throw new Error(
                `Wartość musi być między ${config.min} a ${config.max}`
              );
            }
          }
          break;
        case 'boolean':
          parsedValue = value === 'true' || value === '1';
          break;
        case 'text':
          if (!value.trim()) {
            throw new Error('Wartość nie może być pusta');
          }
          parsedValue = value.trim();
          break;
        default:
          parsedValue = value;
      }

      const command: CreateEntryCommand = {
        value: parsedValue,
        recorded_at: new Date(recordedAt).toISOString(),
      };

      await trackersApi.createEntry(tracker.id, command);

      // Reset form
      setValue('');
      setRecordedAt(new Date().toISOString().slice(0, 16));

      onEntryAdded();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Nie udało się dodać wpisu'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setValue('');
    setRecordedAt(new Date().toISOString().slice(0, 16));
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dodaj wpis - {tracker.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="value">
              Wartość
              {tracker.data_type === 'scale' && tracker.config && (
                <span className="text-muted-foreground ml-2">
                  ({(tracker.config as ScaleConfig).min} -{' '}
                  {(tracker.config as ScaleConfig).max})
                </span>
              )}
            </Label>

            {tracker.data_type === 'boolean' ? (
              <select
                id="value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              >
                <option value="">Wybierz...</option>
                <option value="true">Tak</option>
                <option value="false">Nie</option>
              </select>
            ) : tracker.data_type === 'scale' ? (
              <div className="space-y-2">
                <Input
                  id="value"
                  type="number"
                  step="any"
                  min={(tracker.config as ScaleConfig)?.min}
                  max={(tracker.config as ScaleConfig)?.max}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={`${(tracker.config as ScaleConfig)?.min} - ${(tracker.config as ScaleConfig)?.max}`}
                  required
                />
                <input
                  type="range"
                  min={(tracker.config as ScaleConfig)?.min}
                  max={(tracker.config as ScaleConfig)?.max}
                  step="any"
                  value={value || (tracker.config as ScaleConfig)?.min}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full"
                />
              </div>
            ) : (
              <Input
                id="value"
                type={tracker.data_type === 'number' ? 'number' : 'text'}
                step={tracker.data_type === 'number' ? 'any' : undefined}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={
                  tracker.data_type === 'number'
                    ? 'Wprowadź liczbę'
                    : 'Wprowadź tekst'
                }
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
            <p className="text-xs text-muted-foreground">
              Możesz wybrać datę z przeszłości lub teraźniejszości
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Dodawanie...' : 'Dodaj wpis'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
