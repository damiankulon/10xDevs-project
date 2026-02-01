-- =====================================================================================================================
-- migration: create kipio schema
-- description: creates the complete database schema for kipio application including tables, indexes, functions, 
--              triggers, and row level security policies
-- 
-- affected tables: profiles, trackers, tracker_shares, entries, api_tokens, template_packages, 
--                  tracker_templates, activity_log
--
-- notes: 
--   - implements soft delete pattern using deleted_at column where applicable
--   - uses row level security (rls) for all tables with granular policies
--   - includes automatic profile creation on user signup
--   - enforces business rules via triggers (tracker limits, api token limits, value validation)
--   - all timestamps are stored in utc (timestamptz)
-- =====================================================================================================================

-- =====================================================================================================================
-- section 1: create tables
-- =====================================================================================================================

-- ---------------------------------------------------------------------------------------------------------------------
-- table: profiles
-- description: extends supabase auth.users with application-specific user data
-- relationship: 1:1 with auth.users (cascade delete on user removal for gdpr compliance)
-- ---------------------------------------------------------------------------------------------------------------------
create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null,
    onboarding_completed boolean not null default false,
    preferred_theme text not null default 'dark' check (preferred_theme in ('light', 'dark', 'system')),
    trackers_limit integer not null default 50 check (trackers_limit > 0),
    api_requests_per_hour integer not null default 100 check (api_requests_per_hour > 0),
    timezone text not null default 'UTC',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz null
);

comment on table public.profiles is 'user profiles extending auth.users with app-specific settings and preferences';
comment on column public.profiles.timezone is 'iana timezone name (e.g., Europe/Warsaw) for proper dst handling';
comment on column public.profiles.deleted_at is 'soft delete timestamp - null means active profile';

-- ---------------------------------------------------------------------------------------------------------------------
-- table: trackers
-- description: user-defined metrics/trackers for data collection
-- supports multiple data types: number, scale (1-10), boolean, text
-- ---------------------------------------------------------------------------------------------------------------------
create table public.trackers (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    name text not null check (char_length(name) <= 100),
    data_type text not null check (data_type in ('number', 'scale', 'boolean', 'text')),
    unit text null check (unit is null or char_length(unit) <= 20),
    config jsonb not null default '{}'::jsonb,
    color text null check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
    icon text null check (icon is null or char_length(icon) <= 50),
    display_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz null
);

comment on table public.trackers is 'user-defined metrics for tracking various data types';
comment on column public.trackers.config is 'type-specific configuration (e.g., {"min": 1, "max": 10} for scale)';
comment on column public.trackers.color is 'hex color code for ui customization';
comment on column public.trackers.display_order is 'user-defined sorting order';

-- ---------------------------------------------------------------------------------------------------------------------
-- table: tracker_shares
-- description: enables sharing trackers between users with read or write permissions
-- unique constraint prevents duplicate shares to the same user
-- ---------------------------------------------------------------------------------------------------------------------
create table public.tracker_shares (
    id uuid primary key default gen_random_uuid(),
    tracker_id uuid not null references public.trackers(id) on delete cascade,
    shared_with_user_id uuid not null references public.profiles(id) on delete cascade,
    permission text not null default 'read' check (permission in ('read', 'write')),
    created_at timestamptz not null default now(),
    created_by uuid not null references public.profiles(id),
    unique(tracker_id, shared_with_user_id)
);

comment on table public.tracker_shares is 'manages tracker sharing between users with granular permissions';
comment on column public.tracker_shares.permission is 'read: view only, write: view + add entries';
comment on column public.tracker_shares.created_by is 'user who granted the share (typically tracker owner)';

