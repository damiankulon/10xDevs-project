import { memo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { UseFormRegister } from 'react-hook-form';
import type { CreateTrackerFormData } from './types';

interface TrackerNameInputProps {
  register: UseFormRegister<CreateTrackerFormData>;
  error?: string;
  disabled?: boolean;
}

export const TrackerNameInput = memo(function TrackerNameInput({
  register,
  error,
  disabled,
}: TrackerNameInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="name" className="text-sm font-medium">
        Nazwa trackera <span className="text-destructive">*</span>
      </Label>
      <Input
        id="name"
        type="text"
        placeholder="np. Trening, Nastrój, Waga..."
        {...register('name')}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? 'name-error' : undefined}
        maxLength={100}
        className={
          error ? 'border-destructive focus-visible:ring-destructive' : ''
        }
      />
      <div className="flex justify-between items-center min-h-[1.25rem]">
        {error ? (
          <p id="name-error" className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Wybierz krótką, opisową nazwę dla swojego trackera
          </p>
        )}
      </div>
    </div>
  );
});
