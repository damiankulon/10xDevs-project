import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Plus } from 'lucide-react';

interface EmptyStateProps {
  onCreateTracker?: () => void;
}

export function EmptyState({ onCreateTracker }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center min-h-125">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Plus className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Brak trackerów</CardTitle>
          <CardDescription className="text-base">
            Nie masz jeszcze żadnych trackerów. Utwórz pierwszy tracker, aby
            zacząć śledzić swoje dane.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={onCreateTracker}
            size="lg"
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Utwórz pierwszy tracker
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
