import type { DataType, TrackerDetailResponseDto } from '@shared/types';

export interface CreateTrackerFormData {
  name: string;
  data_type: DataType;
  unit?: string;
  config?: {
    min?: number;
    max?: number;
  };
  color?: string;
  icon?: string;
  display_order?: number;
}

export interface CreateTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (tracker: TrackerDetailResponseDto) => void;
  trackerLimit?: number;
  currentTrackerCount?: number;
}

export interface DataTypeOption {
  type: DataType;
  label: string;
  description: string;
  icon: React.ReactNode;
}
