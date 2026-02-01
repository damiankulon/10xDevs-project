-- migration: fix infinite recursion in RLS policies
-- description: creates a security definer function to check tracker ownership
--              and updates tracker_shares policies to use it, preventing RLS loops
--              (trackers -> tracker_shares -> trackers)

-- 1. Create a helper function to check ownership bypassing RLS
CREATE OR REPLACE FUNCTION public.is_tracker_owner(p_tracker_id uuid, p_user_id uuid)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.trackers
    WHERE id = p_tracker_id
      AND user_id = p_user_id
      AND deleted_at IS NULL
  );
END;
$$;

COMMENT ON FUNCTION public.is_tracker_owner IS 'checks if user owns a tracker, bypassing RLS to avoid recursion in policies';

-- 2. Drop existing problematic policies on tracker_shares
DROP POLICY IF EXISTS tracker_shares_select_owner ON public.tracker_shares;
DROP POLICY IF EXISTS tracker_shares_insert_owner ON public.tracker_shares;
DROP POLICY IF EXISTS tracker_shares_delete_owner ON public.tracker_shares;

-- 3. Recreate policies using the safe function

-- details: owners can view shares for their trackers
CREATE POLICY tracker_shares_select_owner ON public.tracker_shares
    FOR SELECT
    TO authenticated
    USING (
        public.is_tracker_owner(tracker_id, auth.uid())
    );

-- details: only owners can create shares
CREATE POLICY tracker_shares_insert_owner ON public.tracker_shares
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_tracker_owner(tracker_id, auth.uid())
    );

-- details: only owners can delete shares
CREATE POLICY tracker_shares_delete_owner ON public.tracker_shares
    FOR DELETE
    TO authenticated
    USING (
        public.is_tracker_owner(tracker_id, auth.uid())
    );
