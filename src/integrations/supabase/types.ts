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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      active_positions: {
        Row: {
          agents: Json | null
          asset: string
          current_pnl: number | null
          current_price: number | null
          direction: string
          entry_price: number
          id: string
          opened_at: string | null
          projected_profit: number
          risk_reward: number
          session: string | null
          stop_loss: number
          take_profit: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          agents?: Json | null
          asset: string
          current_pnl?: number | null
          current_price?: number | null
          direction: string
          entry_price: number
          id?: string
          opened_at?: string | null
          projected_profit: number
          risk_reward: number
          session?: string | null
          stop_loss: number
          take_profit: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          agents?: Json | null
          asset?: string
          current_pnl?: number | null
          current_price?: number | null
          direction?: string
          entry_price?: number
          id?: string
          opened_at?: string | null
          projected_profit?: number
          risk_reward?: number
          session?: string | null
          stop_loss?: number
          take_profit?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      adk_strategy_state: {
        Row: {
          asset: string
          confirmation1m_data: Json | null
          created_at: string | null
          current_phase: string
          date: string
          entry_signal: Json | null
          foundation_data: Json | null
          fvg15m_data: Json | null
          id: string
          next_action: string | null
          retest_data: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          asset: string
          confirmation1m_data?: Json | null
          created_at?: string | null
          current_phase: string
          date: string
          entry_signal?: Json | null
          foundation_data?: Json | null
          fvg15m_data?: Json | null
          id?: string
          next_action?: string | null
          retest_data?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          asset?: string
          confirmation1m_data?: Json | null
          created_at?: string | null
          current_phase?: string
          date?: string
          entry_signal?: Json | null
          foundation_data?: Json | null
          fvg15m_data?: Json | null
          id?: string
          next_action?: string | null
          retest_data?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      agent_logs: {
        Row: {
          agent_name: string
          asset: string
          created_at: string | null
          data: Json | null
          id: string
          status: string
          user_id: string | null
        }
        Insert: {
          agent_name: string
          asset: string
          created_at?: string | null
          data?: Json | null
          id?: string
          status: string
          user_id?: string | null
        }
        Update: {
          agent_name?: string
          asset?: string
          created_at?: string | null
          data?: Json | null
          id?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      daily_goals: {
        Row: {
          completed: boolean | null
          created_at: string | null
          date: string
          id: string
          losses: number | null
          max_losses: number | null
          projected_completion_time: string | null
          target_operations: number | null
          target_pnl_percent: number | null
          total_operations: number | null
          total_pnl: number | null
          user_id: string | null
          wins: number | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          date: string
          id?: string
          losses?: number | null
          max_losses?: number | null
          projected_completion_time?: string | null
          target_operations?: number | null
          target_pnl_percent?: number | null
          total_operations?: number | null
          total_pnl?: number | null
          user_id?: string | null
          wins?: number | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          date?: string
          id?: string
          losses?: number | null
          max_losses?: number | null
          projected_completion_time?: string | null
          target_operations?: number | null
          target_pnl_percent?: number | null
          total_operations?: number | null
          total_pnl?: number | null
          user_id?: string | null
          wins?: number | null
        }
        Relationships: []
      }
      market_conditions: {
        Row: {
          analysis_data: Json | null
          asset: string
          condition_type: string
          detected_at: string | null
          expires_at: string | null
          id: string
          trend_direction: string | null
          user_id: string
          volatility_score: number | null
          volume_profile: string | null
        }
        Insert: {
          analysis_data?: Json | null
          asset: string
          condition_type: string
          detected_at?: string | null
          expires_at?: string | null
          id?: string
          trend_direction?: string | null
          user_id: string
          volatility_score?: number | null
          volume_profile?: string | null
        }
        Update: {
          analysis_data?: Json | null
          asset?: string
          condition_type?: string
          detected_at?: string | null
          expires_at?: string | null
          id?: string
          trend_direction?: string | null
          user_id?: string
          volatility_score?: number | null
          volume_profile?: string | null
        }
        Relationships: []
      }
      operations: {
        Row: {
          agents: Json | null
          asset: string
          created_at: string | null
          direction: string
          entry_price: number
          entry_time: string | null
          exit_price: number | null
          exit_time: string | null
          id: string
          pnl: number | null
          result: string | null
          risk_reward: number
          session: string | null
          stop_loss: number
          strategy: string | null
          take_profit: number
          user_id: string | null
        }
        Insert: {
          agents?: Json | null
          asset: string
          created_at?: string | null
          direction: string
          entry_price: number
          entry_time?: string | null
          exit_price?: number | null
          exit_time?: string | null
          id?: string
          pnl?: number | null
          result?: string | null
          risk_reward: number
          session?: string | null
          stop_loss: number
          strategy?: string | null
          take_profit: number
          user_id?: string | null
        }
        Update: {
          agents?: Json | null
          asset?: string
          created_at?: string | null
          direction?: string
          entry_price?: number
          entry_time?: string | null
          exit_price?: number | null
          exit_time?: string | null
          id?: string
          pnl?: number | null
          result?: string | null
          risk_reward?: number
          session?: string | null
          stop_loss?: number
          strategy?: string | null
          take_profit?: number
          user_id?: string | null
        }
        Relationships: []
      }
      pending_signals: {
        Row: {
          agents: Json | null
          asset: string
          confidence_score: number | null
          created_at: string | null
          detected_at: string
          direction: string
          entry_price: number
          executed_at: string | null
          expires_at: string
          id: string
          risk_reward: number
          session: string
          signal_data: Json | null
          status: string
          stop_loss: number
          strategy: string
          take_profit: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agents?: Json | null
          asset: string
          confidence_score?: number | null
          created_at?: string | null
          detected_at?: string
          direction: string
          entry_price: number
          executed_at?: string | null
          expires_at: string
          id?: string
          risk_reward: number
          session: string
          signal_data?: Json | null
          status?: string
          stop_loss: number
          strategy: string
          take_profit: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agents?: Json | null
          asset?: string
          confidence_score?: number | null
          created_at?: string | null
          detected_at?: string
          direction?: string
          entry_price?: number
          executed_at?: string | null
          expires_at?: string
          id?: string
          risk_reward?: number
          session?: string
          signal_data?: Json | null
          status?: string
          stop_loss?: number
          strategy?: string
          take_profit?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      performance_metrics: {
        Row: {
          avg_rr: number | null
          best_strategy: string | null
          date: string
          id: string
          losses: number | null
          max_drawdown: number | null
          signals_detected: number | null
          signals_executed: number | null
          signals_expired: number | null
          signals_rejected: number | null
          strategy_performance: Json | null
          total_operations: number | null
          total_pnl: number | null
          updated_at: string | null
          user_id: string
          win_rate: number | null
          wins: number | null
          worst_strategy: string | null
        }
        Insert: {
          avg_rr?: number | null
          best_strategy?: string | null
          date?: string
          id?: string
          losses?: number | null
          max_drawdown?: number | null
          signals_detected?: number | null
          signals_executed?: number | null
          signals_expired?: number | null
          signals_rejected?: number | null
          strategy_performance?: Json | null
          total_operations?: number | null
          total_pnl?: number | null
          updated_at?: string | null
          user_id: string
          win_rate?: number | null
          wins?: number | null
          worst_strategy?: string | null
        }
        Update: {
          avg_rr?: number | null
          best_strategy?: string | null
          date?: string
          id?: string
          losses?: number | null
          max_drawdown?: number | null
          signals_detected?: number | null
          signals_executed?: number | null
          signals_expired?: number | null
          signals_rejected?: number | null
          strategy_performance?: Json | null
          total_operations?: number | null
          total_pnl?: number | null
          updated_at?: string | null
          user_id?: string
          win_rate?: number | null
          wins?: number | null
          worst_strategy?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          name: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      protection_logs: {
        Row: {
          asset: string
          confidence: number
          created_at: string | null
          decision: string
          id: string
          position_id: string | null
          reason: string
          rr_at_decision: number
          user_id: string | null
        }
        Insert: {
          asset: string
          confidence: number
          created_at?: string | null
          decision: string
          id?: string
          position_id?: string | null
          reason: string
          rr_at_decision: number
          user_id?: string | null
        }
        Update: {
          asset?: string
          confidence?: number
          created_at?: string | null
          decision?: string
          id?: string
          position_id?: string | null
          reason?: string
          rr_at_decision?: number
          user_id?: string | null
        }
        Relationships: []
      }
      risk_management_state: {
        Row: {
          consecutive_losses: number | null
          consecutive_wins: number | null
          cooldown_until: string | null
          current_risk_multiplier: number | null
          daily_drawdown_percent: number | null
          id: string
          last_5_ops_winrate: number | null
          last_trade_at: string | null
          mode: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          consecutive_losses?: number | null
          consecutive_wins?: number | null
          cooldown_until?: string | null
          current_risk_multiplier?: number | null
          daily_drawdown_percent?: number | null
          id?: string
          last_5_ops_winrate?: number | null
          last_trade_at?: string | null
          mode?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          consecutive_losses?: number | null
          consecutive_wins?: number | null
          cooldown_until?: string | null
          current_risk_multiplier?: number | null
          daily_drawdown_percent?: number | null
          id?: string
          last_5_ops_winrate?: number | null
          last_trade_at?: string | null
          mode?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      session_foundation: {
        Row: {
          created_at: string | null
          date: string
          high: number
          id: string
          low: number
          session: string
          timeframe: string | null
          timestamp: string
          user_id: string
          validity_type: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          high: number
          id?: string
          low: number
          session: string
          timeframe?: string | null
          timestamp: string
          user_id: string
          validity_type?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          high?: number
          id?: string
          low?: number
          session?: string
          timeframe?: string | null
          timestamp?: string
          user_id?: string
          validity_type?: string | null
        }
        Relationships: []
      }
      session_history: {
        Row: {
          c1_direction: string | null
          confidence_score: number | null
          confirmation: string | null
          created_at: string | null
          cycle_phase: string
          direction: string | null
          event_data: Json | null
          event_type: string | null
          id: string
          market_data: Json | null
          notes: string | null
          pair: string
          range_high: number | null
          range_low: number | null
          risk: Json | null
          session: string
          signal: string | null
          timestamp: string
          user_id: string | null
          volume_factor: number | null
        }
        Insert: {
          c1_direction?: string | null
          confidence_score?: number | null
          confirmation?: string | null
          created_at?: string | null
          cycle_phase: string
          direction?: string | null
          event_data?: Json | null
          event_type?: string | null
          id?: string
          market_data?: Json | null
          notes?: string | null
          pair: string
          range_high?: number | null
          range_low?: number | null
          risk?: Json | null
          session: string
          signal?: string | null
          timestamp: string
          user_id?: string | null
          volume_factor?: number | null
        }
        Update: {
          c1_direction?: string | null
          confidence_score?: number | null
          confirmation?: string | null
          created_at?: string | null
          cycle_phase?: string
          direction?: string | null
          event_data?: Json | null
          event_type?: string | null
          id?: string
          market_data?: Json | null
          notes?: string | null
          pair?: string
          range_high?: number | null
          range_low?: number | null
          risk?: Json | null
          session?: string
          signal?: string | null
          timestamp?: string
          user_id?: string | null
          volume_factor?: number | null
        }
        Relationships: []
      }
      session_state: {
        Row: {
          asia_confirmation: string | null
          asia_direction: string | null
          c1_confidence: number | null
          c1_direction: string | null
          created_at: string | null
          date: string
          id: string
          london_range_high: number | null
          london_range_low: number | null
          oceania_high: number | null
          oceania_low: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          asia_confirmation?: string | null
          asia_direction?: string | null
          c1_confidence?: number | null
          c1_direction?: string | null
          created_at?: string | null
          date: string
          id?: string
          london_range_high?: number | null
          london_range_low?: number | null
          oceania_high?: number | null
          oceania_low?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          asia_confirmation?: string | null
          asia_direction?: string | null
          c1_confidence?: number | null
          c1_direction?: string | null
          created_at?: string | null
          date?: string
          id?: string
          london_range_high?: number | null
          london_range_low?: number | null
          oceania_high?: number | null
          oceania_low?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      session_trade_count: {
        Row: {
          created_at: string | null
          date: string
          id: string
          session: string
          trade_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          session: string
          trade_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          session?: string
          trade_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      strategy_config: {
        Row: {
          allowed_sessions: string[] | null
          created_at: string | null
          id: string
          is_active: boolean | null
          market_conditions: string[] | null
          max_positions: number | null
          min_confidence_score: number | null
          preferred_pairs: string[] | null
          priority: number | null
          risk_per_trade_multiplier: number | null
          strategy_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allowed_sessions?: string[] | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          market_conditions?: string[] | null
          max_positions?: number | null
          min_confidence_score?: number | null
          preferred_pairs?: string[] | null
          priority?: number | null
          risk_per_trade_multiplier?: number | null
          strategy_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allowed_sessions?: string[] | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          market_conditions?: string[] | null
          max_positions?: number | null
          min_confidence_score?: number | null
          preferred_pairs?: string[] | null
          priority?: number | null
          risk_per_trade_multiplier?: number | null
          strategy_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      system_alerts: {
        Row: {
          action_required: boolean | null
          action_url: string | null
          alert_type: string
          category: string
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          severity: number | null
          title: string
          user_id: string
        }
        Insert: {
          action_required?: boolean | null
          action_url?: string | null
          alert_type: string
          category: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          severity?: number | null
          title: string
          user_id: string
        }
        Update: {
          action_required?: boolean | null
          action_url?: string | null
          alert_type?: string
          category?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          severity?: number | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      user_api_credentials: {
        Row: {
          broker_name: string | null
          broker_type: string
          created_at: string | null
          encrypted_api_key: string | null
          encrypted_api_secret: string | null
          id: string
          is_active: boolean | null
          last_tested_at: string | null
          test_status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          broker_name?: string | null
          broker_type: string
          created_at?: string | null
          encrypted_api_key?: string | null
          encrypted_api_secret?: string | null
          id?: string
          is_active?: boolean | null
          last_tested_at?: string | null
          test_status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          broker_name?: string | null
          broker_type?: string
          created_at?: string | null
          encrypted_api_key?: string | null
          encrypted_api_secret?: string | null
          id?: string
          is_active?: boolean | null
          last_tested_at?: string | null
          test_status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          active_strategies: string[] | null
          api_key: string | null
          api_secret: string | null
          balance: number
          bot_status: string | null
          cooldown_disabled_until: string | null
          created_at: string | null
          id: string
          leverage: number | null
          max_positions: number | null
          paper_mode: boolean | null
          profit_target_percent: number | null
          risk_per_trade: number | null
          single_position_mode: boolean | null
          trading_strategy: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          active_strategies?: string[] | null
          api_key?: string | null
          api_secret?: string | null
          balance?: number
          bot_status?: string | null
          cooldown_disabled_until?: string | null
          created_at?: string | null
          id?: string
          leverage?: number | null
          max_positions?: number | null
          paper_mode?: boolean | null
          profit_target_percent?: number | null
          risk_per_trade?: number | null
          single_position_mode?: boolean | null
          trading_strategy?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          active_strategies?: string[] | null
          api_key?: string | null
          api_secret?: string | null
          balance?: number
          bot_status?: string | null
          cooldown_disabled_until?: string | null
          created_at?: string | null
          id?: string
          leverage?: number | null
          max_positions?: number | null
          paper_mode?: boolean | null
          profit_target_percent?: number | null
          risk_per_trade?: number | null
          single_position_mode?: boolean | null
          trading_strategy?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      vision_agent_logs: {
        Row: {
          action: string
          confidence: number
          created_at: string | null
          executed: boolean | null
          execution_result: string | null
          features_summary: Json | null
          frame_index: number
          id: string
          model_version: string
          symbol: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          action: string
          confidence: number
          created_at?: string | null
          executed?: boolean | null
          execution_result?: string | null
          features_summary?: Json | null
          frame_index: number
          id?: string
          model_version: string
          symbol?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          action?: string
          confidence?: number
          created_at?: string | null
          executed?: boolean | null
          execution_result?: string | null
          features_summary?: Json | null
          frame_index?: number
          id?: string
          model_version?: string
          symbol?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      vision_agent_settings: {
        Row: {
          api_token: string | null
          auto_process_new_videos: boolean | null
          confidence_threshold: number | null
          created_at: string | null
          enabled: boolean | null
          frame_step: number | null
          id: string
          max_signals_per_day: number | null
          max_video_duration_seconds: number | null
          min_video_duration_seconds: number | null
          mode: string | null
          model_version: string | null
          sequence_length: number | null
          settings_json: Json | null
          updated_at: string | null
          user_id: string
          youtube_channel_url: string | null
          youtube_playlist_url: string | null
        }
        Insert: {
          api_token?: string | null
          auto_process_new_videos?: boolean | null
          confidence_threshold?: number | null
          created_at?: string | null
          enabled?: boolean | null
          frame_step?: number | null
          id?: string
          max_signals_per_day?: number | null
          max_video_duration_seconds?: number | null
          min_video_duration_seconds?: number | null
          mode?: string | null
          model_version?: string | null
          sequence_length?: number | null
          settings_json?: Json | null
          updated_at?: string | null
          user_id: string
          youtube_channel_url?: string | null
          youtube_playlist_url?: string | null
        }
        Update: {
          api_token?: string | null
          auto_process_new_videos?: boolean | null
          confidence_threshold?: number | null
          created_at?: string | null
          enabled?: boolean | null
          frame_step?: number | null
          id?: string
          max_signals_per_day?: number | null
          max_video_duration_seconds?: number | null
          min_video_duration_seconds?: number | null
          mode?: string | null
          model_version?: string | null
          sequence_length?: number | null
          settings_json?: Json | null
          updated_at?: string | null
          user_id?: string
          youtube_channel_url?: string | null
          youtube_playlist_url?: string | null
        }
        Relationships: []
      }
      vision_agent_signals: {
        Row: {
          action: string | null
          asset: string
          confidence: number
          created_at: string | null
          entry_price: number | null
          executed: boolean | null
          execution_details: Json | null
          execution_status: string | null
          features_summary: Json | null
          frame_index: number | null
          id: string
          model_version: string | null
          risk_reward: number | null
          signal_type: string
          stop_loss: number | null
          take_profit: number | null
          timestamp_in_video: number | null
          user_id: string
          video_id: string | null
        }
        Insert: {
          action?: string | null
          asset: string
          confidence: number
          created_at?: string | null
          entry_price?: number | null
          executed?: boolean | null
          execution_details?: Json | null
          execution_status?: string | null
          features_summary?: Json | null
          frame_index?: number | null
          id?: string
          model_version?: string | null
          risk_reward?: number | null
          signal_type: string
          stop_loss?: number | null
          take_profit?: number | null
          timestamp_in_video?: number | null
          user_id: string
          video_id?: string | null
        }
        Update: {
          action?: string | null
          asset?: string
          confidence?: number
          created_at?: string | null
          entry_price?: number | null
          executed?: boolean | null
          execution_details?: Json | null
          execution_status?: string | null
          features_summary?: Json | null
          frame_index?: number | null
          id?: string
          model_version?: string | null
          risk_reward?: number | null
          signal_type?: string
          stop_loss?: number | null
          take_profit?: number | null
          timestamp_in_video?: number | null
          user_id?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vision_agent_signals_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "vision_agent_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      vision_agent_state: {
        Row: {
          config: Json | null
          created_at: string | null
          current_frame: number | null
          current_video_id: string | null
          current_video_title: string | null
          id: string
          last_heartbeat: string | null
          mode: string
          model_version: string | null
          playlist_url: string | null
          progress_percent: number | null
          status: string
          total_frames: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          current_frame?: number | null
          current_video_id?: string | null
          current_video_title?: string | null
          id?: string
          last_heartbeat?: string | null
          mode?: string
          model_version?: string | null
          playlist_url?: string | null
          progress_percent?: number | null
          status?: string
          total_frames?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          current_frame?: number | null
          current_video_id?: string | null
          current_video_title?: string | null
          id?: string
          last_heartbeat?: string | null
          mode?: string
          model_version?: string | null
          playlist_url?: string | null
          progress_percent?: number | null
          status?: string
          total_frames?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vision_agent_videos: {
        Row: {
          channel: string | null
          created_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          model_version: string | null
          processed_frames: number | null
          processing_completed_at: string | null
          processing_started_at: string | null
          signals_generated: number | null
          status: string | null
          title: string | null
          total_frames: number | null
          updated_at: string | null
          user_id: string
          video_id: string
          youtube_url: string
        }
        Insert: {
          channel?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          model_version?: string | null
          processed_frames?: number | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          signals_generated?: number | null
          status?: string | null
          title?: string | null
          total_frames?: number | null
          updated_at?: string | null
          user_id: string
          video_id: string
          youtube_url: string
        }
        Update: {
          channel?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          model_version?: string | null
          processed_frames?: number | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          signals_generated?: number | null
          status?: string | null
          title?: string | null
          total_frames?: number | null
          updated_at?: string | null
          user_id?: string
          video_id?: string
          youtube_url?: string
        }
        Relationships: []
      }
      vision_learned_setups: {
        Row: {
          asset: string
          created_at: string | null
          entry_price: number | null
          frame_index: number
          id: string
          reasoning: string | null
          risk_reward: number | null
          screenshot_url: string | null
          setup_context: string | null
          stop_loss: number | null
          strategy_id: string | null
          take_profit: number | null
          timeframe: string
          timestamp_in_video: number | null
          user_id: string
          video_id: string
          visual_elements: Json | null
        }
        Insert: {
          asset?: string
          created_at?: string | null
          entry_price?: number | null
          frame_index: number
          id?: string
          reasoning?: string | null
          risk_reward?: number | null
          screenshot_url?: string | null
          setup_context?: string | null
          stop_loss?: number | null
          strategy_id?: string | null
          take_profit?: number | null
          timeframe: string
          timestamp_in_video?: number | null
          user_id: string
          video_id: string
          visual_elements?: Json | null
        }
        Update: {
          asset?: string
          created_at?: string | null
          entry_price?: number | null
          frame_index?: number
          id?: string
          reasoning?: string | null
          risk_reward?: number | null
          screenshot_url?: string | null
          setup_context?: string | null
          stop_loss?: number | null
          strategy_id?: string | null
          take_profit?: number | null
          timeframe?: string
          timestamp_in_video?: number | null
          user_id?: string
          video_id?: string
          visual_elements?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "vision_learned_setups_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "vision_learned_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      vision_learned_strategies: {
        Row: {
          conditions: Json
          confidence_score: number | null
          created_at: string | null
          description: string | null
          entry_rules: Json
          exit_rules: Json
          id: string
          learned_from_video_id: string | null
          setup_type: string
          strategy_name: string
          success_rate: number | null
          times_applied: number | null
          updated_at: string | null
          user_id: string
          visual_reference_url: string | null
        }
        Insert: {
          conditions?: Json
          confidence_score?: number | null
          created_at?: string | null
          description?: string | null
          entry_rules?: Json
          exit_rules?: Json
          id?: string
          learned_from_video_id?: string | null
          setup_type: string
          strategy_name: string
          success_rate?: number | null
          times_applied?: number | null
          updated_at?: string | null
          user_id: string
          visual_reference_url?: string | null
        }
        Update: {
          conditions?: Json
          confidence_score?: number | null
          created_at?: string | null
          description?: string | null
          entry_rules?: Json
          exit_rules?: Json
          id?: string
          learned_from_video_id?: string | null
          setup_type?: string
          strategy_name?: string
          success_rate?: number | null
          times_applied?: number | null
          updated_at?: string | null
          user_id?: string
          visual_reference_url?: string | null
        }
        Relationships: []
      }
      vision_model_metrics: {
        Row: {
          created_at: string | null
          f1_score: number | null
          id: string
          is_active: boolean | null
          is_promoted: boolean | null
          max_drawdown: number | null
          model_type: string
          model_version: string
          notes: string | null
          precision_enter: number | null
          precision_exit: number | null
          promoted_at: string | null
          recall_enter: number | null
          recall_exit: number | null
          total_pnl_simulated: number | null
          total_trades_simulated: number | null
          trained_at: string | null
          training_samples: number | null
          user_id: string
          validation_days: number | null
          winning_trades: number | null
        }
        Insert: {
          created_at?: string | null
          f1_score?: number | null
          id?: string
          is_active?: boolean | null
          is_promoted?: boolean | null
          max_drawdown?: number | null
          model_type: string
          model_version: string
          notes?: string | null
          precision_enter?: number | null
          precision_exit?: number | null
          promoted_at?: string | null
          recall_enter?: number | null
          recall_exit?: number | null
          total_pnl_simulated?: number | null
          total_trades_simulated?: number | null
          trained_at?: string | null
          training_samples?: number | null
          user_id: string
          validation_days?: number | null
          winning_trades?: number | null
        }
        Update: {
          created_at?: string | null
          f1_score?: number | null
          id?: string
          is_active?: boolean | null
          is_promoted?: boolean | null
          max_drawdown?: number | null
          model_type?: string
          model_version?: string
          notes?: string | null
          precision_enter?: number | null
          precision_exit?: number | null
          promoted_at?: string | null
          recall_enter?: number | null
          recall_exit?: number | null
          total_pnl_simulated?: number | null
          total_trades_simulated?: number | null
          trained_at?: string | null
          training_samples?: number | null
          user_id?: string
          validation_days?: number | null
          winning_trades?: number | null
        }
        Relationships: []
      }
      vision_training_data: {
        Row: {
          created_at: string | null
          features_hash: string
          frame_end: number
          frame_start: number
          id: string
          label: string
          label_source: string
          pnl_result: number | null
          sequence_length: number
          trade_id: string | null
          used_in_training: boolean | null
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string | null
          features_hash: string
          frame_end: number
          frame_start: number
          id?: string
          label: string
          label_source: string
          pnl_result?: number | null
          sequence_length: number
          trade_id?: string | null
          used_in_training?: boolean | null
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string | null
          features_hash?: string
          frame_end?: number
          frame_start?: number
          id?: string
          label?: string
          label_source?: string
          pnl_result?: number | null
          sequence_length?: number
          trade_id?: string | null
          used_in_training?: boolean | null
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      vision_videos_processed: {
        Row: {
          channel_name: string | null
          completed_at: string | null
          created_at: string | null
          duration_seconds: number | null
          error_message: string | null
          frames_processed: number | null
          id: string
          signals_detected: number | null
          started_at: string | null
          status: string
          total_frames: number | null
          user_id: string
          video_id: string
          video_title: string
          video_url: string
        }
        Insert: {
          channel_name?: string | null
          completed_at?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          frames_processed?: number | null
          id?: string
          signals_detected?: number | null
          started_at?: string | null
          status?: string
          total_frames?: number | null
          user_id: string
          video_id: string
          video_title: string
          video_url: string
        }
        Update: {
          channel_name?: string | null
          completed_at?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          frames_processed?: number | null
          id?: string
          signals_detected?: number | null
          started_at?: string | null
          status?: string
          total_frames?: number | null
          user_id?: string
          video_id?: string
          video_title?: string
          video_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
