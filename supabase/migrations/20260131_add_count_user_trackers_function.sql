-- Add RPC function to count user trackers (bypasses RLS)
-- This function uses SECURITY DEFINER to bypass RLS policies
-- which can cause infinite recursion with complex policies

create or replace function public.count_user_trackers(p_user_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
begin
  return (
    select count(*)::bigint
    from public.trackers
    where user_id = p_user_id
      and deleted_at is null
  );
end;
$$;

comment on function public.count_user_trackers is 'Counts active trackers for a user, bypassing RLS policies to avoid recursion';