-- ---------------------------------------------------------------------------------------------------------------------
-- table: entries
-- description: actual data points/measurements for trackers
-- uses separate columns for different value types with validation via trigger
-- ---------------------------------------------------------------------------------------------------------------------
create table public.entries (
    id uuid primary key default gen_random_uuid(),
    tracker_id uuid not null references public.trackers(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    value_number decimal(15,4) null,
    value_boolean boolean null,
    value_text text null,
    value_json jsonb null,
    recorded_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz null
);

comment on table public.entries is 'data points/measurements for trackers with multi-type value support';
comment on column public.entries.user_id is 'author of the entry (may differ from tracker owner in shared trackers)';
comment on column public.entries.recorded_at is 'when the measurement was taken (can be backdated)';
comment on column public.entries.created_at is 'when the record was created in database';

-- ---------------------------------------------------------------------------------------------------------------------
-- table: api_tokens
-- description: api authentication tokens for programmatic access
-- stores hashed tokens (sha-256) with prefix for user identification
-- enforces max 5 active tokens per user via trigger
-- ---------------------------------------------------------------------------------------------------------------------
create table public.api_tokens (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    name text not null check (char_length(name) <= 50),
    token_hash text not null unique,
    token_prefix text not null check (char_length(token_prefix) = 8),
    last_used_at timestamptz null,
    expires_at timestamptz null,
    is_active boolean not null default true,
    revoked_at timestamptz null,
    created_at timestamptz not null default now()
);

comment on table public.api_tokens is 'api authentication tokens with secure hash storage';
comment on column public.api_tokens.token_hash is 'sha-256 hash of the token - actual token never stored';
comment on column public.api_tokens.token_prefix is 'first 8 characters for user identification without exposing full token';
comment on column public.api_tokens.expires_at is 'null means token never expires';

-- ---------------------------------------------------------------------------------------------------------------------
-- table: template_packages
-- description: predefined tracker template packages for onboarding
-- publicly accessible to all authenticated users
-- ---------------------------------------------------------------------------------------------------------------------
create table public.template_packages (
    id uuid primary key default gen_random_uuid(),
    name text not null unique check (char_length(name) <= 50),
    description text null check (description is null or char_length(description) <= 500),
    icon text null check (icon is null or char_length(icon) <= 50),
    display_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

comment on table public.template_packages is 'predefined packages of tracker templates for quick onboarding';
comment on column public.template_packages.is_active is 'allows soft hiding packages without deletion';

-- ---------------------------------------------------------------------------------------------------------------------
-- table: tracker_templates
-- description: individual tracker templates within packages
-- copied to user trackers during onboarding (no ongoing relationship)
-- ---------------------------------------------------------------------------------------------------------------------
create table public.tracker_templates (
    id uuid primary key default gen_random_uuid(),
    package_id uuid not null references public.template_packages(id) on delete cascade,
    name text not null check (char_length(name) <= 100),
    data_type text not null check (data_type in ('number', 'scale', 'boolean', 'text')),
    unit text null check (unit is null or char_length(unit) <= 20),
    config jsonb not null default '{}'::jsonb,
    color text null check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
    icon text null check (icon is null or char_length(icon) <= 50),
    display_order integer not null default 0,
    created_at timestamptz not null default now()
);

comment on table public.tracker_templates is 'tracker templates within packages - copied to users, not linked';
comment on column public.tracker_templates.display_order is 'order within the package';

-- ---------------------------------------------------------------------------------------------------------------------
-- table: activity_log
-- description: audit log for tracking user actions and data changes
-- manually populated by application (no automatic triggers in mvp)
-- ---------------------------------------------------------------------------------------------------------------------
create table public.activity_log (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    entity_type text not null check (entity_type in ('tracker', 'entry', 'api_token', 'profile', 'tracker_share')),
    entity_id uuid not null,
    action text not null check (action in ('create', 'update', 'delete', 'restore')),
    changes jsonb null,
    ip_address inet null,
    user_agent text null,
    created_at timestamptz not null default now()
);

comment on table public.activity_log is 'audit trail for user actions and entity changes';
comment on column public.activity_log.changes is 'json object with before/after values for updates';
comment on column public.activity_log.ip_address is 'client ip address for security auditing';

-- =====================================================================================================================
-- section 2: create indexes
-- =====================================================================================================================

-- profiles: primary key index created automatically, no additional indexes needed for mvp

-- trackers: optimize user queries and sorting
create index idx_trackers_user_id on public.trackers(user_id) where deleted_at is null;
create index idx_trackers_user_id_display_order on public.trackers(user_id, display_order) where deleted_at is null;

-- tracker_shares: optimize lookups for both tracker owner and shared user
create index idx_tracker_shares_tracker_id on public.tracker_shares(tracker_id);
create index idx_tracker_shares_shared_with_user_id on public.tracker_shares(shared_with_user_id);

-- entries: optimize time-series queries (most common access pattern)
create index idx_entries_tracker_id_recorded_at on public.entries(tracker_id, recorded_at desc) where deleted_at is null;
create index idx_entries_user_id_recorded_at on public.entries(user_id, recorded_at desc) where deleted_at is null;
create index idx_entries_recorded_at on public.entries(recorded_at desc) where deleted_at is null;

-- api_tokens: optimize token lookup and user token management
create index idx_api_tokens_user_id on public.api_tokens(user_id) where is_active = true;
create index idx_api_tokens_token_hash on public.api_tokens(token_hash) where is_active = true;

-- activity_log: optimize user activity queries and entity lookups
create index idx_activity_log_user_id_created_at on public.activity_log(user_id, created_at desc);
create index idx_activity_log_entity on public.activity_log(entity_type, entity_id);

-- template_packages: optimize package listing
create index idx_template_packages_display_order on public.template_packages(display_order) where is_active = true;

-- tracker_templates: optimize package template queries
create index idx_tracker_templates_package_id on public.tracker_templates(package_id);

-- =====================================================================================================================
-- section 3: create functions and triggers
-- =====================================================================================================================

-- ---------------------------------------------------------------------------------------------------------------------
-- function: count_user_trackers
-- description: counts active trackers for a user, bypassing RLS policies to avoid infinite recursion
-- note: uses SECURITY DEFINER to bypass RLS when called from triggers
-- ---------------------------------------------------------------------------------------------------------------------
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

comment on function public.count_user_trackers is 'counts active trackers for a user, bypassing RLS policies to avoid recursion';

-- ---------------------------------------------------------------------------------------------------------------------
-- function: handle_new_user
-- description: automatically creates a profile when a new user signs up via auth.users
-- trigger: on_auth_user_created (after insert on auth.users)
-- ---------------------------------------------------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, display_name)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', new.email, 'User')
    );
    return new;
