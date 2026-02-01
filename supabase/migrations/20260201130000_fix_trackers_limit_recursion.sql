-- =====================================================================================================================
-- migration: fix infinite recursion in trigger functions
-- description: adds SECURITY DEFINER only to trigger functions that need to bypass RLS for validation,
--              while maintaining proper security boundaries
-- =====================================================================================================================

-- 1. check_trackers_limit does NOT need SECURITY DEFINER
--    It uses count_user_trackers() which already has SECURITY DEFINER
--    and only reads from profiles which has simple RLS
CREATE OR REPLACE FUNCTION public.check_trackers_limit()
RETURNS TRIGGER AS $$
DECLARE
    current_count BIGINT;
    user_limit INTEGER;
BEGIN
    -- Get user's tracker limit (profiles has simple RLS, no recursion risk)
    SELECT trackers_limit INTO user_limit
    FROM public.profiles WHERE id = NEW.user_id;

    -- Count existing active trackers using security definer function to bypass RLS
    current_count := public.count_user_trackers(NEW.user_id);

    -- Enforce limit
    IF current_count >= user_limit THEN
        RAISE EXCEPTION 'tracker limit reached (max: %)', user_limit;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.check_trackers_limit IS 'enforces tracker quota per user before insert - uses count_user_trackers with SECURITY DEFINER';

-- 2. check_api_tokens_limit NEEDS SECURITY DEFINER to count tokens without RLS
CREATE OR REPLACE FUNCTION public.check_api_tokens_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_count INTEGER;
    max_tokens INTEGER := 5;
BEGIN
    -- Count active tokens for user (needs SECURITY DEFINER as api_tokens has RLS)
    SELECT COUNT(*) INTO current_count
    FROM public.api_tokens
    WHERE user_id = NEW.user_id AND is_active = TRUE;

    -- Enforce hard limit of 5 active tokens
    IF current_count >= max_tokens THEN
        RAISE EXCEPTION 'api token limit reached (max: %)', max_tokens;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.check_api_tokens_limit IS 'enforces max 5 active api tokens per user - uses SECURITY DEFINER to bypass RLS for counting';

-- 3. validate_entry_value NEEDS SECURITY DEFINER to read tracker config
CREATE OR REPLACE FUNCTION public.validate_entry_value()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    tracker_type TEXT;
    tracker_config JSONB;
    scale_min DECIMAL;
    scale_max DECIMAL;
BEGIN
    -- Fetch tracker type and configuration (needs SECURITY DEFINER as trackers has complex RLS)
    SELECT data_type, config INTO tracker_type, tracker_config
    FROM public.trackers WHERE id = NEW.tracker_id;

    -- Validate value based on tracker type
    CASE tracker_type
        WHEN 'number' THEN
            IF NEW.value_number IS NULL THEN
                RAISE EXCEPTION 'value_number is required for number type tracker';
            END IF;
            IF NEW.value_boolean IS NOT NULL OR NEW.value_text IS NOT NULL THEN
                RAISE EXCEPTION 'only value_number should be set for number type tracker';
            END IF;

        WHEN 'scale' THEN
            IF NEW.value_number IS NULL THEN
                RAISE EXCEPTION 'value_number is required for scale type tracker';
            END IF;
            -- Validate scale range from config
            scale_min := COALESCE((tracker_config->>'min')::DECIMAL, 1);
            scale_max := COALESCE((tracker_config->>'max')::DECIMAL, 10);
            IF NEW.value_number < scale_min OR NEW.value_number > scale_max THEN
                RAISE EXCEPTION 'value_number must be between % and %', scale_min, scale_max;
            END IF;
            IF NEW.value_boolean IS NOT NULL OR NEW.value_text IS NOT NULL THEN
                RAISE EXCEPTION 'only value_number should be set for scale type tracker';
            END IF;

        WHEN 'boolean' THEN
            IF NEW.value_boolean IS NULL THEN
                RAISE EXCEPTION 'value_boolean is required for boolean type tracker';
            END IF;
            IF NEW.value_number IS NOT NULL OR NEW.value_text IS NOT NULL THEN
                RAISE EXCEPTION 'only value_boolean should be set for boolean type tracker';
            END IF;

        WHEN 'text' THEN
            IF NEW.value_text IS NULL THEN
                RAISE EXCEPTION 'value_text is required for text type tracker';
            END IF;
            IF NEW.value_number IS NOT NULL OR NEW.value_boolean IS NOT NULL THEN
                RAISE EXCEPTION 'only value_text should be set for text type tracker';
            END IF;

        ELSE
            RAISE EXCEPTION 'unknown tracker type: %', tracker_type;
    END CASE;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.validate_entry_value IS 'validates entry values match tracker type and config - uses SECURITY DEFINER to read tracker config';
