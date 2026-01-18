-- =====================================================
-- VISION TRADING AGENT - DATABASE SCHEMA
-- =====================================================

-- 1. VISION_AGENT_STATE - Estado do Agente por Usuário
CREATE TABLE IF NOT EXISTS public.vision_agent_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  mode TEXT NOT NULL DEFAULT 'SHADOW' CHECK (mode IN ('SHADOW', 'PAPER', 'LIVE')),
  status TEXT NOT NULL DEFAULT 'STOPPED' CHECK (status IN ('RUNNING', 'PAUSED', 'STOPPED', 'ERROR')),
  current_video_id TEXT,
  current_video_title TEXT,
  current_frame INTEGER DEFAULT 0,
  total_frames INTEGER DEFAULT 0,
  progress_percent NUMERIC DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  last_heartbeat TIMESTAMP WITH TIME ZONE,
  model_version TEXT,
  playlist_url TEXT,
  config JSONB DEFAULT '{
    "confidence_threshold": 0.70,
    "max_trades_day": 10,
    "frame_step": 5,
    "seq_len": 30,
    "safety_stop_loss_pct": 2.0,
    "channel_name": "Rafael Oliveira Trader Raiz"
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- 2. VISION_AGENT_LOGS - Logs Detalhados de Processamento
CREATE TABLE IF NOT EXISTS public.vision_agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  video_id TEXT NOT NULL,
  frame_index INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('ENTER', 'EXIT', 'IGNORE')),
  confidence NUMERIC NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  symbol TEXT DEFAULT 'WIN$',
  features_summary JSONB,
  model_version TEXT NOT NULL,
  executed BOOLEAN DEFAULT false,
  execution_result TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. VISION_VIDEOS_PROCESSED - Vídeos Processados
CREATE TABLE IF NOT EXISTS public.vision_videos_processed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  video_id TEXT NOT NULL,
  video_title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  channel_name TEXT DEFAULT 'Rafael Oliveira Trader Raiz',
  duration_seconds INTEGER,
  total_frames INTEGER,
  frames_processed INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'ERROR')),
  signals_detected INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- 4. VISION_TRAINING_DATA - Dados para Re-treinamento
CREATE TABLE IF NOT EXISTS public.vision_training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  video_id TEXT NOT NULL,
  frame_start INTEGER NOT NULL,
  frame_end INTEGER NOT NULL,
  sequence_length INTEGER NOT NULL,
  features_hash TEXT NOT NULL,
  label TEXT NOT NULL CHECK (label IN ('ENTER', 'EXIT', 'IGNORE')),
  label_source TEXT NOT NULL CHECK (label_source IN ('MANUAL', 'AUTO_SHADOW', 'AUTO_RESULT')),
  pnl_result NUMERIC,
  trade_id UUID,
  used_in_training BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, features_hash)
);

-- 5. VISION_MODEL_METRICS - Métricas dos Modelos
CREATE TABLE IF NOT EXISTS public.vision_model_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  model_version TEXT NOT NULL,
  model_type TEXT NOT NULL CHECK (model_type IN ('LSTM', 'TRANSFORMER', 'HYBRID')),
  precision_enter NUMERIC CHECK (precision_enter >= 0 AND precision_enter <= 1),
  recall_enter NUMERIC CHECK (recall_enter >= 0 AND recall_enter <= 1),
  precision_exit NUMERIC CHECK (precision_exit >= 0 AND precision_exit <= 1),
  recall_exit NUMERIC CHECK (recall_exit >= 0 AND recall_exit <= 1),
  f1_score NUMERIC CHECK (f1_score >= 0 AND f1_score <= 1),
  total_pnl_simulated NUMERIC DEFAULT 0,
  max_drawdown NUMERIC DEFAULT 0,
  total_trades_simulated INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  validation_days INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT false,
  is_promoted BOOLEAN DEFAULT false,
  trained_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  promoted_at TIMESTAMP WITH TIME ZONE,
  training_samples INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, model_version)
);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.vision_agent_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vision_agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vision_videos_processed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vision_training_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vision_model_metrics ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - VISION_AGENT_STATE
-- =====================================================

CREATE POLICY "Users can view their own agent state"
  ON public.vision_agent_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent state"
  ON public.vision_agent_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent state"
  ON public.vision_agent_state FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent state"
  ON public.vision_agent_state FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- RLS POLICIES - VISION_AGENT_LOGS
-- =====================================================

CREATE POLICY "Users can view their own agent logs"
  ON public.vision_agent_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent logs"
  ON public.vision_agent_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent logs"
  ON public.vision_agent_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent logs"
  ON public.vision_agent_logs FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- RLS POLICIES - VISION_VIDEOS_PROCESSED
-- =====================================================

CREATE POLICY "Users can view their own processed videos"
  ON public.vision_videos_processed FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own processed videos"
  ON public.vision_videos_processed FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own processed videos"
  ON public.vision_videos_processed FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own processed videos"
  ON public.vision_videos_processed FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- RLS POLICIES - VISION_TRAINING_DATA
-- =====================================================

CREATE POLICY "Users can view their own training data"
  ON public.vision_training_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own training data"
  ON public.vision_training_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own training data"
  ON public.vision_training_data FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own training data"
  ON public.vision_training_data FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- RLS POLICIES - VISION_MODEL_METRICS
-- =====================================================

CREATE POLICY "Users can view their own model metrics"
  ON public.vision_model_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own model metrics"
  ON public.vision_model_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own model metrics"
  ON public.vision_model_metrics FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own model metrics"
  ON public.vision_model_metrics FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE TRIGGER update_vision_agent_state_updated_at
  BEFORE UPDATE ON public.vision_agent_state
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_vision_agent_logs_user_id ON public.vision_agent_logs(user_id);
CREATE INDEX idx_vision_agent_logs_video_id ON public.vision_agent_logs(video_id);
CREATE INDEX idx_vision_agent_logs_created_at ON public.vision_agent_logs(created_at DESC);

CREATE INDEX idx_vision_videos_processed_user_id ON public.vision_videos_processed(user_id);
CREATE INDEX idx_vision_videos_processed_status ON public.vision_videos_processed(status);

CREATE INDEX idx_vision_training_data_user_id ON public.vision_training_data(user_id);
CREATE INDEX idx_vision_training_data_used ON public.vision_training_data(used_in_training);

CREATE INDEX idx_vision_model_metrics_user_id ON public.vision_model_metrics(user_id);
CREATE INDEX idx_vision_model_metrics_active ON public.vision_model_metrics(is_active);