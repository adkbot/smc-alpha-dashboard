-- =====================================================
-- ARQUITETURA RL COMPLETA - REPLAY BUFFER + ELITE + MODEL WEIGHTS
-- =====================================================

-- 1️⃣ REPLAY BUFFER (Memória de todos os trades)
CREATE TABLE IF NOT EXISTS ia_replay_buffer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Estado (State)
  state JSONB NOT NULL,
  
  -- Ação (Action)
  action TEXT NOT NULL,
  
  -- Resultado
  reward NUMERIC NOT NULL DEFAULT 0,
  next_state JSONB,
  done BOOLEAN DEFAULT false,
  
  -- Metadata (contexto humano)
  metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Trade Info
  pattern_id TEXT,
  entry_price NUMERIC,
  exit_price NUMERIC,
  pnl NUMERIC DEFAULT 0,
  rr_achieved NUMERIC DEFAULT 0,
  
  -- Qualidade (scores 0-100)
  entry_quality NUMERIC DEFAULT 50,
  discipline_score NUMERIC DEFAULT 50,
  context_score NUMERIC DEFAULT 50,
  
  -- Breakdown do reward
  reward_breakdown JSONB DEFAULT '{}',
  
  -- Flags
  is_elite BOOLEAN DEFAULT false,
  trade_result TEXT,
  session_type TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2️⃣ ELITE BUFFER (Top 10% - Trades Exemplares)
CREATE TABLE IF NOT EXISTS ia_elite_buffer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  replay_buffer_id UUID REFERENCES ia_replay_buffer(id) ON DELETE CASCADE,
  
  -- Critérios Elite
  rr_achieved NUMERIC NOT NULL,
  discipline_score NUMERIC NOT NULL,
  mtf_aligned BOOLEAN DEFAULT true,
  
  -- Peso para re-treinamento
  training_weight NUMERIC DEFAULT 2.0,
  times_used_in_training INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3️⃣ MODEL WEIGHTS (Versões do modelo)
CREATE TABLE IF NOT EXISTS ia_model_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Versão do modelo
  version INTEGER NOT NULL DEFAULT 1,
  model_name TEXT DEFAULT 'default',
  
  -- Status
  is_production BOOLEAN DEFAULT false,
  is_current BOOLEAN DEFAULT true,
  
  -- Pesos por padrão (Q-values)
  pattern_weights JSONB NOT NULL DEFAULT '{}',
  
  -- Métricas de validação
  train_winrate NUMERIC DEFAULT 0,
  train_trades INTEGER DEFAULT 0,
  validation_winrate NUMERIC DEFAULT 0,
  validation_trades INTEGER DEFAULT 0,
  test_blind_winrate NUMERIC DEFAULT 0,
  test_blind_trades INTEGER DEFAULT 0,
  
  -- Confiança geral do modelo
  confidence_level NUMERIC DEFAULT 50.0,
  
  -- Frozen patterns (não mudam mais)
  frozen_patterns JSONB DEFAULT '[]',
  
  -- Metadata
  training_config JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_replay_buffer_user ON ia_replay_buffer(user_id);
CREATE INDEX IF NOT EXISTS idx_replay_buffer_pattern ON ia_replay_buffer(pattern_id);
CREATE INDEX IF NOT EXISTS idx_replay_buffer_elite ON ia_replay_buffer(user_id, is_elite) WHERE is_elite = true;
CREATE INDEX IF NOT EXISTS idx_replay_buffer_result ON ia_replay_buffer(user_id, trade_result);
CREATE INDEX IF NOT EXISTS idx_elite_buffer_user ON ia_elite_buffer(user_id);
CREATE INDEX IF NOT EXISTS idx_model_weights_current ON ia_model_weights(user_id, is_current) WHERE is_current = true;

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE ia_replay_buffer ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia_elite_buffer ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia_model_weights ENABLE ROW LEVEL SECURITY;

-- Replay Buffer
CREATE POLICY "Users can view own replay buffer" ON ia_replay_buffer FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own replay buffer" ON ia_replay_buffer FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own replay buffer" ON ia_replay_buffer FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own replay buffer" ON ia_replay_buffer FOR DELETE USING (auth.uid() = user_id);

-- Elite Buffer
CREATE POLICY "Users can view own elite buffer" ON ia_elite_buffer FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own elite buffer" ON ia_elite_buffer FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own elite buffer" ON ia_elite_buffer FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own elite buffer" ON ia_elite_buffer FOR DELETE USING (auth.uid() = user_id);

-- Model Weights
CREATE POLICY "Users can view own model weights" ON ia_model_weights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own model weights" ON ia_model_weights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own model weights" ON ia_model_weights FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own model weights" ON ia_model_weights FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGER para updated_at
-- =====================================================
CREATE TRIGGER update_ia_model_weights_updated_at
  BEFORE UPDATE ON ia_model_weights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();