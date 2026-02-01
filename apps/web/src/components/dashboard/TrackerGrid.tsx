import { useMemo } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TrackerCard } from './TrackerCard';
import type { TrackerGridProps, DashboardTrackerDto } from './types';

// Komponent wrapper dla pojedynczej karty z możliwością przeciągania
function SortableTrackerCard({ tracker }: { tracker: DashboardTrackerDto }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tracker.tracker_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TrackerCard tracker={tracker} isDraggable={true} />
    </div>
  );
}

export function TrackerGrid({
  trackers,
  isEditMode,
  onReorder,
  onAddEntry,
  onViewDetails,
}: TrackerGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sortowanie trackerów według display_order
  const sortedTrackers = useMemo(() => {
    return [...trackers].sort((a, b) => a.display_order - b.display_order);
  }, [trackers]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = sortedTrackers.findIndex(
      (t) => t.tracker_id === active.id
    );
    const newIndex = sortedTrackers.findIndex((t) => t.tracker_id === over.id);

    const reorderedTrackers = arrayMove(sortedTrackers, oldIndex, newIndex);

    // Przygotuj dane do wysłania
    const reorderData = reorderedTrackers.map((tracker, index) => ({
      tracker_id: tracker.tracker_id,
      display_order: index,
    }));

    onReorder(reorderData);
  };

  if (trackers.length === 0) {
    return null;
  }

  // Tryb edycji z drag & drop
  if (isEditMode) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedTrackers.map((t) => t.tracker_id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedTrackers.map((tracker) => (
              <SortableTrackerCard key={tracker.tracker_id} tracker={tracker} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    );
  }

  // Normalny widok bez drag & drop
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sortedTrackers.map((tracker) => (
        <TrackerCard
          key={tracker.tracker_id}
          tracker={tracker}
          onAddEntry={onAddEntry}
          onViewDetails={onViewDetails}
        />
      ))}
    </div>
  );
}
