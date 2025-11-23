-- AVISO DE SEGURANÇA: Este método de reset de senha é apenas para desenvolvimento/testes
-- Em produção, use sempre o fluxo de recuperação de senha ou Supabase Admin API

-- Reset de senha para usuário ks10bot@gmail.com
-- Nova senha: 123456
UPDATE auth.users
SET 
  encrypted_password = crypt('123456', gen_salt('bf')),
  updated_at = now()
WHERE email = 'ks10bot@gmail.com';