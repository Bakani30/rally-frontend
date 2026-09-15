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
      abuse_flags: {
        Row: {
          created_at: string
          id: string
          kind: string
          payload: Json
          reason: string
          related_match_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
          status: string
          subject_user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          reason: string
          related_match_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          status?: string
          subject_user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          reason?: string
          related_match_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          status?: string
          subject_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "abuse_flags_related_match_id_fkey"
            columns: ["related_match_id"]
            isOneToOne: false
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abuse_flags_related_match_id_fkey"
            columns: ["related_match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abuse_flags_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "abuse_flags_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abuse_flags_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "abuse_flags_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      account_deletion_requests: {
        Row: {
          canceled_at: string | null
          completed_at: string | null
          id: string
          reason: string | null
          requested_at: string
          scheduled_for: string
          status: string
          user_id: string
        }
        Insert: {
          canceled_at?: string | null
          completed_at?: string | null
          id?: string
          reason?: string | null
          requested_at?: string
          scheduled_for: string
          status?: string
          user_id: string
        }
        Update: {
          canceled_at?: string | null
          completed_at?: string | null
          id?: string
          reason?: string | null
          requested_at?: string
          scheduled_for?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_deletion_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "account_deletion_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_ratings: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          decisive_matches: number | null
          losses: number
          matches_in_activity: number
          rating: number
          season_id: string
          tier: Database["public"]["Enums"]["tier"]
          updated_at: string
          user_id: string
          wins: number
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          decisive_matches?: number | null
          losses?: number
          matches_in_activity?: number
          rating?: number
          season_id: string
          tier?: Database["public"]["Enums"]["tier"]
          updated_at?: string
          user_id: string
          wins?: number
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          decisive_matches?: number | null
          losses?: number
          matches_in_activity?: number
          rating?: number
          season_id?: string
          tier?: Database["public"]["Enums"]["tier"]
          updated_at?: string
          user_id?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "activity_ratings_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "activity_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_session_links: {
        Row: {
          activity_session_id: string
          challenge_id: string | null
          created_at: string
          group_session_id: string | null
          guild_goal_id: string | null
          id: string
          link_type: Database["public"]["Enums"]["activity_link_type"]
          match_id: string | null
          metadata: Json
        }
        Insert: {
          activity_session_id: string
          challenge_id?: string | null
          created_at?: string
          group_session_id?: string | null
          guild_goal_id?: string | null
          id?: string
          link_type: Database["public"]["Enums"]["activity_link_type"]
          match_id?: string | null
          metadata?: Json
        }
        Update: {
          activity_session_id?: string
          challenge_id?: string | null
          created_at?: string
          group_session_id?: string | null
          guild_goal_id?: string | null
          id?: string
          link_type?: Database["public"]["Enums"]["activity_link_type"]
          match_id?: string | null
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "activity_session_links_activity_session_id_fkey"
            columns: ["activity_session_id"]
            isOneToOne: false
            referencedRelation: "activity_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_session_links_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_session_links_group_session_id_fkey"
            columns: ["group_session_id"]
            isOneToOne: false
            referencedRelation: "group_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_session_links_guild_goal_id_fkey"
            columns: ["guild_goal_id"]
            isOneToOne: false
            referencedRelation: "guild_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_session_links_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_session_links_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_session_media: {
        Row: {
          activity_session_id: string
          caption: string | null
          captured_at: string | null
          created_at: string
          id: string
          media_type: Database["public"]["Enums"]["activity_media_type"]
          metadata: Json
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          activity_session_id: string
          caption?: string | null
          captured_at?: string | null
          created_at?: string
          id?: string
          media_type: Database["public"]["Enums"]["activity_media_type"]
          metadata?: Json
          storage_path: string
          uploaded_by: string
        }
        Update: {
          activity_session_id?: string
          caption?: string | null
          captured_at?: string | null
          created_at?: string
          id?: string
          media_type?: Database["public"]["Enums"]["activity_media_type"]
          metadata?: Json
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_session_media_activity_session_id_fkey"
            columns: ["activity_session_id"]
            isOneToOne: false
            referencedRelation: "activity_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_session_media_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "activity_session_media_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_session_participants: {
        Row: {
          activity_session_id: string
          attendance_status: string
          created_at: string
          display_name: string | null
          id: string
          role: Database["public"]["Enums"]["participant_role"]
          side: number | null
          stats: Json
          user_id: string | null
        }
        Insert: {
          activity_session_id: string
          attendance_status?: string
          created_at?: string
          display_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["participant_role"]
          side?: number | null
          stats?: Json
          user_id?: string | null
        }
        Update: {
          activity_session_id?: string
          attendance_status?: string
          created_at?: string
          display_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["participant_role"]
          side?: number | null
          stats?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_session_participants_activity_session_id_fkey"
            columns: ["activity_session_id"]
            isOneToOne: false
            referencedRelation: "activity_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_session_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "activity_session_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_session_rating_snapshots: {
        Row: {
          activity_session_id: string
          created_at: string
          id: string
          rating_after: number
          rating_before: number
          rating_delta: number | null
          rating_system: string
          user_id: string
        }
        Insert: {
          activity_session_id: string
          created_at?: string
          id?: string
          rating_after: number
          rating_before: number
          rating_delta?: number | null
          rating_system: string
          user_id: string
        }
        Update: {
          activity_session_id?: string
          created_at?: string
          id?: string
          rating_after?: number
          rating_before?: number
          rating_delta?: number | null
          rating_system?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_session_rating_snapshots_activity_session_id_fkey"
            columns: ["activity_session_id"]
            isOneToOne: false
            referencedRelation: "activity_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_session_rating_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "activity_session_rating_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_sessions: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          context: Json
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          external_workout_id: string | null
          id: string
          location_name: string | null
          mood_after: number | null
          mood_before: number | null
          notes: string | null
          perceived_effort: number | null
          point_delta: number | null
          raw_data_hash: string | null
          reflection: Json
          source: Database["public"]["Enums"]["activity_source"]
          started_at: string
          status: Database["public"]["Enums"]["activity_session_status"]
          title: string | null
          updated_at: string
          user_id: string
          verification_level: number
          verification_notes: string | null
          verified_at: string | null
          visibility: Database["public"]["Enums"]["activity_visibility"]
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          context?: Json
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          external_workout_id?: string | null
          id?: string
          location_name?: string | null
          mood_after?: number | null
          mood_before?: number | null
          notes?: string | null
          perceived_effort?: number | null
          point_delta?: number | null
          raw_data_hash?: string | null
          reflection?: Json
          source?: Database["public"]["Enums"]["activity_source"]
          started_at: string
          status?: Database["public"]["Enums"]["activity_session_status"]
          title?: string | null
          updated_at?: string
          user_id: string
          verification_level?: number
          verification_notes?: string | null
          verified_at?: string | null
          visibility?: Database["public"]["Enums"]["activity_visibility"]
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          context?: Json
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          external_workout_id?: string | null
          id?: string
          location_name?: string | null
          mood_after?: number | null
          mood_before?: number | null
          notes?: string | null
          perceived_effort?: number | null
          point_delta?: number | null
          raw_data_hash?: string | null
          reflection?: Json
          source?: Database["public"]["Enums"]["activity_source"]
          started_at?: string
          status?: Database["public"]["Enums"]["activity_session_status"]
          title?: string | null
          updated_at?: string
          user_id?: string
          verification_level?: number
          verification_notes?: string | null
          verified_at?: string | null
          visibility?: Database["public"]["Enums"]["activity_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "activity_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "activity_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_actions: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          id: string
          note: string | null
          payload: Json
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          id?: string
          note?: string | null
          payload?: Json
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          note?: string | null
          payload?: Json
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_actions_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      alpha_feature_gate_allowlist: {
        Row: {
          created_at: string
          enabled: boolean
          feature_key: string
          note: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feature_key: string
          note?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature_key?: string
          note?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alpha_feature_gate_allowlist_feature_key_fkey"
            columns: ["feature_key"]
            isOneToOne: false
            referencedRelation: "alpha_feature_gates"
            referencedColumns: ["feature_key"]
          },
        ]
      }
      alpha_feature_gates: {
        Row: {
          feature_key: string
          status: Database["public"]["Enums"]["alpha_feature_gate_status"]
          updated_at: string
        }
        Insert: {
          feature_key: string
          status?: Database["public"]["Enums"]["alpha_feature_gate_status"]
          updated_at?: string
        }
        Update: {
          feature_key?: string
          status?: Database["public"]["Enums"]["alpha_feature_gate_status"]
          updated_at?: string
        }
        Relationships: []
      }
      alpha_referee_applications: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          applied_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          applied_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          applied_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alpha_referee_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "alpha_referee_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      alpha_referee_live_score_drafts: {
        Row: {
          assignment_id: string
          correction_note: string | null
          correction_requested_at: string | null
          created_at: string
          id: string
          match_id: string
          quarter_boundaries: Json
          referee_user_id: string
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          assignment_id: string
          correction_note?: string | null
          correction_requested_at?: string | null
          created_at?: string
          id?: string
          match_id: string
          quarter_boundaries?: Json
          referee_user_id: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          correction_note?: string | null
          correction_requested_at?: string | null
          created_at?: string
          id?: string
          match_id?: string
          quarter_boundaries?: Json
          referee_user_id?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alpha_referee_live_score_drafts_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: true
            referencedRelation: "match_referee_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alpha_referee_live_score_drafts_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alpha_referee_live_score_drafts_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alpha_referee_live_score_drafts_referee_user_id_fkey"
            columns: ["referee_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "alpha_referee_live_score_drafts_referee_user_id_fkey"
            columns: ["referee_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      alpha_referee_player_stat_drafts: {
        Row: {
          assists: number
          blocks: number
          created_at: string
          draft_id: string
          id: string
          match_id: string
          points: number
          rebounds: number
          side_index: number
          three_pointers_made: number
          turnovers: number
          updated_at: string
          user_id: string
        }
        Insert: {
          assists?: number
          blocks?: number
          created_at?: string
          draft_id: string
          id?: string
          match_id: string
          points?: number
          rebounds?: number
          side_index: number
          three_pointers_made?: number
          turnovers?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          assists?: number
          blocks?: number
          created_at?: string
          draft_id?: string
          id?: string
          match_id?: string
          points?: number
          rebounds?: number
          side_index?: number
          three_pointers_made?: number
          turnovers?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alpha_referee_player_stat_drafts_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "alpha_referee_live_score_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alpha_referee_player_stat_drafts_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alpha_referee_player_stat_drafts_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alpha_referee_player_stat_drafts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "alpha_referee_player_stat_drafts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      alpha_referee_result_submissions: {
        Row: {
          assignment_id: string
          created_at: string
          id: string
          is_tie: boolean
          match_id: string
          note: string | null
          proof_urls: string[]
          referee_user_id: string
          result_kind: string
          running_draft_id: string | null
          side_0_score: number | null
          side_1_score: number | null
          status: string
          updated_at: string
          winner_side: number | null
          winner_user_id: string | null
        }
        Insert: {
          assignment_id: string
          created_at?: string
          id?: string
          is_tie?: boolean
          match_id: string
          note?: string | null
          proof_urls?: string[]
          referee_user_id: string
          result_kind: string
          running_draft_id?: string | null
          side_0_score?: number | null
          side_1_score?: number | null
          status?: string
          updated_at?: string
          winner_side?: number | null
          winner_user_id?: string | null
        }
        Update: {
          assignment_id?: string
          created_at?: string
          id?: string
          is_tie?: boolean
          match_id?: string
          note?: string | null
          proof_urls?: string[]
          referee_user_id?: string
          result_kind?: string
          running_draft_id?: string | null
          side_0_score?: number | null
          side_1_score?: number | null
          status?: string
          updated_at?: string
          winner_side?: number | null
          winner_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alpha_referee_result_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "match_referee_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alpha_referee_result_submissions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alpha_referee_result_submissions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alpha_referee_result_submissions_referee_user_id_fkey"
            columns: ["referee_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "alpha_referee_result_submissions_referee_user_id_fkey"
            columns: ["referee_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alpha_referee_result_submissions_running_draft_id_fkey"
            columns: ["running_draft_id"]
            isOneToOne: false
            referencedRelation: "alpha_referee_running_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alpha_referee_result_submissions_winner_user_id_fkey"
            columns: ["winner_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "alpha_referee_result_submissions_winner_user_id_fkey"
            columns: ["winner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      alpha_referee_running_drafts: {
        Row: {
          assignment_id: string
          correction_note: string | null
          correction_requested_at: string | null
          created_at: string
          id: string
          match_id: string
          referee_user_id: string
          started_at: string | null
          status: string
          submitted_at: string | null
          target_distance_meters: number | null
          updated_at: string
        }
        Insert: {
          assignment_id: string
          correction_note?: string | null
          correction_requested_at?: string | null
          created_at?: string
          id?: string
          match_id: string
          referee_user_id: string
          started_at?: string | null
          status?: string
          submitted_at?: string | null
          target_distance_meters?: number | null
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          correction_note?: string | null
          correction_requested_at?: string | null
          created_at?: string
          id?: string
          match_id?: string
          referee_user_id?: string
          started_at?: string | null
          status?: string
          submitted_at?: string | null
          target_distance_meters?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alpha_referee_running_drafts_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: true
            referencedRelation: "match_referee_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alpha_referee_running_drafts_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alpha_referee_running_drafts_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alpha_referee_running_drafts_referee_user_id_fkey"
            columns: ["referee_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "alpha_referee_running_drafts_referee_user_id_fkey"
            columns: ["referee_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      alpha_referee_running_marks: {
        Row: {
          checkpoint_index: number | null
          created_at: string
          draft_id: string
          elapsed_ms: number
          id: string
          mark_type: string
          match_id: string
          note: string | null
          participant_user_id: string | null
          recorded_at: string
          side_index: number
          updated_at: string
        }
        Insert: {
          checkpoint_index?: number | null
          created_at?: string
          draft_id: string
          elapsed_ms: number
          id?: string
          mark_type: string
          match_id: string
          note?: string | null
          participant_user_id?: string | null
          recorded_at?: string
          side_index: number
          updated_at?: string
        }
        Update: {
          checkpoint_index?: number | null
          created_at?: string
          draft_id?: string
          elapsed_ms?: number
          id?: string
          mark_type?: string
          match_id?: string
          note?: string | null
          participant_user_id?: string | null
          recorded_at?: string
          side_index?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alpha_referee_running_marks_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "alpha_referee_running_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alpha_referee_running_marks_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alpha_referee_running_marks_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alpha_referee_running_marks_participant_user_id_fkey"
            columns: ["participant_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "alpha_referee_running_marks_participant_user_id_fkey"
            columns: ["participant_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_audit_events: {
        Row: {
          actor_user_id: string | null
          arena_id: string | null
          created_at: string
          event_type: string
          id: string
          payload: Json
          round_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          arena_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          round_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          arena_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          round_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "arena_audit_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "arena_audit_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_audit_events_arena_id_fkey"
            columns: ["arena_id"]
            isOneToOne: false
            referencedRelation: "arena_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_audit_events_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "arena_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_events: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          base_stake_per_player: number
          created_at: string
          created_by: string
          current_champion_streak: number
          current_champion_team_id: string | null
          entry_code: string | null
          id: string
          join_code: string | null
          join_mode: Database["public"]["Enums"]["arena_join_mode"]
          max_streak: number
          rule_text: string
          status: Database["public"]["Enums"]["arena_event_status"]
          streak_increment_per_player: number
          target_score: number
          team_size_per_side: number
          time_limit_seconds: number
          title: string
          updated_at: string
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          base_stake_per_player?: number
          created_at?: string
          created_by: string
          current_champion_streak?: number
          current_champion_team_id?: string | null
          entry_code?: string | null
          id?: string
          join_code?: string | null
          join_mode?: Database["public"]["Enums"]["arena_join_mode"]
          max_streak?: number
          rule_text: string
          status?: Database["public"]["Enums"]["arena_event_status"]
          streak_increment_per_player?: number
          target_score: number
          team_size_per_side: number
          time_limit_seconds: number
          title: string
          updated_at?: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          base_stake_per_player?: number
          created_at?: string
          created_by?: string
          current_champion_streak?: number
          current_champion_team_id?: string | null
          entry_code?: string | null
          id?: string
          join_code?: string | null
          join_mode?: Database["public"]["Enums"]["arena_join_mode"]
          max_streak?: number
          rule_text?: string
          status?: Database["public"]["Enums"]["arena_event_status"]
          streak_increment_per_player?: number
          target_score?: number
          team_size_per_side?: number
          time_limit_seconds?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "arena_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "arena_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_events_current_champion_team_id_fkey"
            columns: ["current_champion_team_id"]
            isOneToOne: false
            referencedRelation: "arena_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_referees: {
        Row: {
          accepted_at: string
          arena_id: string
          created_at: string
          rotation_index: number
          status: Database["public"]["Enums"]["arena_referee_status"]
          user_id: string
        }
        Insert: {
          accepted_at?: string
          arena_id: string
          created_at?: string
          rotation_index?: number
          status?: Database["public"]["Enums"]["arena_referee_status"]
          user_id: string
        }
        Update: {
          accepted_at?: string
          arena_id?: string
          created_at?: string
          rotation_index?: number
          status?: Database["public"]["Enums"]["arena_referee_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arena_referees_arena_id_fkey"
            columns: ["arena_id"]
            isOneToOne: false
            referencedRelation: "arena_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_referees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "arena_referees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_round_disputes: {
        Row: {
          created_at: string
          id: string
          reason: string
          reporter_user_id: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          round_id: string
          status: Database["public"]["Enums"]["arena_dispute_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reporter_user_id: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          round_id: string
          status?: Database["public"]["Enums"]["arena_dispute_status"]
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reporter_user_id?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          round_id?: string
          status?: Database["public"]["Enums"]["arena_dispute_status"]
        }
        Relationships: [
          {
            foreignKeyName: "arena_round_disputes_reporter_user_id_fkey"
            columns: ["reporter_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "arena_round_disputes_reporter_user_id_fkey"
            columns: ["reporter_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_round_disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "arena_round_disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_round_disputes_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "arena_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_rounds: {
        Row: {
          arena_id: string
          challenger_score: number | null
          challenger_stake_per_player: number
          challenger_team_id: string
          champion_score: number | null
          champion_stake_per_player: number
          champion_team_id: string
          created_at: string
          dispute_deadline_at: string | null
          id: string
          loser_team_id: string | null
          match_id: string | null
          referee_user_id: string | null
          rule_snapshot: Json
          settled_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["arena_round_status"]
          submitted_at: string | null
          updated_at: string
          winner_team_id: string | null
        }
        Insert: {
          arena_id: string
          challenger_score?: number | null
          challenger_stake_per_player: number
          challenger_team_id: string
          champion_score?: number | null
          champion_stake_per_player: number
          champion_team_id: string
          created_at?: string
          dispute_deadline_at?: string | null
          id?: string
          loser_team_id?: string | null
          match_id?: string | null
          referee_user_id?: string | null
          rule_snapshot: Json
          settled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["arena_round_status"]
          submitted_at?: string | null
          updated_at?: string
          winner_team_id?: string | null
        }
        Update: {
          arena_id?: string
          challenger_score?: number | null
          challenger_stake_per_player?: number
          challenger_team_id?: string
          champion_score?: number | null
          champion_stake_per_player?: number
          champion_team_id?: string
          created_at?: string
          dispute_deadline_at?: string | null
          id?: string
          loser_team_id?: string | null
          match_id?: string | null
          referee_user_id?: string | null
          rule_snapshot?: Json
          settled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["arena_round_status"]
          submitted_at?: string | null
          updated_at?: string
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "arena_rounds_arena_id_fkey"
            columns: ["arena_id"]
            isOneToOne: false
            referencedRelation: "arena_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_rounds_challenger_team_id_fkey"
            columns: ["challenger_team_id"]
            isOneToOne: false
            referencedRelation: "arena_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_rounds_champion_team_id_fkey"
            columns: ["champion_team_id"]
            isOneToOne: false
            referencedRelation: "arena_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_rounds_loser_team_id_fkey"
            columns: ["loser_team_id"]
            isOneToOne: false
            referencedRelation: "arena_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_rounds_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_rounds_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_rounds_referee_user_id_fkey"
            columns: ["referee_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "arena_rounds_referee_user_id_fkey"
            columns: ["referee_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_rounds_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "arena_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_team_members: {
        Row: {
          accepted_at: string | null
          arena_id: string
          arena_team_id: string
          created_at: string
          is_active: boolean
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          arena_id: string
          arena_team_id: string
          created_at?: string
          is_active?: boolean
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          arena_id?: string
          arena_team_id?: string
          created_at?: string
          is_active?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arena_team_members_arena_id_fkey"
            columns: ["arena_id"]
            isOneToOne: false
            referencedRelation: "arena_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_team_members_arena_team_id_fkey"
            columns: ["arena_team_id"]
            isOneToOne: false
            referencedRelation: "arena_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "arena_team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_teams: {
        Row: {
          arena_id: string
          best_streak: number
          color_key: string
          created_at: string
          current_streak: number
          icon_key: string
          id: string
          leader_user_id: string
          losses: number
          name: string
          points_against: number
          points_for: number
          queue_position: number | null
          ready_at: string | null
          status: Database["public"]["Enums"]["arena_team_status"]
          updated_at: string
          wins: number
        }
        Insert: {
          arena_id: string
          best_streak?: number
          color_key?: string
          created_at?: string
          current_streak?: number
          icon_key?: string
          id?: string
          leader_user_id: string
          losses?: number
          name: string
          points_against?: number
          points_for?: number
          queue_position?: number | null
          ready_at?: string | null
          status?: Database["public"]["Enums"]["arena_team_status"]
          updated_at?: string
          wins?: number
        }
        Update: {
          arena_id?: string
          best_streak?: number
          color_key?: string
          created_at?: string
          current_streak?: number
          icon_key?: string
          id?: string
          leader_user_id?: string
          losses?: number
          name?: string
          points_against?: number
          points_for?: number
          queue_position?: number | null
          ready_at?: string | null
          status?: Database["public"]["Enums"]["arena_team_status"]
          updated_at?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "arena_teams_arena_id_fkey"
            columns: ["arena_id"]
            isOneToOne: false
            referencedRelation: "arena_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_teams_leader_user_id_fkey"
            columns: ["leader_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "arena_teams_leader_user_id_fkey"
            columns: ["leader_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      basketball_player_stat_drafts: {
        Row: {
          assists: number
          blocks: number
          created_at: string
          id: string
          match_id: string
          note: string | null
          points: number
          rebounds: number
          side_index: number
          three_pointers_made: number
          turnovers: number
          updated_at: string
          user_id: string
        }
        Insert: {
          assists?: number
          blocks?: number
          created_at?: string
          id?: string
          match_id: string
          note?: string | null
          points?: number
          rebounds?: number
          side_index: number
          three_pointers_made?: number
          turnovers?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          assists?: number
          blocks?: number
          created_at?: string
          id?: string
          match_id?: string
          note?: string | null
          points?: number
          rebounds?: number
          side_index?: number
          three_pointers_made?: number
          turnovers?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "basketball_player_stat_drafts_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "basketball_player_stat_drafts_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "basketball_player_stat_drafts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "basketball_player_stat_drafts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_report_snapshots: {
        Row: {
          campaign_id: string
          created_at: string
          generated_by: string | null
          id: string
          posthog_status: string
          report: Json
          window_end: string
          window_start: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          generated_by?: string | null
          id?: string
          posthog_status: string
          report: Json
          window_end: string
          window_start: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          generated_by?: string | null
          id?: string
          posthog_status?: string
          report?: Json
          window_end?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_report_snapshots_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_report_snapshots_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "campaign_report_snapshots_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          end_at: string
          featured_priority: number
          id: string
          partner_cards: Json
          partner_name: string | null
          partner_report_label: string | null
          reporting_mode: string
          short_prompt: string
          skin: Json
          slug: string
          start_at: string
          status: Database["public"]["Enums"]["campaign_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string
          end_at: string
          featured_priority?: number
          id?: string
          partner_cards?: Json
          partner_name?: string | null
          partner_report_label?: string | null
          reporting_mode?: string
          short_prompt?: string
          skin?: Json
          slug: string
          start_at: string
          status?: Database["public"]["Enums"]["campaign_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          end_at?: string
          featured_priority?: number
          id?: string
          partner_cards?: Json
          partner_name?: string | null
          partner_report_label?: string | null
          reporting_mode?: string
          short_prompt?: string
          skin?: Json
          slug?: string
          start_at?: string
          status?: Database["public"]["Enums"]["campaign_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_participants: {
        Row: {
          actual_path_session_id: string | null
          challenge_id: string
          completed_at: string | null
          joined_at: string
          progress: number
          reward_claimed_at: string | null
          route_match_score: number | null
          user_id: string
        }
        Insert: {
          actual_path_session_id?: string | null
          challenge_id: string
          completed_at?: string | null
          joined_at?: string
          progress?: number
          reward_claimed_at?: string | null
          route_match_score?: number | null
          user_id: string
        }
        Update: {
          actual_path_session_id?: string | null
          challenge_id?: string
          completed_at?: string | null
          joined_at?: string
          progress?: number
          reward_claimed_at?: string | null
          route_match_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_actual_path_session_id_fkey"
            columns: ["actual_path_session_id"]
            isOneToOne: false
            referencedRelation: "activity_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "challenge_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_route_attempts: {
        Row: {
          activity_session_id: string
          attempted_at: string
          challenge_id: string
          diagnostics: Json
          id: string
          match_score: number
          passed: boolean
          user_id: string
        }
        Insert: {
          activity_session_id: string
          attempted_at?: string
          challenge_id: string
          diagnostics?: Json
          id?: string
          match_score: number
          passed: boolean
          user_id: string
        }
        Update: {
          activity_session_id?: string
          attempted_at?: string
          challenge_id?: string
          diagnostics?: Json
          id?: string
          match_score?: number
          passed?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_route_attempts_activity_session_id_fkey"
            columns: ["activity_session_id"]
            isOneToOne: false
            referencedRelation: "activity_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_route_attempts_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_route_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "challenge_route_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          campaign_id: string | null
          challenge_mode: Database["public"]["Enums"]["challenge_mode"]
          created_at: string
          creator_id: string
          description: string
          end_at: string
          goal_type: Database["public"]["Enums"]["challenge_goal_type"]
          goal_value: number
          id: string
          max_participants: number | null
          planned_route_geojson: Json | null
          reward_cosmetic_id: string | null
          reward_gift_item_id: string | null
          reward_kind: string
          reward_points: number | null
          route_tolerance_m: number | null
          source: Database["public"]["Enums"]["challenge_source"]
          start_at: string
          status: Database["public"]["Enums"]["challenge_status"]
          title: string
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          campaign_id?: string | null
          challenge_mode?: Database["public"]["Enums"]["challenge_mode"]
          created_at?: string
          creator_id: string
          description?: string
          end_at: string
          goal_type: Database["public"]["Enums"]["challenge_goal_type"]
          goal_value: number
          id?: string
          max_participants?: number | null
          planned_route_geojson?: Json | null
          reward_cosmetic_id?: string | null
          reward_gift_item_id?: string | null
          reward_kind?: string
          reward_points?: number | null
          route_tolerance_m?: number | null
          source?: Database["public"]["Enums"]["challenge_source"]
          start_at?: string
          status?: Database["public"]["Enums"]["challenge_status"]
          title: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          campaign_id?: string | null
          challenge_mode?: Database["public"]["Enums"]["challenge_mode"]
          created_at?: string
          creator_id?: string
          description?: string
          end_at?: string
          goal_type?: Database["public"]["Enums"]["challenge_goal_type"]
          goal_value?: number
          id?: string
          max_participants?: number | null
          planned_route_geojson?: Json | null
          reward_cosmetic_id?: string | null
          reward_gift_item_id?: string | null
          reward_kind?: string
          reward_points?: number | null
          route_tolerance_m?: number | null
          source?: Database["public"]["Enums"]["challenge_source"]
          start_at?: string
          status?: Database["public"]["Enums"]["challenge_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "challenges_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_reward_cosmetic_id_fkey"
            columns: ["reward_cosmetic_id"]
            isOneToOne: false
            referencedRelation: "cosmetics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_reward_gift_item_id_fkey"
            columns: ["reward_gift_item_id"]
            isOneToOne: false
            referencedRelation: "gift_items"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_activity_contexts: {
        Row: {
          activity_session_id: string
          activity_type: Database["public"]["Enums"]["activity_type"]
          basketball_stats: Json
          created_at: string
          detail_tags: string[]
          focus_tag: string | null
          result_tags: string[]
          role: string | null
          rpe: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_session_id: string
          activity_type: Database["public"]["Enums"]["activity_type"]
          basketball_stats?: Json
          created_at?: string
          detail_tags?: string[]
          focus_tag?: string | null
          result_tags?: string[]
          role?: string | null
          rpe?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_session_id?: string
          activity_type?: Database["public"]["Enums"]["activity_type"]
          basketball_stats?: Json
          created_at?: string
          detail_tags?: string[]
          focus_tag?: string | null
          result_tags?: string[]
          role?: string | null
          rpe?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_activity_contexts_activity_session_id_fkey"
            columns: ["activity_session_id"]
            isOneToOne: false
            referencedRelation: "activity_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_activity_contexts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "coach_activity_contexts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_activity_insight_snapshots: {
        Row: {
          activity_session_id: string
          activity_type: Database["public"]["Enums"]["activity_type"]
          cards: Json
          generated_at: string
          inputs_hash: string | null
          locked_card_count: number
          preview_cards: Json
          user_id: string
        }
        Insert: {
          activity_session_id: string
          activity_type: Database["public"]["Enums"]["activity_type"]
          cards?: Json
          generated_at?: string
          inputs_hash?: string | null
          locked_card_count?: number
          preview_cards?: Json
          user_id: string
        }
        Update: {
          activity_session_id?: string
          activity_type?: Database["public"]["Enums"]["activity_type"]
          cards?: Json
          generated_at?: string
          inputs_hash?: string | null
          locked_card_count?: number
          preview_cards?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_activity_insight_snapshots_activity_session_id_fkey"
            columns: ["activity_session_id"]
            isOneToOne: false
            referencedRelation: "activity_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_activity_insight_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "coach_activity_insight_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_activity_sensor_summaries: {
        Row: {
          active_calories: number | null
          activity_session_id: string
          activity_type: Database["public"]["Enums"]["activity_type"]
          avg_heart_rate: number | null
          cadence_high_seconds: number | null
          cadence_max: number | null
          created_at: string
          heart_rate_coverage_seconds: number | null
          intensity_score: number | null
          max_heart_rate: number | null
          play_ended_at: string
          play_started_at: string
          resting_heart_rate: number | null
          source: Database["public"]["Enums"]["coach_sensor_source"]
          steps: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_calories?: number | null
          activity_session_id: string
          activity_type: Database["public"]["Enums"]["activity_type"]
          avg_heart_rate?: number | null
          cadence_high_seconds?: number | null
          cadence_max?: number | null
          created_at?: string
          heart_rate_coverage_seconds?: number | null
          intensity_score?: number | null
          max_heart_rate?: number | null
          play_ended_at: string
          play_started_at: string
          resting_heart_rate?: number | null
          source: Database["public"]["Enums"]["coach_sensor_source"]
          steps?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_calories?: number | null
          activity_session_id?: string
          activity_type?: Database["public"]["Enums"]["activity_type"]
          avg_heart_rate?: number | null
          cadence_high_seconds?: number | null
          cadence_max?: number | null
          created_at?: string
          heart_rate_coverage_seconds?: number | null
          intensity_score?: number | null
          max_heart_rate?: number | null
          play_ended_at?: string
          play_started_at?: string
          resting_heart_rate?: number | null
          source?: Database["public"]["Enums"]["coach_sensor_source"]
          steps?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_activity_sensor_summaries_activity_session_id_fkey"
            columns: ["activity_session_id"]
            isOneToOne: false
            referencedRelation: "activity_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_activity_sensor_summaries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "coach_activity_sensor_summaries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_external_benchmark_baselines: {
        Row: {
          benchmark_format: string
          computed_at: string
          created_at: string
          fetched_at: string
          id: string
          label: string
          level: string
          metric: string
          normalization: string
          payload: Json
          role: string
          sample_size: number | null
          season: string | null
          source_key: string
          source_name: string
          source_tier: string
          source_url: string
          sport: Database["public"]["Enums"]["activity_type"]
          stale_after: string
          unit: string
          updated_at: string
          value: number
        }
        Insert: {
          benchmark_format?: string
          computed_at?: string
          created_at?: string
          fetched_at?: string
          id?: string
          label: string
          level: string
          metric: string
          normalization: string
          payload?: Json
          role?: string
          sample_size?: number | null
          season?: string | null
          source_key: string
          source_name: string
          source_tier: string
          source_url: string
          sport: Database["public"]["Enums"]["activity_type"]
          stale_after: string
          unit: string
          updated_at?: string
          value: number
        }
        Update: {
          benchmark_format?: string
          computed_at?: string
          created_at?: string
          fetched_at?: string
          id?: string
          label?: string
          level?: string
          metric?: string
          normalization?: string
          payload?: Json
          role?: string
          sample_size?: number | null
          season?: string | null
          source_key?: string
          source_name?: string
          source_tier?: string
          source_url?: string
          sport?: Database["public"]["Enums"]["activity_type"]
          stale_after?: string
          unit?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      coach_external_benchmark_ingestion_runs: {
        Row: {
          error_code: string | null
          error_message: string | null
          finished_at: string | null
          id: string
          metadata: Json
          metrics_upserted: number
          season: string | null
          source_key: string
          source_url: string | null
          sport: Database["public"]["Enums"]["activity_type"]
          started_at: string
          status: string
        }
        Insert: {
          error_code?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          metadata?: Json
          metrics_upserted?: number
          season?: string | null
          source_key: string
          source_url?: string | null
          sport: Database["public"]["Enums"]["activity_type"]
          started_at?: string
          status: string
        }
        Update: {
          error_code?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          metadata?: Json
          metrics_upserted?: number
          season?: string | null
          source_key?: string
          source_url?: string | null
          sport?: Database["public"]["Enums"]["activity_type"]
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      coach_head_to_head_aggregates: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          avg_margin: number | null
          last_activity_session_id: string | null
          last_margin: number | null
          last_match_id: string | null
          losses: number
          matches_count: number
          opponent_user_id: string
          previous_margin: number | null
          rating_delta_total: number
          ties: number
          updated_at: string
          user_id: string
          wins: number
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          avg_margin?: number | null
          last_activity_session_id?: string | null
          last_margin?: number | null
          last_match_id?: string | null
          losses?: number
          matches_count?: number
          opponent_user_id: string
          previous_margin?: number | null
          rating_delta_total?: number
          ties?: number
          updated_at?: string
          user_id: string
          wins?: number
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          avg_margin?: number | null
          last_activity_session_id?: string | null
          last_margin?: number | null
          last_match_id?: string | null
          losses?: number
          matches_count?: number
          opponent_user_id?: string
          previous_margin?: number | null
          rating_delta_total?: number
          ties?: number
          updated_at?: string
          user_id?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "coach_head_to_head_aggregates_last_activity_session_id_fkey"
            columns: ["last_activity_session_id"]
            isOneToOne: false
            referencedRelation: "activity_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_head_to_head_aggregates_last_match_id_fkey"
            columns: ["last_match_id"]
            isOneToOne: false
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_head_to_head_aggregates_last_match_id_fkey"
            columns: ["last_match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_head_to_head_aggregates_opponent_user_id_fkey"
            columns: ["opponent_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "coach_head_to_head_aggregates_opponent_user_id_fkey"
            columns: ["opponent_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_head_to_head_aggregates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "coach_head_to_head_aggregates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_user_sport_aggregates: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          avg_intensity_last_5: number | null
          avg_margin_last_10: number | null
          avg_margin_last_5: number | null
          avg_rating_delta_last_5: number | null
          avg_rpe_last_5: number | null
          last_10_matches: Json
          last_5_matches: Json
          losses: number
          matches_count: number
          ties: number
          updated_at: string
          user_id: string
          wins: number
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          avg_intensity_last_5?: number | null
          avg_margin_last_10?: number | null
          avg_margin_last_5?: number | null
          avg_rating_delta_last_5?: number | null
          avg_rpe_last_5?: number | null
          last_10_matches?: Json
          last_5_matches?: Json
          losses?: number
          matches_count?: number
          ties?: number
          updated_at?: string
          user_id: string
          wins?: number
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          avg_intensity_last_5?: number | null
          avg_margin_last_10?: number | null
          avg_margin_last_5?: number | null
          avg_rating_delta_last_5?: number | null
          avg_rpe_last_5?: number | null
          last_10_matches?: Json
          last_5_matches?: Json
          losses?: number
          matches_count?: number
          ties?: number
          updated_at?: string
          user_id?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "coach_user_sport_aggregates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "coach_user_sport_aggregates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      collusion_void_exempt_users: {
        Row: {
          created_at: string
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collusion_void_exempt_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "collusion_void_exempt_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cosmetics: {
        Row: {
          asset_ref: string
          code: string
          created_at: string
          description: string
          id: string
          is_archived: boolean
          is_default: boolean
          name: string
          rarity: Database["public"]["Enums"]["cosmetic_rarity"]
          type: Database["public"]["Enums"]["cosmetic_type"]
        }
        Insert: {
          asset_ref: string
          code: string
          created_at?: string
          description?: string
          id?: string
          is_archived?: boolean
          is_default?: boolean
          name: string
          rarity?: Database["public"]["Enums"]["cosmetic_rarity"]
          type: Database["public"]["Enums"]["cosmetic_type"]
        }
        Update: {
          asset_ref?: string
          code?: string
          created_at?: string
          description?: string
          id?: string
          is_archived?: boolean
          is_default?: boolean
          name?: string
          rarity?: Database["public"]["Enums"]["cosmetic_rarity"]
          type?: Database["public"]["Enums"]["cosmetic_type"]
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          applied_to: Json
          coupon_id: string
          id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          applied_to?: Json
          coupon_id: string
          id?: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          applied_to?: Json
          coupon_id?: string
          id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "coupon_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          applicable_gift_ids: string[]
          code: string
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          max_redemptions_per_user: number | null
          max_redemptions_total: number | null
          min_spend: number | null
          starts_at: string | null
          status: Database["public"]["Enums"]["coupon_status"]
          type: Database["public"]["Enums"]["coupon_type"]
          updated_at: string
          value: number
        }
        Insert: {
          applicable_gift_ids?: string[]
          code: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          max_redemptions_per_user?: number | null
          max_redemptions_total?: number | null
          min_spend?: number | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["coupon_status"]
          type: Database["public"]["Enums"]["coupon_type"]
          updated_at?: string
          value: number
        }
        Update: {
          applicable_gift_ids?: string[]
          code?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          max_redemptions_per_user?: number | null
          max_redemptions_total?: number | null
          min_spend?: number | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["coupon_status"]
          type?: Database["public"]["Enums"]["coupon_type"]
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "coupons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_purchase_events: {
        Row: {
          balance_after: number | null
          created_at: string
          credits: number
          id: string
          product_id: string
          provider: string
          provider_event_id: string
          provider_transaction_id: string
          purchased_at: string | null
          raw_event: Json
          status: string
          store: string
          user_id: string
        }
        Insert: {
          balance_after?: number | null
          created_at?: string
          credits: number
          id?: string
          product_id: string
          provider: string
          provider_event_id: string
          provider_transaction_id: string
          purchased_at?: string | null
          raw_event?: Json
          status?: string
          store: string
          user_id: string
        }
        Update: {
          balance_after?: number | null
          created_at?: string
          credits?: number
          id?: string
          product_id?: string
          provider?: string
          provider_event_id?: string
          provider_transaction_id?: string
          purchased_at?: string | null
          raw_event?: Json
          status?: string
          store?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_purchase_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "credit_purchase_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          actor_user_id: string | null
          amount: number
          balance_after: number
          balance_before: number | null
          created_at: string
          id: string
          idempotency_key: string | null
          metadata: Json
          related_gift_item_id: string | null
          related_match_id: string | null
          source_category:
            | Database["public"]["Enums"]["wallet_source_category"]
            | null
          stake_lock_id: string | null
          type: Database["public"]["Enums"]["credit_transaction_type"]
          user_id: string
        }
        Insert: {
          actor_user_id?: string | null
          amount: number
          balance_after: number
          balance_before?: number | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          related_gift_item_id?: string | null
          related_match_id?: string | null
          source_category?:
            | Database["public"]["Enums"]["wallet_source_category"]
            | null
          stake_lock_id?: string | null
          type: Database["public"]["Enums"]["credit_transaction_type"]
          user_id: string
        }
        Update: {
          actor_user_id?: string | null
          amount?: number
          balance_after?: number
          balance_before?: number | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          related_gift_item_id?: string | null
          related_match_id?: string | null
          source_category?:
            | Database["public"]["Enums"]["wallet_source_category"]
            | null
          stake_lock_id?: string | null
          type?: Database["public"]["Enums"]["credit_transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "credit_transactions_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_gift_item_fk"
            columns: ["related_gift_item_id"]
            isOneToOne: false
            referencedRelation: "gift_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_related_match_id_fkey"
            columns: ["related_match_id"]
            isOneToOne: false
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_related_match_id_fkey"
            columns: ["related_match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_stake_lock_id_fkey"
            columns: ["stake_lock_id"]
            isOneToOne: false
            referencedRelation: "stake_locks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "credit_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      currency_exchange_orders: {
        Row: {
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          credits_cancelled: number
          credits_remaining: number
          credits_total: number
          id: string
          metadata: Json
          price_points_per_credit: number
          seller_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          credits_cancelled?: number
          credits_remaining: number
          credits_total: number
          id?: string
          metadata?: Json
          price_points_per_credit: number
          seller_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          credits_cancelled?: number
          credits_remaining?: number
          credits_total?: number
          id?: string
          metadata?: Json
          price_points_per_credit?: number
          seller_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "currency_exchange_orders_seller_user_id_fkey"
            columns: ["seller_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "currency_exchange_orders_seller_user_id_fkey"
            columns: ["seller_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      currency_exchange_trades: {
        Row: {
          buyer_user_id: string
          created_at: string
          credits_amount: number
          gross_points_amount: number
          id: string
          metadata: Json
          order_id: string
          price_points_per_credit: number
          seller_points_amount: number
          seller_user_id: string
          tax_bps: number
          tax_points_amount: number
        }
        Insert: {
          buyer_user_id: string
          created_at?: string
          credits_amount: number
          gross_points_amount: number
          id?: string
          metadata?: Json
          order_id: string
          price_points_per_credit: number
          seller_points_amount: number
          seller_user_id: string
          tax_bps: number
          tax_points_amount: number
        }
        Update: {
          buyer_user_id?: string
          created_at?: string
          credits_amount?: number
          gross_points_amount?: number
          id?: string
          metadata?: Json
          order_id?: string
          price_points_per_credit?: number
          seller_points_amount?: number
          seller_user_id?: string
          tax_bps?: number
          tax_points_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "currency_exchange_trades_buyer_user_id_fkey"
            columns: ["buyer_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "currency_exchange_trades_buyer_user_id_fkey"
            columns: ["buyer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "currency_exchange_trades_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "currency_exchange_order_book"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "currency_exchange_trades_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "currency_exchange_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "currency_exchange_trades_seller_user_id_fkey"
            columns: ["seller_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "currency_exchange_trades_seller_user_id_fkey"
            columns: ["seller_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      device_push_tokens: {
        Row: {
          android_live_updates_capable: boolean
          created_at: string
          expo_token: string
          id: string
          ios_live_activity_capable: boolean
          ios_live_activity_push_to_start_token: string | null
          ios_live_activity_push_to_start_token_updated_at: string | null
          last_seen_at: string
          native_push_token: string | null
          native_push_token_type: string | null
          platform: string
          user_id: string
        }
        Insert: {
          android_live_updates_capable?: boolean
          created_at?: string
          expo_token: string
          id?: string
          ios_live_activity_capable?: boolean
          ios_live_activity_push_to_start_token?: string | null
          ios_live_activity_push_to_start_token_updated_at?: string | null
          last_seen_at?: string
          native_push_token?: string | null
          native_push_token_type?: string | null
          platform: string
          user_id: string
        }
        Update: {
          android_live_updates_capable?: boolean
          created_at?: string
          expo_token?: string
          id?: string
          ios_live_activity_capable?: boolean
          ios_live_activity_push_to_start_token?: string | null
          ios_live_activity_push_to_start_token_updated_at?: string | null
          last_seen_at?: string
          native_push_token?: string | null
          native_push_token_type?: string | null
          platform?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "device_push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      economy_params: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: number
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: number
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      friend_request_attempts: {
        Row: {
          attempted_at: string
          id: number
          sender_id: string
          target_id: string
        }
        Insert: {
          attempted_at?: string
          id?: number
          sender_id: string
          target_id: string
        }
        Update: {
          attempted_at?: string
          id?: number
          sender_id?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_request_attempts_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friend_request_attempts_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_request_attempts_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friend_request_attempts_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_items: {
        Row: {
          code: string
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          metadata: Json
          name: string
          per_user_limit: number | null
          price_credits: number | null
          price_points: number | null
          reward_cosmetic_id: string | null
          reward_type: Database["public"]["Enums"]["gift_reward_type"]
          starts_at: string | null
          status: Database["public"]["Enums"]["gift_item_status"]
          stock_quantity: number | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json
          name: string
          per_user_limit?: number | null
          price_credits?: number | null
          price_points?: number | null
          reward_cosmetic_id?: string | null
          reward_type?: Database["public"]["Enums"]["gift_reward_type"]
          starts_at?: string | null
          status?: Database["public"]["Enums"]["gift_item_status"]
          stock_quantity?: number | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json
          name?: string
          per_user_limit?: number | null
          price_credits?: number | null
          price_points?: number | null
          reward_cosmetic_id?: string | null
          reward_type?: Database["public"]["Enums"]["gift_reward_type"]
          starts_at?: string | null
          status?: Database["public"]["Enums"]["gift_item_status"]
          stock_quantity?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_items_reward_cosmetic_id_fkey"
            columns: ["reward_cosmetic_id"]
            isOneToOne: false
            referencedRelation: "cosmetics"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_redemptions: {
        Row: {
          amount: number
          created_at: string
          currency: Database["public"]["Enums"]["wallet_currency"]
          fulfilled_at: string | null
          gift_item_id: string
          id: string
          metadata: Json
          status: Database["public"]["Enums"]["gift_redemption_status"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency: Database["public"]["Enums"]["wallet_currency"]
          fulfilled_at?: string | null
          gift_item_id: string
          id?: string
          metadata?: Json
          status?: Database["public"]["Enums"]["gift_redemption_status"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["wallet_currency"]
          fulfilled_at?: string | null
          gift_item_id?: string
          id?: string
          metadata?: Json
          status?: Database["public"]["Enums"]["gift_redemption_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_redemptions_gift_item_id_fkey"
            columns: ["gift_item_id"]
            isOneToOne: false
            referencedRelation: "gift_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gift_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      group_sessions: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          created_at: string
          ended_at: string | null
          host_user_id: string
          id: string
          location_name: string | null
          notes: string | null
          started_at: string
          title: string | null
          updated_at: string
          visibility: Database["public"]["Enums"]["activity_visibility"]
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          created_at?: string
          ended_at?: string | null
          host_user_id: string
          id?: string
          location_name?: string | null
          notes?: string | null
          started_at: string
          title?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["activity_visibility"]
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          created_at?: string
          ended_at?: string | null
          host_user_id?: string
          id?: string
          location_name?: string | null
          notes?: string | null
          started_at?: string
          title?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["activity_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "group_sessions_host_user_id_fkey"
            columns: ["host_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "group_sessions_host_user_id_fkey"
            columns: ["host_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_goal_contributions: {
        Row: {
          activity_session_id: string | null
          amount: number
          created_at: string
          goal_id: string
          guild_id: string
          id: string
          metadata: Json
          user_id: string
        }
        Insert: {
          activity_session_id?: string | null
          amount: number
          created_at?: string
          goal_id: string
          guild_id: string
          id?: string
          metadata?: Json
          user_id: string
        }
        Update: {
          activity_session_id?: string | null
          amount?: number
          created_at?: string
          goal_id?: string
          guild_id?: string
          id?: string
          metadata?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guild_goal_contributions_activity_session_id_fkey"
            columns: ["activity_session_id"]
            isOneToOne: false
            referencedRelation: "activity_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_goal_contributions_goal_fk"
            columns: ["goal_id", "guild_id"]
            isOneToOne: false
            referencedRelation: "guild_goals"
            referencedColumns: ["id", "guild_id"]
          },
          {
            foreignKeyName: "guild_goal_contributions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "guild_goal_contributions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_goals: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"] | null
          created_at: string
          created_by: string | null
          description: string
          end_at: string | null
          guild_id: string
          id: string
          metadata: Json
          metric: Database["public"]["Enums"]["guild_goal_metric"]
          start_at: string
          status: Database["public"]["Enums"]["guild_goal_status"]
          target_value: number
          title: string
          updated_at: string
        }
        Insert: {
          activity_type?: Database["public"]["Enums"]["activity_type"] | null
          created_at?: string
          created_by?: string | null
          description?: string
          end_at?: string | null
          guild_id: string
          id?: string
          metadata?: Json
          metric: Database["public"]["Enums"]["guild_goal_metric"]
          start_at?: string
          status?: Database["public"]["Enums"]["guild_goal_status"]
          target_value: number
          title: string
          updated_at?: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"] | null
          created_at?: string
          created_by?: string | null
          description?: string
          end_at?: string | null
          guild_id?: string
          id?: string
          metadata?: Json
          metric?: Database["public"]["Enums"]["guild_goal_metric"]
          start_at?: string
          status?: Database["public"]["Enums"]["guild_goal_status"]
          target_value?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guild_goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "guild_goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_goals_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_invites: {
        Row: {
          created_at: string
          expires_at: string
          guild_id: string
          id: string
          invitee_user_id: string
          inviter_user_id: string
          message: string | null
          responded_at: string | null
          status: Database["public"]["Enums"]["guild_invite_status"]
        }
        Insert: {
          created_at?: string
          expires_at?: string
          guild_id: string
          id?: string
          invitee_user_id: string
          inviter_user_id: string
          message?: string | null
          responded_at?: string | null
          status?: Database["public"]["Enums"]["guild_invite_status"]
        }
        Update: {
          created_at?: string
          expires_at?: string
          guild_id?: string
          id?: string
          invitee_user_id?: string
          inviter_user_id?: string
          message?: string | null
          responded_at?: string | null
          status?: Database["public"]["Enums"]["guild_invite_status"]
        }
        Relationships: [
          {
            foreignKeyName: "guild_invites_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_invites_invitee_user_id_fkey"
            columns: ["invitee_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "guild_invites_invitee_user_id_fkey"
            columns: ["invitee_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_invites_inviter_user_id_fkey"
            columns: ["inviter_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "guild_invites_inviter_user_id_fkey"
            columns: ["inviter_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_members: {
        Row: {
          guild_id: string
          invited_by: string | null
          joined_at: string
          last_active_at: string
          metadata: Json
          role: Database["public"]["Enums"]["guild_role"]
          user_id: string
        }
        Insert: {
          guild_id: string
          invited_by?: string | null
          joined_at?: string
          last_active_at?: string
          metadata?: Json
          role?: Database["public"]["Enums"]["guild_role"]
          user_id: string
        }
        Update: {
          guild_id?: string
          invited_by?: string | null
          joined_at?: string
          last_active_at?: string
          metadata?: Json
          role?: Database["public"]["Enums"]["guild_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guild_members_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "guild_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "guild_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      guilds: {
        Row: {
          archived_at: string | null
          avatar_url: string | null
          banner_url: string | null
          created_at: string
          description: string
          handle: string
          home_location_name: string | null
          id: string
          max_members: number
          metadata: Json
          name: string
          owner_id: string
          primary_activity_type:
            | Database["public"]["Enums"]["activity_type"]
            | null
          updated_at: string
          visibility: Database["public"]["Enums"]["guild_visibility"]
        }
        Insert: {
          archived_at?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          created_at?: string
          description?: string
          handle: string
          home_location_name?: string | null
          id?: string
          max_members?: number
          metadata?: Json
          name: string
          owner_id: string
          primary_activity_type?:
            | Database["public"]["Enums"]["activity_type"]
            | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["guild_visibility"]
        }
        Update: {
          archived_at?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          created_at?: string
          description?: string
          handle?: string
          home_location_name?: string | null
          id?: string
          max_members?: number
          metadata?: Json
          name?: string
          owner_id?: string
          primary_activity_type?:
            | Database["public"]["Enums"]["activity_type"]
            | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["guild_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "guilds_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "guilds_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      match_abuse_reports: {
        Row: {
          created_at: string
          evidence_paths: string[]
          id: string
          match_id: string
          note: string | null
          reason: string
          reported_user_id: string | null
          reporter_user_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          evidence_paths?: string[]
          id?: string
          match_id: string
          note?: string | null
          reason: string
          reported_user_id?: string | null
          reporter_user_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          evidence_paths?: string[]
          id?: string
          match_id?: string
          note?: string | null
          reason?: string
          reported_user_id?: string | null
          reporter_user_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_abuse_reports_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_abuse_reports_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_abuse_reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_abuse_reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_abuse_reports_reporter_user_id_fkey"
            columns: ["reporter_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_abuse_reports_reporter_user_id_fkey"
            columns: ["reporter_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_abuse_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_abuse_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      match_cancel_requests: {
        Row: {
          expires_at: string
          id: string
          match_id: string
          requested_at: string
          requested_by: string
          responded_at: string | null
          responded_by: string | null
          status: string
        }
        Insert: {
          expires_at?: string
          id?: string
          match_id: string
          requested_at?: string
          requested_by: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
        }
        Update: {
          expires_at?: string
          id?: string
          match_id?: string
          requested_at?: string
          requested_by?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_cancel_requests_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_cancel_requests_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_cancel_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_cancel_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_cancel_requests_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_cancel_requests_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      match_community_votes: {
        Row: {
          created_at: string
          match_id: string
          reason: string | null
          vote: Database["public"]["Enums"]["community_vote_choice"]
          voter_id: string
        }
        Insert: {
          created_at?: string
          match_id: string
          reason?: string | null
          vote: Database["public"]["Enums"]["community_vote_choice"]
          voter_id: string
        }
        Update: {
          created_at?: string
          match_id?: string
          reason?: string | null
          vote?: Database["public"]["Enums"]["community_vote_choice"]
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_community_votes_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_community_votes_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_community_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_community_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      match_invites: {
        Row: {
          id: string
          invitee_user_id: string
          inviter_user_id: string
          kind: string
          match_id: string
          responded_at: string | null
          sent_at: string
          side: number
          status: string
        }
        Insert: {
          id?: string
          invitee_user_id: string
          inviter_user_id: string
          kind?: string
          match_id: string
          responded_at?: string | null
          sent_at?: string
          side: number
          status?: string
        }
        Update: {
          id?: string
          invitee_user_id?: string
          inviter_user_id?: string
          kind?: string
          match_id?: string
          responded_at?: string | null
          sent_at?: string
          side?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_invites_invitee_user_id_fkey"
            columns: ["invitee_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_invites_invitee_user_id_fkey"
            columns: ["invitee_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_invites_inviter_user_id_fkey"
            columns: ["inviter_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_invites_inviter_user_id_fkey"
            columns: ["inviter_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_invites_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_invites_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_lifecycle_automation_runs: {
        Row: {
          dry_run: boolean
          error: string | null
          finished_at: string | null
          id: string
          started_at: string
          status: string
          summary: Json
        }
        Insert: {
          dry_run?: boolean
          error?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          summary?: Json
        }
        Update: {
          dry_run?: boolean
          error?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          summary?: Json
        }
        Relationships: []
      }
      match_lifecycle_events: {
        Row: {
          automation: string
          created_at: string
          from_status: Database["public"]["Enums"]["match_status"]
          id: string
          match_id: string
          metadata: Json
          reason: string
          run_id: string | null
          to_status: Database["public"]["Enums"]["match_status"]
        }
        Insert: {
          automation: string
          created_at?: string
          from_status: Database["public"]["Enums"]["match_status"]
          id?: string
          match_id: string
          metadata?: Json
          reason: string
          run_id?: string | null
          to_status: Database["public"]["Enums"]["match_status"]
        }
        Update: {
          automation?: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["match_status"]
          id?: string
          match_id?: string
          metadata?: Json
          reason?: string
          run_id?: string | null
          to_status?: Database["public"]["Enums"]["match_status"]
        }
        Relationships: [
          {
            foreignKeyName: "match_lifecycle_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_lifecycle_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_lifecycle_events_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "match_lifecycle_automation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      match_pair_cooldowns: {
        Row: {
          created_at: string
          expires_at: string
          metadata: Json
          reason: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          metadata?: Json
          reason: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          metadata?: Json
          reason?: string
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_pair_cooldowns_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_pair_cooldowns_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_pair_cooldowns_user_b_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_pair_cooldowns_user_b_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      match_participant_contributions: {
        Row: {
          created_at: string
          match_id: string
          note: string | null
          points: number
          recorded_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          match_id: string
          note?: string | null
          points?: number
          recorded_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          match_id?: string
          note?: string | null
          points?: number
          recorded_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_participant_contributions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_participant_contributions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_participant_contributions_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_participant_contributions_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_participant_contributions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_participant_contributions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      match_participants: {
        Row: {
          accepted_at: string | null
          finish_rank: number | null
          is_active: boolean
          joined_at: string
          left_at: string | null
          left_reason: string | null
          lobby_position_key: string | null
          match_id: string
          prize_payout: number | null
          rating_after: number | null
          rating_before: number | null
          role: Database["public"]["Enums"]["participant_role"]
          side: number
          stake_contribution: number
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          finish_rank?: number | null
          is_active?: boolean
          joined_at?: string
          left_at?: string | null
          left_reason?: string | null
          lobby_position_key?: string | null
          match_id: string
          prize_payout?: number | null
          rating_after?: number | null
          rating_before?: number | null
          role?: Database["public"]["Enums"]["participant_role"]
          side?: number
          stake_contribution?: number
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          finish_rank?: number | null
          is_active?: boolean
          joined_at?: string
          left_at?: string | null
          left_reason?: string | null
          lobby_position_key?: string | null
          match_id?: string
          prize_payout?: number | null
          rating_after?: number | null
          rating_before?: number | null
          role?: Database["public"]["Enums"]["participant_role"]
          side?: number
          stake_contribution?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_participants_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_participants_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      match_referee_assignments: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          assigned_at: string
          assigned_by: string
          id: string
          match_id: string
          referee_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          assigned_at?: string
          assigned_by: string
          id?: string
          match_id: string
          referee_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          assigned_at?: string
          assigned_by?: string
          id?: string
          match_id?: string
          referee_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_referee_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_referee_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_referee_assignments_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_referee_assignments_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_referee_assignments_referee_user_id_fkey"
            columns: ["referee_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_referee_assignments_referee_user_id_fkey"
            columns: ["referee_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      match_result_correction_requests: {
        Row: {
          expires_at: string
          id: string
          match_id: string
          proposed_is_tie: boolean
          proposed_score_log: Json | null
          proposed_side_0_score: number | null
          proposed_side_1_score: number | null
          proposed_winner_side: number | null
          requested_at: string
          requested_by: string
          responded_at: string | null
          responded_by: string | null
          status: string
        }
        Insert: {
          expires_at?: string
          id?: string
          match_id: string
          proposed_is_tie?: boolean
          proposed_score_log?: Json | null
          proposed_side_0_score?: number | null
          proposed_side_1_score?: number | null
          proposed_winner_side?: number | null
          requested_at?: string
          requested_by: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
        }
        Update: {
          expires_at?: string
          id?: string
          match_id?: string
          proposed_is_tie?: boolean
          proposed_score_log?: Json | null
          proposed_side_0_score?: number | null
          proposed_side_1_score?: number | null
          proposed_winner_side?: number | null
          requested_at?: string
          requested_by?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_result_correction_requests_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_result_correction_requests_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_result_correction_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_result_correction_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_result_correction_requests_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_result_correction_requests_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      match_reversals: {
        Row: {
          id: string
          match_id: string
          metadata: Json
          reason: string
          reversed_at: string
          reversed_by: string | null
        }
        Insert: {
          id?: string
          match_id: string
          metadata?: Json
          reason: string
          reversed_at?: string
          reversed_by?: string | null
        }
        Update: {
          id?: string
          match_id?: string
          metadata?: Json
          reason?: string
          reversed_at?: string
          reversed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_reversals_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_reversals_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_reversals_reversed_by_fkey"
            columns: ["reversed_by"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_reversals_reversed_by_fkey"
            columns: ["reversed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      match_status_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["match_status"] | null
          id: string
          match_id: string
          metadata: Json
          reason: string
          to_status: Database["public"]["Enums"]["match_status"]
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["match_status"] | null
          id?: string
          match_id: string
          metadata?: Json
          reason: string
          to_status: Database["public"]["Enums"]["match_status"]
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["match_status"] | null
          id?: string
          match_id?: string
          metadata?: Json
          reason?: string
          to_status?: Database["public"]["Enums"]["match_status"]
        }
        Relationships: [
          {
            foreignKeyName: "match_status_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_status_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_status_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_status_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_submissions: {
        Row: {
          activity_session_id: string | null
          created_at: string
          id: string
          match_id: string
          notes: string | null
          proof_urls: string[]
          submitted_by: string
          winner_user_id: string | null
        }
        Insert: {
          activity_session_id?: string | null
          created_at?: string
          id?: string
          match_id: string
          notes?: string | null
          proof_urls?: string[]
          submitted_by: string
          winner_user_id?: string | null
        }
        Update: {
          activity_session_id?: string | null
          created_at?: string
          id?: string
          match_id?: string
          notes?: string | null
          proof_urls?: string[]
          submitted_by?: string
          winner_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_submissions_activity_session_id_fkey"
            columns: ["activity_session_id"]
            isOneToOne: false
            referencedRelation: "activity_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_submissions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_submissions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_submissions_winner_user_id_fkey"
            columns: ["winner_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_submissions_winner_user_id_fkey"
            columns: ["winner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      match_team_result_correction_requests: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          match_id: string
          requested_by: string
          requested_side: number
          resolved_at: string | null
          responded_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          match_id: string
          requested_by: string
          requested_side: number
          resolved_at?: string | null
          responded_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          match_id?: string
          requested_by?: string
          requested_side?: number
          resolved_at?: string | null
          responded_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_team_result_correction_requests_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_team_result_correction_requests_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_team_result_correction_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_team_result_correction_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_team_result_correction_requests_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_team_result_correction_requests_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      match_team_result_revision_audit: {
        Row: {
          created_at: string
          id: string
          match_id: string
          new_contributions: Json
          new_notes: string | null
          new_proof_urls: string[]
          new_team_score: number
          previous_contributions: Json
          previous_notes: string | null
          previous_proof_urls: string[]
          previous_team_score: number | null
          side_index: number
          submitted_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          new_contributions?: Json
          new_notes?: string | null
          new_proof_urls?: string[]
          new_team_score: number
          previous_contributions?: Json
          previous_notes?: string | null
          previous_proof_urls?: string[]
          previous_team_score?: number | null
          side_index: number
          submitted_by: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          new_contributions?: Json
          new_notes?: string | null
          new_proof_urls?: string[]
          new_team_score?: number
          previous_contributions?: Json
          previous_notes?: string | null
          previous_proof_urls?: string[]
          previous_team_score?: number | null
          side_index?: number
          submitted_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_team_result_revision_audit_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_team_result_revision_audit_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_team_result_revision_audit_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_team_result_revision_audit_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      match_team_result_submissions: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          id: string
          match_id: string
          notes: string | null
          proof_urls: string[]
          score_log: Json
          side_index: number
          submitted_by: string
          team_score: number
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          id?: string
          match_id: string
          notes?: string | null
          proof_urls?: string[]
          score_log?: Json
          side_index: number
          submitted_by: string
          team_score: number
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          id?: string
          match_id?: string
          notes?: string | null
          proof_urls?: string[]
          score_log?: Json
          side_index?: number
          submitted_by?: string
          team_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_team_result_submissions_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_team_result_submissions_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_team_result_submissions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_team_result_submissions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_team_result_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_team_result_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          accepted_at: string | null
          activity_type: Database["public"]["Enums"]["activity_type"]
          allow_spectators: boolean
          created_at: string
          created_by: string
          deadline: string
          entry_code: string | null
          id: string
          is_coop: boolean
          is_tie: boolean
          join_code: string
          join_mode: string
          rematch_of_match_id: string | null
          reminder_sent_at: string | null
          rule_params: Json
          rule_text: string | null
          settled_at: string | null
          stake: number
          stake_currency: Database["public"]["Enums"]["wallet_currency"]
          started_at: string | null
          status: Database["public"]["Enums"]["match_status"]
          submitted_at: string | null
          team_size_per_side: number
          updated_at: string
          verification_mode: Database["public"]["Enums"]["verification_mode"]
          winner_user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          activity_type: Database["public"]["Enums"]["activity_type"]
          allow_spectators?: boolean
          created_at?: string
          created_by: string
          deadline: string
          entry_code?: string | null
          id?: string
          is_coop?: boolean
          is_tie?: boolean
          join_code: string
          join_mode?: string
          rematch_of_match_id?: string | null
          reminder_sent_at?: string | null
          rule_params?: Json
          rule_text?: string | null
          settled_at?: string | null
          stake: number
          stake_currency?: Database["public"]["Enums"]["wallet_currency"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          submitted_at?: string | null
          team_size_per_side?: number
          updated_at?: string
          verification_mode?: Database["public"]["Enums"]["verification_mode"]
          winner_user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          activity_type?: Database["public"]["Enums"]["activity_type"]
          allow_spectators?: boolean
          created_at?: string
          created_by?: string
          deadline?: string
          entry_code?: string | null
          id?: string
          is_coop?: boolean
          is_tie?: boolean
          join_code?: string
          join_mode?: string
          rematch_of_match_id?: string | null
          reminder_sent_at?: string | null
          rule_params?: Json
          rule_text?: string | null
          settled_at?: string | null
          stake?: number
          stake_currency?: Database["public"]["Enums"]["wallet_currency"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          submitted_at?: string | null
          team_size_per_side?: number
          updated_at?: string
          verification_mode?: Database["public"]["Enums"]["verification_mode"]
          winner_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "matches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_rematch_of_match_id_fkey"
            columns: ["rematch_of_match_id"]
            isOneToOne: false
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_rematch_of_match_id_fkey"
            columns: ["rematch_of_match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_user_id_fkey"
            columns: ["winner_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "matches_winner_user_id_fkey"
            columns: ["winner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          delivered_at: string | null
          delivery_error: string | null
          dispatched_at: string | null
          id: string
          match_id: string | null
          payload: Json
          recipient_user_ids: string[]
          suppressed_at: string | null
          suppression_reason: string | null
          type: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_error?: string | null
          dispatched_at?: string | null
          id?: string
          match_id?: string | null
          payload?: Json
          recipient_user_ids: string[]
          suppressed_at?: string | null
          suppression_reason?: string | null
          type: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_error?: string | null
          dispatched_at?: string | null
          id?: string
          match_id?: string | null
          payload?: Json
          recipient_user_ids?: string[]
          suppressed_at?: string | null
          suppression_reason?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notification_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_push_tickets: {
        Row: {
          accepted_at: string | null
          created_at: string
          expo_ticket_id: string | null
          expo_token: string
          id: string
          notification_event_id: string
          receipt_checked_at: string | null
          receipt_error: string | null
          receipt_message: string | null
          receipt_status: string | null
          ticket_error: string | null
          ticket_message: string | null
          ticket_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          expo_ticket_id?: string | null
          expo_token: string
          id?: string
          notification_event_id: string
          receipt_checked_at?: string | null
          receipt_error?: string | null
          receipt_message?: string | null
          receipt_status?: string | null
          ticket_error?: string | null
          ticket_message?: string | null
          ticket_status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          expo_ticket_id?: string | null
          expo_token?: string
          id?: string
          notification_event_id?: string
          receipt_checked_at?: string | null
          receipt_error?: string | null
          receipt_message?: string | null
          receipt_status?: string | null
          ticket_error?: string | null
          ticket_message?: string | null
          ticket_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_push_tickets_notification_event_id_fkey"
            columns: ["notification_event_id"]
            isOneToOne: false
            referencedRelation: "notification_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_push_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notification_push_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          allowed_gift_item_ids: string[] | null
          api_key_hash: string
          created_at: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          allowed_gift_item_ids?: string[] | null
          api_key_hash: string
          created_at?: string
          id: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          allowed_gift_item_ids?: string[] | null
          api_key_hash?: string
          created_at?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      player_score_drafts: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          badminton_sets: Json
          basketball_stats: Json
          created_at: string
          id: string
          match_id: string
          note: string | null
          proof_urls: string[]
          side_index: number
          status: string
          submitted_at: string | null
          submitted_by: string
          team_score: number
          updated_at: string
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          badminton_sets?: Json
          basketball_stats?: Json
          created_at?: string
          id?: string
          match_id: string
          note?: string | null
          proof_urls?: string[]
          side_index: number
          status?: string
          submitted_at?: string | null
          submitted_by: string
          team_score?: number
          updated_at?: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          badminton_sets?: Json
          basketball_stats?: Json
          created_at?: string
          id?: string
          match_id?: string
          note?: string | null
          proof_urls?: string[]
          side_index?: number
          status?: string
          submitted_at?: string | null
          submitted_by?: string
          team_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_score_drafts_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_score_drafts_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_score_drafts_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "player_score_drafts_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      point_transactions: {
        Row: {
          actor_user_id: string | null
          amount: number
          balance_after: number
          balance_before: number | null
          created_at: string
          id: string
          idempotency_key: string | null
          metadata: Json | null
          related_match_id: string | null
          score_after: number | null
          score_before: number | null
          score_delta: number
          source_category:
            | Database["public"]["Enums"]["wallet_source_category"]
            | null
          spendable_after: number | null
          spendable_before: number | null
          spendable_delta: number
          stake_lock_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          actor_user_id?: string | null
          amount: number
          balance_after: number
          balance_before?: number | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          related_match_id?: string | null
          score_after?: number | null
          score_before?: number | null
          score_delta?: number
          source_category?:
            | Database["public"]["Enums"]["wallet_source_category"]
            | null
          spendable_after?: number | null
          spendable_before?: number | null
          spendable_delta?: number
          stake_lock_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          actor_user_id?: string | null
          amount?: number
          balance_after?: number
          balance_before?: number | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          related_match_id?: string | null
          score_after?: number | null
          score_before?: number | null
          score_delta?: number
          source_category?:
            | Database["public"]["Enums"]["wallet_source_category"]
            | null
          spendable_after?: number | null
          spendable_before?: number | null
          spendable_delta?: number
          stake_lock_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "point_transactions_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_related_match_id_fkey"
            columns: ["related_match_id"]
            isOneToOne: false
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_related_match_id_fkey"
            columns: ["related_match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_stake_lock_id_fkey"
            columns: ["stake_lock_id"]
            isOneToOne: false
            referencedRelation: "stake_locks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "point_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_highlight_videos: {
        Row: {
          created_at: string
          duration_seconds: number
          match_id: string
          mime_type: string
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds: number
          match_id: string
          mime_type: string
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          match_id?: string
          mime_type?: string
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_highlight_videos_pinned_match_fkey"
            columns: ["user_id", "match_id"]
            isOneToOne: true
            referencedRelation: "profile_pinned_matches"
            referencedColumns: ["user_id", "match_id"]
          },
        ]
      }
      profile_pinned_matches: {
        Row: {
          created_at: string
          match_id: string
          position: number
          user_id: string
        }
        Insert: {
          created_at?: string
          match_id: string
          position: number
          user_id: string
        }
        Update: {
          created_at?: string
          match_id?: string
          position?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_pinned_matches_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_pinned_matches_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_pinned_matches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "profile_pinned_matches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_bans: {
        Row: {
          banned_until: string
          created_at: string
          id: string
          reason: string | null
          template_id: string
          user_id: string
        }
        Insert: {
          banned_until: string
          created_at?: string
          id?: string
          reason?: string | null
          template_id: string
          user_id: string
        }
        Update: {
          banned_until?: string
          created_at?: string
          id?: string
          reason?: string | null
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_bans_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "quest_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_checkins: {
        Row: {
          arrived_at: string
          arrived_lat: number
          arrived_lng: number
          claimed_at: string | null
          created_at: string
          earn_period: string
          id: string
          points_granted: number
          spot_id: string
          status: string
          user_id: string
        }
        Insert: {
          arrived_at?: string
          arrived_lat: number
          arrived_lng: number
          claimed_at?: string | null
          created_at?: string
          earn_period: string
          id?: string
          points_granted?: number
          spot_id: string
          status?: string
          user_id: string
        }
        Update: {
          arrived_at?: string
          arrived_lat?: number
          arrived_lng?: number
          claimed_at?: string | null
          created_at?: string
          earn_period?: string
          id?: string
          points_granted?: number
          spot_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_checkins_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "quest_spots"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_proof_audits: {
        Row: {
          claimed_at: string
          decided_at: string | null
          id: string
          reason: string | null
          reviewer_user_id: string
          session_id: string
          verdict: string
        }
        Insert: {
          claimed_at?: string
          decided_at?: string | null
          id?: string
          reason?: string | null
          reviewer_user_id: string
          session_id: string
          verdict?: string
        }
        Update: {
          claimed_at?: string
          decided_at?: string | null
          id?: string
          reason?: string | null
          reviewer_user_id?: string
          session_id?: string
          verdict?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_proof_audits_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "quest_proof_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_proof_sessions: {
        Row: {
          activity_session_id: string | null
          audit_status: string
          challenge: Json
          challenge_id: string | null
          completed_at: string | null
          created_at: string
          cv_result: Json | null
          earn_period: string
          event_id: string | null
          guild_goal_id: string | null
          id: string
          media_path: string | null
          nonce: string
          points_granted: number
          sensor_summary: Json | null
          started_at: string
          status: string
          template_id: string
          trust_decision: string | null
          user_id: string
        }
        Insert: {
          activity_session_id?: string | null
          audit_status?: string
          challenge?: Json
          challenge_id?: string | null
          completed_at?: string | null
          created_at?: string
          cv_result?: Json | null
          earn_period: string
          event_id?: string | null
          guild_goal_id?: string | null
          id?: string
          media_path?: string | null
          nonce: string
          points_granted?: number
          sensor_summary?: Json | null
          started_at?: string
          status?: string
          template_id: string
          trust_decision?: string | null
          user_id: string
        }
        Update: {
          activity_session_id?: string | null
          audit_status?: string
          challenge?: Json
          challenge_id?: string | null
          completed_at?: string | null
          created_at?: string
          cv_result?: Json | null
          earn_period?: string
          event_id?: string | null
          guild_goal_id?: string | null
          id?: string
          media_path?: string | null
          nonce?: string
          points_granted?: number
          sensor_summary?: Json | null
          started_at?: string
          status?: string
          template_id?: string
          trust_decision?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_proof_sessions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "quest_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_spots: {
        Row: {
          campaign_id: string | null
          created_at: string
          created_by: string | null
          dwell_seconds: number
          ends_at: string | null
          id: string
          is_active: boolean
          lat: number
          lng: number
          name: string
          radius_m: number
          reward_points: number
          starts_at: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          dwell_seconds?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          lat: number
          lng: number
          name: string
          radius_m?: number
          reward_points: number
          starts_at?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          dwell_seconds?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          lat?: number
          lng?: number
          name?: string
          radius_m?: number
          reward_points?: number
          starts_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quest_spots_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_templates: {
        Row: {
          activity: string
          attempts_per_day: number
          cooldown_seconds: number
          created_at: string
          created_by: string | null
          drill_spec: Json
          ends_at: string | null
          icon: string
          id: string
          is_active: boolean
          lane: string
          proof_contract: Json
          reward_points: number
          slug: string
          starts_at: string | null
          sub_cap_key: string | null
          subtitle: string
          title: string
          verifier: Database["public"]["Enums"]["quest_verifier"]
        }
        Insert: {
          activity: string
          attempts_per_day?: number
          cooldown_seconds?: number
          created_at?: string
          created_by?: string | null
          drill_spec?: Json
          ends_at?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          lane: string
          proof_contract?: Json
          reward_points?: number
          slug: string
          starts_at?: string | null
          sub_cap_key?: string | null
          subtitle?: string
          title: string
          verifier: Database["public"]["Enums"]["quest_verifier"]
        }
        Update: {
          activity?: string
          attempts_per_day?: number
          cooldown_seconds?: number
          created_at?: string
          created_by?: string | null
          drill_spec?: Json
          ends_at?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          lane?: string
          proof_contract?: Json
          reward_points?: number
          slug?: string
          starts_at?: string | null
          sub_cap_key?: string | null
          subtitle?: string
          title?: string
          verifier?: Database["public"]["Enums"]["quest_verifier"]
        }
        Relationships: []
      }
      rally_coin_audit_events: {
        Row: {
          action: string
          actor_user_id: string | null
          binding_id: string | null
          coin_id: string
          created_at: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          binding_id?: string | null
          coin_id: string
          created_at?: string
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          binding_id?: string | null
          coin_id?: string
          created_at?: string
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "rally_coin_audit_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "rally_coin_audit_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rally_coin_audit_events_binding_id_fkey"
            columns: ["binding_id"]
            isOneToOne: false
            referencedRelation: "rally_coin_bindings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rally_coin_audit_events_coin_id_fkey"
            columns: ["coin_id"]
            isOneToOne: false
            referencedRelation: "rally_coins"
            referencedColumns: ["id"]
          },
        ]
      }
      rally_coin_bindings: {
        Row: {
          audience: Database["public"]["Enums"]["rally_coin_audience"]
          binding_type: Database["public"]["Enums"]["rally_coin_binding_type"]
          coin_id: string
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          metadata: Json
          revoked_at: string | null
          revoked_by: string | null
          status: Database["public"]["Enums"]["rally_coin_binding_status"]
          target_guild_goal_id: string | null
          target_guild_id: string | null
          target_match_id: string | null
          updated_at: string
        }
        Insert: {
          audience?: Database["public"]["Enums"]["rally_coin_audience"]
          binding_type: Database["public"]["Enums"]["rally_coin_binding_type"]
          coin_id: string
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          metadata?: Json
          revoked_at?: string | null
          revoked_by?: string | null
          status?: Database["public"]["Enums"]["rally_coin_binding_status"]
          target_guild_goal_id?: string | null
          target_guild_id?: string | null
          target_match_id?: string | null
          updated_at?: string
        }
        Update: {
          audience?: Database["public"]["Enums"]["rally_coin_audience"]
          binding_type?: Database["public"]["Enums"]["rally_coin_binding_type"]
          coin_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          metadata?: Json
          revoked_at?: string | null
          revoked_by?: string | null
          status?: Database["public"]["Enums"]["rally_coin_binding_status"]
          target_guild_goal_id?: string | null
          target_guild_id?: string | null
          target_match_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rally_coin_bindings_coin_id_fkey"
            columns: ["coin_id"]
            isOneToOne: false
            referencedRelation: "rally_coins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rally_coin_bindings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "rally_coin_bindings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rally_coin_bindings_goal_fk"
            columns: ["target_guild_goal_id", "target_guild_id"]
            isOneToOne: false
            referencedRelation: "guild_goals"
            referencedColumns: ["id", "guild_id"]
          },
          {
            foreignKeyName: "rally_coin_bindings_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "rally_coin_bindings_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rally_coin_bindings_target_guild_id_fkey"
            columns: ["target_guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rally_coin_bindings_target_match_id_fkey"
            columns: ["target_match_id"]
            isOneToOne: false
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rally_coin_bindings_target_match_id_fkey"
            columns: ["target_match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      rally_coin_tap_events: {
        Row: {
          binding_id: string | null
          coin_id: string
          created_at: string
          id: string
          metadata: Json
          resolved_action: string
          route_path: string | null
          source: Database["public"]["Enums"]["rally_coin_tap_source"]
          viewer_user_id: string
        }
        Insert: {
          binding_id?: string | null
          coin_id: string
          created_at?: string
          id?: string
          metadata?: Json
          resolved_action: string
          route_path?: string | null
          source?: Database["public"]["Enums"]["rally_coin_tap_source"]
          viewer_user_id: string
        }
        Update: {
          binding_id?: string | null
          coin_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          resolved_action?: string
          route_path?: string | null
          source?: Database["public"]["Enums"]["rally_coin_tap_source"]
          viewer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rally_coin_tap_events_binding_id_fkey"
            columns: ["binding_id"]
            isOneToOne: false
            referencedRelation: "rally_coin_bindings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rally_coin_tap_events_coin_id_fkey"
            columns: ["coin_id"]
            isOneToOne: false
            referencedRelation: "rally_coins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rally_coin_tap_events_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "rally_coin_tap_events_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rally_coins: {
        Row: {
          chip_type: Database["public"]["Enums"]["rally_coin_chip_type"]
          claim_secret_hash: string | null
          created_at: string
          display_name: string
          id: string
          issued_batch: string | null
          last_secure_counter: number | null
          metadata: Json
          owner_changed_at: string | null
          owner_guild_id: string | null
          owner_user_id: string | null
          public_code: string
          risk_status: Database["public"]["Enums"]["rally_coin_risk_status"]
          secure_uid_hash: string | null
          status: Database["public"]["Enums"]["rally_coin_status"]
          type: Database["public"]["Enums"]["rally_coin_type"]
          updated_at: string
        }
        Insert: {
          chip_type?: Database["public"]["Enums"]["rally_coin_chip_type"]
          claim_secret_hash?: string | null
          created_at?: string
          display_name?: string
          id?: string
          issued_batch?: string | null
          last_secure_counter?: number | null
          metadata?: Json
          owner_changed_at?: string | null
          owner_guild_id?: string | null
          owner_user_id?: string | null
          public_code: string
          risk_status?: Database["public"]["Enums"]["rally_coin_risk_status"]
          secure_uid_hash?: string | null
          status?: Database["public"]["Enums"]["rally_coin_status"]
          type?: Database["public"]["Enums"]["rally_coin_type"]
          updated_at?: string
        }
        Update: {
          chip_type?: Database["public"]["Enums"]["rally_coin_chip_type"]
          claim_secret_hash?: string | null
          created_at?: string
          display_name?: string
          id?: string
          issued_batch?: string | null
          last_secure_counter?: number | null
          metadata?: Json
          owner_changed_at?: string | null
          owner_guild_id?: string | null
          owner_user_id?: string | null
          public_code?: string
          risk_status?: Database["public"]["Enums"]["rally_coin_risk_status"]
          secure_uid_hash?: string | null
          status?: Database["public"]["Enums"]["rally_coin_status"]
          type?: Database["public"]["Enums"]["rally_coin_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rally_coins_owner_guild_id_fkey"
            columns: ["owner_guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rally_coins_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "rally_coins_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_buckets: {
        Row: {
          bucket: string
          request_count: number
          user_id: string
          window_started_at: string
        }
        Insert: {
          bucket: string
          request_count?: number
          user_id: string
          window_started_at?: string
        }
        Update: {
          bucket?: string
          request_count?: number
          user_id?: string
          window_started_at?: string
        }
        Relationships: []
      }
      referee_match_records: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          assignment_id: string
          correction_count: number
          created_at: string
          final_status: string
          had_dispute: boolean
          id: string
          match_id: string
          quality_delta: number
          referee_level_after: number
          referee_user_id: string
          result_id: string
          settled_at: string
          trust_tier_after: string
          updated_at: string
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          assignment_id: string
          correction_count?: number
          created_at?: string
          final_status: string
          had_dispute?: boolean
          id?: string
          match_id: string
          quality_delta?: number
          referee_level_after?: number
          referee_user_id: string
          result_id: string
          settled_at: string
          trust_tier_after?: string
          updated_at?: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          assignment_id?: string
          correction_count?: number
          created_at?: string
          final_status?: string
          had_dispute?: boolean
          id?: string
          match_id?: string
          quality_delta?: number
          referee_level_after?: number
          referee_user_id?: string
          result_id?: string
          settled_at?: string
          trust_tier_after?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referee_match_records_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "match_referee_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referee_match_records_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referee_match_records_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referee_match_records_referee_user_id_fkey"
            columns: ["referee_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referee_match_records_referee_user_id_fkey"
            columns: ["referee_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referee_match_records_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "alpha_referee_result_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      referee_sport_profiles: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          clean_matches: number
          completed_matches: number
          corrected_matches: number
          created_at: string
          disputed_matches: number
          latest_match_id: string | null
          latest_settled_at: string | null
          level: number
          rating: number
          referee_verified_matches: number
          trust_score: number
          trust_tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          clean_matches?: number
          completed_matches?: number
          corrected_matches?: number
          created_at?: string
          disputed_matches?: number
          latest_match_id?: string | null
          latest_settled_at?: string | null
          level?: number
          rating?: number
          referee_verified_matches?: number
          trust_score?: number
          trust_tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          clean_matches?: number
          completed_matches?: number
          corrected_matches?: number
          created_at?: string
          disputed_matches?: number
          latest_match_id?: string | null
          latest_settled_at?: string | null
          level?: number
          rating?: number
          referee_verified_matches?: number
          trust_score?: number
          trust_tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referee_sport_profiles_latest_match_id_fkey"
            columns: ["latest_match_id"]
            isOneToOne: false
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referee_sport_profiles_latest_match_id_fkey"
            columns: ["latest_match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referee_sport_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referee_sport_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      running_activity_details: {
        Row: {
          activity_session_id: string
          avg_cadence: number | null
          avg_heart_rate: number | null
          best_pace_seconds_per_km: number | null
          calories: number | null
          created_at: string
          distance_meters: number | null
          elevation_gain_meters: number | null
          hr_zone_seconds: number[] | null
          integrity_flags: Json
          intensity_score: number | null
          max_heart_rate: number | null
          moving_time_seconds: number | null
          pace_seconds_per_km: number | null
          path_storage_path: string | null
          paused_duration_seconds: number | null
          route_summary: Json
          splits: Json
        }
        Insert: {
          activity_session_id: string
          avg_cadence?: number | null
          avg_heart_rate?: number | null
          best_pace_seconds_per_km?: number | null
          calories?: number | null
          created_at?: string
          distance_meters?: number | null
          elevation_gain_meters?: number | null
          hr_zone_seconds?: number[] | null
          integrity_flags?: Json
          intensity_score?: number | null
          max_heart_rate?: number | null
          moving_time_seconds?: number | null
          pace_seconds_per_km?: number | null
          path_storage_path?: string | null
          paused_duration_seconds?: number | null
          route_summary?: Json
          splits?: Json
        }
        Update: {
          activity_session_id?: string
          avg_cadence?: number | null
          avg_heart_rate?: number | null
          best_pace_seconds_per_km?: number | null
          calories?: number | null
          created_at?: string
          distance_meters?: number | null
          elevation_gain_meters?: number | null
          hr_zone_seconds?: number[] | null
          integrity_flags?: Json
          intensity_score?: number | null
          max_heart_rate?: number | null
          moving_time_seconds?: number | null
          pace_seconds_per_km?: number | null
          path_storage_path?: string | null
          paused_duration_seconds?: number | null
          route_summary?: Json
          splits?: Json
        }
        Relationships: [
          {
            foreignKeyName: "running_activity_details_activity_session_id_fkey"
            columns: ["activity_session_id"]
            isOneToOne: true
            referencedRelation: "activity_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      season_standings: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          created_at: string
          final_rank: number
          final_rating: number
          final_tier: Database["public"]["Enums"]["tier"]
          id: string
          season_id: string
          user_id: string
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          created_at?: string
          final_rank: number
          final_rating: number
          final_tier: Database["public"]["Enums"]["tier"]
          id?: string
          season_id: string
          user_id: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          created_at?: string
          final_rank?: number
          final_rating?: number
          final_tier?: Database["public"]["Enums"]["tier"]
          id?: string
          season_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_standings_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_standings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "season_standings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          ended_at: string | null
          id: string
          is_current: boolean
          metadata: Json | null
          name: string
          started_at: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          is_current?: boolean
          metadata?: Json | null
          name: string
          started_at: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          is_current?: boolean
          metadata?: Json | null
          name?: string
          started_at?: string
        }
        Relationships: []
      }
      stake_locks: {
        Row: {
          amount: number
          created_at: string
          currency: Database["public"]["Enums"]["wallet_currency"]
          id: string
          lock_credit_transaction_id: string | null
          lock_point_transaction_id: string | null
          locked_at: string
          match_id: string
          metadata: Json
          settled_at: string | null
          terminal_reason: string | null
          unlock_credit_transaction_id: string | null
          unlock_point_transaction_id: string | null
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency: Database["public"]["Enums"]["wallet_currency"]
          id?: string
          lock_credit_transaction_id?: string | null
          lock_point_transaction_id?: string | null
          locked_at?: string
          match_id: string
          metadata?: Json
          settled_at?: string | null
          terminal_reason?: string | null
          unlock_credit_transaction_id?: string | null
          unlock_point_transaction_id?: string | null
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["wallet_currency"]
          id?: string
          lock_credit_transaction_id?: string | null
          lock_point_transaction_id?: string | null
          locked_at?: string
          match_id?: string
          metadata?: Json
          settled_at?: string | null
          terminal_reason?: string | null
          unlock_credit_transaction_id?: string | null
          unlock_point_transaction_id?: string | null
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stake_locks_lock_credit_tx_fk"
            columns: ["lock_credit_transaction_id"]
            isOneToOne: false
            referencedRelation: "credit_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stake_locks_lock_point_tx_fk"
            columns: ["lock_point_transaction_id"]
            isOneToOne: false
            referencedRelation: "point_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stake_locks_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stake_locks_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stake_locks_unlock_credit_tx_fk"
            columns: ["unlock_credit_transaction_id"]
            isOneToOne: false
            referencedRelation: "credit_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stake_locks_unlock_point_tx_fk"
            columns: ["unlock_point_transaction_id"]
            isOneToOne: false
            referencedRelation: "point_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stake_locks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "stake_locks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_provider_events: {
        Row: {
          provider: string
          provider_event_id: string
          received_at: string
          subscription_id: string | null
          user_id: string | null
        }
        Insert: {
          provider: string
          provider_event_id: string
          received_at?: string
          subscription_id?: string | null
          user_id?: string | null
        }
        Update: {
          provider?: string
          provider_event_id?: string
          received_at?: string
          subscription_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_provider_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "subscription_provider_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          activity_session_id: string | null
          app_version: string | null
          category: string
          contact_email: string | null
          context: Json
          created_at: string
          device_model: string | null
          id: string
          match_id: string | null
          note: string | null
          platform: string | null
          priority: string
          reviewed_at: string | null
          reviewed_by: string | null
          screen: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_session_id?: string | null
          app_version?: string | null
          category: string
          contact_email?: string | null
          context?: Json
          created_at?: string
          device_model?: string | null
          id?: string
          match_id?: string | null
          note?: string | null
          platform?: string | null
          priority?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          screen?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_session_id?: string | null
          app_version?: string | null
          category?: string
          contact_email?: string | null
          context?: Json
          created_at?: string
          device_model?: string | null
          id?: string
          match_id?: string | null
          note?: string | null
          platform?: string | null
          priority?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          screen?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_activity_session_id_fkey"
            columns: ["activity_session_id"]
            isOneToOne: false
            referencedRelation: "activity_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "support_tickets_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      team_sport_activity_details: {
        Row: {
          activity_session_id: string
          court_or_field: string | null
          created_at: string
          format: string
          game_count: number | null
          ruleset: Json
          score_log: Json
          side_0_score: number | null
          side_1_score: number | null
          stats: Json
          team_size: number | null
          winning_side: number | null
        }
        Insert: {
          activity_session_id: string
          court_or_field?: string | null
          created_at?: string
          format: string
          game_count?: number | null
          ruleset?: Json
          score_log?: Json
          side_0_score?: number | null
          side_1_score?: number | null
          stats?: Json
          team_size?: number | null
          winning_side?: number | null
        }
        Update: {
          activity_session_id?: string
          court_or_field?: string | null
          created_at?: string
          format?: string
          game_count?: number | null
          ruleset?: Json
          score_log?: Json
          side_0_score?: number | null
          side_1_score?: number | null
          stats?: Json
          team_size?: number | null
          winning_side?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "team_sport_activity_details_activity_session_id_fkey"
            columns: ["activity_session_id"]
            isOneToOne: true
            referencedRelation: "activity_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      tier_events: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          created_at: string
          direction: string
          from_tier: Database["public"]["Enums"]["tier"]
          id: string
          match_id: string | null
          season_id: string | null
          seen_at: string | null
          to_tier: Database["public"]["Enums"]["tier"]
          user_id: string
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          created_at?: string
          direction: string
          from_tier: Database["public"]["Enums"]["tier"]
          id?: string
          match_id?: string | null
          season_id?: string | null
          seen_at?: string | null
          to_tier: Database["public"]["Enums"]["tier"]
          user_id: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          created_at?: string
          direction?: string
          from_tier?: Database["public"]["Enums"]["tier"]
          id?: string
          match_id?: string | null
          season_id?: string | null
          seen_at?: string | null
          to_tier?: Database["public"]["Enums"]["tier"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tier_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tier_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tier_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tier_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_analysis_profiles: {
        Row: {
          birth_year: number | null
          competition_category: string | null
          created_at: string
          height_cm: number | null
          preferred_units: string
          primary_goal: string | null
          running_level: string | null
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          birth_year?: number | null
          competition_category?: string | null
          created_at?: string
          height_cm?: number | null
          preferred_units?: string
          primary_goal?: string | null
          running_level?: string | null
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          birth_year?: number | null
          competition_category?: string | null
          created_at?: string
          height_cm?: number | null
          preferred_units?: string
          primary_goal?: string | null
          running_level?: string | null
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_analysis_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_analysis_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_cosmetics: {
        Row: {
          acquired_at: string
          acquired_via: Database["public"]["Enums"]["cosmetic_acquired_via"]
          cosmetic_id: string
          user_id: string
        }
        Insert: {
          acquired_at?: string
          acquired_via?: Database["public"]["Enums"]["cosmetic_acquired_via"]
          cosmetic_id: string
          user_id: string
        }
        Update: {
          acquired_at?: string
          acquired_via?: Database["public"]["Enums"]["cosmetic_acquired_via"]
          cosmetic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_cosmetics_cosmetic_id_fkey"
            columns: ["cosmetic_id"]
            isOneToOne: false
            referencedRelation: "cosmetics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_cosmetics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_cosmetics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credit_wallets: {
        Row: {
          created_at: string
          credit_balance: number
          locked_credits: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credit_balance?: number
          locked_credits?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credit_balance?: number
          locked_credits?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_credit_wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_credit_wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_devices: {
        Row: {
          app_version: string | null
          fingerprint: string
          first_seen_at: string
          id: string
          last_seen_at: string
          metadata: Json
          platform: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          fingerprint: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          metadata?: Json
          platform: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          fingerprint?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          metadata?: Json
          platform?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_friends: {
        Row: {
          created_at: string
          friend_id: string
          owner_id: string
          requested_at: string
          responded_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          owner_id: string
          requested_at?: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          owner_id?: string
          requested_at?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_friends_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_friends_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_friends_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_friends_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_quest_progress: {
        Row: {
          best_streak: number
          current_streak: number
          ladder_tier: Json
          last_completed_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          best_streak?: number
          current_streak?: number
          ladder_tier?: Json
          last_completed_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          best_streak?: number
          current_streak?: number
          ladder_tier?: Json
          last_completed_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_reports: {
        Row: {
          created_at: string
          evidence_paths: string[]
          id: string
          note: string | null
          reason: string
          reported_user_id: string
          reporter_user_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          evidence_paths?: string[]
          id?: string
          note?: string | null
          reason: string
          reported_user_id: string
          reporter_user_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          evidence_paths?: string[]
          id?: string
          note?: string | null
          reason?: string
          reported_user_id?: string
          reporter_user_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_reporter_user_id_fkey"
            columns: ["reporter_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_reports_reporter_user_id_fkey"
            columns: ["reporter_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sport_positions: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          position_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          position_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          position_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sport_positions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_sport_positions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stats: {
        Row: {
          last_match_at: string | null
          season_matches: number
          season_wins: number
          total_losses: number
          total_matches: number
          total_points_won: number
          total_ties: number
          total_wins: number
          updated_at: string
          user_id: string
        }
        Insert: {
          last_match_at?: string | null
          season_matches?: number
          season_wins?: number
          total_losses?: number
          total_matches?: number
          total_points_won?: number
          total_ties?: number
          total_wins?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          last_match_at?: string | null
          season_matches?: number
          season_wins?: number
          total_losses?: number
          total_matches?: number
          total_points_won?: number
          total_ties?: number
          total_wins?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          created_at: string
          current_period_ends_at: string | null
          current_period_started_at: string
          id: string
          metadata: Json
          plan_code: string
          provider: string | null
          provider_subscription_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_ends_at?: string | null
          current_period_started_at?: string
          id?: string
          metadata?: Json
          plan_code: string
          provider?: string | null
          provider_subscription_id?: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_ends_at?: string | null
          current_period_started_at?: string
          id?: string
          metadata?: Json
          plan_code?: string
          provider?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_vouchers: {
        Row: {
          expires_at: string | null
          gift_item_id: string
          id: string
          issued_at: string
          metadata: Json
          redemption_id: string | null
          short_code: string
          source_id: string | null
          source_kind: string
          status: Database["public"]["Enums"]["voucher_status"]
          used_at: string | null
          used_by_partner: string | null
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          gift_item_id: string
          id?: string
          issued_at?: string
          metadata?: Json
          redemption_id?: string | null
          short_code: string
          source_id?: string | null
          source_kind?: string
          status?: Database["public"]["Enums"]["voucher_status"]
          used_at?: string | null
          used_by_partner?: string | null
          user_id: string
        }
        Update: {
          expires_at?: string | null
          gift_item_id?: string
          id?: string
          issued_at?: string
          metadata?: Json
          redemption_id?: string | null
          short_code?: string
          source_id?: string | null
          source_kind?: string
          status?: Database["public"]["Enums"]["voucher_status"]
          used_at?: string | null
          used_by_partner?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_vouchers_gift_item_id_fkey"
            columns: ["gift_item_id"]
            isOneToOne: false
            referencedRelation: "gift_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_vouchers_redemption_id_fkey"
            columns: ["redemption_id"]
            isOneToOne: true
            referencedRelation: "gift_redemptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_vouchers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_vouchers_user_id_fkey"
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
          ban_reason: string | null
          banned_at: string | null
          banned_by: string | null
          banned_until: string | null
          bio: string | null
          created_at: string
          creator_score: number
          current_streak: number
          deleted_at: string | null
          deletion_requested_at: string | null
          display_name: string
          email: string | null
          equipped_cosmetics: Json
          featured_match_id: string | null
          frozen_at: string | null
          handle: string
          id: string
          is_admin: boolean
          is_deleted: boolean
          jersey_number: number
          last_active_at: string
          last_checkin_date: string | null
          leaderboard_score: number
          locked_points: number
          onboarding_completed_at: string | null
          phone_verified: boolean
          show_credits_publicly: boolean
          spendable_points: number
          updated_at: string
          username_changes_used: number
          username_set_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
          banned_until?: string | null
          bio?: string | null
          created_at?: string
          creator_score?: number
          current_streak?: number
          deleted_at?: string | null
          deletion_requested_at?: string | null
          display_name?: string
          email?: string | null
          equipped_cosmetics?: Json
          featured_match_id?: string | null
          frozen_at?: string | null
          handle: string
          id: string
          is_admin?: boolean
          is_deleted?: boolean
          jersey_number?: number
          last_active_at?: string
          last_checkin_date?: string | null
          leaderboard_score?: number
          locked_points?: number
          onboarding_completed_at?: string | null
          phone_verified?: boolean
          show_credits_publicly?: boolean
          spendable_points?: number
          updated_at?: string
          username_changes_used?: number
          username_set_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
          banned_until?: string | null
          bio?: string | null
          created_at?: string
          creator_score?: number
          current_streak?: number
          deleted_at?: string | null
          deletion_requested_at?: string | null
          display_name?: string
          email?: string | null
          equipped_cosmetics?: Json
          featured_match_id?: string | null
          frozen_at?: string | null
          handle?: string
          id?: string
          is_admin?: boolean
          is_deleted?: boolean
          jersey_number?: number
          last_active_at?: string
          last_checkin_date?: string | null
          leaderboard_score?: number
          locked_points?: number
          onboarding_completed_at?: string | null
          phone_verified?: boolean
          show_credits_publicly?: boolean
          spendable_points?: number
          updated_at?: string
          username_changes_used?: number
          username_set_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_banned_by_fkey"
            columns: ["banned_by"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "users_banned_by_fkey"
            columns: ["banned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_featured_match_id_fkey"
            columns: ["featured_match_id"]
            isOneToOne: false
            referencedRelation: "admin_matches_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_featured_match_id_fkey"
            columns: ["featured_match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_matches_list: {
        Row: {
          activity_type: string | null
          cancel_request: Json | null
          correction_request: Json | null
          created_at: string | null
          created_by: string | null
          id: string | null
          is_tie: boolean | null
          participants: Json | null
          pending_cancel: Json | null
          settled_at: string | null
          stake: number | null
          status: string | null
          submitted_at: string | null
          surfaced_at: string | null
          team_scores: Json | null
          winner_user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "matches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_user_id_fkey"
            columns: ["winner_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "matches_winner_user_id_fkey"
            columns: ["winner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_review_queue: {
        Row: {
          activity_type: string | null
          detail: Json | null
          related_user_id: string | null
          stake: number | null
          sub_status: string | null
          surfaced_at: string | null
          target_id: string | null
          target_type: string | null
        }
        Relationships: []
      }
      currency_exchange_order_book: {
        Row: {
          created_at: string | null
          credits_remaining: number | null
          estimated_tax_points: number | null
          gross_points_amount: number | null
          id: string | null
          price_points_per_credit: number | null
          seller_display_name: string | null
          seller_handle: string | null
          seller_user_id: string | null
          status: string | null
          tax_bps: number | null
        }
        Relationships: [
          {
            foreignKeyName: "currency_exchange_orders_seller_user_id_fkey"
            columns: ["seller_user_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "currency_exchange_orders_seller_user_id_fkey"
            columns: ["seller_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_wallets: {
        Row: {
          available_credits: number | null
          available_spendable: number | null
          credit_balance: number | null
          leaderboard_score: number | null
          locked_credits: number | null
          locked_points: number | null
          spendable_points: number | null
          user_id: string | null
        }
        Relationships: []
      }
      wallet_ledger: {
        Row: {
          actor_user_id: string | null
          balance_after: number | null
          balance_before: number | null
          balance_delta: number | null
          created_at: string | null
          currency: Database["public"]["Enums"]["wallet_currency"] | null
          id: string | null
          idempotency_key: string | null
          metadata: Json | null
          related_match_id: string | null
          score_after: number | null
          score_before: number | null
          score_delta: number | null
          source_category:
            | Database["public"]["Enums"]["wallet_source_category"]
            | null
          source_type: string | null
          spendable_after: number | null
          spendable_before: number | null
          spendable_delta: number | null
          stake_lock_id: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _assert_admin: { Args: { p_admin_id: string }; Returns: undefined }
      _grant_quest_proof: {
        Args: {
          p_session: Database["public"]["Tables"]["quest_proof_sessions"]["Row"]
        }
        Returns: {
          activity_session_id: string | null
          audit_status: string
          challenge: Json
          challenge_id: string | null
          completed_at: string | null
          created_at: string
          cv_result: Json | null
          earn_period: string
          event_id: string | null
          guild_goal_id: string | null
          id: string
          media_path: string | null
          nonce: string
          points_granted: number
          sensor_summary: Json | null
          started_at: string
          status: string
          template_id: string
          trust_decision: string | null
          user_id: string
        }
        SetofOptions: {
          from: "quest_proof_sessions"
          to: "quest_proof_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _pair_canon: {
        Args: { p_a: string; p_b: string }
        Returns: {
          a: string
          b: string
        }[]
      }
      accept_participant_atomic: {
        Args: { p_match_id: string; p_user_id: string }
        Returns: Json
      }
      accept_team_match_result_atomic: {
        Args: { p_match_id: string; p_user_id: string }
        Returns: Json
      }
      add_friend: {
        Args: { p_friend_id?: string; p_handle?: string }
        Returns: {
          display_name: string
          friend_id: string
          handle: string
          status: string
        }[]
      }
      add_pinned_match: { Args: { p_match_id: string }; Returns: undefined }
      admin_archive_campaign_atomic: {
        Args: { p_admin_id: string; p_campaign_id: string }
        Returns: Json
      }
      admin_archive_challenge_atomic: {
        Args: { p_admin_id: string; p_challenge_id: string }
        Returns: Json
      }
      admin_archive_coupon_atomic: {
        Args: { p_admin_id: string; p_coupon_id: string }
        Returns: Json
      }
      admin_audit_download: {
        Args: { p_admin_id: string; p_session_id: string }
        Returns: string
      }
      admin_ban_user: {
        Args: {
          p_caller_id: string
          p_duration: string
          p_reason: string
          p_target_user_id: string
        }
        Returns: Json
      }
      admin_cancel_deletion_request: {
        Args: { p_caller_id: string; p_note: string; p_request_id: string }
        Returns: Json
      }
      admin_correct_match_score: {
        Args: {
          p_admin_id: string
          p_match_id: string
          p_note?: string
          p_side_0: number
          p_side_1: number
        }
        Returns: Json
      }
      admin_create_abuse_flag: {
        Args: {
          p_caller_id: string
          p_kind: string
          p_payload?: Json
          p_reason: string
          p_severity: string
          p_subject_user_id: string
        }
        Returns: Json
      }
      admin_create_challenge_atomic: {
        Args: {
          p_activity_type: Database["public"]["Enums"]["activity_type"]
          p_admin_id: string
          p_challenge_mode?: Database["public"]["Enums"]["challenge_mode"]
          p_description: string
          p_end_at: string
          p_goal_type: Database["public"]["Enums"]["challenge_goal_type"]
          p_goal_value: number
          p_max_participants: number
          p_planned_route_geojson?: Json
          p_reward_cosmetic_id?: string
          p_reward_gift_item_id?: string
          p_reward_kind?: string
          p_reward_points: number
          p_route_tolerance_m?: number
          p_start_at: string
          p_title: string
        }
        Returns: Json
      }
      admin_create_cosmetic_atomic: {
        Args: {
          p_admin_id: string
          p_asset_ref: string
          p_code: string
          p_description: string
          p_is_default: boolean
          p_name: string
          p_rarity: Database["public"]["Enums"]["cosmetic_rarity"]
          p_type: Database["public"]["Enums"]["cosmetic_type"]
        }
        Returns: Json
      }
      admin_create_coupon_atomic: {
        Args: {
          p_admin_id: string
          p_applicable_gift_ids: string[]
          p_code: string
          p_ends_at: string
          p_max_redemptions_per_user: number
          p_max_redemptions_total: number
          p_min_spend: number
          p_starts_at: string
          p_type: Database["public"]["Enums"]["coupon_type"]
          p_value: number
        }
        Returns: Json
      }
      admin_create_gift_item_atomic: {
        Args: {
          p_admin_id: string
          p_code: string
          p_description: string
          p_ends_at: string
          p_image_url: string
          p_name: string
          p_per_user_limit: number
          p_price_credits: number
          p_price_points: number
          p_reward_cosmetic_id: string
          p_reward_type: string
          p_starts_at: string
          p_stock_quantity: number
        }
        Returns: Json
      }
      admin_economy_health_snapshot: {
        Args: { p_top_n?: number; p_window_hours?: number }
        Returns: Json
      }
      admin_force_delete_user: {
        Args: {
          p_caller_id: string
          p_reason: string
          p_target_user_id: string
        }
        Returns: Json
      }
      admin_freeze_user: {
        Args: {
          p_caller_id: string
          p_reason: string
          p_target_user_id: string
        }
        Returns: Json
      }
      admin_grant_cosmetic_atomic: {
        Args: {
          p_admin_id: string
          p_cosmetic_id: string
          p_user_id: string
          p_via: Database["public"]["Enums"]["cosmetic_acquired_via"]
        }
        Returns: Json
      }
      admin_link_challenge_campaign_atomic: {
        Args: {
          p_admin_id: string
          p_campaign_id: string
          p_challenge_id: string
        }
        Returns: Json
      }
      admin_process_deletion_now: {
        Args: { p_caller_id: string; p_request_id: string }
        Returns: Json
      }
      admin_publish_campaign_atomic: {
        Args: { p_admin_id: string; p_campaign_id: string }
        Returns: Json
      }
      admin_publish_challenge_atomic: {
        Args: { p_admin_id: string; p_challenge_id: string }
        Returns: Json
      }
      admin_request_account_deletion: {
        Args: {
          p_caller_id: string
          p_immediate?: boolean
          p_reason: string
          p_target_user_id: string
        }
        Returns: Json
      }
      admin_resolve_abuse_flag: {
        Args: {
          p_caller_id: string
          p_flag_id: string
          p_note: string
          p_resolution: string
        }
        Returns: Json
      }
      admin_reverse_match_settlement: {
        Args: {
          p_admin_id: string
          p_match_id: string
          p_metadata?: Json
          p_reason: string
        }
        Returns: Json
      }
      admin_review_act: {
        Args: {
          p_action: string
          p_admin_id: string
          p_note: string
          p_payload: Json
          p_target_id: string
          p_target_type: string
        }
        Returns: Json
      }
      admin_set_gift_item_status_atomic: {
        Args: { p_admin_id: string; p_gift_item_id: string; p_status: string }
        Returns: Json
      }
      admin_unban_user: {
        Args: {
          p_caller_id: string
          p_reason: string
          p_target_user_id: string
        }
        Returns: Json
      }
      admin_unfreeze_user: {
        Args: {
          p_caller_id: string
          p_reason: string
          p_target_user_id: string
        }
        Returns: Json
      }
      admin_update_challenge_atomic: {
        Args: {
          p_activity_type?: Database["public"]["Enums"]["activity_type"]
          p_admin_id: string
          p_challenge_id: string
          p_challenge_mode?: Database["public"]["Enums"]["challenge_mode"]
          p_description?: string
          p_end_at?: string
          p_goal_type?: Database["public"]["Enums"]["challenge_goal_type"]
          p_goal_value?: number
          p_max_participants?: number
          p_planned_route_geojson?: Json
          p_reward_cosmetic_id?: string
          p_reward_gift_item_id?: string
          p_reward_kind?: string
          p_reward_points?: number
          p_route_tolerance_m?: number
          p_start_at?: string
          p_title?: string
        }
        Returns: Json
      }
      admin_update_cosmetic_atomic:
        | {
            Args: {
              p_admin_id: string
              p_asset_ref: string
              p_code: string
              p_cosmetic_id: string
              p_description: string
              p_is_default: boolean
              p_name: string
              p_rarity: Database["public"]["Enums"]["cosmetic_rarity"]
              p_type: Database["public"]["Enums"]["cosmetic_type"]
            }
            Returns: Json
          }
        | {
            Args: {
              p_admin_id: string
              p_asset_ref: string
              p_code: string
              p_cosmetic_id: string
              p_description: string
              p_is_archived: boolean
              p_is_default: boolean
              p_name: string
              p_rarity: Database["public"]["Enums"]["cosmetic_rarity"]
              p_type: Database["public"]["Enums"]["cosmetic_type"]
            }
            Returns: Json
          }
      admin_update_coupon_atomic: {
        Args: {
          p_admin_id: string
          p_applicable_gift_ids: string[]
          p_code: string
          p_coupon_id: string
          p_ends_at: string
          p_max_redemptions_per_user: number
          p_max_redemptions_total: number
          p_min_spend: number
          p_starts_at: string
          p_type: Database["public"]["Enums"]["coupon_type"]
          p_value: number
        }
        Returns: Json
      }
      admin_update_gift_item_atomic: {
        Args: {
          p_admin_id: string
          p_clear_ends_at: boolean
          p_clear_image_url: boolean
          p_clear_starts_at: boolean
          p_code: string
          p_description: string
          p_ends_at: string
          p_gift_item_id: string
          p_image_url: string
          p_name: string
          p_per_user_limit: number
          p_price_credits: number
          p_price_points: number
          p_reward_cosmetic_id: string
          p_reward_type: string
          p_starts_at: string
          p_stock_quantity: number
        }
        Returns: Json
      }
      admin_upsert_campaign_atomic: {
        Args: {
          p_admin_id: string
          p_campaign_id: string
          p_description: string
          p_end_at: string
          p_featured_priority: number
          p_partner_cards: Json
          p_partner_name: string
          p_partner_report_label: string
          p_short_prompt: string
          p_skin: Json
          p_slug: string
          p_start_at: string
          p_title: string
        }
        Returns: Json
      }
      alpha_referee_is_activity_eligible: {
        Args: {
          p_activity_type: Database["public"]["Enums"]["activity_type"]
          p_user_id: string
        }
        Returns: boolean
      }
      alpha_referee_match_supports_referee: {
        Args: {
          p_activity_type: Database["public"]["Enums"]["activity_type"]
          p_is_coop?: boolean
          p_rule_params: Json
        }
        Returns: boolean
      }
      alpha_referee_running_draft_payload: {
        Args: { p_draft_id: string }
        Returns: Json
      }
      alpha_referee_settled_match_count: {
        Args: {
          p_activity_type: Database["public"]["Enums"]["activity_type"]
          p_user_id: string
        }
        Returns: number
      }
      alpha_referee_supported_activity: {
        Args: { p_activity_type: Database["public"]["Enums"]["activity_type"] }
        Returns: boolean
      }
      anonymize_deleted_user: { Args: { p_user_id: string }; Returns: Json }
      apply_alpha_referee_atomic: {
        Args: {
          p_activity_type: Database["public"]["Enums"]["activity_type"]
          p_caller_id: string
        }
        Returns: Json
      }
      apply_pair_cooldown: {
        Args: { p_a: string; p_b: string; p_metadata?: Json; p_reason: string }
        Returns: undefined
      }
      apply_point_delta: {
        Args: {
          p_actor_user_id?: string
          p_idempotency_key?: string
          p_metadata?: Json
          p_related_match_id?: string
          p_score_delta: number
          p_spendable_delta: number
          p_stake_lock_id?: string
          p_type: Database["public"]["Enums"]["transaction_type"]
          p_user_id: string
        }
        Returns: {
          score_after: number
          spendable_after: number
        }[]
      }
      arena_actor_can_view: {
        Args: { p_arena_id: string; p_user_id: string }
        Returns: boolean
      }
      arena_apply_stake_timeout_atomic: {
        Args: { p_actor_user_id: string; p_round_id: string }
        Returns: Json
      }
      arena_dispute_round_atomic: {
        Args: { p_actor_user_id: string; p_reason: string; p_round_id: string }
        Returns: Json
      }
      arena_finalize_round_atomic: {
        Args: { p_actor_user_id: string; p_force?: boolean; p_round_id: string }
        Returns: Json
      }
      arena_mark_team_member_ready_atomic: {
        Args: { p_actor_user_id: string; p_arena_team_id: string }
        Returns: Json
      }
      arena_next_queue_position: {
        Args: { p_arena_id: string }
        Returns: number
      }
      arena_resolve_round_dispute_atomic: {
        Args: {
          p_actor_user_id: string
          p_dispute_id: string
          p_resolution: string
        }
        Returns: Json
      }
      arena_start_round_atomic: {
        Args: { p_actor_user_id: string; p_round_id: string }
        Returns: Json
      }
      arena_submit_round_result_atomic: {
        Args: {
          p_actor_user_id: string
          p_challenger_score: number
          p_champion_score: number
          p_round_id: string
        }
        Returns: Json
      }
      arena_user_is_admin: { Args: { p_user_id: string }; Returns: boolean }
      arrive_quest_spot: {
        Args: {
          p_lat: number
          p_lng: number
          p_spot_id: string
          p_user_id: string
        }
        Returns: {
          arrived_at: string
          arrived_lat: number
          arrived_lng: number
          claimed_at: string | null
          created_at: string
          earn_period: string
          id: string
          points_granted: number
          spot_id: string
          status: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "quest_checkins"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assert_credit_stake_allowed: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      assert_match_fully_locked: {
        Args: { p_match_id: string }
        Returns: undefined
      }
      assert_participant_stake_lockable: {
        Args: { p_match_id: string; p_user_id: string }
        Returns: undefined
      }
      assert_user_stake_lockable: {
        Args: { p_match_id: string; p_stake: number; p_user_id: string }
        Returns: undefined
      }
      assign_match_referee_atomic: {
        Args: {
          p_caller_id: string
          p_match_id: string
          p_referee_user_id: string
        }
        Returns: Json
      }
      audit_orphaned_stake_locks: {
        Args: never
        Returns: {
          amount: number
          currency: Database["public"]["Enums"]["wallet_currency"]
          locked_at: string
          match_id: string
          match_status: Database["public"]["Enums"]["match_status"]
          settled_at: string
          stake_lock_id: string
          user_id: string
        }[]
      }
      audit_user_wallet: { Args: { p_user_id: string }; Returns: Json }
      basketball_long_range_point_value: {
        Args: { p_team_size: number }
        Returns: number
      }
      bind_rally_coin_atomic: {
        Args: {
          p_audience: Database["public"]["Enums"]["rally_coin_audience"]
          p_binding_type: Database["public"]["Enums"]["rally_coin_binding_type"]
          p_coin_id: string
          p_created_by: string
          p_expires_at: string
          p_metadata: Json
          p_target_guild_goal_id: string
          p_target_guild_id: string
          p_target_match_id: string
        }
        Returns: {
          audience: Database["public"]["Enums"]["rally_coin_audience"]
          binding_type: Database["public"]["Enums"]["rally_coin_binding_type"]
          coin_id: string
          expires_at: string
          id: string
          metadata: Json
          replaced_binding_ids: string[]
          status: Database["public"]["Enums"]["rally_coin_binding_status"]
          target_guild_goal_id: string
          target_guild_id: string
          target_match_id: string
        }[]
      }
      block_user_atomic: {
        Args: { p_caller_id: string; p_target_id: string }
        Returns: string
      }
      calculate_solo_run_reward_points: {
        Args: { p_distance_meters: number }
        Returns: number
      }
      can_view_activity_session: {
        Args: { p_activity_session_id: string }
        Returns: boolean
      }
      cancel_currency_exchange_order: {
        Args: { p_order_id: string }
        Returns: Json
      }
      cancel_invite_atomic: {
        Args: { p_caller_id: string; p_invite_id: string }
        Returns: undefined
      }
      cancel_match_atomic: {
        Args: { p_caller_id: string; p_match_id: string }
        Returns: undefined
      }
      cancel_open_stake_locks: {
        Args: { p_actor_user_id?: string; p_match_id: string; p_reason: string }
        Returns: undefined
      }
      cast_match_vote: {
        Args: {
          p_match_id: string
          p_reason?: string
          p_vote: Database["public"]["Enums"]["community_vote_choice"]
        }
        Returns: undefined
      }
      cast_match_vote_for_user: {
        Args: {
          p_match_id: string
          p_reason?: string
          p_user_id: string
          p_vote: Database["public"]["Enums"]["community_vote_choice"]
        }
        Returns: undefined
      }
      change_username: {
        Args: { p_username: string }
        Returns: {
          changes_used: number
          charged: number
          username: string
          was_initial: boolean
        }[]
      }
      change_username_for_user: {
        Args: { p_user_id: string; p_username: string }
        Returns: {
          changes_used: number
          charged: number
          username: string
          was_initial: boolean
        }[]
      }
      check_rate_limit: {
        Args: {
          p_bucket: string
          p_max_requests: number
          p_user_id: string
          p_window_seconds: number
        }
        Returns: boolean
      }
      claim_basketball_court_mode_atomic: {
        Args: {
          p_active_calories: number
          p_avg_heart_rate: number
          p_basketball_workout_seconds: number
          p_cadence_high_seconds: number
          p_cadence_max: number
          p_distance_meters: number
          p_ended_at: string
          p_heart_rate_coverage_seconds: number
          p_max_heart_rate: number
          p_resting_heart_rate: number
          p_session_key: string
          p_source: string
          p_started_at: string
          p_steps: number
          p_user_id: string
        }
        Returns: Json
      }
      claim_challenge_reward_atomic: {
        Args: { p_challenge_id: string; p_user_id: string }
        Returns: Json
      }
      claim_daily_mission_atomic: {
        Args: {
          p_distance_meters: number
          p_mission_date: string
          p_source: string
          p_steps: number
          p_user_id: string
        }
        Returns: Json
      }
      claim_quest_spot: {
        Args: {
          p_lat: number
          p_lng: number
          p_spot_id: string
          p_user_id: string
        }
        Returns: {
          arrived_at: string
          arrived_lat: number
          arrived_lng: number
          claimed_at: string | null
          created_at: string
          earn_period: string
          id: string
          points_granted: number
          spot_id: string
          status: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "quest_checkins"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cleanup_rate_limit_buckets: { Args: never; Returns: undefined }
      compute_challenge_progress: {
        Args: { p_challenge_id: string; p_user_id: string }
        Returns: number
      }
      confirm_match_result_atomic: {
        Args: { p_caller_id: string; p_match_id: string }
        Returns: Json
      }
      contribute_guild_goal_atomic: {
        Args: {
          p_activity_session_id: string
          p_guild_goal_id: string
          p_user_id: string
        }
        Returns: Json
      }
      count_overall_rally_score_above: {
        Args: { p_score: number }
        Returns: number
      }
      count_user_matches_today: { Args: { p_user_id: string }; Returns: number }
      count_users_sharing_fingerprint: {
        Args: { p_days?: number; p_fingerprint: string }
        Returns: number
      }
      create_activity_memory_atomic: {
        Args: {
          p_activity_data: Json
          p_activity_type: Database["public"]["Enums"]["activity_type"]
          p_duration_seconds: number
          p_location_name: string
          p_media_paths: string[]
          p_mood_after: number
          p_notes: string
          p_perceived_effort: number
          p_started_at: string
          p_title: string
          p_user_id: string
        }
        Returns: Json
      }
      create_arena_round_atomic: {
        Args: { p_actor_user_id: string; p_arena_id: string }
        Returns: Json
      }
      create_challenge: {
        Args: {
          p_activity_type: Database["public"]["Enums"]["activity_type"]
          p_description: string
          p_end_at: string
          p_goal_type: Database["public"]["Enums"]["challenge_goal_type"]
          p_goal_value: number
          p_max_participants?: number
          p_start_at?: string
          p_title: string
        }
        Returns: string
      }
      create_currency_exchange_sell_order: {
        Args: { p_credits_amount: number; p_price_points_per_credit: number }
        Returns: string
      }
      create_match_lobby: {
        Args: {
          p_activity: Database["public"]["Enums"]["activity_type"]
          p_creator_stake: number
          p_deadline: string
          p_join_mode: string
          p_min_stake: number
          p_rule_text: string
          p_team_size: number
        }
        Returns: {
          join_code: string
          match_id: string
        }[]
      }
      create_match_lobby_atomic: {
        Args: {
          p_activity: Database["public"]["Enums"]["activity_type"]
          p_creator_stake: number
          p_deadline?: string
          p_entry_code?: string
          p_is_coop?: boolean
          p_join_mode?: string
          p_min_stake: number
          p_rematch_of?: string
          p_rule_params?: Json
          p_rule_text: string
          p_stake_currency?: Database["public"]["Enums"]["wallet_currency"]
          p_team_size: number
          p_user_id: string
        }
        Returns: {
          join_code: string
          match_id: string
        }[]
      }
      current_tier_of: {
        Args: {
          p_activity: Database["public"]["Enums"]["activity_type"]
          p_user_id: string
        }
        Returns: Database["public"]["Enums"]["tier"]
      }
      daily_checkin: { Args: { p_user_id: string }; Returns: Json }
      decline_participant_atomic: {
        Args: { p_caller_id: string; p_match_id: string }
        Returns: undefined
      }
      derive_challenge_progress: {
        Args: { p_challenge_id: string; p_user_id: string }
        Returns: number
      }
      derive_cooperative_challenge_progress: {
        Args: { p_challenge_id: string }
        Returns: Json
      }
      derive_jersey_number: { Args: { p_user_id: string }; Returns: number }
      derive_running_mode: {
        Args: {
          p_activity: Database["public"]["Enums"]["activity_type"]
          p_is_coop: boolean
          p_rule_params: Json
        }
        Returns: string
      }
      detect_abuse_flags: { Args: never; Returns: number }
      dispute_match_atomic: {
        Args: { p_caller_id: string; p_match_id: string }
        Returns: Json
      }
      distribute_team_score_contributions: {
        Args: { p_match_id: string; p_side_index: number; p_team_score: number }
        Returns: Json
      }
      earn_credits: {
        Args: {
          p_actor_user_id?: string
          p_amount: number
          p_idempotency_key?: string
          p_metadata?: Json
          p_related_match_id?: string
          p_stake_lock_id?: string
          p_type: Database["public"]["Enums"]["credit_transaction_type"]
          p_user_id: string
        }
        Returns: number
      }
      earn_points: {
        Args: {
          p_amount: number
          p_metadata?: Json
          p_type: Database["public"]["Enums"]["transaction_type"]
          p_user_id: string
        }
        Returns: number
      }
      economy_day_start: { Args: never; Returns: string }
      ensure_credit_wallet: { Args: { p_user_id: string }; Returns: undefined }
      equip_cosmetic: {
        Args: { p_cosmetic_id: string; p_slot: string }
        Returns: Json
      }
      equip_cosmetic_for_user: {
        Args: {
          p_activity?: Database["public"]["Enums"]["activity_type"]
          p_cosmetic_id: string
          p_slot: string
          p_user_id: string
        }
        Returns: Json
      }
      ffa_participant_results: {
        Args: { p_match_id: string }
        Returns: {
          beaten: number
          finish_position: number
          finish_rank: number
          n_active: number
          score: number
          tied: number
          user_id: string
        }[]
      }
      fill_currency_exchange_order: {
        Args: {
          p_credits_amount: number
          p_expected_price_points_per_credit?: number
          p_order_id: string
        }
        Returns: Json
      }
      find_joinable_match_by_code: {
        Args: { p_join_code: string }
        Returns: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          created_by: string
          creator_display_name: string
          creator_handle: string
          deadline: string
          id: string
          is_coop: boolean
          join_mode: string
          requires_entry_code: boolean
          rule_params: Json
          running_mode: string
          side_a_count: number
          side_b_count: number
          stake: number
          stake_currency: Database["public"]["Enums"]["wallet_currency"]
          team_size_per_side: number
        }[]
      }
      finish_coop_run_atomic: {
        Args: { p_caller_id: string; p_match_id: string }
        Returns: Json
      }
      generate_join_code: { Args: never; Returns: string }
      generate_voucher_short_code: { Args: never; Returns: string }
      get_coach_basketball_stat_baseline: {
        Args: {
          p_activity_session_id: string
          p_min_sample?: number
          p_role?: string
          p_user_id: string
        }
        Returns: Json
      }
      get_daily_earn_cap: { Args: { p_user_id: string }; Returns: Json }
      get_dispute_history: {
        Args: { p_user_id: string }
        Returns: {
          disputes_against: number
          disputes_filed: number
          total_disputed: number
          total_settled: number
        }[]
      }
      get_equipped_cosmetics: { Args: never; Returns: Json }
      get_equipped_cosmetics_for: { Args: { p_user_id: string }; Returns: Json }
      get_head_to_head: {
        Args: { p_activity: string; p_opponent: string }
        Returns: {
          draws: number
          last_played_at: string
          last_result: string
          losses: number
          wins: number
        }[]
      }
      get_live_scoreboard: { Args: { p_match_id: string }; Returns: Json }
      get_match_vote_tally: {
        Args: { p_match_id: string }
        Returns: {
          invalid_count: number
          side_a_count: number
          side_b_count: number
          tie_count: number
          total_count: number
        }[]
      }
      get_match_vote_tally_for_user: {
        Args: { p_match_id: string; p_user_id: string }
        Returns: {
          invalid_count: number
          side_a_count: number
          side_b_count: number
          tie_count: number
          total_count: number
        }[]
      }
      get_my_match_history_impacts: {
        Args: { p_match_ids: string[] }
        Returns: {
          activity_type: string
          match_id: string
          my_side: number
          my_stake_amount: number | null
          my_stake_currency: string | null
          rating_after: number | null
          rating_before: number | null
          rating_delta: number | null
          score_delta: number | null
          settled_at: string
        }[]
      }
      get_my_alpha_feature_gate: {
        Args: { p_feature_key: string }
        Returns: Json
      }
      get_notification_action_summary: {
        Args: never
        Returns: {
          incoming_friend_request_count: number
          latest_action_at: string
          match_action_count: number
          pending_invite_count: number
        }[]
      }
      get_notification_live_surfaces: {
        Args: { p_limit?: number }
        Returns: {
          activity_type: string
          actor_avatar_url: string
          actor_display_name: string
          actor_handle: string
          actor_user_id: string
          body: string
          created_at: string
          expires_at: string
          invite_id: string
          kind: string
          match_id: string
          route: string
          surface_id: string
          title: string
        }[]
      }
      get_overall_rally_score_entry: {
        Args: { p_user_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          handle: string
          leaderboard_score: number
          user_id: string
        }[]
      }
      get_pending_invite_summary: {
        Args: { p_invite_id: string }
        Returns: {
          activity_type: string
          id: string
          inviter_avatar_url: string
          inviter_display_name: string
          inviter_handle: string
          inviter_user_id: string
          is_coop: boolean
          match_id: string
          sent_at: string
          side: number
          stake: number
          stake_currency: Database["public"]["Enums"]["wallet_currency"]
          status: Database["public"]["Enums"]["match_status"]
        }[]
      }
      get_player_trust_record: {
        Args: { p_user_id: string }
        Returns: {
          best_referee_level: number
          clean_verified_matches: number
          corrected_verified_matches: number
          disputed_verified_matches: number
          latest_referee_verified_at: string
          referee_verified_losses: number
          referee_verified_matches: number
          referee_verified_ties: number
          referee_verified_wins: number
          total_matches: number
        }[]
      }
      get_profile_featured_match: { Args: { p_user_id: string }; Returns: Json }
      get_profile_pinned_matches: { Args: { p_user_id: string }; Returns: Json }
      get_public_credit_balance: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_users_with_frames: {
        Args: { p_ids: string[] }
        Returns: {
          avatar_url: string
          display_name: string
          frame_asset_ref: string
          handle: string
          id: string
        }[]
      }
      get_users_with_frames_for_activity: {
        Args: {
          p_activity: Database["public"]["Enums"]["activity_type"]
          p_ids: string[]
        }
        Returns: {
          avatar_url: string
          display_name: string
          frame_asset_ref: string
          handle: string
          id: string
          tier: Database["public"]["Enums"]["tier"]
        }[]
      }
      grant_credits_atomic: {
        Args: {
          p_amount: number
          p_idempotency_key: string
          p_metadata: Json
          p_type: Database["public"]["Enums"]["credit_transaction_type"]
          p_user_id: string
        }
        Returns: Json
      }
      host_kick_match_participant_atomic: {
        Args: {
          p_caller_id: string
          p_match_id: string
          p_target_user_id: string
        }
        Returns: undefined
      }
      infer_wallet_source_category: {
        Args: { p_type: string }
        Returns: Database["public"]["Enums"]["wallet_source_category"]
      }
      insert_campaign_report_snapshot_atomic: {
        Args: {
          p_admin_id: string
          p_campaign_id: string
          p_posthog_status: string
          p_report: Json
          p_window_end: string
          p_window_start: string
        }
        Returns: Json
      }
      invite_participant_atomic: {
        Args: {
          p_caller_id: string
          p_kind?: string
          p_match_id: string
          p_side: number
          p_stake: number
          p_user_id: string
        }
        Returns: string
      }
      is_allowed_match_status_transition: {
        Args: {
          p_from: Database["public"]["Enums"]["match_status"]
          p_to: Database["public"]["Enums"]["match_status"]
        }
        Returns: boolean
      }
      is_alpha_feature_enabled_for_user: {
        Args: { p_feature_key: string; p_user_id: string }
        Returns: boolean
      }
      is_assigned_alpha_referee: {
        Args: { p_match_id: string }
        Returns: boolean
      }
      is_eligible_to_vote: { Args: { p_match_id: string }; Returns: boolean }
      is_eligible_to_vote_for_user: {
        Args: { p_match_id: string; p_user_id: string }
        Returns: boolean
      }
      is_match_participant: { Args: { p_match_id: string }; Returns: boolean }
      issue_voucher_for_redemption: {
        Args: {
          p_currency: Database["public"]["Enums"]["wallet_currency"]
          p_gift_item_id: string
          p_user_id: string
        }
        Returns: Json
      }
      join_challenge: { Args: { p_challenge_id: string }; Returns: undefined }
      join_challenge_atomic: {
        Args: { p_challenge_id: string; p_user_id: string }
        Returns: Json
      }
      join_match_atomic: {
        Args: {
          p_entry_code: string
          p_join_code: string
          p_match_id: string
          p_side: number
          p_stake: number
          p_user_id: string
        }
        Returns: string
      }
      leave_challenge: { Args: { p_challenge_id: string }; Returns: undefined }
      leave_challenge_atomic: {
        Args: { p_challenge_id: string; p_user_id: string }
        Returns: Json
      }
      leave_coop_match_atomic: {
        Args: { p_caller_id: string; p_match_id: string }
        Returns: Json
      }
      leave_match_lobby_atomic: {
        Args: { p_caller_id: string; p_match_id: string }
        Returns: undefined
      }
      list_alpha_referee_duties_atomic: {
        Args: { p_caller_id: string }
        Returns: Json
      }
      list_alpha_referee_eligibility_atomic: {
        Args: {
          p_activity_types?: Database["public"]["Enums"]["activity_type"][]
          p_caller_id: string
        }
        Returns: Json
      }
      list_blocked_users_atomic: {
        Args: { p_caller_id: string }
        Returns: {
          avatar_url: string
          blocked_at: string
          blocked_id: string
          display_name: string
          handle: string
        }[]
      }
      list_friends: {
        Args: never
        Returns: {
          added_at: string
          display_name: string
          frame_asset_ref: string
          friend_id: string
          handle: string
        }[]
      }
      list_invitable_friends: {
        Args: { p_match_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          frame_asset_ref: string
          friend_id: string
          handle: string
          invite_status: string
          last_invited_at: string
          rating: number
          recently_played: boolean
          suggested: boolean
        }[]
      }
      list_my_matches_for_user: {
        Args: never
        Returns: {
          activity_type: string
          created_by: string
          deadline: string
          id: string
          is_coop: boolean
          is_tie: boolean
          match_abuse_reports: Json
          match_participants: Json
          match_team_result_submissions: Json
          referee_final_status: string
          referee_level: number
          referee_trust_tier: string
          rule_params: Json
          running_mode: string
          settled_at: string
          stake: number
          stake_currency: string
          status: string
          trust_label: string
          trust_source: string
          trust_weight: number
          updated_at: string
          winner_user_id: string
        }[]
      }
      list_my_pending_invites: {
        Args: { p_limit?: number }
        Returns: {
          activity_type: string
          id: string
          inviter_avatar_url: string
          inviter_display_name: string
          inviter_handle: string
          inviter_user_id: string
          is_coop: boolean
          match_id: string
          sent_at: string
          side: number
          stake: number
          stake_currency: Database["public"]["Enums"]["wallet_currency"]
          status: Database["public"]["Enums"]["match_status"]
        }[]
      }
      list_open_match_lobbies: {
        Args: never
        Returns: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          created_by: string
          creator_display_name: string
          creator_handle: string
          deadline: string
          id: string
          is_coop: boolean
          join_mode: string
          requires_entry_code: boolean
          rule_params: Json
          running_mode: string
          side_a_count: number
          side_b_count: number
          stake: number
          stake_currency: Database["public"]["Enums"]["wallet_currency"]
          team_size_per_side: number
        }[]
      }
      list_overall_rally_score_leaderboard: {
        Args: { p_limit?: number }
        Returns: {
          avatar_url: string
          display_name: string
          handle: string
          leaderboard_score: number
          user_id: string
        }[]
      }
      list_quest_proof_audit_queue: {
        Args: { p_admin_id: string; p_limit?: number }
        Returns: Json
      }
      list_referee_match_history_atomic: {
        Args: { p_limit?: number; p_referee_id: string }
        Returns: Json
      }
      list_spectatable_live_matches: { Args: never; Returns: Json }
      lock_match_stakes: { Args: { p_match_id: string }; Returns: undefined }
      log_match_lifecycle_event: {
        Args: {
          p_automation: string
          p_from_status: Database["public"]["Enums"]["match_status"]
          p_match_id: string
          p_metadata?: Json
          p_reason: string
          p_run_id: string
          p_to_status: Database["public"]["Enums"]["match_status"]
        }
        Returns: undefined
      }
      mark_alpha_referee_result_actioned: {
        Args: { p_match_id: string; p_status: string }
        Returns: undefined
      }
      mark_tier_events_seen: {
        Args: { p_event_ids: string[] }
        Returns: undefined
      }
      mark_voucher_used_by_code: {
        Args: { p_partner_id: string; p_short_code: string }
        Returns: Json
      }
      match_has_same_device_opponents: {
        Args: { p_match_id: string }
        Returns: boolean
      }
      mutual_cancel_match_atomic: {
        Args: { p_action: string; p_caller_id: string; p_match_id: string }
        Returns: Json
      }
      mutual_correct_match_atomic: {
        Args: {
          p_action: string
          p_caller_id: string
          p_match_id: string
          p_proposed?: Json
        }
        Returns: Json
      }
      pair_in_cooldown: { Args: { p_a: string; p_b: string }; Returns: boolean }
      pair_recent_h2h_count: {
        Args: { p_a: string; p_b: string; p_exclude_match: string }
        Returns: number
      }
      process_account_deletion_atomic: {
        Args: { p_request_id: string }
        Returns: Json
      }
      process_due_account_deletions: {
        Args: { p_limit?: number }
        Returns: Json
      }
      purge_expired_quest_proof_media: { Args: never; Returns: number }
      quest_distance_m: {
        Args: { p_lat1: number; p_lat2: number; p_lng1: number; p_lng2: number }
        Returns: number
      }
      recompute_challenge_progress_atomic: {
        Args: { p_challenge_id: string; p_user_id: string }
        Returns: Json
      }
      recompute_coach_aggregates_for_activity: {
        Args: { p_activity_session_id: string; p_user_id: string }
        Returns: undefined
      }
      recompute_my_challenge_progress: {
        Args: { p_challenge_id: string }
        Returns: number
      }
      recompute_tier: {
        Args: {
          p_activity_type: Database["public"]["Enums"]["activity_type"]
          p_match_id?: string
          p_season_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      record_referee_verified_match: {
        Args: { p_match_id: string }
        Returns: undefined
      }
      redeem_gift_atomic: {
        Args: {
          p_currency: Database["public"]["Enums"]["wallet_currency"]
          p_gift_item_id: string
          p_user_id: string
        }
        Returns: string
      }
      referee_level_for: {
        Args: { p_completed: number; p_rating: number; p_trust_score: number }
        Returns: number
      }
      referee_trust_tier_for: { Args: { p_level: number }; Returns: string }
      refresh_referee_sport_profile: {
        Args: {
          p_activity_type: Database["public"]["Enums"]["activity_type"]
          p_referee_user_id: string
        }
        Returns: undefined
      }
      register_user_device: {
        Args: {
          p_app_version?: string
          p_fingerprint: string
          p_platform: string
          p_user_id: string
        }
        Returns: string
      }
      remove_pinned_match: { Args: { p_match_id: string }; Returns: undefined }
      repair_stuck_stake_locks: {
        Args: { p_admin_id: string; p_match_id: string }
        Returns: Json
      }
      repair_terminal_stake_locks_atomic: {
        Args: {
          p_actor_user_id?: string
          p_dry_run?: boolean
          p_limit?: number
        }
        Returns: Json
      }
      report_match_abuse_atomic: {
        Args: {
          p_caller_id: string
          p_evidence_paths: string[]
          p_match_id: string
          p_note: string
          p_reason: string
          p_reported_user_id: string
        }
        Returns: string
      }
      report_user_atomic: {
        Args: {
          p_caller_id: string
          p_evidence_paths: string[]
          p_note: string
          p_reason: string
          p_reported_id: string
        }
        Returns: string
      }
      request_account_deletion_atomic: {
        Args: { p_caller_id: string; p_reason: string }
        Returns: Json
      }
      request_alpha_referee_result_correction_atomic: {
        Args: { p_caller_id: string; p_match_id: string; p_note: string }
        Returns: Json
      }
      request_rematch_atomic: {
        Args: {
          p_caller_id: string
          p_idempotency_key?: string
          p_original_match_id: string
        }
        Returns: Json
      }
      resolve_equipped_titles: {
        Args: { p_user_ids: string[] }
        Returns: {
          asset_ref: string
          code: string
          id: string
          name: string
          rarity: Database["public"]["Enums"]["cosmetic_rarity"]
          user_id: string
        }[]
      }
      resolve_partner_by_key_hash: {
        Args: { p_api_key_hash: string }
        Returns: string
      }
      respond_friend_request_atomic: {
        Args: { p_action: string; p_caller_id: string; p_requester_id: string }
        Returns: Json
      }
      respond_invite_atomic: {
        Args: {
          p_action: string
          p_caller_id: string
          p_invite_id: string
          p_stake: number
        }
        Returns: Json
      }
      review_quest_proof_atomic: {
        Args: {
          p_admin_id: string
          p_reason: string
          p_session_id: string
          p_verdict: string
        }
        Returns: {
          activity_session_id: string | null
          audit_status: string
          challenge: Json
          challenge_id: string | null
          completed_at: string | null
          created_at: string
          cv_result: Json | null
          earn_period: string
          event_id: string | null
          guild_goal_id: string | null
          id: string
          media_path: string | null
          nonce: string
          points_granted: number
          sensor_summary: Json | null
          started_at: string
          status: string
          template_id: string
          trust_decision: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "quest_proof_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      revoke_voucher: {
        Args: { p_reason: string; p_voucher_id: string }
        Returns: Json
      }
      rollover_season: { Args: never; Returns: undefined }
      run_account_deletion_lifecycle_atomic: {
        Args: { p_dry_run?: boolean; p_limit?: number }
        Returns: Json
      }
      run_campaign_lifecycle_atomic: { Args: never; Returns: Json }
      run_challenge_lifecycle_atomic: { Args: never; Returns: Json }
      run_match_lifecycle_automation: {
        Args: { p_dry_run?: boolean; p_limit?: number; p_now?: string }
        Returns: Json
      }
      run_seasonal_decay: { Args: never; Returns: Json }
      search_eligible_referees: {
        Args: { p_activity_type: string; p_match_id: string; p_query: string }
        Returns: {
          assigned: boolean
          avatar_url: string
          clean_matches: number
          completed_matches: number
          display_name: string
          disputed_matches: number
          eligible: boolean
          frame_asset_ref: string
          handle: string
          trust_tier: string
          user_id: string
        }[]
      }
      search_users: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          display_name: string
          frame_asset_ref: string
          handle: string
          id: string
        }[]
      }
      set_alpha_referee_quarter_boundaries_atomic: {
        Args: { p_boundaries: Json; p_caller_id: string; p_match_id: string }
        Returns: Json
      }
      set_credits_public_visibility: {
        Args: { p_value: boolean }
        Returns: boolean
      }
      set_featured_match: { Args: { p_match_id: string }; Returns: string }
      set_match_spectators: {
        Args: { p_allow: boolean; p_match_id: string }
        Returns: boolean
      }
      set_sport_position: {
        Args: {
          p_activity_type: Database["public"]["Enums"]["activity_type"]
          p_position_key: string
        }
        Returns: undefined
      }
      settle_coop_running_if_ready: {
        Args: { p_force?: boolean; p_match_id: string }
        Returns: Json
      }
      settle_match: { Args: { p_match_id: string }; Returns: undefined }
      should_apply_pair_cooldown: {
        Args: { p_a: string; p_b: string }
        Returns: Json
      }
      spectate_side_score: {
        Args: { p_match_id: string; p_side: number }
        Returns: number
      }
      spectate_viewer_blocked: {
        Args: { p_match_id: string; p_viewer_id: string }
        Returns: boolean
      }
      spend_credits: {
        Args: {
          p_actor_user_id?: string
          p_amount: number
          p_idempotency_key?: string
          p_metadata?: Json
          p_related_match_id?: string
          p_stake_lock_id?: string
          p_type: Database["public"]["Enums"]["credit_transaction_type"]
          p_user_id: string
        }
        Returns: number
      }
      spend_points: {
        Args: {
          p_amount: number
          p_metadata?: Json
          p_type: Database["public"]["Enums"]["transaction_type"]
          p_user_id: string
        }
        Returns: number
      }
      start_match_atomic: {
        Args: { p_caller_id: string; p_match_id: string }
        Returns: {
          out_started_at: string
        }[]
      }
      start_quest_proof_session_atomic: {
        Args: { p_template_id: string; p_user_id: string }
        Returns: {
          activity_session_id: string | null
          audit_status: string
          challenge: Json
          challenge_id: string | null
          completed_at: string | null
          created_at: string
          cv_result: Json | null
          earn_period: string
          event_id: string | null
          guild_goal_id: string | null
          id: string
          media_path: string | null
          nonce: string
          points_granted: number
          sensor_summary: Json | null
          started_at: string
          status: string
          template_id: string
          trust_decision: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "quest_proof_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_match_activity_atomic:
        | {
            Args: {
              p_activity_data: Json
              p_activity_session_id?: string
              p_claimed_winner_user_id?: string
              p_contributions?: Json
              p_is_tie?: boolean
              p_match_id: string
              p_media_paths?: string[]
              p_notes?: string
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_activity_data: Json
              p_claimed_winner_user_id: string
              p_contributions?: Json
              p_is_tie: boolean
              p_match_id: string
              p_media_paths: string[]
              p_notes: string
              p_user_id: string
            }
            Returns: Json
          }
      submit_quest_proof_atomic: {
        Args: {
          p_media_path: string
          p_sensor_summary: Json
          p_session_id: string
          p_user_id: string
        }
        Returns: {
          activity_session_id: string | null
          audit_status: string
          challenge: Json
          challenge_id: string | null
          completed_at: string | null
          created_at: string
          cv_result: Json | null
          earn_period: string
          event_id: string | null
          guild_goal_id: string | null
          id: string
          media_path: string | null
          nonce: string
          points_granted: number
          sensor_summary: Json | null
          started_at: string
          status: string
          template_id: string
          trust_decision: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "quest_proof_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_referee_match_result_atomic: {
        Args: { p_caller_id: string; p_match_id: string; p_result: Json }
        Returns: Json
      }
      submit_run_session_atomic:
        | {
            Args: {
              p_avg_heart_rate?: number
              p_distance_meters?: number
              p_elevation_gain_m?: number
              p_ended_at?: string
              p_external_workout_id?: string
              p_integrity_flags?: string[]
              p_match_id?: string
              p_path?: Json
              p_paused_duration_secs?: number
              p_raw_data_hash?: string
              p_source?: Database["public"]["Enums"]["activity_source"]
              p_splits?: Json
              p_started_at?: string
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_avg_heart_rate?: number
              p_distance_meters: number
              p_elevation_gain_m?: number
              p_ended_at: string
              p_external_workout_id: string
              p_integrity_flags?: string[]
              p_path: Json
              p_paused_duration_secs: number
              p_source: Database["public"]["Enums"]["activity_source"]
              p_splits?: Json
              p_started_at: string
              p_user_id: string
            }
            Returns: Json
          }
      submit_run_session_with_challenge_atomic: {
        Args: {
          p_avg_heart_rate?: number
          p_challenge_id: string
          p_distance_meters?: number
          p_elevation_gain_m?: number
          p_ended_at?: string
          p_external_workout_id?: string
          p_integrity_flags?: string[]
          p_match_id?: string
          p_path?: Json
          p_paused_duration_secs?: number
          p_raw_data_hash?: string
          p_source?: Database["public"]["Enums"]["activity_source"]
          p_splits?: Json
          p_started_at?: string
          p_user_id: string
        }
        Returns: Json
      }
      sync_credit_purchase_atomic: {
        Args: {
          p_credits: number
          p_metadata: Json
          p_product_id: string
          p_provider: string
          p_provider_event_id: string
          p_provider_transaction_id: string
          p_purchased_at: string
          p_raw_event: Json
          p_store: string
          p_user_id: string
        }
        Returns: Json
      }
      sync_subscription_event_atomic: {
        Args: {
          p_current_period_ends_at: string
          p_current_period_started_at: string
          p_metadata: Json
          p_plan_code: string
          p_provider: string
          p_provider_event_id: string
          p_provider_subscription_id: string
          p_status: Database["public"]["Enums"]["subscription_status"]
          p_user_id: string
        }
        Returns: Json
      }
      team_result_correction_atomic: {
        Args: { p_action: string; p_caller: string; p_match: string }
        Returns: Json
      }
      unaccept_participant_atomic: {
        Args: { p_caller_id: string; p_match_id: string }
        Returns: undefined
      }
      unblock_user_atomic: {
        Args: { p_caller_id: string; p_target_id: string }
        Returns: string
      }
      update_match_stake: {
        Args: {
          p_match_id: string
          p_new_stake: number
          p_reduce_overstakes: boolean
        }
        Returns: undefined
      }
      update_my_challenge_progress: {
        Args: { p_challenge_id: string; p_progress: number }
        Returns: number
      }
      update_participant_stake_atomic: {
        Args: { p_caller_id: string; p_match_id: string; p_new_stake: number }
        Returns: Json
      }
      update_ratings_after_match: {
        Args: { p_match_id: string }
        Returns: undefined
      }
      upsert_alpha_referee_live_player_stat_atomic: {
        Args: {
          p_caller_id: string
          p_match_id: string
          p_player_user_id: string
          p_stats: Json
        }
        Returns: Json
      }
      upsert_alpha_referee_running_draft_atomic: {
        Args: { p_caller_id: string; p_mark: Json; p_match_id: string }
        Returns: Json
      }
      upsert_basketball_player_stat_draft_atomic: {
        Args: {
          p_caller_id: string
          p_match_id: string
          p_note?: string
          p_stats: Json
        }
        Returns: Json
      }
      upsert_player_score_draft_atomic: {
        Args: { p_caller_id: string; p_match_id: string; p_payload: Json }
        Returns: Json
      }
      upsert_subscription_atomic: {
        Args: {
          p_current_period_ends_at: string
          p_current_period_started_at: string
          p_metadata: Json
          p_plan_code: string
          p_provider: string
          p_provider_subscription_id: string
          p_status: Database["public"]["Enums"]["subscription_status"]
          p_user_id: string
        }
        Returns: Json
      }
      user_has_active_pro: { Args: { p_user_id: string }; Returns: boolean }
      user_match_ids: { Args: never; Returns: string[] }
      user_visible_match_ids: { Args: never; Returns: string[] }
      users_share_device: {
        Args: { p_a: string; p_b: string; p_days?: number }
        Returns: boolean
      }
      verify_route_match_atomic: {
        Args: {
          p_activity_session_id: string
          p_challenge_id: string
          p_diagnostics: Json
          p_match_score: number
          p_passed: boolean
          p_user_id: string
        }
        Returns: Json
      }
      void_match_settlement: {
        Args: {
          p_actor_id?: string
          p_match_id: string
          p_metadata?: Json
          p_reason: string
        }
        Returns: Json
      }
      void_quest_proof_atomic: {
        Args: {
          p_actor_user_id: string
          p_reason: string
          p_session_id: string
        }
        Returns: {
          activity_session_id: string | null
          audit_status: string
          challenge: Json
          challenge_id: string | null
          completed_at: string | null
          created_at: string
          cv_result: Json | null
          earn_period: string
          event_id: string | null
          guild_goal_id: string | null
          id: string
          media_path: string | null
          nonce: string
          points_granted: number
          sensor_summary: Json | null
          started_at: string
          status: string
          template_id: string
          trust_decision: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "quest_proof_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      write_credit_stake_transaction: {
        Args: {
          p_amount: number
          p_balance_after: number
          p_balance_before: number
          p_idempotency_key: string
          p_match_id: string
          p_metadata: Json
          p_stake_lock_id: string
          p_type: Database["public"]["Enums"]["credit_transaction_type"]
          p_user_id: string
        }
        Returns: string
      }
      write_point_stake_lock_transaction: {
        Args: {
          p_amount: number
          p_match_id: string
          p_stake_lock_id: string
          p_user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      activity_link_type:
        | "match"
        | "challenge"
        | "cooperation_goal"
        | "group_session"
        | "guild_goal"
      activity_media_type:
        | "photo"
        | "video"
        | "gps_track"
        | "heart_rate_series"
        | "scoreboard"
        | "other"
      activity_session_status:
        | "draft"
        | "recorded"
        | "submitted"
        | "verified"
        | "rejected"
      activity_source:
        | "manual"
        | "healthkit"
        | "health_connect"
        | "garmin"
        | "gps_live"
        | "phone_motion"
      activity_type: "running" | "basketball" | "badminton"
      activity_visibility: "private" | "participants" | "friends" | "public"
      alpha_feature_gate_status: "closed" | "allowlist" | "open"
      arena_dispute_status: "open" | "resolved" | "escalated"
      arena_event_status: "open" | "paused" | "closed" | "cancelled"
      arena_join_mode: "open" | "code" | "private"
      arena_referee_status: "invited" | "active" | "declined" | "removed"
      arena_round_status:
        | "stake_acceptance"
        | "in_progress"
        | "result_pending"
        | "disputed"
        | "settled"
        | "cancelled"
      arena_team_status:
        | "forming"
        | "queued"
        | "on_deck"
        | "active"
        | "champion"
        | "retired"
        | "disputed"
        | "removed"
      campaign_status: "draft" | "scheduled" | "active" | "ended" | "archived"
      challenge_goal_type: "distance_km" | "sessions" | "minutes" | "custom"
      challenge_mode: "solo" | "cooperative"
      challenge_source: "user" | "official"
      challenge_status: "draft" | "active" | "ended" | "cancelled" | "scheduled"
      coach_sensor_source: "healthkit" | "health_connect" | "phone_motion"
      community_vote_choice: "side_a" | "side_b" | "tie" | "invalid"
      cosmetic_acquired_via:
        | "default"
        | "purchase"
        | "unlock"
        | "gift"
        | "challenge"
      cosmetic_rarity: "common" | "rare" | "epic" | "legendary"
      cosmetic_type: "frame" | "title" | "badge" | "emote" | "victory_animation"
      coupon_status: "draft" | "active" | "expired" | "archived"
      coupon_type: "percentage_discount" | "fixed_points_off" | "bonus_points"
      credit_transaction_type:
        | "initial_grant"
        | "activity_reward"
        | "purchase"
        | "match_win"
        | "match_loss"
        | "gift_redemption"
        | "refund"
        | "admin_adjustment"
        | "stake_lock"
        | "stake_unlock_refund"
        | "currency_exchange_lock"
        | "currency_exchange_purchase"
        | "currency_exchange_sale"
        | "currency_exchange_refund"
      gift_item_status: "draft" | "active" | "retired" | "archived"
      gift_redemption_status: "pending" | "fulfilled" | "cancelled" | "refunded"
      gift_reward_type: "none" | "cosmetic" | "voucher"
      guild_goal_metric:
        | "distance_meters"
        | "duration_seconds"
        | "sessions"
        | "custom"
      guild_goal_status:
        | "draft"
        | "active"
        | "completed"
        | "cancelled"
        | "expired"
      guild_invite_status:
        | "pending"
        | "accepted"
        | "declined"
        | "cancelled"
        | "expired"
      guild_role: "owner" | "officer" | "member"
      guild_visibility: "private" | "discoverable" | "public"
      match_status:
        | "pending"
        | "accepted"
        | "in_progress"
        | "submitted"
        | "verified"
        | "settled"
        | "disputed"
        | "cancelled"
      participant_role: "player" | "witness" | "referee"
      quest_verifier:
        | "sensor_sync"
        | "geofence"
        | "timed_sensor"
        | "capture_audit"
        | "cv_make_miss"
        | "cv_pose_reps"
        | "cv_juggle"
        | "cv_target_landing"
      rally_coin_audience:
        | "public"
        | "friends_only"
        | "guild_members_only"
        | "invite_only"
        | "partner_event_attendees"
      rally_coin_binding_status: "active" | "revoked" | "expired"
      rally_coin_binding_type: "match_lobby" | "guild_home" | "guild_goal"
      rally_coin_chip_type: "ntag213" | "ntag215" | "ntag216" | "ntag424_dna"
      rally_coin_risk_status: "normal" | "watch" | "review" | "blocked"
      rally_coin_status:
        | "unissued"
        | "claimable"
        | "active"
        | "suspended"
        | "lost"
        | "retired"
      rally_coin_tap_source: "nfc" | "qr" | "manual"
      rally_coin_type:
        | "personal"
        | "guild"
        | "secret"
        | "partner"
        | "venue"
        | "event"
      subscription_status: "active" | "past_due" | "cancelled" | "expired"
      tier:
        | "bronze"
        | "silver"
        | "gold"
        | "platinum"
        | "diamond"
        | "immortal"
        | "challenger"
      transaction_type:
        | "initial_grant"
        | "daily_checkin"
        | "streak_bonus"
        | "activity_reward"
        | "challenge_reward"
        | "match_win"
        | "match_loss"
        | "shop_purchase"
        | "entry_fee"
        | "passive_creator"
        | "seasonal_decay"
        | "admin_adjustment"
        | "stake_lock"
        | "stake_unlock_refund"
        | "currency_exchange_purchase"
        | "currency_exchange_sale"
        | "admin_challenge_reward"
        | "map_quest"
        | "quest_proof"
      verification_mode: "honor" | "sensor" | "community"
      voucher_status: "active" | "used" | "expired" | "revoked"
      wallet_currency: "leaderboard_point" | "credit"
      wallet_source_category:
        | "match"
        | "shop"
        | "daily"
        | "gift"
        | "admin"
        | "initial"
        | "activity"
        | "challenge"
        | "subscription"
        | "system"
        | "exchange"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      activity_link_type: [
        "match",
        "challenge",
        "cooperation_goal",
        "group_session",
        "guild_goal",
      ],
      activity_media_type: [
        "photo",
        "video",
        "gps_track",
        "heart_rate_series",
        "scoreboard",
        "other",
      ],
      activity_session_status: [
        "draft",
        "recorded",
        "submitted",
        "verified",
        "rejected",
      ],
      activity_source: [
        "manual",
        "healthkit",
        "health_connect",
        "garmin",
        "gps_live",
        "phone_motion",
      ],
      activity_type: ["running", "basketball", "badminton"],
      activity_visibility: ["private", "participants", "friends", "public"],
      alpha_feature_gate_status: ["closed", "allowlist", "open"],
      arena_dispute_status: ["open", "resolved", "escalated"],
      arena_event_status: ["open", "paused", "closed", "cancelled"],
      arena_join_mode: ["open", "code", "private"],
      arena_referee_status: ["invited", "active", "declined", "removed"],
      arena_round_status: [
        "stake_acceptance",
        "in_progress",
        "result_pending",
        "disputed",
        "settled",
        "cancelled",
      ],
      arena_team_status: [
        "forming",
        "queued",
        "on_deck",
        "active",
        "champion",
        "retired",
        "disputed",
        "removed",
      ],
      campaign_status: ["draft", "scheduled", "active", "ended", "archived"],
      challenge_goal_type: ["distance_km", "sessions", "minutes", "custom"],
      challenge_mode: ["solo", "cooperative"],
      challenge_source: ["user", "official"],
      challenge_status: ["draft", "active", "ended", "cancelled", "scheduled"],
      coach_sensor_source: ["healthkit", "health_connect", "phone_motion"],
      community_vote_choice: ["side_a", "side_b", "tie", "invalid"],
      cosmetic_acquired_via: [
        "default",
        "purchase",
        "unlock",
        "gift",
        "challenge",
      ],
      cosmetic_rarity: ["common", "rare", "epic", "legendary"],
      cosmetic_type: ["frame", "title", "badge", "emote", "victory_animation"],
      coupon_status: ["draft", "active", "expired", "archived"],
      coupon_type: ["percentage_discount", "fixed_points_off", "bonus_points"],
      credit_transaction_type: [
        "initial_grant",
        "activity_reward",
        "purchase",
        "match_win",
        "match_loss",
        "gift_redemption",
        "refund",
        "admin_adjustment",
        "stake_lock",
        "stake_unlock_refund",
        "currency_exchange_lock",
        "currency_exchange_purchase",
        "currency_exchange_sale",
        "currency_exchange_refund",
      ],
      gift_item_status: ["draft", "active", "retired", "archived"],
      gift_redemption_status: ["pending", "fulfilled", "cancelled", "refunded"],
      gift_reward_type: ["none", "cosmetic", "voucher"],
      guild_goal_metric: [
        "distance_meters",
        "duration_seconds",
        "sessions",
        "custom",
      ],
      guild_goal_status: [
        "draft",
        "active",
        "completed",
        "cancelled",
        "expired",
      ],
      guild_invite_status: [
        "pending",
        "accepted",
        "declined",
        "cancelled",
        "expired",
      ],
      guild_role: ["owner", "officer", "member"],
      guild_visibility: ["private", "discoverable", "public"],
      match_status: [
        "pending",
        "accepted",
        "in_progress",
        "submitted",
        "verified",
        "settled",
        "disputed",
        "cancelled",
      ],
      participant_role: ["player", "witness", "referee"],
      quest_verifier: [
        "sensor_sync",
        "geofence",
        "timed_sensor",
        "capture_audit",
        "cv_make_miss",
        "cv_pose_reps",
        "cv_juggle",
        "cv_target_landing",
      ],
      rally_coin_audience: [
        "public",
        "friends_only",
        "guild_members_only",
        "invite_only",
        "partner_event_attendees",
      ],
      rally_coin_binding_status: ["active", "revoked", "expired"],
      rally_coin_binding_type: ["match_lobby", "guild_home", "guild_goal"],
      rally_coin_chip_type: ["ntag213", "ntag215", "ntag216", "ntag424_dna"],
      rally_coin_risk_status: ["normal", "watch", "review", "blocked"],
      rally_coin_status: [
        "unissued",
        "claimable",
        "active",
        "suspended",
        "lost",
        "retired",
      ],
      rally_coin_tap_source: ["nfc", "qr", "manual"],
      rally_coin_type: [
        "personal",
        "guild",
        "secret",
        "partner",
        "venue",
        "event",
      ],
      subscription_status: ["active", "past_due", "cancelled", "expired"],
      tier: [
        "bronze",
        "silver",
        "gold",
        "platinum",
        "diamond",
        "immortal",
        "challenger",
      ],
      transaction_type: [
        "initial_grant",
        "daily_checkin",
        "streak_bonus",
        "activity_reward",
        "challenge_reward",
        "match_win",
        "match_loss",
        "shop_purchase",
        "entry_fee",
        "passive_creator",
        "seasonal_decay",
        "admin_adjustment",
        "stake_lock",
        "stake_unlock_refund",
        "currency_exchange_purchase",
        "currency_exchange_sale",
        "admin_challenge_reward",
        "map_quest",
        "quest_proof",
      ],
      verification_mode: ["honor", "sensor", "community"],
      voucher_status: ["active", "used", "expired", "revoked"],
      wallet_currency: ["leaderboard_point", "credit"],
      wallet_source_category: [
        "match",
        "shop",
        "daily",
        "gift",
        "admin",
        "initial",
        "activity",
        "challenge",
        "subscription",
        "system",
        "exchange",
      ],
    },
  },
} as const