end;
$$ language plpgsql security definer;

comment on function public.handle_new_user is 'automatically creates user profile on signup';

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------------------------------------------------
-- function: update_updated_at_column
-- description: automatically updates updated_at timestamp on row modification
-- triggers: applied to profiles, trackers, entries
-- ---------------------------------------------------------------------------------------------------------------------
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

comment on function public.update_updated_at_column is 'auto-updates updated_at timestamp on row changes';

create trigger update_profiles_updated_at
    before update on public.profiles
    for each row execute function public.update_updated_at_column();

create trigger update_trackers_updated_at
    before update on public.trackers
    for each row execute function public.update_updated_at_column();

create trigger update_entries_updated_at
    before update on public.entries
    for each row execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------------------------------------------------------
-- function: check_trackers_limit
-- description: enforces per-user tracker limit defined in profiles.trackers_limit
-- trigger: check_trackers_limit_trigger (before insert on trackers)
-- note: prevents users from exceeding their tracker quota
-- note: uses count_user_trackers() which has SECURITY DEFINER to avoid RLS recursion
-- ---------------------------------------------------------------------------------------------------------------------
create or replace function public.check_trackers_limit()
returns trigger as $$
declare
    current_count bigint;
    user_limit integer;
begin
    -- get user's tracker limit (profiles has simple RLS, no recursion risk)
    select trackers_limit into user_limit
    from public.profiles where id = new.user_id;

    -- count existing active trackers using security definer function to bypass RLS
    current_count := public.count_user_trackers(new.user_id);

    -- enforce limit
    if current_count >= user_limit then
        raise exception 'tracker limit reached (max: %)', user_limit;
    end if;

    return new;
