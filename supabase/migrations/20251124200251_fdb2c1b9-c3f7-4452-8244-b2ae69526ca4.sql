-- Adicionar constraint UNIQUE composto para user_id + broker_type
-- Isso permite que o edge function encrypt-api-credentials use ON CONFLICT corretamente
ALTER TABLE user_api_credentials 
ADD CONSTRAINT user_api_credentials_user_broker_unique 
UNIQUE (user_id, broker_type);