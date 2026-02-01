import { useState, useEffect, useRef } from 'react';
import type {
  TrackerDetailResponseDto,
  EntryListResponseDto,
  EntryResponseDto,
  SortOrder,
  EntryValue,
} from '@shared/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpDown, Calendar, Edit, Trash2 } from 'lucide-react';
import { EditEntryModal } from './EditEntryModal';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';

interface EntriesSectionProps {
  tracker: TrackerDetailResponseDto;
  entries: EntryListResponseDto | null;
  sortOrder: SortOrder;
  isLoading: boolean;
  onSortOrderChange: (order: SortOrder) => void;
  onLoadMore: () => void;
  onEntryUpdated: () => void;
  onEntryDeleted: () => void;
}

export function EntriesSection({
  tracker,
  entries,
  sortOrder,
  isLoading,
  onSortOrderChange,
  onLoadMore,
  onEntryUpdated,
  onEntryDeleted,
}: EntriesSectionProps) {
  const [editingEntry, setEditingEntry] = useState<EntryResponseDto | null>(
    null
  );
  const [deletingEntry, setDeletingEntry] = useState<EntryResponseDto | null>(
    null
  );
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [isLoading, onLoadMore]);

  const handleToggleSort = () => {
    onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const handleEditEntry = (entry: EntryResponseDto) => {
    setEditingEntry(entry);
  };

  const handleDeleteEntry = (entry: EntryResponseDto) => {
    setDeletingEntry(entry);
  };

  const handleEditSuccess = () => {
    setEditingEntry(null);
    onEntryUpdated();
  };

  const handleDeleteSuccess = () => {
    setDeletingEntry(null);
    onEntryDeleted();
  };

  if (!entries && isLoading) {
    return <EntriesListSkeleton />;
  }

  if (!entries || entries.data.length === 0) {
    return <EmptyEntriesState />;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Historia wpisów</CardTitle>
              <p className="text-sm text-muted-foreground">
                {entries.pagination.total_items}{' '}
                {entries.pagination.total_items === 1 ? 'wpis' : 'wpisów'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleSort}
              className="gap-2"
            >
              <ArrowUpDown className="h-4 w-4" />
              {sortOrder === 'desc' ? 'Najnowsze' : 'Najstarsze'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {entries.data.map((entry) => (
              <EntryItem
                key={entry.id}
                entry={entry}
                tracker={tracker}
                onEdit={handleEditEntry}
                onDelete={handleDeleteEntry}
              />
            ))}

            {/* Load more trigger */}
            {entries.pagination.page < entries.pagination.total_pages && (
              <div ref={loadMoreRef} className="py-4 text-center">
                {isLoading && <Skeleton className="h-16 w-full" />}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {editingEntry && (
        <EditEntryModal
          entry={editingEntry}
          tracker={tracker}
          isOpen={!!editingEntry}
          onClose={() => setEditingEntry(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Delete Dialog */}
      {deletingEntry && (
        <DeleteConfirmationDialog
          entry={deletingEntry}
          isOpen={!!deletingEntry}
          onClose={() => setDeletingEntry(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </>
  );
}

interface EntryItemProps {
  entry: EntryResponseDto;
  tracker: TrackerDetailResponseDto;
  onEdit: (entry: EntryResponseDto) => void;
  onDelete: (entry: EntryResponseDto) => void;
}

function EntryItem({ entry, tracker, onEdit, onDelete }: EntryItemProps) {
  const formattedValue = formatEntryValue(entry.value, tracker);
  const relativeTime = formatRelativeTime(entry.recorded_at);
  const absoluteTime = new Date(entry.recorded_at).toLocaleString('pl-PL');

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">{formattedValue}</span>
          {tracker.unit && tracker.data_type === 'number' && (
            <span className="text-sm text-muted-foreground">
              {tracker.unit}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span title={absoluteTime}>{relativeTime}</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(entry)}
          title="Edytuj wpis"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(entry)}
          title="Usuń wpis"
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function formatEntryValue(
  value: EntryValue,
  tracker: TrackerDetailResponseDto
): string {
  switch (tracker.data_type) {
    case 'number':
    case 'scale':
      return typeof value === 'number' ? value.toFixed(2) : String(value);
    case 'boolean':
      return value ? 'Tak' : 'Nie';
    case 'text':
      return String(value);
    default:
      return String(value);
  }
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Teraz';
  if (diffMins < 60) return `${diffMins} min temu`;
  if (diffHours < 24) return `${diffHours} godz. temu`;
  if (diffDays < 7) return `${diffDays} dni temu`;

  return date.toLocaleDateString('pl-PL');
}

function EmptyEntriesState() {
  return (
    <Card>
      <CardContent className="py-12">
        <div className="text-center space-y-2">
          <Calendar className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold">Brak wpisów</h3>
          <p className="text-sm text-muted-foreground">
            Nie ma jeszcze żadnych wpisów w tym trackerze.
            <br />
            Kliknij przycisk + aby dodać pierwszy wpis.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function EntriesListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 rounded-lg border">
              <Skeleton className="h-6 w-24 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
