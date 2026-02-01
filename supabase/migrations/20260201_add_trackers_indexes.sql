-- Migration: Add indexes for trackers module performance optimization
-- Created: 2026-02-01
-- Description: Creates indexes to optimize tracker queries for listing, filtering, and sorting

-- =====================================================================================================================
-- Trackers Table Indexes
-- =====================================================================================================================

-- Index for user_id + is_active (most common query pattern)
-- Used by: GET /api/trackers with is_active filter
-- This is a partial index that only includes non-deleted trackers
CREATE INDEX IF NOT EXISTS idx_trackers_user_id_active 
ON kipio.trackers(user_id, is_active) 
WHERE deleted_at IS NULL;

-- Index for data_type filtering
-- Used by: GET /api/trackers with data_type filter
CREATE INDEX IF NOT EXISTS idx_trackers_data_type 
ON kipio.trackers(data_type) 
WHERE deleted_at IS NULL;

-- Index for display_order sorting
-- Used by: GET /api/trackers with sort_by=display_order
CREATE INDEX IF NOT EXISTS idx_trackers_display_order 
ON kipio.trackers(display_order) 
WHERE deleted_at IS NULL;

-- Index for name sorting (case-insensitive)
-- Used by: GET /api/trackers with sort_by=name
CREATE INDEX IF NOT EXISTS idx_trackers_name_lower 
ON kipio.trackers(LOWER(name)) 
WHERE deleted_at IS NULL;

-- Index for created_at sorting
-- Used by: GET /api/trackers with sort_by=created_at
CREATE INDEX IF NOT EXISTS idx_trackers_created_at 
ON kipio.trackers(created_at DESC) 
WHERE deleted_at IS NULL;

-- Index for updated_at sorting
-- Used by: GET /api/trackers with sort_by=updated_at
CREATE INDEX IF NOT EXISTS idx_trackers_updated_at 
ON kipio.trackers(updated_at DESC) 
WHERE deleted_at IS NULL;

-- =====================================================================================================================
-- Tracker Shares Table Indexes
-- =====================================================================================================================

-- Index for shared_with_user_id lookups
-- Used by: GET /api/trackers with include_shared=true
CREATE INDEX IF NOT EXISTS idx_tracker_shares_user 
ON kipio.tracker_shares(shared_with_user_id);

-- Index for tracker_id lookups
-- Used by: GET /api/trackers/:trackerId/shares
CREATE INDEX IF NOT EXISTS idx_tracker_shares_tracker 
ON kipio.tracker_shares(tracker_id);

-- Composite unique index to prevent duplicate shares
-- Ensures a tracker can only be shared once with each user
CREATE UNIQUE INDEX IF NOT EXISTS idx_tracker_shares_unique 
ON kipio.tracker_shares(tracker_id, shared_with_user_id);

-- =====================================================================================================================
-- Entries Table Indexes
-- =====================================================================================================================

-- Composite index for tracker_id + recorded_at (descending)
-- Used by: Last entry lookup, sparkline data, and stats calculations
-- Optimizes queries like "get last 7 entries for tracker X"
CREATE INDEX IF NOT EXISTS idx_entries_tracker_recorded 
ON kipio.entries(tracker_id, recorded_at DESC) 
WHERE deleted_at IS NULL;

-- Index for recorded_at range queries
-- Used by: GET /api/trackers/:trackerId/entries with date filters
CREATE INDEX IF NOT EXISTS idx_entries_recorded_at 
ON kipio.entries(recorded_at DESC) 
WHERE deleted_at IS NULL;

-- Composite index for tracker stats calculations
-- Optimizes COUNT and MIN/MAX queries on recorded_at
CREATE INDEX IF NOT EXISTS idx_entries_tracker_stats 
ON kipio.entries(tracker_id, recorded_at) 
WHERE deleted_at IS NULL;

-- =====================================================================================================================
-- Verification and Comments
-- =====================================================================================================================

-- Add comments to document the purpose of each index
COMMENT ON INDEX kipio.idx_trackers_user_id_active IS 'Optimizes tracker listing with is_active filter';
COMMENT ON INDEX kipio.idx_trackers_data_type IS 'Optimizes tracker filtering by data_type';
COMMENT ON INDEX kipio.idx_trackers_display_order IS 'Optimizes tracker sorting by display_order';
COMMENT ON INDEX kipio.idx_trackers_name_lower IS 'Optimizes case-insensitive name sorting';
COMMENT ON INDEX kipio.idx_trackers_created_at IS 'Optimizes tracker sorting by creation date';
COMMENT ON INDEX kipio.idx_trackers_updated_at IS 'Optimizes tracker sorting by update date';
COMMENT ON INDEX kipio.idx_tracker_shares_user IS 'Optimizes shared tracker lookups by user';
COMMENT ON INDEX kipio.idx_tracker_shares_tracker IS 'Optimizes share lookups by tracker';
COMMENT ON INDEX kipio.idx_tracker_shares_unique IS 'Prevents duplicate tracker shares';
COMMENT ON INDEX kipio.idx_entries_tracker_recorded IS 'Optimizes entry queries by tracker and date';
COMMENT ON INDEX kipio.idx_entries_recorded_at IS 'Optimizes entry date range queries';
COMMENT ON INDEX kipio.idx_entries_tracker_stats IS 'Optimizes tracker statistics calculations';
