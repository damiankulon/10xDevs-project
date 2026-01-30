import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface RefreshButtonProps {
  onRefresh: () => void;
  isLoading?: boolean;
}

export function RefreshButton({
  onRefresh,
  isLoading = false,
}: RefreshButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onRefresh}
      disabled={isLoading}
      aria-label="Odśwież dane"
    >
      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
    </Button>
  );
}
