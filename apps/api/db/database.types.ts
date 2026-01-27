export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string;
          changes: Json | null;
          created_at: string;
          entity_id: string;
          entity_type: string;
          id: string;
          ip_address: unknown;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          action: string;
          changes?: Json | null;
          created_at?: string;
          entity_id: string;
          entity_type: string;
          id?: string;
          ip_address?: unknown;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          action?: string;
          changes?: Json | null;
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          ip_address?: unknown;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'activity_log_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      api_tokens: {
        Row: {
          created_at: string;
          expires_at: string | null;
          id: string;
          is_active: boolean;
          last_used_at: string | null;
          name: string;
          revoked_at: string | null;
          token_hash: string;
          token_prefix: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean;
          last_used_at?: string | null;
          name: string;
          revoked_at?: string | null;
          token_hash: string;
          token_prefix: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean;
          last_used_at?: string | null;
          name?: string;
          revoked_at?: string | null;
          token_hash?: string;
          token_prefix?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'api_tokens_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      entries: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          id: string;
          recorded_at: string;
          tracker_id: string;
          updated_at: string;
          user_id: string;
          value_boolean: boolean | null;
          value_json: Json | null;
          value_number: number | null;
          value_text: string | null;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          recorded_at?: string;
          tracker_id: string;
          updated_at?: string;
          user_id: string;
          value_boolean?: boolean | null;
          value_json?: Json | null;
          value_number?: number | null;
          value_text?: string | null;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          recorded_at?: string;
          tracker_id?: string;
          updated_at?: string;
          user_id?: string;
          value_boolean?: boolean | null;
          value_json?: Json | null;
          value_number?: number | null;
          value_text?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'entries_tracker_id_fkey';
            columns: ['tracker_id'];
            isOneToOne: false;
            referencedRelation: 'trackers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'entries_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          api_requests_per_hour: number;
          created_at: string;
          deleted_at: string | null;
          display_name: string;
          id: string;
          onboarding_completed: boolean;
          preferred_theme: string;
          timezone: string;
          trackers_limit: number;
          updated_at: string;
        };
        Insert: {
          api_requests_per_hour?: number;
          created_at?: string;
          deleted_at?: string | null;
          display_name: string;
          id: string;
          onboarding_completed?: boolean;
          preferred_theme?: string;
          timezone?: string;
          trackers_limit?: number;
          updated_at?: string;
        };
        Update: {
          api_requests_per_hour?: number;
          created_at?: string;
          deleted_at?: string | null;
          display_name?: string;
          id?: string;
          onboarding_completed?: boolean;
          preferred_theme?: string;
          timezone?: string;
          trackers_limit?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      template_packages: {
        Row: {
          created_at: string;
          description: string | null;
          display_order: number;
          icon: string | null;
          id: string;
          is_active: boolean;
          name: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          display_order?: number;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          display_order?: number;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
        };
        Relationships: [];
      };
      tracker_shares: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          permission: string;
          shared_with_user_id: string;
          tracker_id: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          id?: string;
          permission?: string;
          shared_with_user_id: string;
          tracker_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          permission?: string;
          shared_with_user_id?: string;
          tracker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tracker_shares_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tracker_shares_shared_with_user_id_fkey';
            columns: ['shared_with_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tracker_shares_tracker_id_fkey';
            columns: ['tracker_id'];
            isOneToOne: false;
            referencedRelation: 'trackers';
            referencedColumns: ['id'];
          },
        ];
      };
      tracker_templates: {
        Row: {
          color: string | null;
          config: Json;
          created_at: string;
          data_type: string;
          display_order: number;
          icon: string | null;
          id: string;
          name: string;
          package_id: string;
          unit: string | null;
        };
        Insert: {
          color?: string | null;
          config?: Json;
          created_at?: string;
          data_type: string;
          display_order?: number;
          icon?: string | null;
          id?: string;
          name: string;
          package_id: string;
          unit?: string | null;
        };
        Update: {
          color?: string | null;
          config?: Json;
          created_at?: string;
          data_type?: string;
          display_order?: number;
          icon?: string | null;
          id?: string;
          name?: string;
          package_id?: string;
          unit?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'tracker_templates_package_id_fkey';
            columns: ['package_id'];
            isOneToOne: false;
            referencedRelation: 'template_packages';
            referencedColumns: ['id'];
          },
        ];
      };
      trackers: {
        Row: {
          color: string | null;
          config: Json;
          created_at: string;
          data_type: string;
          deleted_at: string | null;
          display_order: number;
          icon: string | null;
          id: string;
          is_active: boolean;
          name: string;
          unit: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          color?: string | null;
          config?: Json;
          created_at?: string;
          data_type: string;
          deleted_at?: string | null;
          display_order?: number;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          unit?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          color?: string | null;
          config?: Json;
          created_at?: string;
          data_type?: string;
          deleted_at?: string | null;
          display_order?: number;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          unit?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'trackers_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