end;
$$ language plpgsql;

comment on function public.check_trackers_limit is 'enforces tracker quota per user before insert';

create trigger check_trackers_limit_trigger
    before insert on public.trackers
    for each row execute function public.check_trackers_limit();

-- ---------------------------------------------------------------------------------------------------------------------
-- function: check_api_tokens_limit
-- description: enforces maximum of 5 active api tokens per user
-- trigger: check_api_tokens_limit_trigger (before insert on api_tokens)
-- note: hard limit for security and resource management
-- note: uses SECURITY DEFINER to count api_tokens without RLS interference
-- ---------------------------------------------------------------------------------------------------------------------
create or replace function public.check_api_tokens_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    current_count integer;
    max_tokens integer := 5;
begin
    -- count active tokens for user
    select count(*) into current_count
    from public.api_tokens
    where user_id = new.user_id and is_active = true;

    -- enforce hard limit of 5 active tokens
    if current_count >= max_tokens then
        raise exception 'api token limit reached (max: %)', max_tokens;
    end if;

    return new;
end;
$$;

comment on function public.check_api_tokens_limit is 'enforces max 5 active api tokens per user';

create trigger check_api_tokens_limit_trigger
    before insert on public.api_tokens
    for each row execute function public.check_api_tokens_limit();

-- ---------------------------------------------------------------------------------------------------------------------
-- function: validate_entry_value
-- description: validates that entry value matches tracker data_type and respects config constraints
-- trigger: validate_entry_value_trigger (before insert/update on entries)
-- validates:
--   - number: requires value_number, validates precision
--   - scale: requires value_number within min/max range from config
--   - boolean: requires value_boolean
--   - text: requires value_text
-- note: uses SECURITY DEFINER to read tracker config without RLS interference
-- ---------------------------------------------------------------------------------------------------------------------
create or replace function public.validate_entry_value()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    tracker_type text;
    tracker_config jsonb;
    scale_min decimal;
    scale_max decimal;
begin
    -- fetch tracker type and configuration
    select data_type, config into tracker_type, tracker_config
    from public.trackers where id = new.tracker_id;

    -- validate value based on tracker type
    case tracker_type
        when 'number' then
            if new.value_number is null then
                raise exception 'value_number is required for number type tracker';
            end if;
            if new.value_boolean is not null or new.value_text is not null then
                raise exception 'only value_number should be set for number type tracker';
            end if;

        when 'scale' then
            if new.value_number is null then
                raise exception 'value_number is required for scale type tracker';
            end if;
            -- validate scale range from config
            scale_min := coalesce((tracker_config->>'min')::decimal, 1);
            scale_max := coalesce((tracker_config->>'max')::decimal, 10);
            if new.value_number < scale_min or new.value_number > scale_max then
                raise exception 'value_number must be between % and %', scale_min, scale_max;
            end if;
            if new.value_boolean is not null or new.value_text is not null then
                raise exception 'only value_number should be set for scale type tracker';
            end if;

        when 'boolean' then
            if new.value_boolean is null then
                raise exception 'value_boolean is required for boolean type tracker';
            end if;
            if new.value_number is not null or new.value_text is not null then
                raise exception 'only value_boolean should be set for boolean type tracker';
            end if;

        when 'text' then
            if new.value_text is null then
                raise exception 'value_text is required for text type tracker';
            end if;
            if new.value_number is not null or new.value_boolean is not null then
                raise exception 'only value_text should be set for text type tracker';
            end if;

        else
            raise exception 'unknown tracker type: %', tracker_type;
    end case;

    return new;
end;
$$;

comment on function public.validate_entry_value is 'validates entry values match tracker type and config constraints';

create trigger validate_entry_value_trigger
    before insert or update on public.entries
    for each row execute function public.validate_entry_value();

