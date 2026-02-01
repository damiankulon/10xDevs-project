import { memo } from 'react';
import { ArrowLeft, MoreVertical, Edit, Share2, Trash2 } from 'lucide-react';
import type { TrackerDetailResponseDto, DataType } from '@shared/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TrackerDetailHeaderProps {
  tracker: TrackerDetailResponseDto;
  onBack: () => void;
  onEdit?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
}

const DATA_TYPE_LABELS: Record<DataType, string> = {
  number: 'Liczba',
  scale: 'Skala',
  boolean: 'Tak/Nie',
  text: 'Tekst',
};

export const TrackerDetailHeader = memo(function TrackerDetailHeader({
  tracker,
  onBack,
  onEdit,
  onShare,
  onDelete,
}: TrackerDetailHeaderProps) {
  const isOwner = tracker.is_owner;

  return (
    <div className="flex flex-col gap-4">
      {/* Top row: Back button and actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Powrót</span>
        </Button>

        {isOwner && (onEdit || onShare || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
                <span className="sr-only">Więcej akcji</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edytuj tracker
                </DropdownMenuItem>
              )}
              {onShare && (
                <DropdownMenuItem onClick={onShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Udostępnij
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Usuń
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Title and badges */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          {tracker.color && (
            <div
              className="w-1 h-8 rounded-full"
              style={{ backgroundColor: tracker.color }}
            />
          )}
          <h1 className="text-3xl font-bold tracking-tight">{tracker.name}</h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            {DATA_TYPE_LABELS[tracker.data_type]}
          </Badge>

          {tracker.data_type === 'number' && tracker.unit && (
            <Badge variant="outline">{tracker.unit}</Badge>
          )}

          {tracker.data_type === 'scale' &&
            tracker.config &&
            'min' in tracker.config && (
              <Badge variant="outline">
                {String(tracker.config.min)} - {String(tracker.config.max)}
              </Badge>
            )}

          {!isOwner && (
            <Badge variant="default" className="bg-blue-500">
              Udostępniony
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
});
