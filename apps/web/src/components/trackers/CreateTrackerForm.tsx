import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createTrackerSchema,
  type CreateTrackerDto,
  type TrackerDetailResponseDto,
  DataType,
} from '@shared/types';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { TrackerNameInput } from './TrackerNameInput';
import { DataTypeSelector } from './DataTypeSelector';
import { ConditionalFields } from './ConditionalFields';
import { OptionalFields } from './OptionalFields';
import type { CreateTrackerFormData } from './types';
import { trackersApi } from '@/lib/api/trackers';

interface CreateTrackerFormProps {
  onSuccess: (tracker: TrackerDetailResponseDto) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export function CreateTrackerForm({
  onSuccess,
  onCancel,
  disabled,
}: CreateTrackerFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateTrackerFormData>({
    resolver: zodResolver(createTrackerSchema),
    defaultValues: {
      name: '',
      data_type: DataType.NUMBER,
      color: '#3b82f6',
    },
  });

  const dataType = watch('data_type');

  const handleDataTypeChange = useCallback(
    (value: DataType) => {
      setValue('data_type', value);
    },
    [setValue]
  );

  const onSubmit = async (data: CreateTrackerFormData) => {
    if (disabled) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Additional validation for scale type
      if (data.data_type === DataType.SCALE) {
        if (
          !data.config ||
          typeof data.config.min !== 'number' ||
          typeof data.config.max !== 'number'
        ) {
          setError('Dla typu Skala wymagane są wartości minimum i maximum');
          setIsSubmitting(false);
          return;
        }
        if (data.config.min >= data.config.max) {
          setError('Wartość minimalna musi być mniejsza niż maksymalna');
          setIsSubmitting(false);
          return;
        }
      }

      // Prepare the request payload
      const payload: CreateTrackerDto = {
        name: data.name.trim(),
        data_type: data.data_type,
        unit: data.unit?.trim() || undefined,
        config: data.config,
        color: data.color,
        icon: data.icon,
        display_order: data.display_order,
      };

      // Call API through client
      const tracker = await trackersApi.create(payload);
      onSuccess(tracker);
    } catch (err) {
      // Handle errors from API client
      const errorMessage =
        err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <Alert
          variant="destructive"
          className="animate-in fade-in-50 slide-in-from-top-2 duration-300"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <TrackerNameInput
        register={register}
        error={errors.name?.message}
        disabled={disabled || isSubmitting}
      />

      <DataTypeSelector
        value={dataType}
        onChange={handleDataTypeChange}
        error={errors.data_type?.message}
        disabled={disabled || isSubmitting}
      />

      <ConditionalFields
        dataType={dataType}
        register={register}
        setValue={setValue}
        watch={watch}
        errors={errors}
        disabled={disabled || isSubmitting}
      />

      <OptionalFields
        register={register}
        setValue={setValue}
        watch={watch}
        errors={errors}
        disabled={disabled || isSubmitting}
      />

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Anuluj
        </Button>
        <Button type="submit" disabled={disabled || isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Tworzenie...
            </>
          ) : (
            'Utwórz tracker'
          )}
        </Button>
      </div>
    </form>
  );
}
