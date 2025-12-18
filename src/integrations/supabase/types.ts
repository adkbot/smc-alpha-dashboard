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
      achievements_2025_11_29_23_24: {
        Row: {
          achievement_name: string
          achievement_type: string
          created_at: string | null
          description: string | null
          id: string
          points_earned: number | null
          unlocked_at: string | null
          user_id: string | null
        }
        Insert: {
          achievement_name: string
          achievement_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          points_earned?: number | null
          unlocked_at?: string | null
          user_id?: string | null
        }
        Update: {
          achievement_name?: string
          achievement_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          points_earned?: number | null
          unlocked_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "achievements_2025_11_29_23_24_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_trading_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
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
        Relationships: [
          {
            foreignKeyName: "active_positions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_trading_summary"
            referencedColumns: ["user_id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "agent_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_trading_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      broker_configs_2025_11_29_15_37: {
        Row: {
          api_key: string
          api_secret: string
          balance: number | null
          broker_name: string
          created_at: string
          id: string
          is_active: boolean | null
          is_testnet: boolean | null
          leverage: number | null
          max_risk_per_trade: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          api_secret: string
          balance?: number | null
          broker_name: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_testnet?: boolean | null
          leverage?: number | null
          max_risk_per_trade?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          api_secret?: string
          balance?: number | null
          broker_name?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_testnet?: boolean | null
          leverage?: number | null
          max_risk_per_trade?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broker_configs_2025_11_29_15_37_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_trading_summary"
            referencedColumns: ["user_id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "daily_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_trading_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      entry_points_history: {
        Row: {
          confidence: number
          created_at: string | null
          entry_id: string
          id: string
          price: number
          risk_reward_ratio: number
          status: string | null
          stop_loss: number
          sweep_id: string | null
          symbol: string
          take_profit_1: number
          take_profit_2: number
          take_profit_3: number
          timestamp: number
          type: string
          user_id: string | null
        }
        Insert: {
          confidence: number
          created_at?: string | null
          entry_id: string
          id?: string
          price: number
          risk_reward_ratio: number
          status?: string | null
          stop_loss: number
          sweep_id?: string | null
          symbol: string
          take_profit_1: number
          take_profit_2: number
          take_profit_3: number
          timestamp: number
          type: string
          user_id?: string | null
        }
        Update: {
          confidence?: number
          created_at?: string | null
          entry_id?: string
          id?: string
          price?: number
          risk_reward_ratio?: number
          status?: string | null
          stop_loss?: number
          sweep_id?: string | null
          symbol?: string
          take_profit_1?: number
          take_profit_2?: number
          take_profit_3?: number
          timestamp?: number
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entry_points_history_sweep_id_fkey"
            columns: ["sweep_id"]
            isOneToOne: false
            referencedRelation: "sweeps_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_points_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_trading_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      exchange_credentials: {
        Row: {
          api_key_encrypted: string
          api_secret_encrypted: string
          created_at: string | null
          exchange_name: string
          id: string
          is_active: boolean | null
          last_validated_at: string | null
          passphrase_encrypted: string | null
          testnet: boolean | null
          updated_at: string | null
          user_id: string
          validation_error: string | null
          validation_status: string | null
        }
        Insert: {
          api_key_encrypted: string
          api_secret_encrypted: string
          created_at?: string | null
          exchange_name: string
          id?: string
          is_active?: boolean | null
          last_validated_at?: string | null
          passphrase_encrypted?: string | null
          testnet?: boolean | null
          updated_at?: string | null
          user_id: string
          validation_error?: string | null
          validation_status?: string | null
        }
        Update: {
          api_key_encrypted?: string
          api_secret_encrypted?: string
          created_at?: string | null
          exchange_name?: string
          id?: string
          is_active?: boolean | null
          last_validated_at?: string | null
          passphrase_encrypted?: string | null
          testnet?: boolean | null
          updated_at?: string | null
          user_id?: string
          validation_error?: string | null
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exchange_credentials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_trading_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ia_learning_patterns: {
        Row: {
          created_at: string
          id: string
          losses: number
          padrao_id: string
          recompensa_acumulada: number
          taxa_acerto: number
          ultimo_uso: string | null
          updated_at: string
          user_id: string
          vezes_testado: number
          wins: number
        }
        Insert: {
          created_at?: string
          id?: string
          losses?: number
          padrao_id: string
          recompensa_acumulada?: number
          taxa_acerto?: number
          ultimo_uso?: string | null
          updated_at?: string
          user_id: string
          vezes_testado?: number
          wins?: number
        }
        Update: {
          created_at?: string
          id?: string
          losses?: number
          padrao_id?: string
          recompensa_acumulada?: number
          taxa_acerto?: number
          ultimo_uso?: string | null
          updated_at?: string
          user_id?: string
          vezes_testado?: number
          wins?: number
        }
        Relationships: []
      }
      ia_trade_context: {
        Row: {
          created_at: string
          entry_price: number | null
          exit_price: number | null
          fvg_type: string | null
          id: string
          ob_strength: number | null
          operation_id: string | null
          padrao_combinado: string
          pnl: number | null
          resultado: string | null
          rr_ratio: number | null
          session_type: string | null
          structure_type: string | null
          sweep_type: string | null
          user_id: string
          volume_percentile: number | null
          zone_type: string | null
        }
        Insert: {
          created_at?: string
          entry_price?: number | null
          exit_price?: number | null
          fvg_type?: string | null
          id?: string
          ob_strength?: number | null
          operation_id?: string | null
          padrao_combinado: string
          pnl?: number | null
          resultado?: string | null
          rr_ratio?: number | null
          session_type?: string | null
          structure_type?: string | null
          sweep_type?: string | null
          user_id: string
          volume_percentile?: number | null
          zone_type?: string | null
        }
        Update: {
          created_at?: string
          entry_price?: number | null
          exit_price?: number | null
          fvg_type?: string | null
          id?: string
          ob_strength?: number | null
          operation_id?: string | null
          padrao_combinado?: string
          pnl?: number | null
          resultado?: string | null
          rr_ratio?: number | null
          session_type?: string | null
          structure_type?: string | null
          sweep_type?: string | null
          user_id?: string
          volume_percentile?: number | null
          zone_type?: string | null
        }
        Relationships: []
      }
      learning_runs_2025_11_29_14_39: {
        Row: {
          accuracy_percentage: number | null
          completed_at: string | null
          duration_minutes: number | null
          id: string
          lessons_completed: number | null
          session_type: string | null
          started_at: string | null
          total_points_earned: number | null
          user_id: string | null
        }
        Insert: {
          accuracy_percentage?: number | null
          completed_at?: string | null
          duration_minutes?: number | null
          id?: string
          lessons_completed?: number | null
          session_type?: string | null
          started_at?: string | null
          total_points_earned?: number | null
          user_id?: string | null
        }
        Update: {
          accuracy_percentage?: number | null
          completed_at?: string | null
          duration_minutes?: number | null
          id?: string
          lessons_completed?: number | null
          session_type?: string | null
          started_at?: string | null
          total_points_earned?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_runs_2025_11_29_14_39_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_2025_11_29_14_39"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons_2025_11_29_14_39: {
        Row: {
          chart_data: Json | null
          concept_type: string
          correct_answers: Json | null
          created_at: string | null
          description: string | null
          difficulty_level: number | null
          id: string
          is_active: boolean | null
          points_reward: number | null
          questions: Json | null
          title: string
        }
        Insert: {
          chart_data?: Json | null
          concept_type: string
          correct_answers?: Json | null
          created_at?: string | null
          description?: string | null
          difficulty_level?: number | null
          id?: string
          is_active?: boolean | null
          points_reward?: number | null
          questions?: Json | null
          title: string
        }
        Update: {
          chart_data?: Json | null
          concept_type?: string
          correct_answers?: Json | null
          created_at?: string | null
          description?: string | null
          difficulty_level?: number | null
          id?: string
          is_active?: boolean | null
          points_reward?: number | null
          questions?: Json | null
          title?: string
        }
        Relationships: []
      }
      liquidity_zones_history: {
        Row: {
          created_at: string | null
          id: string
          price: number
          strength: number
          swept: boolean | null
          symbol: string
          timestamp: number
          type: string
          user_id: string | null
          zone_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          price: number
          strength: number
          swept?: boolean | null
          symbol: string
          timestamp: number
          type: string
          user_id?: string | null
          zone_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          price?: number
          strength?: number
          swept?: boolean | null
          symbol?: string
          timestamp?: number
          type?: string
          user_id?: string | null
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "liquidity_zones_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_trading_summary"
            referencedColumns: ["user_id"]
          },
        ]
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
      market_data_2025_11_29_18_14: {
        Row: {
          close_price: number
          created_at: string | null
          high_price: number
          id: string
          low_price: number
          open_price: number
          smc_signal: string | null
          symbol: string
          timeframe: string
          timestamp: string
          volume: number
        }
        Insert: {
          close_price: number
          created_at?: string | null
          high_price: number
          id?: string
          low_price: number
          open_price: number
          smc_signal?: string | null
          symbol: string
          timeframe: string
          timestamp: string
          volume: number
        }
        Update: {
          close_price?: number
          created_at?: string | null
          high_price?: number
          id?: string
          low_price?: number
          open_price?: number
          smc_signal?: string | null
          symbol?: string
          timeframe?: string
          timestamp?: string
          volume?: number
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
        Relationships: [
          {
            foreignKeyName: "operations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_trading_summary"
            referencedColumns: ["user_id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "user_trading_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles_2025_11_29_14_39: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          current_streak: number | null
          full_name: string | null
          id: string
          level: number | null
          max_streak: number | null
          total_points: number | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          current_streak?: number | null
          full_name?: string | null
          id: string
          level?: number | null
          max_streak?: number | null
          total_points?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          current_streak?: number | null
          full_name?: string | null
          id?: string
          level?: number | null
          max_streak?: number | null
          total_points?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_2025_11_29_14_39_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "user_trading_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles_2025_11_29_15_37: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_2025_11_29_15_37_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "user_trading_summary"
            referencedColumns: ["user_id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "protection_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_trading_summary"
            referencedColumns: ["user_id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "session_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_trading_summary"
            referencedColumns: ["user_id"]
          },
        ]
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
      smc_analysis_2025_11_29_18_14: {
        Row: {
          algorithm_state: number | null
          analysis_score: number | null
          bos_detected: boolean | null
          choch_detected: boolean | null
          created_at: string | null
          fvg_present: boolean | null
          htf_timeframe: string
          htf_trend: string | null
          id: string
          last_swing_high: number | null
          last_swing_low: number | null
          ltf_timeframe: string
          order_block_active: boolean | null
          poi_zone_max: number | null
          poi_zone_min: number | null
          symbol: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          algorithm_state?: number | null
          analysis_score?: number | null
          bos_detected?: boolean | null
          choch_detected?: boolean | null
          created_at?: string | null
          fvg_present?: boolean | null
          htf_timeframe: string
          htf_trend?: string | null
          id?: string
          last_swing_high?: number | null
          last_swing_low?: number | null
          ltf_timeframe: string
          order_block_active?: boolean | null
          poi_zone_max?: number | null
          poi_zone_min?: number | null
          symbol: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          algorithm_state?: number | null
          analysis_score?: number | null
          bos_detected?: boolean | null
          choch_detected?: boolean | null
          created_at?: string | null
          fvg_present?: boolean | null
          htf_timeframe?: string
          htf_trend?: string | null
          id?: string
          last_swing_high?: number | null
          last_swing_low?: number | null
          ltf_timeframe?: string
          order_block_active?: boolean | null
          poi_zone_max?: number | null
          poi_zone_min?: number | null
          symbol?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "smc_analysis_2025_11_29_18_14_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_trading_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      smc_configs_2025_11_29_15_37: {
        Row: {
          auto_trading_enabled: boolean | null
          created_at: string
          htf_timeframe: string | null
          id: string
          ltf_timeframe: string | null
          risk_per_trade: number | null
          time_filter_end: string | null
          time_filter_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_trading_enabled?: boolean | null
          created_at?: string
          htf_timeframe?: string | null
          id?: string
          ltf_timeframe?: string | null
          risk_per_trade?: number | null
          time_filter_end?: string | null
          time_filter_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_trading_enabled?: boolean | null
          created_at?: string
          htf_timeframe?: string | null
          id?: string
          ltf_timeframe?: string | null
          risk_per_trade?: number | null
          time_filter_end?: string | null
          time_filter_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "smc_configs_2025_11_29_15_37_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_trading_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      smc_signals_2025_11_29_15_37: {
        Row: {
          confidence_score: number | null
          created_at: string
          direction: string
          id: string
          is_active: boolean | null
          metadata: Json | null
          price_level: number
          signal_type: string
          symbol: string
          timeframe: string
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          direction: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          price_level: number
          signal_type: string
          symbol: string
          timeframe: string
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          direction?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          price_level?: number
          signal_type?: string
          symbol?: string
          timeframe?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "smc_signals_2025_11_29_15_37_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_trading_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      smc_trades_2025_11_29_18_14: {
        Row: {
          algorithm_state: number
          closed_at: string | null
          created_at: string | null
          entry_price: number
          exchange_type: string
          exit_price: number | null
          id: string
          order_id: string | null
          pnl: number | null
          quantity: number
          smc_signal: string | null
          status: string | null
          stop_loss: number
          symbol: string
          take_profit_1: number | null
          take_profit_2: number | null
          timeframe_htf: string
          timeframe_ltf: string
          trade_type: string
          user_id: string | null
        }
        Insert: {
          algorithm_state: number
          closed_at?: string | null
          created_at?: string | null
          entry_price: number
          exchange_type: string
          exit_price?: number | null
          id?: string
          order_id?: string | null
          pnl?: number | null
          quantity: number
          smc_signal?: string | null
          status?: string | null
          stop_loss: number
          symbol: string
          take_profit_1?: number | null
          take_profit_2?: number | null
          timeframe_htf: string
          timeframe_ltf: string
          trade_type: string
          user_id?: string | null
        }
        Update: {
          algorithm_state?: number
          closed_at?: string | null
          created_at?: string | null
          entry_price?: number
          exchange_type?: string
          exit_price?: number | null
          id?: string
          order_id?: string | null
          pnl?: number | null
          quantity?: number
          smc_signal?: string | null
          status?: string | null
          stop_loss?: number
          symbol?: string
          take_profit_1?: number | null
          take_profit_2?: number | null
          timeframe_htf?: string
          timeframe_ltf?: string
          trade_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "smc_trades_2025_11_29_18_14_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_trading_summary"
            referencedColumns: ["user_id"]
          },
        ]
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
      sweeps_history: {
        Row: {
          confirmed: boolean | null
          created_at: string | null
          id: string
          reversal_price: number
          sweep_id: string
          sweep_price: number
          symbol: string
          timestamp: number
          user_id: string | null
          zone_id: string | null
        }
        Insert: {
          confirmed?: boolean | null
          created_at?: string | null
          id?: string
          reversal_price: number
          sweep_id: string
          sweep_price: number
          symbol: string
          timestamp: number
          user_id?: string | null
          zone_id?: string | null
        }
        Update: {
          confirmed?: boolean | null
          created_at?: string | null
          id?: string
          reversal_price?: number
          sweep_id?: string
          sweep_price?: number
          symbol?: string
          timestamp?: number
          user_id?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sweeps_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_trading_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sweeps_history_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "liquidity_zones_history"
            referencedColumns: ["id"]
          },
        ]
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
      trades_2025_11_29_15_37: {
        Row: {
          broker_config_id: string
          closed_at: string | null
          created_at: string
          entry_price: number
          entry_reason: string | null
          exit_reason: string | null
          htf_analysis: Json | null
          id: string
          ltf_analysis: Json | null
          opened_at: string
          pnl: number | null
          quantity: number
          side: string
          status: string | null
          stop_loss: number
          symbol: string
          take_profit_1: number | null
          take_profit_2: number | null
          user_id: string
        }
        Insert: {
          broker_config_id: string
          closed_at?: string | null
          created_at?: string
          entry_price: number
          entry_reason?: string | null
          exit_reason?: string | null
          htf_analysis?: Json | null
          id?: string
          ltf_analysis?: Json | null
          opened_at?: string
          pnl?: number | null
          quantity: number
          side: string
          status?: string | null
          stop_loss: number
          symbol: string
          take_profit_1?: number | null
          take_profit_2?: number | null
          user_id: string
        }
        Update: {
          broker_config_id?: string
          closed_at?: string | null
          created_at?: string
          entry_price?: number
          entry_reason?: string | null
          exit_reason?: string | null
          htf_analysis?: Json | null
          id?: string
          ltf_analysis?: Json | null
          opened_at?: string
          pnl?: number | null
          quantity?: number
          side?: string
          status?: string | null
          stop_loss?: number
          symbol?: string
          take_profit_1?: number | null
          take_profit_2?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_2025_11_29_15_37_broker_config_id_fkey"
            columns: ["broker_config_id"]
            isOneToOne: false
            referencedRelation: "broker_configs_2025_11_29_15_37"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_2025_11_29_15_37_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_trading_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      trades_history: {
        Row: {
          close_reason: string | null
          created_at: string | null
          entry_id: string | null
          entry_price: number
          entry_time: string
          exit_price: number | null
          exit_time: string | null
          id: string
          pnl: number | null
          pnl_percentage: number | null
          quantity: number
          status: string | null
          stop_loss: number
          symbol: string
          take_profit_1: number
          take_profit_2: number
          take_profit_3: number
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          close_reason?: string | null
          created_at?: string | null
          entry_id?: string | null
          entry_price: number
          entry_time: string
          exit_price?: number | null
          exit_time?: string | null
          id?: string
          pnl?: number | null
          pnl_percentage?: number | null
          quantity: number
          status?: string | null
          stop_loss: number
          symbol: string
          take_profit_1: number
          take_profit_2: number
          take_profit_3: number
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          close_reason?: string | null
          created_at?: string | null
          entry_id?: string | null
          entry_price?: number
          entry_time?: string
          exit_price?: number | null
          exit_time?: string | null
          id?: string
          pnl?: number | null
          pnl_percentage?: number | null
          quantity?: number
          status?: string | null
          stop_loss?: number
          symbol?: string
          take_profit_1?: number
          take_profit_2?: number
          take_profit_3?: number
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trades_history_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entry_points_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_trading_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      trading_configurations: {
        Row: {
          balance_percentage: number
          confirmation_timeframe: string | null
          created_at: string | null
          exchange_credential_id: string | null
          id: string
          is_complete: boolean | null
          last_updated_step: string | null
          max_risk_per_trade: number
          max_simultaneous_trades: number
          min_confidence_score: number | null
          min_liquidity_strength: number | null
          min_risk_reward_ratio: number | null
          primary_timeframe: string | null
          tp1_percentage: number | null
          tp2_percentage: number | null
          tp3_percentage: number | null
          trading_days: number[] | null
          trading_hours_end: string | null
          trading_hours_start: string | null
          trading_pairs: string[]
          trailing_stop_percentage: number | null
          updated_at: string | null
          use_trailing_stop: boolean | null
          user_id: string
        }
        Insert: {
          balance_percentage?: number
          confirmation_timeframe?: string | null
          created_at?: string | null
          exchange_credential_id?: string | null
          id?: string
          is_complete?: boolean | null
          last_updated_step?: string | null
          max_risk_per_trade?: number
          max_simultaneous_trades?: number
          min_confidence_score?: number | null
          min_liquidity_strength?: number | null
          min_risk_reward_ratio?: number | null
          primary_timeframe?: string | null
          tp1_percentage?: number | null
          tp2_percentage?: number | null
          tp3_percentage?: number | null
          trading_days?: number[] | null
          trading_hours_end?: string | null
          trading_hours_start?: string | null
          trading_pairs?: string[]
          trailing_stop_percentage?: number | null
          updated_at?: string | null
          use_trailing_stop?: boolean | null
          user_id: string
        }
        Update: {
          balance_percentage?: number
          confirmation_timeframe?: string | null
          created_at?: string | null
          exchange_credential_id?: string | null
          id?: string
          is_complete?: boolean | null
          last_updated_step?: string | null
          max_risk_per_trade?: number
          max_simultaneous_trades?: number
          min_confidence_score?: number | null
          min_liquidity_strength?: number | null
          min_risk_reward_ratio?: number | null
          primary_timeframe?: string | null
          tp1_percentage?: number | null
          tp2_percentage?: number | null
          tp3_percentage?: number | null
          trading_days?: number[] | null
          trading_hours_end?: string | null
          trading_hours_start?: string | null
          trading_pairs?: string[]
          trailing_stop_percentage?: number | null
          updated_at?: string | null
          use_trailing_stop?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trading_configurations_exchange_credential_id_fkey"
            columns: ["exchange_credential_id"]
            isOneToOne: false
            referencedRelation: "exchange_credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trading_configurations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_trading_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      trading_runs_2025_11_29_23_24: {
        Row: {
          accuracy: number | null
          completed_at: string | null
          correct_marks: number | null
          created_at: string | null
          duration_seconds: number | null
          id: string
          marks_data: Json | null
          score: number | null
          session_data: Json | null
          symbol: string
          timeframe: string
          total_marks: number | null
          user_id: string | null
        }
        Insert: {
          accuracy?: number | null
          completed_at?: string | null
          correct_marks?: number | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          marks_data?: Json | null
          score?: number | null
          session_data?: Json | null
          symbol: string
          timeframe: string
          total_marks?: number | null
          user_id?: string | null
        }
        Update: {
          accuracy?: number | null
          completed_at?: string | null
          correct_marks?: number | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          marks_data?: Json | null
          score?: number | null
          session_data?: Json | null
          symbol?: string
          timeframe?: string
          total_marks?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trading_runs_2025_11_29_23_24_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_trading_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      trading_status: {
        Row: {
          available_balance: number | null
          balance_in_use: number | null
          connected_exchange: string | null
          created_at: string | null
          has_complete_config: boolean | null
          has_sufficient_balance: boolean | null
          has_valid_credentials: boolean | null
          id: string
          is_trading_active: boolean | null
          last_balance_update: string | null
          last_signal_time: string | null
          last_validation_time: string | null
          session_end_time: string | null
          session_start_time: string | null
          trades_opened_in_session: number | null
          updated_at: string | null
          user_id: string
          validation_errors: string[] | null
        }
        Insert: {
          available_balance?: number | null
          balance_in_use?: number | null
          connected_exchange?: string | null
          created_at?: string | null
          has_complete_config?: boolean | null
          has_sufficient_balance?: boolean | null
          has_valid_credentials?: boolean | null
          id?: string
          is_trading_active?: boolean | null
          last_balance_update?: string | null
          last_signal_time?: string | null
          last_validation_time?: string | null
          session_end_time?: string | null
          session_start_time?: string | null
          trades_opened_in_session?: number | null
          updated_at?: string | null
          user_id: string
          validation_errors?: string[] | null
        }
        Update: {
          available_balance?: number | null
          balance_in_use?: number | null
          connected_exchange?: string | null
          created_at?: string | null
          has_complete_config?: boolean | null
          has_sufficient_balance?: boolean | null
          has_valid_credentials?: boolean | null
          id?: string
          is_trading_active?: boolean | null
          last_balance_update?: string | null
          last_signal_time?: string | null
          last_validation_time?: string | null
          session_end_time?: string | null
          session_start_time?: string | null
          trades_opened_in_session?: number | null
          updated_at?: string | null
          user_id?: string
          validation_errors?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "trading_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_trading_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_api_configs_2025_11_29_18_14: {
        Row: {
          account_type: string | null
          api_key: string
          balance: number | null
          broker_name: string | null
          created_at: string | null
          exchange_type: string
          id: string
          is_active: boolean | null
          is_testnet: boolean | null
          leverage: number | null
          lot_size: number | null
          secret_key: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_type?: string | null
          api_key: string
          balance?: number | null
          broker_name?: string | null
          created_at?: string | null
          exchange_type: string
          id?: string
          is_active?: boolean | null
          is_testnet?: boolean | null
          leverage?: number | null
          lot_size?: number | null
          secret_key: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_type?: string | null
          api_key?: string
          balance?: number | null
          broker_name?: string | null
          created_at?: string | null
          exchange_type?: string
          id?: string
          is_active?: boolean | null
          is_testnet?: boolean | null
          leverage?: number | null
          lot_size?: number | null
          secret_key?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_api_configs_2025_11_29_18_14_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_trading_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_api_credentials: {
        Row: {
          broker_name: string | null
          broker_type: string
          created_at: string | null
          encrypted_api_key: string | null
          encrypted_api_secret: string | null
          futures_ok: boolean | null
          id: string
          is_active: boolean | null
          last_tested_at: string | null
          spot_ok: boolean | null
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
          futures_ok?: boolean | null
          id?: string
          is_active?: boolean | null
          last_tested_at?: string | null
          spot_ok?: boolean | null
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
          futures_ok?: boolean | null
          id?: string
          is_active?: boolean | null
          last_tested_at?: string | null
          spot_ok?: boolean | null
          test_status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_api_credentials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_trading_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_onboarding_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_step: string | null
          id: string
          onboarding_completed: boolean | null
          show_tutorial: boolean | null
          skip_onboarding: boolean | null
          step_exchange_credentials: boolean | null
          step_final_review: boolean | null
          step_risk_management: boolean | null
          step_trading_config: boolean | null
          step_welcome_completed: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_step?: string | null
          id?: string
          onboarding_completed?: boolean | null
          show_tutorial?: boolean | null
          skip_onboarding?: boolean | null
          step_exchange_credentials?: boolean | null
          step_final_review?: boolean | null
          step_risk_management?: boolean | null
          step_trading_config?: boolean | null
          step_welcome_completed?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_step?: string | null
          id?: string
          onboarding_completed?: boolean | null
          show_tutorial?: boolean | null
          skip_onboarding?: boolean | null
          step_exchange_credentials?: boolean | null
          step_final_review?: boolean | null
          step_risk_management?: boolean | null
          step_trading_config?: boolean | null
          step_welcome_completed?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_onboarding_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_trading_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_profiles_2025_11_29_23_24: {
        Row: {
          created_at: string | null
          experience_points: number | null
          id: string
          last_activity: string | null
          level: number | null
          streak_days: number | null
          theme_preference: string | null
          total_score: number | null
          updated_at: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          created_at?: string | null
          experience_points?: number | null
          id?: string
          last_activity?: string | null
          level?: number | null
          streak_days?: number | null
          theme_preference?: string | null
          total_score?: number | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string | null
          experience_points?: number | null
          id?: string
          last_activity?: string | null
          level?: number | null
          streak_days?: number | null
          theme_preference?: string | null
          total_score?: number | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_2025_11_29_23_24_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_trading_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_progress_2025_11_29_14_39: {
        Row: {
          attempts: number | null
          best_score: number | null
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          lesson_id: string | null
          score: number | null
          user_id: string | null
        }
        Insert: {
          attempts?: number | null
          best_score?: number | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          score?: number | null
          user_id?: string | null
        }
        Update: {
          attempts?: number | null
          best_score?: number | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          score?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_2025_11_29_14_39_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons_2025_11_29_14_39"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_progress_2025_11_29_14_39_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_2025_11_29_14_39"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_trading_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_settings: {
        Row: {
          active_strategies: string[] | null
          api_key: string | null
          api_secret: string | null
          auto_trading_enabled: boolean | null
          balance: number
          bot_status: string | null
          cooldown_disabled_until: string | null
          created_at: string | null
          ia_learning_enabled: boolean | null
          id: string
          leverage: number | null
          max_positions: number | null
          paper_mode: boolean | null
          preferred_timeframe: string | null
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
          auto_trading_enabled?: boolean | null
          balance?: number
          bot_status?: string | null
          cooldown_disabled_until?: string | null
          created_at?: string | null
          ia_learning_enabled?: boolean | null
          id?: string
          leverage?: number | null
          max_positions?: number | null
          paper_mode?: boolean | null
          preferred_timeframe?: string | null
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
          auto_trading_enabled?: boolean | null
          balance?: number
          bot_status?: string | null
          cooldown_disabled_until?: string | null
          created_at?: string | null
          ia_learning_enabled?: boolean | null
          id?: string
          leverage?: number | null
          max_positions?: number | null
          paper_mode?: boolean | null
          preferred_timeframe?: string | null
          profit_target_percent?: number | null
          risk_per_trade?: number | null
          single_position_mode?: boolean | null
          trading_strategy?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_trading_summary"
            referencedColumns: ["user_id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "vision_agent_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_trading_summary"
            referencedColumns: ["user_id"]
          },
        ]
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
            foreignKeyName: "vision_agent_signals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_trading_summary"
            referencedColumns: ["user_id"]
          },
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
        Relationships: [
          {
            foreignKeyName: "vision_agent_videos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_trading_summary"
            referencedColumns: ["user_id"]
          },
        ]
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
      wallet_snapshots: {
        Row: {
          assets: Json
          available_balance_usdt: number
          created_at: string | null
          exchange_name: string
          id: string
          in_use_balance_usdt: number
          snapshot_time: string | null
          total_balance_usdt: number
          user_id: string
        }
        Insert: {
          assets: Json
          available_balance_usdt: number
          created_at?: string | null
          exchange_name: string
          id?: string
          in_use_balance_usdt: number
          snapshot_time?: string | null
          total_balance_usdt: number
          user_id: string
        }
        Update: {
          assets?: Json
          available_balance_usdt?: number
          created_at?: string | null
          exchange_name?: string
          id?: string
          in_use_balance_usdt?: number
          snapshot_time?: string | null
          total_balance_usdt?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_trading_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      user_trading_summary: {
        Row: {
          available_balance: number | null
          balance_in_use: number | null
          config_complete: boolean | null
          connected_exchange: string | null
          current_onboarding_step: string | null
          email: string | null
          exchange_credentials_count: number | null
          has_complete_config: boolean | null
          has_sufficient_balance: boolean | null
          has_valid_credentials: boolean | null
          is_trading_active: boolean | null
          onboarding_completed: boolean | null
          user_id: string | null
          valid_credentials_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_start_trading: {
        Args: { p_user_id: string }
        Returns: {
          can_start: boolean
          errors: string[]
        }[]
      }
      decrypt_data: {
        Args: { encrypted_data: string; encryption_key: string }
        Returns: string
      }
      encrypt_data: {
        Args: { data: string; encryption_key: string }
        Returns: string
      }
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
