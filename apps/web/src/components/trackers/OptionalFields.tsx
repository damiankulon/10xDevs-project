import { useState, memo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import type {
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
  FieldErrors,
} from 'react-hook-form';
import type { CreateTrackerFormData } from './types';

interface OptionalFieldsProps {
  register: UseFormRegister<CreateTrackerFormData>;
  setValue: UseFormSetValue<CreateTrackerFormData>;
  watch: UseFormWatch<CreateTrackerFormData>;
  errors: FieldErrors<CreateTrackerFormData>;
  disabled?: boolean;
}

export const OptionalFields = memo(function OptionalFields({
  register,
  setValue,
  watch,
  errors,
  disabled,
}: OptionalFieldsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const colorValue = watch('color');

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger
        className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors w-full py-2"
        disabled={disabled}
      >
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
        Opcje zaawansowane
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 pt-2">
        <div className="space-y-2">
          <Label htmlFor="color" className="text-sm font-medium">
            Kolor
          </Label>
          <div className="flex gap-3 items-center">
            <div className="relative">
              <Input
                id="color"
                type="color"
                {...register('color')}
                disabled={disabled}
                className="w-20 h-10 cursor-pointer p-1 border-2"
                aria-invalid={!!errors.color}
              />
              <div
                className="absolute inset-1 rounded pointer-events-none border border-border/50"
                style={{ backgroundColor: colorValue || '#3b82f6' }}
              />
            </div>
            <Input
              type="text"
              value={colorValue || '#3b82f6'}
              onChange={(e) => {
                const value = e.target.value;
                if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                  setValue('color', value);
                }
              }}
              disabled={disabled}
              placeholder="#3b82f6"
              maxLength={7}
              className="flex-1"
              aria-label="Kod koloru hex"
            />
          </div>
          {errors.color ? (
            <p className="text-sm text-destructive" role="alert">
              {errors.color.message}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Wybierz kolor dla wizualizacji trackera
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="icon" className="text-sm font-medium">
            Ikona (opcjonalnie)
          </Label>
          <Input
            id="icon"
            type="text"
            placeholder="np. trophy, heart, target..."
            {...register('icon')}
            disabled={disabled}
            maxLength={50}
            aria-invalid={!!errors.icon}
            aria-describedby={errors.icon ? 'icon-error' : 'icon-help'}
            className={
              errors.icon
                ? 'border-destructive focus-visible:ring-destructive'
                : ''
            }
          />
          {errors.icon ? (
            <p
              id="icon-error"
              className="text-sm text-destructive"
              role="alert"
            >
              {errors.icon.message}
            </p>
          ) : (
            <p id="icon-help" className="text-sm text-muted-foreground">
              Nazwa ikony z biblioteki Lucide (maks. 50 znaków)
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});
