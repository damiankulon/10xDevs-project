/**
 * Database types generated from Supabase schema
 * Run `npx supabase gen types typescript` to regenerate after migrations
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  graphql_public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: {
      graphql: {
        Args: {
          operationName?: string;
          query?: string;
          variables?: Json;
          extensions?: Json;
        };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          onboarding_completed: boolean;
          preferred_theme: 'light' | 'dark' | 'system';
          trackers_limit: number;
          api_requests_per_hour: number;
          timezone: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          display_name: string;
          onboarding_completed?: boolean;
          preferred_theme?: 'light' | 'dark' | 'system';
          trackers_limit?: number;
          api_requests_per_hour?: number;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          display_name?: string;
          onboarding_completed?: boolean;
          preferred_theme?: 'light' | 'dark' | 'system';
          trackers_limit?: number;
          api_requests_per_hour?: number;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      trackers: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          data_type: 'number' | 'scale' | 'boolean' | 'text';
          unit: string | null;
          config: Json;
          color: string | null;
          icon: string | null;
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          data_type: 'number' | 'scale' | 'boolean' | 'text';
          unit?: string | null;
          config?: Json;
          color?: string | null;
          icon?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          data_type?: 'number' | 'scale' | 'boolean' | 'text';
          unit?: string | null;
          config?: Json;
          color?: string | null;
          icon?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      tracker_shares: {
        Row: {
          id: string;
          tracker_id: string;
          shared_with_user_id: string;
          permission: 'read' | 'write';
          created_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          tracker_id: string;
          shared_with_user_id: string;
          permission?: 'read' | 'write';
          created_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          tracker_id?: string;
          shared_with_user_id?: string;
          permission?: 'read' | 'write';
          created_at?: string;
          created_by?: string;
        };
      };
      entries: {
        Row: {
          id: string;
          tracker_id: string;
          user_id: string;
          value_number: number | null;
          value_boolean: boolean | null;
          value_text: string | null;
          value_json: Json | null;
          recorded_at: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tracker_id: string;
          user_id: string;
          value_number?: number | null;
          value_boolean?: boolean | null;
          value_text?: string | null;
          value_json?: Json | null;
          recorded_at?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          tracker_id?: string;
          user_id?: string;
          value_number?: number | null;
          value_boolean?: boolean | null;
          value_text?: string | null;
          value_json?: Json | null;
          recorded_at?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      api_tokens: {
        Row: {
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
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          token_hash: string;
          token_prefix: string;
          last_used_at?: string | null;
          expires_at?: string | null;
          is_active?: boolean;
          revoked_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          token_hash?: string;
          token_prefix?: string;
          last_used_at?: string | null;
          expires_at?: string | null;
          is_active?: boolean;
          revoked_at?: string | null;
          created_at?: string;
        };
      };
      template_packages: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          icon: string | null;
          display_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          icon?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          icon?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };
      tracker_templates: {
        Row: {
          id: string;
          package_id: string;
          name: string;
          data_type: 'number' | 'scale' | 'boolean' | 'text';
          unit: string | null;
          config: Json;
          color: string | null;
          icon: string | null;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          package_id: string;
          name: string;
          data_type: 'number' | 'scale' | 'boolean' | 'text';
          unit?: string | null;
          config?: Json;
          color?: string | null;
          icon?: string | null;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          package_id?: string;
          name?: string;
          data_type?: 'number' | 'scale' | 'boolean' | 'text';
          unit?: string | null;
          config?: Json;
          color?: string | null;
          icon?: string | null;
          display_order?: number;
          created_at?: string;
        };
      };
      activity_log: {
        Row: {
          id: string;
          user_id: string;
          entity_type:
            | 'tracker'
            | 'entry'
            | 'api_token'
            | 'profile'
            | 'tracker_share';
          entity_id: string;
          action: 'create' | 'update' | 'delete' | 'restore';
          changes: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          entity_type:
            | 'tracker'
            | 'entry'
            | 'api_token'
            | 'profile'
            | 'tracker_share';
          entity_id: string;
          action: 'create' | 'update' | 'delete' | 'restore';
          changes?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          entity_type?:
            | 'tracker'
            | 'entry'
            | 'api_token'
            | 'profile'
            | 'tracker_share';
          entity_id?: string;
          action?: 'create' | 'update' | 'delete' | 'restore';
          changes?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
