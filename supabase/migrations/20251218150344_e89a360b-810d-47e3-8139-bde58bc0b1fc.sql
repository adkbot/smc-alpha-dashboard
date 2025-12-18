-- =====================================================
-- SISTEMA IA EVOLUTIVA "OLHOS DE ÁGUIA"
-- Tabelas de Aprendizado por Recompensa (Reinforcement Learning)
-- =====================================================

-- Tabela 1: Conhecimento acumulado por padrão
CREATE TABLE public.ia_learning_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  padrao_id TEXT NOT NULL,
  recompensa_acumulada NUMERIC NOT NULL DEFAULT 0,
  vezes_testado INTEGER NOT NULL DEFAULT 0,
  taxa_acerto NUMERIC NOT NULL DEFAULT 50,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  ultimo_uso TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_pattern UNIQUE (user_id, padrao_id)
);

-- Tabela 2: Contexto detalhado de cada trade para treinamento
CREATE TABLE public.ia_trade_context (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  operation_id UUID,
  padrao_combinado TEXT NOT NULL,
  sweep_type TEXT,
  structure_type TEXT,
  fvg_type TEXT,
  zone_type TEXT,
  session_type TEXT,
  volume_percentile NUMERIC,
  ob_strength NUMERIC,
  rr_ratio NUMERIC,
  entry_price NUMERIC,
  exit_price NUMERIC,
  pnl NUMERIC,
  resultado TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ia_learning_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ia_trade_context ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ia_learning_patterns
CREATE POLICY "Users can view own patterns"
ON public.ia_learning_patterns FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own patterns"
ON public.ia_learning_patterns FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own patterns"
ON public.ia_learning_patterns FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own patterns"
ON public.ia_learning_patterns FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for ia_trade_context
CREATE POLICY "Users can view own trade context"
ON public.ia_trade_context FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trade context"
ON public.ia_trade_context FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own trade context"
ON public.ia_trade_context FOR DELETE
USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_ia_patterns_user_padrao ON public.ia_learning_patterns(user_id, padrao_id);
CREATE INDEX idx_ia_patterns_taxa_acerto ON public.ia_learning_patterns(taxa_acerto DESC);
CREATE INDEX idx_ia_context_user ON public.ia_trade_context(user_id);
CREATE INDEX idx_ia_context_padrao ON public.ia_trade_context(padrao_combinado);
CREATE INDEX idx_ia_context_created ON public.ia_trade_context(created_at DESC);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_ia_learning_patterns_updated_at
BEFORE UPDATE ON public.ia_learning_patterns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar coluna ia_learning_enabled em user_settings (se não existir)
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS ia_learning_enabled BOOLEAN DEFAULT true;