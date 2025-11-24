-- 1. Deletar registros duplicados, mantendo apenas o mais recente
DELETE FROM user_settings 
WHERE user_id = '7d7bcf35-b03d-421b-bc1e-d20e4bc2dec0'
AND id IN (
  '57f87d3f-0feb-4bcf-b3d6-58421783a80a',
  '51d2862b-b02f-488f-8329-091fdad54493'
);

-- 2. Adicionar constraint UNIQUE para prevenir duplicatas futuras
ALTER TABLE user_settings 
ADD CONSTRAINT user_settings_user_id_unique 
UNIQUE (user_id);