-- =====================================================================================================================
-- section 4: enable row level security
-- =====================================================================================================================

alter table public.profiles enable row level security;
alter table public.trackers enable row level security;
alter table public.tracker_shares enable row level security;
alter table public.entries enable row level security;
alter table public.api_tokens enable row level security;
alter table public.activity_log enable row level security;
alter table public.template_packages enable row level security;
alter table public.tracker_templates enable row level security;

-- =====================================================================================================================
-- section 5: create rls policies
-- =====================================================================================================================

-- ---------------------------------------------------------------------------------------------------------------------
-- rls policies: profiles
-- rules: users can only view and update their own profile
-- note: insert handled by trigger, delete via soft delete (update)
-- ---------------------------------------------------------------------------------------------------------------------

-- authenticated users can view their own profile
create policy profiles_select_own on public.profiles
    for select
    to authenticated
    using (auth.uid() = id and deleted_at is null);

-- authenticated users can update their own profile
create policy profiles_update_own on public.profiles
    for update
    to authenticated
    using (auth.uid() = id and deleted_at is null);

-- ---------------------------------------------------------------------------------------------------------------------
-- rls policies: trackers
-- rules: 
--   - users can view their own trackers and trackers shared with them
--   - users can create, update, delete only their own trackers
-- ---------------------------------------------------------------------------------------------------------------------

-- authenticated users can view own trackers
create policy trackers_select_own on public.trackers
    for select
    to authenticated
    using (
        deleted_at is null and user_id = auth.uid()
    );

-- authenticated users can view trackers shared with them
create policy trackers_select_shared on public.trackers
    for select
    to authenticated
    using (
        deleted_at is null and
        exists (
            select 1 from public.tracker_shares ts
            where ts.tracker_id = trackers.id
            and ts.shared_with_user_id = auth.uid()
        )
    );

-- authenticated users can create their own trackers
create policy trackers_insert_own on public.trackers
    for insert
    to authenticated
    with check (user_id = auth.uid());

-- authenticated users can update their own trackers
create policy trackers_update_own on public.trackers
    for update
    to authenticated
    using (user_id = auth.uid() and deleted_at is null);

-- authenticated users can delete their own trackers
create policy trackers_delete_own on public.trackers
    for delete
    to authenticated
    using (user_id = auth.uid());

-- ---------------------------------------------------------------------------------------------------------------------
-- rls policies: tracker_shares
-- rules:
--   - tracker owners and shared users can view shares
--   - only tracker owners can create/delete shares
-- ---------------------------------------------------------------------------------------------------------------------

-- tracker owners can view shares of their trackers
create policy tracker_shares_select_owner on public.tracker_shares
    for select
    to authenticated
    using (
        exists (
            select 1 from public.trackers t
            where t.id = tracker_shares.tracker_id
            and t.user_id = auth.uid()
        )
    );

-- users can view shares where they are the recipient
create policy tracker_shares_select_recipient on public.tracker_shares
    for select
    to authenticated
    using (shared_with_user_id = auth.uid());

-- only tracker owners can create shares
create policy tracker_shares_insert_owner on public.tracker_shares
    for insert
    to authenticated
    with check (
        exists (
            select 1 from public.trackers t
            where t.id = tracker_id and t.user_id = auth.uid()
        )
    );

-- only tracker owners can delete shares
create policy tracker_shares_delete_owner on public.tracker_shares
    for delete
    to authenticated
    using (
        exists (
            select 1 from public.trackers t
            where t.id = tracker_shares.tracker_id and t.user_id = auth.uid()
        )
    );

-- ---------------------------------------------------------------------------------------------------------------------
-- rls policies: entries
-- rules:
--   - users can view entries in their own trackers and shared trackers
--   - users can add entries to their trackers and shared trackers with write permission
--   - users can update/delete only their own entries
-- ---------------------------------------------------------------------------------------------------------------------

