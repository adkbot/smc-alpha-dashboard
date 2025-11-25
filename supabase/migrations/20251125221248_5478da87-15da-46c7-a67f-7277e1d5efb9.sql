-- Create table for learned strategies from YouTube videos
CREATE TABLE IF NOT EXISTS public.vision_learned_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  strategy_name TEXT NOT NULL,
  setup_type TEXT NOT NULL, -- e.g., 'FVG_15MIN_BULLISH', 'ORDER_BLOCK_LONG'
  description TEXT,
  conditions JSONB NOT NULL DEFAULT '{}', -- Conditions that must be met
  entry_rules JSONB NOT NULL DEFAULT '{}', -- How to enter
  exit_rules JSONB NOT NULL DEFAULT '{}', -- SL/TP rules
  visual_reference_url TEXT, -- Screenshot or frame from video
  learned_from_video_id TEXT,
  confidence_score NUMERIC DEFAULT 0,
  times_applied INTEGER DEFAULT 0,
  success_rate NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create table for specific learned setups
CREATE TABLE IF NOT EXISTS public.vision_learned_setups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  strategy_id UUID REFERENCES public.vision_learned_strategies(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  frame_index INTEGER NOT NULL,
  timestamp_in_video INTEGER,
  asset TEXT NOT NULL DEFAULT 'WIN$',
  timeframe TEXT NOT NULL,
  setup_context TEXT, -- What professor was explaining
  visual_elements JSONB DEFAULT '{}', -- Lines, zones, marks identified
  entry_price NUMERIC,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  risk_reward NUMERIC,
  reasoning TEXT, -- Why this is a valid setup
  screenshot_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vision_learned_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vision_learned_setups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vision_learned_strategies
CREATE POLICY "Users can view their own learned strategies"
  ON public.vision_learned_strategies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own learned strategies"
  ON public.vision_learned_strategies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own learned strategies"
  ON public.vision_learned_strategies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own learned strategies"
  ON public.vision_learned_strategies FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for vision_learned_setups
CREATE POLICY "Users can view their own learned setups"
  ON public.vision_learned_setups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own learned setups"
  ON public.vision_learned_setups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own learned setups"
  ON public.vision_learned_setups FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own learned setups"
  ON public.vision_learned_setups FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_learned_strategies_user ON public.vision_learned_strategies(user_id);
CREATE INDEX idx_learned_strategies_type ON public.vision_learned_strategies(setup_type);
CREATE INDEX idx_learned_setups_user ON public.vision_learned_setups(user_id);
CREATE INDEX idx_learned_setups_strategy ON public.vision_learned_setups(strategy_id);
CREATE INDEX idx_learned_setups_video ON public.vision_learned_setups(video_id);

-- Trigger to update updated_at
CREATE TRIGGER update_learned_strategies_updated_at
  BEFORE UPDATE ON public.vision_learned_strategies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();