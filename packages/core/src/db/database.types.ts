// GENERATED FILE — DO NOT EDIT.
// Regenerate with: pnpm db:types (Supabase linked schema, see supabase/migrations).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      deck_versions: {
        Row: {
          created_at: string
          deck_id: string
          id: string
          list: Json
          owner_id: string
        }
        Insert: {
          created_at?: string
          deck_id: string
          id?: string
          list: Json
          owner_id: string
        }
        Update: {
          created_at?: string
          deck_id?: string
          id?: string
          list?: Json
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deck_versions_deck_id_owner_id_fkey"
            columns: ["deck_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
      decks: {
        Row: {
          created_at: string
          current_version_id: string | null
          id: string
          import_source: string
          name: string
          owner_id: string
          source_code: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_version_id?: string | null
          id?: string
          import_source: string
          name: string
          owner_id?: string
          source_code?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_version_id?: string | null
          id?: string
          import_source?: string
          name?: string
          owner_id?: string
          source_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "decks_current_version_fkey"
            columns: ["id", "current_version_id"]
            isOneToOne: false
            referencedRelation: "deck_versions"
            referencedColumns: ["deck_id", "id"]
          },
        ]
      }
      games: {
        Row: {
          created_at: string
          ended_at: string | null
          game_index: number
          id: string
          match_id: string
          scores_at_end: Json
          started_at: string
          user_id: string
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          game_index: number
          id: string
          match_id: string
          scores_at_end: Json
          started_at: string
          user_id?: string
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          game_index?: number
          id?: string
          match_id?: string
          scores_at_end?: Json
          started_at?: string
          user_id?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          best_of: number
          created_at: string
          ended_at: string
          guest_user_ids: string[]
          host_user_id: string | null
          id: string
          players: Json
          started_at: string
          time_limit_seconds: number | null
          user_id: string
          winner_id: string | null
        }
        Insert: {
          best_of: number
          created_at?: string
          ended_at: string
          guest_user_ids?: string[]
          host_user_id?: string | null
          id: string
          players: Json
          started_at: string
          time_limit_seconds?: number | null
          user_id?: string
          winner_id?: string | null
        }
        Update: {
          best_of?: number
          created_at?: string
          ended_at?: string
          guest_user_ids?: string[]
          host_user_id?: string | null
          id?: string
          players?: Json
          started_at?: string
          time_limit_seconds?: number | null
          user_id?: string
          winner_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          onboarded_at: string | null
          updated_at: string
          username: string
          username_changed_at: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          onboarded_at?: string | null
          updated_at?: string
          username: string
          username_changed_at?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          onboarded_at?: string | null
          updated_at?: string
          username?: string
          username_changed_at?: string | null
        }
        Relationships: []
      }
      reserved_names: {
        Row: {
          name: string
        }
        Insert: {
          name: string
        }
        Update: {
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_username: { Args: { p_username: string }; Returns: string }
      complete_onboarding: {
        Args: { p_display_name: string; p_username: string }
        Returns: string
      }
      create_deck: {
        Args: {
          p_import_source: string
          p_list: Json
          p_name: string
          p_source_code: string
        }
        Returns: string
      }
      insert_seed_profile: {
        Args: { p_display_name: string; p_uid: string }
        Returns: undefined
      }
      is_deck_list: { Args: { p_list: Json }; Returns: boolean }
      is_name_reserved: { Args: { p_name: string }; Returns: boolean }
      is_username_available: { Args: { p_username: string }; Returns: string }
      require_account: { Args: never; Returns: string }
      seed_display_name: {
        Args: { p_email: string; p_meta: Json }
        Returns: string
      }
      set_username: {
        Args: { p_uid: string; p_username: string }
        Returns: string
      }
      username_status: {
        Args: { p_self: string; p_username: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