-- users can view entries in their own trackers
create policy entries_select_own_tracker on public.entries
    for select
    to authenticated
    using (
        deleted_at is null and
        exists (
            select 1 from public.trackers t
            where t.id = entries.tracker_id
            and t.deleted_at is null
            and t.user_id = auth.uid()
        )
    );

-- users can view entries in trackers shared with them
create policy entries_select_shared_tracker on public.entries
    for select
    to authenticated
    using (
        deleted_at is null and
        exists (
            select 1 from public.trackers t
            inner join public.tracker_shares ts on ts.tracker_id = t.id
            where t.id = entries.tracker_id
            and t.deleted_at is null
            and ts.shared_with_user_id = auth.uid()
        )
    );

-- users can insert entries into their own trackers
create policy entries_insert_own_tracker on public.entries
    for insert
    to authenticated
    with check (
        user_id = auth.uid() and
        exists (
            select 1 from public.trackers t
            where t.id = tracker_id
            and t.deleted_at is null
            and t.user_id = auth.uid()
        )
    );

-- users can insert entries into trackers shared with write permission
create policy entries_insert_shared_tracker on public.entries
    for insert
    to authenticated
    with check (
        user_id = auth.uid() and
        exists (
            select 1 from public.trackers t
            inner join public.tracker_shares ts on ts.tracker_id = t.id
            where t.id = tracker_id
            and t.deleted_at is null
            and ts.shared_with_user_id = auth.uid()
            and ts.permission = 'write'
        )
    );

-- users can update only their own entries
create policy entries_update_own on public.entries
    for update
    to authenticated
    using (user_id = auth.uid() and deleted_at is null);

-- users can delete only their own entries
create policy entries_delete_own on public.entries
    for delete
    to authenticated
    using (user_id = auth.uid());

-- ---------------------------------------------------------------------------------------------------------------------
-- rls policies: api_tokens
-- rules: users can fully manage only their own api tokens
-- ---------------------------------------------------------------------------------------------------------------------

-- users can view their own api tokens
create policy api_tokens_select_own on public.api_tokens
    for select
    to authenticated
    using (user_id = auth.uid());

-- users can create their own api tokens
create policy api_tokens_insert_own on public.api_tokens
    for insert
    to authenticated
    with check (user_id = auth.uid());

-- users can update their own api tokens
create policy api_tokens_update_own on public.api_tokens
    for update
    to authenticated
    using (user_id = auth.uid());

-- users can delete their own api tokens
create policy api_tokens_delete_own on public.api_tokens
    for delete
    to authenticated
    using (user_id = auth.uid());

-- ---------------------------------------------------------------------------------------------------------------------
-- rls policies: activity_log
-- rules: users can view and create only their own activity logs
-- note: no update/delete - audit logs are immutable
-- ---------------------------------------------------------------------------------------------------------------------

-- users can view their own activity logs
create policy activity_log_select_own on public.activity_log
    for select
    to authenticated
    using (user_id = auth.uid());

-- users can create their own activity logs
create policy activity_log_insert_own on public.activity_log
    for insert
    to authenticated
    with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------------------------------------------------
-- rls policies: template_packages
-- rules: all authenticated users can view active packages (read-only, public templates)
-- note: anon users cannot access templates (requires authentication)
-- ---------------------------------------------------------------------------------------------------------------------

-- authenticated users can view active template packages
create policy template_packages_select_authenticated on public.template_packages
    for select
    to authenticated
    using (is_active = true);

-- ---------------------------------------------------------------------------------------------------------------------
-- rls policies: tracker_templates
-- rules: all authenticated users can view templates from active packages
-- note: follows parent package's is_active status
-- ---------------------------------------------------------------------------------------------------------------------

-- authenticated users can view templates from active packages
create policy tracker_templates_select_authenticated on public.tracker_templates
    for select
    to authenticated
    using (
        exists (
            select 1 from public.template_packages tp
            where tp.id = tracker_templates.package_id
            and tp.is_active = true
        )
    );

-- =====================================================================================================================
-- migration complete
-- =====================================================================================================================
