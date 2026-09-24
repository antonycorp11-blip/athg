// Gerado a partir do banco Supabase (projeto ATHG). Regerar após mudar o schema.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Rel<T extends string> = { foreignKeyName: string; columns: string[]; isOneToOne: boolean; referencedRelation: T; referencedColumns: string[] }[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.5' }
  public: {
    Tables: {
      achievement_unlocks: {
        Row: { achievement_id: string; game_slug: string; unlocked_at: string; user_id: string; xp: number }
        Insert: { achievement_id: string; game_slug: string; unlocked_at?: string; user_id: string; xp?: number }
        Update: { achievement_id?: string; game_slug?: string; unlocked_at?: string; user_id?: string; xp?: number }
        Relationships: Rel<'profiles'>
      }
      app_admins: {
        Row: { created_at: string; user_id: string }
        Insert: { created_at?: string; user_id: string }
        Update: { created_at?: string; user_id?: string }
        Relationships: Rel<'profiles'>
      }
      events: {
        Row: { created_at: string; id: number; name: string; props: Json; user_id: string }
        Insert: { created_at?: string; id?: never; name: string; props?: Json; user_id?: string }
        Update: { created_at?: string; id?: never; name?: string; props?: Json; user_id?: string }
        Relationships: Rel<'profiles'>
      }
      favorites: {
        Row: { created_at: string; game_slug: string; user_id: string }
        Insert: { created_at?: string; game_slug: string; user_id: string }
        Update: { created_at?: string; game_slug?: string; user_id?: string }
        Relationships: Rel<'profiles'>
      }
      game_saves: {
        Row: { data: Json | null; game_slug: string; slot: string; updated_at: string; user_id: string }
        Insert: { data?: Json | null; game_slug: string; slot?: string; updated_at?: string; user_id: string }
        Update: { data?: Json | null; game_slug?: string; slot?: string; updated_at?: string; user_id?: string }
        Relationships: Rel<'profiles'>
      }
      game_scores: {
        Row: { best_score: number; game_slug: string; updated_at: string; user_id: string }
        Insert: { best_score: number; game_slug: string; updated_at?: string; user_id: string }
        Update: { best_score?: number; game_slug?: string; updated_at?: string; user_id?: string }
        Relationships: Rel<'profiles'>
      }
      guest_merge_tokens: {
        Row: { anon_user_id: string; created_at: string; expires_at: string; token: string }
        Insert: { anon_user_id: string; created_at?: string; expires_at?: string; token?: string }
        Update: { anon_user_id?: string; created_at?: string; expires_at?: string; token?: string }
        Relationships: Rel<'profiles'>
      }
      play_sessions: {
        Row: { device: string | null; game_slug: string; id: string; last_heartbeat_at: string; seconds_active: number; started_at: string; user_id: string }
        Insert: { device?: string | null; game_slug: string; id?: string; last_heartbeat_at?: string; seconds_active?: number; started_at?: string; user_id: string }
        Update: { device?: string | null; game_slug?: string; id?: string; last_heartbeat_at?: string; seconds_active?: number; started_at?: string; user_id?: string }
        Relationships: Rel<'profiles'>
      }
      problem_reports: {
        Row: { created_at: string; details: string; game_slug: string; id: number; status: string; type: string; url: string | null; user_agent: string | null; user_id: string | null }
        Insert: { created_at?: string; details?: string; game_slug: string; id?: never; status?: string; type: string; url?: string | null; user_agent?: string | null; user_id?: string | null }
        Update: { created_at?: string; details?: string; game_slug?: string; id?: never; status?: string; type?: string; url?: string | null; user_agent?: string | null; user_id?: string | null }
        Relationships: Rel<'profiles'>
      }
      profiles: {
        Row: { athg_id: string; avatar_seed: string; created_at: string; id: string; last_seen_at: string; username: string }
        Insert: { athg_id?: string; avatar_seed?: string; created_at?: string; id: string; last_seen_at?: string; username: string }
        Update: { athg_id?: string; avatar_seed?: string; created_at?: string; id?: string; last_seen_at?: string; username?: string }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      admin_daily: {
        Args: { p_days?: number }
        Returns: { active_users: number; day: string; minutes: number; new_users: number; sessions: number }[]
      }
      admin_devices: { Args: never; Returns: { device: string; minutes: number; sessions: number }[] }
      admin_games: {
        Args: never
        Returns: { avg_session_minutes: number; favorites: number; game_slug: string; minutes: number; players: number; players_7d: number; sessions: number }[]
      }
      admin_overview: { Args: never; Returns: Json }
      admin_reports: {
        Args: { p_limit?: number }
        Returns: { created_at: string; details: string; game_slug: string; id: number; status: string; type: string; user_agent: string; username: string }[]
      }
      admin_retention: { Args: never; Returns: Json }
      admin_search_misses: { Args: { p_limit?: number }; Returns: { last_at: string; query: string; times: number }[] }
      admin_set_report_status: { Args: { p_id: number; p_status: string }; Returns: undefined }
      admin_users: {
        Args: { p_limit?: number; p_offset?: number; p_search?: string }
        Returns: {
          created_at: string
          email: string
          games: number
          id: string
          is_anonymous: boolean
          last_seen_at: string
          level: number
          minutes: number
          sessions: number
          total_count: number
          username: string
        }[]
      }
      create_guest_merge_token: { Args: never; Returns: string }
      delete_my_account: { Args: never; Returns: undefined }
      heartbeat: { Args: { p_seconds: number; p_session: string }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      leaderboard: {
        Args: { p_board: string; p_limit?: number }
        Returns: { avatar_seed: string; is_me: boolean; level: number; rank: number; score: number; username: string }[]
      }
      level_from_xp: { Args: { p_xp: number }; Returns: number }
      merge_guest: { Args: { p_token: string }; Returns: boolean }
      start_session: { Args: { p_device?: string; p_game: string }; Returns: string }
      submit_score: { Args: { p_game: string; p_score: number }; Returns: undefined }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
