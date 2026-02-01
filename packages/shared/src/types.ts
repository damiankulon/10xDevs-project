// =====================================================================================================================
// Kipio Shared Types - DTOs and Command Models
// =====================================================================================================================
// This file contains all Data Transfer Objects (DTOs) and Command Models for the Kipio API.
// These types are derived from the database schema and API plan specifications.
// =====================================================================================================================

import { z } from 'zod';

// =====================================================================================================================
// Section 1: Enums and Constants
// =====================================================================================================================

/** Supported tracker data types */
export const DataType = {
  NUMBER: 'number',
  SCALE: 'scale',
  BOOLEAN: 'boolean',
  TEXT: 'text',
} as const;

export type DataType = (typeof DataType)[keyof typeof DataType];

/** Supported theme preferences */
export const ThemePreference = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

export type ThemePreference =
  (typeof ThemePreference)[keyof typeof ThemePreference];

/** Tracker share permission levels */
export const SharePermission = {
  READ: 'read',
  WRITE: 'write',
} as const;

export type SharePermission =
  (typeof SharePermission)[keyof typeof SharePermission];

/** Activity log entity types */
export const EntityType = {
  TRACKER: 'tracker',
  ENTRY: 'entry',
  API_TOKEN: 'api_token',
  PROFILE: 'profile',
  TRACKER_SHARE: 'tracker_share',
} as const;

export type EntityType = (typeof EntityType)[keyof typeof EntityType];

/** Activity log action types */
export const ActionType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  RESTORE: 'restore',
} as const;

export type ActionType = (typeof ActionType)[keyof typeof ActionType];

/** Sort order options */
export const SortOrder = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder];

/** Tracker sort fields */
export const TrackerSortBy = {
  DISPLAY_ORDER: 'display_order',
  NAME: 'name',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
} as const;

export type TrackerSortBy = (typeof TrackerSortBy)[keyof typeof TrackerSortBy];

/** Stats period options */
export const StatsPeriod = {
  SEVEN_DAYS: '7d',
  THIRTY_DAYS: '30d',
  NINETY_DAYS: '90d',
  ONE_YEAR: '1y',
  ALL: 'all',
} as const;

export type StatsPeriod = (typeof StatsPeriod)[keyof typeof StatsPeriod];

/** Export format options */
export const ExportFormat = {
  JSON: 'json',
  CSV: 'csv',
} as const;

export type ExportFormat = (typeof ExportFormat)[keyof typeof ExportFormat];

// =====================================================================================================================
// Section 2: Base Entity Types (derived from database schema)
// =====================================================================================================================

