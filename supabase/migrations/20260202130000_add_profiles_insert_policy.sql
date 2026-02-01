-- =====================================================================================================================
-- migration: add profiles insert policy
-- description: adds RLS policy to allow profile creation during user registration
-- =====================================================================================================================

-- Allow authenticated users to insert their own profile
-- This is needed when backend creates profile manually during registration
create policy profiles_insert_own on public.profiles
    for insert
    to authenticated
    with check (auth.uid() = id);

comment on policy profiles_insert_own on public.profiles is 'allows users to create their own profile during registration';
