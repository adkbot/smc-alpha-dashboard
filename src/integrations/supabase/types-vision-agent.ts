// =====================================================
// Vision Trading Agent - TypeScript Types
// Tipos temporários até executar: npx supabase gen types typescript
// =====================================================

export interface VisionAgentVideo {
  id: string;
  user_id: string;
  video_id: string;
  youtube_url: string;
  title: string | null;
  channel: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_frames: number | null;
  processed_frames: number;
  signals_generated: number;
  model_version: string | null;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  error_message: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface VisionAgentSettings {
  id: string;
  user_id: string;
  enabled: boolean;
  mode: 'SHADOW' | 'PAPER' | 'LIVE';
  confidence_threshold: number;
  youtube_playlist_url: string | null;
  youtube_channel_url: string | null;
  model_version: string;
  auto_process_new_videos: boolean;
  max_signals_per_day: number;
  min_video_duration_seconds: number;
  max_video_duration_seconds: number;
  frame_step: number;
  sequence_length: number;
  trading_symbol: string;
  trading_interval: string;
  trading_platform: string;
  api_token: string | null;
  settings_json: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface VisionAgentSignal {
  id: string;
  user_id: string;
  video_id: string | null;
  signal_type: 'ENTER' | 'EXIT' | 'IGNORE';
  action: 'LONG' | 'SHORT';
  confidence: number;
  asset: string;
  entry_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  risk_reward: number | null;
  frame_index: number | null;
  timestamp_in_video: number | null;
  features_summary: Record<string, any>;
  model_version: string | null;
  executed: boolean;
  execution_status: 'pending' | 'executed' | 'rejected' | 'failed' | null;
  execution_details: Record<string, any>;
  created_at: string;
}

export interface VisionAgentStats {
  total_videos: number;
  videos_processing: number;
  videos_completed: number;
  videos_failed: number;
  total_signals: number;
  signals_today: number;
  signals_executed: number;
  avg_confidence: number;
}
