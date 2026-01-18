-- Adicionar coluna para salvar timeframe preferido do usuário
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS preferred_timeframe text DEFAULT '15m';