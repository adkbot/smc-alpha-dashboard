-- Adicionar colunas futures_ok e spot_ok para rastrear permissões específicas
ALTER TABLE user_api_credentials 
ADD COLUMN IF NOT EXISTS futures_ok BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS spot_ok BOOLEAN DEFAULT FALSE;