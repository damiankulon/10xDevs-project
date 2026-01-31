import { memo } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Hash, Gauge, ToggleLeft, Type } from 'lucide-react';
import { DataType } from '@shared/types';
import type { DataTypeOption } from './types';

interface DataTypeSelectorProps {
  value: DataType;
  onChange: (value: DataType) => void;
  error?: string;
  disabled?: boolean;
}

const dataTypeOptions: DataTypeOption[] = [
  {
    type: DataType.NUMBER,
    label: 'Liczba',
    description: 'Wartości liczbowe (np. km, kg, godziny)',
    icon: <Hash className="h-5 w-5" />,
  },
  {
    type: DataType.SCALE,
    label: 'Skala',
    description: 'Ocena w zakresie (np. 1-10, 1-5)',
    icon: <Gauge className="h-5 w-5" />,
  },
  {
    type: DataType.BOOLEAN,
    label: 'Tak/Nie',
    description: 'Prosta odpowiedź tak lub nie',
    icon: <ToggleLeft className="h-5 w-5" />,
  },
  {
    type: DataType.TEXT,
    label: 'Tekst',
    description: 'Notatki tekstowe lub komentarze',
    icon: <Type className="h-5 w-5" />,
  },
];

export const DataTypeSelector = memo(function DataTypeSelector({
  value,
  onChange,
  error,
  disabled,
}: DataTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">
        Typ danych <span className="text-destructive">*</span>
      </Label>
      <RadioGroup
        value={value}
        onValueChange={(val) => onChange(val as DataType)}
        disabled={disabled}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        {dataTypeOptions.map((option) => (
          <Label
            key={option.type}
            htmlFor={`data-type-${option.type}`}
            className="cursor-pointer"
          >
            <Card
              className={`
                relative p-4 transition-all duration-200 cursor-pointer
                hover:border-primary hover:shadow-md hover:scale-[1.02]
                ${value === option.type ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20' : ''}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div className="flex items-start gap-3">
                <RadioGroupItem
                  id={`data-type-${option.type}`}
                  value={option.type}
                  className="mt-0.5"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={
                        value === option.type
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      }
                    >
                      {option.icon}
                    </div>
                    <span className="font-medium text-sm">{option.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </div>
            </Card>
          </Label>
        ))}
      </RadioGroup>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});
