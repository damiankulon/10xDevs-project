import { memo } from 'react';
import type { StatsPeriod } from '@shared/types';
import { Button } from '@/components/ui/button';

interface TimeRangeSelectorProps {
  value: StatsPeriod;
  onChange: (period: StatsPeriod) => void;
}

const TIME_RANGES: { value: StatsPeriod; label: string }[] = [
  { value: '7d', label: '7 dni' },
  { value: '30d', label: '30 dni' },
  { value: '90d', label: '90 dni' },
  { value: '1y', label: '1 rok' },
  { value: 'all', label: 'Wszystko' },
];

export const TimeRangeSelector = memo(function TimeRangeSelector({
  value,
  onChange,
}: TimeRangeSelectorProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        Okres:
      </span>
      <div className="flex gap-1 bg-muted p-1 rounded-lg">
        {TIME_RANGES.map((range) => (
          <Button
            key={range.value}
            variant={value === range.value ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onChange(range.value)}
            className="whitespace-nowrap"
          >
            {range.label}
          </Button>
        ))}
      </div>
    </div>
  );
});
