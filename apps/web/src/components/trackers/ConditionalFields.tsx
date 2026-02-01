import { DataType } from '@shared/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type {
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
  FieldErrors,
} from 'react-hook-form';
import type { CreateTrackerFormData } from './types';
import { useEffect, useState } from 'react';

interface ConditionalFieldsProps {
  dataType: DataType;
  register: UseFormRegister<CreateTrackerFormData>;
  setValue: UseFormSetValue<CreateTrackerFormData>;
  watch: UseFormWatch<CreateTrackerFormData>;
  errors: FieldErrors<CreateTrackerFormData>;
  disabled?: boolean;
}

export function ConditionalFields({
  dataType,
  register,
  setValue,
  watch,
  errors,
  disabled,
}: ConditionalFieldsProps) {
  const minValue = watch('config.min');
  const maxValue = watch('config.max');
  const [scaleError, setScaleError] = useState<string | null>(null);

  // Reset conditional fields when data type changes
  useEffect(() => {
    if (dataType !== DataType.NUMBER) {
      setValue('unit', undefined);
    }
    if (dataType !== DataType.SCALE) {
      setValue('config', undefined);
      setScaleError(null);
    }
  }, [dataType, setValue]);

  // Validate min < max for scale in real-time
  useEffect(() => {
    if (
      dataType === DataType.SCALE &&
      minValue !== undefined &&
      maxValue !== undefined
    ) {
      if (minValue >= maxValue) {
        setScaleError('Wartość minimalna musi być mniejsza niż maksymalna');
      } else {
        setScaleError(null);
      }
    }
  }, [dataType, minValue, maxValue]);

  if (dataType === DataType.NUMBER) {
    return (
      <div className="space-y-2 animate-in fade-in-50 duration-300">
        <Label htmlFor="unit" className="text-sm font-medium">
          Jednostka (opcjonalnie)
        </Label>
        <Input
          id="unit"
          type="text"
          placeholder="np. km, kg, godzin, litrów..."
          {...register('unit')}
          disabled={disabled}
          maxLength={20}
          aria-invalid={!!errors.unit}
          aria-describedby={errors.unit ? 'unit-error' : 'unit-help'}
          className={
            errors.unit
              ? 'border-destructive focus-visible:ring-destructive'
              : ''
          }
        />
        {errors.unit ? (
          <p id="unit-error" className="text-sm text-destructive" role="alert">
            {errors.unit.message}
          </p>
        ) : (
          <p id="unit-help" className="text-sm text-muted-foreground">
            Jednostka miary dla wartości liczbowych (maks. 20 znaków)
          </p>
        )}
      </div>
    );
  }

  if (dataType === DataType.SCALE) {
    return (
      <div className="space-y-3 animate-in fade-in-50 duration-300">
        <Label className="text-sm font-medium">
          Konfiguracja skali <span className="text-destructive">*</span>
        </Label>
        <p className="text-sm text-muted-foreground">
          Określ zakres skali dla ocen
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="config-min" className="text-sm">
              Minimum
            </Label>
            <Input
              id="config-min"
              type="number"
              placeholder="0"
              {...register('config.min', {
                setValueAs: (v) => (v === '' ? undefined : Number(v)),
              })}
              disabled={disabled}
              aria-invalid={!!errors.config?.min}
              className={
                errors.config?.min
                  ? 'border-destructive focus-visible:ring-destructive'
                  : ''
              }
            />
            {errors.config?.min && (
              <p className="text-sm text-destructive" role="alert">
                {errors.config.min.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="config-max" className="text-sm">
              Maksimum
            </Label>
            <Input
              id="config-max"
              type="number"
              placeholder="10"
              {...register('config.max', {
                setValueAs: (v) => (v === '' ? undefined : Number(v)),
              })}
              disabled={disabled}
              aria-invalid={!!errors.config?.max}
              className={
                errors.config?.max
                  ? 'border-destructive focus-visible:ring-destructive'
                  : ''
              }
            />
            {errors.config?.max && (
              <p className="text-sm text-destructive" role="alert">
                {errors.config.max.message}
              </p>
            )}
          </div>
        </div>
        {scaleError && (
          <p
            className="text-sm text-destructive animate-in fade-in-50 duration-200"
            role="alert"
          >
            {scaleError}
          </p>
        )}
      </div>
    );
  }

  return null;
}
