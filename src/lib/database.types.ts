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
  public: {
    Tables: {
      awards: {
        Row: {
          created_at: string
          description: string | null
          game_type_id: number | null
          id: number
          is_voting_based: boolean
          name: string
          sport_id: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          game_type_id?: number | null
          id?: never
          is_voting_based?: boolean
          name: string
          sport_id?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          game_type_id?: number | null
          id?: never
          is_voting_based?: boolean
          name?: string
          sport_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "awards_game_type_id_fkey"
            columns: ["game_type_id"]
            isOneToOne: false
            referencedRelation: "game_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awards_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      game_types: {
        Row: {
          default_max_players: number
          default_max_waitlist: number
          id: number
          name: string
          sport_id: number
        }
        Insert: {
          default_max_players: number
          default_max_waitlist: number
          id?: never
          name: string
          sport_id: number
        }
        Update: {
          default_max_players?: number
          default_max_waitlist?: number
          id?: never
          name?: string
          sport_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_types_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          joined_at: string
          role: string
          skill_level: number | null
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          role: string
          skill_level?: number | null
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          role?: string
          skill_level?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      group_seasons: {
        Row: {
          created_at: string
          deleted_at: string | null
          end_date: string
          group_id: string
          id: number
          name: string
          start_date: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          end_date: string
          group_id: string
          id?: never
          name: string
          start_date: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          end_date?: string
          group_id?: string
          id?: never
          name?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_seasons_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      match_awards: {
        Row: {
          award_id: number
          created_at: string
          id: number
          match_id: string
          user_id: string
        }
        Insert: {
          award_id: number
          created_at?: string
          id?: never
          match_id: string
          user_id: string
        }
        Update: {
          award_id?: number
          created_at?: string
          id?: never
          match_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_awards_award_id_fkey"
            columns: ["award_id"]
            isOneToOne: false
            referencedRelation: "awards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_awards_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_awards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      match_players: {
        Row: {
          assists: number | null
          goals_scored: number | null
          guest_name: string | null
          id: string
          match_id: string
          status: Database["public"]["Enums"]["player_status_enum"]
          tactical_position: string | null
          team: string | null
          user_id: string | null
        }
        Insert: {
          assists?: number | null
          goals_scored?: number | null
          guest_name?: string | null
          id?: string
          match_id: string
          status?: Database["public"]["Enums"]["player_status_enum"]
          tactical_position?: string | null
          team?: string | null
          user_id?: string | null
        }
        Update: {
          assists?: number | null
          goals_scored?: number | null
          guest_name?: string | null
          id?: string
          match_id?: string
          status?: Database["public"]["Enums"]["player_status_enum"]
          tactical_position?: string | null
          team?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_players_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      match_votes: {
        Row: {
          award_id: number
          created_at: string
          id: number
          match_id: string
          voted_user_id: string
          voter_user_id: string
        }
        Insert: {
          award_id: number
          created_at?: string
          id?: never
          match_id: string
          voted_user_id: string
          voter_user_id: string
        }
        Update: {
          award_id?: number
          created_at?: string
          id?: never
          match_id?: string
          voted_user_id?: string
          voter_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_votes_award_id_fkey"
            columns: ["award_id"]
            isOneToOne: false
            referencedRelation: "awards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_votes_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_votes_voted_user_id_fkey"
            columns: ["voted_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_votes_voter_user_id_fkey"
            columns: ["voter_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          date_time: string
          deleted_at: string | null
          game_type_id: number
          group_id: string | null
          id: string
          location: string
          max_players: number
          max_waitlist: number
          organizer_id: string
          status: Database["public"]["Enums"]["match_status_enum"]
          team_a_name: string | null
          team_a_score: number | null
          team_b_name: string | null
          team_b_score: number | null
        }
        Insert: {
          created_at?: string
          date_time: string
          deleted_at?: string | null
          game_type_id: number
          group_id?: string | null
          id?: string
          location: string
          max_players: number
          max_waitlist: number
          organizer_id: string
          status?: Database["public"]["Enums"]["match_status_enum"]
          team_a_name?: string | null
          team_a_score?: number | null
          team_b_name?: string | null
          team_b_score?: number | null
        }
        Update: {
          created_at?: string
          date_time?: string
          deleted_at?: string | null
          game_type_id?: number
          group_id?: string | null
          id?: string
          location?: string
          max_players?: number
          max_waitlist?: number
          organizer_id?: string
          status?: Database["public"]["Enums"]["match_status_enum"]
          team_a_name?: string | null
          team_a_score?: number | null
          team_b_name?: string | null
          team_b_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_game_type_id_fkey"
            columns: ["game_type_id"]
            isOneToOne: false
            referencedRelation: "game_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          code: string
          game_type_id: number
          id: number
          name: string
        }
        Insert: {
          code: string
          game_type_id: number
          id?: never
          name: string
        }
        Update: {
          code?: string
          game_type_id?: number
          id?: never
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_game_type_id_fkey"
            columns: ["game_type_id"]
            isOneToOne: false
            referencedRelation: "game_types"
            referencedColumns: ["id"]
          },
        ]
      }
      season_awards: {
        Row: {
          award_id: number
          created_at: string
          id: number
          season_id: number
          user_id: string
        }
        Insert: {
          award_id: number
          created_at?: string
          id?: never
          season_id: number
          user_id: string
        }
        Update: {
          award_id?: number
          created_at?: string
          id?: never
          season_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_awards_award_id_fkey"
            columns: ["award_id"]
            isOneToOne: false
            referencedRelation: "awards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_awards_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "group_seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_awards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sports: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: never
          name: string
        }
        Update: {
          id?: never
          name?: string
        }
        Relationships: []
      }
      user_favorite_positions: {
        Row: {
          is_primary: boolean
          position_id: number
          user_id: string
        }
        Insert: {
          is_primary?: boolean
          position_id: number
          user_id: string
        }
        Update: {
          is_primary?: boolean
          position_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorite_positions_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorite_positions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          email: string
          id: string
          name: string
          role: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          id?: string
          name: string
          role?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          id?: string
          name?: string
          role?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      match_status_enum: "open" | "in_progress" | "finished" | "cancelled"
      player_status_enum: "confirmed" | "waitlist" | "cancelled"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      match_status_enum: ["open", "in_progress", "finished", "cancelled"],
      player_status_enum: ["confirmed", "waitlist", "cancelled"],
    },
  },
} as const