/** Base profile entity matching database schema */
export interface ProfileEntity {
  id: string;
  display_name: string;
  onboarding_completed: boolean;
  preferred_theme: ThemePreference;
  trackers_limit: number;
  api_requests_per_hour: number;
  timezone: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** Tracker configuration for scale type */
export interface ScaleConfig {
  min: number;
  max: number;
}

/** Generic tracker configuration type */
export type TrackerConfig = ScaleConfig | Record<string, unknown>;

/** Base tracker entity matching database schema */
export interface TrackerEntity {
  id: string;
  user_id: string;
  name: string;
  data_type: DataType;
  unit: string | null;
  config: TrackerConfig;
  color: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** Base tracker share entity matching database schema */
export interface TrackerShareEntity {
  id: string;
  tracker_id: string;
  shared_with_user_id: string;
  permission: SharePermission;
  created_at: string;
  created_by: string;
}

/** Base entry entity matching database schema */
export interface EntryEntity {
  id: string;
  tracker_id: string;
  user_id: string;
  value_number: number | null;
  value_boolean: boolean | null;
  value_text: string | null;
  value_json: unknown | null;
  recorded_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** Base API token entity matching database schema */
export interface ApiTokenEntity {
  id: string;
  user_id: string;
  name: string;
  token_hash: string;
  token_prefix: string;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  revoked_at: string | null;
  created_at: string;
}

/** Base template package entity matching database schema */
export interface TemplatePackageEntity {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

/** Base tracker template entity matching database schema */
export interface TrackerTemplateEntity {
  id: string;
  package_id: string;
  name: string;
  data_type: DataType;
  unit: string | null;
  config: TrackerConfig;
  color: string | null;
  icon: string | null;
  display_order: number;
  created_at: string;
}

/** Base activity log entity matching database schema */
export interface ActivityLogEntity {
  id: string;
  user_id: string;
  entity_type: EntityType;
  entity_id: string;
  action: ActionType;
  changes: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// =====================================================================================================================
// Section 3: Common DTOs
// =====================================================================================================================

/** Pagination information returned in paginated responses */
export interface PaginationDto {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
}

/** Generic paginated response wrapper */
export interface PaginatedResponseDto<T> {
  data: T[];
  pagination: PaginationDto;
}

/** Validation error detail for field-level errors */
export interface ValidationErrorDetailDto {
  field: string;
  message: string;
}

/** Standard error response format */
export interface ErrorResponseDto {
  statusCode: number;
  error: string;
  message: string;
  details?: ValidationErrorDetailDto[];
  timestamp: string;
  path: string;
}

/** Generic success message response */
export interface MessageResponseDto {
  message: string;
}

// =====================================================================================================================
// Section 4: Profile DTOs and Command Models
// =====================================================================================================================

/**
 * Profile response DTO
 * Excludes sensitive fields (deleted_at) from base entity
 * Used in: GET /api/profiles/me, PATCH /api/profiles/me
 */
export type ProfileResponseDto = Omit<ProfileEntity, 'deleted_at'>;

/**
 * Update profile command model
 * All fields are optional for partial updates
 * Used in: PATCH /api/profiles/me
 */
export interface UpdateProfileCommand {
  display_name?: string;
  preferred_theme?: ThemePreference;
  timezone?: string;
}

/**
 * Complete onboarding command model
 * Used in: POST /api/profiles/me/complete-onboarding
 */
export interface CompleteOnboardingCommand {
  selected_package_ids: string[];
}

/**
 * Complete onboarding response DTO
 * Used in: POST /api/profiles/me/complete-onboarding
 */
export interface CompleteOnboardingResponseDto extends MessageResponseDto {
  created_trackers_count: number;
}

// =====================================================================================================================
// Section 5: Tracker DTOs and Command Models
// =====================================================================================================================

/** Last entry summary for tracker list */
export interface LastEntryDto {
  value: number | boolean | string;
  recorded_at: string;
}

/** Tracker statistics summary */
export interface TrackerStatsDto {
  total_entries: number;
  first_entry_at: string | null;
  last_entry_at: string | null;
}

/**
 * Tracker response DTO for list view
 * Extends base entity with computed fields for ownership and sharing
 * Used in: GET /api/trackers (list)
 */
export interface TrackerListItemDto extends Omit<TrackerEntity, 'deleted_at'> {
  /** Whether current user is the owner */
  is_owner: boolean;
  /** Permission level if shared (null if owner) */
  shared_permission: SharePermission | null;
  /** Most recent entry for quick preview */
  last_entry: LastEntryDto | null;
  /** Last 7 days of values for mini chart */
  sparkline_data: number[];
}

/**
 * Tracker list response DTO with pagination
 * Used in: GET /api/trackers
 */
export type TrackerListResponseDto = PaginatedResponseDto<TrackerListItemDto>;

/**
 * Tracker detail response DTO
 * Includes statistics not shown in list view
 * Used in: GET /api/trackers/:id
 */
export interface TrackerDetailResponseDto extends Omit<
  TrackerEntity,
  'deleted_at'
> {
  is_owner: boolean;
  shared_permission: SharePermission | null;
  stats: TrackerStatsDto;
}

/**
 * Create tracker command model
 * Used in: POST /api/trackers
 */
export interface CreateTrackerCommand {
  name: string;
  data_type: DataType;
  unit?: string;
  config?: TrackerConfig;
  color?: string;
  icon?: string;
  display_order?: number;
}

/**
 * Update tracker command model
 * All fields optional for partial updates
 * Note: data_type cannot be changed after creation
 * Used in: PATCH /api/trackers/:id
 */
export interface UpdateTrackerCommand {
  name?: string;
  unit?: string;
  config?: TrackerConfig;
  color?: string;
  icon?: string;
  display_order?: number;
  is_active?: boolean;
}

/** Single tracker order item for reordering */
export interface TrackerOrderItemDto {
  id: string;
  display_order: number;
}

/**
 * Reorder trackers command model
 * Used in: PATCH /api/trackers/reorder
 */
export interface ReorderTrackersCommand {
  order: TrackerOrderItemDto[];
}

/**
 * Reorder trackers response DTO
 * Used in: PATCH /api/trackers/reorder
 */
export interface ReorderTrackersResponseDto extends MessageResponseDto {
  updated_count: number;
}

/**
 * Tracker list query parameters
 * Used in: GET /api/trackers
 */
export interface TrackerListQueryDto {
  page?: number;
  limit?: number;
  sort_by?: TrackerSortBy;
  sort_order?: SortOrder;
  is_active?: boolean;
  data_type?: DataType;
  include_shared?: boolean;
}

/** Numeric statistics for number/scale trackers */
export interface NumericStatsDto {
  count: number;
  average: number;
  min: number;
  max: number;
  median: number;
  std_dev: number;
}

/** Chart data for tracker statistics */
export interface ChartDataDto {
  labels: string[];
  values: number[];
}

/** Heatmap data point */
export interface HeatmapDataPointDto {
  date: string;
  count: number;
  value: number | boolean | string;
}

/**
 * Tracker statistics response DTO
 * Used in: GET /api/trackers/:trackerId/stats
 */
export interface TrackerStatsResponseDto {
  tracker_id: string;
  period: StatsPeriod;
  data_type: DataType;
  stats: NumericStatsDto;
  chart_data: ChartDataDto;
  heatmap_data: HeatmapDataPointDto[];
}

/**
 * Tracker stats query parameters
 * Used in: GET /api/trackers/:trackerId/stats
 */
export interface TrackerStatsQueryDto {
  period?: StatsPeriod;
}

// =====================================================================================================================
// Section 6: Tracker Share DTOs and Command Models
// =====================================================================================================================

/** Shared user info for share responses */
export interface SharedUserDto {
  id: string;
  display_name: string;
}

/**
 * Tracker share response DTO
 * Includes shared user details
 * Used in: GET /api/trackers/:trackerId/shares, POST /api/trackers/:trackerId/shares
 */
export interface TrackerShareResponseDto extends Omit<
  TrackerShareEntity,
  'shared_with_user_id'
> {
  shared_with_user_id: string;
  shared_with_user: SharedUserDto;
}

/**
 * Tracker shares list response DTO
 * Used in: GET /api/trackers/:trackerId/shares
 */
export interface TrackerShareListResponseDto {
  data: TrackerShareResponseDto[];
}

/**
 * Create tracker share command model
 * Uses email to lookup user instead of direct user_id
 * Used in: POST /api/trackers/:trackerId/shares
 */
export interface CreateTrackerShareCommand {
  shared_with_email: string;
  permission: SharePermission;
}

// =====================================================================================================================
// Section 7: Entry DTOs and Command Models
// =====================================================================================================================

/** Normalized entry value type based on tracker data_type */
export type EntryValue = number | boolean | string;

/**
 * Entry response DTO
 * Value is normalized based on tracker's data_type
 * Used in: GET /api/trackers/:trackerId/entries/:entryId, POST, PATCH responses
 */
export interface EntryResponseDto {
  id: string;
  tracker_id: string;
  user_id: string;
  /** Normalized value based on tracker data_type */
  value: EntryValue;
  recorded_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Entry list response DTO with pagination
 * Used in: GET /api/trackers/:trackerId/entries
 */
export type EntryListResponseDto = PaginatedResponseDto<EntryResponseDto>;

/**
 * Create entry command model
 * Used in: POST /api/trackers/:trackerId/entries
 */
export interface CreateEntryCommand {
  value: EntryValue;
  recorded_at?: string;
}

/**
 * Update entry command model
 * Used in: PATCH /api/trackers/:trackerId/entries/:entryId
 */
export interface UpdateEntryCommand {
  value?: EntryValue;
  recorded_at?: string;
}

/**
 * Entry list query parameters
 * Used in: GET /api/trackers/:trackerId/entries
 */
export interface EntryListQueryDto {
  page?: number;
  limit?: number;
  sort_order?: SortOrder;
  from?: string;
  to?: string;
}

// =====================================================================================================================
// Section 8: Webhook DTOs and Command Models
// =====================================================================================================================

/**
 * Webhook entry command model
 * Used in: POST /api/webhook
 */
export interface WebhookEntryCommand {
  tracker_id: string;
  value: EntryValue;
  recorded_at?: string;
}

/**
 * Webhook entry response DTO
 * Simplified response for webhook calls
 * Used in: POST /api/webhook
 */
export interface WebhookEntryResponseDto {
  id: string;
  tracker_id: string;
  value: EntryValue;
  recorded_at: string;
  created_at: string;
}

/** Batch entry item for webhook batch requests */
export interface WebhookBatchEntryItem {
  tracker_id: string;
  value: EntryValue;
  recorded_at?: string;
}

/**
 * Webhook batch command model
 * Used in: POST /api/webhook/batch
 */
export interface WebhookBatchCommand {
  entries: WebhookBatchEntryItem[];
}

/** Batch entry result status */
export type BatchEntryStatus = 'created' | 'failed';

/** Batch entry result item */
export interface BatchEntryResultDto {
  id?: string;
  tracker_id: string;
  status: BatchEntryStatus;
  error?: string;
}

/**
 * Webhook batch response DTO
 * Used in: POST /api/webhook/batch
 */
export interface WebhookBatchResponseDto {
  created: number;
  failed: number;
  entries: BatchEntryResultDto[];
}

// =====================================================================================================================
// Section 9: API Token DTOs and Command Models
// =====================================================================================================================

/**
 * API token response DTO (without full token)
 * Used in: GET /api/tokens (list)
 */
export interface ApiTokenResponseDto {
  id: string;
  name: string;
  token_prefix: string;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

/**
 * API token list response DTO
 * Used in: GET /api/tokens
 */
export interface ApiTokenListResponseDto {
  data: ApiTokenResponseDto[];
}

/**
 * API token created response DTO (includes full token)
 * Note: Full token is only returned once at creation time
 * Used in: POST /api/tokens, POST /api/tokens/:id/regenerate
 */
export interface ApiTokenCreatedResponseDto extends ApiTokenResponseDto {
  /** Full token - only returned on creation/regeneration. Store securely! */
  token: string;
}

/**
 * Create API token command model
 * Used in: POST /api/tokens
 */
export interface CreateApiTokenCommand {
  name: string;
  expires_at?: string;
}

// =====================================================================================================================
// Section 10: Template DTOs
// =====================================================================================================================

/**
 * Tracker template response DTO
 * Used within template package responses
 */
export interface TrackerTemplateResponseDto {
  id: string;
  name: string;
  data_type: DataType;
  unit: string | null;
  config: TrackerConfig;
  color: string | null;
  icon: string | null;
  display_order: number;
}

/**
 * Template package response DTO
 * Includes all tracker templates within the package
 * Used in: GET /api/templates/packages
 */
export interface TemplatePackageResponseDto {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  trackers: TrackerTemplateResponseDto[];
}

/**
 * Template packages list response DTO
 * Used in: GET /api/templates/packages
 */
export interface TemplatePackageListResponseDto {
  data: TemplatePackageResponseDto[];
}

/** Created tracker summary for apply package response */
export interface CreatedTrackerSummaryDto {
  id: string;
  name: string;
  data_type: DataType;
}

/**
 * Apply template package response DTO
 * Used in: POST /api/templates/packages/:packageId/apply
 */
export interface ApplyPackageResponseDto extends MessageResponseDto {
  created_trackers: CreatedTrackerSummaryDto[];
}

// =====================================================================================================================
// Section 11: Export DTOs
// =====================================================================================================================

/**
 * Export query parameters
 * Used in: GET /api/export
 */
export interface ExportQueryDto {
  format?: ExportFormat;
  tracker_ids?: string;
  from?: string;
  to?: string;
}

/** User summary for export */
export interface ExportUserDto {
  id: string;
  display_name: string;
}

/** Entry data in export format */
export interface ExportEntryDto {
  id: string;
  value: EntryValue;
  recorded_at: string;
}

/** Tracker data in export format */
export interface ExportTrackerDto {
  id: string;
  name: string;
  data_type: DataType;
  unit: string | null;
  entries: ExportEntryDto[];
}

/**
 * JSON export response structure
 * Used in: GET /api/export (format=json)
 */
export interface ExportResponseDto {
  exported_at: string;
  user: ExportUserDto;
  trackers: ExportTrackerDto[];
}

// =====================================================================================================================
// Section 12: Dashboard DTOs
// =====================================================================================================================

/** Dashboard summary statistics */
export interface DashboardSummaryDto {
  total_trackers: number;
  active_trackers: number;
  entries_today: number;
  entries_this_week: number;
  tracker_limit: number;
}

/** Trend direction for dashboard tracker */
export type TrendDirection = 'up' | 'down' | 'stable';

/** Dashboard tracker trend data */
export interface DashboardTrendDto {
  direction: TrendDirection;
  percentage: number;
}

/** Sparkline data point */
export interface SparklineDataPoint {
  date: string;
  value: number;
}

/**
 * Dashboard tracker item DTO
 * Simplified tracker data for dashboard view
 */
export interface DashboardTrackerDto {
  tracker_id: string;
  name: string;
  data_type: DataType;
  unit: string | null;
  color: string | null;
  icon: string | null;
  is_active: boolean;
  is_shared: boolean;
  display_order: number;
  last_entry: LastEntryDto | null;
  sparkline: SparklineDataPoint[];
  trend: DashboardTrendDto | null;
  stats?: {
    total_entries: number;
    streak: number;
  };
}

/**
 * Dashboard response DTO
 * Used in: GET /api/dashboard
 */
export interface DashboardResponseDto {
  trackers: DashboardTrackerDto[];
  summary: DashboardSummaryDto;
}

/**
 * Dashboard query parameters
 * Used in: GET /api/dashboard
 */
export interface DashboardQueryDto {
  sparkline_days?: number;
}

// =====================================================================================================================
// Section 13: Activity Log DTOs
// =====================================================================================================================

/** Changes data structure for activity log */
export interface ActivityChangesDto {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

/**
 * Activity log entry response DTO
 * Used in: GET /api/activity
 */
export interface ActivityLogEntryDto {
  id: string;
  user_id: string;
  entity_type: EntityType;
  entity_id: string;
  action: ActionType;
  changes: ActivityChangesDto | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

/**
 * Activity log list response DTO with pagination
 * Used in: GET /api/activity
 */
export type ActivityLogListResponseDto =
  PaginatedResponseDto<ActivityLogEntryDto>;

/**
 * Activity log query parameters
 * Used in: GET /api/activity
 */
export interface ActivityLogQueryDto {
  page?: number;
  limit?: number;
  entity_type?: EntityType;
  action?: ActionType;
  from?: string;
  to?: string;
}

// =====================================================================================================================
// Section 14: Zod Schemas for Validation
// =====================================================================================================================

// --- Profile Schemas ---

export const updateProfileSchema = z.object({
  display_name: z.string().max(100).optional(),
  preferred_theme: z.enum(['light', 'dark', 'system']).optional(),
  timezone: z.string().optional(),
});

export const completeOnboardingSchema = z.object({
  selected_package_ids: z.array(z.string().uuid()),
});

// --- Tracker Schemas ---

export const scaleConfigSchema = z.object({
  min: z.number(),
  max: z.number(),
});

export const trackerConfigSchema = z.union([
  scaleConfigSchema,
  z.record(z.unknown()),
]);

export const createTrackerSchema = z.object({
  name: z.string().min(1).max(100),
  data_type: z.enum(['number', 'scale', 'boolean', 'text']),
  unit: z.string().max(20).optional(),
  config: trackerConfigSchema.optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  icon: z.string().max(50).optional(),
  display_order: z.number().int().optional(),
});

export const updateTrackerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  unit: z.string().max(20).optional(),
  config: trackerConfigSchema.optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  icon: z.string().max(50).optional(),
  display_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
});

export const trackerOrderItemSchema = z.object({
  id: z.string().uuid(),
  display_order: z.number().int(),
});

export const reorderTrackersSchema = z.object({
  order: z.array(trackerOrderItemSchema).min(1),
});

export const trackerListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort_by: z
    .enum(['display_order', 'name', 'created_at', 'updated_at'])
    .default('display_order'),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
  is_active: z.coerce.boolean().optional(),
  data_type: z.enum(['number', 'scale', 'boolean', 'text']).optional(),
  include_shared: z.coerce.boolean().default(true),
});

export const trackerStatsQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y', 'all']).default('7d'),
});

// --- Tracker Share Schemas ---

export const createTrackerShareSchema = z.object({
  shared_with_email: z.string().email(),
  permission: z.enum(['read', 'write']),
});

// --- Entry Schemas ---

export const entryValueSchema = z.union([
  z.number(),
  z.boolean(),
  z.string().max(500),
]);

export const createEntrySchema = z.object({
  value: entryValueSchema,
  recorded_at: z.string().datetime().optional(),
});

export const updateEntrySchema = z.object({
  value: entryValueSchema.optional(),
  recorded_at: z.string().datetime().optional(),
});

export const entryListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

// --- Webhook Schemas ---

export const webhookEntrySchema = z.object({
  tracker_id: z.string().uuid(),
  value: entryValueSchema,
  recorded_at: z.string().datetime().optional(),
});

export const webhookBatchEntrySchema = z.object({
  tracker_id: z.string().uuid(),
  value: entryValueSchema,
  recorded_at: z.string().datetime().optional(),
});

export const webhookBatchSchema = z.object({
  entries: z.array(webhookBatchEntrySchema).min(1).max(100),
});

// --- API Token Schemas ---

export const createApiTokenSchema = z.object({
  name: z.string().min(1).max(50),
  expires_at: z.string().datetime().optional(),
});

// --- Export Schemas ---

export const exportQuerySchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
  tracker_ids: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

// --- Dashboard Schemas ---

export const dashboardQuerySchema = z.object({
  sparkline_days: z.coerce.number().int().positive().max(30).default(7),
});

// --- Activity Log Schemas ---

export const activityLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  entity_type: z
    .enum(['tracker', 'entry', 'api_token', 'profile', 'tracker_share'])
    .optional(),
  action: z.enum(['create', 'update', 'delete', 'restore']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

// =====================================================================================================================
// Section 15: Type Inference from Zod Schemas
// =====================================================================================================================

/** Inferred type from updateProfileSchema */
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;

/** Inferred type from completeOnboardingSchema */
export type CompleteOnboardingDto = z.infer<typeof completeOnboardingSchema>;

/** Inferred type from createTrackerSchema */
export type CreateTrackerDto = z.infer<typeof createTrackerSchema>;

/** Inferred type from updateTrackerSchema */
export type UpdateTrackerDto = z.infer<typeof updateTrackerSchema>;

/** Inferred type from reorderTrackersSchema */
export type ReorderTrackersDto = z.infer<typeof reorderTrackersSchema>;

/** Inferred type from createTrackerShareSchema */
export type CreateTrackerShareDto = z.infer<typeof createTrackerShareSchema>;

/** Inferred type from createEntrySchema */
export type CreateEntryDto = z.infer<typeof createEntrySchema>;

/** Inferred type from updateEntrySchema */
export type UpdateEntryDto = z.infer<typeof updateEntrySchema>;

/** Inferred type from webhookEntrySchema */
export type WebhookEntryDto = z.infer<typeof webhookEntrySchema>;

/** Inferred type from webhookBatchSchema */
export type WebhookBatchDto = z.infer<typeof webhookBatchSchema>;

/** Inferred type from createApiTokenSchema */
export type CreateApiTokenDto = z.infer<typeof createApiTokenSchema>;
