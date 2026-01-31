import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { CreateTrackerForm } from './CreateTrackerForm';
import type { CreateTrackerModalProps } from './types';

export function CreateTrackerModal({
  isOpen,
  onClose,
  onSuccess,
  trackerLimit = 50,
  currentTrackerCount = 0,
}: CreateTrackerModalProps) {
  const isNearLimit = currentTrackerCount >= trackerLimit * 0.8;
  const isAtLimit = currentTrackerCount >= trackerLimit;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-150 max-h-[90vh] overflow-y-auto"
        onOpenAutoFocus={(e) => {
          // Prevent auto focus on dialog open to avoid scroll jump
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Utwórz nowy tracker</DialogTitle>
        </DialogHeader>

        {isNearLimit && !isAtLimit && (
          <Alert
            variant="default"
            className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950"
          >
            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              Zbliżasz się do limitu trackerów ({currentTrackerCount}/
              {trackerLimit})
            </AlertDescription>
          </Alert>
        )}

        {isAtLimit && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Osiągnięto limit trackerów ({trackerLimit}). Usuń niektóre
              trackery, aby utworzyć nowe.
            </AlertDescription>
          </Alert>
        )}

        <CreateTrackerForm
          onSuccess={(tracker) => {
            onSuccess?.(tracker);
            onClose();
          }}
          onCancel={onClose}
          disabled={isAtLimit}
        />
      </DialogContent>
    </Dialog>
  );
}
