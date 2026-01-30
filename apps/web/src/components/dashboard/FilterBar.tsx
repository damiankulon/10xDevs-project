import { Button } from '@/components/ui/button';

interface FilterBarProps {
  activeFilter: 'all' | 'own' | 'shared';
  onFilterChange: (filter: 'all' | 'own' | 'shared') => void;
}

export function FilterBar({ activeFilter, onFilterChange }: FilterBarProps) {
  const filters = [
    { value: 'all' as const, label: 'Wszystkie' },
    { value: 'own' as const, label: 'Moje' },
    { value: 'shared' as const, label: 'Udostępnione' },
  ];

  return (
    <div className="flex gap-2">
      {filters.map((filter) => (
        <Button
          key={filter.value}
          variant={activeFilter === filter.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange(filter.value)}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );
}
